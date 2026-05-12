(function (global) {
  'use strict';

  let _deps = null;
  let _started = false;
  let _messageListenerRegistered = false;
  let _storageListenerRegistered = false;
  let _activeTab = 'all';
  let _searchQuery = '';
  const _flippedCards = new Set();
  let _syncingCurrentStory = false;
  let _renderingTrackButton = false;
  let _editingCatId = null;
  let _pageWatchersRegistered = false;
  let _lastStorySignature = '';
  let _onboardingDismissed = false;
  let _ffNotesModalBound = false;
  let _listingBadgeDebounce = null;

  const FAB_ID = 'ao3tracker-fab';
  const SIDEBAR_ID = 'ao3tracker-sidebar';
  const PANEL_ID = 'ao3tracker-panel';
  const TRACK_BUTTON_ID = 'ao3tracker-btn';
  const BADGE_ATTR = 'data-fg-ffnet-badge';
  const BADGE_MENU_CLASS = 'ao3t-badge-dropdown';

  const STATUS_ORDER = ['all', 'want', 'progress', 'completed', 'rereading', 'onhold', 'dnf', 'lost'];
  const STATUS_LABELS = {
    want: 'For Later',
    progress: 'Reading',
    completed: 'Completed',
    rereading: 'Re-reading',
    onhold: 'On Hold',
    dnf: 'Did Not Finish',
    lost: 'Deleted'
  };
  const CAT_PRESETS = ['#7c3aed', '#db2777', '#dc2626', '#d97706', '#16a34a', '#0891b2', '#2563eb', '#4f46e5', '#d946ef', '#6b7280'];
  const EXPORT_REMIND_DAYS = 30;
  const FIRST_EXPORT_GRACE_DAYS = 7;

  function init(deps) {
    _deps = deps;
  }

  function ready() {
    return !!(_deps && _deps.window && _deps.document && _deps.chrome);
  }

  function extensionContextAvailable() {
    try {
      return !!(_deps && _deps.chrome && _deps.chrome.runtime && _deps.chrome.runtime.id && _deps.chrome.storage && _deps.chrome.storage.local);
    } catch (e) {
      return false;
    }
  }

  function handleInvalidatedContext() {
    try {
      const fab = d().getElementById(FAB_ID);
      const sidebar = d().getElementById(SIDEBAR_ID);
      sidebar?.classList.remove('aot-open');
      d().body.classList.remove('aot-tracker-dock-open');
      d().body.style.removeProperty('margin-right');
      if (fab) {
        fab.disabled = true;
        fab.title = 'Reload this FF.net tab to reopen FandomGobbler';
      }
      showMiniToast('Please refresh the FF.net page to use the tracker.');
    } catch (e) {}
  }

  function d() {
    return _deps.document;
  }

  function w() {
    return _deps.window;
  }

  function core() {
    return _deps.FfnetCore || {};
  }

  function toast() {
    return _deps.Toast || {};
  }

  function notesModal() {
    return _deps.NotesModal || {};
  }

  function pageTheme() {
    return _deps.PageThemeController || {};
  }

  function sidebarTemplate() {
    return _deps.PlatformSidebarTemplate || globalThis.AO3TrackerPlatformSidebarTemplate || {};
  }

  function worksKey() {
    return typeof _deps.getWorksStorageKey === 'function' ? _deps.getWorksStorageKey() : 'fandomgobbler_ffnet_works';
  }

  function customCatsKey() {
    return typeof _deps.getCustomCatsStorageKey === 'function' ? _deps.getCustomCatsStorageKey() : 'fandomgobbler_ffnet_customcats';
  }

  function platformKey() {
    return _deps.storageKeys && _deps.storageKeys.DASHBOARD_PLATFORM_KEY
      ? _deps.storageKeys.DASHBOARD_PLATFORM_KEY
      : 'fandomgobbler_platform';
  }

  function exportStampKey() {
    return `${worksKey()}_last_export`;
  }

  function exportDismissKey() {
    return `${worksKey()}_export_reminder_dismissed`;
  }

  function onboardingDismissKey() {
    return `${worksKey()}_onboarding_dismissed`;
  }

  function themeKeys() {
    const keys = _deps.storageKeys || {};
    return {
      sidebar: keys.FFNET_SIDEBAR_THEME_KEY || 'fandomgobbler_ffnet_sidebar_theme'
    };
  }

  function normalizeStatus(status) {
    return typeof _deps.normalizeStatusValue === 'function' ? _deps.normalizeStatusValue(status) : (status || '');
  }

  function esc(text) {
    const utils = _deps && _deps.Utils;
    if (utils && typeof utils.esc === 'function') return utils.esc(text);
    return String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function trunc(text, max) {
    const utils = _deps && _deps.Utils;
    if (utils && typeof utils.trunc === 'function') return utils.trunc(text, max);
    const value = String(text || '');
    return value.length > max ? `${value.slice(0, max - 1)}...` : value;
  }

  function showMiniToast(message) {
    if (typeof toast().showMiniToast === 'function') {
      toast().showMiniToast(message);
    }
  }

  function ensureStyles() {
    if (!ready() || d().getElementById('fg-ffnet-shared-style')) return;
    const style = d().createElement('style');
    style.id = 'fg-ffnet-shared-style';
    style.textContent = `
      body {
        transition: margin-right 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      }
      #${PANEL_ID} .fg-platform-note{
        padding: 8px 12px;
        border-bottom: 1px solid rgba(0,0,0,0.06);
        font-size: 11px;
        line-height: 1.45;
        color: #77756d;
        background: #fbfaf8;
      }
      #${PANEL_ID} .fg-platform-note strong{
        color: #555550;
      }
      #${PANEL_ID} .fg-empty{
        padding: 14px 12px;
      }
      #${PANEL_ID} .fg-tab-label{
        display:inline-flex;
        align-items:center;
        gap:4px;
      }
      #${PANEL_ID} .fg-list-card-summary{
        margin-top: 2px;
      }
      #${PANEL_ID} .fg-list-card-links{
        display:flex;
        gap:6px;
        flex-wrap:wrap;
        margin-top:6px;
      }
      #${PANEL_ID} .fg-mini-link{
        font-size: 11px;
        color: #2563eb;
        text-decoration: none;
      }
      #${PANEL_ID} .fg-mini-link:hover{
        text-decoration: underline;
      }
      #${PANEL_ID} .fg-current-meta{
        font-size: 11px;
        color: #8a887f;
      }
      #${PANEL_ID} #aot-current-info{
        cursor:pointer;
      }
      #${PANEL_ID} #aot-current-info:hover #aot-current-title{
        text-decoration: underline;
      }
      #${PANEL_ID} .fg-current-jump{
        animation: fg-current-jump-flash 1.2s ease;
      }
      @keyframes fg-current-jump-flash{
        0% { box-shadow: 0 0 0 0 rgba(37,99,235,0.32); border-color: rgba(37,99,235,0.4); }
        100% { box-shadow: 0 0 0 0 rgba(37,99,235,0); border-color: inherit; }
      }
      #${PANEL_ID} .fg-card-summary{
        white-space: pre-wrap;
      }
      #${TRACK_BUTTON_ID} .fg-track-inline-meta{
        display:flex;
        align-items:center;
        flex-wrap:wrap;
        gap:4px;
        margin-top:0;
      }
      #${TRACK_BUTTON_ID} .fg-track-inline-chips{
        display:inline-flex;
        align-items:center;
        flex-wrap:wrap;
        gap:5px;
      }
      #${TRACK_BUTTON_ID} .fg-track-inline-chip{
        display:inline-flex;
        align-items:center;
        padding:1px 7px;
        border-radius:999px;
        font-size:11px;
        line-height:1.6;
        box-sizing:border-box;
        color: var(--chip-color, #5f5f58);
        background: color-mix(in srgb, var(--chip-color, #5f5f58) 12%, #fff);
        border: 1px solid color-mix(in srgb, var(--chip-color, #5f5f58) 28%, transparent);
        vertical-align: top;
      }
      #${TRACK_BUTTON_ID} .fg-track-inline-pill{
        display:inline-flex;
        align-items:center;
        padding:1px 7px;
        border-radius:999px;
        font-size:11px;
        line-height:1.6;
        box-sizing:border-box;
        color:#0f766e;
        background:#ecfeff;
        border:1px solid rgba(8,145,178,0.25);
        vertical-align: top;
      }
      #${PANEL_ID} #aot-custom-tabs{
        display:inline-flex;
        align-items:stretch;
      }
      #${PANEL_ID} #aot-status-tabs{
        display:inline-flex;
        align-items:stretch;
      }
      .ao3tracker-dropdown,
      .${BADGE_MENU_CLASS}{
        z-index: 1000001;
      }
      #${PANEL_ID} .aot-status-badge,
      #${PANEL_ID} .aot-custom-chip,
      #${PANEL_ID} .aot-card-chapter-pill {
        font-size: 10px !important;
        padding: 2px 7px !important;
        line-height: 1.25 !important;
        min-height: 20px !important;
        display: inline-flex !important;
        align-items: center !important;
        box-sizing: border-box !important;
      }
      #${PANEL_ID} .aot-card-edit-notes {
        border: none !important;
        background: transparent !important;
        color: #1d4ed8 !important;
        cursor: pointer !important;
        padding: 0 !important;
        font-size: 13px !important;
        line-height: 1 !important;
        border-radius: 4px !important;
      }
      #${PANEL_ID} .aot-card-edit-notes:hover {
        background: rgba(37,99,235,0.08) !important;
      }
      #${PANEL_ID} .aot-card-summary-toggle {
        border: none !important;
        background: transparent !important;
        padding: 0 !important;
        margin-left: 4px !important;
        color: #2563eb !important;
        font: inherit !important;
        line-height: inherit !important;
        cursor: pointer !important;
        position: relative !important;
        top: -3px !important;
      }
      #${PANEL_ID} .aot-card-summary-toggle:hover {
        text-decoration: underline !important;
      }
      #${PANEL_ID} #aot-list { gap: 8px !important; }
      #${PANEL_ID} #aot-title {
        font-family: 'Arial Narrow', Arial, sans-serif !important;
        font-weight: 800 !important;
        font-size: 15px !important;
        letter-spacing: 0.01em !important;
        transform: scale(1.12, 1.26) !important;
        transform-origin: 0 60% !important;
      }
    `;
    d().head.appendChild(style);
  }

  function getWorks(cb) {
    if (!extensionContextAvailable()) {
      handleInvalidatedContext();
      cb({});
      return;
    }
    try {
      _deps.chrome.storage.local.get(worksKey(), data => {
        const raw = data[worksKey()] || {};
        const sanitized = typeof _deps.sanitizeTrackedWorksMap === 'function'
          ? _deps.sanitizeTrackedWorksMap(raw)
          : { works: raw, changed: false };
        if (sanitized.changed) {
          try {
            _deps.chrome.storage.local.set({ [worksKey()]: sanitized.works }, () => cb(sanitized.works));
          } catch (e) {
            handleInvalidatedContext();
            cb(sanitized.works);
          }
          return;
        }
        cb(sanitized.works);
      });
    } catch (e) {
      handleInvalidatedContext();
      cb({});
    }
  }

  function setWorks(works, cb) {
    if (!extensionContextAvailable()) {
      handleInvalidatedContext();
      if (typeof cb === 'function') cb();
      return;
    }
    try {
      _deps.chrome.storage.local.set({ [worksKey()]: works }, cb);
    } catch (e) {
      handleInvalidatedContext();
      if (typeof cb === 'function') cb();
    }
  }

  function getCustomCats(cb) {
    if (!extensionContextAvailable()) {
      handleInvalidatedContext();
      cb({});
      return;
    }
    try {
      const key = customCatsKey();
      _deps.chrome.storage.local.get(key, data => {
        cb(data[key] || {});
      });
    } catch (e) {
      handleInvalidatedContext();
      cb({});
    }
  }

  function setCustomCats(cats, cb) {
    if (!extensionContextAvailable()) {
      handleInvalidatedContext();
      if (typeof cb === 'function') cb();
      return;
    }
    try {
      _deps.chrome.storage.local.set({ [customCatsKey()]: cats || {} }, cb);
    } catch (e) {
      handleInvalidatedContext();
      if (typeof cb === 'function') cb();
    }
  }

  function genCatId() {
    return `cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  }

  function stampExport() {
    try {
      _deps.chrome.storage.local.set({ [exportStampKey()]: Date.now() });
      try { sessionStorage.removeItem(exportDismissKey()); } catch (e) {}
    } catch (e) {}
  }

  function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = d().createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function doExport(type) {
    getWorks(works => {
      getCustomCats(cats => {
        const all = Object.values(works || {}).filter(work => work && work.platform === 'ffnet');
        if (!all.length) {
          showMiniToast('Nothing to export yet.');
          return;
        }

        if (type === 'csv') {
          const headers = ['Title', 'Author', 'Status', 'Rating', 'Word Count', 'Fandoms', 'Relationship', 'Custom Categories', 'Notes', 'URL', 'Added'];
          const rows = all.map(work => {
            const customCatNames = (work.customCats || [])
              .map(id => cats[id]?.name)
              .filter(Boolean)
              .join('; ');
            return [
              core().csvCell(work.title),
              core().csvCell(work.author),
              core().csvCell(STATUS_LABELS[normalizeStatus(work.status)] || ''),
              work.rating ? String(work.rating) : '',
              work.wordCount ? String(work.wordCount) : '',
              core().csvCell((work.fandoms || []).join('; ')),
              core().csvCell(work.relationship || ''),
              core().csvCell(customCatNames),
              core().csvCell(work.notes || ''),
              core().csvCell(work.url || ''),
              work.addedAt ? new Date(work.addedAt).toLocaleDateString('en-US') : ''
            ];
          });
          downloadFile('fandomgobbler-ffnet-export.csv', [headers, ...rows].map(row => row.join(',')).join('\n'), 'text/csv');
        } else {
          const payload = all.map(work => ({
            ...work,
            statusLabel: STATUS_LABELS[normalizeStatus(work.status)] || '',
            customCategories: (work.customCats || [])
              .map(id => cats[id])
              .filter(Boolean)
              .map(cat => ({ id: cat.id, name: cat.name, color: cat.color, hideOnListings: cat.hideOnListings === true }))
          }));
          downloadFile('fandomgobbler-ffnet-export.json', JSON.stringify(payload, null, 2), 'application/json');
        }
        stampExport();
        showMiniToast(`Exported as ${type.toUpperCase()}!`);
      });
    });
  }

  function doImport(type) {
    const input = d().createElement('input');
    input.type = 'file';
    input.accept = type === 'csv' ? '.csv' : '.json';
    d().body.appendChild(input);
    input.onchange = event => {
      const file = event.target.files && event.target.files[0];
      d().body.removeChild(input);
      if (!file) return;
      const reader = new FileReader();
      reader.onload = loadEvent => {
        try {
          getWorks(works => {
            getCustomCats(cats => {
              const nextWorks = { ...(works || {}) };
              const nextCats = { ...(cats || {}) };
              let imported = 0;
              let skipped = 0;

              if (type === 'csv') {
                const lines = core().parseCsvRecords(loadEvent.target.result);
                if (lines.length < 2) {
                  showMiniToast('CSV is empty.');
                  return;
                }
                const headers = core().parseCsvRow(lines[0]).map(header => header.toLowerCase().trim());
                const col = name => headers.indexOf(name);
                const titleIndex = col('title');
                const urlIndex = col('url');
                const authorIndex = col('author');
                const statusIndex = col('status');
                const ratingIndex = col('rating');
                const fandomsIndex = col('fandoms');
                const relationshipIndex = col('relationship');
                const notesIndex = col('notes');
                if (titleIndex === -1 || urlIndex === -1) {
                  showMiniToast('CSV needs Title and URL columns.');
                  return;
                }
                for (let i = 1; i < lines.length; i += 1) {
                  const cols = core().parseCsvRow(lines[i]);
                  const title = cols[titleIndex]?.trim();
                  const url = cols[urlIndex]?.trim();
                  if (!title || !url) {
                    skipped += 1;
                    continue;
                  }
                  const workId = core().extractStoryIdFromUrl(url) || `ffnet-import-${Date.now()}-${i}`;
                  if (nextWorks[workId]) {
                    skipped += 1;
                    continue;
                  }
                  const rawStatus = String(cols[statusIndex] || '').toLowerCase().trim();
                  const status = ({
                    'for later': 'want',
                    'reading': 'progress',
                    'completed': 'completed',
                    're-reading': 'rereading',
                    'on hold': 'onhold',
                    'did not finish': 'dnf',
                    'deleted': 'lost'
                  })[rawStatus] || 'want';
                  nextWorks[workId] = {
                    id: workId,
                    workId,
                    platform: 'ffnet',
                    title,
                    author: cols[authorIndex]?.trim() || 'Unknown',
                    status,
                    rating: Number.isFinite(Number(cols[ratingIndex])) ? Number(cols[ratingIndex]) : null,
                    fandoms: cols[fandomsIndex] ? cols[fandomsIndex].split(';').map(item => item.trim()).filter(Boolean) : [],
                    relationship: cols[relationshipIndex]?.trim() || '',
                    notes: cols[notesIndex]?.trim() || '',
                    url,
                    addedAt: Date.now()
                  };
                  imported += 1;
                }
              } else {
                const data = JSON.parse(loadEvent.target.result);
                if (!Array.isArray(data)) {
                  showMiniToast('Invalid JSON file.');
                  return;
                }
                data.forEach(entry => {
                  const importedCats = Array.isArray(entry.customCategories) ? entry.customCategories : [];
                  importedCats.forEach(rawCat => {
                    const cat = core().normalizeImportedCategory(rawCat);
                    if (!cat) return;
                    let resolvedId = cat.id && nextCats[cat.id] ? cat.id : null;
                    if (!resolvedId) {
                      const existingCat = Object.values(nextCats).find(existing => existing.name === cat.name && existing.color === cat.color);
                      resolvedId = existingCat ? existingCat.id : genCatId();
                    }
                    nextCats[resolvedId] = { id: resolvedId, name: cat.name, color: cat.color, hideOnListings: cat.hideOnListings === true };
                    cat._resolvedId = resolvedId;
                  });
                });
                data.forEach(entry => {
                  const url = String(entry.url || '').trim();
                  const title = String(entry.title || '').trim();
                  if (!url || !title) {
                    skipped += 1;
                    return;
                  }
                  const workId = core().extractStoryIdFromUrl(url) || `ffnet-import-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
                  if (nextWorks[workId]) {
                    skipped += 1;
                    return;
                  }
                  const importedCats = Array.isArray(entry.customCategories) ? entry.customCategories : [];
                  nextWorks[workId] = {
                    id: workId,
                    workId,
                    platform: 'ffnet',
                    title,
                    author: entry.author || 'Unknown',
                    authorUrl: entry.authorUrl || null,
                    status: normalizeStatus(entry.status) || '',
                    rating: typeof entry.rating === 'number' ? entry.rating : null,
                    wordCount: typeof entry.wordCount === 'number' ? entry.wordCount : null,
                    fandoms: Array.isArray(entry.fandoms) ? entry.fandoms : [],
                    relationship: typeof entry.relationship === 'string' ? entry.relationship : '',
                    summary: typeof entry.summary === 'string' ? entry.summary : '',
                    notes: typeof entry.notes === 'string' ? entry.notes : '',
                    url,
                    chapterCount: entry.chapterCount || null,
                    furthestChapter: entry.furthestChapter || null,
                    customCats: importedCats.map(cat => core().normalizeImportedCategory(cat)).filter(Boolean).map(cat => {
                      const existingCat = Object.values(nextCats).find(existing => existing.name === cat.name && existing.color === cat.color);
                      return existingCat ? existingCat.id : null;
                    }).filter(Boolean),
                    addedAt: core().safeTimestamp(entry.addedAt, Date.now()),
                    movedAt: core().safeTimestamp(entry.movedAt),
                    updatedAt: core().safeTimestamp(entry.updatedAt),
                    completedAt: core().safeTimestamp(entry.completedAt),
                    publishedAt: core().safeTimestamp(entry.publishedAt)
                  };
                  imported += 1;
                });
              }

              setCustomCats(nextCats, () => {
                setWorks(nextWorks, () => {
                  renderSidebar();
                  showMiniToast(`Imported ${imported} work${imported !== 1 ? 's' : ''}${skipped ? `, ${skipped} skipped` : ''}.`);
                });
              });
            });
          });
        } catch (error) {
          console.error('[FandomGobbler FF.net] Import failed', error);
          showMiniToast('Import failed. Check the file format.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  function persistPlatformSelection() {
    if (!extensionContextAvailable()) {
      handleInvalidatedContext();
      return;
    }
    _deps.chrome.storage.local.set({ [platformKey()]: 'ffnet' });
  }

  function applySidebarTheme(explicitTheme) {
    if (explicitTheme !== undefined && explicitTheme !== null) {
      if (typeof pageTheme().applyTrackerThemeToSidebar === 'function') {
        pageTheme().applyTrackerThemeToSidebar(explicitTheme);
      }
      return;
    }
    const keys = themeKeys();
    if (!extensionContextAvailable()) {
      handleInvalidatedContext();
      return;
    }
    _deps.chrome.storage.local.get(keys.sidebar, data => {
      const theme = data[keys.sidebar] || 'light';
      if (typeof pageTheme().applyTrackerThemeToSidebar === 'function') {
        pageTheme().applyTrackerThemeToSidebar(theme);
      }
    });
  }

  function checkExportReminder() {
    const banner = d().getElementById('aot-export-reminder');
    const msg = d().getElementById('aot-reminder-msg');
    if (!banner || !msg) return;
    try {
      if (sessionStorage.getItem(exportDismissKey()) === '1') {
        banner.classList.add('aot-hidden');
        return;
      }
    } catch (e) {}
    if (!extensionContextAvailable()) {
      handleInvalidatedContext();
      return;
    }
    _deps.chrome.storage.local.get([worksKey(), exportStampKey()], data => {
      const workList = Object.values(data[worksKey()] || {}).filter(work => work && work.platform === 'ffnet');
      if (!workList.length) {
        banner.classList.add('aot-hidden');
        return;
      }
      const firstTrackedAt = workList
        .map(work => Number(work && work.addedAt))
        .filter(Number.isFinite)
        .sort((a, b) => a - b)[0] || null;
      const last = data[exportStampKey()];
      const daysSince = last != null ? Math.floor((Date.now() - last) / 86400000) : null;
      const graceElapsed = firstTrackedAt != null && (Date.now() - firstTrackedAt) >= (FIRST_EXPORT_GRACE_DAYS * 86400000);
      const overdue = last != null ? daysSince >= EXPORT_REMIND_DAYS : graceElapsed;
      if (!overdue) {
        banner.classList.add('aot-hidden');
        return;
      }
      msg.textContent = last != null
        ? `No backup in ${daysSince} days - export your FF.net library?`
        : `You haven't exported your FF.net library yet - back it up?`;
      banner.classList.remove('aot-hidden');
    });
  }

  function loadOnboardingDismissed() {
    if (!extensionContextAvailable()) {
      handleInvalidatedContext();
      _onboardingDismissed = false;
      renderSidebar();
      return;
    }
    _deps.chrome.storage.local.get(onboardingDismissKey(), data => {
      _onboardingDismissed = !!data[onboardingDismissKey()];
      renderSidebar();
    });
  }

  function dismissOnboarding() {
    _onboardingDismissed = true;
    try { _deps.chrome.storage.local.set({ [onboardingDismissKey()]: true }); } catch (e) {}
    const onboarding = d().getElementById('aot-sidebar-onboarding');
    if (onboarding) onboarding.style.display = 'none';
    const empty = d().getElementById('aot-empty');
    if (empty) {
      empty.style.display = 'block';
      empty.textContent = 'No FanFiction.net works tracked yet. Open any fic and use the Track control.';
    }
  }

  function bindNotesModal() {
    if (_ffNotesModalBound) return;
    _ffNotesModalBound = true;
    d().getElementById('aot-notes-close')?.addEventListener('click', () => notesModal().closeNotesModal?.());
    d().getElementById('aot-notes-cancel')?.addEventListener('click', () => notesModal().closeNotesModal?.());
    d().getElementById('aot-notes-save')?.addEventListener('click', () => notesModal().saveNotesModal?.());
    d().getElementById('aot-clear-rating')?.addEventListener('click', () => {
      notesModal().setPendingRating?.(null);
      notesModal().updateStars?.(null);
    });
    d().querySelectorAll('.aot-star').forEach(star => {
      star.addEventListener('click', () => {
        const value = Number(star.dataset.val);
        notesModal().setPendingRating?.(value);
        notesModal().updateStars?.(value);
      });
      star.addEventListener('mouseenter', () => {
        const value = Number(star.dataset.val);
        notesModal().updateStars?.(value);
      });
    });
    d().getElementById('aot-stars')?.addEventListener('mouseleave', () => {
      notesModal().updateStars?.(notesModal().getPendingRating?.());
    });
  }

  function bindHeaderActions(sidebar) {
    const exportBtn = sidebar.querySelector('#aot-export-btn');
    const exportDd = sidebar.querySelector('#aot-export-dropdown');
    const themeBtn = sidebar.querySelector('#aot-theme-toggle');

    exportBtn?.addEventListener('click', event => {
      event.stopPropagation();
      exportDd?.classList.toggle('aot-hidden');
    });
    sidebar.querySelector('#aot-export-csv')?.addEventListener('click', event => {
      event.stopPropagation();
      exportDd?.classList.add('aot-hidden');
      doExport('csv');
    });
    sidebar.querySelector('#aot-export-json')?.addEventListener('click', event => {
      event.stopPropagation();
      exportDd?.classList.add('aot-hidden');
      doExport('json');
    });
    sidebar.querySelector('#aot-import-csv')?.addEventListener('click', event => {
      event.stopPropagation();
      exportDd?.classList.add('aot-hidden');
      doImport('csv');
    });
    sidebar.querySelector('#aot-import-json')?.addEventListener('click', event => {
      event.stopPropagation();
      exportDd?.classList.add('aot-hidden');
      doImport('json');
    });
    sidebar.querySelector('#aot-reminder-dismiss')?.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      try { sessionStorage.setItem(exportDismissKey(), '1'); } catch (e) {}
      d().getElementById('aot-export-reminder')?.classList.add('aot-hidden');
    });
    sidebar.querySelector('#aot-reminder-export')?.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      d().getElementById('aot-export-reminder')?.classList.add('aot-hidden');
      doExport('json');
    });
    themeBtn?.addEventListener('click', () => {
      const keys = themeKeys();
      if (!extensionContextAvailable()) {
        handleInvalidatedContext();
        return;
      }
      _deps.chrome.storage.local.get(keys.sidebar, data => {
        const current = data[keys.sidebar] || 'light';
        const next = typeof pageTheme().nextAo3trackerTheme === 'function'
          ? pageTheme().nextAo3trackerTheme(current)
          : ({ light: 'sol-light', 'sol-light': 'dark', dark: 'light' }[current] || 'light');
        _deps.chrome.storage.local.set({ [keys.sidebar]: next }, () => {
          applySidebarTheme(next);
        });
      });
    });
  }

  function currentStoryInfo() {
    return core().extractWorkInfoFromDocument ? core().extractWorkInfoFromDocument(d(), w().location.href) : null;
  }

  function currentStorySignature() {
    const info = currentStoryInfo();
    if (!info || !info.workId) return String(w().location.href || '');
    const chapterNum = info.furthestChapter && Number.isFinite(Number(info.furthestChapter.num))
      ? Number(info.furthestChapter.num)
      : 0;
    return `${info.workId}:${chapterNum}:${String(w().location.href || '')}`;
  }

  function statusBadgeClass(status) {
    const normalized = normalizeStatus(status);
    return normalized ? `aot-status-badge aot-status-${normalized}` : 'aot-status-badge';
  }

  function listingBadgeClass(status) {
    const normalized = normalizeStatus(status);
    return normalized ? `ao3t-search-badge ao3t-search-badge-${normalized}` : 'ao3t-search-badge';
  }

  function buildWorkRecord(info, status, previous) {
    const prev = previous || {};
    const nextStatus = normalizeStatus(status);
    const prevChapter = prev.furthestChapter && Number.isFinite(Number(prev.furthestChapter.num))
      ? prev.furthestChapter
      : null;
    const incomingChapter = info && info.furthestChapter && Number.isFinite(Number(info.furthestChapter.num))
      ? info.furthestChapter
      : null;
    const mergedChapter = !prevChapter
      ? incomingChapter
      : (!incomingChapter || Number(prevChapter.num) >= Number(incomingChapter.num)
          ? {
              ...incomingChapter,
              ...prevChapter,
              total: incomingChapter && incomingChapter.total != null ? incomingChapter.total : prevChapter.total
            }
          : incomingChapter);
    return {
      ...prev,
      ...info,
      id: info.workId,
      platform: 'ffnet',
      status: nextStatus,
      fandoms: Array.isArray(info.fandoms) ? info.fandoms : (prev.fandoms || []),
      customCats: Array.isArray(prev.customCats) ? prev.customCats : [],
      notes: prev.notes,
      rating: prev.rating,
      furthestChapter: mergedChapter,
      chapterCount: info.chapterCount || prev.chapterCount || (mergedChapter && mergedChapter.total) || null,
      finishedAt: typeof _deps.nextFinishedAt === 'function' ? _deps.nextFinishedAt(prev.status, nextStatus, prev.finishedAt) : (prev.finishedAt || null),
      addedAt: prev.addedAt || Date.now(),
      movedAt: Date.now()
    };
  }

  function addOrMoveWork(info, status, done) {
    if (!info || !info.workId) return;
    getWorks(works => {
      works[info.workId] = buildWorkRecord(info, status, works[info.workId]);
      setWorks(works, () => {
        refresh();
        if (typeof done === 'function') done();
      });
    });
  }

  function removeWork(workId, done) {
    getWorks(works => {
      if (!works[workId]) return;
      delete works[workId];
      setWorks(works, () => {
        refresh();
        if (typeof done === 'function') done();
      });
    });
  }

  function ensureDropdownDismissListener() {
    if (d()._fgFfnetDropdownDismiss) return;
    d()._fgFfnetDropdownDismiss = true;
    d().addEventListener('click', event => {
      d().querySelectorAll('.ao3tracker-dropdown, .ao3t-badge-dropdown').forEach(dropdown => {
        dropdown.classList.remove('open');
      });
      d().getElementById('aot-current-dropdown')?.classList.add('aot-hidden');
      const exportBtn = d().getElementById('aot-export-btn');
      const exportDd = d().getElementById('aot-export-dropdown');
      if (exportBtn && exportDd && !exportBtn.contains(event.target) && !exportDd.contains(event.target)) {
        exportDd.classList.add('aot-hidden');
      }
      const sidebar = d().getElementById(SIDEBAR_ID);
      const fab = d().getElementById(FAB_ID);
      const notesOverlay = d().getElementById('aot-notes-overlay');
      const catOverlay = d().getElementById('aot-cat-overlay');
      const notesOpen = !!(notesOverlay && !notesOverlay.classList.contains('aot-hidden'));
      const catOpen = !!(catOverlay && !catOverlay.classList.contains('aot-hidden'));
      if (sidebar?.classList.contains('aot-open') && !notesOpen && !catOpen && sidebar && fab && !sidebar.contains(event.target) && event.target !== fab) {
        closeSidebar();
      }
    });
  }

  function buildStatusOptions(includeRemove) {
    const options = ['want', 'progress', 'completed', 'rereading', 'onhold', 'dnf'];
    return includeRemove ? options.concat('remove') : options;
  }

  function statusOptionLabel(status) {
    return status === 'remove' ? 'Remove' : (STATUS_LABELS[status] || 'Tracked');
  }

  function buildTrackOptionMarkup(status) {
    return `<button class="ao3tracker-option${status === 'remove' ? ' ao3tracker-remove' : ''}" data-status="${status}">${esc(statusOptionLabel(status))}</button>`;
  }

  function buildCurrentOptionMarkup(status) {
    return `<button class="aot-cur-opt${status === 'remove' ? ' aot-cur-opt-remove' : ''}" data-status="${status}">${esc(statusOptionLabel(status))}</button>`;
  }

  function buildCustomCatOptionMarkup(cat, active) {
    return `<button class="ao3tracker-option" data-custom-cat="${esc(cat.id)}">${active ? '✓ ' : ''}${esc(cat.name)}</button>`;
  }

  function buildBadgeCatOptionMarkup(cat, active) {
    return `<button class="ao3t-badge-opt${active ? ' ao3t-badge-opt-active' : ''}" data-custom-cat="${esc(cat.id)}">${active ? '✓ ' : ''}${esc(cat.name)}</button>`;
  }

  function buildCurrentCatOptionMarkup(cat, active) {
    return `<button class="aot-cur-opt${active ? ' aot-cur-opt-active' : ''}" data-custom-cat="${esc(cat.id)}">${active ? '✓ ' : ''}${esc(cat.name)}</button>`;
  }

  function chapterProgressText(work) {
    const chapter = work && work.furthestChapter;
    if (!chapter || !Number.isFinite(Number(chapter.num))) return '';
    return `Ch. ${chapter.num}${chapter.total ? `/${chapter.total}` : ''}`;
  }

  function mergedStoryDisplayWork(info, existing) {
    if (!info && !existing) return null;
    if (!info) return existing || null;
    if (!existing) return info;
    return buildWorkRecord(info, existing.status, existing);
  }

  function buildInlineCustomChips(catIds, catsMap) {
    const chips = (catIds || [])
      .map(catId => catsMap && catsMap[catId])
      .filter(Boolean);
    if (!chips.length) return '';
    return `<span class="fg-track-inline-chips">${chips.map(cat => `<span class="fg-track-inline-chip" style="--chip-color:${esc(cat.color)}">${esc(cat.name)}</span>`).join('')}</span>`;
  }

  function initFabDrag(fab) {
    const FAB_DEFAULT_MARGIN = 28;
    const FAB_DRAG_THRESHOLD = 6;
    const FAB_PEEK_VISIBLE = 22;
    const FAB_PEEK_TRIGGER = 10;
    const FAB_POS_KEY = (_deps.storageKeys || {}).FAB_POSITION_KEY || 'ao3tracker_fab_position';

    if (fab._aotDragSetup) return;
    fab._aotDragSetup = true;

    function fabW() { return fab.offsetWidth || 48; }
    function fabH() { return fab.offsetHeight || 48; }

    function viewportBounds() {
      return {
        minLeft: 0,
        minTop: FAB_DEFAULT_MARGIN,
        maxLeft: Math.max(0, w().innerWidth - fabW()),
        maxTop: Math.max(FAB_DEFAULT_MARGIN, w().innerHeight - fabH() - FAB_DEFAULT_MARGIN)
      };
    }

    function clampPos(pos) {
      const b = viewportBounds();
      return {
        left: Math.min(b.maxLeft, Math.max(b.minLeft, Math.round(pos.left))),
        top: Math.min(b.maxTop, Math.max(b.minTop, Math.round(pos.top)))
      };
    }

    function applyPos(pos) {
      const width = fabW();
      const next = (pos && pos.peekEdge)
        ? { left: pos.peekEdge === 'left' ? -(width - FAB_PEEK_VISIBLE) : w().innerWidth - FAB_PEEK_VISIBLE, top: clampPos(pos).top, peekEdge: pos.peekEdge }
        : clampPos(pos);
      fab.style.left = `${next.left}px`;
      fab.style.top = `${next.top}px`;
      fab.style.right = 'auto';
      fab.style.bottom = 'auto';
      fab.classList.toggle('aot-peek-left', next.peekEdge === 'left');
      fab.classList.toggle('aot-peek-right', next.peekEdge === 'right');
      fab.title = next.peekEdge ? 'FandomGobbler (tucked away)' : 'FandomGobbler';
      return next;
    }

    function resetPos() {
      fab.style.left = '';
      fab.style.top = '';
      fab.style.right = `${FAB_DEFAULT_MARGIN}px`;
      fab.style.bottom = `${FAB_DEFAULT_MARGIN}px`;
      fab.classList.remove('aot-peek-left', 'aot-peek-right');
      fab.title = 'FandomGobbler';
    }

    function snapPos(pos) {
      const width = fabW();
      if (pos.left <= FAB_PEEK_TRIGGER) return { left: -(width - FAB_PEEK_VISIBLE), top: clampPos(pos).top, peekEdge: 'left' };
      if (pos.left >= w().innerWidth - width - FAB_PEEK_TRIGGER) return { left: w().innerWidth - FAB_PEEK_VISIBLE, top: clampPos(pos).top, peekEdge: 'right' };
      const centerX = pos.left + width / 2;
      const leftEdge = FAB_DEFAULT_MARGIN;
      const rightEdge = Math.max(FAB_DEFAULT_MARGIN, w().innerWidth - width - FAB_DEFAULT_MARGIN);
      return clampPos({ left: centerX < w().innerWidth / 2 ? leftEdge : rightEdge, top: pos.top });
    }

    function persistPos(pos) {
      try {
        if (_deps.chrome && _deps.chrome.storage && _deps.chrome.storage.local) {
          _deps.chrome.storage.local.set({ [FAB_POS_KEY]: pos });
        }
      } catch (e) {}
    }

    fab._aotRestoreFromPeek = function () {
      const peekEdge = fab.classList.contains('aot-peek-left') ? 'left' : (fab.classList.contains('aot-peek-right') ? 'right' : '');
      if (!peekEdge) return false;
      const width = fabW();
      const top = parseFloat(fab.style.top) || FAB_DEFAULT_MARGIN;
      const left = peekEdge === 'left' ? FAB_DEFAULT_MARGIN : Math.max(FAB_DEFAULT_MARGIN, w().innerWidth - width - FAB_DEFAULT_MARGIN);
      persistPos(applyPos({ left, top }));
      return true;
    };

    try {
      if (_deps.chrome && _deps.chrome.storage && _deps.chrome.storage.local) {
        _deps.chrome.storage.local.get(FAB_POS_KEY, data => {
          const pos = data[FAB_POS_KEY];
          if (pos && Number.isFinite(pos.left) && Number.isFinite(pos.top)) applyPos(pos);
          else resetPos();
        });
      } else {
        resetPos();
      }
    } catch (e) { resetPos(); }

    let pointerId = null, startX = 0, startY = 0, startLeft = 0, startTop = 0;
    let dragging = false, moved = false;

    function endDrag() {
      fab.classList.remove('aot-dragging');
      pointerId = null;
      dragging = false;
      if (moved) {
        fab._aotSuppressClick = true;
        const cur = { left: parseFloat(fab.style.left) || FAB_DEFAULT_MARGIN, top: parseFloat(fab.style.top) || FAB_DEFAULT_MARGIN };
        persistPos(applyPos(snapPos(cur)));
      }
      moved = false;
    }

    fab.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      pointerId = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      const rect = fab.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
      dragging = true;
      moved = false;
      try { fab.setPointerCapture(pointerId); } catch (err) {}
    });

    fab.addEventListener('pointermove', e => {
      if (!dragging || e.pointerId !== pointerId) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!moved && Math.hypot(dx, dy) < FAB_DRAG_THRESHOLD) return;
      moved = true;
      fab.classList.add('aot-dragging');
      applyPos(clampPos({ left: startLeft + dx, top: startTop + dy }));
    });

    fab.addEventListener('pointerup', e => {
      if (e.pointerId !== pointerId) return;
      try { fab.releasePointerCapture(pointerId); } catch (err) {}
      endDrag();
    });

    fab.addEventListener('pointercancel', endDrag);

    w().addEventListener('resize', () => {
      if (!d().body.contains(fab)) return;
      if (fab.style.left && fab.style.top) {
        const peekEdge = fab.classList.contains('aot-peek-left') ? 'left' : (fab.classList.contains('aot-peek-right') ? 'right' : '');
        persistPos(applyPos({ left: parseFloat(fab.style.left) || FAB_DEFAULT_MARGIN, top: parseFloat(fab.style.top) || FAB_DEFAULT_MARGIN, ...(peekEdge && { peekEdge }) }));
      } else {
        resetPos();
      }
    });
  }

  function injectFabAndSidebar() {
    ensureStyles();
    if (!d().body) return;
    ensureDropdownDismissListener();

    if (!d().getElementById(FAB_ID)) {
      const fab = d().createElement('button');
      fab.id = FAB_ID;
      fab.type = 'button';
      fab.title = 'FandomGobbler';
      fab.innerHTML = '<span id="ao3tracker-fab-label">FG</span>';
      fab.addEventListener('click', e => {
        if (fab._aotSuppressClick) {
          fab._aotSuppressClick = false;
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        if (fab._aotRestoreFromPeek?.()) return;
        toggleSidebar();
      });
      d().body.appendChild(fab);
      initFabDrag(fab);
    }

    if (!d().getElementById(SIDEBAR_ID)) {
      const sidebar = d().createElement('div');
      sidebar.id = SIDEBAR_ID;
      sidebar.innerHTML = `
        <div id="${PANEL_ID}">
          <div id="aot-header">
            <div id="aot-logo"><span id="aot-title">FandomGobbler.</span></div>
            <div id="aot-header-right">
              <span id="aot-total" class="aot-pill">0 works</span>
              <button id="aot-export-btn" title="Export / Import"><svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="2" x2="8" y2="11"></line><polyline points="4.5,7.5 8,11 11.5,7.5"></polyline><line x1="2.5" y1="14" x2="13.5" y2="14"></line></svg></button>
              <div id="aot-export-dropdown" class="aot-hidden">
                <div class="aot-export-section">Export</div>
                <button class="aot-export-opt" id="aot-export-csv" type="button">Export as CSV</button>
                <button class="aot-export-opt" id="aot-export-json" type="button">Export as JSON</button>
                <div class="aot-export-divider"></div>
                <div class="aot-export-section">Import</div>
                <button class="aot-export-opt" id="aot-import-csv" type="button">Import from CSV</button>
                <button class="aot-export-opt" id="aot-import-json" type="button">Import from JSON</button>
              </div>
              <button id="aot-theme-toggle" class="aot-theme-toggle" title="Switch to Solarized Light" aria-label="Switch to Solarized Light">
                <svg class="ico aot-theme-ico aot-theme-ico-sunset" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="1.5" y1="11" x2="14.5" y2="11"></line><path d="M5 11a3 3 0 0 1 6 0"></path><line x1="8" y1="3" x2="8" y2="5.5"></line><line x1="3.5" y1="5.8" x2="5.1" y2="7.4"></line><line x1="12.5" y1="5.8" x2="10.9" y2="7.4"></line></svg>
                <svg class="ico aot-theme-ico aot-theme-ico-moon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 2a4 4 0 0 0 6 6 6 6 0 1 1-6-6Z"></path></svg>
                <svg class="ico aot-theme-ico aot-theme-ico-sun" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 1.5v2.2M8 12.3v2.2M1.5 8h2.2M12.3 8h2.2M3 3l1.6 1.6M11.4 11.4L13 13M13 3l-1.6 1.6M3 13l1.6-1.6"></path><circle cx="8" cy="8" r="3.1"></circle></svg>
              </button>
              <button id="aot-fullscreen-btn" title="Open dashboard" aria-label="Open dashboard"><svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3.5H3.5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V10"/><path d="M9 2.5h4.5V7"/><path d="M8 8l5-5"/></svg></button>
              <button id="aot-close" title="Close" aria-label="Close">
                <svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
                  <line x1="3.5" y1="3.5" x2="12.5" y2="12.5"></line>
                  <line x1="12.5" y1="3.5" x2="3.5" y2="12.5"></line>
                </svg>
              </button>
            </div>
          </div>
          <div class="fg-platform-note"><strong>Fanfiction.net Edition of FandomGobbler</strong> is currently in beta so some features may not be available yet.</div>
          <div id="aot-export-reminder" class="aot-hidden">
            <span id="aot-reminder-msg"></span>
            <button type="button" id="aot-reminder-export">Export now</button>
            <button type="button" id="aot-reminder-dismiss" title="Dismiss" aria-label="Dismiss backup reminder"><svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="3.5" y1="3.5" x2="12.5" y2="12.5"></line><line x1="12.5" y1="3.5" x2="3.5" y2="12.5"></line></svg></button>
          </div>
          <div id="aot-current-bar" style="display:none">
            <div id="aot-current-info">
              <span id="aot-current-label">Currently on</span>
              <span id="aot-current-title"></span>
              <span id="aot-current-meta" class="fg-current-meta"></span>
            </div>
            <div id="aot-current-add-wrap">
              <button id="aot-current-add-btn" type="button">
                <span id="aot-current-add-label">+ Add</span>
                <span class="aot-current-add-chevron" aria-hidden="true">&#9662;</span>
              </button>
              <div id="aot-current-dropdown" class="aot-hidden"></div>
            </div>
          </div>
          <div id="aot-tabs-wrap">
            <button id="aot-tabs-left" class="aot-tabs-arrow aot-tabs-arrow-left">‹</button>
            <button id="aot-tabs-right" class="aot-tabs-arrow aot-tabs-arrow-right">›</button>
            <div id="aot-tabs">
              <div id="aot-status-tabs"></div>
              <span class="aot-tabs-divider"></span>
              <div id="aot-custom-tabs"></div>
              <button id="aot-new-cat-btn" class="aot-new-cat-tab" title="New category" type="button"><span class="aot-new-cat-plus">+</span> Add category</button>
            </div>
          </div>
          <div id="aot-search-bar">
            <span class="aot-srch-ico">
              <svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
                <circle cx="6.5" cy="6.5" r="4"></circle>
                <line x1="9.5" y1="9.5" x2="14" y2="14"></line>
              </svg>
            </span>
            <input id="aot-search" placeholder="Search works..." type="text" />
          </div>
          <div id="aot-sort-indicator" class="aot-hidden"></div>
          <div id="aot-list-wrap">
            <div id="aot-sidebar-onboarding" class="aot-sidebar-onboarding" style="display:none">
              <div class="aot-onboarding-head">
                <div id="aot-onboarding-title" class="aot-onboarding-title">No works tracked yet</div>
                <button type="button" id="aot-sidebar-onboarding-dismiss" class="aot-onboarding-dismiss" aria-label="Dismiss">x</button>
              </div>
              <div id="aot-onboarding-intro" class="aot-onboarding-intro">Here are a few ways to get started:</div>
              <ul class="aot-onboarding-list">
                <li>Open any FanFiction.net story and use the <strong>Track</strong> control on the page.</li>
                <li>Use the floating <strong>FG</strong> button to open your sidebar library while you browse.</li>
                <li>Use <strong>Export / Import</strong> in the sidebar header to move your FF.net library in or out.</li>
              </ul>
            </div>
            <div id="aot-empty" class="aot-empty fg-empty">No FanFiction.net works tracked yet. Open any fic and use the Track control.</div>
            <ul id="aot-list"></ul>
          </div>
          <div id="aot-notes-overlay" class="aot-hidden">
            <div id="aot-notes-modal">
              <div id="aot-notes-header">
                <span id="aot-notes-title"></span>
                <button id="aot-notes-close" type="button" aria-label="Close notes modal"><svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="3.5" y1="3.5" x2="12.5" y2="12.5"></line><line x1="12.5" y1="3.5" x2="3.5" y2="12.5"></line></svg></button>
              </div>
              <div id="aot-notes-body">
                <div id="aot-rating-row">
                  <span class="aot-field-label">Rating</span>
                  <div id="aot-stars">
                    <button class="aot-star" data-val="1" type="button"><svg class="ico ico-star-filled" viewBox="0 0 16 16" fill="currentColor"><polygon points="8,1.5 10,6 15,6.5 11.5,10 12.5,15 8,12.5 3.5,15 4.5,10 1,6.5 6,6"></polygon></svg></button>
                    <button class="aot-star" data-val="2" type="button"><svg class="ico ico-star-filled" viewBox="0 0 16 16" fill="currentColor"><polygon points="8,1.5 10,6 15,6.5 11.5,10 12.5,15 8,12.5 3.5,15 4.5,10 1,6.5 6,6"></polygon></svg></button>
                    <button class="aot-star" data-val="3" type="button"><svg class="ico ico-star-filled" viewBox="0 0 16 16" fill="currentColor"><polygon points="8,1.5 10,6 15,6.5 11.5,10 12.5,15 8,12.5 3.5,15 4.5,10 1,6.5 6,6"></polygon></svg></button>
                    <button class="aot-star" data-val="4" type="button"><svg class="ico ico-star-filled" viewBox="0 0 16 16" fill="currentColor"><polygon points="8,1.5 10,6 15,6.5 11.5,10 12.5,15 8,12.5 3.5,15 4.5,10 1,6.5 6,6"></polygon></svg></button>
                    <button class="aot-star" data-val="5" type="button"><svg class="ico ico-star-filled" viewBox="0 0 16 16" fill="currentColor"><polygon points="8,1.5 10,6 15,6.5 11.5,10 12.5,15 8,12.5 3.5,15 4.5,10 1,6.5 6,6"></polygon></svg></button>
                  </div>
                  <button id="aot-clear-rating" type="button">Clear</button>
                </div>
                <div id="aot-notes-field">
                  <span class="aot-field-label">Notes</span>
                  <textarea id="aot-notes-text" placeholder="What's this fic about? Any thoughts, warnings to remember, favorite moments..."></textarea>
                </div>
              </div>
              <div id="aot-notes-footer">
                <button id="aot-notes-cancel" type="button">Cancel</button>
                <button id="aot-notes-save" type="button">Save</button>
              </div>
            </div>
          </div>
          <div id="aot-cat-overlay" class="aot-hidden">
            <div id="aot-cat-modal">
              <div id="aot-cat-header">
                <span id="aot-cat-modal-title">New Category</span>
                <button id="aot-cat-close" type="button" aria-label="Close category modal"><svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="3.5" y1="3.5" x2="12.5" y2="12.5"></line><line x1="12.5" y1="3.5" x2="3.5" y2="12.5"></line></svg></button>
              </div>
              <div id="aot-cat-body">
                <input id="aot-cat-name" placeholder="Category name..." maxlength="30" type="text" />
                <div class="aot-cat-color-label">Color</div>
                <div id="aot-cat-presets"></div>
                <div id="aot-cat-hex-row">
                  <span id="aot-cat-swatch"></span>
                  <input id="aot-cat-hex" type="text" placeholder="#7c3aed" maxlength="7" />
                </div>
              </div>
              <div id="aot-cat-footer">
                <button id="aot-cat-delete" class="aot-hidden" type="button">Delete</button>
                <button id="aot-cat-cancel" type="button">Cancel</button>
                <button id="aot-cat-save" type="button">Save</button>
              </div>
            </div>
          </div>
        </div>`;
      // Prefer the shared platform shell when available so new editions can reuse the
      // same structural contract without copying the whole sidebar DOM.
      const platformNote = '<strong>FanFiction.net Edition</strong> is currently in beta so some features may not be available yet.';
      const onboardingItems = [
        'Open any FanFiction.net story and use the <strong>Track</strong> control on the page.',
        'Use the floating <strong>FG</strong> button to open your sidebar library while you browse.',
        'Use <strong>Export / Import</strong> in the sidebar header to move your FF.net library in or out.'
      ];
      if (typeof sidebarTemplate().buildPlatformSidebarShell === 'function') {
        sidebar.innerHTML = sidebarTemplate().buildPlatformSidebarShell({
          title: 'FandomGobbler.',
          platformNote,
          emptyText: 'No FanFiction.net works tracked yet. Open any fic and use the Track control.',
          onboardingTitle: 'No works tracked yet',
          onboardingIntro: 'Here are a few ways to get started:',
          onboardingItems
        });
      }
      d().body.appendChild(sidebar);
      sidebar.querySelector('#aot-close').addEventListener('click', closeSidebar);
      sidebar.querySelector('#aot-fullscreen-btn').addEventListener('click', () => {
        if (!extensionContextAvailable()) {
          handleInvalidatedContext();
          return;
        }
        try {
          _deps.chrome.tabs.create({ url: _deps.chrome.runtime.getURL('dashboard.html') });
        } catch (e) {
          handleInvalidatedContext();
        }
      });
      sidebar.querySelector('#aot-tabs-left')?.addEventListener('click', () => {
        sidebar.querySelector('#aot-tabs')?.scrollBy({ left: -120, behavior: 'smooth' });
      });
      sidebar.querySelector('#aot-tabs-right')?.addEventListener('click', () => {
        sidebar.querySelector('#aot-tabs')?.scrollBy({ left: 120, behavior: 'smooth' });
      });
      const search = sidebar.querySelector('#aot-search');
      search.value = _searchQuery;
      search.addEventListener('input', event => {
        _searchQuery = String(event.target.value || '').trim().toLowerCase();
        renderSidebar();
      });
      sidebar.querySelector('#aot-new-cat-btn')?.addEventListener('click', event => {
        event.stopPropagation();
        openCatModal(null);
      });
      sidebar.querySelector('#aot-sidebar-onboarding-dismiss')?.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        dismissOnboarding();
      });
      bindHeaderActions(sidebar);
      bindNotesModal();
      setupCategoryModal();
      applySidebarTheme();
      checkExportReminder();
    }

    renderSidebar();
    renderCurrentBar();
  }

  function setSidebarOpen(open) {
    const sidebar = d().getElementById(SIDEBAR_ID);
    const fab = d().getElementById(FAB_ID);
    if (!sidebar || !fab) return;
    sidebar.classList.toggle('aot-open', open);
    fab.classList.toggle('aot-active', open);
    if (open) {
      d().body.classList.add('aot-tracker-dock-open');
    } else {
      d().body.classList.remove('aot-tracker-dock-open');
      // Explicitly clear any inline margin-right to guarantee revert
      d().body.style.removeProperty('margin-right');
    }
  }

  function toggleSidebar() {
    const isOpen = d().getElementById(SIDEBAR_ID)?.classList.contains('aot-open');
    setSidebarOpen(!isOpen);
  }

  function closeSidebar() {
    setSidebarOpen(false);
  }

  function focusWorkInSidebar(workId) {
    if (!workId) return;
    getWorks(works => {
      const work = works[workId];
      if (!work) return;
      const preferredTab = normalizeStatus(work.status) || ((work.customCats && work.customCats[0]) || 'all');
      _activeTab = preferredTab;
      if (!d().getElementById(SIDEBAR_ID)?.classList.contains('aot-open')) {
        setSidebarOpen(true);
      }
      renderSidebar();
      w().setTimeout(() => {
        let card = d().querySelector(`.aot-card[data-work-id="${workId}"]`);
        if (!card && preferredTab !== 'all') {
          _activeTab = 'all';
          renderSidebar();
          card = d().querySelector(`.aot-card[data-work-id="${workId}"]`);
        }
        if (!card) return;
        card.classList.remove('fg-current-jump');
        void card.offsetWidth;
        card.classList.add('fg-current-jump');
        card.scrollIntoView({ block: 'center', behavior: 'smooth' });
        w().setTimeout(() => card.classList.remove('fg-current-jump'), 1400);
      }, 60);
    });
  }

  function syncTabArrows() {
    const tabs = d().getElementById('aot-tabs');
    const statusTabs = d().getElementById('aot-status-tabs');
    const wrap = d().getElementById('aot-tabs-wrap');
    if (!tabs || !wrap) return;
    const atStart = tabs.scrollLeft <= 4;
    const atEnd = tabs.scrollLeft + tabs.clientWidth >= tabs.scrollWidth - 4;
    const hasOverflow = tabs.scrollWidth > tabs.clientWidth + 4;
    wrap.classList.toggle('can-scroll-left', hasOverflow && !atStart);
    wrap.classList.toggle('can-scroll-right', hasOverflow && !atEnd);
  }

  function updateCatSwatch(color) {
    d().getElementById('aot-cat-swatch')?.style.setProperty('background', color);
  }

  function closeCatModal() {
    d().getElementById('aot-cat-overlay')?.classList.add('aot-hidden');
    _editingCatId = null;
  }

  function openCatModal(catId) {
    const overlay = d().getElementById('aot-cat-overlay');
    const titleEl = d().getElementById('aot-cat-modal-title');
    const nameEl = d().getElementById('aot-cat-name');
    const hexEl = d().getElementById('aot-cat-hex');
    const deleteBtn = d().getElementById('aot-cat-delete');
    if (!overlay || !titleEl || !nameEl || !hexEl || !deleteBtn) return;
    _editingCatId = catId;
    if (!catId) {
      titleEl.textContent = 'New Category';
      nameEl.value = '';
      hexEl.value = CAT_PRESETS[0];
      updateCatSwatch(CAT_PRESETS[0]);
      deleteBtn.classList.add('aot-hidden');
      overlay.classList.remove('aot-hidden');
      return;
    }
    getCustomCats(cats => {
      const cat = cats[catId];
      if (!cat) return;
      titleEl.textContent = 'Edit Category';
      nameEl.value = cat.name || '';
      hexEl.value = cat.color || CAT_PRESETS[0];
      updateCatSwatch(cat.color || CAT_PRESETS[0]);
      deleteBtn.classList.remove('aot-hidden');
      overlay.classList.remove('aot-hidden');
    });
  }

  function saveCatModal() {
    const nameEl = d().getElementById('aot-cat-name');
    const hexEl = d().getElementById('aot-cat-hex');
    if (!nameEl || !hexEl) return;
    const name = String(nameEl.value || '').trim();
    if (!name) {
      nameEl.focus();
      return;
    }
    const color = /^#[0-9a-fA-F]{6}$/.test(String(hexEl.value || '').trim()) ? String(hexEl.value).trim() : CAT_PRESETS[0];
    getCustomCats(cats => {
      const nextCats = { ...(cats || {}) };
      if (_editingCatId && nextCats[_editingCatId]) {
        nextCats[_editingCatId] = { ...nextCats[_editingCatId], name, color };
      } else {
        const id = genCatId();
        nextCats[id] = { id, name, color };
      }
      setCustomCats(nextCats, () => {
        closeCatModal();
        refresh();
      });
    });
  }

  function deleteCatModal() {
    if (!_editingCatId) return;
    const catId = _editingCatId;
    getCustomCats(cats => {
      const nextCats = { ...(cats || {}) };
      delete nextCats[catId];
      getWorks(works => {
        Object.values(works).forEach(work => {
          if (Array.isArray(work.customCats) && work.customCats.includes(catId)) {
            work.customCats = work.customCats.filter(id => id !== catId);
            if (!normalizeStatus(work.status) && !work.customCats.length) {
              delete works[work.id];
            }
          }
        });
        setCustomCats(nextCats, () => {
          setWorks(works, () => {
            if (_activeTab === catId) _activeTab = 'all';
            closeCatModal();
            refresh();
          });
        });
      });
    });
  }

  function setupCategoryModal() {
    const presetsEl = d().getElementById('aot-cat-presets');
    if (presetsEl && !presetsEl._fgBuilt) {
      presetsEl._fgBuilt = true;
      CAT_PRESETS.forEach(color => {
        const button = d().createElement('button');
        button.type = 'button';
        button.className = 'aot-cat-preset';
        button.style.background = color;
        button.style.setProperty('--fg-cat-preset-color', color);
        button.dataset.color = color;
        button.addEventListener('click', () => {
          const hexEl = d().getElementById('aot-cat-hex');
          if (hexEl) hexEl.value = color;
          updateCatSwatch(color);
          presetsEl.querySelectorAll('.aot-cat-preset').forEach(node => node.classList.toggle('aot-cat-preset-active', node.dataset.color === color));
        });
        presetsEl.appendChild(button);
      });
    }
    d().getElementById('aot-cat-close')?.addEventListener('click', closeCatModal);
    d().getElementById('aot-cat-cancel')?.addEventListener('click', closeCatModal);
    d().getElementById('aot-cat-save')?.addEventListener('click', saveCatModal);
    d().getElementById('aot-cat-delete')?.addEventListener('click', deleteCatModal);
    d().getElementById('aot-cat-hex')?.addEventListener('input', event => {
      const value = String(event.target.value || '').trim();
      if (/^#[0-9a-fA-F]{6}$/.test(value)) updateCatSwatch(value);
    });
  }

  function buildTabButton(status, count) {
    const isActive = _activeTab === status;
    const iconByStatus = {
      all: '<span class="aot-tab-ico"><svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="2" y1="4" x2="14" y2="4"></line><line x1="2" y1="8" x2="14" y2="8"></line><line x1="2" y1="12" x2="14" y2="12"></line></svg></span>',
      want: '<span class="aot-tab-ico"><svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="8,1.5 10,6 15,6.5 11.5,10 12.5,15 8,12.5 3.5,15 4.5,10 1,6.5 6,6"></polygon></svg></span>',
      progress: '<span class="aot-tab-ico"><svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 13.5C8 13.5 3 11 1.5 11V3C3 3 8 5.5 8 5.5C8 5.5 13 3 14.5 3V11C13 11 8 13.5 8 13.5Z"></path><line x1="8" y1="5.5" x2="8" y2="13.5"></line></svg></span>',
      completed: '<span class="aot-tab-ico"><svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="2.5,8.5 6.5,12.5 13.5,4"></polyline></svg></span>',
      rereading: '<span class="aot-tab-ico"><svg class="ico" viewBox="0 0 383.631 383.631" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M47.331,210.289c-1.408,1.375-3.273,2.296-5.374,2.508c-0.116,0.012-0.232,0.021-0.349,0.029c-0.006,0-0.013,0.001-0.02,0.001c-0.185,0.011-0.367,0.017-0.549,0.017c-2.109,0-4.073-0.737-5.624-1.982c-0.207-0.183-0.405-0.375-0.595-0.575L2.505,176.658c-3.44-3.587-3.322-9.285,0.266-12.725c3.587-3.44,9.284-3.322,12.725,0.265l16.426,17.125c3.887-58.736,40.101-111.535,95.123-135.771c39.08-17.212,82.524-18.177,122.331-2.714c39.805,15.462,71.206,45.501,88.417,84.582c2.004,4.549-0.06,9.861-4.608,11.864c-4.55,2.003-9.862-0.061-11.864-4.609c-15.273-34.68-43.139-61.336-78.462-75.058c-35.322-13.721-73.875-12.867-108.558,2.409C85.342,83.591,53.163,130.64,49.854,182.927l18.381-17.632c3.589-3.44,9.285-3.322,12.726,0.265s3.322,9.284-0.265,12.725L47.331,210.289z M381.087,207.409l-32.648-33.615c-1.759-1.838-4.291-2.921-7-2.769c-0.143,0.008-0.285,0.02-0.428,0.034c-2.123,0.221-4.005,1.169-5.415,2.575l-32.732,32.273c-3.54,3.49-3.58,9.188-0.091,12.728c3.491,3.54,9.189,3.58,12.728,0.09l17.594-17.346c-3.513,52.052-35.643,98.837-84.405,120.314c-18.545,8.168-37.91,12.033-56.982,12.032c-54.556-0.002-106.675-31.636-130.038-84.682c-2.003-4.548-7.314-6.612-11.864-4.609c-4.549,2.003-6.612,7.315-4.608,11.864c26.329,59.781,85.053,95.43,146.536,95.426c21.487-0.001,43.319-4.357,64.213-13.559c55.03-24.239,91.261-77.082,95.127-135.845l17.12,17.627c3.463,3.565,9.16,3.649,12.727,0.186C384.467,216.673,384.55,210.975,381.087,207.409z"></path></svg></span>',
      onhold: '<span class="aot-tab-ico"><svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="5.5" y1="3" x2="5.5" y2="13"></line><line x1="10.5" y1="3" x2="10.5" y2="13"></line></svg></span>',
      dnf: '<span class="aot-tab-ico"><svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="3.5" y1="3.5" x2="12.5" y2="12.5"></line><line x1="12.5" y1="3.5" x2="3.5" y2="12.5"></line></svg></span>',
      lost: '<span class="aot-tab-ico"><svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="2,4 14,4"></polyline><path d="M5 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"></path><rect x="3" y="4" width="10" height="10" rx="1"></rect><line x1="6" y1="7" x2="6" y2="11"></line><line x1="10" y1="7" x2="10" y2="11"></line></svg></span>'
    };
    const label = status === 'all' ? 'All' : esc(STATUS_LABELS[status] || status);
    const extraCntClass = status === 'lost' ? ' aot-cnt-lost' : '';
    return `<button class="aot-tab${isActive ? ' aot-active' : ''}" data-tab="${status}">${iconByStatus[status] || ''}${label} <span class="aot-cnt${extraCntClass}">${count}</span></button>`;
  }

  function buildCardMarkup(work) {
    const normalized = normalizeStatus(work.status);
    const SUMMARY_LIMIT = 280;
    const NOTES_LIMIT = 160;
    const summaryExpanded = _expandedSummary.has(work.id);
    const summaryNeedsToggle = !!(work.summary && work.summary.length > SUMMARY_LIMIT);
    const summaryText = work.summary
      ? esc(summaryExpanded ? work.summary : trunc(work.summary, SUMMARY_LIMIT))
      : 'Summary not saved yet for this work.';
    const summaryToggle = summaryNeedsToggle
      ? `<button type="button" class="aot-card-summary-toggle" data-summary-toggle="${esc(work.id)}">${summaryExpanded ? 'Show less' : 'Read more'}</button>`
      : '';
    const notesExpanded = _expandedNotes.has(work.id);
    const notesNeedToggle = !!(work.notes && work.notes.length > NOTES_LIMIT);
    const notesText = work.notes ? esc(notesExpanded ? work.notes : trunc(work.notes, NOTES_LIMIT)) : null;
    const notesToggle = notesNeedToggle
      ? `<button type="button" class="aot-card-summary-toggle" data-notes-toggle="${esc(work.id)}">${notesExpanded ? 'Show less' : 'Read more'}</button>`
      : '';
    const noteSnippet = notesText !== null
      ? `<div class="aot-note-preview">${notesText}${notesToggle}</div>`
      : `<div class="aot-note-preview aot-note-preview-empty">No notes yet.</div>`;
    const addedDate = new Date(work.addedAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const updatedDate = work.updatedAt
      ? new Date(work.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : '';
    const fandomTags = (work.fandoms || []).slice(0, 2).map(tag => `<span class="aot-tag">${esc(tag)}</span>`).join('');
    const relationshipTag = work.relationship ? `<span class="aot-tag aot-tag-relationship">${esc(trunc(work.relationship, 34))}</span>` : '';
    const tagRowHtml = (fandomTags || relationshipTag) ? `<div class="aot-card-tags">${fandomTags}${relationshipTag}</div>` : '';
    const isFlipped = _flippedCards.has(work.id);
    const customChipsHtml = (work.customCats || [])
      .map(catId => _lastCats?.[catId])
      .filter(Boolean)
      .map(cat => `<span class="aot-custom-chip" style="--chip-color:${esc(cat.color)}">${esc(cat.name)}</span>`)
      .join('');
    const chapterPillHtml = (normalized === 'progress' || normalized === 'rereading')
      ? (work.furthestChapter
          ? `<a class="aot-card-chapter-pill" href="${esc(work.url)}" target="_blank" rel="noopener noreferrer" title="Continue from saved chapter progress">Ch. ${esc(String(work.furthestChapter.num))}${work.furthestChapter.total ? `/${esc(String(work.furthestChapter.total))}` : ''}</a>`
          : `<span class="aot-card-chapter-pill aot-card-chapter-pill-missing" title="Visit this story page to capture chapter progress.">Ch. -/-</span>`)
      : '';
    const starF = '<svg class="ico ico-star-filled" viewBox="0 0 16 16" fill="currentColor"><polygon points="8,1.5 10,6 15,6.5 11.5,10 12.5,15 8,12.5 3.5,15 4.5,10 1,6.5 6,6"/></svg>';
    const starE = '<svg class="ico ico-star-empty" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><polygon points="8,1.5 10,6 15,6.5 11.5,10 12.5,15 8,12.5 3.5,15 4.5,10 1,6.5 6,6"/></svg>';
    const stars = work.rating ? `<div class="aot-card-stars aot-card-stars-back">${starF.repeat(work.rating)}${starE.repeat(5 - work.rating)}</div>` : '';
    const moveButtons = {
      want: '<button class="aot-btn aot-btn-progress" data-action="progress" data-id="' + esc(work.id) + '">Reading →</button>',
      progress: '<button class="aot-btn aot-btn-completed" data-action="completed" data-id="' + esc(work.id) + '">Completed</button><button class="aot-btn" data-action="want" data-id="' + esc(work.id) + '">← For Later</button><button class="aot-btn aot-btn-dnf" data-action="dnf" data-id="' + esc(work.id) + '">DNF</button>',
      completed: '<button class="aot-btn aot-btn-rereading" data-action="rereading" data-id="' + esc(work.id) + '">Re-reading</button><button class="aot-btn aot-btn-onhold" data-action="onhold" data-id="' + esc(work.id) + '">On Hold</button>',
      rereading: '<button class="aot-btn aot-btn-completed" data-action="completed" data-id="' + esc(work.id) + '">Completed</button><button class="aot-btn" data-action="progress" data-id="' + esc(work.id) + '">← Reading</button>',
      onhold: '<button class="aot-btn aot-btn-progress" data-action="progress" data-id="' + esc(work.id) + '">Reading →</button><button class="aot-btn aot-btn-completed" data-action="completed" data-id="' + esc(work.id) + '">Completed</button>',
      dnf: '<button class="aot-btn" data-action="want" data-id="' + esc(work.id) + '">← Try Again</button><button class="aot-btn aot-btn-progress" data-action="progress" data-id="' + esc(work.id) + '">Reading →</button>',
      lost: '<button class="aot-btn" data-action="want" data-id="' + esc(work.id) + '">Restore to For Later</button>'
    }[normalized] || '<button class="aot-btn aot-btn-progress" data-action="progress" data-id="' + esc(work.id) + '">Reading →</button>';

    return `
      <li class="aot-card${isFlipped ? ' aot-card-flipped' : ''}" data-status="${esc(normalized)}" data-work-id="${esc(work.id)}">
        <div class="aot-card-face aot-card-front">
          <div class="aot-card-meta">
            <div class="aot-card-title-row">
              <div class="aot-card-title"><a href="${esc(work.url)}" target="_blank" rel="noopener noreferrer">${esc(trunc(work.title || 'Untitled', 58))}</a></div>
            </div>
            <div class="aot-card-author">by <a class="aot-author-link" href="${esc(work.authorUrl || work.url)}" target="_blank" rel="noopener noreferrer">${esc(work.author || 'Anonymous')}</a>${work.wordCount ? ` &middot; <span class="aot-wordcount">${esc(Number(work.wordCount).toLocaleString())} words</span>` : ''}</div>
            ${tagRowHtml}
            <div class="aot-card-pill-row">
              <span class="${statusBadgeClass(normalized)}">${esc(STATUS_LABELS[normalized] || 'Tracked')}</span>
              <div class="aot-custom-chips">${customChipsHtml}</div>
              ${chapterPillHtml}
            </div>
            <div class="aot-card-date">Added ${esc(addedDate)}${updatedDate ? ` &middot; Updated ${esc(updatedDate)}` : ''}</div>
          </div>
          <button type="button" class="aot-card-flip aot-card-flip-front" data-flip="back" data-id="${esc(work.id)}" aria-label="Flip card for more" title="Flip card for more">
            <span class="aot-card-flip-label">Flip Card for More</span>
            <span class="aot-card-flip-icon" aria-hidden="true">↺</span>
          </button>
        </div>
        <div class="aot-card-face aot-card-back">
          <div class="aot-card-back-header">
            <div class="aot-card-back-title">Summary</div>
            <div class="aot-card-back-meta">
              <div class="aot-card-back-subtitle">${esc(trunc(work.title || 'Untitled', 42))}</div>
              ${stars}
            </div>
          </div>
          <div class="aot-card-summary fg-card-summary${work.summary ? '' : ' aot-card-summary-empty'}">${summaryText}${summaryToggle}</div>
          <div class="aot-card-section-head aot-card-notes-head">
            <div class="aot-card-back-title aot-card-notes-title">Notes & Ratings</div>
            <button type="button" class="aot-card-edit-notes" data-edit-notes="${esc(work.id)}" aria-label="Edit notes" title="Edit notes">✎</button>
          </div>
          ${noteSnippet}
          <div class="aot-card-section-head">
            <div class="aot-card-back-title">Move Work To</div>
          </div>
          <div class="aot-card-actions aot-card-back-actions">
            ${moveButtons}
          </div>
          <div class="aot-card-section-head">
            <div class="aot-card-back-title">Add Work To</div>
          </div>
          <div class="aot-card-actions aot-card-back-actions aot-card-back-cats" data-back-cats-add="${esc(work.id)}"></div>
          <div class="aot-card-section-head">
            <div class="aot-card-back-title">Remove Work From</div>
          </div>
          <div class="aot-card-actions aot-card-back-actions aot-card-back-cats" data-back-cats-remove="${esc(work.id)}"></div>
          <div class="aot-card-back-footer">
            <div class="aot-card-remove-row">
              <button class="aot-btn aot-btn-remove" data-action="remove" data-id="${esc(work.id)}">Remove Work</button>
            </div>
            <button type="button" class="aot-card-flip aot-card-flip-back" data-flip="front" data-id="${esc(work.id)}" aria-label="Flip back to overview" title="Flip back to overview">
              <span class="aot-card-flip-label">Flip Back to Overview</span>
              <span class="aot-card-flip-icon" aria-hidden="true">↻</span>
            </button>
          </div>
        </div>
      </li>`;
  }

  let _lastCats = {};
  const _expandedSummary = new Set();
  const _expandedNotes = new Set();

  function bindCardEvents() {
    d().querySelectorAll('.aot-card [data-flip]').forEach(button => {
      if (button._fgBound) return;
      button._fgBound = true;
      button.addEventListener('click', event => {
        event.stopPropagation();
        const workId = button.dataset.id;
        const showBack = button.dataset.flip === 'back';
        if (!workId) return;
        if (showBack) _flippedCards.add(workId);
        else _flippedCards.delete(workId);
        d().querySelector(`.aot-card[data-work-id="${workId}"]`)?.classList.toggle('aot-card-flipped', showBack);
      });
    });

    d().querySelectorAll('[data-back-cats-add]').forEach(container => {
      if (container._fgBound) return;
      container._fgBound = true;
      const workId = container.dataset.backCatsAdd;
      const work = _lastWorks?.[workId];
      if (!work) return;
      const currentCatIds = work.customCats || [];
      const addableCats = Object.values(_lastCats || {}).filter(cat => !currentCatIds.includes(cat.id));
      container.innerHTML = addableCats.length
        ? addableCats.map(cat => `<button type="button" class="aot-btn aot-btn-back-cat" data-custom-cat-add="${esc(cat.id)}" data-id="${esc(workId)}" style="--aot-back-cat:${esc(cat.color)}">${esc(cat.name)}</button>`).join('')
        : '<div class="aot-card-empty-actions">Already in every custom category.</div>';
    });

    d().querySelectorAll('[data-back-cats-remove]').forEach(container => {
      if (container._fgBound) return;
      container._fgBound = true;
      const workId = container.dataset.backCatsRemove;
      const work = _lastWorks?.[workId];
      if (!work) return;
      const removableCats = (work.customCats || []).map(catId => _lastCats?.[catId]).filter(Boolean);
      container.innerHTML = removableCats.length
        ? removableCats.map(cat => `<button type="button" class="aot-btn aot-btn-back-cat is-selected" data-custom-cat-remove="${esc(cat.id)}" data-id="${esc(workId)}" style="--aot-back-cat:${esc(cat.color)}">${esc(cat.name)}</button>`).join('')
        : '<div class="aot-card-empty-actions">Not in any custom category.</div>';
    });

    d().querySelectorAll('[data-custom-cat-add]').forEach(button => {
      if (button._fgBound) return;
      button._fgBound = true;
      button.addEventListener('click', () => {
        const workId = button.dataset.id;
        const catId = button.dataset.customCatAdd;
        if (!workId || !catId) return;
        getWorks(works => {
          const work = works[workId];
          if (!work) return;
          const current = Array.isArray(work.customCats) ? work.customCats : [];
          if (current.includes(catId)) return;
          work.customCats = current.concat(catId);
          work.movedAt = Date.now();
          setWorks(works, refresh);
        });
      });
    });

    d().querySelectorAll('[data-custom-cat-remove]').forEach(button => {
      if (button._fgBound) return;
      button._fgBound = true;
      button.addEventListener('click', () => {
        const workId = button.dataset.id;
        const catId = button.dataset.customCatRemove;
        if (!workId || !catId) return;
        getWorks(works => {
          const work = works[workId];
          if (!work) return;
          const current = Array.isArray(work.customCats) ? work.customCats : [];
          work.customCats = current.filter(id => id !== catId);
          work.movedAt = Date.now();
          if (!normalizeStatus(work.status) && !work.customCats.length) {
            delete works[workId];
          }
          setWorks(works, refresh);
        });
      });
    });

    d().querySelectorAll('[data-action]').forEach(button => {
      if (button._fgBound) return;
      button._fgBound = true;
      button.addEventListener('click', () => {
        const workId = button.dataset.id;
        const action = button.dataset.action;
        if (!workId || !action) return;
        getWorks(works => {
          const work = works[workId];
          if (!work) return;
          if (action === 'remove') {
            delete works[workId];
            _flippedCards.delete(workId);
            setWorks(works, refresh);
            return;
          }
          const oldStatus = work.status;
          work.status = normalizeStatus(action);
          work.finishedAt = typeof _deps.nextFinishedAt === 'function'
            ? _deps.nextFinishedAt(oldStatus, action, work.finishedAt)
            : (work.finishedAt || null);
          work.movedAt = Date.now();
          setWorks(works, refresh);
        });
      });
    });

    d().querySelectorAll('[data-summary-toggle]').forEach(btn => {
      if (btn._fgBound) return;
      btn._fgBound = true;
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const id = btn.dataset.summaryToggle;
        if (_expandedSummary.has(id)) _expandedSummary.delete(id);
        else _expandedSummary.add(id);
        _flippedCards.add(id);
        renderSidebar();
      });
    });

    d().querySelectorAll('[data-notes-toggle]').forEach(btn => {
      if (btn._fgBound) return;
      btn._fgBound = true;
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const id = btn.dataset.notesToggle;
        if (_expandedNotes.has(id)) _expandedNotes.delete(id);
        else _expandedNotes.add(id);
        _flippedCards.add(id);
        renderSidebar();
      });
    });

    d().querySelectorAll('[data-edit-notes]').forEach(btn => {
      if (btn._fgBound) return;
      btn._fgBound = true;
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const workId = btn.dataset.editNotes;
        if (!workId) return;
        _flippedCards.add(workId);
        if (typeof notesModal().openNotesModal === 'function') {
          notesModal().openNotesModal(workId);
        }
      });
    });
  }

  function renderSidebar() {
    const tabs = d().getElementById('aot-tabs');
    const statusTabs = d().getElementById('aot-status-tabs');
    const list = d().getElementById('aot-list');
    const empty = d().getElementById('aot-empty');
    const total = d().getElementById('aot-total');
    const sortIndicator = d().getElementById('aot-sort-indicator');
    const onboarding = d().getElementById('aot-sidebar-onboarding');
    if (!tabs || !statusTabs || !list || !empty || !total) return;

    getWorks(worksMap => {
      _lastWorks = worksMap;
      const allWorks = Object.values(worksMap).filter(work => work && work.platform === 'ffnet');
      total.textContent = `${allWorks.length} work${allWorks.length !== 1 ? 's' : ''}`;

      getCustomCats(cats => {
        _lastCats = cats || {};
        statusTabs.innerHTML = STATUS_ORDER.map(status => {
          const count = status === 'all'
            ? allWorks.length
            : allWorks.filter(work => normalizeStatus(work.status) === status).length;
          return buildTabButton(status, count);
        }).join('');
        const customTabs = d().getElementById('aot-custom-tabs');
        if (customTabs) {
          customTabs.innerHTML = Object.values(_lastCats)
            .map(cat => {
              const count = allWorks.filter(work => (work.customCats || []).includes(cat.id)).length;
              return `<button class="aot-tab${_activeTab === cat.id ? ' aot-active' : ''}" data-tab="${esc(cat.id)}" data-cat-tab="1">${esc(cat.name)} <span class="aot-cnt">${count}</span></button>`;
            })
            .join('');
        }

        statusTabs.querySelectorAll('[data-tab]').forEach(button => {
          button.addEventListener('click', () => {
            _activeTab = button.dataset.tab || 'all';
            renderSidebar();
          });
        });
        customTabs?.querySelectorAll('[data-tab]').forEach(button => {
          button.addEventListener('click', () => {
            _activeTab = button.dataset.tab || 'all';
            renderSidebar();
          });
          button.addEventListener('dblclick', event => {
            event.stopPropagation();
            openCatModal(button.dataset.tab || '');
          });
        });

        if (!tabs._fgScrollListenerAdded) {
          tabs._fgScrollListenerAdded = true;
          tabs.addEventListener('scroll', syncTabArrows);
          w().addEventListener('resize', syncTabArrows);
        }
        w().requestAnimationFrame(syncTabArrows);

        const visible = allWorks
          .filter(work => _activeTab === 'all' || normalizeStatus(work.status) === _activeTab || (work.customCats || []).includes(_activeTab))
          .filter(work => {
            if (!_searchQuery) return true;
            const haystack = [
              work.title,
              work.author,
              work.summary,
              work.relationship,
              ...(Array.isArray(work.fandoms) ? work.fandoms : [])
            ].join(' ').toLowerCase();
            return haystack.includes(_searchQuery);
          })
          .sort((a, b) => Number(b.updatedAt || b.movedAt || b.addedAt || 0) - Number(a.updatedAt || a.movedAt || a.addedAt || 0));

        list.innerHTML = visible.map(buildCardMarkup).join('');
        bindCardEvents();
        const showOnboarding = !_onboardingDismissed && allWorks.length === 0 && !_searchQuery;
        if (onboarding) onboarding.style.display = showOnboarding ? 'block' : 'none';
        empty.style.display = visible.length || showOnboarding ? 'none' : 'block';
        if (sortIndicator) {
          sortIndicator.textContent = _searchQuery ? `Filtered by search: ${_searchQuery}` : 'Sorted by most recently updated when available.';
          sortIndicator.classList.remove('aot-hidden');
        }
        checkExportReminder();
      });
    });
  }

  let _lastWorks = null;

  function trackAnchor() {
    // #profile_top is the standard story info block on FFNet story pages
    const directAnchor = d().querySelector('#profile_top') || d().querySelector('#content_wrapper_inner');
    if (directAnchor) return directAnchor;

    // Fallback: find story meta block via reliable content signal (Rated: Fiction + Words:)
    const metaNode = Array.from(d().querySelectorAll('span.xgray, span, div'))
      .find(node => /Rated:\s*Fiction/i.test(String(node.textContent || '')) && /Words:/i.test(String(node.textContent || '')));
    if (metaNode && typeof metaNode.closest === 'function') {
      const metaBlock = metaNode.closest('#profile_top, #content_wrapper_inner, [id]');
      if (metaBlock) return metaBlock;
    }

    return d().querySelector('#storytextp') || d().querySelector('select[name="chapter"]') || null;
  }

  function renderCurrentBar() {
    const bar = d().getElementById('aot-current-bar');
    const infoWrap = d().getElementById('aot-current-info');
    const titleEl = d().getElementById('aot-current-title');
    const metaEl = d().getElementById('aot-current-meta');
    const addBtn = d().getElementById('aot-current-add-btn');
    const addLabel = d().getElementById('aot-current-add-label');
    const dropdown = d().getElementById('aot-current-dropdown');
    const info = currentStoryInfo();
    if (!bar || !infoWrap || !titleEl || !metaEl || !addBtn || !addLabel || !dropdown) return;

    if (!info) {
      bar.style.display = 'none';
      dropdown.classList.add('aot-hidden');
      return;
    }

    getWorks(works => {
      getCustomCats(catsMap => {
        const existing = works[info.workId];
        const activeCats = existing && Array.isArray(existing.customCats) ? existing.customCats : [];
        const cats = Object.values(catsMap || {});

        titleEl.textContent = trunc(info.title || 'Untitled', 48);
        const chapterText = chapterProgressText(mergedStoryDisplayWork(info, existing));
        metaEl.textContent = [info.author ? `by ${info.author}` : '', chapterText].filter(Boolean).join(' • ');
        bar.style.display = 'flex';
        if (infoWrap.dataset.boundWorkId !== info.workId) {
          infoWrap.dataset.boundWorkId = info.workId;
          infoWrap.onclick = () => focusWorkInSidebar(info.workId);
        }
        addLabel.textContent = existing
          ? (STATUS_LABELS[normalizeStatus(existing.status)] || (activeCats.length ? 'Tracked' : 'Tracked'))
          : '+ Add';
        addBtn.classList.toggle('aot-has-status', !!existing);

        dropdown.innerHTML = buildStatusOptions(!!existing).map(buildCurrentOptionMarkup).join('')
          + (cats.length ? `<div class="aot-cur-divider"></div>${cats.map(cat => buildCurrentCatOptionMarkup(cat, activeCats.includes(cat.id))).join('')}` : '');

        if (!addBtn._fgBound) {
          addBtn._fgBound = true;
          addBtn.addEventListener('click', event => {
            event.stopPropagation();
            d().querySelectorAll('.ao3tracker-dropdown.open, .ao3t-badge-dropdown.open').forEach(node => node.classList.remove('open'));
            dropdown.classList.toggle('aot-hidden');
          });
        }

        dropdown.querySelectorAll('[data-status]').forEach(button => {
          button.addEventListener('click', event => {
            event.stopPropagation();
            dropdown.classList.add('aot-hidden');
            const status = button.dataset.status;
            if (status === 'remove') {
              removeWork(info.workId);
              return;
            }
            addOrMoveWork(info, status);
          });
        });

        dropdown.querySelectorAll('[data-custom-cat]').forEach(button => {
          button.addEventListener('click', event => {
            event.stopPropagation();
            dropdown.classList.add('aot-hidden');
            const catId = button.dataset.customCat;
            if (!catId) return;
            getWorks(currentWorks => {
              const prev = currentWorks[info.workId] || buildWorkRecord(info, '', null);
              const current = Array.isArray(prev.customCats) ? prev.customCats : [];
              const nextCustomCats = current.includes(catId)
                ? current.filter(id => id !== catId)
                : current.concat(catId);
              const nextRecord = {
                ...prev,
                ...info,
                id: info.workId,
                platform: 'ffnet',
                status: normalizeStatus(prev.status),
                customCats: nextCustomCats,
                addedAt: prev.addedAt || Date.now(),
                movedAt: Date.now()
              };
              if (!nextRecord.status && !nextCustomCats.length) {
                delete currentWorks[info.workId];
              } else {
                currentWorks[info.workId] = nextRecord;
              }
              setWorks(currentWorks, refresh);
            });
          });
        });
      });
    });
  }

  function syncCurrentStoryMetadata() {
    if (_syncingCurrentStory) return;
    const info = currentStoryInfo();
    if (!info || !info.workId) return;

    getWorks(works => {
      const existing = works[info.workId];
      if (!existing) return;

      const isFallbackTitle = /^Story \d+$/.test(String(info.title || ''));
      const next = {
        ...buildWorkRecord(info, existing.status, existing),
        title: (isFallbackTitle && existing.title) ? existing.title : (info.title || existing.title),
        fandoms: (info.fandoms && info.fandoms.length) ? info.fandoms : (existing.fandoms || []),
        summary: info.summary || existing.summary || '',
        customCats: existing.customCats || [],
        notes: existing.notes,
        rating: existing.rating,
        addedAt: existing.addedAt || Date.now(),
        movedAt: existing.movedAt || existing.addedAt || Date.now()
      };

      const changed = JSON.stringify({
        title: existing.title,
        author: existing.author,
        authorUrl: existing.authorUrl,
        url: existing.url,
        fandoms: existing.fandoms || [],
        relationship: existing.relationship || '',
        summary: existing.summary || '',
        wordCount: existing.wordCount || null,
        updatedAt: existing.updatedAt || null,
        publishedAt: existing.publishedAt || null,
        completedAt: existing.completedAt || null,
        chapterCount: existing.chapterCount || null,
        furthestChapter: existing.furthestChapter || null
      }) !== JSON.stringify({
        title: next.title,
        author: next.author,
        authorUrl: next.authorUrl,
        url: next.url,
        fandoms: next.fandoms || [],
        relationship: next.relationship || '',
        summary: next.summary || '',
        wordCount: next.wordCount || null,
        updatedAt: next.updatedAt || null,
        publishedAt: next.publishedAt || null,
        completedAt: next.completedAt || null,
        chapterCount: next.chapterCount || null,
        furthestChapter: next.furthestChapter || null
      });

      if (!changed) return;
      _syncingCurrentStory = true;
      works[info.workId] = next;
      setWorks(works, () => {
        _syncingCurrentStory = false;
        injectFabAndSidebar();
        renderCurrentBar();
        renderTrackButton();
        injectListingBadges();
      });
    });
  }

  function renderTrackButton() {
    if (_renderingTrackButton) return;
    _renderingTrackButton = true;
    const info = currentStoryInfo();
    const anchor = trackAnchor();
    d().getElementById(TRACK_BUTTON_ID)?.remove();
    if (!info || !anchor) {
      _renderingTrackButton = false;
      return;
    }

    getWorks(works => {
      const existing = works[info.workId];
      getCustomCats(catsMap => {
        const cats = Object.values(catsMap || {});
        const activeCats = existing && Array.isArray(existing.customCats) ? existing.customCats : [];
        const chapterText = chapterProgressText(mergedStoryDisplayWork(info, existing));
        const inlineMeta = existing
          ? `<div class="fg-track-inline-meta">${buildInlineCustomChips(activeCats, catsMap || {})}${chapterText ? `<span class="fg-track-inline-pill" data-fg-track-chapter="1">${esc(chapterText)}</span>` : ''}</div>`
          : '';
        const container = d().createElement('div');
        container.id = TRACK_BUTTON_ID;
        container.innerHTML = `
          <div class="ao3tracker-widget">
            <span class="ao3tracker-label">Track</span>
            <div class="ao3tracker-dropdown">
              ${buildStatusOptions(!!existing).map(buildTrackOptionMarkup).join('')}
              ${cats.length ? `<div class="ao3tracker-divider"></div>${cats.map(cat => buildCustomCatOptionMarkup(cat, activeCats.includes(cat.id))).join('')}` : ''}
            </div>
            ${existing ? `<span class="${listingBadgeClass(existing.status)}">${esc(STATUS_LABELS[normalizeStatus(existing.status)] || (activeCats.length ? 'Tracked' : 'Tracked'))}</span>` : ''}
            ${inlineMeta}
          </div>`;

        const label = container.querySelector('.ao3tracker-label');
        const dropdown = container.querySelector('.ao3tracker-dropdown');
        label.addEventListener('click', event => {
          event.stopPropagation();
          d().querySelectorAll('.ao3tracker-dropdown.open, .ao3t-badge-dropdown.open').forEach(node => node.classList.remove('open'));
          d().getElementById('aot-current-dropdown')?.classList.add('aot-hidden');
          dropdown.classList.toggle('open');
        });

        container.querySelectorAll('[data-status]').forEach(button => {
          button.addEventListener('click', event => {
            event.stopPropagation();
            const status = button.dataset.status;
            dropdown.classList.remove('open');
            if (status === 'remove') {
              removeWork(info.workId);
              return;
            }
            addOrMoveWork(info, status);
          });
        });

        container.querySelectorAll('[data-custom-cat]').forEach(button => {
          button.addEventListener('click', event => {
            event.stopPropagation();
            const catId = button.dataset.customCat;
            dropdown.classList.remove('open');
            if (!catId) return;
            getWorks(currentWorks => {
              const prev = currentWorks[info.workId] || buildWorkRecord(info, '', null);
              const current = Array.isArray(prev.customCats) ? prev.customCats : [];
              const nextCustomCats = current.includes(catId)
                ? current.filter(id => id !== catId)
                : current.concat(catId);
              const nextRecord = {
                ...prev,
                ...info,
                id: info.workId,
                platform: 'ffnet',
                status: normalizeStatus(prev.status),
                customCats: nextCustomCats,
                addedAt: prev.addedAt || Date.now(),
                movedAt: Date.now()
              };
              if (!nextRecord.status && !nextCustomCats.length) {
                delete currentWorks[info.workId];
              } else {
                currentWorks[info.workId] = nextRecord;
              }
              setWorks(currentWorks, refresh);
            });
          });
        });

        if (anchor.id === 'storytextp') {
          anchor.insertAdjacentElement('beforebegin', container);
          _renderingTrackButton = false;
          return;
        }
        anchor.insertAdjacentElement('afterend', container);
        _renderingTrackButton = false;
      });
    });
  }

  function buildListingTrackedDropdown(row, info, existing) {
    const dropdown = d().createElement('div');
    dropdown.className = BADGE_MENU_CLASS;
    getCustomCats(catsMap => {
      const cats = Object.values(catsMap || {});
      const activeCats = Array.isArray(existing.customCats) ? existing.customCats : [];
      dropdown.innerHTML = buildStatusOptions(true)
        .map(status => `<button class="ao3t-badge-opt${normalizeStatus(existing.status) === status ? ' ao3t-badge-opt-active' : ''}" data-status="${status}">${esc(statusOptionLabel(status))}</button>`)
        .join('') + (cats.length ? `<div class="ao3t-badge-divider"></div>${cats.map(cat => buildBadgeCatOptionMarkup(cat, activeCats.includes(cat.id))).join('')}` : '');

      dropdown.querySelectorAll('[data-status]').forEach(button => {
        button.addEventListener('click', event => {
          event.stopPropagation();
          const status = button.dataset.status;
          dropdown.classList.remove('open');
          if (status === 'remove') {
            removeWork(info.workId);
            return;
          }
          addOrMoveWork({ ...existing, ...info }, status);
        });
      });

      dropdown.querySelectorAll('[data-custom-cat]').forEach(button => {
        button.addEventListener('click', event => {
          event.stopPropagation();
          const catId = button.dataset.customCat;
          dropdown.classList.remove('open');
          if (!catId) return;
          getWorks(currentWorks => {
            const prev = currentWorks[info.workId] || { ...existing, ...info };
            const current = Array.isArray(prev.customCats) ? prev.customCats : [];
            const nextCustomCats = current.includes(catId)
              ? current.filter(id => id !== catId)
              : current.concat(catId);
            const nextRecord = {
              ...prev,
              ...info,
              id: info.workId,
              platform: 'ffnet',
              status: normalizeStatus(prev.status),
              customCats: nextCustomCats,
              addedAt: prev.addedAt || Date.now(),
              movedAt: Date.now()
            };
            if (!nextRecord.status && !nextCustomCats.length) {
              delete currentWorks[info.workId];
            } else {
              currentWorks[info.workId] = nextRecord;
            }
            setWorks(currentWorks, refresh);
          });
        });
      });
    });

    row.appendChild(dropdown);
  }

  function injectListingBadges() {
    if (currentStoryInfo()) return;
    const links = core().findListingStoryLinks ? core().findListingStoryLinks(d()) : [];
    if (!links.length) return;

    getWorks(works => {
      let healed = false;
      links.forEach(link => {
        const info = core().extractTrackedWorkFromListingLink ? core().extractTrackedWorkFromListingLink(link, w().location.href) : null;
        if (!info || !info.workId) return;
        const container = core().findListingContainer ? core().findListingContainer(link) : link.parentElement;
        if (!container) return;
        container.querySelectorAll(`[${BADGE_ATTR}="${info.workId}"]`).forEach(node => node.remove());

        const existing = works[info.workId];
        if (existing) {
          if (/^Story \d+$/.test(String(existing.title || '')) && info.title && !/^Story \d+$/.test(info.title)) {
            existing.title = info.title;
            healed = true;
          }
          if ((!existing.author || existing.author === 'Anonymous') && info.author && info.author !== 'Anonymous') {
            existing.author = info.author;
            if (info.authorUrl) existing.authorUrl = info.authorUrl;
            healed = true;
          }
          if ((!existing.fandoms || !existing.fandoms.length) && info.fandoms && info.fandoms.length) {
            existing.fandoms = info.fandoms;
            healed = true;
          }
          if (!existing.relationship && info.relationship) {
            existing.relationship = info.relationship;
            healed = true;
          }
        }
        const row = d().createElement('span');
        row.className = existing ? 'ao3t-badge-wrap' : 'ao3t-track-wrap';
        row.setAttribute(BADGE_ATTR, info.workId);

        if (existing) {
          const badge = d().createElement('span');
          badge.className = listingBadgeClass(existing.status);
          badge.textContent = `${STATUS_LABELS[normalizeStatus(existing.status)] || 'Tracked'} ▾`;
          badge.addEventListener('click', event => {
            event.stopPropagation();
            d().querySelectorAll('.ao3tracker-dropdown.open, .ao3t-badge-dropdown.open').forEach(node => node.classList.remove('open'));
            d().getElementById('aot-current-dropdown')?.classList.add('aot-hidden');
            row.querySelector('.ao3t-badge-dropdown')?.classList.toggle('open');
          });
          row.appendChild(badge);
          buildListingTrackedDropdown(row, info, existing);
          if (existing.customCats && existing.customCats.length) {
            getCustomCats(catsMap => {
              existing.customCats.forEach(catId => {
                const cat = (catsMap || {})[catId];
                if (!cat) return;
                const catPill = d().createElement('span');
                catPill.className = 'aot-custom-chip ao3t-search-custom-chip';
                catPill.style.setProperty('--chip-color', cat.color);
                catPill.textContent = cat.name;
                row.appendChild(catPill);
              });
            });
          }
        } else {
          const pill = d().createElement('span');
          pill.className = 'ao3t-track-pill';
          pill.textContent = 'Track';
          const dropdown = d().createElement('div');
          dropdown.className = BADGE_MENU_CLASS;
          getCustomCats(catsMap => {
            const cats = Object.values(catsMap || {});
            dropdown.innerHTML = buildStatusOptions(false)
              .map(status => `<button class="ao3t-badge-opt" data-status="${status}">${esc(statusOptionLabel(status))}</button>`)
              .join('') + (cats.length ? `<div class="ao3t-badge-divider"></div>${cats.map(cat => buildBadgeCatOptionMarkup(cat, false)).join('')}` : '');
            dropdown.querySelectorAll('[data-status]').forEach(button => {
              button.addEventListener('click', event => {
                event.stopPropagation();
                dropdown.classList.remove('open');
                addOrMoveWork(info, button.dataset.status || 'want');
              });
            });
            dropdown.querySelectorAll('[data-custom-cat]').forEach(button => {
              button.addEventListener('click', event => {
                event.stopPropagation();
                const catId = button.dataset.customCat;
                dropdown.classList.remove('open');
                if (!catId) return;
                getWorks(currentWorks => {
                  currentWorks[info.workId] = {
                    ...buildWorkRecord(info, '', currentWorks[info.workId]),
                    customCats: [catId]
                  };
                  setWorks(currentWorks, refresh);
                });
              });
            });
          });
          pill.addEventListener('click', event => {
            event.stopPropagation();
            d().querySelectorAll('.ao3tracker-dropdown.open, .ao3t-badge-dropdown.open').forEach(node => node.classList.remove('open'));
            d().getElementById('aot-current-dropdown')?.classList.add('aot-hidden');
            dropdown.classList.toggle('open');
          });
          row.appendChild(pill);
          row.appendChild(dropdown);
        }

        const reviewsAnchor = container.querySelector('a[href*="/r/"]');
        const authorAnchor = container.querySelector('a[href*="/u/"]');
        const insertAnchor = reviewsAnchor || authorAnchor || link;
        insertAnchor.insertAdjacentElement('afterend', row);
      });
      if (healed) setWorks(works, refresh);
    });
  }

  function handleMessage(msg, _sender, sendResponse) {
    if (msg && msg.type === 'GET_WORK_INFO') {
      sendResponse(currentStoryInfo());
      return false;
    }
    return undefined;
  }

  function handleStorageChanged(changes, areaName) {
    if (areaName !== 'local') return;
    if (!changes) return;
    const keys = themeKeys();
    if (changes[keys.sidebar]) {
      applySidebarTheme((changes[keys.sidebar] && changes[keys.sidebar].newValue) || undefined);
    }
    if (_syncingCurrentStory) return;

    const hasCatsChange = Object.prototype.hasOwnProperty.call(changes, customCatsKey());
    const hasWorksChange = Object.prototype.hasOwnProperty.call(changes, worksKey());
    const hasOnboardingChange = Object.prototype.hasOwnProperty.call(changes, onboardingDismissKey());
    if (hasOnboardingChange) {
      _onboardingDismissed = !!changes[onboardingDismissKey()].newValue;
    }
    if (!hasWorksChange && !hasCatsChange && !hasOnboardingChange) return;

    if (hasWorksChange && !hasCatsChange) {
      const info = currentStoryInfo();
      if (info && info.workId) {
        const worksChange = changes[worksKey()];
        const oldWork = (worksChange.oldValue || {})[info.workId];
        const newWork = (worksChange.newValue || {})[info.workId];
        const oldStatus = normalizeStatus(oldWork && oldWork.status);
        const newStatus = normalizeStatus(newWork && newWork.status);
        const oldCats = JSON.stringify((oldWork && oldWork.customCats) || []);
        const newCats = JSON.stringify((newWork && newWork.customCats) || []);
        const oldChapter = JSON.stringify((oldWork && oldWork.furthestChapter) || null);
        const newChapter = JSON.stringify((newWork && newWork.furthestChapter) || null);
        const oldChapterCount = Number((oldWork && oldWork.chapterCount) || 0);
        const newChapterCount = Number((newWork && newWork.chapterCount) || 0);
        if (
          oldStatus === newStatus &&
          oldCats === newCats &&
          oldChapter === newChapter &&
          oldChapterCount === newChapterCount
        ) return;
      }
    }

    refresh();
  }

  function refresh() {
    if (!ready() || !d().body) return;
    _lastStorySignature = currentStorySignature();
    syncCurrentStoryMetadata();
    injectFabAndSidebar();
    renderCurrentBar();
    renderTrackButton();
    clearTimeout(_listingBadgeDebounce);
    _listingBadgeDebounce = setTimeout(injectListingBadges, 80);
  }

  function syncTrackButtonInlineMeta() {
    if (!ready()) return;
    const info = currentStoryInfo();
    if (!info || !info.workId) return;
    const pill = d().querySelector(`#${TRACK_BUTTON_ID} [data-fg-track-chapter="1"]`);
    if (!pill) return;
    getWorks(works => {
      const existing = works[info.workId];
      const chapterText = chapterProgressText(mergedStoryDisplayWork(info, existing));
      if (!chapterText) return;
      if (pill.textContent !== chapterText) {
        pill.textContent = chapterText;
      }
    });
  }

  function maybeRefreshForStoryChange() {
    if (!ready() || !d().body) return;
    const nextSignature = currentStorySignature();
    if (nextSignature !== _lastStorySignature) {
      refresh();
      return;
    }
    syncTrackButtonInlineMeta();
  }

  function registerPageWatchers() {
    if (!ready() || _pageWatchersRegistered) return;
    _pageWatchersRegistered = true;

    w().addEventListener('popstate', () => {
      w().setTimeout(maybeRefreshForStoryChange, 80);
    });
    w().addEventListener('hashchange', () => {
      w().setTimeout(maybeRefreshForStoryChange, 80);
    });
    d().addEventListener('change', event => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.matches('select[name="chapter"]')) return;
      w().setTimeout(maybeRefreshForStoryChange, 80);
      w().setTimeout(maybeRefreshForStoryChange, 320);
    });
    d().addEventListener('click', event => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const chapterLink = target.closest('a[href*="/s/"]');
      if (!chapterLink) return;
      w().setTimeout(maybeRefreshForStoryChange, 120);
      w().setTimeout(maybeRefreshForStoryChange, 400);
    });
    w().setInterval(maybeRefreshForStoryChange, 1000);
  }

  function start() {
    if (!ready() || _started) return;
    _started = true;
    persistPlatformSelection();
    registerPageWatchers();
    loadOnboardingDismissed();
    refresh();
    if (!_messageListenerRegistered) {
      _deps.chrome.runtime.onMessage.addListener(handleMessage);
      _messageListenerRegistered = true;
    }
    if (!_storageListenerRegistered && _deps.chrome.storage && _deps.chrome.storage.onChanged) {
      _deps.chrome.storage.onChanged.addListener(handleStorageChanged);
      _storageListenerRegistered = true;
    }
  }

  const controller = {
    init,
    start,
    renderSidebar,
    renderTrackButton,
    injectListingBadges,
    currentStoryInfo
  };

  global.AO3TrackerFfnetController = controller;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = controller;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);

