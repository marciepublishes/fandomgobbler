(function (global) {
  'use strict';

  let _deps = null;
  let _miniToastTimer = null;
  let _trackerRefreshRequired = false;

  function init(deps) {
    _deps = deps;
  }

  function isRefreshRequired() {
    return _trackerRefreshRequired;
  }

  function setRefreshRequired(val) {
    _trackerRefreshRequired = val;
  }

  function showMiniToast(msg) {
    const document = _deps ? _deps.document : globalThis.document;
    let t = document.getElementById('ao3tracker-toast');
    if (!t) { t = document.createElement('div'); t.id = 'ao3tracker-toast'; document.body.appendChild(t); }
    const text = typeof msg === 'string' ? msg : String(msg ?? '');
    const isRefreshPrompt = text === 'Please refresh the page to use the tracker.';
    if (_trackerRefreshRequired && isRefreshPrompt && t.classList.contains('show') && t.textContent === text) {
      return;
    }
    if (_trackerRefreshRequired && !isRefreshPrompt) return;
    if (_miniToastTimer) {
      clearTimeout(_miniToastTimer);
      _miniToastTimer = null;
    }
    t.textContent = text;
    t.classList.remove('has-undo');
    t.classList.add('show');
    if (isRefreshPrompt) {
      _trackerRefreshRequired = true;
      return;
    }
    _miniToastTimer = setTimeout(() => {
      t.classList.remove('show');
      _miniToastTimer = null;
    }, 2500);
  }

  function showMiniUndoToast(msg, undoFn) {
    const document = _deps ? _deps.document : globalThis.document;
    let t = document.getElementById('ao3tracker-toast');
    if (!t) { t = document.createElement('div'); t.id = 'ao3tracker-toast'; document.body.appendChild(t); }
    if (_trackerRefreshRequired) return;
    if (_miniToastTimer) { clearTimeout(_miniToastTimer); _miniToastTimer = null; }
    t.textContent = '';
    t.classList.remove('has-undo');
    const msgSpan = document.createElement('span');
    msgSpan.textContent = typeof msg === 'string' ? msg : String(msg ?? '');
    t.appendChild(msgSpan);
    if (typeof undoFn === 'function') {
      const undoBtn = document.createElement('button');
      undoBtn.type = 'button';
      undoBtn.className = 'ao3tracker-toast-undo';
      undoBtn.textContent = 'Undo';
      undoBtn.addEventListener('click', e => {
        e.stopPropagation();
        if (_miniToastTimer) { clearTimeout(_miniToastTimer); _miniToastTimer = null; }
        t.classList.remove('show', 'has-undo');
        undoFn();
      });
      t.appendChild(undoBtn);
      t.classList.add('has-undo');
    }
    t.classList.add('show');
    _miniToastTimer = setTimeout(() => {
      t.classList.remove('show', 'has-undo');
      _miniToastTimer = null;
    }, 5500);
  }

  const AO3TrackerToast = {
    init,
    showMiniToast,
    showMiniUndoToast,
    isRefreshRequired,
    setRefreshRequired
  };

  global.AO3TrackerToast = AO3TrackerToast;
  if (typeof module !== 'undefined' && module.exports) module.exports = AO3TrackerToast;
})(typeof globalThis !== 'undefined' ? globalThis : this);
