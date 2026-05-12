(function (global) {
  'use strict';

  let _deps = null;

  const RECHECK_MIN_MS = 6 * 60 * 60 * 1000;
  const CHECK_BATCH = 5;
  const CHECK_DELAY = 2500;

  function init(deps) {
    _deps = deps;
  }

  async function checkWorkAvailable(url) {
    try {
      const resp = await fetch(url, { credentials: 'include' });
      if (resp.status === 404) return { availability: 'deleted', wordCount: null, kudosCount: null, bookmarksCount: null, hitsCount: null, updatedAt: null, completedAt: null, subscribedAtAo3: null };
      const text = await resp.text();
      if (text.includes("We couldn't find the page") || text.includes("This work was deleted")) {
        return { availability: 'deleted', wordCount: null, kudosCount: null, bookmarksCount: null, hitsCount: null, updatedAt: null, completedAt: null, subscribedAtAo3: null };
      }
      if (text.includes("Sorry, you don't have permission") || text.includes("This work is only available to registered users")) {
        return { availability: 'restricted', wordCount: null, kudosCount: null, bookmarksCount: null, hitsCount: null, updatedAt: null, completedAt: null, subscribedAtAo3: null };
      }

      // Best-effort: parse word count / updated date from fetched HTML
      const wordsMatch = text.match(/<dd[^>]*class="[^"]*\bwords\b[^"]*"[^>]*>\s*([\d,]+)\s*<\/dd>/i);
      const wordCount = wordsMatch ? (parseInt(wordsMatch[1].replace(/,/g, ''), 10) || null) : null;
      const kudosMatch = text.match(/<dd[^>]*class="[^"]*\bkudos\b[^"]*"[^>]*>\s*([\d,]+)\s*<\/dd>/i);
      const kudosCount = kudosMatch ? (parseInt(kudosMatch[1].replace(/,/g, ''), 10) || null) : null;
      const bookmarksMatch = text.match(/<dd[^>]*class="[^"]*\bbookmarks\b[^"]*"[^>]*>\s*([\d,]+)\s*<\/dd>/i);
      const bookmarksCount = bookmarksMatch ? (parseInt(bookmarksMatch[1].replace(/,/g, ''), 10) || null) : null;
      const hitsMatch = text.match(/<dd[^>]*class="[^"]*\bhits\b[^"]*"[^>]*>\s*([\d,]+)\s*<\/dd>/i);
      const hitsCount = hitsMatch ? (parseInt(hitsMatch[1].replace(/,/g, ''), 10) || null) : null;

      const parseDate = (global.AO3TrackerAo3PageCore && global.AO3TrackerAo3PageCore.parseAo3DateLocal) || Date.parse;

      const updatedMatch = text.match(/<dt[^>]*>\s*Updated:\s*<\/dt>\s*<dd[^>]*>\s*([^<]+?)\s*<\/dd>/i);
      const updatedAt = updatedMatch ? (parseDate(updatedMatch[1].trim()) || null) : null;

      const completedMatch = text.match(/<dt[^>]*>\s*Completed:\s*<\/dt>\s*<dd[^>]*>\s*([^<]+?)\s*<\/dd>/i);
      const completedAt = completedMatch ? (parseDate(completedMatch[1].trim()) || null) : null;
      const publishedMatch = text.match(/<dt[^>]*>\s*(Published|Posted):\s*<\/dt>\s*<dd[^>]*>\s*([^<]+?)\s*<\/dd>/i);
      const publishedAt = publishedMatch ? (parseDate(publishedMatch[2].trim()) || null) : null;
      const chaptersMatch = text.match(/<dt[^>]*>\s*Chapters:\s*<\/dt>\s*<dd[^>]*>\s*(\d+)\s*\/\s*(\d+|\?)\s*<\/dd>/i);
      const chaptersCurrent = chaptersMatch ? (parseInt(chaptersMatch[1], 10) || null) : null;
      const chaptersTotal = chaptersMatch ? (chaptersMatch[2] === '?' ? null : (parseInt(chaptersMatch[2], 10) || null)) : null;
      const isComplete = (chaptersCurrent != null && chaptersTotal != null && chaptersCurrent === chaptersTotal);
      const inferredCompletedAt = (!completedAt && isComplete && publishedAt) ? publishedAt : null;

      // Scope subscription check to this specific work - avoid author/series forms
      const urlWorkId = (url.match(/\/works\/(\d+)/) || [])[1];
      let subscribedAtAo3 = null;
      if (urlWorkId) {
        const workSubRe = new RegExp(`/works/${urlWorkId}[^"']*subscriptions`, 'i');
        if (workSubRe.test(text)) {
          // Subscribed = form action has a subscription ID (e.g. /subscriptions/456)
          const subWithIdRe = new RegExp(`/works/${urlWorkId}[^"']*subscriptions/\\d+`, 'i');
          subscribedAtAo3 = subWithIdRe.test(text) ? true : false;
        }
      }

      return {
        availability: 'available',
        wordCount,
        kudosCount,
        bookmarksCount,
        hitsCount,
        updatedAt: Number.isFinite(updatedAt) ? updatedAt : null,
        completedAt: Number.isFinite(completedAt) ? completedAt : null,
        publishedAt: Number.isFinite(publishedAt) ? publishedAt : null,
        inferredCompletedAt: Number.isFinite(inferredCompletedAt) ? inferredCompletedAt : null,
        subscribedAtAo3
      };
    } catch (e) {
      return { availability: 'unknown', wordCount: null, kudosCount: null, bookmarksCount: null, hitsCount: null, updatedAt: null, completedAt: null, subscribedAtAo3: null }; // network error - don't mark as lost
    }
  }

  function shortTitleForNotification(work) {
    const title = String(work?.title || 'A tracked work');
    return title.length > 40 ? title.slice(0, 39) + '...' : title;
  }

  function deletedWorkNotificationPayload(work) {
    const title = shortTitleForNotification(work);
    const author = String(work?.author || '').trim();
    return {
      type: 'basic',
      iconUrl: 'icons/fg-icon128.png',
      title: 'Tracked work may be gone',
      message: author
        ? `"${title}" by ${author} may have been removed from AO3.`
        : `"${title}" may have been removed from AO3.`
    };
  }

  function notifyDeletedWork(work) {
    try {
      const runtime = global.chrome && global.chrome.runtime;
      if (!runtime || typeof runtime.sendMessage !== 'function') return;
      runtime.sendMessage({
        type: 'FG_NOTIFY',
        id: `fandomgobbler-lost-${work?.id || Date.now()}`,
        payload: deletedWorkNotificationPayload(work)
      });
    } catch (e) {}
  }

  function initAvailabilityChecker() {
    const { getWorks, setWorks, renderSidebar, showMiniToast } = _deps;
    // Only run on AO3 pages, delay 8s after page load to stay out of the way
    setTimeout(() => {
      getWorks(async works => {
        const now = Date.now();
        // Candidates: not already lost, URL looks like an AO3 work, due for a check
        const candidates = Object.values(works).filter(w =>
          w.status !== 'lost' &&
          w.url && w.url.includes('archiveofourown.org/works/') &&
          (!w.lastChecked || (now - w.lastChecked) > RECHECK_MIN_MS)
        );
        // Sort: never-checked first, then oldest check first
        candidates.sort((a, b) => (a.lastChecked || 0) - (b.lastChecked || 0));
        const batch = candidates.slice(0, CHECK_BATCH);
        if (!batch.length) return;

        for (let i = 0; i < batch.length; i++) {
          if (i > 0) await new Promise(r => setTimeout(r, CHECK_DELAY));
          const work = batch[i];
          const res = await checkWorkAvailable(work.url);
          // Re-fetch works before writing to avoid overwriting concurrent changes
          getWorks(ws => {
            if (!ws[work.id]) return;
            ws[work.id].lastChecked = Date.now();
            // Backfill stats opportunistically (only when missing)
            if (res.wordCount) ws[work.id].wordCount = res.wordCount;
            if (res.kudosCount) ws[work.id].kudosCount = res.kudosCount;
            if (res.bookmarksCount) ws[work.id].bookmarksCount = res.bookmarksCount;
            if (res.hitsCount) ws[work.id].hitsCount = res.hitsCount;
            if (res.updatedAt && !ws[work.id].updatedAt) ws[work.id].updatedAt = res.updatedAt;
            if (res.completedAt && !ws[work.id].completedAt) ws[work.id].completedAt = res.completedAt;
            if (res.subscribedAtAo3 !== null && ws[work.id].subscribedAtAo3 !== res.subscribedAtAo3) ws[work.id].subscribedAtAo3 = res.subscribedAtAo3;
            if (res.publishedAt && !ws[work.id].publishedAt) ws[work.id].publishedAt = res.publishedAt;
            if (res.inferredCompletedAt && !ws[work.id].inferredCompletedAt) ws[work.id].inferredCompletedAt = res.inferredCompletedAt;

            if (res.availability === 'deleted' && ws[work.id].status !== 'lost') {
              ws[work.id].lostFrom = ws[work.id].status;
              ws[work.id].status = 'lost';
              ws[work.id].lostAt = Date.now();
              setWorks(ws);
              const shortTitle = work.title.length > 40 ? work.title.slice(0, 39) + '…' : work.title;
              showMiniToast(`"${shortTitle}" may have been removed from AO3`);
              notifyDeletedWork(work);
              renderSidebar();
            } else {
              setWorks(ws);
            }
          });
        }
      });
    }, 8000);
  }

  const AO3TrackerAvailabilityChecker = {
    init,
    initAvailabilityChecker
  };

  AO3TrackerAvailabilityChecker.__test = {
    checkWorkAvailable,
    deletedWorkNotificationPayload
  };

  global.AO3TrackerAvailabilityChecker = AO3TrackerAvailabilityChecker;
  if (typeof module !== 'undefined' && module.exports) module.exports = AO3TrackerAvailabilityChecker;
})(typeof globalThis !== 'undefined' ? globalThis : this);
