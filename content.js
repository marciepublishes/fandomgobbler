// --- FandomGobbler. - Content Script (orchestrator) ----------------------
(function () {
  'use strict';

  // ── Module references ──────────────────────────────────────────────────────
  const {
    AO3_PAGE_THEME_KEY, EXTENSION_THEME_KEY, THEME_SYNC_KEY, AO3_PAGE_DARK_KEY,
    AO3_DARK_LS_KEY, LIBRARY_SORT_KEY, AO3_FLOATING_KEY, FAB_POSITION_KEY,
    LAST_EXPORT_KEY, WORK_META_COLLAPSE_KEY, EXPORT_BANNER_DISMISS_SESSION,
    AUTHOR_WATCHES_KEY, AUTHOR_WATCH_MATCHES_KEY,
    AUTHOR_WATCH_AUTO_DAY_KEY, AUTHOR_WATCH_AUTO_LOCK_KEY,
    ONBOARDING_DISMISSED_KEY, MFL_PENDING_COUNT_KEY,
    HIDDEN_RULES_KEY, HIDDEN_RULE_PREFS_KEY,
  } = globalThis.AO3TrackerStorageKeys;

  const Utils                = globalThis.AO3TrackerUtils || {};
  const Toast                = globalThis.AO3TrackerToast || {};
  const Storage              = globalThis.AO3TrackerStorage || {};
  const UIUtils              = globalThis.AO3TrackerUIUtils || {};
  const AuthorWatchCore      = globalThis.AO3TrackerAuthorWatchCore || {};
  const TrackedWorkCore      = globalThis.AO3TrackerTrackedWorkCore || {};
  const Ao3PageCore          = globalThis.AO3TrackerAo3PageCore || {};
  const SidebarCore          = globalThis.AO3TrackerSidebarCore || {};
  const SidebarController    = globalThis.AO3TrackerSidebarController || {};
  const SidebarCard          = globalThis.AO3TrackerSidebarCard || {};
  const HiddenRulesCore      = globalThis.AO3TrackerHiddenRulesCore || {};
  const ListingBadgeCore     = globalThis.AO3TrackerListingBadgeCore || {};
  const ListingBadgeController = globalThis.AO3TrackerListingBadgeController || {};
  const WorkPageController   = globalThis.AO3TrackerWorkPageController || {};
  const PageThemeController  = globalThis.AO3TrackerPageThemeController || {};
  const NotesModal           = globalThis.AO3TrackerNotesModal || {};
  const CatModal             = globalThis.AO3TrackerCatModal || {};
  const ExportImport         = globalThis.AO3TrackerExportImport || {};
  const AvailabilityChecker  = globalThis.AO3TrackerAvailabilityChecker || {};
  const ChapterProgress      = globalThis.AO3TrackerChapterProgress || {};
  const TrackButton          = globalThis.AO3TrackerTrackButton || {};
  const FloatingUI           = globalThis.AO3TrackerFloatingUI || {};
  const AuthorWatchController = globalThis.AO3TrackerAuthorWatchController || {};
  const CustomCursorCore     = globalThis.FGCustomCursorCore || {};

  // ── Unwrap frequently-used helpers ────────────────────────────────────────
  const BUILTIN_STATUSES = TrackedWorkCore.BUILTIN_STATUSES || ['want', 'progress', 'completed', 'rereading', 'onhold', 'dnf', 'lost'];

  const normalizeStatusValue      = TrackedWorkCore.normalizeStatusValue      || (s => BUILTIN_STATUSES.includes(s) ? s : '');
  const nextFinishedAt            = TrackedWorkCore.nextFinishedAt            || ((os, ns, ef) => ns === 'completed' && os !== 'completed' ? Date.now() : ef || null);
  const hasCustomCategories       = TrackedWorkCore.hasCustomCategories       || (w => Array.isArray(w?.customCats) && w.customCats.length > 0);
  const pruneTrackedWorkIfInvalid = TrackedWorkCore.pruneTrackedWorkIfInvalid || (() => false);
  const getRestoreStatus          = TrackedWorkCore.getRestoreStatus          || (w => hasCustomCategories(w) ? '' : 'want');
  const sanitizeTrackedWorksMap   = TrackedWorkCore.sanitizeTrackedWorksMap   || (i => ({ works: i || {}, changed: false }));

  const extractWorkInfoFromDocument  = Ao3PageCore.extractWorkInfoFromDocument;
  const extractTrackedWorkFromBlurb  = Ao3PageCore.extractTrackedWorkFromBlurb;
  const extractWorkIdFromAo3Url      = Ao3PageCore.extractWorkIdFromAo3Url || (url => ((String(url || '').match(/archiveofourown\.org\/(?:collections\/[^/]+\/)?works\/(\d+)/) || [])[1] || null));
  const isAo3WorkPageUrl             = Ao3PageCore.isAo3WorkPageUrl || (url => !!extractWorkIdFromAo3Url(url));

  const waitMs              = Utils.waitMs              || (ms => new Promise(r => setTimeout(r, ms)));
  const currentLocalDayStamp = Utils.currentLocalDayStamp || (() => new Date().toISOString().slice(0, 10).replace(/-/g, '-'));
  const esc                 = Utils.esc                 || (s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'));
  const trunc               = Utils.trunc               || ((s, n) => s.length > n ? s.slice(0,n-1)+'…' : s);
  const labelFor            = Utils.labelFor            || (s => ({want:'For Later',progress:'Reading',completed:'Completed',rereading:'Re-reading',onhold:'On Hold',dnf:'Did Not Finish',lost:'Deleted'}[s]||''));
  const trackedLabelFor     = Utils.trackedLabelFor     || (s => labelFor(s) || 'Tracked');
  const formatWorkWordCountDisplay = Utils.formatWorkWordCountDisplay || (wc => { const n = Number(wc); return Number.isFinite(n) && n > 0 ? n.toLocaleString() + ' words' : '—'; });

  const showMiniToast       = Toast.showMiniToast       || (() => {});
  const showMiniUndoToast   = Toast.showMiniUndoToast   || ((msg, fn) => { showMiniToast(msg); });
  const getWorks            = Storage.getWorks          || (() => {});
  const setWorks            = Storage.setWorks          || (() => {});
  const getCustomCats       = Storage.getCustomCats     || (() => {});
  const setCustomCats       = Storage.setCustomCats     || (() => {});
  const genCatId            = Storage.genCatId          || (() => 'cat-' + Date.now());
  const getLibrarySortSetting = Storage.getLibrarySortSetting || (cb => cb('recently-added'));
  const stampExport         = Storage.stampExport       || (() => {});
  const checkExportReminder = Storage.checkExportReminder || (() => {});

  function getHiddenRules(cb) {
    try {
      chrome.storage.local.get(HIDDEN_RULES_KEY, data => {
        const raw = data && data[HIDDEN_RULES_KEY];
        cb(typeof HiddenRulesCore.sanitizeRulesMap === 'function' ? HiddenRulesCore.sanitizeRulesMap(raw || {}) : (raw || {}));
      });
    } catch (e) {
      cb({});
    }
  }

  function setHiddenRules(nextRules, cb) {
    const payload = typeof HiddenRulesCore.sanitizeRulesMap === 'function'
      ? HiddenRulesCore.sanitizeRulesMap(nextRules || {})
      : (nextRules || {});
    try {
      chrome.storage.local.set({ [HIDDEN_RULES_KEY]: payload }, () => {
        if (typeof cb === 'function') cb();
      });
    } catch (e) {
      if (typeof cb === 'function') cb();
    }
  }

  function getHiddenRulePrefs(cb) {
    try {
      chrome.storage.local.get(HIDDEN_RULE_PREFS_KEY, data => {
        const raw = data && data[HIDDEN_RULE_PREFS_KEY];
        cb(typeof HiddenRulesCore.sanitizePrefs === 'function' ? HiddenRulesCore.sanitizePrefs(raw || {}) : (raw || { showReasons: true, crossoverThreshold: 3 }));
      });
    } catch (e) {
      cb({ showReasons: true, crossoverThreshold: 3 });
    }
  }

  function setHiddenRulePrefs(nextPrefs, cb) {
    const payload = typeof HiddenRulesCore.sanitizePrefs === 'function'
      ? HiddenRulesCore.sanitizePrefs(nextPrefs || {})
      : (nextPrefs || { showReasons: true, crossoverThreshold: 3 });
    try {
      chrome.storage.local.set({ [HIDDEN_RULE_PREFS_KEY]: payload }, () => {
        if (typeof cb === 'function') cb();
      });
    } catch (e) {
      if (typeof cb === 'function') cb();
    }
  }

  const applyRereadingChapterResetIfNeeded = UIUtils.applyRereadingChapterResetIfNeeded || ((os, ns, w, done) => { if (done) done(); });
  const showInlineConfirm   = UIUtils.showInlineConfirm || (() => {});
  const confirmRemoveFromTracker = UIUtils.confirmRemoveFromTracker || (() => window.confirm('Remove this work from tracking?'));

  const openNotesModal  = NotesModal.openNotesModal  || (() => {});
  const closeNotesModal = NotesModal.closeNotesModal || (() => {});
  const saveNotesModal  = NotesModal.saveNotesModal  || (() => {});
  const updateStars     = NotesModal.updateStars     || (() => {});

  const openCatModal    = CatModal.openCatModal    || (() => {});
  const closeCatModal   = CatModal.closeCatModal   || (() => {});
  const saveCatModal    = CatModal.saveCatModal    || (() => {});
  const deleteCat       = CatModal.deleteCat       || (() => {});
  const updateCatSwatch = CatModal.updateCatSwatch || (() => {});
  const renderCustomTabs      = CatModal.renderCustomTabs      || (() => {});
  const updateCustomTabCounts = CatModal.updateCustomTabCounts || (() => {});
  const CAT_PRESETS     = CatModal.CAT_PRESETS || ['#7c3aed','#db2777','#dc2626','#d97706','#16a34a','#0891b2','#2563eb','#4f46e5','#d946ef','#6b7280'];

  const aotDoExport = ExportImport.aotDoExport || (() => {});
  const aotDoImport = ExportImport.aotDoImport || (() => {});

  const applyTrackerThemeToSidebar = typeof PageThemeController.applyTrackerThemeToSidebar === 'function'
    ? (...a) => PageThemeController.applyTrackerThemeToSidebar(...a)
    : () => {};
  const nextAo3trackerTheme = typeof PageThemeController.nextAo3trackerTheme === 'function'
    ? (...a) => PageThemeController.nextAo3trackerTheme(...a)
    : cur => ({ light: 'sol-light', 'sol-light': 'dark', dark: 'light' }[cur] || 'light');
  const syncAo3trackerThemeToPage = typeof PageThemeController.syncAo3trackerThemeToPage === 'function'
    ? (...a) => PageThemeController.syncAo3trackerThemeToPage(...a)
    : () => {};
  const updateSidebarSortIndicator = typeof SidebarCore.buildSidebarSortIndicatorText === 'function'
    ? (visible, sortKey) => {
        const el = document.getElementById('aot-sort-indicator');
        if (!el) return;
        const text = SidebarCore.buildSidebarSortIndicatorText(visible, sortKey);
        if (!text) { el.classList.add('aot-hidden'); el.textContent = ''; return; }
        el.classList.remove('aot-hidden');
        el.textContent = text;
      }
    : () => {};
  const emptyMsg = typeof SidebarCore.emptyMsg === 'function' ? SidebarCore.emptyMsg : s =>
    ({ all:'No works tracked yet. Open any AO3 story and click the floating button to start tracking.',want:'No works yet.',progress:'Nothing reading yet.',completed:'No completed reads yet.',rereading:'Nothing re-reading yet.',onhold:'Nothing on hold.',dnf:'No DNFs yet.',lost:'No deleted works detected.' }[s] || '');

  // ── Shared state ───────────────────────────────────────────────────────────
  let sidebarOpen        = false;
  let sidebarOnboardingDismissed = false;
  let activeTab          = 'all';
  let searchQuery        = '';
  let sidebarRandomOrder = [];
  let _savedPageScrollY  = 0;
  let _refreshRequired   = false;

  const flippedSidebarCards  = new Set();
  const expandedSummaryCards = new Set();

  // ── Thin wrappers ──────────────────────────────────────────────────────────
  function openSidebar()   { SidebarController.open(); }
  function closeSidebar()  { SidebarController.close(); }
  function renderSidebar() { SidebarController.render(); }
  function toggleSidebar() { sidebarOpen ? closeSidebar() : openSidebar(); }
  function injectSearchBadges() { ListingBadgeController.injectSearchBadges?.(); }

  function extensionContextAvailable() {
    try {
      return !!(chrome.runtime && chrome.runtime.id && chrome.storage && chrome.storage.local);
    } catch (e) {
      return false;
    }
  }

  function markRefreshRequired() {
    if (_refreshRequired) return;
    _refreshRequired = true;
    try { Toast.setRefreshRequired?.(true); } catch (e) {}
    try { showMiniToast('Please refresh the page to use the tracker.'); } catch (e) {}
    try {
      const fab = document.getElementById('ao3tracker-fab');
      if (fab) {
        fab.disabled = true;
        fab.title = 'Reload this AO3 tab to reopen FandomGobbler.';
      }
    } catch (e) {}
  }

  function extractWorkInfo() {
    return typeof extractWorkInfoFromDocument === 'function'
      ? extractWorkInfoFromDocument(document, window.location.href, document.title)
      : null;
  }

  function refreshWorkPageMetaRow() {
    if (typeof WorkPageController.refreshWorkPageMetaRow !== 'function') return;
    WorkPageController.refreshWorkPageMetaRow({ window, document, getWorks, getCustomCats, normalizeStatusValue, esc });
  }

  function injectWorkPageMetaRow() {
    if (typeof WorkPageController.injectWorkPageMetaRow !== 'function') return;
    WorkPageController.injectWorkPageMetaRow({ window, document, chrome, WORK_META_COLLAPSE_KEY, refreshWorkPageMetaRow });
  }

  function initCurrentBar() {
    if (typeof WorkPageController.initCurrentBar !== 'function') return;
    WorkPageController.initCurrentBar({
      window, document,
      extractWorkInfo, getWorks, getCustomCats, setWorks,
      trackedLabelFor, labelFor, normalizeStatusValue, nextFinishedAt,
      applyRereadingChapterResetIfNeeded, pruneTrackedWorkIfInvalid,
      showMiniToast, renderSidebar, syncWorkPageTrackingControls,
      confirmRemoveFromTracker, esc,
      setActiveTab: next => { activeTab = next; }
    });
  }

  function syncWorkPageTrackingControls() {
    if (typeof TrackButton.syncWorkPageTrackingControls === 'function') TrackButton.syncWorkPageTrackingControls();
    else {
      const btn = document.getElementById('ao3tracker-btn');
      if (btn) btn.remove();
    }
    refreshWorkPageMetaRow();
  }

  // ── Content-specific: subscription sync watcher ───────────────────────────
  function syncTrackedWorkStatsFromPage() {
    const info = extractWorkInfo();
    if (!info) return;
    getWorks(ws => {
      const w = ws[info.workId];
      if (!w) return;
      let changed = false;
      const sync = (key, val) => { if (val != null && w[key] !== val) { w[key] = val; changed = true; } };
      if (info.canSyncIdentity) {
        sync('title', info.title);
        sync('author', info.author);
        sync('authorUrl', info.authorUrl);
      }
      sync('summary', info.summary);
      sync('url', info.url);
      sync('relationship', info.relationship);
      sync('seriesTitle', info.seriesTitle);
      sync('seriesUrl', info.seriesUrl);
      sync('seriesPosition', info.seriesPosition);
      if (info.wordCount > 0) sync('wordCount', info.wordCount);
      sync('kudosCount', info.kudosCount);
      sync('bookmarksCount', info.bookmarksCount);
      sync('hitsCount', info.hitsCount);
      sync('updatedAt', info.updatedAt);
      sync('completedAt', info.completedAt);
      sync('publishedAt', info.publishedAt);
      sync('inferredCompletedAt', info.inferredCompletedAt);
      if (info.subscribedAtAo3 !== null) sync('subscribedAtAo3', info.subscribedAtAo3);
      if (changed) setWorks(ws);
    });
  }

  function isCurrentWorkSubscriptionTarget(node) {
    try {
      const workId = extractWorkIdFromAo3Url(window.location.href);
      if (!workId || !node) return false;
      const form = node.closest?.('form[action*="subscriptions"]');
      if (!form) return false;
      const action = form.getAttribute('action') || '';
      if (action.includes(`/works/${workId}`)) return true;
      return Array.from(form.querySelectorAll('input[type="hidden"]')).some(inp => String(inp.value || '').trim() === workId);
    } catch (e) { return false; }
  }

  function scheduleSubscriptionResync() {
    [400, 1200, 2500, 4500].forEach(ms => setTimeout(syncTrackedWorkStatsFromPage, ms));
  }

  function initWorkSubscriptionSyncWatcher() {
    if (document._ao3SubscriptionSyncWatcherAdded) return;
    document._ao3SubscriptionSyncWatcherAdded = true;
    document.addEventListener('click', e => { if (isCurrentWorkSubscriptionTarget(e.target)) scheduleSubscriptionResync(); }, true);
    document.addEventListener('submit', e => { if (isCurrentWorkSubscriptionTarget(e.target)) scheduleSubscriptionResync(); }, true);
  }

  // ── Load-order validator ───────────────────────────────────────────────────
  function validateModules() {
    const checks = [
      ['AO3TrackerStorageKeys',            []],
      ['AO3TrackerUtils',                  ['waitMs', 'esc', 'labelFor', 'trunc']],
      ['AO3TrackerToast',                  ['init', 'showMiniToast']],
      ['AO3TrackerStorage',                ['init', 'getWorks', 'setWorks', 'getCustomCats', 'setCustomCats']],
      ['AO3TrackerTrackedWorkCore',        ['normalizeStatusValue', 'sanitizeTrackedWorksMap', 'nextFinishedAt']],
      ['AO3TrackerAo3PageCore',            ['extractWorkInfoFromDocument', 'extractTrackedWorkFromBlurb']],
      ['AO3TrackerSidebarCore',            []],
      ['AO3TrackerSidebarController',      ['init', 'open', 'close', 'render']],
      ['AO3TrackerSidebarCard',            ['init', 'buildCard']],
      ['AO3TrackerListingBadgeCore',       []],
      ['AO3TrackerListingBadgeController', ['init']],
      ['AO3TrackerWorkPageController',     ['initCurrentBar', 'injectWorkPageMetaRow']],
      ['AO3TrackerPageThemeController',    ['init']],
      ['AO3TrackerNotesModal',             ['init']],
      ['AO3TrackerCatModal',               ['init']],
      ['AO3TrackerExportImport',           ['init']],
      ['AO3TrackerFloatingUI',             ['init']],
      ['AO3TrackerAuthorWatchController',  []],
    ];
    let ok = true;
    for (const [name, methods] of checks) {
      const mod = globalThis[name];
      if (!mod) {
        console.error(`[AO3 Tracker] Missing module: ${name} — check manifest.json js load order`);
        ok = false;
        continue;
      }
      for (const m of methods) {
        if (typeof mod[m] !== 'function') {
          console.error(`[AO3 Tracker] ${name}.${m} is not a function — module may be outdated or failed to load`);
          ok = false;
        }
      }
    }
    return ok;
  }

  // ── Wire-up ────────────────────────────────────────────────────────────────
  function initControllers() {
    validateModules();
    const state = {
      getActiveTab:         () => activeTab,
      setActiveTab:         next => { activeTab = next; },
      getSearchQuery:       () => searchQuery,
      setSearchQuery:       next => { searchQuery = next; },
      getSidebarRandomOrder: () => sidebarRandomOrder,
      setSidebarRandomOrder: next => { sidebarRandomOrder = next; },
      setSidebarOpen:       next => { sidebarOpen = next; },
      getSavedPageScrollY:  () => _savedPageScrollY,
      setSavedPageScrollY:  next => { _savedPageScrollY = next; }
    };

    Toast.init({ document });

    Storage.init({
      document,
      showMiniToast,
      onContextInvalidated: () => {
        markRefreshRequired();
      }
    });

    SidebarCard.init({
      document, window,
      getWorks, setWorks,
      normalizeStatusValue, nextFinishedAt, hasCustomCategories, pruneTrackedWorkIfInvalid, getRestoreStatus,
      esc, trunc, formatWorkWordCountDisplay, labelFor,
      showMiniToast, showMiniUndoToast, confirmRemoveFromTracker, applyRereadingChapterResetIfNeeded,
      openNotesModal,
      openCatModal, setCatModalSourceWorkId: CatModal.setCatModalSourceWorkId || (() => {}),
      flippedSidebarCards, expandedSummaryCards,
      getActiveTab: () => activeTab,
      renderSidebar
    });

    NotesModal.init({ document, getWorks, setWorks, trunc, showMiniToast, renderSidebar });

    CatModal.init({
      document,
      getWorks, setWorks, getCustomCats, setCustomCats, genCatId,
      pruneTrackedWorkIfInvalid, esc, flippedSidebarCards, expandedSummaryCards,
      showMiniToast, renderSidebar,
      getActiveTab: () => activeTab,
      setActiveTab: next => { activeTab = next; },
      updateCustomTabCounts: () => updateCustomTabCounts()
    });

    ExportImport.init({ getWorks, setWorks, getCustomCats, setCustomCats, getHiddenRules, setHiddenRules, getHiddenRulePrefs, setHiddenRulePrefs, genCatId, stampExport, showMiniToast, labelFor, normalizeStatusValue, pruneTrackedWorkIfInvalid, document, renderSidebar });

    AvailabilityChecker.init({ getWorks, setWorks, showMiniToast, renderSidebar });

    ChapterProgress.init({ document, window, getWorks, setWorks, renderSidebar, refreshWorkPageMetaRow });

    TrackButton.init({
      document, window,
      getWorks, setWorks, getCustomCats,
      extractWorkInfo,
      normalizeStatusValue, nextFinishedAt, labelFor,
      applyRereadingChapterResetIfNeeded, confirmRemoveFromTracker,
      showMiniToast, renderSidebar, refreshWorkPageMetaRow,
      syncWorkPageTrackingControls, esc
    });

    PageThemeController.init({ document, window });
    CustomCursorCore.applySelectedFromStorage?.(document);
    CustomCursorCore.bindStorageListener?.(document);

    SidebarController.init({
      window, document, state,
      checkExportReminder, renderCustomTabs, initCurrentBar,
      getWorks, getLibrarySortSetting, getCustomCats,
      normalizeStatusValue,
      buildCard: SidebarCard.buildCard,
      flippedSidebarCards, expandedSummaryCards,
      syncFrontCardDateWrapState: SidebarCard.syncFrontCardDateWrapState,
      updateSidebarSortIndicator, emptyMsg,
      getSidebarOnboardingDismissed: () => sidebarOnboardingDismissed
    });

    ListingBadgeController.init({
      window, document,
      getWorks, getCustomCats, setWorks,
      getHiddenRules, setHiddenRules, getHiddenRulePrefs,
      renderSidebar,
      extractTrackedWorkFromBlurb,
      normalizeStatusValue, nextFinishedAt, hasCustomCategories, pruneTrackedWorkIfInvalid,
      applyRereadingChapterResetIfNeeded,
      showMiniToast, esc
    });

    FloatingUI.init({
      document, window,
      FAB_POSITION_KEY, AO3_FLOATING_KEY,
      toggleSidebar, closeSidebar, renderSidebar, getSidebarOpen: () => sidebarOpen,
      applyTrackerThemeToSidebar, nextAo3trackerTheme, syncAo3trackerThemeToPage,
      aotDoExport, aotDoImport,
      renderCustomTabs,
      openCatModal, closeCatModal, saveCatModal, deleteCat, updateCatSwatch, CAT_PRESETS,
      openNotesModal, closeNotesModal, saveNotesModal, updateStars,
      getPendingRating: NotesModal.getPendingRating || (() => null),
      setPendingRating: NotesModal.setPendingRating || (() => {}),
      setActiveTab: next => { activeTab = next; },
      setSearchQuery: next => { searchQuery = next; },
      EXTENSION_THEME_KEY, AO3_PAGE_THEME_KEY, THEME_SYNC_KEY, EXPORT_BANNER_DISMISS_SESSION,
      MFL_PENDING_COUNT_KEY
    });

    AuthorWatchController.init?.({
      window, document, waitMs, currentLocalDayStamp, showMiniToast,
      AuthorWatchCore,
      AUTHOR_WATCHES_KEY, AUTHOR_WATCH_MATCHES_KEY,
      AUTHOR_WATCH_AUTO_DAY_KEY, AUTHOR_WATCH_AUTO_LOCK_KEY
    });
  }

  // ── Startup ────────────────────────────────────────────────────────────────
  function init() {
    initControllers();
    try { PageThemeController.syncUserProfileBodyClass?.(); } catch (e) {}
    try { PageThemeController.syncSeriesPageBodyClass?.(); } catch (e) {}

    const AO3_DARK_STYLE_ID = 'ao3tracker-page-dark-style';
    if (document.getElementById(AO3_DARK_STYLE_ID)) {
      try { PageThemeController.schedulePinAo3DarkStyle?.(); PageThemeController.setupAo3DarkStylePinObserver?.(); } catch (e) {}
    }
    try { PageThemeController.loadAO3PageDark?.(); } catch (e) {}

    // Read sidebar onboarding dismissed state once; wires X button via event delegation
    try {
      if (extensionContextAvailable()) {
        chrome.storage.local.get(ONBOARDING_DISMISSED_KEY, d => {
          sidebarOnboardingDismissed = !!d[ONBOARDING_DISMISSED_KEY];
        });
      }
    } catch (e) {}
    document.addEventListener('click', e => {
      if (e.target.closest('#aot-sidebar-onboarding-dismiss')) {
        sidebarOnboardingDismissed = true;
        try { if (extensionContextAvailable()) chrome.storage.local.set({ [ONBOARDING_DISMISSED_KEY]: true }); } catch (e2) {}
        const onboarding = document.getElementById('aot-sidebar-onboarding');
        if (onboarding) onboarding.style.display = 'none';
        const empty = document.getElementById('aot-empty');
        if (empty) { empty.style.display = 'block'; empty.textContent = emptyMsg('all'); }
      }
    }, true);

    TrackButton.injectTrackButton?.();
    injectWorkPageMetaRow();
    FloatingUI.initFloating?.();
    injectSearchBadges();
    AvailabilityChecker.initAvailabilityChecker?.();
    ChapterProgress.scheduleChapterProgressSync?.();
    initWorkSubscriptionSyncWatcher();
    AuthorWatchController.maybeInitDailyAuthorWatchAutoCheck?.();
    syncTrackedWorkStatsFromPage();
    [700, 1800, 3500].forEach(ms => setTimeout(syncTrackedWorkStatsFromPage, ms));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // ── BFCache restore ────────────────────────────────────────────────────────
  window.addEventListener('pageshow', e => {
    try { PageThemeController.syncUserProfileBodyClass?.(); PageThemeController.syncSeriesPageBodyClass?.(); } catch (err) {}
    if (e.persisted) {
      injectSearchBadges();
      ChapterProgress.scheduleChapterProgressSync?.();
      injectWorkPageMetaRow();
      syncTrackedWorkStatsFromPage();
    }
  });

  // ── storage.onChanged ──────────────────────────────────────────────────────
  try {
    if (extensionContextAvailable()) {
      chrome.storage.onChanged.addListener(changes => {
        if (!extensionContextAvailable()) {
          markRefreshRequired();
          return;
        }
        if (AO3_FLOATING_KEY in changes) {
          if (changes[AO3_FLOATING_KEY].newValue !== false) {
            FloatingUI.injectFloatingUI?.();
          } else {
            document.getElementById('ao3tracker-fab')?.remove();
            document.getElementById('ao3tracker-sidebar')?.remove();
            sidebarOpen = false;
            document.body.classList.remove('aot-tracker-dock-open');
            document._ao3CurrentBarListenerAdded = false;
            document._ao3DropdownListenerAdded = false;
            document._ao3LabelsDropdownListener = false;
          }
        }
        if (FAB_POSITION_KEY in changes) {
          const fab = document.getElementById('ao3tracker-fab');
          if (fab) {
            const pos = changes[FAB_POSITION_KEY].newValue;
            if (pos && Number.isFinite(pos.left) && Number.isFinite(pos.top)) FloatingUI.applyFabPosition?.(fab, pos);
            else FloatingUI.resetFabPosition?.(fab);
          }
        }
        if (AO3_PAGE_THEME_KEY in changes) syncAo3trackerThemeToPage(changes[AO3_PAGE_THEME_KEY].newValue || 'light');
        if (EXTENSION_THEME_KEY in changes) applyTrackerThemeToSidebar(changes[EXTENSION_THEME_KEY].newValue || 'light');
        if (LIBRARY_SORT_KEY in changes) {
          if (changes[LIBRARY_SORT_KEY].newValue === 'random') sidebarRandomOrder = [];
          renderSidebar();
        }
      });

      chrome.storage.onChanged.addListener((changes, area) => {
        if (!extensionContextAvailable()) {
          markRefreshRequired();
          return;
        }
        if (area !== 'local') return;
        if (!changes.ao3works && !changes.ao3customcats && !changes[LIBRARY_SORT_KEY] && !changes[HIDDEN_RULES_KEY] && !changes[HIDDEN_RULE_PREFS_KEY]) return;
        if (isAo3WorkPageUrl(window.location.href)) {
          refreshWorkPageMetaRow();
          renderSidebar();
          initCurrentBar();
          if (changes.ao3works) {
            const workMatch = window.location.href.match(/\/works\/(\d+)/);
            const workId = workMatch ? workMatch[1] : null;
            const wasTracked = workId ? (changes.ao3works.oldValue?.[workId] != null) : false;
            const isNowTracked = workId ? (changes.ao3works.newValue?.[workId] != null) : false;
            if (wasTracked !== isNowTracked) {
              const btn = document.getElementById('ao3tracker-btn');
              if (btn) btn.remove();
              setTimeout(() => TrackButton.injectTrackButton?.(), 0);
            }
          }
        } else {
          injectSearchBadges();
        }
      });
    }
  } catch (e) {
    markRefreshRequired();
  }

  // ── Message handler ────────────────────────────────────────────────────────
  try {
    if (extensionContextAvailable()) {
      chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
        if (msg.type === 'GET_WORK_INFO') {
          sendResponse(extractWorkInfo());
          return false;
        }
      });
    }
  } catch (e) {
    markRefreshRequired();
  }

  // ── MutationObserver ───────────────────────────────────────────────────────
  let _injectDebounce = null;
  let _badgeDebounce  = null;
  let _workMetaDebounce = null;
  let _chapterProgressDebounce = null;
  function isHiddenRulesUiNode(node) {
    return !!(node && node.nodeType === 1 && node.closest?.('.fg-hidden-work-stub, .fg-hidden-rule-toolbar, .fg-rehide-bar'));
  }

  function isHiddenRulesUiMutation(mutation) {
    if (!mutation) return false;
    if (isHiddenRulesUiNode(mutation.target)) return true;
    const added = Array.from(mutation.addedNodes || []);
    const removed = Array.from(mutation.removedNodes || []);
    const related = added.concat(removed);
    return related.length > 0 && related.every(node => isHiddenRulesUiNode(node));
  }

  const observer = new MutationObserver(mutations => {
    try {
      if (Array.isArray(mutations) && mutations.length && mutations.every(isHiddenRulesUiMutation)) return;
      if (!document.getElementById('ao3tracker-btn')) {
        clearTimeout(_injectDebounce);
        _injectDebounce = setTimeout(() => TrackButton.injectTrackButton?.(), 300);
      }
      if (!document.getElementById('ao3tracker-work-meta') && isAo3WorkPageUrl(window.location.href)) {
        clearTimeout(_workMetaDebounce);
        _workMetaDebounce = setTimeout(injectWorkPageMetaRow, 300);
      }
      if (isAo3WorkPageUrl(window.location.href)) {
        clearTimeout(_chapterProgressDebounce);
        _chapterProgressDebounce = setTimeout(() => ChapterProgress.scheduleChapterProgressSync?.(), 450);
      }
      if (document.querySelector('.ao3t-badge-dropdown.open')) return;
      clearTimeout(_badgeDebounce);
      _badgeDebounce = setTimeout(injectSearchBadges, 500);
    } catch (e) {
      if (e.message?.includes('Extension context invalidated')) observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

})();
