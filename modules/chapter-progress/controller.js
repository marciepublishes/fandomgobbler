(function (global) {
  'use strict';

  let _deps = null;
  let _waitingForActivation = false;

  function init(deps) {
    _deps = deps;
    _waitingForActivation = false;
  }

  function inferChapterProgress(document, url) {
    const chapterIdMatch = url.match(/\/chapters\/(\d+)/);
    const chapterId = chapterIdMatch ? chapterIdMatch[1] : null;
    const select = document && document.querySelector('select[name="selected_id"]');
    let chapterNum = 1;
    let totalChapters = null;

    if (select && select.options.length > 0) {
      const chapterOptions = Array.from(select.options).filter(option => {
        const value = String(option.value || '');
        const text = String(option.textContent || option.label || '');
        const href = String(option.getAttribute?.('data-url') || option.dataset?.url || '');
        return /^\d+$/.test(value) || /\/chapters\/\d+/.test(href) || /^\s*Chapter\s+\d+\b/i.test(text);
      });
      const options = chapterOptions.length ? chapterOptions : Array.from(select.options);
      totalChapters = options.length;
      for (let i = 0; i < select.options.length; i++) {
        if (!select.options[i].selected) continue;
        const selected = select.options[i];
        const selectedValue = String(selected.value || '');
        const selectedHref = String(selected.getAttribute?.('data-url') || selected.dataset?.url || '');
        const selectedText = String(selected.textContent || selected.label || '');
        const matchingIndex = options.indexOf(selected);
        const textMatch = selectedText.match(/^\s*Chapter\s+(\d+)\b/i);
        if (chapterId && selectedValue === chapterId) {
          chapterNum = matchingIndex >= 0 ? matchingIndex + 1 : 1;
        } else if (chapterId && selectedHref.includes(`/chapters/${chapterId}`)) {
          chapterNum = matchingIndex >= 0 ? matchingIndex + 1 : 1;
        } else if (textMatch) {
          chapterNum = parseInt(textMatch[1], 10) || 1;
        } else {
          chapterNum = matchingIndex >= 0 ? matchingIndex + 1 : 1;
        }
        break;
      }
    }

    return { chapterId, chapterNum, totalChapters };
  }

  function isReadablePageView(document) {
    if (!document) return true;
    if (document.prerendering === true) return false;
    const visibilityState = document.visibilityState || document.webkitVisibilityState || '';
    if (visibilityState && visibilityState !== 'visible') return false;
    if (document.hidden === true) return false;
    return true;
  }

  function waitForReadablePageView() {
    if (_waitingForActivation || !_deps || !_deps.document) return;
    const { document, window } = _deps;
    if (typeof document.addEventListener !== 'function') return;
    _waitingForActivation = true;

    const onReadable = () => {
      if (!isReadablePageView(document)) return;
      _waitingForActivation = false;
      document.removeEventListener?.('visibilitychange', onReadable);
      document.removeEventListener?.('webkitvisibilitychange', onReadable);
      document.removeEventListener?.('prerenderingchange', onReadable);
      const runSoon = (window && typeof window.setTimeout === 'function') ? window.setTimeout.bind(window) : setTimeout;
      runSoon(scheduleChapterProgressSync, 0);
    };

    document.addEventListener('visibilitychange', onReadable);
    document.addEventListener('webkitvisibilitychange', onReadable);
    document.addEventListener('prerenderingchange', onReadable);
  }

  function trackChapterProgress() {
    const { getWorks, setWorks, renderSidebar, refreshWorkPageMetaRow, document, window } = _deps;
    if (!isReadablePageView(document)) {
      waitForReadablePageView();
      return;
    }
    const url = window.location.href;
    const workMatch = url.match(/archiveofourown\.org\/(?:collections\/[^/]+\/)?works\/(\d+)/);
    if (!workMatch) return;
    const workId = workMatch[1];
    const { chapterId, chapterNum, totalChapters } = inferChapterProgress(document, url);

    getWorks(works => {
      if (!works[workId]) return; // only track for works already saved
      const existing = works[workId].furthestChapter;
      let changed = false;
      if (!existing || chapterNum > existing.num) {
        // Advance to a new furthest chapter
        works[workId].furthestChapter = {
          id: chapterId,
          num: chapterNum,
          total: totalChapters,
          visitedAt: Date.now()
        };
        changed = true;
      } else {
        // Same or earlier chapter — still refresh visitedAt and total
        const newTotal = totalChapters !== null ? totalChapters : existing.total;
        if (newTotal !== existing.total) {
          works[workId].furthestChapter = { ...existing, total: newTotal, visitedAt: Date.now() };
          changed = true;
        } else if (!existing.visitedAt) {
          works[workId].furthestChapter = { ...existing, visitedAt: Date.now() };
          changed = true;
        }
      }
      if (!changed) return;
      setWorks(works);
      renderSidebar();
      refreshWorkPageMetaRow();
    });
  }

  function scheduleChapterProgressSync() {
    trackChapterProgress();
    [250, 900, 1800].forEach(ms => {
      setTimeout(trackChapterProgress, ms);
    });
  }

  const AO3TrackerChapterProgress = {
    init,
    inferChapterProgress,
    isReadablePageView,
    trackChapterProgress,
    scheduleChapterProgressSync
  };

  global.AO3TrackerChapterProgress = AO3TrackerChapterProgress;
  if (typeof module !== 'undefined' && module.exports) module.exports = AO3TrackerChapterProgress;
})(typeof globalThis !== 'undefined' ? globalThis : this);
