(function (global) {
  'use strict';

  let _deps = null;

  function init(deps) {
    _deps = deps;
  }

  function aotCsvCell(val) {
    const str = String(val||'');
    return (str.includes(',')||str.includes('"')||str.includes('\n'))
      ? '"'+str.replace(/"/g,'""')+'"' : str;
  }

  function aotParseCSVRecords(text) {
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

  function aotParseCSVRow(line) {
    const result=[]; let current='', inQuotes=false;
    for(let i=0;i<line.length;i++){
      const ch=line[i];
      if(ch==='"'){if(inQuotes&&line[i+1]==='"'){current+='"';i++;}else inQuotes=!inQuotes;}
      else if(ch===','&&!inQuotes){result.push(current);current='';}
      else current+=ch;
    }
    result.push(current);
    return result;
  }

  function aotSafeTimestamp(value, fallback = null) {
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

  function aotDownload(filename, content, type) {
    const blob=new Blob([content],{type});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url; a.download=filename; a.click();
    URL.revokeObjectURL(url);
  }

  function aotDoExport(type) {
    const { getWorks, getCustomCats, getHiddenRules, getHiddenRulePrefs, stampExport, showMiniToast, labelFor } = _deps;
    getWorks(works => {
      getCustomCats(cats => {
        const all = Object.values(works);
        if (all.length === 0) { showMiniToast('Nothing to export!'); return; }

        const dateShort = (ts) => (ts ? new Date(ts).toLocaleDateString('en-US') : '');

        if (type === 'csv') {
          const headers = ['Title','Author','Status','Rating','Word Count','Updated','Completed','Completed (inferred)','Subscribed','Fandoms','Custom Categories','Notes','URL','Added'];
          const rows = all.map(w => {
            const customCatNames = (w.customCats || [])
              .map(id => cats[id]?.name)
              .filter(Boolean)
              .join('; ');
            return [
              aotCsvCell(w.title),
              aotCsvCell(w.author),
              aotCsvCell(labelFor(w.status) || ''),
              w.rating ? w.rating + '/5' : '',
              w.wordCount ? String(w.wordCount) : '',
              w.updatedAt ? dateShort(w.updatedAt) : '',
              w.completedAt ? dateShort(w.completedAt) : '',
              (!w.completedAt && w.inferredCompletedAt) ? dateShort(w.inferredCompletedAt) : '',
              w.subscribedAtAo3 === true ? 'yes' : (w.subscribedAtAo3 === false ? 'no' : ''),
              aotCsvCell((w.fandoms||[]).join('; ')),
              aotCsvCell(customCatNames),
              aotCsvCell(w.notes||''),
              aotCsvCell(w.url),
              w.addedAt ? dateShort(w.addedAt) : ''
            ];
          });
          const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
          aotDownload('ao3-tracker-export.csv', csv, 'text/csv');
          stampExport();
          showMiniToast('Exported as CSV!');
        } else {
          const data = all.map(w => ({
            title: w.title,
            author: w.author,
            authorUrl: w.authorUrl || null,
            status: labelFor(w.status) || '',
            rating: w.rating || null,
            wordCount: w.wordCount || null,
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
            notes: w.notes || '',
            url: w.url,
            isOrphaned: w.isOrphaned === true,
            addedAt: w.addedAt || null,
            movedAt: w.movedAt || null
          }));
          const finish = (hiddenRules, hiddenRulePrefs) => {
            const payload = {
              version: 2,
              works: data,
              customCategories: Object.values(cats || {}).map(cat => ({ id: cat.id, name: cat.name, color: cat.color, hideOnListings: cat.hideOnListings === true })),
              hiddenRules: Array.isArray(hiddenRules) ? hiddenRules : Object.values(hiddenRules || {}),
              hiddenRulePrefs: hiddenRulePrefs || { showReasons: true, crossoverThreshold: 3 }
            };
            aotDownload('ao3-tracker-export.json', JSON.stringify(payload, null, 2), 'application/json');
            stampExport();
            showMiniToast('Exported as JSON!');
          };
          if (typeof getHiddenRules === 'function') {
            getHiddenRules(hiddenRules => {
              if (typeof getHiddenRulePrefs === 'function') {
                getHiddenRulePrefs(hiddenRulePrefs => finish(hiddenRules, hiddenRulePrefs));
              } else {
                finish(hiddenRules, { showReasons: true, crossoverThreshold: 3 });
              }
            });
          } else {
            finish({}, { showReasons: true, crossoverThreshold: 3 });
          }
        }
      });
    });
  }

  function aotDoImport(type) {
    const { getWorks, setWorks, getCustomCats, setCustomCats, getHiddenRules, setHiddenRules, getHiddenRulePrefs, setHiddenRulePrefs, genCatId, normalizeStatusValue, pruneTrackedWorkIfInvalid, showMiniToast, renderSidebar, document } = _deps;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = type === 'csv' ? '.csv' : '.json';
    document.body.appendChild(input);
    input.onchange = (e) => {
      const file = e.target.files[0];
      document.body.removeChild(input);
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (!chrome.runtime?.id) {
          alert('The AO3 Tracker extension was reloaded. Please refresh this page and try importing again.');
          return;
        }
        try {
          getWorks(works => {
            let imported = 0, skipped = 0;
            const statusMap = {
              'for later':'want','read later':'want','want to read':'want',
              'reading':'progress','in progress':'progress',
              'completed':'completed','re-reading':'rereading','rereading':'rereading',
              'on hold':'onhold','did not finish':'dnf','dnf':'dnf',
              'deleted':'lost'
            };

            if (type === 'csv') {
              const lines = aotParseCSVRecords(ev.target.result);
              if (lines.length < 2) { showMiniToast('CSV is empty!'); return; }
              const headers = aotParseCSVRow(lines[0]).map(h => h.toLowerCase().trim());
              const col = n => headers.indexOf(n);
              const ti=col('title'), ui=col('url'), ai=col('author'),
                    si=col('status'), ri=col('rating'), fi=col('fandoms'), ni=col('notes');
              if (ti===-1||ui===-1){showMiniToast('CSV needs Title and URL columns.');return;}
              for (let i=1;i<lines.length;i++){
                const line=lines[i].trim(); if(!line) continue;
                const cols=aotParseCSVRow(line);
                const title=cols[ti]?.trim(), url=cols[ui]?.trim();
                if(!title||!url){skipped++;continue;}
                const match=url.match(/archiveofourown\.org\/works\/(\d+)/);
                const workId=match?match[1]:`imported-${Date.now()}-${i}`;
                if(works[workId]){skipped++;continue;}
                const sr=(si!==-1?cols[si]?.trim():'').toLowerCase();
                const rat=ri!==-1?parseInt(cols[ri]):NaN;
                works[workId]={
                  id:workId, title,
                  author:ai!==-1?(cols[ai]?.trim()||'Unknown'):'Unknown',
                  status:statusMap[sr] || 'want',
                  rating:!isNaN(rat)&&rat>=1&&rat<=5?rat:null,
                  fandoms:fi!==-1&&cols[fi]?cols[fi].split(';').map(f=>f.trim()).filter(Boolean):[],
                  notes:ni!==-1?(cols[ni]?.trim()||''):'',
                  url:url.startsWith('http')?url:`https://archiveofourown.org/works/${workId}`,
                  addedAt:Date.now()
                };
                imported++;
              }
            } else {
              const parsed = JSON.parse(ev.target.result);
              const data = Array.isArray(parsed) ? parsed : parsed?.works;
              if (!Array.isArray(data)){showMiniToast('Invalid JSON.');return;}
              getCustomCats(cats => {
                const mergedCats = { ...cats };
                const idMap = {};
                data.forEach(entry => {
                  const importedCats = Array.isArray(entry.customCategories) ? entry.customCategories : [];
                  importedCats.forEach(rawCat => {
                    const cat = normalizeImportedCategory(rawCat);
                    if (!cat) return;
                    let resolvedId = null;
                    if (cat.id && mergedCats[cat.id] &&
                        mergedCats[cat.id].name === cat.name &&
                        mergedCats[cat.id].color === cat.color) {
                      resolvedId = cat.id;
                    } else if (cat.id && !mergedCats[cat.id]) {
                      resolvedId = cat.id;
                    } else {
                      const existingCat = Object.values(mergedCats).find(c => c.name === cat.name && c.color === cat.color);
                      if (existingCat) resolvedId = existingCat.id;
                    }
                    if (!resolvedId) resolvedId = genCatId();
                    mergedCats[resolvedId] = { id: resolvedId, name: cat.name, color: cat.color, hideOnListings: cat.hideOnListings === true };
                    if (cat.id) idMap[cat.id] = resolvedId;
                  });
                });
                setCustomCats(mergedCats);

                for (const entry of data){
                  if(!entry.title||!entry.url){skipped++;continue;}
                  const match=entry.url.match(/archiveofourown\.org\/works\/(\d+)/);
                  const workId=match?match[1]:`imported-${Date.now()}-${Math.random().toString(36).slice(2)}`;
                  if(works[workId]){skipped++;continue;}
                  const sr=(entry.status||'').toLowerCase().trim();
                  const rat=entry.rating;
                  const importedCustomCats = Array.isArray(entry.customCategories) ? entry.customCategories : [];
                  works[workId]={
                    id:workId, title:entry.title, author:entry.author||'Unknown', authorUrl: entry.authorUrl || null,
                    isOrphaned: entry.isOrphaned === true,
                    status:statusMap[sr] || (importedCustomCats.length ? '' : 'want'),
                    rating:typeof rat==='number'&&rat>=1&&rat<=5?rat:null,
                    wordCount:typeof entry.wordCount==='number'&&entry.wordCount>0?entry.wordCount:null,
                    updatedAt:aotSafeTimestamp(entry.updatedAt),
                    completedAt:aotSafeTimestamp(entry.completedAt),
                    publishedAt:aotSafeTimestamp(entry.publishedAt),
                    inferredCompletedAt:aotSafeTimestamp(entry.inferredCompletedAt),
                    finishedAt:aotSafeTimestamp(entry.finishedAt),
                      subscribedAtAo3:typeof entry.subscribedAtAo3==='boolean'?entry.subscribedAtAo3:null,
                      fandoms:Array.isArray(entry.fandoms)?entry.fandoms:[],
                      relationship:typeof entry.relationship==='string'?entry.relationship:'',
                      seriesTitle:typeof entry.seriesTitle==='string'?entry.seriesTitle:'',
                      seriesUrl:typeof entry.seriesUrl==='string'?entry.seriesUrl:null,
                      seriesPosition:typeof entry.seriesPosition==='string'?entry.seriesPosition:'',
                      customCats:importedCustomCats
                        .map(rawCat => normalizeImportedCategory(rawCat))
                        .filter(Boolean)
                      .map(cat => (cat.id && idMap[cat.id]) ? idMap[cat.id] : null)
                      .filter(Boolean),
                    notes:entry.notes||'', url:entry.url,
                    addedAt:aotSafeTimestamp(entry.addedAt, Date.now()),
                    movedAt:aotSafeTimestamp(entry.movedAt)
                  };
                  imported++;
                }

                if (!Array.isArray(parsed) && parsed && typeof parsed === 'object') {
                  if (Array.isArray(parsed.hiddenRules) && typeof setHiddenRules === 'function') setHiddenRules(parsed.hiddenRules);
                  if (parsed.hiddenRulePrefs && typeof parsed.hiddenRulePrefs === 'object' && typeof setHiddenRulePrefs === 'function') setHiddenRulePrefs(parsed.hiddenRulePrefs);
                }

                setWorks(works);
                renderSidebar();
                showMiniToast(`Imported ${imported} work${imported!==1?'s':''}${skipped?`, ${skipped} skipped`:''}!`);
              });
              return;
            }

            setWorks(works);
            renderSidebar();
            showMiniToast(`Imported ${imported} work${imported!==1?'s':''}${skipped?`, ${skipped} skipped`:''}!`);
          });
        } catch(err) {
          showMiniToast('Import failed — check file format.');
          console.error('Sidebar import error:', err);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  const AO3TrackerExportImport = {
    init,
    aotDoExport,
    aotDoImport
  };

  global.AO3TrackerExportImport = AO3TrackerExportImport;
  if (typeof module !== 'undefined' && module.exports) module.exports = AO3TrackerExportImport;
})(typeof globalThis !== 'undefined' ? globalThis : this);
