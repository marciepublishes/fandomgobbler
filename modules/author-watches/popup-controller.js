(function (global) {
  'use strict';

  const Core = global.AO3TrackerAuthorWatchCore || {};
  const TrackedWorkCore = global.AO3TrackerTrackedWorkCore || {};

  const isOrphanAccountAuthor = TrackedWorkCore.isOrphanAccountAuthor || function (author, authorUrl) {
    const name = String(author || '').trim().toLowerCase();
    const url = String(authorUrl || '').toLowerCase();
    return name === 'orphan_account' || /\/users\/orphan_account(?:[/?#]|$)/.test(url);
  };

  function getCurrentWork(context) {
    return typeof context.getCurrentWork === 'function' ? context.getCurrentWork() : context.currentWork || null;
  }

  function getWorksMap(context) {
    return typeof context.getWorksMap === 'function' ? context.getWorksMap() : context.works || {};
  }

  function getAuthorWatches(context) {
    return typeof context.getAuthorWatches === 'function' ? context.getAuthorWatches() : context.authorWatches || {};
  }

  function setAuthorWatches(context, next) {
    if (typeof context.setAuthorWatches === 'function') context.setAuthorWatches(next);
  }

  function getAuthorWatchMatches(context) {
    return typeof context.getAuthorWatchMatches === 'function' ? context.getAuthorWatchMatches() : context.authorWatchMatches || [];
  }

  function setAuthorWatchMatches(context, next) {
    if (typeof context.setAuthorWatchMatches === 'function') context.setAuthorWatchMatches(next);
  }

  function escHtml(context, value) {
    return typeof context.escHtml === 'function' ? context.escHtml(value) : String(value || '');
  }

  function truncate(context, value, max) {
    if (typeof context.truncate === 'function') return context.truncate(value, max);
    const text = String(value || '');
    return text.length > max ? `${text.slice(0, Math.max(0, max - 1))}\u2026` : text;
  }

  function waitMs(context, ms) {
    return typeof context.waitMs === 'function'
      ? context.waitMs(ms)
      : new Promise(resolve => setTimeout(resolve, ms));
  }

  function parseAo3Html(context, html) {
    if (typeof context.parseAo3Html === 'function') return context.parseAo3Html(html);
    if (!context.document || !context.document.implementation) return null;
    const sanitized = typeof Core.sanitizeFetchedAo3Html === 'function'
      ? Core.sanitizeFetchedAo3Html(html)
      : String(html || '');
    const bodyMatch = sanitized.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const bodyMarkup = bodyMatch ? bodyMatch[1] : sanitized;
    const parsed = new context.window.DOMParser().parseFromString(bodyMarkup, 'text/html');
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
    const doc = context.document.implementation.createHTMLDocument('ao3-fetched');
    const base = doc.createElement('base');
    base.href = 'https://archiveofourown.org/';
    doc.head.appendChild(base);
    doc.body.append(...Array.from(parsed.body.childNodes).map(node => node.cloneNode(true)));
    return doc;
  }

  function normalizeAuthorUrl(url) {
    return typeof Core.normalizeAuthorWatchUrl === 'function'
      ? Core.normalizeAuthorWatchUrl(url)
      : String(url || '').trim();
  }

  function normalizeFandom(fandom) {
    return typeof Core.normalizeWatchFandom === 'function'
      ? Core.normalizeWatchFandom(fandom)
      : String(fandom || '').trim().toLowerCase();
  }

  function buildFeedUrl(authorUrl, page, fandomId) {
    return typeof Core.buildAuthorWatchFeedUrl === 'function'
      ? Core.buildAuthorWatchFeedUrl(authorUrl, page, fandomId)
      : `${normalizeAuthorUrl(authorUrl)}/works?page=${Math.max(1, Number(page) || 1)}&sort_column=created_at&sort_direction=desc`;
  }

  function buildOpenUrl(authorUrl, fandomId) {
    return typeof Core.buildAuthorWatchOpenUrl === 'function'
      ? Core.buildAuthorWatchOpenUrl(authorUrl, fandomId)
      : normalizeAuthorUrl(authorUrl);
  }

  function extractFandomId(doc, fandom) {
    return typeof Core.extractFandomIdFromDocument === 'function'
      ? Core.extractFandomIdFromDocument(doc, fandom)
      : '';
  }

  function sanitizeMatches(matches) {
    return typeof Core.sanitizeAuthorWatchMatches === 'function'
      ? Core.sanitizeAuthorWatchMatches(matches)
      : (Array.isArray(matches) ? matches : []);
  }

  function extractWorkId(url) {
    return typeof Core.extractWorkIdFromUrl === 'function'
      ? Core.extractWorkIdFromUrl(url)
      : null;
  }

  function looksLikeBotBlock(html) {
    return typeof Core.looksLikeAo3BotBlock === 'function'
      ? Core.looksLikeAo3BotBlock(html)
      : false;
  }

  async function resolveAuthorWatchFandomId(context, watch) {
    const authorUrl = normalizeAuthorUrl(watch && watch.authorUrl);
    if (!authorUrl || !(watch && watch.fandom)) return '';
    if (watch.fandomId) return String(watch.fandomId);
    try {
      const response = await fetch(buildFeedUrl(authorUrl, 1), { credentials: 'include' });
      if (!response.ok) return '';
      const html = await response.text();
      if (looksLikeBotBlock(html)) return '';
      const doc = parseAo3Html(context, html);
      return extractFandomId(doc, watch.fandom);
    } catch (error) {
      return '';
    }
  }

  async function openAuthorWatch(context, watchId) {
    const watches = { ...getAuthorWatches(context) };
    const watch = watches[watchId];
    if (!watch) return;
    let fandomId = watch.fandomId || '';
    if (!fandomId) {
      fandomId = await resolveAuthorWatchFandomId(context, watch);
      if (fandomId) {
        watches[watchId] = { ...watch, fandomId };
        setAuthorWatches(context, watches);
        await context.saveAuthorWatches();
      }
    }
    context.chrome.tabs.create({ url: fandomId ? buildOpenUrl(watch.authorUrl, fandomId) : normalizeAuthorUrl(watch.authorUrl) });
  }

  function findExistingAuthorWatch(context, authorUrl, fandom) {
    const normalizedUrl = normalizeAuthorUrl(authorUrl);
    const fandomKey = normalizeFandom(fandom);
    return Object.values(getAuthorWatches(context)).find(watch =>
      watch.authorUrl === normalizedUrl && watch.fandomKey === fandomKey
    ) || null;
  }

  function renderCurrentAuthorWatchTool(context) {
    const container = context.document && context.document.getElementById('authorWatchCurrent');
    if (!container) return;

    const currentWork = getCurrentWork(context);
    const author = String(currentWork && currentWork.author || '').trim();
    const authorUrl = normalizeAuthorUrl(currentWork && currentWork.authorUrl);
    const fandoms = Array.isArray(currentWork && currentWork.fandoms)
      ? [...new Set(currentWork.fandoms.map(fandom => String(fandom || '').trim()).filter(Boolean))]
      : [];

    if (!(currentWork && currentWork.workId)) {
      container.innerHTML = '<div class="author-watch-empty">Open an AO3 work page to create an author watch from that work.</div>';
      return;
    }
    if (!author || !authorUrl || author === 'Anonymous' || currentWork.isOrphaned === true || isOrphanAccountAuthor(author, authorUrl)) {
      container.innerHTML = '<div class="author-watch-empty">This work does not expose a usable author profile for author watches.</div>';
      return;
    }
    if (!fandoms.length) {
      container.innerHTML = '<div class="author-watch-empty">This work does not expose any fandom tags to watch yet.</div>';
      return;
    }

    container.innerHTML = `
      <div class="author-watch-current-card">
        <div class="author-watch-current-title">Watch ${escHtml(context, author)} in...</div>
        <div class="author-watch-current-sub">New works will only match when this author posts in one of these fandoms.</div>
        <div class="author-watch-fandom-grid">
          ${fandoms.map(fandom => {
            const existing = findExistingAuthorWatch(context, authorUrl, fandom);
            return `<button class="author-watch-fandom-btn${existing ? ' author-watch-fandom-btn-active' : ''}" data-watch-author-url="${escHtml(context, authorUrl)}" data-watch-author="${escHtml(context, author)}" data-watch-fandom="${escHtml(context, fandom)}" type="button">${existing ? 'Watching' : 'Watch'} ${escHtml(context, fandom)}</button>`;
          }).join('')}
        </div>
      </div>
    `;

    container.querySelectorAll('[data-watch-fandom]').forEach(button => {
      button.addEventListener('click', async () => {
        const fandom = button.dataset.watchFandom;
        const watchAuthor = button.dataset.watchAuthor;
        const watchAuthorUrl = button.dataset.watchAuthorUrl;
        if (!fandom || !watchAuthor || !watchAuthorUrl) return;
        if (findExistingAuthorWatch(context, watchAuthorUrl, fandom)) {
          context.showToast(`Already watching ${watchAuthor} in ${fandom}.`);
          return;
        }
        const watches = { ...getAuthorWatches(context) };
        const id = `watch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const nextWatch = {
          id,
          author: watchAuthor,
          authorUrl: normalizeAuthorUrl(watchAuthorUrl),
          fandom,
          fandomKey: normalizeFandom(fandom),
          knownWorkIds: currentWork && currentWork.workId ? [String(currentWork.workId)] : [],
          createdAt: Date.now(),
          lastCheckedAt: null,
          baselineReady: false
        };
        const fandomId = await resolveAuthorWatchFandomId(context, nextWatch);
        if (fandomId) nextWatch.fandomId = fandomId;
        watches[id] = nextWatch;
        setAuthorWatches(context, watches);
        await context.saveAuthorWatches();
        context.renderAll();
        context.showToast(`Watching ${watchAuthor} in ${fandom}.`);
      });
    });
  }

  function renderSavedAuthorWatches(context) {
    const container = context.document && context.document.getElementById('authorWatchList');
    const meta = context.document && context.document.getElementById('authorWatchMeta');
    if (!container || !meta) return;

    const watchList = Object.values(getAuthorWatches(context)).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    if (!watchList.length) {
      container.innerHTML = '';
      meta.textContent = 'No author watches yet.';
      return;
    }

    const lastCheckedValues = watchList.map(watch => Number(watch.lastCheckedAt) || 0).filter(Boolean);
    meta.textContent = !lastCheckedValues.length
      ? `${watchList.length} author watch${watchList.length !== 1 ? 'es' : ''}. First refresh sets a baseline without alerting old works.`
      : `${watchList.length} author watch${watchList.length !== 1 ? 'es' : ''}. Last refreshed ${new Date(Math.max.apply(null, lastCheckedValues)).toLocaleDateString('en-US')}.`;

    const matches = getAuthorWatchMatches(context);
    container.innerHTML = watchList.map(watch => {
      const matchCount = matches.filter(match => match.watchId === watch.id).length;
      const lastChecked = watch.lastCheckedAt ? `Checked ${new Date(watch.lastCheckedAt).toLocaleDateString('en-US')}` : 'Not refreshed yet';
      return `
        <div class="author-watch-row">
          <div class="author-watch-row-copy">
            <div class="author-watch-row-title">${escHtml(context, watch.author)} <span class="author-watch-row-fandom">in ${escHtml(context, watch.fandom)}</span></div>
            <div class="author-watch-row-meta">${lastChecked}${matchCount ? ` \u00b7 ${matchCount} saved match${matchCount !== 1 ? 'es' : ''}` : ''}</div>
          </div>
          <div class="author-watch-row-actions">
            <button class="author-watch-row-link" data-watch-open="${escHtml(context, watch.id)}" type="button">Open</button>
            <button class="author-watch-row-remove" data-watch-remove="${escHtml(context, watch.id)}" type="button">Remove</button>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('[data-watch-open]').forEach(button => {
      button.addEventListener('click', async () => {
        const watchId = button.dataset.watchOpen;
        if (!watchId) return;
        button.disabled = true;
        try {
          await openAuthorWatch(context, watchId);
        } finally {
          button.disabled = false;
        }
      });
    });

    container.querySelectorAll('[data-watch-remove]').forEach(button => {
      button.addEventListener('click', async () => {
        const watchId = button.dataset.watchRemove;
        const watches = { ...getAuthorWatches(context) };
        const watch = watches[watchId];
        if (!watchId || !watch) return;
        if (!context.window.confirm(`Stop watching ${watch.author} in ${watch.fandom}?`)) return;
        delete watches[watchId];
        setAuthorWatches(context, watches);
        setAuthorWatchMatches(context, getAuthorWatchMatches(context).filter(match => match.watchId !== watchId));
        await context.saveAuthorWatches();
        await context.saveAuthorWatchMatches();
        context.renderAll();
        context.showToast(`Stopped watching ${watch.author} in ${watch.fandom}.`);
      });
    });
  }

  function renderAuthorWatchMatches(context) {
    const container = context.document && context.document.getElementById('authorWatchMatches');
    if (!container) return;

    const matches = getAuthorWatchMatches(context);
    if (!matches.length) {
      container.innerHTML = '';
      return;
    }

    const works = getWorksMap(context);
    const latestMatches = matches.slice(0, 10);
    container.innerHTML = `
      <div class="author-watch-match-head">
        <span class="author-watch-match-title">Recent Matches</span><span class="author-watch-match-cap">Up to 100 stored</span>
        <button class="author-watch-clear" id="clearAuthorWatchMatchesBtn" type="button">Clear</button>
      </div>
      <div class="author-watch-match-list">
        ${latestMatches.map(match => {
          const tracked = !!works[match.workId];
          return `
            <div class="author-watch-match-row">
              <div class="author-watch-match-copy">
                <a class="author-watch-match-link" href="${escHtml(context, match.url)}" target="_blank" rel="noopener noreferrer">${escHtml(context, truncate(context, match.title, 48))}</a>
                <div class="author-watch-match-meta">${escHtml(context, match.author)} \u00b7 ${escHtml(context, match.fandom)} \u00b7 Found ${new Date(match.foundAt).toLocaleDateString('en-US')}${tracked ? ' \u00b7 Tracked' : ''}</div>
              </div>
              <button class="author-watch-match-dismiss" data-watch-match-dismiss="${escHtml(context, match.id)}" type="button">Dismiss</button>
            </div>
          `;
        }).join('')}
      </div>
    `;

    const clearButton = context.document.getElementById('clearAuthorWatchMatchesBtn');
    if (clearButton) {
      clearButton.addEventListener('click', async () => {
        setAuthorWatchMatches(context, []);
        await context.saveAuthorWatchMatches();
        context.renderAll();
        context.showToast('Author watch matches cleared.');
      });
    }

    container.querySelectorAll('[data-watch-match-dismiss]').forEach(button => {
      button.addEventListener('click', async () => {
        const matchId = button.dataset.watchMatchDismiss;
        setAuthorWatchMatches(context, getAuthorWatchMatches(context).filter(match => match.id !== matchId));
        await context.saveAuthorWatchMatches();
        context.renderAll();
      });
    });
  }

  function renderSection(context) {
    renderCurrentAuthorWatchTool(context);
    renderSavedAuthorWatches(context);
    renderAuthorWatchMatches(context);
  }

  function setupControls(context) {
    const refreshButton = context.document && context.document.getElementById('refreshAuthorWatchesBtn');
    refreshButton?.addEventListener('click', () => refreshAuthorWatches(context));
  }

  async function fetchAuthorWatchFeed(context, watch) {
    const authorUrl = normalizeAuthorUrl(watch && watch.authorUrl);
    if (!authorUrl || !(watch && watch.fandomKey)) return [];

    const seenIds = new Set();
    const matches = [];

    for (let page = 1; page <= 3; page += 1) {
      let html = '';
      try {
        const response = await fetch(buildFeedUrl(authorUrl, page, watch.fandomId), { credentials: 'include' });
        if (!response.ok) break;
        html = await response.text();
      } catch (error) {
        break;
      }
      if (looksLikeBotBlock(html)) return 'bot-blocked';
      const doc = parseAo3Html(context, html);
      if (!doc) break;
      if (!watch.fandomId) {
        const fandomId = extractFandomId(doc, watch.fandom);
        if (fandomId) watch.fandomId = fandomId;
      }
      const blurbs = Array.from(doc.querySelectorAll('li.work.blurb.group'));
      if (!blurbs.length) break;

      blurbs.forEach(blurb => {
        const workLink = blurb.querySelector('h4.heading a[href*="/works/"], h4 a[href*="/works/"]');
        const url = workLink && workLink.href || '';
        const workId = extractWorkId(url);
        if (!workId || seenIds.has(workId)) return;
        const fandomKeys = Array.from(blurb.querySelectorAll('.fandoms a.tag, .fandom.tags a.tag'))
          .map(el => normalizeFandom(el.textContent))
          .filter(Boolean);
        if (!fandomKeys.includes(watch.fandomKey)) return;
        seenIds.add(workId);
        matches.push({
          workId,
          title: String(workLink && workLink.textContent || 'Untitled').trim(),
          url: url || `https://archiveofourown.org/works/${workId}`
        });
      });

      if (blurbs.length < 20) break;
    }

    return matches;
  }

  async function refreshAuthorWatches(context) {
    const button = context.document && context.document.getElementById('refreshAuthorWatchesBtn');
    const watchList = Object.values(getAuthorWatches(context));
    if (!watchList.length) {
      context.showToast('No author watches to refresh yet.');
      return;
    }

    const previousLabel = button && button.textContent || 'Refresh Author Watch';
    if (button) {
      button.disabled = true;
      button.textContent = 'Refreshing...';
    }

    const REFRESH_DELAY_MS = 1600;
    let newMatches = 0;
    let baselined = 0;
    let checked = 0;
    let botBlocked = false;

    try {
      const watches = { ...getAuthorWatches(context) };
      let matches = getAuthorWatchMatches(context).slice();

      for (let i = 0; i < watchList.length; i += 1) {
        if (i > 0) await waitMs(context, REFRESH_DELAY_MS);
        const watch = watches[watchList[i].id];
        const result = await fetchAuthorWatchFeed(context, watch);
        if (result === 'bot-blocked') {
          botBlocked = true;
          break;
        }
        if (!Array.isArray(result)) continue;
        checked += 1;
        const known = new Set(Array.isArray(watch.knownWorkIds) ? watch.knownWorkIds : []);

        if (!watch.baselineReady) {
          result.forEach(item => known.add(item.workId));
          watch.baselineReady = true;
          watch.lastCheckedAt = Date.now();
          watch.knownWorkIds = Array.from(known).slice(-250);
          baselined += 1;
          continue;
        }

        const freshMatches = result.filter(item => !known.has(item.workId));
        freshMatches.forEach(item => known.add(item.workId));
        watch.lastCheckedAt = Date.now();
        watch.knownWorkIds = Array.from(known).slice(-250);

        freshMatches.forEach(item => {
          const id = `${watch.id}::${item.workId}`;
          if (matches.some(match => match.id === id)) return;
          matches.unshift({
            id,
            watchId: watch.id,
            workId: item.workId,
            title: item.title,
            url: item.url,
            author: watch.author,
            fandom: watch.fandom,
            foundAt: Date.now()
          });
          newMatches += 1;
        });
        matches = sanitizeMatches(matches);
      }

      setAuthorWatches(context, watches);
      setAuthorWatchMatches(context, matches);
      await context.saveAuthorWatches();
      await context.saveAuthorWatchMatches();
      context.renderAll();

      if (botBlocked) {
        context.showToast(`AO3 slowed the Author Watch refresh down. Checked ${checked} watch${checked !== 1 ? 'es' : ''} first.`);
      } else if (newMatches) {
        context.showToast(`Author Watch refreshed. ${newMatches} new match${newMatches !== 1 ? 'es' : ''} found.`);
        try {
          chrome.notifications.create('ao3-author-watch-popup-' + Date.now(), {
            type: 'basic',
          iconUrl: chrome.runtime.getURL('icons/fg-icon48.png'),
            title: 'AO3 Author Watch',
            message: `Found ${newMatches} new work${newMatches !== 1 ? 's' : ''} from a watched author.`
          });
        } catch (e) {}
      } else if (baselined) {
        context.showToast(`Author Watch refreshed. ${baselined} watch${baselined !== 1 ? 'es' : ''} set a baseline with no old-work alerts.`);
      } else {
        context.showToast('Author Watch refreshed. No new matches found.');
      }
    } catch (error) {
      console.error('Author watch refresh failed:', error);
      context.showToast('Author Watch refresh failed. Try again while logged into AO3.');
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = previousLabel;
      }
    }
  }

  const controller = {
    setupControls,
    renderSection,
    renderCurrentAuthorWatchTool,
    renderSavedAuthorWatches,
    renderAuthorWatchMatches,
    refreshAuthorWatches,
    fetchAuthorWatchFeed
  };

  global.AO3TrackerAuthorWatchPopupController = controller;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = controller;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
