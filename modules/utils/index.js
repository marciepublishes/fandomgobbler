(function (global) {
  'use strict';

  const SidebarCore = global.AO3TrackerSidebarCore || {};

  function waitMs(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function currentLocalDayStamp() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function trunc(s, n) { return s.length > n ? s.slice(0,n-1)+'…' : s; }

  function labelFor(s) {
    return {want:'For Later',progress:'Reading',completed:'Completed',rereading:'Re-reading',onhold:'On Hold',dnf:'Did Not Finish',lost:'Deleted'}[s]||'';
  }

  function trackedLabelFor(status) {
    return labelFor(status) || 'Tracked';
  }

  function validateDeps(deps, requiredKeys, moduleName) {
    if (!deps || typeof deps !== 'object') {
      console.error(`[AO3 Tracker] ${moduleName}: init() called with no deps object`);
      return;
    }
    requiredKeys.forEach(key => {
      if (deps[key] == null) {
        console.error(`[AO3 Tracker] ${moduleName}: missing required dep "${key}"`);
      }
    });
  }

  function formatWorkWordCountDisplay(wc) {
    if (typeof SidebarCore.formatWorkWordCountDisplay === 'function') {
      return SidebarCore.formatWorkWordCountDisplay(wc);
    }
    const n = wc == null || wc === '' ? NaN : Number(wc);
    if (!Number.isFinite(n) || n <= 0) return '—';
    return n.toLocaleString() + ' words';
  }

  const AO3TrackerUtils = {
    waitMs,
    currentLocalDayStamp,
    esc,
    trunc,
    labelFor,
    trackedLabelFor,
    formatWorkWordCountDisplay,
    validateDeps
  };

  global.AO3TrackerUtils = AO3TrackerUtils;
  if (typeof module !== 'undefined' && module.exports) module.exports = AO3TrackerUtils;
})(typeof globalThis !== 'undefined' ? globalThis : this);
