(function (global) {
  'use strict';

  const Core = global.AO3TrackerBookmarkImportCore || {};
  const AuthorWatchCore = global.AO3TrackerAuthorWatchCore || {};

  function getImportState(context) {
    return typeof context.getBookmarkImportState === 'function'
      ? context.getBookmarkImportState()
      : context.bookmarkImportState;
  }

  function setImportState(context, next) {
    if (typeof context.setBookmarkImportState === 'function') context.setBookmarkImportState(next);
    return next;
  }

  function getSyncState(context) {
    return typeof context.getBookmarkSyncState === 'function'
      ? context.getBookmarkSyncState()
      : context.bookmarkSyncState || { knownWorkIds: [], lastFetchedAt: null };
  }

  function setSyncState(context, next) {
    if (typeof context.setBookmarkSyncState === 'function') context.setBookmarkSyncState(next);
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
    return typeof Core.normalizeBookmarkSyncState === 'function'
      ? Core.normalizeBookmarkSyncState(raw)
      : { knownWorkIds: [], lastFetchedAt: null };
  }

  function filterCandidates(candidates, query) {
    return typeof Core.filterBookmarkCandidates === 'function'
      ? Core.filterBookmarkCandidates(candidates, query)
      : (Array.isArray(candidates) ? candidates : []);
  }

  function parseBookmarkPageDocument(doc) {
    return typeof Core.parseBookmarkPageDocument === 'function'
      ? Core.parseBookmarkPageDocument(doc)
      : { entries: [], totalPages: null, hasNext: false };
  }

  function mergeKnownWorkIds(existingIds, fetchedIds, limit) {
    return typeof Core.mergeKnownBookmarkWorkIds === 'function'
      ? Core.mergeKnownBookmarkWorkIds(existingIds, fetchedIds, limit)
      : (Array.isArray(existingIds) ? existingIds : []);
  }

  function buildTrackedWorkFromBookmarkEntry(entry, options) {
    return typeof Core.buildTrackedWorkFromBookmarkEntry === 'function'
      ? Core.buildTrackedWorkFromBookmarkEntry(entry, options)
      : null;
  }

  function looksLikeBotBlock(html) {
    return typeof AuthorWatchCore.looksLikeAo3BotBlock === 'function'
      ? AuthorWatchCore.looksLikeAo3BotBlock(html)
      : false;
  }

  function normalizeBookmarksUrl(url) {
    return typeof AuthorWatchCore.normalizeAuthorWatchUrl === 'function'
      ? AuthorWatchCore.normalizeAuthorWatchUrl(url)
      : String(url || '').trim();
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
      status: 'completed',
      customCatId: '',
      bookmarksUrl: '',
      error: '',
      hasMore: false
    };
  }

  function openModal(context) {
    const state = { ...getImportState(context), open: true };
    setImportState(context, state);
    context.document.getElementById('bookmarkOverlay')?.classList.remove('hidden');
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
    context.document.getElementById('bookmarkOverlay')?.classList.add('hidden');
  }

  function resetState(context) {
    return setImportState(context, makeDefaultState(context));
  }

  function getFilteredBookmarkCandidates(context) {
    const state = getImportState(context);
    return filterCandidates(state.candidates || [], state.reviewFilter || '');
  }

  function populateCustomCategorySelect(context) {
    const select = context.document.getElementById('bookmarkImportCustomCat');
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
    const overlay = context.document.getElementById('bookmarkOverlay');
    if (!overlay) return;
    overlay.classList.toggle('hidden', !state.open);

    const sub = context.document.getElementById('bookmarkModalSub');
    const statusEl = context.document.getElementById('bookmarkFetchStatus');
    const progressFill = context.document.getElementById('bookmarkProgressFill');
    const progressMeta = context.document.getElementById('bookmarkProgressMeta');
    const progressWrap = context.document.getElementById('bookmarkProgressWrap');
    const review = context.document.getElementById('bookmarkReview');
    const summary = context.document.getElementById('bookmarkReviewSummary');
    const previewList = context.document.getElementById('bookmarkPreviewList');
    const cancelBtn = context.document.getElementById('bookmarkCancelFetchBtn');
    const resumeBtn = context.document.getElementById('bookmarkResumeFetchBtn');
    const importBtn = context.document.getElementById('bookmarkImportBtn');
    const quickMode = context.document.getElementById('bookmarkQuickMode');
    const statusSelect = context.document.getElementById('bookmarkImportStatus');
    const filterInput = context.document.getElementById('bookmarkReviewFilter');
    const filteredCandidates = getFilteredBookmarkCandidates(context);

    if (quickMode) quickMode.checked = !!state.quickMode;
    if (statusSelect) statusSelect.value = state.status;
    if (filterInput) filterInput.value = state.reviewFilter || '';

    if (sub) {
      sub.textContent = syncState.lastFetchedAt
        ? `Import untracked works from your logged-in AO3 bookmarks. Last fetched ${new Date(syncState.lastFetchedAt).toLocaleDateString('en-US')}.`
        : 'Import untracked works from your logged-in AO3 bookmarks.';
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
          : 'Fetching your bookmarks slowly and one page at a time.';
      } else if (state.error) {
        statusEl.textContent = state.error;
      } else if (state.completed) {
        statusEl.textContent = state.totalCandidates
          ? 'Fetch complete. Review the new bookmark works below before importing them.'
          : 'Fetch complete. No new bookmark works were found for import.';
      } else {
        statusEl.textContent = 'Fetch works from your AO3 bookmarks, then review them before importing.';
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
      importBtn.textContent = `Import ${filteredCandidates.length} Bookmark${filteredCandidates.length !== 1 ? 's' : ''}`;
    }

    populateCustomCategorySelect(context);

    if (summary) {
      summary.textContent = state.totalCandidates
        ? `${filteredCandidates.length} of ${state.totalCandidates} new bookmark work${state.totalCandidates !== 1 ? 's' : ''} ready to import${state.reviewFilter ? ' with the current filter.' : '.'}`
        : 'No new bookmark works are waiting to be imported.';
    }

    if (previewList) {
      if (!filteredCandidates.length) {
        previewList.innerHTML = '<div class="bookmark-preview-empty">No new bookmark works to preview.</div>';
      } else {
        previewList.innerHTML = filteredCandidates.slice(0, 15).map(item => `
          <div class="bookmark-preview-row">
            <div class="bookmark-preview-title">${escHtml(context, item.title)}</div>
            <div class="bookmark-preview-meta">${escHtml(context, item.author)}${item.fandoms && item.fandoms.length ? ` \u00b7 ${escHtml(context, item.fandoms.slice(0, 2).join(' \u00b7 '))}` : ''}</div>
          </div>
        `).join('') + (filteredCandidates.length > 15 ? `<div class="bookmark-preview-more">Showing 15 of ${filteredCandidates.length} matching bookmark works.</div>` : '');
      }
    }
  }

  function setupControls(context) {
    context.document.querySelectorAll('.bookmark-import-select select').forEach(select => {
      const wrap = select.closest('.bookmark-import-select');
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

    context.document.getElementById('fetchBookmarksBtn')?.addEventListener('click', async () => {
      openModal(context);
      await startFetch(context, false);
    });
    context.document.getElementById('bookmarkClose')?.addEventListener('click', () => closeModal(context));
    context.document.getElementById('bookmarkCloseBtn')?.addEventListener('click', () => closeModal(context));
    context.document.getElementById('bookmarkCancelFetchBtn')?.addEventListener('click', () => {
      setImportState(context, { ...getImportState(context), canceled: true });
      renderModal(context);
      context.showToast('Stopping fetch after the current page.');
    });
    context.document.getElementById('bookmarkResumeFetchBtn')?.addEventListener('click', async () => {
      context.showToast('Resuming bookmark fetch…');
      await startFetch(context, true);
    });
    context.document.getElementById('bookmarkImportBtn')?.addEventListener('click', () => importFetchedBookmarks(context));
    context.document.getElementById('bookmarkQuickMode')?.addEventListener('change', event => {
      setImportState(context, { ...getImportState(context), quickMode: !!event.target.checked });
    });
    context.document.getElementById('bookmarkImportStatus')?.addEventListener('change', event => {
      setImportState(context, { ...getImportState(context), status: event.target.value });
      renderModal(context);
    });
    context.document.getElementById('bookmarkImportCustomCat')?.addEventListener('change', event => {
      setImportState(context, { ...getImportState(context), customCatId: event.target.value });
      renderModal(context);
    });
    context.document.getElementById('bookmarkReviewFilter')?.addEventListener('input', event => {
      setImportState(context, { ...getImportState(context), reviewFilter: event.target.value || '' });
      renderModal(context);
    });
  }

  async function resolveOwnBookmarksUrl(context) {
    try {
      const response = await fetch('https://archiveofourown.org/', { credentials: 'include' });
      if (!response.ok) return '';
      const html = await response.text();
      const doc = parseAo3Html(context, html);
      if (!doc) return '';
      const bookmarksLink =
        doc.querySelector('#dashboard a[href*="/users/"][href*="/bookmarks"]') ||
        doc.querySelector('a[href*="/users/"][href*="/bookmarks"]');
      const bookmarksUrl = normalizeBookmarksUrl(bookmarksLink?.href || '');
      if (bookmarksUrl && typeof context.setBookmarkSyncAccount === 'function') {
        context.setBookmarkSyncAccount(extractAccountFromUrl(bookmarksUrl));
      }
      return bookmarksUrl;
    } catch (error) {
      return '';
    }
  }

  async function fetchBookmarkPageHtml(context, url) {
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) return '';
    const html = await response.text();
    if (looksLikeBotBlock(html)) return 'bot-blocked';
    return html;
  }

  async function fetchPageWithBackoff(context, url) {
    const BACKOFF_DELAYS_MS = [15000, 30000];
    let html = await fetchBookmarkPageHtml(context, url);
    if (html !== 'bot-blocked') return html;
    for (const delay of BACKOFF_DELAYS_MS) {
      await waitMs(context, delay);
      if (getImportState(context).canceled) return 'bot-blocked';
      html = await fetchBookmarkPageHtml(context, url);
      if (html !== 'bot-blocked') return html;
    }
    return 'bot-blocked';
  }

  function parseBookmarkPage(context, html) {
    const doc = parseAo3Html(context, html);
    if (!doc) return { entries: [], totalPages: null, hasNext: false };
    return parseBookmarkPageDocument(doc);
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
      if (!state.bookmarksUrl) {
        state = { ...getImportState(context), bookmarksUrl: await resolveOwnBookmarksUrl(context) };
        setImportState(context, state);
      }
      if (!state.bookmarksUrl) {
        throw new Error('Could not find your AO3 bookmarks. Make sure you are logged in on AO3.');
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
          ? state.bookmarksUrl
          : `${state.bookmarksUrl}${state.bookmarksUrl.includes('?') ? '&' : '?'}page=${page}`;
        const html = await fetchPageWithBackoff(context, pageUrl);
        if (html === 'bot-blocked') {
          botBlocked = true;
          keepGoing = false;
          break;
        }

        const parsed = parseBookmarkPage(context, html);
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
        } else if (state.quickMode && !pageHasNewCandidates && pageAllKnown && syncState.lastFetchedAt) {
          keepGoing = false;
        } else {
          page += 1;
          await waitMs(context, 1800);
          state = getImportState(context);
        }
      }

      state = getImportState(context);
      if (botBlocked) {
        state = { ...state, loading: false, completed: false, resumable: state.fetchedPages > 0, error: 'AO3 slowed the fetch down after retrying. Progress saved — click Resume to continue.' };
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
        await context.saveBookmarkSyncState();
      }
    } catch (error) {
      state = getImportState(context);
      setImportState(context, {
        ...state,
        loading: false,
        completed: false,
        resumable: state.fetchedPages > 0,
        error: error && error.message || 'Bookmark fetch failed.'
      });
    }

    renderModal(context);
  }

  async function importFetchedBookmarks(context) {
    const candidates = getFilteredBookmarkCandidates(context);
    if (!candidates.length) {
      context.showToast('No fetched bookmarks are waiting to be imported.');
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
      works[entry.id] = buildTrackedWorkFromBookmarkEntry(entry, {
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
      ? `Imported ${imported} bookmark work${imported !== 1 ? 's' : ''}.`
      : 'All fetched bookmarks are already tracked.');
  }

  const controller = {
    setupControls,
    openModal,
    closeModal,
    resetState,
    renderModal,
    populateCustomCategorySelect,
    getFilteredBookmarkCandidates,
    startFetch,
    resolveOwnBookmarksUrl,
    fetchBookmarkPageHtml,
    fetchPageWithBackoff,
    parseBookmarkPage,
    importFetchedBookmarks
  };

  global.AO3TrackerBookmarkImportPopupController = controller;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = controller;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
