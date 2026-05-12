(function (global) {
  'use strict';

  let _deps = null;

  const AUTHOR_WATCH_AUTO_MAX_PER_DAY = 8;
  const AUTHOR_WATCH_AUTO_DELAY_MS = 1800;
  const AUTHOR_WATCH_AUTO_LOCK_TTL_MS = 20 * 60 * 1000;

  function init(deps) {
    if (global.AO3TrackerUtils && typeof global.AO3TrackerUtils.validateDeps === 'function') {
      global.AO3TrackerUtils.validateDeps(deps, [
        'window', 'document',
        'waitMs', 'currentLocalDayStamp',
        'showMiniToast',
        'AuthorWatchCore',
        'AUTHOR_WATCHES_KEY', 'AUTHOR_WATCH_MATCHES_KEY',
        'AUTHOR_WATCH_AUTO_DAY_KEY', 'AUTHOR_WATCH_AUTO_LOCK_KEY'
      ], 'AuthorWatchController');
    }
    _deps = deps;
  }

  function parseAo3FetchedHtml(html) {
    const { document, AuthorWatchCore } = _deps;
    const sanitizeFetchedAo3Html = AuthorWatchCore.sanitizeFetchedAo3Html || (h => String(h || ''));
    const sanitized = sanitizeFetchedAo3Html(html);
    const bodyMatch = sanitized.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const bodyMarkup = bodyMatch ? bodyMatch[1] : sanitized;
    const doc = document.implementation.createHTMLDocument('ao3-fetched');
    const base = doc.createElement('base');
    base.href = 'https://archiveofourown.org/';
    doc.head.appendChild(base);
    if (typeof DOMParser === 'function') {
      const parsed = new DOMParser().parseFromString(bodyMarkup, 'text/html');
      parsed.querySelectorAll('script, link, meta, style, noscript, iframe, embed, object, img, source, track, video, audio, picture')
        .forEach(node => node.remove());
      parsed.querySelectorAll('*').forEach(node => {
        Array.from(node.attributes || []).forEach(attr => {
          const name = String(attr.name || '').toLowerCase();
          if (name.startsWith('on') || ['src', 'srcset', 'poster', 'ping', 'integrity', 'crossorigin', 'nonce'].includes(name)) {
            node.removeAttribute(attr.name);
          }
        });
      });
      doc.body.append(...Array.from(parsed.body.childNodes).map(node => node.cloneNode(true)));
    } else {
      doc.body.textContent = bodyMarkup;
    }
    return doc;
  }

  async function fetchAuthorWatchFeed(watch) {
    const { AuthorWatchCore } = _deps;
    const normalizeAuthorWatchUrl  = AuthorWatchCore.normalizeAuthorWatchUrl  || (url => String(url || '').trim());
    const normalizeWatchFandom     = AuthorWatchCore.normalizeWatchFandom     || (f => String(f || '').trim().toLowerCase());
    const buildAuthorWatchFeedUrl  = AuthorWatchCore.buildAuthorWatchFeedUrl  || ((au, p) => `${normalizeAuthorWatchUrl(au)}/works?page=${Math.max(1, p || 1)}&sort_column=created_at&sort_direction=desc`);
    const extractFandomIdFromDocument = AuthorWatchCore.extractFandomIdFromDocument || (() => '');
    const looksLikeAo3BotBlock     = AuthorWatchCore.looksLikeAo3BotBlock     || (h => { const t = String(h || '').toLowerCase(); return t.includes('retry later') || t.includes('temporarily blocked') || t.includes('too many requests'); });
    const extractWorkIdFromUrl     = AuthorWatchCore.extractWorkIdFromUrl     || (url => { const m = String(url || '').match(/archiveofourown\.org\/works\/(\d+)/); return m ? m[1] : null; });

    const authorUrl = normalizeAuthorWatchUrl(watch?.authorUrl);
    if (!authorUrl || !watch?.fandomKey) return [];
    const seenIds = new Set();
    const matches = [];
    for (let page = 1; page <= 3; page++) {
      let html = '';
      try {
        const resp = await fetch(buildAuthorWatchFeedUrl(authorUrl, page, watch.fandomId), { credentials: 'include' });
        if (!resp.ok) break;
        html = await resp.text();
      } catch (e) { break; }
      if (looksLikeAo3BotBlock(html)) return 'bot-blocked';
      const doc = parseAo3FetchedHtml(html);
      if (!watch.fandomId) {
        const fandomId = extractFandomIdFromDocument(doc, watch.fandom);
        if (fandomId) watch.fandomId = fandomId;
      }
      const blurbs = Array.from(doc.querySelectorAll('li.work.blurb.group'));
      if (!blurbs.length) break;
      blurbs.forEach(blurb => {
        const workLink = blurb.querySelector('h4.heading a[href*="/works/"], h4 a[href*="/works/"]');
        const url = workLink?.href || '';
        const workId = extractWorkIdFromUrl(url);
        if (!workId || seenIds.has(workId)) return;
        const fandomKeys = Array.from(blurb.querySelectorAll('.fandoms a.tag, .fandom.tags a.tag'))
          .map(el => normalizeWatchFandom(el.textContent)).filter(Boolean);
        if (!fandomKeys.includes(watch.fandomKey)) return;
        seenIds.add(workId);
        matches.push({ workId, title: String(workLink?.textContent || 'Untitled').trim(), url: url || `https://archiveofourown.org/works/${workId}` });
      });
      if (blurbs.length < 20) break;
    }
    return matches;
  }

  async function runDailyAuthorWatchAutoCheck() {
    const {
      window, AuthorWatchCore, showMiniToast, waitMs, currentLocalDayStamp,
      AUTHOR_WATCHES_KEY, AUTHOR_WATCH_MATCHES_KEY, AUTHOR_WATCH_AUTO_DAY_KEY, AUTHOR_WATCH_AUTO_LOCK_KEY
    } = _deps;

    if (!/archiveofourown\.org$/i.test(window.location.hostname)) return;
    const today = currentLocalDayStamp();
    const data = await new Promise(resolve => {
      try { chrome.storage.local.get([AUTHOR_WATCHES_KEY, AUTHOR_WATCH_MATCHES_KEY, AUTHOR_WATCH_AUTO_DAY_KEY, AUTHOR_WATCH_AUTO_LOCK_KEY], resolve); }
      catch (e) { resolve({}); }
    });
    const lockAge = Date.now() - Number(data[AUTHOR_WATCH_AUTO_LOCK_KEY] || 0);
    if (data[AUTHOR_WATCH_AUTO_LOCK_KEY] && lockAge >= 0 && lockAge < AUTHOR_WATCH_AUTO_LOCK_TTL_MS) return;
    if (data[AUTHOR_WATCH_AUTO_DAY_KEY] === today) return;

    const sanitizeAuthorWatchesMap = AuthorWatchCore.sanitizeAuthorWatchesMap
      ? ws => (AuthorWatchCore.sanitizeAuthorWatchesMap(ws).watches || {})
      : ws => ws || {};
    const sanitizeAuthorWatchMatches = AuthorWatchCore.sanitizeAuthorWatchMatches || (ms => (ms || []).slice(0, 100));

    const watchesMap = sanitizeAuthorWatchesMap(data[AUTHOR_WATCHES_KEY] || {});
    const watches = Object.values(watchesMap);
    if (!watches.length) return;

    try { chrome.storage.local.set({ [AUTHOR_WATCH_AUTO_LOCK_KEY]: Date.now() }); } catch (e) {}

    const prioritized = watches
      .filter(w => w.authorUrl && w.fandomKey)
      .sort((a, b) => (a.lastCheckedAt || 0) - (b.lastCheckedAt || 0))
      .slice(0, AUTHOR_WATCH_AUTO_MAX_PER_DAY);

    let newMatches = 0;
    let matches = sanitizeAuthorWatchMatches(data[AUTHOR_WATCH_MATCHES_KEY] || []);
    let checked = 0;
    let botBlocked = false;

    try {
      for (let i = 0; i < prioritized.length; i++) {
        if (i > 0) await waitMs(AUTHOR_WATCH_AUTO_DELAY_MS);
        const watch = prioritized[i];
        const result = await fetchAuthorWatchFeed(watch);
        if (result === 'bot-blocked') { botBlocked = true; break; }
        if (!Array.isArray(result)) continue;
        checked += 1;
        const known = new Set(Array.isArray(watch.knownWorkIds) ? watch.knownWorkIds : []);
        if (!watch.baselineReady) {
          result.forEach(item => known.add(item.workId));
          watch.baselineReady = true;
          watch.lastCheckedAt = Date.now();
          watch.knownWorkIds = Array.from(known).slice(-250);
          continue;
        }
        const freshMatches = result.filter(item => !known.has(item.workId));
        freshMatches.forEach(item => known.add(item.workId));
        watch.lastCheckedAt = Date.now();
        watch.knownWorkIds = Array.from(known).slice(-250);
        freshMatches.forEach(item => {
          const id = `${watch.id}::${item.workId}`;
          if (matches.some(m => m.id === id)) return;
          matches.unshift({ id, watchId: watch.id, workId: item.workId, title: item.title, url: item.url, author: watch.author, fandom: watch.fandom, foundAt: Date.now() });
          newMatches += 1;
        });
        matches = sanitizeAuthorWatchMatches(matches);
      }
      const autoCheckSucceeded = !botBlocked;
      await new Promise(resolve => {
        const payload = {
          [AUTHOR_WATCHES_KEY]: watchesMap,
          [AUTHOR_WATCH_MATCHES_KEY]: matches
        };
        if (autoCheckSucceeded) payload[AUTHOR_WATCH_AUTO_DAY_KEY] = today;
        chrome.storage.local.set(payload, resolve);
      });
      if (newMatches > 0) {
        showMiniToast(`Author Watch found ${newMatches} new match${newMatches !== 1 ? 'es' : ''}.`);
        try {
          const payload = {
            type: 'basic',
          iconUrl: chrome.runtime.getURL('icons/fg-icon48.png'),
            title: 'AO3 Author Watch',
            message: `Found ${newMatches} new work${newMatches !== 1 ? 's' : ''} from a watched author.`
          };
          if (chrome.notifications && typeof chrome.notifications.create === 'function') {
            chrome.notifications.create('ao3-author-watch-' + Date.now(), payload);
          } else if (chrome.runtime && typeof chrome.runtime.sendMessage === 'function') {
            chrome.runtime.sendMessage({ type: 'FG_NOTIFY', id: 'ao3-author-watch-' + Date.now(), payload });
          }
        } catch (e) {}
      }
      else if (botBlocked) console.info(`AO3 Tracker: auto author watch check stopped early after ${checked} watch${checked !== 1 ? 'es' : ''}.`);
    } finally {
      chrome.storage.local.remove(AUTHOR_WATCH_AUTO_LOCK_KEY);
    }
  }

  function maybeInitDailyAuthorWatchAutoCheck() {
    setTimeout(() => {
      runDailyAuthorWatchAutoCheck().catch(err => console.warn('AO3 Tracker: author watch auto-check failed', err));
    }, 2500);
  }

  const AO3TrackerAuthorWatchController = { init, maybeInitDailyAuthorWatchAutoCheck };

  AO3TrackerAuthorWatchController.__test = {
    parseAo3FetchedHtml,
    fetchAuthorWatchFeed,
    runDailyAuthorWatchAutoCheck
  };

  global.AO3TrackerAuthorWatchController = AO3TrackerAuthorWatchController;
  if (typeof module !== 'undefined' && module.exports) module.exports = AO3TrackerAuthorWatchController;
})(typeof globalThis !== 'undefined' ? globalThis : this);
