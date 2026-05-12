(function (global) {
  'use strict';

  const Core = global.AO3TrackerMarkedForLaterImportCore || {};
  const AuthorWatchCore = global.AO3TrackerAuthorWatchCore || {};

  function getImportState(context) {
    return typeof context.getMflImportState === 'function'
      ? context.getMflImportState()
      : context.mflImportState;
  }

  function setImportState(context, next) {
    if (typeof context.setMflImportState === 'function') context.setMflImportState(next);
    return next;
  }

  function getSyncState(context) {
    return typeof context.getMflSyncState === 'function'
      ? context.getMflSyncState()
      : context.mflSyncState || { knownWorkIds: [], lastFetchedAt: null };
  }

  function setSyncState(context, next) {
    if (typeof context.setMflSyncState === 'function') context.setMflSyncState(next);
    return next;
  }

  function getWorksMap(context) {
    return typeof context.getWorksMap === 'function' ? context.getWorksMap() : context.works || {};
  }

  function waitMs(context, ms) {
    return typeof context.waitMs === 'function'
      ? context.waitMs(ms)
      : new Promise(resolve => setTimeout(resolve, ms));
  }

  function parseAo3Html(context, html) {
    return typeof context.parseAo3Html === 'function' ? context.parseAo3Html(html) : null;
  }

  function escHtml(context, value) {
    return typeof context.escHtml === 'function' ? context.escHtml(value) : String(value || '');
  }

  function normalizeSyncState(raw) {
    return typeof Core.normalizeMarkedForLaterSyncState === 'function'
      ? Core.normalizeMarkedForLaterSyncState(raw)
      : { knownWorkIds: [], lastFetchedAt: null };
  }

  function filterCandidates(candidates, query) {
    return typeof Core.filterMarkedForLaterCandidates === 'function'
      ? Core.filterMarkedForLaterCandidates(candidates, query)
      : (Array.isArray(candidates) ? candidates : []);
  }

  function parseMflPageDocument(doc) {
    return typeof Core.parseMarkedForLaterPageDocument === 'function'
      ? Core.parseMarkedForLaterPageDocument(doc)
      : { entries: [], totalPages: null, hasNext: false };
  }

  function mergeKnownWorkIds(existingIds, fetchedIds, limit) {
    return typeof Core.mergeKnownMarkedForLaterWorkIds === 'function'
      ? Core.mergeKnownMarkedForLaterWorkIds(existingIds, fetchedIds, limit)
      : (Array.isArray(existingIds) ? existingIds : []);
  }

  function buildTrackedWorkFromEntry(entry, options) {
    return typeof Core.buildTrackedWorkFromMarkedForLaterEntry === 'function'
      ? Core.buildTrackedWorkFromMarkedForLaterEntry(entry, options)
      : null;
  }

  function looksLikeBotBlock(html) {
    return typeof AuthorWatchCore.looksLikeAo3BotBlock === 'function'
      ? AuthorWatchCore.looksLikeAo3BotBlock(html)
      : false;
  }

  function normalizeMflUrl(url) {
    const raw = String(url || '').trim();
    if (!raw) return '';
    try {
      const parsed = new URL(raw, 'https://archiveofourown.org/');
      parsed.hash = '';
      parsed.pathname = parsed.pathname.replace(/\/+$/, '');
      if (!/\/readings$/i.test(parsed.pathname)) return parsed.href;
      parsed.searchParams.delete('page');
      parsed.searchParams.set('show', 'to-read');
      return parsed.href;
    } catch (error) {
      const noHash = raw.replace(/#.*$/, '');
      const noPage = noHash.replace(/([?&])page=\d+\b&?/i, '$1').replace(/[?&]$/, '');
      if (/show=to-read/i.test(noPage)) return noPage;
      return noPage + (noPage.includes('?') ? '&' : '?') + 'show=to-read';
    }
  }

  function extractAccountFromUrl(url) {
    const match = String(url || '').match(/archiveofourown\.org\/users\/([^/?#]+)/i);
    return match ? decodeURIComponent(match[1]).toLowerCase() : 'default';
  }

  function makeDefaultState(context) {
    const syncState = normalizeSyncState(getSyncState(context));
    return {
      open: true,
      loading: false,
      canceled: false,
      resumable: false,
      completed: false,
      quickMode: !!syncState.lastFetchedAt,
      fetchedPages: 0,
      totalPages: null,
      totalCandidates: 0,
      totalSeenWorks: 0,
      candidates: [],
      fetchedWorkIds: [],
      reviewFilter: '',
      status: 'want',
      customCatId: '',
      mflUrl: '',
      error: '',
      hasMore: false
    };
  }

  function openModal(context) {
    const state = { ...getImportState(context), open: true };
    setImportState(context, state);
    context.document.getElementById('mflOverlay')?.classList.remove('hidden');
    renderModal(context);
  }

  function closeModal(context) {
    const state = getImportState(context);
    if (state.loading) {
      setImportState(context, { ...state, canceled: true });
      renderModal(context);
      return;
    }
    setImportState(context, { ...state, open: false });
    context.document.getElementById('mflOverlay')?.classList.add('hidden');
  }

  function resetState(context) {
    return setImportState(context, makeDefaultState(context));
  }

  function getFilteredCandidates(context) {
    const state = getImportState(context);
    return filterCandidates(state.candidates || [], state.reviewFilter || '');
  }

  function populateCustomCategorySelect(context) {
    const select = context.document.getElementById('mflImportCustomCat');
    if (!select) return;
    const state = getImportState(context);
    const currentValue = state.customCatId;
    context.getCustomCats(cats => {
      const options = ['<option value="">None</option>']
        .concat(Object.values(cats).map(cat => `<option value="${escHtml(context, cat.id)}">${escHtml(context, cat.name)}</option>`));
      select.innerHTML = options.join('');
      select.value = currentValue && cats[currentValue] ? currentValue : '';
      setImportState(context, { ...getImportState(context), customCatId: select.value });
    });
  }

  function renderModal(context) {
    const state = getImportState(context);
    const syncState = normalizeSyncState(getSyncState(context));
    const overlay = context.document.getElementById('mflOverlay');
    if (!overlay) return;
    overlay.classList.toggle('hidden', !state.open);

    const sub = context.document.getElementById('mflModalSub');
    const statusEl = context.document.getElementById('mflFetchStatus');
    const progressFill = context.document.getElementById('mflProgressFill');
    const progressMeta = context.document.getElementById('mflProgressMeta');
    const progressWrap = context.document.getElementById('mflProgressWrap');
    const review = context.document.getElementById('mflReview');
    const summary = context.document.getElementById('mflReviewSummary');
    const previewList = context.document.getElementById('mflPreviewList');
    const cancelBtn = context.document.getElementById('mflCancelFetchBtn');
    const resumeBtn = context.document.getElementById('mflResumeFetchBtn');
    const importBtn = context.document.getElementById('mflImportBtn');
    const quickMode = context.document.getElementById('mflQuickMode');
    const statusSelect = context.document.getElementById('mflImportStatus');
    const filterInput = context.document.getElementById('mflReviewFilter');
    const filteredCandidates = getFilteredCandidates(context);

    if (quickMode) quickMode.checked = !!state.quickMode;
    if (statusSelect) statusSelect.value = state.status;
    if (filterInput) filterInput.value = state.reviewFilter || '';

    if (sub) {
      sub.textContent = syncState.lastFetchedAt
        ? `Use AO3's For Later on your phone like normal, then open the extension on your laptop and import them into your actual reading lists. Last fetched ${new Date(syncState.lastFetchedAt).toLocaleDateString('en-US')}.`
        : 'Use AO3\'s For Later on your phone like normal, then open the extension on your laptop and import them into your actual reading lists.';
    }

    const ratio = state.completed
      ? 1
      : state.totalPages
        ? Math.min(1, state.fetchedPages / state.totalPages)
        : (state.loading || state.resumable || state.fetchedPages > 0 ? 0.18 : 0);
    const shouldShowProgress = !!(state.loading || state.completed || state.resumable || state.fetchedPages > 0);
    if (progressWrap) progressWrap.classList.toggle('hidden', !shouldShowProgress);
    if (progressFill) progressFill.style.width = shouldShowProgress ? `${Math.max(state.completed ? 100 : 8, ratio * 100)}%` : '0%';

    if (statusEl) {
      if (state.loading) {
        statusEl.textContent = state.canceled
          ? 'Stopping after the current page.'
          : 'Fetching your Marked for Later list slowly and one page at a time.';
      } else if (state.error) {
        statusEl.textContent = state.error;
      } else if (state.completed) {
        statusEl.textContent = state.totalCandidates
          ? 'Fetch complete. Review the new works below before importing them.'
          : 'Fetch complete. No new works were found for import.';
      } else {
        statusEl.textContent = 'Fetch works from your AO3 Marked for Later list, then review them before importing.';
      }
    }

    if (progressMeta) {
      if (shouldShowProgress) {
        const totalPagesText = state.totalPages ? ` of ${state.totalPages}` : '';
        progressMeta.textContent = `Pages fetched: ${state.fetchedPages}${totalPagesText}. New untracked works found: ${state.totalCandidates}.`;
      } else {
        progressMeta.textContent = '';
      }
    }

    review?.classList.toggle('hidden', !state.completed && !state.resumable);
    cancelBtn?.classList.toggle('hidden', !state.loading);
    resumeBtn?.classList.toggle('hidden', !(state.resumable && !state.loading));

    const hasImportAssignment = !!(state.status || state.customCatId);
    if (importBtn) {
      importBtn.classList.toggle('hidden', !(state.completed || state.resumable));
      importBtn.disabled = !filteredCandidates.length || !hasImportAssignment || state.loading;
      importBtn.textContent = `Import ${filteredCandidates.length} Work${filteredCandidates.length !== 1 ? 's' : ''}`;
    }

    populateCustomCategorySelect(context);

    if (summary) {
      summary.textContent = state.totalCandidates
        ? `${filteredCandidates.length} of ${state.totalCandidates} new work${state.totalCandidates !== 1 ? 's' : ''} ready to import${state.reviewFilter ? ' with the current filter.' : '.'}`
        : 'No new works are waiting to be imported.';
    }

    if (previewList) {
      if (!filteredCandidates.length) {
        previewList.innerHTML = '<div class="bookmark-preview-empty">No new works to preview.</div>';
      } else {
        previewList.innerHTML = filteredCandidates.slice(0, 15).map(item => `
          <div class="bookmark-preview-row">
            <div class="bookmark-preview-title">${escHtml(context, item.title)}</div>
            <div class="bookmark-preview-meta">${escHtml(context, item.author)}${item.fandoms && item.fandoms.length ? ` \u00b7 ${escHtml(context, item.fandoms.slice(0, 2).join(' \u00b7 '))}` : ''}</div>
          </div>
        `).join('') + (filteredCandidates.length > 15 ? `<div class="bookmark-preview-more">Showing 15 of ${filteredCandidates.length} matching works.</div>` : '');
      }
    }
  }

  function setupControls(context) {
    context.document.querySelectorAll('.mfl-import-select select').forEach(select => {
      const wrap = select.closest('.mfl-import-select');
      if (!wrap) return;
      const closeWrap = () => wrap.classList.remove('is-open');
      const toggleWrap = () => wrap.classList.toggle('is-open');
      const openWrap = () => wrap.classList.add('is-open');
      select.addEventListener('mousedown', toggleWrap);
      select.addEventListener('keydown', event => {
        if (event.key === ' ' || event.key === 'Enter' || event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          openWrap();
        } else if (event.key === 'Escape' || event.key === 'Tab') {
          closeWrap();
        }
      });
      select.addEventListener('change', closeWrap);
      select.addEventListener('blur', closeWrap);
    });

    context.document.getElementById('fetchMarkedForLaterBtn')?.addEventListener('click', async () => {
      openModal(context);
      await startFetch(context, false);
    });
    context.document.getElementById('mflClose')?.addEventListener('click', () => closeModal(context));
    context.document.getElementById('mflCloseBtn')?.addEventListener('click', () => closeModal(context));
    context.document.getElementById('mflCancelFetchBtn')?.addEventListener('click', () => {
      setImportState(context, { ...getImportState(context), canceled: true });
      renderModal(context);
      context.showToast('Stopping fetch after the current page.');
    });
    context.document.getElementById('mflResumeFetchBtn')?.addEventListener('click', async () => {
      context.showToast('Resuming For Later fetch\u2026');
      await startFetch(context, true);
    });
    context.document.getElementById('mflImportBtn')?.addEventListener('click', () => importFetchedWorks(context));
    context.document.getElementById('mflQuickMode')?.addEventListener('change', event => {
      setImportState(context, { ...getImportState(context), quickMode: !!event.target.checked });
    });
    context.document.getElementById('mflImportStatus')?.addEventListener('change', event => {
      setImportState(context, { ...getImportState(context), status: event.target.value });
      renderModal(context);
    });
    context.document.getElementById('mflImportCustomCat')?.addEventListener('change', event => {
      setImportState(context, { ...getImportState(context), customCatId: event.target.value });
      renderModal(context);
    });
    context.document.getElementById('mflReviewFilter')?.addEventListener('input', event => {
      setImportState(context, { ...getImportState(context), reviewFilter: event.target.value || '' });
      renderModal(context);
    });
  }

  // AO3's "Marked for Later" list lives at /users/[username]/readings?show=to-read.
  // We resolve it by: (1) looking for a readings link in the logged-in page nav,
  // (2) falling back to extracting the username from any /users/ link and constructing the URL.
  async function resolveOwnMarkedForLaterUrl(context) {
    try {
      const response = await fetch('https://archiveofourown.org/', { credentials: 'include' });
      if (!response.ok) return '';
      const html = await response.text();
      const doc = parseAo3Html(context, html);
      if (!doc) return '';

      // Primary: find a direct link to the readings/to-read page
      const readingsLink =
        doc.querySelector('a[href*="/readings"][href*="to-read"]') ||
        doc.querySelector('a[href*="/readings"]');
      if (readingsLink?.href) {
        const href = normalizeMflUrl(readingsLink.href);
        if (typeof context.setMflSyncAccount === 'function') {
          context.setMflSyncAccount(extractAccountFromUrl(href));
        }
        // Ensure the show=to-read param is present
        if (href.includes('show=to-read')) return href;
        return href + (href.includes('?') ? '&' : '?') + 'show=to-read';
      }

      // Fallback: extract username from any /users/ link in the page header/nav
      const userLink =
        doc.querySelector('#header a[href*="/users/"]') ||
        doc.querySelector('a[href*="/users/"]');
      if (userLink?.href) {
        const match = String(userLink.href).match(/archiveofourown\.org\/users\/([^/?#]+)/);
        if (match) {
          if (typeof context.setMflSyncAccount === 'function') {
            context.setMflSyncAccount(decodeURIComponent(match[1]).toLowerCase());
          }
          return `https://archiveofourown.org/users/${match[1]}/readings?show=to-read`;
        }
      }

      return '';
    } catch (error) {
      return '';
    }
  }

  async function fetchMflPageHtml(context, url) {
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) return '';
    const html = await response.text();
    if (looksLikeBotBlock(html)) return 'bot-blocked';
    return html;
  }

  async function fetchPageWithBackoff(context, url) {
    const BACKOFF_DELAYS_MS = [15000, 30000];
    let html = await fetchMflPageHtml(context, url);
    if (html !== 'bot-blocked') return html;
    for (const delay of BACKOFF_DELAYS_MS) {
      await waitMs(context, delay);
      if (getImportState(context).canceled) return 'bot-blocked';
      html = await fetchMflPageHtml(context, url);
      if (html !== 'bot-blocked') return html;
    }
    return 'bot-blocked';
  }

  function parseMflPage(context, html) {
    const doc = parseAo3Html(context, html);
    if (!doc) return { entries: [], totalPages: null, hasNext: false };
    return parseMflPageDocument(doc);
  }

  async function countPendingUntrackedWorks(context, initialUrl) {
    let mflUrl = normalizeMflUrl(initialUrl || '');
    if (!mflUrl) mflUrl = await resolveOwnMarkedForLaterUrl(context);
    if (!mflUrl) return { count: 0, mflUrl: '' };

    const trackedIds = new Set(Object.keys(getWorksMap(context)));
    const seenIds = new Set();
    let count = 0;
    let page = 1;

    while (true) {
      const pageUrl = page === 1
        ? mflUrl
        : `${mflUrl}${mflUrl.includes('?') ? '&' : '?'}page=${page}`;
      const html = await fetchPageWithBackoff(context, pageUrl);
      if (html === 'bot-blocked') {
        throw new Error('Marked for Later sweep was blocked by AO3.');
      }

      const parsed = parseMflPage(context, html);
      if (!parsed.entries.length) break;

      parsed.entries.forEach(entry => {
        if (!entry || !entry.id || seenIds.has(entry.id)) return;
        seenIds.add(entry.id);
        if (!trackedIds.has(entry.id)) count += 1;
      });

      if (!parsed.hasNext) break;
      page += 1;
      await waitMs(context, 250);
    }

    return { count, mflUrl };
  }

  async function startFetch(context, resume) {
    if (!resume) resetState(context);
    openModal(context);

    let state = {
      ...getImportState(context),
      loading: true,
      canceled: false,
      error: '',
      resumable: false
    };
    setImportState(context, state);
    renderModal(context);

    try {
      if (!state.mflUrl) {
        state = { ...getImportState(context), mflUrl: await resolveOwnMarkedForLaterUrl(context) };
        setImportState(context, state);
      }
      if (!state.mflUrl) {
        throw new Error('Could not find your AO3 reading list (/readings?show=to-read). Make sure you are logged in on AO3.');
      }

      const knownTrackedIds = new Set(Object.keys(getWorksMap(context)));
      const seenFetchedIds = new Set(state.fetchedWorkIds || []);
      const syncState = normalizeSyncState(getSyncState(context));
      const knownOldIds = new Set(syncState.knownWorkIds || []);
      let page = state.fetchedPages + 1;
      let keepGoing = true;
      let botBlocked = false;

      while (keepGoing && !state.canceled) {
        const pageUrl = page === 1
          ? state.mflUrl
          : `${state.mflUrl}${state.mflUrl.includes('?') ? '&' : '?'}page=${page}`;
        const html = await fetchPageWithBackoff(context, pageUrl);
        if (html === 'bot-blocked') {
          botBlocked = true;
          keepGoing = false;
          break;
        }

        const parsed = parseMflPage(context, html);
        if (!parsed.entries.length) break;

        state = {
          ...getImportState(context),
          totalPages: parsed.totalPages || getImportState(context).totalPages || null,
          fetchedPages: page,
          totalSeenWorks: (getImportState(context).totalSeenWorks || 0) + parsed.entries.length
        };

        let pageHasNewCandidates = false;
        let pageAllKnown = true;
        const candidates = state.candidates.slice();
        const fetchedWorkIds = state.fetchedWorkIds.slice();

        parsed.entries.forEach(entry => {
          if (!entry || !entry.id) return;
          if (!seenFetchedIds.has(entry.id)) {
            seenFetchedIds.add(entry.id);
            fetchedWorkIds.push(entry.id);
          }
          if (!knownOldIds.has(entry.id)) pageAllKnown = false;
          if (knownTrackedIds.has(entry.id)) return;
          if (candidates.some(existing => existing.id === entry.id)) return;
          candidates.push(entry);
          pageHasNewCandidates = true;
        });

        state = {
          ...state,
          candidates,
          fetchedWorkIds,
          totalCandidates: candidates.length,
          hasMore: !!parsed.hasNext
        };
        setImportState(context, state);
        renderModal(context);

        if (!parsed.hasNext) {
          keepGoing = false;
        } else {
          page += 1;
          await waitMs(context, 1800);
          state = getImportState(context);
        }
      }

      state = getImportState(context);
      if (botBlocked) {
        state = { ...state, loading: false, completed: false, resumable: state.fetchedPages > 0, error: 'AO3 slowed the fetch down after retrying. Progress saved \u2014 click Resume to continue.' };
      } else {
        const completed = !state.canceled;
        const resumable = state.canceled && state.hasMore;
        state = { ...state, loading: false, completed, resumable };
      }
      setImportState(context, state);

      if (!state.canceled && !botBlocked) {
        const nextSyncState = {
          ...syncState,
          knownWorkIds: mergeKnownWorkIds(syncState.knownWorkIds || [], state.fetchedWorkIds || [], 5000),
          lastFetchedAt: Date.now()
        };
        setSyncState(context, nextSyncState);
        await context.saveMflSyncState();
      }
    } catch (error) {
      state = getImportState(context);
      setImportState(context, {
        ...state,
        loading: false,
        completed: false,
        resumable: state.fetchedPages > 0,
        error: error && error.message || 'For Later fetch failed.'
      });
    }

    renderModal(context);
  }

  async function importFetchedWorks(context) {
    const candidates = getFilteredCandidates(context);
    if (!candidates.length) {
      context.showToast('No fetched works are waiting to be imported.');
      return;
    }

    const state = getImportState(context);
    if (!state.status && !state.customCatId) {
      context.showToast('Choose a default category or custom category before importing.');
      return;
    }

    let imported = 0;
    const selectedStatus = state.status;
    const selectedCustomCat = state.customCatId;
    const works = getWorksMap(context);

    candidates.forEach(entry => {
      if (works[entry.id]) return;
      works[entry.id] = buildTrackedWorkFromEntry(entry, {
        selectedStatus,
        selectedCustomCat,
        now: Date.now()
      });
      imported += 1;
    });

    await context.saveWorks();
    context.renderAll();
    closeModal(context);
    context.showToast(imported > 0
      ? `Imported ${imported} For Later work${imported !== 1 ? 's' : ''}.`
      : 'All fetched works are already tracked.');
  }

  const controller = {
    setupControls,
    openModal,
    closeModal,
    resetState,
    renderModal,
    populateCustomCategorySelect,
    getFilteredCandidates,
    startFetch,
    normalizeMflUrl,
    resolveOwnMarkedForLaterUrl,
    fetchMflPageHtml,
    fetchPageWithBackoff,
    parseMflPage,
    countPendingUntrackedWorks,
    importFetchedWorks
  };

  global.AO3TrackerMarkedForLaterImportPopupController = controller;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = controller;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
