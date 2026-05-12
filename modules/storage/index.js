(function (global) {
  'use strict';

  const {
    LAST_EXPORT_KEY,
    EXPORT_BANNER_DISMISS_SESSION,
    LIBRARY_SORT_KEY
  } = global.AO3TrackerStorageKeys || {};

  let _deps = null;

  const EXPORT_REMIND_DAYS = 30;
  const FIRST_EXPORT_GRACE_DAYS = 7;

  function init(deps) {
    _deps = deps;
  }

  function _onContextInvalidated() {
    if (_deps && typeof _deps.onContextInvalidated === 'function') {
      _deps.onContextInvalidated();
    }
  }

  function _sanitizeTrackedWorksMap(inputWorks) {
    const TrackedWorkCore = global.AO3TrackerTrackedWorkCore || {};
    if (typeof TrackedWorkCore.sanitizeTrackedWorksMap === 'function') {
      return TrackedWorkCore.sanitizeTrackedWorksMap(inputWorks);
    }
    // Fallback (should not be needed in normal operation)
    const source = (inputWorks && typeof inputWorks === 'object') ? inputWorks : {};
    return { works: source, changed: false };
  }

  function _storageLastErrorMessage() {
    try {
      return chrome.runtime && chrome.runtime.lastError && chrome.runtime.lastError.message;
    } catch (e) {
      return '';
    }
  }

  function _safeStorageSet(payload, cb) {
    try {
      chrome.storage.local.set(payload, () => {
        const msg = _storageLastErrorMessage();
        if (msg) {
          console.warn('AO3 Tracker: storage save failed', msg);
          if (_deps && typeof _deps.showMiniToast === 'function') {
            _deps.showMiniToast(`Save failed: ${msg}`);
          }
        }
        if (typeof cb === 'function') cb(!msg);
      });
    } catch (e) {
      console.warn('AO3 Tracker: storage unavailable', e);
      if (typeof cb === 'function') cb(false);
    }
  }

  function getWorks(cb) {
    try {
      chrome.storage.local.get('ao3works', d => {
        try {
          const sanitized = _sanitizeTrackedWorksMap(d.ao3works || {});
          if (sanitized.changed) {
            _safeStorageSet({ ao3works: sanitized.works }, () => {
              try { cb(sanitized.works); } catch (e) { console.error('AO3 Tracker:', e); }
            });
            return;
          }
          cb(sanitized.works);
        } catch (e) { console.error('AO3 Tracker:', e); }
      });
    } catch (e) {
      if (e.message?.includes('Extension context invalidated')) {
        _onContextInvalidated();
      } else {
        console.warn('AO3 Tracker: storage unavailable', e);
      }
    }
  }

  function setWorks(works, cb) {
    _safeStorageSet({ ao3works: works }, cb);
  }

  function getCustomCats(cb) {
    try {
      chrome.storage.local.get('ao3customcats', d => {
        try { cb(d.ao3customcats || {}); } catch(e) { console.error('AO3 Tracker:', e); }
      });
    } catch (e) {
      if (e.message?.includes('Extension context invalidated')) {
        _onContextInvalidated();
      } else {
        console.warn('AO3 Tracker: storage unavailable', e);
      }
      try { cb({}); } catch (err) { console.error('AO3 Tracker:', err); }
    }
  }

  function setCustomCats(cats) {
    try { _safeStorageSet({ ao3customcats: cats }); }
    catch (e) {
      if (e.message?.includes('Extension context invalidated')) {
        _onContextInvalidated();
      } else {
        console.warn('AO3 Tracker: storage unavailable', e);
      }
    }
  }

  function genCatId() { return 'cat-' + Date.now() + '-' + Math.random().toString(36).slice(2,6); }

  function getLibrarySortSetting(cb) {
    try {
      chrome.storage.local.get(LIBRARY_SORT_KEY, data => {
        try { cb(data[LIBRARY_SORT_KEY] || 'recently-added'); } catch (e) { console.error('AO3 Tracker:', e); }
      });
    } catch (e) {
      cb('recently-added');
    }
  }

  function stampExport() {
    try {
      _safeStorageSet({ [LAST_EXPORT_KEY]: Date.now() });
      try { sessionStorage.removeItem(EXPORT_BANNER_DISMISS_SESSION); } catch (e2) {}
    } catch (e) {}
  }

  function checkExportReminder() {
    const document = _deps ? _deps.document : globalThis.document;
    const banner = document.getElementById('aot-export-reminder');
    const msg = document.getElementById('aot-reminder-msg');
    if (!banner || !msg) return;
    try {
      if (sessionStorage.getItem(EXPORT_BANNER_DISMISS_SESSION) === '1') {
        banner.classList.add('aot-hidden');
        return;
      }
    } catch (e) {}
    try {
      chrome.storage.local.get(['ao3works', LAST_EXPORT_KEY], d => {
        const workList = Object.values(d.ao3works || {});
        if (!workList.length) {
          banner.classList.add('aot-hidden');
          return;
        }
        const firstTrackedAt = workList
          .map(w => Number(w?.addedAt))
          .filter(Number.isFinite)
          .sort((a, b) => a - b)[0] || null;
        const last = d[LAST_EXPORT_KEY];
        const daysSince = last != null ? Math.floor((Date.now() - last) / 86400000) : null;
        const graceElapsed = firstTrackedAt != null && (Date.now() - firstTrackedAt) >= (FIRST_EXPORT_GRACE_DAYS * 86400000);
        const overdue = last != null ? daysSince >= EXPORT_REMIND_DAYS : graceElapsed;
        if (overdue) {
          msg.textContent = last != null ? `No backup in ${daysSince} days — export your data?` : `You haven't exported yet — back up your data?`;
          banner.classList.remove('aot-hidden');
        } else {
          banner.classList.add('aot-hidden');
        }
      });
    } catch (e) {}
  }

  const AO3TrackerStorage = {
    init,
    getWorks,
    setWorks,
    getCustomCats,
    setCustomCats,
    genCatId,
    getLibrarySortSetting,
    stampExport,
    checkExportReminder
  };

  global.AO3TrackerStorage = AO3TrackerStorage;
  if (typeof module !== 'undefined' && module.exports) module.exports = AO3TrackerStorage;
})(typeof globalThis !== 'undefined' ? globalThis : this);
