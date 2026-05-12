(function (global) {
  'use strict';

  // --- Context accessors ---
  function getWorks(context) {
    return typeof context.getWorks === 'function' ? context.getWorks() : {};
  }

  function saveWorks(context) {
    if (typeof context.saveWorks === 'function') context.saveWorks();
  }

  function getCustomCats(context, cb) {
    if (typeof context.getCustomCats === 'function') {
      context.getCustomCats(cb);
    } else {
      cb({});
    }
  }

  function setCustomCats(context, cats) {
    if (typeof context.setCustomCats === 'function') context.setCustomCats(cats);
  }

  function genCatId(context) {
    if (typeof context.genCatId === 'function') return context.genCatId();
    return 'cat-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
  }

  function getHiddenRules(context, cb) {
    if (typeof context.getHiddenRules === 'function') {
      context.getHiddenRules(cb);
    } else {
      cb({});
    }
  }

  function setHiddenRules(context, rules) {
    if (typeof context.setHiddenRules === 'function') context.setHiddenRules(rules);
  }

  function getHiddenRulePrefs(context, cb) {
    if (typeof context.getHiddenRulePrefs === 'function') {
      context.getHiddenRulePrefs(cb);
    } else {
      cb({ showReasons: true, crossoverThreshold: 3 });
    }
  }

  function setHiddenRulePrefs(context, prefs) {
    if (typeof context.setHiddenRulePrefs === 'function') context.setHiddenRulePrefs(prefs);
  }

  function showToast(context, msg) {
    if (typeof context.showToast === 'function') context.showToast(msg);
  }

  function renderAll(context) {
    if (typeof context.renderAll === 'function') context.renderAll();
  }

  function labelFor(context, status) {
    if (typeof context.labelFor === 'function') return context.labelFor(status);
    return {
      all:       'All Works',
      want:      'For Later',
      progress:  'Reading',
      completed: 'Completed',
      rereading: 'Re-reading',
      onhold:    'On Hold',
      dnf:       'Did Not Finish',
      lost:      'Deleted'
    }[status] || '';
  }

  function formatDateShort(context, ts) {
    if (typeof context.formatDateShort === 'function') return context.formatDateShort(ts);
    if (!ts) return '';
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US');
  }

  // --- Storage key ---
  function getLastExportKey() {
    const keys = (typeof globalThis !== 'undefined' && globalThis.AO3TrackerStorageKeys) || {};
    return keys.LAST_EXPORT_KEY || 'ao3_last_export';
  }

  // --- Constants ---
  const STATUS_MAP = {
    'for later': 'want',
    'read later': 'want', 'want to read': 'want',
    'reading': 'progress', 'in progress': 'progress',
    'completed': 'completed',
    're-reading': 'rereading', 'rereading': 'rereading',
    'on hold': 'onhold',
    'did not finish': 'dnf', 'dnf': 'dnf',
    'deleted': 'lost'
  };

  // --- Helpers ---
  function csvCell(val) {
    const str = String(val || '');
    return (str.includes(',') || str.includes('"') || str.includes('\n'))
      ? '"' + str.replace(/"/g, '""') + '"'
      : str;
  }

  function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function stampExport() {
    try { chrome.storage.local.set({ [getLastExportKey()]: Date.now() }); } catch (e) {}
  }

  function safeTimestamp(value, fallback) {
    if (fallback === undefined) fallback = null;
    if (value == null || value === '') return fallback;
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function normalizeImportedCategory(cat) {
    if (!cat || typeof cat.name !== 'string') return null;
    const name = cat.name.trim().slice(0, 30);
    if (!name) return null;
    const color = /^#[0-9a-fA-F]{6}$/.test(cat.color || '') ? cat.color : '#6b7280';
    return {
      id: typeof cat.id === 'string' && cat.id ? cat.id : null,
      name,
      color,
      hideOnListings: cat.hideOnListings === true
    };
  }

  function mergeImportedCategories(context, entries, cb) {
    getCustomCats(context, existingCats => {
      const mergedCats = { ...existingCats };
      const idMap = {};

      for (const entry of entries) {
        const importedCats = Array.isArray(entry.customCategories) ? entry.customCategories : [];
        for (const rawCat of importedCats) {
          const cat = normalizeImportedCategory(rawCat);
          if (!cat) continue;

          let resolvedId = null;
          if (cat.id && mergedCats[cat.id] &&
              mergedCats[cat.id].name === cat.name &&
              mergedCats[cat.id].color === cat.color) {
            resolvedId = cat.id;
          } else if (cat.id && !mergedCats[cat.id]) {
            resolvedId = cat.id;
          } else {
            const existing = Object.values(mergedCats).find(c => c.name === cat.name && c.color === cat.color);
            if (existing) resolvedId = existing.id;
          }

          if (!resolvedId) resolvedId = genCatId(context);
          mergedCats[resolvedId] = { id: resolvedId, name: cat.name, color: cat.color, hideOnListings: cat.hideOnListings === true };
          if (cat.id) idMap[cat.id] = resolvedId;
        }
      }

      setCustomCats(context, mergedCats);
      cb(idMap);
    });
  }

  function parseCsvRecords(text) {
    const normalized = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const records = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < normalized.length; i++) {
      const ch = normalized[i];
      if (ch === '"') {
        current += ch;
        if (inQuotes && normalized[i + 1] === '"') {
          current += normalized[i + 1];
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === '\n' && !inQuotes) {
        if (current.trim()) records.push(current);
        current = '';
      } else {
        current += ch;
      }
    }

    if (current.trim()) records.push(current);
    return records;
  }

  function parseCSVRow(line) {
    const result = [];
    let current  = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
  }

  // --- Export functions ---
  function exportCSV(context) {
    const works = getWorks(context);
    const allWorks = Object.values(works);
    if (allWorks.length === 0) { showToast(context, 'Nothing to export!'); return; }

    getCustomCats(context, cats => {
      const headers = [
        'Title','Author','Status','Rating','Word Count','Kudos','Bookmarks','Hits','Updated','Completed','Completed (inferred)','Subscribed','Fandoms','Custom Categories','Notes','URL','Added'
      ];
      const rows = allWorks.map(w => {
        const customCatNames = (w.customCats || [])
          .map(id => cats[id] ? cats[id].name : null)
          .filter(Boolean)
          .join('; ');
        return [
          csvCell(w.title),
          csvCell(w.author),
          csvCell(labelFor(context, w.status) || ''),
          w.rating ? `${w.rating}/5` : '',
          w.wordCount ? String(w.wordCount) : '',
          w.kudosCount ? String(w.kudosCount) : '',
          w.bookmarksCount ? String(w.bookmarksCount) : '',
          w.hitsCount ? String(w.hitsCount) : '',
          w.updatedAt ? formatDateShort(context, w.updatedAt) : '',
          w.completedAt ? formatDateShort(context, w.completedAt) : '',
          (!w.completedAt && w.inferredCompletedAt) ? formatDateShort(context, w.inferredCompletedAt) : '',
          w.subscribedAtAo3 === true ? 'yes' : (w.subscribedAtAo3 === false ? 'no' : ''),
          csvCell((w.fandoms || []).join('; ')),
          csvCell(customCatNames),
          csvCell(w.notes || ''),
          csvCell(w.url),
          w.addedAt ? formatDateShort(context, w.addedAt) : ''
        ];
      });

      const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
      downloadFile('ao3-tracker-export.csv', csv, 'text/csv');
      stampExport();
      renderLastBackupStamp(context);
      showToast(context, 'Exported as CSV!');
    });
  }

  function exportJSON(context) {
    const works = getWorks(context);
    const allWorks = Object.values(works);
    if (allWorks.length === 0) { showToast(context, 'Nothing to export!'); return; }

    getCustomCats(context, cats => {
      const data = allWorks.map(w => ({
        title:   w.title,
        author:  w.author,
        authorUrl: w.authorUrl || null,
        isOrphaned: w.isOrphaned === true,
        status:  labelFor(context, w.status) || '',
        rating:  w.rating || null,
        wordCount: w.wordCount || null,
        kudosCount: w.kudosCount || null,
        bookmarksCount: w.bookmarksCount || null,
        hitsCount: w.hitsCount || null,
        updatedAt: w.updatedAt || null,
        completedAt: w.completedAt || null,
        publishedAt: w.publishedAt || null,
        inferredCompletedAt: w.inferredCompletedAt || null,
        finishedAt: w.finishedAt || null,
        subscribedAtAo3: (typeof w.subscribedAtAo3 === 'boolean') ? w.subscribedAtAo3 : null,
        fandoms: w.fandoms || [],
        relationship: w.relationship || '',
        seriesTitle: w.seriesTitle || '',
        seriesUrl: w.seriesUrl || null,
        seriesPosition: w.seriesPosition || '',
        customCategories: (w.customCats || [])
          .map(id => cats[id])
          .filter(Boolean)
          .map(c => ({ id: c.id, name: c.name, color: c.color, hideOnListings: c.hideOnListings === true })),
        notes:   w.notes || '',
        url:     w.url,
        addedAt: w.addedAt || null,
        movedAt: w.movedAt || null
      }));
      getHiddenRules(context, hiddenRules => {
        getHiddenRulePrefs(context, hiddenRulePrefs => {
          const payload = {
            version: 2,
            works: data,
            customCategories: Object.values(cats || {}).map(cat => ({ id: cat.id, name: cat.name, color: cat.color, hideOnListings: cat.hideOnListings === true })),
            hiddenRules: Object.values(hiddenRules || {}),
            hiddenRulePrefs: hiddenRulePrefs || { showReasons: true, crossoverThreshold: 3 }
          };
          downloadFile('ao3-tracker-export.json', JSON.stringify(payload, null, 2), 'application/json');
          stampExport();
          renderLastBackupStamp(context);
          showToast(context, 'Exported as JSON!');
        });
      });
    });
  }

  // --- Import functions ---
  function importCSV(context, text) {
    const works = getWorks(context);
    const lines = parseCsvRecords(text);
    if (lines.length < 2) { showToast(context, 'CSV is empty!'); return; }

    const headers = parseCSVRow(lines[0]).map(h => h.toLowerCase().trim());
    const col = name => headers.indexOf(name);

    const titleIdx        = col('title');
    const authorIdx       = col('author');
    const statusIdx       = col('status');
    const ratingIdx       = col('rating');
    const wordCountIdx    = col('word count');
    const kudosIdx        = col('kudos');
    const bookmarksIdx    = col('bookmarks');
    const hitsIdx         = col('hits');
    const fandomsIdx      = col('fandoms');
    const notesIdx        = col('notes');
    const urlIdx          = col('url');

    if (titleIdx === -1 || urlIdx === -1) {
      showToast(context, 'CSV must have Title and URL columns.');
      return;
    }

    let imported = 0, skipped = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cols = parseCSVRow(line);

      const title = cols[titleIdx] ? cols[titleIdx].trim() : '';
      const url   = cols[urlIdx]   ? cols[urlIdx].trim()   : '';
      if (!title || !url) { skipped++; continue; }

      const match  = url.match(/archiveofourown\.org\/works\/(\d+)/);
      const workId = match ? match[1] : `imported-${Date.now()}-${i}`;

      if (works[workId]) { skipped++; continue; }

      const statusRaw = (statusIdx !== -1 && cols[statusIdx] ? cols[statusIdx].trim() : '').toLowerCase();
      const ratingRaw = ratingIdx !== -1 ? parseInt(cols[ratingIdx]) : NaN;

      works[workId] = {
        id:      workId,
        title,
        author:  authorIdx !== -1 ? (cols[authorIdx] ? cols[authorIdx].trim() : 'Unknown') : 'Unknown',
        status:  STATUS_MAP[statusRaw] || 'want',
        rating:  !isNaN(ratingRaw) && ratingRaw >= 1 && ratingRaw <= 5 ? ratingRaw : null,
        wordCount: wordCountIdx !== -1 ? (parseInt(cols[wordCountIdx], 10) || null) : null,
        kudosCount: kudosIdx !== -1 ? (parseInt(cols[kudosIdx], 10) || null) : null,
        bookmarksCount: bookmarksIdx !== -1 ? (parseInt(cols[bookmarksIdx], 10) || null) : null,
        hitsCount: hitsIdx !== -1 ? (parseInt(cols[hitsIdx], 10) || null) : null,
        fandoms: fandomsIdx !== -1 && cols[fandomsIdx]
                 ? cols[fandomsIdx].split(';').map(f => f.trim()).filter(Boolean)
                 : [],
        notes:   notesIdx !== -1 ? (cols[notesIdx] ? cols[notesIdx].trim() : '') : '',
        url:     url.startsWith('http') ? url : `https://archiveofourown.org/works/${workId}`,
        addedAt: Date.now()
      };
      imported++;
    }

    saveWorks(context);
    renderAll(context);
    showToast(context, `Imported ${imported} work${imported !== 1 ? 's' : ''}${skipped ? `, ${skipped} skipped` : ''}!`);
  }

  function importJSON(context, text) {
    const works = getWorks(context);
    const parsed = JSON.parse(text);
    const data = Array.isArray(parsed) ? parsed : parsed?.works;
    if (!Array.isArray(data)) { showToast(context, 'Invalid JSON \u2014 expected exported works.'); return; }

    mergeImportedCategories(context, data, idMap => {
      let imported = 0, skipped = 0;

      for (const entry of data) {
        if (!entry.title || !entry.url) { skipped++; continue; }

        const match  = entry.url.match(/archiveofourown\.org\/works\/(\d+)/);
        const workId = match ? match[1] : `imported-${Date.now()}-${Math.random().toString(36).slice(2)}`;

        if (works[workId]) { skipped++; continue; }

        const statusRaw = (entry.status || '').toLowerCase().trim();
        const rating = entry.rating;
        const importedCats = Array.isArray(entry.customCategories) ? entry.customCategories : [];

        works[workId] = {
          id:      workId,
          title:   entry.title,
          author:  entry.author || 'Unknown',
          authorUrl: entry.authorUrl || null,
          isOrphaned: entry.isOrphaned === true,
          status:  STATUS_MAP[statusRaw] || (importedCats.length ? '' : 'want'),
          rating:  typeof rating === 'number' && rating >= 1 && rating <= 5 ? rating : null,
          wordCount: typeof entry.wordCount === 'number' && entry.wordCount > 0 ? entry.wordCount : null,
          kudosCount: typeof entry.kudosCount === 'number' && entry.kudosCount >= 0 ? entry.kudosCount : null,
          bookmarksCount: typeof entry.bookmarksCount === 'number' && entry.bookmarksCount >= 0 ? entry.bookmarksCount : null,
          hitsCount: typeof entry.hitsCount === 'number' && entry.hitsCount >= 0 ? entry.hitsCount : null,
          updatedAt: safeTimestamp(entry.updatedAt),
          completedAt: safeTimestamp(entry.completedAt),
          publishedAt: safeTimestamp(entry.publishedAt),
          inferredCompletedAt: safeTimestamp(entry.inferredCompletedAt),
          finishedAt: safeTimestamp(entry.finishedAt),
          subscribedAtAo3: typeof entry.subscribedAtAo3 === 'boolean' ? entry.subscribedAtAo3 : null,
          fandoms: Array.isArray(entry.fandoms) ? entry.fandoms : [],
          relationship: typeof entry.relationship === 'string' ? entry.relationship : '',
          seriesTitle: typeof entry.seriesTitle === 'string' ? entry.seriesTitle : '',
          seriesUrl: typeof entry.seriesUrl === 'string' ? entry.seriesUrl : null,
          seriesPosition: typeof entry.seriesPosition === 'string' ? entry.seriesPosition : '',
          customCats: importedCats
            .map(cat => normalizeImportedCategory(cat))
            .filter(Boolean)
            .map(cat => (cat.id && idMap[cat.id]) ? idMap[cat.id] : null)
            .filter(Boolean),
          notes:   entry.notes || '',
          url:     entry.url,
          addedAt: safeTimestamp(entry.addedAt, Date.now()),
          movedAt: safeTimestamp(entry.movedAt)
        };
        imported++;
      }

      if (!Array.isArray(parsed) && parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.hiddenRules)) setHiddenRules(context, parsed.hiddenRules);
        if (parsed.hiddenRulePrefs && typeof parsed.hiddenRulePrefs === 'object') setHiddenRulePrefs(context, parsed.hiddenRulePrefs);
      }

      saveWorks(context);
      renderAll(context);
      showToast(context, `Imported ${imported} work${imported !== 1 ? 's' : ''}${skipped ? `, ${skipped} skipped` : ''}!`);
    });
  }

  function triggerImport(context, type) {
    const input = document.getElementById('importFileInput');
    if (!input) return;
    input.accept = type === 'csv' ? '.csv' : '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          if (type === 'csv') importCSV(context, ev.target.result);
          else importJSON(context, ev.target.result);
        } catch (err) {
          showToast(context, 'Import failed \u2014 check file format.');
          console.error('Import error:', err);
        }
        input.value = '';
      };
      reader.readAsText(file);
    };
    input.click();
  }

  // --- Stamp and backup display ---
  function renderLastBackupStamp(context) {
    const el = document.getElementById('lastBackupStamp');
    if (!el) return;
    try {
      chrome.storage.local.get(getLastExportKey(), data => {
        const ts = data[getLastExportKey()];
        if (!ts) {
          el.textContent = 'No backup exported yet.';
          return;
        }
        const d = new Date(ts);
        if (Number.isNaN(d.getTime())) {
          el.textContent = 'No backup exported yet.';
          return;
        }
        el.textContent = `Last backup exported ${d.toLocaleDateString('en-US')} at ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}.`;
      });
    } catch (e) {
      el.textContent = 'No backup exported yet.';
    }
  }

  // --- Setup ---
  function setupControls(context) {
    document.getElementById('exportCSVDirect')?.addEventListener('click', () => exportCSV(context));
    document.getElementById('exportJSONDirect')?.addEventListener('click', () => exportJSON(context));
    document.getElementById('importCSVDirect')?.addEventListener('click', () => triggerImport(context, 'csv'));
    document.getElementById('importJSONDirect')?.addEventListener('click', () => triggerImport(context, 'json'));
    renderLastBackupStamp(context);
  }

  global.AO3TrackerExportImportPopupController = {
    setupControls,
    renderLastBackupStamp
  };

})(typeof globalThis !== 'undefined' ? globalThis : this);
