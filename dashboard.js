(function () {
  'use strict';

  const {
    EXTENSION_THEME_KEY,
    DASHBOARD_THEME_KEY,
    DASHBOARD_PLATFORM_KEY,
    DASHBOARD_AUTHOR_WATCH_COLLAPSED_KEY,
    DASHBOARD_CUSTOM_CATS_COLLAPSED_KEY,
    DASHBOARD_HIDDEN_RULES_COLLAPSED_KEY,
    DASHBOARD_VISUALS_HIDDEN_KEY,
    LIBRARY_SORT_KEY,
    AUTHOR_WATCHES_KEY,
    AUTHOR_WATCH_MATCHES_KEY,
    RELATIONSHIP_GROUPS_KEY,
    BOOKMARK_SYNC_KEY,
    MARKED_FOR_LATER_SYNC_KEY,
    HIDDEN_RULES_KEY,
    HIDDEN_RULE_PREFS_KEY,
    COMPANION_CAT_KEY,
    COMPANION_BROCCOLI_KEY,
    CUSTOM_CURSORS_KEY,
    CUSTOM_CURSOR_SELECTED_KEY,
    AUTHOR_NOTES_KEY,
    SHEETS_ENABLED_KEY,
    SHEETS_SPREADSHEET_ID_KEY,
    SHEETS_OWNER_EMAIL_KEY,
    SHEETS_SYNC_STATUS_KEY,
    SHEETS_NEEDS_PUSH_KEY,
    SHEETS_PENDING_TOMBSTONES_KEY
  } = globalThis.AO3TrackerStorageKeys || {};
  const TrackedWorkCore = globalThis.AO3TrackerTrackedWorkCore || {};
  const SidebarCore = globalThis.AO3TrackerSidebarCore || {};
  const Ao3PageCore = globalThis.AO3TrackerAo3PageCore || {};
  const AuthorWatchCore = globalThis.AO3TrackerAuthorWatchCore || {};
  const AuthorWatchPopupController = globalThis.AO3TrackerAuthorWatchPopupController || {};
  const BookmarkImportPopupController = globalThis.AO3TrackerBookmarkImportPopupController || {};
  const MarkedForLaterImportPopupController = globalThis.AO3TrackerMarkedForLaterImportPopupController || {};
  const ExportImportPopupController = globalThis.AO3TrackerExportImportPopupController || {};
  const CustomCatsPopupController = globalThis.AO3TrackerCustomCatsPopupController || {};
  const SubscriptionRefreshPopupController = globalThis.AO3TrackerSubscriptionRefreshPopupController || {};
  const PlatformsCore = globalThis.AO3TrackerPlatformsCore || {};
  const StorageAdapter = globalThis.AO3TrackerStorageAdapter || {};
  const HiddenRulesCore = globalThis.AO3TrackerHiddenRulesCore || {};
  const RelationshipCore = globalThis.AO3TrackerDashboardRelationshipCore || {};
  const ChartsController = globalThis.AO3TrackerDashboardChartsController || {};
  const WorkDetailController = globalThis.AO3TrackerDashboardWorkDetailController || {};
  const CustomCursorCore = globalThis.FGCustomCursorCore || {};
  const SheetsSyncController = globalThis.FGSheetsSyncPopupController || {};

  const BUILTIN_TABS = [
    ['all', 'All'],
    ['want', 'For Later'],
    ['progress', 'Reading'],
    ['completed', 'Completed'],
    ['rereading', 'Re-reading'],
    ['onhold', 'On Hold'],
    ['dnf', 'DNF'],
    ['lost', 'Deleted']
  ];

  const STATUS_LABELS = {
    want: 'For Later',
    progress: 'Reading',
    completed: 'Completed',
    rereading: 'Re-reading',
    onhold: 'On Hold',
    dnf: 'Did Not Finish',
    lost: 'Deleted'
  };

  const STATUS_COLORS = {
    want: '#8b5cf6',
    progress: '#06b6d4',
    completed: '#22c55e',
    rereading: '#f59e0b',
    onhold: '#3b82f6',
    dnf: '#94a3b8',
    lost: '#f43f5e'
  };

  const CHART_COLORS = ['#8b5cf6', '#06b6d4', '#22c55e', '#f59e0b', '#ec4899', '#3b82f6', '#14b8a6', '#f43f5e'];
  const MONTH_LABELS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  const THEME_CYCLE = ['light', 'sol-light', 'dark'];
  const THEME_NEXT_LABELS = {
    light: 'Switch to Solarized Light',
    'sol-light': 'Switch to Solarized Dark',
    dark: 'Switch to Default AO3'
  };
  const DASHBOARD_SELECTABLE_PLATFORMS = new Set(['ao3', 'ffnet']);
  const QUICK_SNAPSHOT_ITEMS = [
    { id: 'all', label: 'All Tracked', tab: 'all', count: (all) => all.length },
    { id: 'want', label: 'For Later', tab: 'want', count: (_all, byStatus) => byStatus.want.length },
    { id: 'progress', label: 'Reading', tab: 'progress', count: (_all, byStatus) => byStatus.progress.length },
    { id: 'completed', label: 'Completed', tab: 'completed', count: (_all, byStatus) => byStatus.completed.length },
    { id: 'rereading', label: 'Re-reading', tab: 'rereading', count: (_all, byStatus) => byStatus.rereading.length },
    { id: 'onhold', label: 'On Hold', tab: 'onhold', count: (_all, byStatus) => byStatus.onhold.length },
    { id: 'dnf', label: 'DNF', tab: 'dnf', count: (_all, byStatus) => byStatus.dnf.length },
    { id: 'lost', label: 'Deleted', tab: 'lost', count: (_all, byStatus) => byStatus.lost.length },
    { id: 'added-this-month', label: 'Added This Month', filter: 'added-this-month', count: countAddedThisMonth },
    { id: 'completed-this-month', label: 'Completed This Month', filter: 'completed-this-month', count: countCompletedThisMonth }
  ];
  const DEFAULT_PAGE_SIZE = 12;
  const DASHBOARD_MOBILE_EXTENSION_VIEWPORT_CLASS = 'fg-mobile-viewport';

  let works = {};
  let customCats = {};
  let relationshipGroups = {};
  let authorWatches = {};
  let authorWatchMatches = [];
  let hiddenRules = {};
  let hiddenRulePrefs = typeof HiddenRulesCore.sanitizePrefs === 'function'
    ? HiddenRulesCore.sanitizePrefs({})
    : { showReasons: false, crossoverThreshold: 3 };
  let authorWatchCollapsed = true;
  let customCategoriesCollapsed = true;
  let hiddenRulesCollapsed = true;
  let visualsHidden = false;
  let bookmarkSyncStates = { default: { knownWorkIds: [], lastFetchedAt: null } };
  let bookmarkSyncAccount = 'default';
  let bookmarkImportState = makeBookmarkImportState();
  let markedForLaterSyncStates = { default: { knownWorkIds: [], lastFetchedAt: null } };
  let markedForLaterSyncAccount = 'default';
  let markedForLaterImportState = makeMarkedForLaterImportState();
  let sheetsSyncEnabled = false;
  let sheetsSyncStatus = { state: 'idle', message: '', lastSyncedAt: null };
  let activeTab = 'all';
  let activeSmartView = '';
  let statusChartMode = 'status';
  let activeDashboardFilter = null;
  let libraryFilters = {
    fandom: '',
    author: '',
    relationship: '',
    rating: '',
    metadata: '',
    subscription: ''
  };
  let groupBy = '';
  let filtersOpen = false;
  let searchQuery = '';
  let sortBy = 'recently-added';
  let requestedSmartViewApplied = false;
  let randomOrder = [];
  let selectedWorkIds = new Set();
  let selectedWorkId = '';
  let detailWorkId = '';
  let detailAuthor = null;
  let _detailScrollY = 0;
  let authorNotes = {};
  let currentPage = 1;
  let pageSize = DEFAULT_PAGE_SIZE;
  let toastTimer = null;
  let dashboardPlatform = 'ao3';
  let footerCatStage = null;
  let catMode = false;
  let broccoliMode = false;
  let companionRunning = false;
  let companionIndex = 0;
  let _companionMaybeStart = null;
  let _companionRefresh = null;

  function detectDashboardMobileExtensionViewport() {
    const physicalScreenMin = Math.min(
      Number(globalThis.screen?.width) || Number.POSITIVE_INFINITY,
      Number(globalThis.screen?.height) || Number.POSITIVE_INFINITY
    );
    const smallPhysicalScreen = physicalScreenMin < 600;
    const coarsePointer = globalThis.matchMedia?.('(pointer: coarse)')?.matches === true;
    const noHover = globalThis.matchMedia?.('(hover: none)')?.matches === true;
    const multiTouch = Number(globalThis.navigator?.maxTouchPoints || 0) > 1;
    return smallPhysicalScreen && coarsePointer && noHover && multiTouch;
  }

  function applyDashboardMobileExtensionViewportClass() {
    if (!document.body) return;
  // Some mobile extension browsers can report a tablet-width extension viewport while screen size stays phone-width.
    document.body.classList.toggle(DASHBOARD_MOBILE_EXTENSION_VIEWPORT_CLASS, detectDashboardMobileExtensionViewport());
  }

  function validateDashboardDeps() {
    const checks = [
      ['AO3TrackerStorageAdapter', ['get', 'getMany', 'set', 'remove']],
      ['AO3TrackerTrackedWorkCore', ['normalizeStatusValue', 'sanitizeTrackedWorksMap', 'nextFinishedAt']],
      ['AO3TrackerPlatformsCore', ['hasCapability', 'getWorksStorageKey', 'normalizePlatformId']],
      ['AO3TrackerSidebarCore', []],
    ];
    const missing = [];
    for (const [name, methods] of checks) {
      const mod = globalThis[name];
      if (!mod) { missing.push(name); continue; }
      for (const m of methods) {
        if (typeof mod[m] !== 'function') missing.push(`${name}.${m}`);
      }
    }
    if (!missing.length) return true;
    console.error(`[AO3 Tracker] dashboard: missing dependencies — ${missing.join(', ')}`);
    const banner = document.createElement('div');
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;padding:12px 16px;background:#fef2f2;color:#b91c1c;font:13px/1.5 sans-serif;border-bottom:1px solid #fca5a5';
    banner.innerHTML = `<strong>Dashboard failed to load.</strong> Missing: <code style="font-size:11px">${missing.join(', ')}</code> — try reloading the extension from chrome://extensions.`;
    document.body.prepend(banner);
    return false;
  }

  (async function generateFavicon() {
    try {
      const size = 48;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      const r = Math.round(size * 0.22);
      ctx.beginPath();
      ctx.moveTo(r, 0); ctx.lineTo(size - r, 0);
      ctx.arcTo(size, 0, size, r, r); ctx.lineTo(size, size - r);
      ctx.arcTo(size, size, size - r, size, r); ctx.lineTo(r, size);
      ctx.arcTo(0, size, 0, size - r, r); ctx.lineTo(0, r);
      ctx.arcTo(0, 0, r, 0, r); ctx.closePath();
      ctx.fillStyle = '#073642';
      ctx.fill();

      const fontSize = Math.round(size * 0.52);
      ctx.font = `800 ${fontSize}px 'Arial Narrow', Arial, sans-serif`;
      ctx.fillStyle = '#93a1a1';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.save();
      ctx.translate(size / 2, size / 2);
      ctx.scale(1.12, 1.26);
      ctx.fillText('FG', 0, 0);
      ctx.restore();

      const link = document.getElementById('fg-favicon');
      if (link) link.href = canvas.toDataURL('image/png');
    } catch (e) {}
  })();

  applyDashboardMobileExtensionViewportClass();

  document.addEventListener('DOMContentLoaded', async () => {
    applyDashboardMobileExtensionViewportClass();
    if (!validateDashboardDeps()) return;
    initSheetsEngine();
    await loadAll();
    setupThemeToggle();
    setupPlatformMenu();
    setupSheetsSyncSection();
    setupCustomCursorControls();
    setupVisualsToggle();
    setupLibraryControls();
    setupSnapshotControls();
    setupInsightControls();
    ChartsController.setupChartModeControls(chartsCtx());
    initFooterCompanion();
    setupBulkControls();
    setupRelationshipGroupControls();
    setupAuthorWatchControls();
    setupFetchControls();
    setupSubscriptionRefresh();
    setupExportImport();
    setupCustomCategories();
    setupHiddenRules();
    setupDetailControls();
    renderAll();

    let _scrollbarTimer;
    document.body.addEventListener('scroll', () => {
      document.body.classList.add('is-scrolling');
      clearTimeout(_scrollbarTimer);
      _scrollbarTimer = setTimeout(() => document.body.classList.remove('is-scrolling'), 800);
    }, { passive: true });
    try {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local') return;
        if (changes[DASHBOARD_PLATFORM_KEY]) {
          applyDashboardPlatform(changes[DASHBOARD_PLATFORM_KEY].newValue || 'ao3');
        }
        if (changes[DASHBOARD_AUTHOR_WATCH_COLLAPSED_KEY]) {
          authorWatchCollapsed = changes[DASHBOARD_AUTHOR_WATCH_COLLAPSED_KEY].newValue !== false;
          applyAuthorWatchSectionCollapseState();
        }
        if (changes[DASHBOARD_CUSTOM_CATS_COLLAPSED_KEY]) {
          customCategoriesCollapsed = changes[DASHBOARD_CUSTOM_CATS_COLLAPSED_KEY].newValue !== false;
          applyCustomCategoriesSectionCollapseState();
        }
        if (changes[DASHBOARD_HIDDEN_RULES_COLLAPSED_KEY]) {
          hiddenRulesCollapsed = changes[DASHBOARD_HIDDEN_RULES_COLLAPSED_KEY].newValue !== false;
          applyHiddenRulesSectionCollapseState();
        }
        if (changes[DASHBOARD_VISUALS_HIDDEN_KEY]) {
          visualsHidden = changes[DASHBOARD_VISUALS_HIDDEN_KEY].newValue === true;
          applyVisualsHiddenState();
        }
        if (changes[HIDDEN_RULES_KEY]) {
          hiddenRules = typeof HiddenRulesCore.sanitizeRulesMap === 'function'
            ? HiddenRulesCore.sanitizeRulesMap(changes[HIDDEN_RULES_KEY].newValue || {})
            : (changes[HIDDEN_RULES_KEY].newValue || {});
          renderHiddenRuleSection();
        }
        if (changes[HIDDEN_RULE_PREFS_KEY]) {
          hiddenRulePrefs = typeof HiddenRulesCore.sanitizePrefs === 'function'
            ? HiddenRulesCore.sanitizePrefs(changes[HIDDEN_RULE_PREFS_KEY].newValue || {})
            : (changes[HIDDEN_RULE_PREFS_KEY].newValue || { showReasons: false, crossoverThreshold: 3 });
          renderHiddenRuleSection();
        }
        if (changes[SHEETS_SYNC_STATUS_KEY]) {
          sheetsSyncStatus = changes[SHEETS_SYNC_STATUS_KEY].newValue || sheetsSyncStatus;
          renderSheetsSyncSection();
        }
        if (changes[SHEETS_ENABLED_KEY]) {
          sheetsSyncEnabled = !!changes[SHEETS_ENABLED_KEY].newValue;
          renderSheetsSyncSection();
        }
        if (changes[SHEETS_OWNER_EMAIL_KEY]) {
          renderSheetsSyncSection();
        }
        if (changes[currentWorksStorageKey()] || changes[currentCustomCatsStorageKey()] || changes[LIBRARY_SORT_KEY] || changes[RELATIONSHIP_GROUPS_KEY]) {
          loadAll().then(renderAll);
        }
      });
    } catch (e) {}
  });

  async function loadAll() {
    const worksKey = currentWorksStorageKey();
    const catsKey = currentCustomCatsStorageKey();
    const data = await StorageAdapter.getMany([worksKey, catsKey, LIBRARY_SORT_KEY, AUTHOR_WATCHES_KEY, AUTHOR_WATCH_MATCHES_KEY, RELATIONSHIP_GROUPS_KEY, BOOKMARK_SYNC_KEY, MARKED_FOR_LATER_SYNC_KEY, AUTHOR_NOTES_KEY, HIDDEN_RULES_KEY, HIDDEN_RULE_PREFS_KEY, DASHBOARD_AUTHOR_WATCH_COLLAPSED_KEY, DASHBOARD_CUSTOM_CATS_COLLAPSED_KEY, DASHBOARD_HIDDEN_RULES_COLLAPSED_KEY, DASHBOARD_VISUALS_HIDDEN_KEY, SHEETS_ENABLED_KEY, SHEETS_SYNC_STATUS_KEY]);
    const sanitized = typeof TrackedWorkCore.sanitizeTrackedWorksMap === 'function'
      ? TrackedWorkCore.sanitizeTrackedWorksMap(data[worksKey] || {})
      : { works: data[worksKey] || {}, changed: false };
    works = sanitized.works;
    const dateBackfillChanged = backfillCompletedWorkDates(works);
    const urlNormChanged = normalizeFFNetWorkUrls(works);
    customCats = data[catsKey] || {};
    relationshipGroups = RelationshipCore.sanitizeRelationshipGroups(data[RELATIONSHIP_GROUPS_KEY] || {});
    const sanitizedWatches = typeof AuthorWatchCore.sanitizeAuthorWatchesMap === 'function'
      ? AuthorWatchCore.sanitizeAuthorWatchesMap(data[AUTHOR_WATCHES_KEY] || {})
      : { watches: data[AUTHOR_WATCHES_KEY] || {}, changed: false };
    authorWatches = sanitizedWatches.watches;
    authorWatchMatches = typeof AuthorWatchCore.sanitizeAuthorWatchMatches === 'function'
      ? AuthorWatchCore.sanitizeAuthorWatchMatches(data[AUTHOR_WATCH_MATCHES_KEY] || [])
      : (Array.isArray(data[AUTHOR_WATCH_MATCHES_KEY]) ? data[AUTHOR_WATCH_MATCHES_KEY] : []);
    bookmarkSyncStates = parseStoredSyncStates(data[BOOKMARK_SYNC_KEY] || {}, globalThis.AO3TrackerBookmarkImportCore?.normalizeBookmarkSyncState || normalizeSyncState);
    markedForLaterSyncStates = parseStoredSyncStates(data[MARKED_FOR_LATER_SYNC_KEY] || {}, globalThis.AO3TrackerMarkedForLaterImportCore?.normalizeMarkedForLaterSyncState || normalizeSyncState);
    authorNotes = data[AUTHOR_NOTES_KEY] || {};
    hiddenRules = typeof HiddenRulesCore.sanitizeRulesMap === 'function'
      ? HiddenRulesCore.sanitizeRulesMap(data[HIDDEN_RULES_KEY] || {})
      : (data[HIDDEN_RULES_KEY] || {});
    hiddenRulePrefs = typeof HiddenRulesCore.sanitizePrefs === 'function'
      ? HiddenRulesCore.sanitizePrefs(data[HIDDEN_RULE_PREFS_KEY] || {})
      : { showReasons: false, crossoverThreshold: 3 };
    authorWatchCollapsed = data[DASHBOARD_AUTHOR_WATCH_COLLAPSED_KEY] !== false;
    customCategoriesCollapsed = data[DASHBOARD_CUSTOM_CATS_COLLAPSED_KEY] !== false;
    hiddenRulesCollapsed = data[DASHBOARD_HIDDEN_RULES_COLLAPSED_KEY] !== false;
    visualsHidden = data[DASHBOARD_VISUALS_HIDDEN_KEY] === true;
    sheetsSyncEnabled = !!data[SHEETS_ENABLED_KEY];
    sheetsSyncStatus = data[SHEETS_SYNC_STATUS_KEY] || { state: 'idle', message: '', lastSyncedAt: null };
    sortBy = data[LIBRARY_SORT_KEY] || 'recently-added';
    const sortSelect = document.getElementById('dashboardLibrarySort');
    if (sortSelect) sortSelect.value = sortBy;
    if (sanitized.changed || dateBackfillChanged || urlNormChanged) {
      await StorageAdapter.set(worksKey, works);
    }
  }

  async function saveWorks(deleteIds = []) {
    const worksKey = currentWorksStorageKey();
    const latest = (await StorageAdapter.get(worksKey)) || {};
    const merged = { ...latest, ...works };
    deleteIds.forEach(id => { delete merged[id]; });
    const ok = await StorageAdapter.set(worksKey, merged);
    if (!ok) showToast('Save failed: storage is full or unavailable.');
    else works = merged;
    return ok;
  }

  function saveAuthorWatches() {
    return StorageAdapter.set(AUTHOR_WATCHES_KEY, authorWatches);
  }

  function saveAuthorNotes() {
    return StorageAdapter.set(AUTHOR_NOTES_KEY, authorNotes);
  }

  function saveAuthorWatchMatches() {
    return StorageAdapter.set(AUTHOR_WATCH_MATCHES_KEY, authorWatchMatches);
  }

  function saveBookmarkSyncState() {
    return StorageAdapter.set(BOOKMARK_SYNC_KEY, serializeSyncStates(bookmarkSyncStates));
  }

  function saveMflSyncState() {
    return StorageAdapter.set(MARKED_FOR_LATER_SYNC_KEY, serializeSyncStates(markedForLaterSyncStates));
  }

  function initSheetsEngine() {
    const engine = globalThis.FGSheetsEngine;
    if (!engine || typeof engine.init !== 'function') return;
    engine.init({
      SHEETS_ENABLED_KEY,
      SHEETS_SPREADSHEET_ID_KEY,
      SHEETS_OWNER_EMAIL_KEY,
      SHEETS_SYNC_STATUS_KEY,
      SHEETS_NEEDS_PUSH_KEY,
      SHEETS_PENDING_TOMBSTONES_KEY
    });
  }

  async function loadSheetsSyncState() {
    sheetsSyncEnabled = !!(await StorageAdapter.get(SHEETS_ENABLED_KEY));
    sheetsSyncStatus = (await StorageAdapter.get(SHEETS_SYNC_STATUS_KEY))
      || { state: 'idle', message: '', lastSyncedAt: null };
  }

  function sheetsSyncContext() {
    return {
      getSheetsEnabled: () => sheetsSyncEnabled,
      getSyncStatus: () => sheetsSyncStatus,
      SHEETS_SYNC_STATUS_KEY,
      SHEETS_ENABLED_KEY,
      SHEETS_OWNER_EMAIL_KEY,
      showToast,
      renderSheetsSection: renderSheetsSyncSection
    };
  }

  function setupSheetsSyncSection() {
    if (typeof SheetsSyncController.setupControls !== 'function') return;
    SheetsSyncController.setupControls(sheetsSyncContext());
  }

  function renderSheetsSyncSection() {
    if (typeof SheetsSyncController.renderSection !== 'function') return;
    loadSheetsSyncState().then(() => {
      SheetsSyncController.renderSection(sheetsSyncContext());
    });
  }

  function saveRelationshipGroups() {
    return StorageAdapter.set(RELATIONSHIP_GROUPS_KEY, relationshipGroups);
  }

  function getHiddenRules(cb) {
    cb(hiddenRules || {});
  }

  function setHiddenRules(nextRules) {
    hiddenRules = typeof HiddenRulesCore.sanitizeRulesMap === 'function'
      ? HiddenRulesCore.sanitizeRulesMap(nextRules || {})
      : (nextRules || {});
    return StorageAdapter.set(HIDDEN_RULES_KEY, hiddenRules);
  }

  function getHiddenRulePrefs(cb) {
    cb(hiddenRulePrefs || { showReasons: false, crossoverThreshold: 3 });
  }

  function setHiddenRulePrefs(nextPrefs) {
    hiddenRulePrefs = typeof HiddenRulesCore.sanitizePrefs === 'function'
      ? HiddenRulesCore.sanitizePrefs(nextPrefs || {})
      : (nextPrefs || { showReasons: false, crossoverThreshold: 3 });
    return StorageAdapter.set(HIDDEN_RULE_PREFS_KEY, hiddenRulePrefs);
  }

  function getCustomCats(cb) {
    cb(customCats || {});
  }

  function setCustomCats(cats) {
    customCats = cats || {};
    StorageAdapter.set(currentCustomCatsStorageKey(), customCats);
  }

  function genCatId() {
    return 'cat-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
  }

  function setupExportImport() {
    if (typeof ExportImportPopupController.setupControls !== 'function') return;
    ExportImportPopupController.setupControls({
      getWorks: () => works,
      saveWorks,
      getCustomCats,
      setCustomCats,
      getHiddenRules,
      setHiddenRules,
      getHiddenRulePrefs,
      setHiddenRulePrefs,
      genCatId,
      showToast,
      renderAll,
      labelFor,
      formatDateShort
    });
  }

  function setupCustomCategories() {
    if (typeof CustomCatsPopupController.setupControls !== 'function') return;
    CustomCatsPopupController.setupControls(customCatsContext());
    document.getElementById('customCategoriesCollapseToggle')?.addEventListener('click', () => {
      customCategoriesCollapsed = !customCategoriesCollapsed;
      StorageAdapter.set(DASHBOARD_CUSTOM_CATS_COLLAPSED_KEY, customCategoriesCollapsed);
      applyCustomCategoriesSectionCollapseState();
    });
  }

  function setupHiddenRules() {
    const typeSelect = document.getElementById('hiddenRuleType');
    const valueInput = document.getElementById('hiddenRuleValue');
    const addBtn = document.getElementById('addHiddenRuleBtn');
    const addCrossoverBtn = document.getElementById('addCrossoverRuleBtn');
    const thresholdInput = document.getElementById('hiddenRuleCrossoverThreshold');
    const showReasonsToggle = document.getElementById('hiddenRuleShowReasons');
    const list = document.getElementById('hiddenRuleList');
    const collapseToggle = document.getElementById('hiddenRulesCollapseToggle');
    if (!typeSelect || !valueInput || !addBtn || !thresholdInput || !showReasonsToggle || !list) return;

    const syncValueFieldState = () => {
      const type = String(typeSelect.value || 'relationship');
      const valueField = document.getElementById('hiddenRuleValueField');
      const needsValue = type !== 'crossover';
      if (valueField) valueField.hidden = !needsValue;
      addBtn.textContent = needsValue ? 'Add rule' : 'Add crossover rule';
      if (!needsValue) valueInput.value = '';
    };

    typeSelect.addEventListener('change', syncValueFieldState);
    addBtn.addEventListener('click', () => addHiddenRuleFromDashboard());
    valueInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addHiddenRuleFromDashboard();
      }
    });
    addCrossoverBtn?.addEventListener('click', () => addHiddenRuleFromDashboard('crossover'));
    thresholdInput.addEventListener('change', () => {
      setHiddenRulePrefs({
        ...hiddenRulePrefs,
        crossoverThreshold: thresholdInput.value
      }).then(() => {
        renderHiddenRuleSection();
        showToast('Crossover threshold updated.');
      });
    });
    showReasonsToggle.addEventListener('change', () => {
      setHiddenRulePrefs({
        ...hiddenRulePrefs,
        showReasons: showReasonsToggle.checked
      }).then(() => {
        renderHiddenRuleSection();
        showToast(showReasonsToggle.checked ? 'Collapsed works will show matching reasons.' : 'Collapsed works will hide matching reasons.');
      });
    });
    list.addEventListener('click', e => {
      const removeButton = e.target.closest('[data-remove-hidden-rule]');
      if (removeButton) {
        removeHiddenRule(removeButton.dataset.removeHiddenRule);
      }
    });
    collapseToggle?.addEventListener('click', () => {
      hiddenRulesCollapsed = !hiddenRulesCollapsed;
      StorageAdapter.set(DASHBOARD_HIDDEN_RULES_COLLAPSED_KEY, hiddenRulesCollapsed);
      applyHiddenRulesSectionCollapseState();
    });

    syncValueFieldState();
    renderHiddenRuleSection();
  }

  function setupLibraryControls() {
    document.getElementById('dashboardSearch')?.addEventListener('input', e => {
      searchQuery = e.target.value.trim().toLowerCase();
      currentPage = 1;
      renderAll();
    });
    document.getElementById('dashboardLibrarySort')?.addEventListener('change', e => {
      sortBy = e.target.value || 'recently-added';
      randomOrder = [];
      currentPage = 1;
      StorageAdapter.set(LIBRARY_SORT_KEY, sortBy);
      renderAll();
    });
    [
      ['dashboardFandomFilter', 'fandom'],
      ['dashboardAuthorFilter', 'author'],
      ['dashboardRelationshipFilter', 'relationship'],
      ['dashboardRatingFilter', 'rating'],
      ['dashboardMetadataFilter', 'metadata'],
      ['dashboardSubscriptionFilter', 'subscription']
    ].forEach(([id, key]) => {
      document.getElementById(id)?.addEventListener('change', e => {
        libraryFilters = { ...libraryFilters, [key]: e.target.value || '' };
        currentPage = 1;
        renderAll();
      });
    });
    document.getElementById('dashboardGroupBy')?.addEventListener('change', e => {
      groupBy = e.target.value || '';
      renderAll();
    });
    document.getElementById('dashboardFilterToggle')?.addEventListener('click', () => {
      filtersOpen = !filtersOpen;
      renderLibraryFilterState();
    });
    document.getElementById('clearLibraryFiltersBtn')?.addEventListener('click', () => {
      libraryFilters = { fandom: '', author: '', relationship: '', rating: '', metadata: '', subscription: '' };
      activeDashboardFilter = null;
      activeSmartView = '';
      activeTab = 'all';
      searchQuery = '';
      groupBy = '';
      currentPage = 1;
      const search = document.getElementById('dashboardSearch');
      if (search) search.value = '';
      renderAll();
    });
    document.getElementById('dashboardActiveFilters')?.addEventListener('click', e => {
      const chip = e.target.closest('[data-filter-chip]');
      if (!chip) return;
      clearFilterChip(chip.dataset.filterChip);
      currentPage = 1;
      renderAll();
    });
  }

  function setupSnapshotControls() {
    document.getElementById('dashboardSnapshotGrid')?.addEventListener('click', e => {
      const button = e.target.closest('[data-dashboard-tab], [data-dashboard-filter]');
      if (!button) return;
      if (button.dataset.dashboardTab) {
        activeTab = button.dataset.dashboardTab || 'all';
        activeSmartView = '';
        activeDashboardFilter = null;
        currentPage = 1;
        renderAll();
        return;
      }
      const nextType = button.dataset.dashboardFilter || '';
      activeDashboardFilter = activeDashboardFilter?.type === nextType ? null : { type: nextType };
      activeTab = 'all';
      activeSmartView = '';
      currentPage = 1;
      renderAll();
    });
  }

  function setupInsightControls() {
    document.querySelectorAll('[data-dashboard-filter]').forEach(button => {
      button.addEventListener('click', () => {
        const nextType = button.dataset.dashboardFilter || '';
        activeDashboardFilter = activeDashboardFilter?.type === nextType ? null : { type: nextType };
        activeTab = 'all';
        activeSmartView = '';
        currentPage = 1;
        renderAll();
      });
    });
    document.querySelectorAll('[data-insight-filter-type]').forEach(button => {
      button.addEventListener('click', () => {
        const filterType = button.dataset.insightFilterType;
        const value = button.dataset.insightFilterValue;
        if (!filterType || !value) return;
        const isActive = activeDashboardFilter?.type === filterType && activeDashboardFilter?.value === value;
        activeDashboardFilter = isActive ? null : { type: filterType, value };
        activeTab = 'all';
        activeSmartView = '';
        currentPage = 1;
        renderAll();
      });
    });
  }

  function setupBulkControls() {
    document.getElementById('selectAllShown')?.addEventListener('change', e => {
      const shownIds = getShownWorks().map(work => work.id);
      if (e.target.checked) shownIds.forEach(id => selectedWorkIds.add(id));
      else shownIds.forEach(id => selectedWorkIds.delete(id));
      renderAll();
    });
    document.getElementById('openSelectedBtn')?.addEventListener('click', openSelectedWorks);
    document.getElementById('removeSelectedBtn')?.addEventListener('click', removeSelectedWorks);
    document.getElementById('bulkStatusSelect')?.addEventListener('change', e => {
      const status = e.target.value;
      e.target.value = '';
      if (status) moveSelectedWorks(status);
    });
  }

  function setupRelationshipGroupControls() {
    document.getElementById('relationshipGroupsPanel')?.addEventListener('click', e => {
      const add = e.target.closest('[data-rel-add]');
      if (add) {
        addRelationshipAlias(add.dataset.relBase || '', add.dataset.relAdd || '');
        return;
      }
      const remove = e.target.closest('[data-rel-remove]');
      if (remove) {
        removeRelationshipGroup(remove.dataset.relRemove || '');
      }
    });
  }

  function setupAuthorWatchControls() {
    if (typeof AuthorWatchPopupController.setupControls !== 'function') return;
    AuthorWatchPopupController.setupControls(authorWatchContext());
    document.getElementById('authorWatchCollapseToggle')?.addEventListener('click', () => {
      authorWatchCollapsed = !authorWatchCollapsed;
      StorageAdapter.set(DASHBOARD_AUTHOR_WATCH_COLLAPSED_KEY, authorWatchCollapsed);
      applyAuthorWatchSectionCollapseState();
    });
  }

  function setupFetchControls() {
    if (typeof BookmarkImportPopupController.setupControls === 'function') {
      BookmarkImportPopupController.setupControls(bookmarkImportContext());
    }
    if (typeof MarkedForLaterImportPopupController.setupControls === 'function') {
      MarkedForLaterImportPopupController.setupControls(markedForLaterImportContext());
    }
  }

  function setupSubscriptionRefresh() {
    if (typeof SubscriptionRefreshPopupController.setupControls === 'function') {
      SubscriptionRefreshPopupController.setupControls(subscriptionRefreshContext());
    }
  }

  function applyVisualsHiddenState() {
    document.body.classList.toggle('dashboard-page-no-visuals', visualsHidden);
    const btn = document.getElementById('dashboardVisualsToggle');
    if (!btn) return;
    btn.setAttribute('aria-pressed', visualsHidden ? 'true' : 'false');
    const label = visualsHidden ? 'Show charts' : 'Hide charts';
    btn.title = label;
    btn.setAttribute('aria-label', label);
  }

  function setupVisualsToggle() {
    const btn = document.getElementById('dashboardVisualsToggle');
    if (!btn) return;
    applyVisualsHiddenState();
    btn.addEventListener('click', () => {
      visualsHidden = !visualsHidden;
      StorageAdapter.set(DASHBOARD_VISUALS_HIDDEN_KEY, visualsHidden);
      applyVisualsHiddenState();
    });
  }

  function setupThemeToggle() {
    const btn = document.getElementById('extensionThemeToggle');
    if (!btn) return;

    function apply(theme) {
      const t = theme === 'dark' ? 'dark' : theme === 'sol-light' ? 'sol-light' : 'light';
      document.body.dataset.theme = t;
      btn.dataset.themeState = t;
      const label = THEME_NEXT_LABELS[t] || THEME_NEXT_LABELS.light;
      btn.title = label;
      btn.setAttribute('aria-label', label);
    }

    StorageAdapter.getMany([DASHBOARD_THEME_KEY, EXTENSION_THEME_KEY]).then(data => {
      apply(data[DASHBOARD_THEME_KEY] || data[EXTENSION_THEME_KEY] || 'light');
    });

    btn.addEventListener('click', () => {
      const cur = btn.dataset.themeState || 'light';
      const next = nextTheme(cur);
      StorageAdapter.set(DASHBOARD_THEME_KEY, next);
      apply(next);
    });
  }

  function setupPlatformMenu() {
    const toggle = document.getElementById('dashboardPlatformToggle');
    const menu = document.getElementById('dashboardPlatformDropdown');
    const edition = document.getElementById('dashboardEditionLabel');
    if (!toggle || !menu || !edition) return;

    function closeMenu() {
      menu.classList.add('hidden');
      toggle.setAttribute('aria-expanded', 'false');
    }

    function openMenu() {
      menu.classList.remove('hidden');
      toggle.setAttribute('aria-expanded', 'true');
    }

    menu.querySelectorAll('[data-platform]').forEach(button => {
      const platform = button.dataset.platform || 'ao3';
      if (button.dataset.comingSoon === 'true') {
        button.textContent = `${platformEditionLabel(platform)} (coming soon)`;
        button.setAttribute('aria-disabled', 'true');
        button.disabled = true;
        button.classList.add('dashboard-platform-option-disabled');
        return;
      }
      button.textContent = platformMenuLabel(platform);
    });

    StorageAdapter.get(DASHBOARD_PLATFORM_KEY).then(val => {
      const requestedPlatform = getRequestedDashboardPlatform();
      const nextPlatform = requestedPlatform || val || 'ao3';
      applyDashboardPlatform(nextPlatform);
      if (requestedPlatform && requestedPlatform !== val) {
        StorageAdapter.set(DASHBOARD_PLATFORM_KEY, requestedPlatform);
      }
    });

    toggle.addEventListener('click', e => {
      e.stopPropagation();
      const isOpen = !menu.classList.contains('hidden');
      if (isOpen) closeMenu();
      else openMenu();
    });

    menu.querySelectorAll('[data-platform]').forEach(button => {
      button.addEventListener('click', () => {
        const next = button.dataset.platform || 'ao3';
        if (!isDashboardPlatformSelectable(next)) return;
        applyDashboardPlatform(next);
        StorageAdapter.set(DASHBOARD_PLATFORM_KEY, next);
        closeMenu();
      });
    });

    document.getElementById('dashboardHelpBtn')?.addEventListener('click', () => {
      closeMenu();
      openHelpPage();
    });

    document.getElementById('customCursorOpenBtn')?.addEventListener('click', () => {
      closeMenu();
      openCustomCursorModal();
    });

    const catToggle = document.getElementById('companionCatToggle');
    const broccoliToggle = document.getElementById('companionBroccoliToggle');

    StorageAdapter.getMany([COMPANION_CAT_KEY, COMPANION_BROCCOLI_KEY]).then(data => {
      catMode = !!data[COMPANION_CAT_KEY];
      broccoliMode = !!data[COMPANION_BROCCOLI_KEY];
      if (catToggle) catToggle.checked = catMode;
      if (broccoliToggle) broccoliToggle.checked = broccoliMode;
      if (_companionMaybeStart) _companionMaybeStart();
    });

    catToggle?.addEventListener('change', () => {
      catMode = catToggle.checked;
      if (catMode) {
        broccoliMode = false;
        if (broccoliToggle) broccoliToggle.checked = false;
      }
      StorageAdapter.set(COMPANION_CAT_KEY, catMode);
      StorageAdapter.set(COMPANION_BROCCOLI_KEY, broccoliMode);
      if (_companionRefresh) _companionRefresh();
      else if (_companionMaybeStart) _companionMaybeStart();
    });

    broccoliToggle?.addEventListener('change', () => {
      broccoliMode = broccoliToggle.checked;
      if (broccoliMode) {
        catMode = false;
        if (catToggle) catToggle.checked = false;
      }
      StorageAdapter.set(COMPANION_CAT_KEY, catMode);
      StorageAdapter.set(COMPANION_BROCCOLI_KEY, broccoliMode);
      if (_companionRefresh) _companionRefresh();
      else if (_companionMaybeStart) _companionMaybeStart();
    });

    document.addEventListener('click', e => {
      if (!menu.classList.contains('hidden') && !menu.contains(e.target) && !toggle.contains(e.target)) closeMenu();
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeMenu();
    });
  }

  function applyDashboardPlatform(platform) {
    dashboardPlatform = isDashboardPlatformSelectable(platform) ? normalizePlatform(platform) : 'ao3';
    const requestedSmartView = getRequestedDashboardSmartView();

    // Reset all selection and detail state that belongs to the previous platform's library
    selectedWorkIds.clear();
    selectedWorkId = '';
    detailWorkId = '';
    detailAuthor = null;
    activeSmartView = requestedSmartView;
    activeTab = 'all';
    activeDashboardFilter = null;

    const edition = document.getElementById('dashboardEditionLabel');
    if (edition) edition.textContent = platformEditionLabel(dashboardPlatform);
    document.title = 'FandomGobbler';
    document.querySelectorAll('#dashboardPlatformDropdown [data-platform]').forEach(button => {
      const active = button.dataset.platform === dashboardPlatform;
      const disabled = button.dataset.comingSoon === 'true' || !isDashboardPlatformSelectable(button.dataset.platform || '');
      button.classList.toggle('active', active);
      button.setAttribute('aria-checked', active ? 'true' : 'false');
      button.classList.toggle('hidden', active && !disabled);
    });
    applyPlatformCapabilities();
    loadAll().then(renderAll);
  }

  function customCursorListKey() {
    return CUSTOM_CURSORS_KEY || CustomCursorCore.customCursorsKey?.() || 'fandomgobbler_custom_cursors';
  }

  function customCursorSelectedKey() {
    return CUSTOM_CURSOR_SELECTED_KEY || CustomCursorCore.selectedCursorKey?.() || 'fandomgobbler_custom_cursor_selected';
  }

  async function loadCustomCursorState() {
    const data = await StorageAdapter.getMany([customCursorListKey(), customCursorSelectedKey()]);
    return {
      cursors: CustomCursorCore.sanitizeCursorList?.(data[customCursorListKey()]) || [],
      selectedId: String(data[customCursorSelectedKey()] || '')
    };
  }

  function setCustomCursorError(message) {
    const el = document.getElementById('customCursorError');
    if (!el) return;
    el.textContent = message || '';
    el.classList.toggle('hidden', !message);
  }

  function closeCustomCursorModal() {
    document.getElementById('customCursorOverlay')?.classList.add('hidden');
    setCustomCursorError('');
  }

  async function openCustomCursorModal() {
    document.getElementById('customCursorOverlay')?.classList.remove('hidden');
    setCustomCursorError('');
    await renderCustomCursorList();
  }

  async function saveCustomCursorState(cursors, selectedId) {
    const clean = CustomCursorCore.sanitizeCursorList?.(cursors) || [];
    const validSelected = clean.some(cursor => cursor.id === selectedId) ? selectedId : '';
    await StorageAdapter.set(customCursorListKey(), clean);
    await StorageAdapter.set(customCursorSelectedKey(), validSelected);
    CustomCursorCore.applyCursor?.(CustomCursorCore.getSelectedCursor?.(clean, validSelected), document);
    await renderCustomCursorQuickList();
  }

  async function renderCustomCursorQuickList() {
    const listEl = document.getElementById('customCursorQuickList');
    if (!listEl) return;
    const { cursors, selectedId } = await loadCustomCursorState();
    listEl.innerHTML = '';
    listEl.classList.toggle('hidden', !cursors.length);
    if (!cursors.length) return;

    cursors.forEach(cursor => {
      const button = document.createElement('button');
      button.className = 'dashboard-cursor-quick-option';
      button.type = 'button';
      button.dataset.cursorId = cursor.id;
      button.classList.toggle('active', cursor.id === selectedId);
      button.innerHTML = `<span class="dashboard-cursor-quick-preview"></span><span class="dashboard-cursor-quick-name"></span>`;
      button.querySelector('.dashboard-cursor-quick-preview').style.backgroundImage = `url("${String(cursor.dataUrl).replace(/"/g, '\\"')}")`;
      button.querySelector('.dashboard-cursor-quick-name').textContent = cursor.name;
      button.addEventListener('click', async event => {
        event.stopPropagation();
        const state = await loadCustomCursorState();
        await saveCustomCursorState(state.cursors, cursor.id);
        showToast(`Cursor set to ${cursor.name}.`);
      });
      listEl.appendChild(button);
    });

    if (selectedId) {
      const reset = document.createElement('button');
      reset.className = 'dashboard-cursor-quick-option dashboard-cursor-quick-reset';
      reset.type = 'button';
      reset.textContent = 'Return to Default Cursor';
      reset.addEventListener('click', async event => {
        event.stopPropagation();
        const state = await loadCustomCursorState();
        await saveCustomCursorState(state.cursors, '');
        showToast('Default cursor restored.');
      });
      listEl.appendChild(reset);
    }
  }

  async function renderCustomCursorList() {
    const listEl = document.getElementById('customCursorList');
    if (!listEl) return;
    const { cursors, selectedId } = await loadCustomCursorState();
    listEl.innerHTML = '';

    if (!cursors.length) {
      const empty = document.createElement('div');
      empty.className = 'custom-cursor-empty';
      empty.textContent = 'No custom cursors saved yet.';
      listEl.appendChild(empty);
      return;
    }

    cursors.forEach(cursor => {
      const row = document.createElement('div');
      row.className = 'custom-cursor-row';
      row.classList.toggle('custom-cursor-row-selected', cursor.id === selectedId);

      const preview = document.createElement('span');
      preview.className = 'custom-cursor-preview';
      preview.style.backgroundImage = `url("${String(cursor.dataUrl).replace(/"/g, '\\"')}")`;
      row.appendChild(preview);

      const nameInput = document.createElement('input');
      nameInput.className = 'custom-cursor-name-input';
      nameInput.type = 'text';
      nameInput.maxLength = 40;
      nameInput.value = cursor.name;
      nameInput.setAttribute('aria-label', 'Cursor name');
      nameInput.addEventListener('change', async () => {
        const nextName = String(nameInput.value || '').trim();
        const state = await loadCustomCursorState();
        const next = state.cursors.map(item => item.id === cursor.id ? { ...item, name: nextName || item.name } : item);
        await saveCustomCursorState(next, state.selectedId);
        await renderCustomCursorList();
      });
      row.appendChild(nameInput);

      const selectBtn = document.createElement('button');
      selectBtn.className = 'bookmark-secondary custom-cursor-row-btn';
      selectBtn.type = 'button';
      selectBtn.textContent = cursor.id === selectedId ? 'Selected' : 'Use';
      selectBtn.disabled = cursor.id === selectedId;
      selectBtn.addEventListener('click', async () => {
        const state = await loadCustomCursorState();
        await saveCustomCursorState(state.cursors, cursor.id);
        await renderCustomCursorList();
      });
      row.appendChild(selectBtn);

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'bookmark-secondary custom-cursor-row-btn custom-cursor-delete';
      deleteBtn.type = 'button';
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', async () => {
        const state = await loadCustomCursorState();
        const next = state.cursors.filter(item => item.id !== cursor.id);
        const nextSelected = state.selectedId === cursor.id ? '' : state.selectedId;
        await saveCustomCursorState(next, nextSelected);
        await renderCustomCursorList();
      });
      row.appendChild(deleteBtn);

      listEl.appendChild(row);
    });
  }

  function setupCustomCursorControls() {
    CustomCursorCore.applySelectedFromStorage?.(document);
    CustomCursorCore.bindStorageListener?.(document);
    renderCustomCursorQuickList();

    document.getElementById('customCursorClose')?.addEventListener('click', closeCustomCursorModal);
    document.getElementById('customCursorDone')?.addEventListener('click', closeCustomCursorModal);
    document.getElementById('customCursorOverlay')?.addEventListener('click', event => {
      if (event.target === event.currentTarget) closeCustomCursorModal();
    });

    document.getElementById('customCursorDefault')?.addEventListener('click', async () => {
      const state = await loadCustomCursorState();
      await saveCustomCursorState(state.cursors, '');
      await renderCustomCursorList();
      showToast('Default cursor restored.');
    });

    document.getElementById('customCursorSave')?.addEventListener('click', async () => {
      setCustomCursorError('');
      const fileInput = document.getElementById('customCursorFile');
      const nameInput = document.getElementById('customCursorName');
      const file = fileInput?.files?.[0];
      const state = await loadCustomCursorState();
      if (state.cursors.length >= (CustomCursorCore.MAX_CURSORS || 5)) {
        setCustomCursorError('You can save up to 5 custom cursors. Delete one before adding another.');
        return;
      }
      try {
        const cursor = await CustomCursorCore.prepareCursorFromFile(file, nameInput?.value || '');
        const next = [...state.cursors, cursor];
        await saveCustomCursorState(next, cursor.id);
        if (fileInput) fileInput.value = '';
        if (nameInput) nameInput.value = '';
        await renderCustomCursorList();
        showToast('Custom cursor saved.');
      } catch (error) {
        setCustomCursorError(error?.message || 'Could not save that cursor.');
      }
    });
  }

  function getRequestedDashboardPlatform() {
    try {
      const requested = new URLSearchParams(window.location.search).get('platform');
      return isDashboardPlatformSelectable(requested) ? normalizePlatform(requested) : '';
    } catch (e) {
      return '';
    }
  }

  function getRequestedDashboardSmartView() {
    if (requestedSmartViewApplied) return '';
    try {
      const requested = new URLSearchParams(window.location.search).get('smart');
      const validSmartViews = new Set(['stale-incomplete', 'missing-metadata', 'lost-works']);
      const smartView = validSmartViews.has(requested) ? requested : '';
      if (smartView) requestedSmartViewApplied = true;
      return smartView;
    } catch (e) {
      return '';
    }
  }

  function normalizePlatform(platform) {
    return typeof PlatformsCore.normalizePlatformId === 'function'
      ? PlatformsCore.normalizePlatformId(platform)
      : (platform || 'ao3');
  }

  function isDashboardPlatformSelectable(platform) {
    return DASHBOARD_SELECTABLE_PLATFORMS.has(normalizePlatform(platform));
  }

  function platformEditionLabel(platform) {
    return typeof PlatformsCore.getEditionLabel === 'function'
      ? PlatformsCore.getEditionLabel(platform)
      : 'AO3 Edition';
  }

  function platformMenuLabel(platform) {
    return typeof PlatformsCore.getMenuLabel === 'function'
      ? PlatformsCore.getMenuLabel(platform)
      : platformEditionLabel(platform);
  }

  function platformHas(capabilityName) {
    return typeof PlatformsCore.hasCapability === 'function'
      ? PlatformsCore.hasCapability(dashboardPlatform, capabilityName)
      : true;
  }

  function platformBetaNote(platform) {
    return typeof PlatformsCore.getBetaNote === 'function'
      ? PlatformsCore.getBetaNote(platform)
      : '';
  }

  function currentWorksStorageKey() {
    return typeof PlatformsCore.getWorksStorageKey === 'function'
      ? PlatformsCore.getWorksStorageKey(dashboardPlatform)
      : 'ao3works';
  }

  function currentCustomCatsStorageKey() {
    return typeof PlatformsCore.getCustomCatsStorageKey === 'function'
      ? PlatformsCore.getCustomCatsStorageKey(dashboardPlatform)
      : 'ao3customcats';
  }

  function applyPlatformCapabilities() {
    const note = document.getElementById('dashboardPlatformNote');
    const relationshipGroupsSection = document.getElementById('relationshipGroupsSection');
    const authorWatchSection = document.getElementById('authorWatchSection');
    const libraryToolsSection = document.getElementById('libraryToolsSection');
    const fetchBookmarksBtn = document.getElementById('fetchBookmarksBtn');
    const fetchMarkedForLaterBtn = document.getElementById('fetchMarkedForLaterBtn');
    const refreshSubscriptionsBtn = document.getElementById('refreshSubscriptionsBtn');
    const refreshAuthorWatchesBtn = document.getElementById('refreshAuthorWatchesBtn');
    const topRelationshipLink = document.getElementById('insightTopRelationshipLink');
    const subscribedWorksInsight = document.querySelector('[data-dashboard-filter="subscribed"]');
    const relationshipFilterField = document.getElementById('dashboardRelationshipFilter')?.closest('.dashboard-filter-field');
    const subscriptionFilterField = document.getElementById('dashboardSubscriptionFilter')?.closest('.dashboard-filter-field');
    const hiddenRulesSection = document.getElementById('hiddenRulesSection');
    const openSelectedBtn = document.getElementById('openSelectedBtn');
    const search = document.getElementById('dashboardSearch');

    const bookmarkImport = platformHas('bookmarkImport');
    const markedForLaterImport = platformHas('markedForLaterImport');
    const subscriptions = platformHas('subscriptions');
    const authorWatch = platformHas('authorWatch');
    const relationshipTools = platformHas('relationshipTools');
    const relationshipInsights = platformHas('relationshipInsights');
    const subscriptionFilter = platformHas('subscriptionFilter');
    const ao3EngagementSorts = platformHas('ao3EngagementSorts');

    if (!relationshipTools && libraryFilters.relationship) libraryFilters = { ...libraryFilters, relationship: '' };
    if (!subscriptionFilter && libraryFilters.subscription) libraryFilters = { ...libraryFilters, subscription: '' };
    if (!relationshipTools && groupBy === 'relationship') groupBy = '';
    if (!subscriptionFilter && groupBy === 'subscription') groupBy = '';
    if (!subscriptions && activeDashboardFilter?.type === 'subscribed') activeDashboardFilter = null;

    if (note) {
      const betaText = platformBetaNote(dashboardPlatform);
      note.hidden = !betaText;
      note.textContent = betaText;
    }

    if (relationshipGroupsSection) relationshipGroupsSection.hidden = !relationshipTools;
    if (hiddenRulesSection) hiddenRulesSection.hidden = dashboardPlatform !== 'ao3';
    if (authorWatchSection) authorWatchSection.hidden = !authorWatch;
    if (fetchBookmarksBtn) fetchBookmarksBtn.hidden = !bookmarkImport;
    if (fetchMarkedForLaterBtn) fetchMarkedForLaterBtn.hidden = !markedForLaterImport;
    if (refreshSubscriptionsBtn) refreshSubscriptionsBtn.hidden = !subscriptions;
    if (refreshAuthorWatchesBtn) refreshAuthorWatchesBtn.hidden = !authorWatch;
    if (topRelationshipLink) topRelationshipLink.hidden = !relationshipInsights;
    if (subscribedWorksInsight) subscribedWorksInsight.hidden = !subscriptions;
    if (relationshipFilterField) relationshipFilterField.hidden = !relationshipTools;
    if (subscriptionFilterField) subscriptionFilterField.hidden = !subscriptionFilter;
    if (libraryToolsSection) {
      libraryToolsSection.hidden = ![fetchBookmarksBtn, fetchMarkedForLaterBtn, refreshSubscriptionsBtn].some(button => button && !button.hidden);
    }

    setSortOptionHidden('most-bookmarked', !ao3EngagementSorts);
    setSortOptionHidden('most-kudos', !ao3EngagementSorts);
    setSortOptionHidden('most-hits', !ao3EngagementSorts);
    if (dashboardPlatform === 'ffnet') {
      const sortSel = document.getElementById('dashboardLibrarySort');
      if (sortSel) {
        const optB = sortSel.querySelector('option[value="most-bookmarked"]');
        if (optB) optB.textContent = 'Most Favorited';
        const optK = sortSel.querySelector('option[value="most-kudos"]');
        if (optK) optK.textContent = 'Most Reviewed';
        const optH = sortSel.querySelector('option[value="most-hits"]');
        if (optH) optH.textContent = 'Most Followed';
      }
    }
    setGroupByOptionHidden('relationship', !relationshipTools);
    setGroupByOptionHidden('subscription', !subscriptionFilter);
    ensureSupportedSortSelection(ao3EngagementSorts);

    if (openSelectedBtn) openSelectedBtn.textContent = subscriptions || dashboardPlatform === 'ao3'
      ? 'Open selected pages'
      : `Open selected ${platformEditionLabel(dashboardPlatform).replace(' Edition', '')} pages`;
    if (search) search.placeholder = relationshipTools
      ? 'Search title, author, fandom, relationship, notes...'
      : 'Search title, author, fandom, tags, notes...';
  }

  function setSortOptionHidden(value, hidden) {
    const option = document.querySelector(`#dashboardLibrarySort option[value="${value}"]`);
    if (!option) return;
    option.hidden = hidden;
    option.disabled = hidden;
  }

  function openHelpPage() {
    const url = chrome.runtime.getURL('help.html');
    try {
      if (chrome.tabs && typeof chrome.tabs.create === 'function') {
        chrome.tabs.create({ url, active: true });
        return;
      }
    } catch (e) {}
    window.open(url, '_blank', 'noopener');
  }

  function ensureSupportedSortSelection(ao3EngagementSorts) {
    if (ao3EngagementSorts) return;
    if (!['most-bookmarked', 'most-kudos', 'most-hits'].includes(sortBy)) return;
    sortBy = 'recently-added';
    const sortSelect = document.getElementById('dashboardLibrarySort');
    if (sortSelect) sortSelect.value = sortBy;
  }

  function setGroupByOptionHidden(value, hidden) {
    const option = document.querySelector(`#dashboardGroupBy option[value="${value}"]`);
    if (!option) return;
    option.hidden = hidden;
    option.disabled = hidden;
  }

  function setupDetailControls() {
    document.getElementById('dashboardDetailBack')?.addEventListener('click', () => WorkDetailController.close(workDetailCtx()));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') WorkDetailController.close(workDetailCtx());
    });
  }

  function renderAll() {
    const all = Object.values(works);
    const byStatus = buildBuckets(all);
    const smartFiltered = filterSmartView(all, activeSmartView);
    const dashboardFiltered = filterDashboardView(smartFiltered, activeDashboardFilter);
    const libraryFiltered = filterLibraryFacets(dashboardFiltered, libraryFilters);
    const viewModel = computeViewModel(libraryFiltered);
    const allShown = viewModel.sorted || [];
    const totalPages = Math.max(1, Math.ceil(allShown.length / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;
    const shown = paginateWorks(allShown);

    setText('totalCount', `${all.length} work${all.length !== 1 ? 's' : ''}`);
    ChartsController.renderSnapshotCards(chartsCtx(), all, byStatus);
    renderInsightLinks(all);
    setText('insightTotalWords', formatNumber(allShown.reduce((sum, w) => sum + (Number(w.wordCount) || 0), 0)));
    setText('insightSubscribedWorks', formatNumber(all.filter(w => w.subscribedAtAo3 === true).length));
    setText('libraryResultMeta', buildLibraryMeta(allShown.length, all.length));

    renderSnapshotState();
    renderLibraryFilterControls(all);
    renderLibraryFilterState();
    ChartsController.renderCharts(chartsCtx(), all, byStatus);
    renderSmartViews(all);
    renderRelationshipGroups(all);
    renderAuthorWatchSection();
    renderSheetsSyncSection();
    renderTabs(byStatus, all);
    WorkDetailController.renderLibraryMode(workDetailCtx());
    renderWorks(shown, allShown.length, all.length);
    renderPagination(allShown.length);
    renderBulkState(shown);
    renderNowReadingBar(all);
    WorkDetailController.renderDetailMode(workDetailCtx());
    renderCustomCategoryManager();
    renderHiddenRuleSection();
    if (typeof ExportImportPopupController.renderLastBackupStamp === 'function') {
      ExportImportPopupController.renderLastBackupStamp({ formatDateShort });
    }
  }

  function renderCustomCategoryManager() {
    if (typeof CustomCatsPopupController.renderCategoryManager === 'function') {
      CustomCatsPopupController.renderCategoryManager(customCatsContext());
    }
    applyCustomCategoriesSectionCollapseState();
  }

  function renderHiddenRuleSection() {
    const section = document.getElementById('hiddenRulesSection');
    const list = document.getElementById('hiddenRuleList');
    const meta = document.getElementById('hiddenRulesMeta');
    const thresholdInput = document.getElementById('hiddenRuleCrossoverThreshold');
    const showReasonsToggle = document.getElementById('hiddenRuleShowReasons');
    const addCrossoverBtn = document.getElementById('addCrossoverRuleBtn');
    if (!section || !list || !meta || !thresholdInput || !showReasonsToggle) return;

    section.hidden = dashboardPlatform !== 'ao3';
    if (section.hidden) return;
    applyHiddenRulesSectionCollapseState();

    thresholdInput.value = String(hiddenRulePrefs.crossoverThreshold || 3);
    showReasonsToggle.checked = hiddenRulePrefs.showReasons !== false;

    const rulesList = Object.values(hiddenRules || {}).sort((a, b) => {
      return (Number(a.createdAt) || 0) - (Number(b.createdAt) || 0) || String(a.value || '').localeCompare(String(b.value || ''));
    });
    const crossoverPresent = rulesList.some(rule => rule.type === 'crossover');
    if (addCrossoverBtn) {
      addCrossoverBtn.disabled = crossoverPresent;
      addCrossoverBtn.textContent = crossoverPresent ? 'Crossovers already hidden' : 'Hide crossovers';
    }
    meta.textContent = `${rulesList.length} hidden rule${rulesList.length !== 1 ? 's' : ''}. Tracked works stay visible even if they match.`;

    if (!rulesList.length) {
      list.innerHTML = '<div class="category-manager-empty">No hidden rules yet. Add one here or use the quick hide actions on AO3 listings.</div>';
      return;
    }

    list.innerHTML = rulesList.map(rule => {
      const typeLabel = HiddenRulesCore.RULE_TYPE_LABELS?.[rule.type] || rule.type;
      const valueLabel = typeof HiddenRulesCore.ruleDisplayValue === 'function'
        ? HiddenRulesCore.ruleDisplayValue(rule, hiddenRulePrefs)
        : (rule.value || rule.type);
      return `
        <div class="dashboard-hidden-rule-row">
          <div class="dashboard-hidden-rule-copy">
            <div class="dashboard-hidden-rule-name" title="${escHtml(valueLabel)}">${escHtml(valueLabel)}</div>
            <div class="dashboard-hidden-rule-kind">${escHtml(typeLabel)}</div>
          </div>
          <button class="dashboard-hidden-rule-remove dashboard-remove" data-remove-hidden-rule="${escHtml(rule.id)}" title="Remove rule" type="button">${iconSvg('close')}</button>
        </div>
      `;
    }).join('');
  }

  function chartsCtx() {
    return {
      getStatusChartMode: () => statusChartMode,
      setStatusChartMode: mode => { statusChartMode = mode; },
      getWorks: () => works,
      getCustomCats: () => customCats,
      buildBuckets,
      openAuthorDetail,
      escHtml,
      formatNumber,
      setText,
      monthName,
      flattenCounts,
      topEntries,
      buildAo3TagUrl,
      buildAo3AuthorUrl,
      isOrphanedWork,
      relationshipFacetEntries,
      renderAll,
      STATUS_LABELS,
      STATUS_COLORS,
      CHART_COLORS,
      MONTH_LABELS,
      QUICK_SNAPSHOT_ITEMS
    };
  }

  function computeViewModel(all) {
    if (typeof SidebarCore.computeSidebarViewModel === 'function') {
      const model = SidebarCore.computeSidebarViewModel({
        works: all,
        activeTab,
        searchQuery,
        sortKey: sortBy,
        randomOrder
      });
      if (Array.isArray(model.randomOrder)) randomOrder = model.randomOrder;
      return model;
    }
    return { sorted: all };
  }

  function getShownWorks() {
    const base = filterLibraryFacets(
      filterDashboardView(filterSmartView(Object.values(works), activeSmartView), activeDashboardFilter),
      libraryFilters
    );
    return paginateWorks(computeViewModel(base).sorted || []);
  }

  function renderInsightLinks(all) {
    const topFandom = topEntries(flattenCounts(all.flatMap(w => w.fandoms || [])), 1)[0];
    const topRelationship = relationshipFacetEntries(all)[0];
    renderInsightFilterBtn('insightTopFandom', 'insightTopFandomLink', topFandom, 'fandom', 'No fandoms yet');
    renderInsightFilterBtn('insightTopRelationship', 'insightTopRelationshipLink', topRelationship, 'relationship', 'No relationships yet');
  }

  function renderInsightFilterBtn(textId, btnId, entry, filterType, emptyLabel) {
    const text = document.getElementById(textId);
    const btn = document.getElementById(btnId);
    if (text) text.textContent = entry ? `${entry.label} (${entry.count})` : emptyLabel;
    if (!btn) return;
    if (entry) {
      btn.dataset.insightFilterValue = entry.label;
      btn.disabled = false;
      btn.classList.toggle('active', activeDashboardFilter?.type === filterType && activeDashboardFilter?.value === entry.label);
    } else {
      delete btn.dataset.insightFilterValue;
      btn.disabled = true;
      btn.classList.remove('active');
    }
  }

  function renderSnapshotState() {
    document.querySelectorAll('[data-dashboard-tab]').forEach(button => {
      button.classList.toggle('active', !activeDashboardFilter && !activeSmartView && button.dataset.dashboardTab === activeTab);
    });
    document.querySelectorAll('[data-dashboard-filter]').forEach(button => {
      button.classList.toggle('active', activeDashboardFilter?.type === button.dataset.dashboardFilter);
    });
  }

  function renderLibraryFilterControls(all) {
    renderFacetOptions('dashboardFandomFilter', topEntries(flattenCounts((all || []).flatMap(work => work.fandoms || [])), 120), libraryFilters.fandom, 'Any fandom');
    renderFacetOptions('dashboardAuthorFilter', topEntries(flattenCounts((all || []).filter(work => !isOrphanedWork(work)).map(work => work.author || 'Anonymous')), 120), libraryFilters.author, 'Any author');
    renderFacetOptions('dashboardRelationshipFilter', relationshipFacetEntries(all), libraryFilters.relationship, 'Any relationship');
    setSelectValue('dashboardRatingFilter', libraryFilters.rating);
    setSelectValue('dashboardMetadataFilter', libraryFilters.metadata);
    setSelectValue('dashboardSubscriptionFilter', libraryFilters.subscription);
    setSelectValue('dashboardGroupBy', groupBy);
    document.getElementById('clearLibraryFiltersBtn')?.classList.toggle('active', hasAnyLibraryFilter() || !!activeDashboardFilter || !!activeSmartView || activeTab !== 'all' || !!searchQuery || !!groupBy);
  }

  function renderLibraryFilterState() {
    const activeCount = activeFilterChips().length;
    const toggle = document.getElementById('dashboardFilterToggle');
    if (toggle) {
      toggle.textContent = filtersOpen ? 'Hide filters' : activeCount ? `Show filters (${activeCount})` : 'Show filters';
      toggle.classList.toggle('active', filtersOpen || activeCount > 0);
      toggle.setAttribute('aria-expanded', filtersOpen ? 'true' : 'false');
    }
    const panel = document.getElementById('dashboardFilterPanel');
    if (panel) panel.classList.toggle('hidden', !filtersOpen);
    const chipWrap = document.getElementById('dashboardActiveFilters');
    if (chipWrap) {
      const chips = activeFilterChips();
      chipWrap.classList.toggle('hidden', chips.length === 0);
      chipWrap.innerHTML = chips.map(chip => `
        <button class="dashboard-filter-chip" data-filter-chip="${escHtml(chip.key)}" type="button" title="Remove ${escHtml(chip.label)}">
          ${escHtml(chip.label)} <span aria-hidden="true">x</span>
        </button>
      `).join('');
    }
  }

  function renderFacetOptions(id, entries, selectedValue, emptyLabel) {
    const select = document.getElementById(id);
    if (!select) return;
    const value = String(selectedValue || '');
    const known = new Set(entries.map(entry => entry.label));
    const selectedEntry = value && !known.has(value) ? [{ label: value, count: 0 }] : [];
    select.innerHTML = [
      `<option value="">${escHtml(emptyLabel)}</option>`,
      ...selectedEntry.map(entry => `<option value="${escHtml(entry.label)}">${escHtml(entry.label)}</option>`),
      ...entries.map(entry => `<option value="${escHtml(entry.label)}">${escHtml(entry.label)} (${formatNumber(entry.count)})</option>`)
    ].join('');
    select.value = value;
  }

  function setSelectValue(id, value) {
    const select = document.getElementById(id);
    if (select) select.value = value || '';
  }

  function renderTabs(byStatus, all) {
    const tabs = document.getElementById('dashboardTabs');
    if (!tabs) return;
    const customTabs = Object.values(customCats || {}).map(cat => [cat.id, cat.name]);
    const counts = { all: all.length };
    Object.keys(byStatus).forEach(status => { counts[status] = byStatus[status].length; });
    customTabs.forEach(([id]) => {
      counts[id] = all.filter(work => (work.customCats || []).includes(id)).length;
    });
    tabs.innerHTML = [...BUILTIN_TABS, ...customTabs].map(([id, label]) => `
      <button class="dashboard-tab${id === activeTab ? ' active' : ''}" data-tab="${escHtml(id)}" type="button">
        ${escHtml(label)} <span>${counts[id] || 0}</span>
      </button>
    `).join('');
    tabs.querySelectorAll('.dashboard-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        activeTab = tab.dataset.tab || 'all';
        activeSmartView = '';
        activeDashboardFilter = null;
        currentPage = 1;
        renderAll();
      });
    });
  }

  function renderSmartViews(all) {
    const container = document.getElementById('smartViews');
    if (!container) return;
    const views = getSmartViews(all);
    container.innerHTML = views.map(view => `
      <button class="dashboard-smart-btn${activeSmartView === view.id ? ' active' : ''}" data-smart-view="${view.id}" type="button">
        <span class="dashboard-smart-copy">
          <span class="dashboard-smart-title">${escHtml(view.title)}</span>
          <span class="dashboard-smart-sub">${escHtml(view.description)}</span>
        </span>
        <span class="dashboard-smart-count">${view.count}</span>
      </button>
    `).join('');
    container.querySelectorAll('[data-smart-view]').forEach(button => {
      button.addEventListener('click', () => {
        const next = button.dataset.smartView || '';
        activeSmartView = activeSmartView === next ? '' : next;
        activeTab = 'all';
        activeDashboardFilter = null;
        currentPage = 1;
        renderAll();
      });
    });
  }

  function renderRelationshipGroups(all) {
    const panel = document.getElementById('relationshipGroupsPanel');
    if (!panel) return;
    const current = getNowReadingWork(all);
    const currentRelationship = String(current?.relationship || '').trim();
    const suggestions = currentRelationship ? suggestRelationshipAliases(current, all).slice(0, 3) : [];
    const groups = Object.values(relationshipGroups || {})
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
      .slice(0, 4);
    panel.innerHTML = `
      <div class="relationship-group-current">
        <span>Current pairing</span>
        <strong>${escHtml(currentRelationship || 'Select a work with a relationship tag')}</strong>
      </div>
      ${suggestions.length ? `
        <div class="relationship-group-block">
          <div class="relationship-group-heading">Suggested aliases</div>
          <div class="relationship-suggestion-list">
            ${suggestions.map(item => `
              <button class="relationship-suggestion" data-rel-base="${escHtml(currentRelationship)}" data-rel-add="${escHtml(item.relationship)}" type="button" title="Group this relationship with the current pairing">
                <span>${escHtml(item.relationship)}</span>
                <small>${formatNumber(item.count)} saved</small>
              </button>
            `).join('')}
          </div>
        </div>
      ` : ''}
      ${groups.length ? `
        <div class="relationship-group-block">
          <div class="relationship-group-heading">Saved groups</div>
          <div class="relationship-group-list">
            ${groups.map(group => `
              <div class="relationship-group-item">
                <div>
                  <strong>${escHtml(group.name)}</strong>
                  <span>${formatNumber((group.aliases || []).length)} aliases</span>
                </div>
                <button type="button" data-rel-remove="${escHtml(group.id)}" title="Remove relationship group" aria-label="Remove relationship group">x</button>
              </div>
            `).join('')}
          </div>
        </div>
      ` : '<p class="relationship-group-empty">Approve suggested aliases here when AO3 splits the same pairing across different tags.</p>'}
    `;
  }

  function suggestRelationshipAliases(current, all) {
    const currentRelationship = String(current?.relationship || '').trim();
    if (!currentRelationship) return [];
    const currentKey = relationshipGroupKey(currentRelationship);
    const currentParts = RelationshipCore.relationshipParticipants(currentRelationship);
    if (!currentParts.length) return [];
    const counts = flattenCounts((all || [])
      .filter(work => work.id !== current.id && sharesAnyFandom(work, current))
      .map(work => String(work.relationship || '').trim())
      .filter(Boolean)
      .filter(rel => relationshipGroupKey(rel) !== currentKey)
      .filter(rel => RelationshipCore.relationshipOverlapScore(currentParts, RelationshipCore.relationshipParticipants(rel)) > 0));
    return topEntries(counts, 8)
      .map(entry => ({ relationship: entry.label, count: entry.count, score: RelationshipCore.relationshipOverlapScore(currentParts, RelationshipCore.relationshipParticipants(entry.label)) }))
      .sort((a, b) => b.score - a.score || b.count - a.count || a.relationship.localeCompare(b.relationship));
  }

  function renderWorks(items, filteredCount, totalCount) {
    const list = document.getElementById('dashboardWorkList');
    const empty = document.getElementById('dashboardEmpty');
    if (!list || !empty) return;
    list.innerHTML = '';
    if ((detailWorkId && works[detailWorkId]) || detailAuthor) {
      empty.classList.add('hidden');
      return;
    }
    empty.classList.toggle('hidden', items.length > 0);
    empty.textContent = !totalCount
      ? 'No tracked works yet.'
      : filteredCount
        ? 'No works on this page.'
        : 'No works match this search or view.';
    if (!items.length) return;
    function appendWorkCard(work) {
      const card = document.createElement('article');
      card.className = 'dashboard-work-card';
      card.dataset.workId = work.id;
      card.dataset.status = work.status || '';
      card.classList.toggle('selected', selectedWorkId === work.id);
      card.innerHTML = buildWorkCardHtml(work);
      card.addEventListener('click', e => {
        if (e.target.closest('a, button, input, select, label')) return;
        selectDashboardWork(work.id);
      });
      card.addEventListener('dblclick', e => {
        if (e.target.closest('button, input, select')) return;
        e.preventDefault();
        openWorkDetail(work.id);
      });
      card.querySelector('.dashboard-work-select')?.addEventListener('change', e => {
        if (e.target.checked) selectedWorkIds.add(work.id);
        else selectedWorkIds.delete(work.id);
        renderBulkState(items);
      });
      card.querySelector('.dashboard-work-title')?.addEventListener('click', () => openWorkDetail(work.id));
      card.querySelectorAll('[data-author-name]').forEach(button => {
        button.addEventListener('click', () => openAuthorDetail(button.dataset.authorName || work.author || '', button.dataset.authorUrl || work.authorUrl || ''));
      });
      card.querySelector('.dashboard-remove')?.addEventListener('click', () => removeWork(work.id));
      list.appendChild(card);
    }

    if (groupBy === 'fandom') {
      const fandomMap = new Map();
      items.forEach(work => {
        const fandoms = (work.fandoms || []).filter(Boolean);
        const keys = fandoms.length ? fandoms : ['No fandom'];
        keys.forEach(f => {
          if (!fandomMap.has(f)) fandomMap.set(f, []);
          fandomMap.get(f).push(work);
        });
      });
      [...fandomMap.keys()].sort((a, b) => a.localeCompare(b)).forEach(fandom => {
        const heading = document.createElement('div');
        heading.className = 'dashboard-group-heading';
        heading.textContent = fandom;
        list.appendChild(heading);
        fandomMap.get(fandom)
          .sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')))
          .forEach(appendWorkCard);
      });
    } else {
      const renderItems = groupBy
        ? [...items].sort((a, b) => groupLabelForWork(a, groupBy).localeCompare(groupLabelForWork(b, groupBy)) || String(a.title || '').localeCompare(String(b.title || '')))
        : items;
      let lastGroup = null;
      renderItems.forEach(work => {
        if (groupBy) {
          const group = groupLabelForWork(work, groupBy);
          if (group !== lastGroup) {
            const heading = document.createElement('div');
            heading.className = 'dashboard-group-heading';
            heading.textContent = group;
            list.appendChild(heading);
            lastGroup = group;
          }
        }
        appendWorkCard(work);
      });
    }
  }

  function renderPagination(totalItems) {
    const wrap = document.getElementById('dashboardPagination');
    if (!wrap) return;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    if (totalPages <= 1) {
      wrap.innerHTML = '';
      return;
    }
    const pages = paginationWindow(currentPage, totalPages);
    wrap.innerHTML = `
      <button class="dashboard-page-btn" data-page-action="prev" type="button" ${currentPage <= 1 ? 'disabled' : ''}>Previous</button>
      <div class="dashboard-page-numbers">
        ${pages.map(page => page === 'gap'
          ? '<span class="dashboard-page-gap">...</span>'
          : `<button class="dashboard-page-btn${page === currentPage ? ' active' : ''}" data-page="${page}" type="button">${page}</button>`
        ).join('')}
      </div>
      <button class="dashboard-page-btn" data-page-action="next" type="button" ${currentPage >= totalPages ? 'disabled' : ''}>Next</button>
    `;
    function pageAndScroll() {
      renderAll();
      document.querySelector('.dashboard-library-head')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    wrap.querySelectorAll('[data-page]').forEach(button => {
      button.addEventListener('click', () => {
        currentPage = Number(button.dataset.page) || 1;
        pageAndScroll();
      });
    });
    wrap.querySelector('[data-page-action="prev"]')?.addEventListener('click', () => {
      currentPage = Math.max(1, currentPage - 1);
      pageAndScroll();
    });
    wrap.querySelector('[data-page-action="next"]')?.addEventListener('click', () => {
      currentPage = Math.min(totalPages, currentPage + 1);
      pageAndScroll();
    });
  }

  function selectDashboardWork(workId) {
    selectedWorkId = works[workId] ? workId : '';
    document.querySelectorAll('.dashboard-work-card').forEach(card => {
      card.classList.toggle('selected', card.dataset.workId === selectedWorkId);
    });
    renderNowReadingBar(Object.values(works));
  }

  function getNowReadingWork(all) {
    if (selectedWorkId && works[selectedWorkId]) return works[selectedWorkId];
    return null;
  }

  function getNowBarContent(bar) {
    if (!bar) return null;
    let content = bar.querySelector(':scope > .dashboard-now-content');
    if (!content) {
      content = document.createElement('div');
      content.className = 'dashboard-now-content';
      Array.from(bar.childNodes).forEach(node => {
        if (node !== footerCatStage) content.appendChild(node);
      });
      bar.insertBefore(content, footerCatStage && footerCatStage.parentNode === bar ? footerCatStage : null);
    }
    return content;
  }

  function renderNowReadingBar(all) {
    const bar = document.getElementById('dashboardNowBar');
    if (!bar) return;
    const content = getNowBarContent(bar);
    if (!content) return;
    const work = getNowReadingWork(all);
    if (!work) {
      content.innerHTML = `
        <div class="dashboard-nowbar-empty">
          <span class="dashboard-nowbar-empty-title">No work selected</span>
          <span class="dashboard-nowbar-empty-sub">Click a work card to show reading progress, stats, and quick actions here.</span>
        </div>`;
      return;
    }

    selectedWorkId = work.id;
    document.querySelectorAll('.dashboard-work-card').forEach(card => {
      card.classList.toggle('selected', card.dataset.workId === selectedWorkId);
    });
    const progress = getReadingProgress(work);
    const author = work.author || 'Anonymous';
    const orphaned = isOrphanedWork(work);
    const authorLine = orphaned
      ? `<span class="dashboard-now-author-static">${escHtml(author)} (orphaned work)</span>`
      : `<button class="dashboard-now-author" data-now-action="author" type="button">${escHtml(author)}</button>`;
    const authorWatchAction = (!orphaned && platformHas('authorWatch')) ? `<button class="dashboard-action-icon${isAuthorWatchedForWork(work) ? ' active' : ''}" data-now-action="watch-author" type="button" title="${isAuthorWatchedForWork(work) ? 'Author Watch is active for this author and fandom' : 'Add this author and fandom to Author Watch'}" aria-label="Author Watch">${iconSvg('watch')}</button>` : '';
    const stats = [
      work.wordCount ? `${formatNumber(work.wordCount)} words` : '',
      work.publishedAt ? `Published ${formatDateShort(work.publishedAt)}` : '',
      getStatusDateSummary(work)
    ].filter(Boolean).join(' / ');
    content.innerHTML = `
      <div class="dashboard-now-main">
        <button class="dashboard-now-title" data-now-action="details" type="button">${escHtml(work.title || 'Untitled')}</button>
        <div class="dashboard-now-sub">by ${authorLine} ${labelFor(work.status) ? `&middot; ${escHtml(labelFor(work.status))}` : ''}</div>
        <div class="dashboard-now-stats">${escHtml(stats || 'Open the work page to capture more stats.')}</div>
      </div>
      <div class="dashboard-now-progress">
        <div class="dashboard-progress-track" title="${escHtml(progress.label)}">
          <div class="dashboard-progress-fill" style="--progress:${progress.percent}%"></div>
        </div>
        <div class="dashboard-progress-meta"><span>${escHtml(progress.label)}</span><span>${progress.known ? `${progress.percent}%` : 'Progress unknown'}</span></div>
      </div>
      <div class="dashboard-now-actions">
        ${work.url ? `<a class="dashboard-action-icon" href="${escHtml(work.url)}" target="_blank" rel="noopener noreferrer" title="Open page" aria-label="Open page">${iconSvg('open')}</a>` : ''}
        <button class="dashboard-action-icon" data-now-action="details" type="button" title="Open expanded work view" aria-label="Open expanded work view">${iconSvg('expand')}</button>
        ${authorWatchAction}
        ${platformHas('subscriptions') ? `<button class="dashboard-action-icon${work.subscribedAtAo3 === true ? ' active' : ''}" data-now-action="subscribe" type="button" title="${work.subscribedAtAo3 === true ? 'Subscription detected. Open work to manage it.' : 'Open work to subscribe'}" aria-label="Subscribe">${iconSvg('subscribe')}</button>` : ''}
      </div>
    `;
    content.querySelectorAll('[data-now-action="details"]').forEach(button => {
      button.addEventListener('click', () => openWorkDetail(work.id));
    });
    content.querySelector('[data-now-action="author"]')?.addEventListener('click', () => openAuthorDetail(work.author || '', work.authorUrl || ''));
    content.querySelector('[data-now-action="watch-author"]')?.addEventListener('click', () => toggleAuthorWatchForWork(work));
    content.querySelector('[data-now-action="subscribe"]')?.addEventListener('click', () => openWorkForSubscription(work));
  }

  function openWorkDetail(workId) { WorkDetailController.openWork(workDetailCtx(), workId); }
  function openAuthorDetail(author, authorUrl) { WorkDetailController.openAuthor(workDetailCtx(), author, authorUrl); }
  function closeWorkDetail() { WorkDetailController.close(workDetailCtx()); }

  function workDetailCtx() {
    return {
      getWorks: () => works,
      getWork: id => works[id],
      patchWork: (id, patch) => { if (works[id]) Object.assign(works[id], patch); },
      removeWorkField: (id, field) => { if (works[id]) delete works[id][field]; },
      getCustomCats: () => customCats,
      getAuthorNotes: () => authorNotes,
      setAuthorNotes: n => { authorNotes = n; },
      getAuthorWatches: () => authorWatches,
      getDetailWorkId: () => detailWorkId,
      setDetailWorkId: id => { detailWorkId = id; },
      getDetailAuthor: () => detailAuthor,
      setDetailAuthor: a => { detailAuthor = a; },
      getDetailScrollY: () => _detailScrollY,
      setDetailScrollY: y => { _detailScrollY = y; },
      setSelectedWorkId: id => { selectedWorkId = id; },
      setActiveDashboardFilter: f => { activeDashboardFilter = f; },
      setActiveTab: t => { activeTab = t; },
      setCurrentPage: p => { currentPage = p; },
      saveWorks,
      saveAuthorNotes,
      showToast,
      renderAll,
      openWorkForSubscription,
      toggleAuthorWatchForWork,
      escHtml,
      formatNumber,
      formatDateShort,
      normalizeCompare,
      isOrphanedWork,
      isOrphanAccountAuthor,
      isAuthorWatchedForWork,
      statusColor,
      coverLetters,
      iconSvg,
      labelFor,
      platformHas,
      buildAo3AuthorUrl,
      topEntries,
      flattenCounts,
      normalizeAuthorWatchUrlForDashboard,
      getReadingProgress,
      getDetailUpdatedMeta,
      detailTitleSizeClass,
      fitDetailTitleToTwoLines,
      seriesPartNumber,
      sharesAnyFandom,
      sameRelationship,
      relationshipDisplayName,
      parseAo3Html,
      extractWorkIdFromUrl,
      STATUS_LABELS,
      TrackedWorkCore,
      Ao3PageCore
    };
  }

  function buildWorkCardHtml(work) {
    const fandomTags = (work.fandoms || []).slice(0, 2).map(tag => `<span class="dashboard-tag" title="${escHtml(tag)}">${escHtml(tag)}</span>`).join('');
    const relationshipTag = work.relationship ? `<span class="dashboard-tag dashboard-tag-relationship" title="${escHtml(work.relationship)}">${escHtml(truncate(work.relationship, 44))}</span>` : '';
    const tags = fandomTags || relationshipTag ? `<div class="dashboard-work-tags">${fandomTags}${relationshipTag}</div>` : '';
    const stars = buildStarsHtml(work.rating);
    const statusBadge = buildStatusBadgeHtml(work.status);
    const customChips = buildCustomChipsHtml(work);
    const chapterPill = buildChapterPillHtml(work);
    const addedDate = work.addedAt || work.movedAt ? `Added ${formatDateShort(work.addedAt || work.movedAt)}` : '';
    const meta = [
      work.wordCount ? `${formatNumber(work.wordCount)} words` : '',
      getStatusDateSummary(work),
      addedDate,
      work.subscribedAtAo3 === true ? 'Subscribed' : ''
    ].filter(Boolean).map(item => `<span>${escHtml(item)}</span>`).join('');
    const authorName = work.author || 'Anonymous';
    const author = isOrphanedWork(work)
      ? `<span class="dashboard-work-author-static">${escHtml(authorName)} (orphaned work)</span>`
      : `<button class="dashboard-work-author-link" data-author-name="${escHtml(authorName)}" data-author-url="${escHtml(work.authorUrl || '')}" type="button">${escHtml(authorName)}</button>`;
    const lostDate = work.lostAt ? ` on ${formatDateShort(work.lostAt)}` : '';
    const lostFrom = work.lostFrom ? `, was in ${labelFor(work.lostFrom) || work.lostFrom}` : '';
    const lostNotice = work.status === 'lost'
      ? `<div class="dashboard-lost-notice">Detected unavailable${escHtml(lostDate)}${escHtml(lostFrom)}.</div>`
      : '';
    return `
      <label class="dashboard-work-check" title="Select work">
        <input class="dashboard-work-select" type="checkbox" ${selectedWorkIds.has(work.id) ? 'checked' : ''} />
      </label>
      <div class="dashboard-work-card-body">
        <div class="dashboard-work-main">
          <div class="dashboard-work-title-row">
            <button class="dashboard-work-title" type="button">${escHtml(work.title || 'Untitled')}</button>
            ${stars ? `<div class="dashboard-work-stars" aria-label="${escHtml(work.rating)} out of 5 stars">${stars}</div>` : ''}
          </div>
          <div class="dashboard-work-author">by ${author}</div>
          ${tags}
          <div class="dashboard-work-pill-row">
            ${statusBadge}
            ${customChips ? `<div class="dashboard-custom-chips">${customChips}</div>` : ''}
            ${chapterPill}
          </div>
          <div class="dashboard-work-meta">${meta}</div>
          ${lostNotice}
        </div>
        <div class="dashboard-work-front-actions">
          ${work.url ? `<a class="dashboard-work-open" href="${escHtml(work.url)}" target="_blank" rel="noopener noreferrer" title="Open page" aria-label="Open page">${iconSvg('open')}</a>` : ''}
          <button class="dashboard-remove" type="button" title="Remove from tracker" aria-label="Remove from tracker">${iconSvg('close')}</button>
        </div>
      </div>
    `;
  }

  function buildStarsHtml(rating) {
    const value = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
    if (!value) return '';
    const filled = '<svg class="dashboard-star dashboard-star-filled" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><polygon points="8,1.5 10,6 15,6.5 11.5,10 12.5,15 8,12.5 3.5,15 4.5,10 1,6.5 6,6"/></svg>';
    const empty = '<svg class="dashboard-star dashboard-star-empty" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><polygon points="8,1.5 10,6 15,6.5 11.5,10 12.5,15 8,12.5 3.5,15 4.5,10 1,6.5 6,6"/></svg>';
    return filled.repeat(value) + empty.repeat(5 - value);
  }

  function buildStatusBadgeHtml(status) {
    const label = labelFor(status);
    return label ? `<span class="dashboard-status-badge dashboard-status-${escHtml(status)}">${escHtml(label)}</span>` : '';
  }

  function buildCustomChipsHtml(work) {
    return (work.customCats || [])
      .map(id => customCats[id])
      .filter(Boolean)
      .map(cat => `<span class="dashboard-custom-chip" style="--chip-color:${escHtml(cat.color || '#8b5cf6')}">${escHtml(cat.name)}</span>`)
      .join('');
  }

  function buildChapterPillHtml(work) {
    if (!['progress', 'rereading'].includes(work.status)) return '';
    if (work.furthestChapter) {
      const href = work.furthestChapter.id
        ? `https://archiveofourown.org/works/${work.id}/chapters/${work.furthestChapter.id}`
        : work.url;
      const total = work.furthestChapter.total ? `/${work.furthestChapter.total}` : '';
      return `<a class="dashboard-chapter-pill" href="${escHtml(href || '#')}" target="_blank" rel="noopener noreferrer" title="Open saved chapter progress">Ch. ${escHtml(work.furthestChapter.num)}${escHtml(total)}</a>`;
    }
    return '<span class="dashboard-chapter-pill dashboard-chapter-pill-missing" title="Open or refresh this work page to capture chapter progress.">Ch. -/-</span>';
  }

  function moveSelectedWorks(nextStatus) {
    const ids = selectedIdsInWorks();
    if (!ids.length) {
      showToast('Select works first.');
      return;
    }
    ids.forEach(id => {
      const work = works[id];
      if (!work) return;
      const oldStatus = work.status;
      work.status = nextStatus;
      work.movedAt = Date.now();
      if (typeof TrackedWorkCore.nextFinishedAt === 'function') {
        work.finishedAt = TrackedWorkCore.nextFinishedAt(oldStatus, nextStatus, work.finishedAt);
      }
    });
    saveWorks(ids).then(() => {
      showToast(`Moved ${ids.length} work${ids.length !== 1 ? 's' : ''} to ${labelFor(nextStatus)}.`);
      renderAll();
    });
  }

  function openSelectedWorks() {
    const selected = selectedIdsInWorks().map(id => works[id]).filter(work => work && work.url);
    if (!selected.length) {
      showToast('Select works first.');
      return;
    }
    selected.slice(0, 20).forEach(work => {
      try { chrome.tabs.create({ url: work.url, active: false }); }
      catch (e) { window.open(work.url, '_blank', 'noopener'); }
    });
    showToast(`Opening ${Math.min(selected.length, 20)} work${selected.length !== 1 ? 's' : ''}.`);
  }

  function removeSelectedWorks() {
    const ids = selectedIdsInWorks();
    if (!ids.length) {
      showToast('Select works first.');
      return;
    }
    if (!window.confirm(`Remove ${ids.length} selected work${ids.length !== 1 ? 's' : ''} from tracking?`)) return;
    ids.forEach(id => {
      delete works[id];
      selectedWorkIds.delete(id);
    });
    saveWorks(ids).then(() => {
      showToast(`Removed ${ids.length} work${ids.length !== 1 ? 's' : ''}.`);
      renderAll();
    });
  }

  function removeWork(workId) {
    const work = works[workId];
    if (!work) return;
    if (!window.confirm(`Remove "${work.title || 'this work'}" from tracking?`)) return;
    delete works[workId];
    if (selectedWorkId === workId) selectedWorkId = '';
    selectedWorkIds.delete(workId);
    saveWorks([workId]).then(() => {
      showToast('Work removed.');
      renderAll();
    });
  }

  function buildBuckets(all) {
    if (typeof SidebarCore.buildSidebarBuckets === 'function') return SidebarCore.buildSidebarBuckets(all);
    return all.reduce((acc, work) => {
      if (acc[work.status]) acc[work.status].push(work);
      return acc;
    }, { want: [], progress: [], completed: [], rereading: [], onhold: [], dnf: [], lost: [] });
  }

  function renderBulkState(shown) {
    const shownIds = new Set((shown || []).map(work => work.id));
    selectedWorkIds = new Set([...selectedWorkIds].filter(id => works[id]));
    const selectedShownCount = [...selectedWorkIds].filter(id => shownIds.has(id)).length;
    const selectedTotal = selectedIdsInWorks().length;
    setText('selectedCount', `${selectedTotal} selected`);
    const selectAll = document.getElementById('selectAllShown');
    if (selectAll) {
      selectAll.checked = shownIds.size > 0 && selectedShownCount === shownIds.size;
      selectAll.indeterminate = selectedShownCount > 0 && selectedShownCount < shownIds.size;
    }
    ['openSelectedBtn', 'removeSelectedBtn', 'bulkStatusSelect'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.disabled = selectedTotal === 0;
    });
    const bulkActions = document.getElementById('dashboardBulkActions');
    if (bulkActions) bulkActions.classList.toggle('hidden', selectedTotal === 0);
  }

  function selectedIdsInWorks() {
    return [...selectedWorkIds].filter(id => !!works[id]);
  }

  function getSmartViews(all) {
    return [
      {
        id: 'stale-incomplete',
        title: 'Incomplete, not checked in 30 days',
        description: 'Unfinished works not availability-checked in 30 days.',
        count: filterSmartView(all, 'stale-incomplete').length
      },
      {
        id: 'missing-metadata',
        title: 'Missing metadata',
        description: 'Saved works missing fandoms, words, dates, or stats.',
        count: filterSmartView(all, 'missing-metadata').length
      },
      {
        id: 'lost-works',
        title: 'Unavailable / Deleted',
        description: 'Tracked works that are no longer available.',
        count: filterSmartView(all, 'lost-works').length
      }
    ];
  }

  function filterSmartView(all, viewId) {
    const list = Array.isArray(all) ? all : [];
    if (viewId === 'new-chapters') return list.filter(isLikelyNewChapterWork);
    if (viewId === 'stale-incomplete') return list.filter(isStaleIncompleteWork);
    if (viewId === 'missing-metadata') return list.filter(isMissingMetadataWork);
    if (viewId === 'lost-works') return list.filter(work => work.status === 'lost');
    return list;
  }

  function filterDashboardView(all, filter) {
    const list = Array.isArray(all) ? all : [];
    if (!filter || !filter.type) return list;
    if (filter.type === 'subscribed') return list.filter(work => work.subscribedAtAo3 === true);
    if (filter.type === 'added-this-month') return list.filter(work => isThisMonth(work.addedAt || work.movedAt));
    if (filter.type === 'completed-this-month') return list.filter(work => isThisMonth(work.completedAt || work.inferredCompletedAt));
    if (filter.type === 'fandom') {
      const needle = normalizeCompare(filter.value);
      return list.filter(work => (work.fandoms || []).some(fandom => normalizeCompare(fandom) === needle));
    }
    if (filter.type === 'relationship') {
      return list.filter(work => sameRelationshipValue(work.relationship, filter.value));
    }
    return list;
  }

  function filterLibraryFacets(all, filters) {
    const list = Array.isArray(all) ? all : [];
    const f = filters || {};
    return list.filter(work => {
      if (f.fandom && !(work.fandoms || []).some(fandom => fandom === f.fandom)) return false;
      if (f.author && (work.author || 'Anonymous') !== f.author) return false;
      if (f.relationship && !sameRelationshipValue(work.relationship, f.relationship)) return false;
      if (f.rating) {
        const rating = Number(work.rating) || 0;
        if (f.rating === 'unrated') {
          if (rating > 0) return false;
        } else if (rating !== Number(f.rating)) {
          return false;
        }
      }
      if (f.metadata) {
        if (f.metadata === 'missing' && !isMissingMetadataWork(work)) return false;
        if (f.metadata === 'complete' && isMissingMetadataWork(work)) return false;
        if (f.metadata === 'has-notes' && !String(work.notes || '').trim()) return false;
        if (f.metadata === 'no-notes' && String(work.notes || '').trim()) return false;
      }
      if (f.subscription) {
        if (f.subscription === 'subscribed' && work.subscribedAtAo3 !== true) return false;
        if (f.subscription === 'not-subscribed' && work.subscribedAtAo3 === true) return false;
      }
      return true;
    });
  }

  function isLikelyNewChapterWork(work) {
    if (!work || ['completed', 'dnf', 'lost'].includes(work.status)) return false;
    const furthestChapter = Number(work.furthestChapter && work.furthestChapter.num) || 0;
    if (!furthestChapter) return false;
    const postedChapterCount = Number(work.chaptersCurrent || work.chapterCount) || 0;
    if (!postedChapterCount) return false;
    return postedChapterCount > furthestChapter;
  }

  function isStaleIncompleteWork(work) {
    if (!work || ['completed', 'dnf', 'lost'].includes(work.status)) return false;
    const checked = Number(work.lastChecked) || 0;
    return !checked || (Date.now() - checked) > 30 * 24 * 60 * 60 * 1000;
  }

  function isMissingMetadataWork(work) {
    if (!work) return false;
    const title = String(work.title || '').trim();
    const author = String(work.author || '').trim();
    const url = String(work.url || '');
    const hasUsableTitle = !!title && !title.startsWith('Work ');
    const hasUsableAuthor = !!author && author !== 'Anonymous';
    const hasUsableUrl = /^https:\/\/archiveofourown\.org\/(?:collections\/[^/]+\/)?works\/\d+/.test(url);
    const hasFandoms = Array.isArray(work.fandoms) && work.fandoms.some(fandom => String(fandom || '').trim());
    const hasWorkSize = Number(work.wordCount) > 0;
    const hasAnyAo3Date = !!(Number(work.updatedAt) || Number(work.publishedAt) || Number(work.completedAt) || Number(work.inferredCompletedAt));
    const hasAnyStats = [work.kudosCount, work.bookmarksCount, work.hitsCount].some(value => Number(value) > 0);
    return !hasUsableTitle || !hasUsableAuthor || !hasUsableUrl || !hasFandoms || !hasWorkSize || (!hasAnyAo3Date && !hasAnyStats);
  }

  function smartViewLabel(viewId) {
    const view = getSmartViews(Object.values(works)).find(item => item.id === viewId);
    return view ? view.title : 'Smart View';
  }

  function renderAuthorWatchSection() {
    if (typeof AuthorWatchPopupController.renderSavedAuthorWatches === 'function') {
      AuthorWatchPopupController.renderSavedAuthorWatches(authorWatchContext());
    }
    if (typeof AuthorWatchPopupController.renderAuthorWatchMatches === 'function') {
      AuthorWatchPopupController.renderAuthorWatchMatches(authorWatchContext());
    }
    applyAuthorWatchSectionCollapseState();
  }

  function applyAuthorWatchSectionCollapseState() {
    const section = document.getElementById('authorWatchSection');
    const toggle = document.getElementById('authorWatchCollapseToggle');
    if (!section || !toggle) return;
    section.classList.toggle('dashboard-section-collapsed', authorWatchCollapsed);
    toggle.setAttribute('aria-expanded', authorWatchCollapsed ? 'false' : 'true');
    toggle.setAttribute('aria-label', authorWatchCollapsed ? 'Expand Author Watch' : 'Collapse Author Watch');
    toggle.setAttribute('title', authorWatchCollapsed ? 'Expand Author Watch' : 'Collapse Author Watch');
  }

  function applyCustomCategoriesSectionCollapseState() {
    const section = document.getElementById('customCategoriesSection');
    const toggle = document.getElementById('customCategoriesCollapseToggle');
    if (!section || !toggle) return;
    section.classList.toggle('dashboard-section-collapsed', customCategoriesCollapsed);
    toggle.setAttribute('aria-expanded', customCategoriesCollapsed ? 'false' : 'true');
    toggle.setAttribute('aria-label', customCategoriesCollapsed ? 'Expand Custom Categories' : 'Collapse Custom Categories');
    toggle.setAttribute('title', customCategoriesCollapsed ? 'Expand Custom Categories' : 'Collapse Custom Categories');
  }

  function applyHiddenRulesSectionCollapseState() {
    const section = document.getElementById('hiddenRulesSection');
    const toggle = document.getElementById('hiddenRulesCollapseToggle');
    if (!section || !toggle) return;
    section.classList.toggle('dashboard-section-collapsed', hiddenRulesCollapsed);
    toggle.setAttribute('aria-expanded', hiddenRulesCollapsed ? 'false' : 'true');
    toggle.setAttribute('aria-label', hiddenRulesCollapsed ? 'Expand Hidden Tags' : 'Collapse Hidden Tags');
    toggle.setAttribute('title', hiddenRulesCollapsed ? 'Expand Hidden Tags' : 'Collapse Hidden Tags');
  }

  function addHiddenRuleFromDashboard(forcedType) {
    const typeSelect = document.getElementById('hiddenRuleType');
    const valueInput = document.getElementById('hiddenRuleValue');
    const normalizedType = HiddenRulesCore.normalizeRuleType?.(forcedType || typeSelect?.value || '') || '';
    if (!normalizedType) return;
    const rawValue = normalizedType === 'crossover' ? '' : String(valueInput?.value || '').trim();
    const rule = HiddenRulesCore.sanitizeRule?.({ type: normalizedType, value: rawValue });
    if (!rule) {
      valueInput?.focus();
      showToast('Add an exact value first.');
      return;
    }
    const nextRules = { ...(hiddenRules || {}) };
    const duplicate = Object.values(nextRules).some(existing => {
      if (!existing || existing.type !== rule.type) return false;
      if (rule.type === 'crossover') return true;
      return (existing.authorUrl || existing.normalizedValue) === (rule.authorUrl || rule.normalizedValue);
    });
    if (duplicate) {
      showToast('That hidden rule already exists.');
      return;
    }
    nextRules[rule.id] = rule;
    setHiddenRules(nextRules).then(() => {
      if (valueInput) valueInput.value = '';
      renderHiddenRuleSection();
      showToast(`Hidden rule added for ${HiddenRulesCore.ruleDisplayValue?.(rule, hiddenRulePrefs) || rule.value || 'crossover'}.`);
    });
  }

  function removeHiddenRule(ruleId) {
    if (!ruleId || !hiddenRules[ruleId]) return;
    const nextRules = { ...(hiddenRules || {}) };
    const label = HiddenRulesCore.ruleDisplayValue?.(nextRules[ruleId], hiddenRulePrefs) || nextRules[ruleId].value || 'rule';
    delete nextRules[ruleId];
    setHiddenRules(nextRules).then(() => {
      renderHiddenRuleSection();
      showToast(`Removed hidden rule for ${label}.`);
    });
  }

  function authorWatchContext() {
    return {
      window,
      document,
      chrome,
      getCurrentWork: () => null,
      getWorksMap: () => works,
      getAuthorWatches: () => authorWatches,
      setAuthorWatches: next => { authorWatches = next || {}; },
      getAuthorWatchMatches: () => authorWatchMatches,
      setAuthorWatchMatches: next => { authorWatchMatches = Array.isArray(next) ? next : []; },
      saveAuthorWatches,
      saveAuthorWatchMatches,
      renderAll,
      showToast,
      parseAo3Html,
      waitMs,
      escHtml,
      truncate
    };
  }

  function bookmarkImportContext() {
    return {
      window,
      document,
      getBookmarkImportState: () => bookmarkImportState,
      setBookmarkImportState: next => { bookmarkImportState = next || makeBookmarkImportState(); },
      getBookmarkSyncState: () => currentBookmarkSyncState(),
      setBookmarkSyncState: next => {
        bookmarkSyncStates[normalizeSyncAccountKey(bookmarkSyncAccount)] = normalizeSyncState(next);
      },
      setBookmarkSyncAccount: account => {
        bookmarkSyncAccount = normalizeSyncAccountKey(account);
        if (!bookmarkSyncStates[bookmarkSyncAccount]) bookmarkSyncStates[bookmarkSyncAccount] = normalizeSyncState({});
      },
      getWorksMap: () => works,
      getCustomCats,
      saveWorks,
      saveBookmarkSyncState,
      renderAll,
      showToast,
      parseAo3Html,
      waitMs,
      escHtml
    };
  }

  function markedForLaterImportContext() {
    return {
      window,
      document,
      getMflImportState: () => markedForLaterImportState,
      setMflImportState: next => { markedForLaterImportState = next || makeMarkedForLaterImportState(); },
      getMflSyncState: () => currentMflSyncState(),
      setMflSyncState: next => {
        markedForLaterSyncStates[normalizeSyncAccountKey(markedForLaterSyncAccount)] = normalizeSyncState(next);
      },
      setMflSyncAccount: account => {
        markedForLaterSyncAccount = normalizeSyncAccountKey(account);
        if (!markedForLaterSyncStates[markedForLaterSyncAccount]) markedForLaterSyncStates[markedForLaterSyncAccount] = normalizeSyncState({});
      },
      getWorksMap: () => works,
      getCustomCats,
      saveWorks,
      saveMflSyncState,
      renderAll,
      showToast,
      parseAo3Html,
      waitMs,
      escHtml
    };
  }

  function customCatsContext() {
    return {
      getCustomCats,
      setCustomCats,
      genCatId,
      getWorks: () => works,
      saveWorks,
      pruneWork: workId => {
        if (typeof TrackedWorkCore.pruneTrackedWorkIfInvalid === 'function') {
          return TrackedWorkCore.pruneTrackedWorkIfInvalid(works, workId);
        }
        return false;
      },
      showToast,
      renderAll,
      escHtml
    };
  }

  function subscriptionRefreshContext() {
    return {
      getWorks: () => works,
      saveWorks,
      showToast,
      renderAll,
      waitMs,
      extractWorkIdFromUrl,
      looksLikeAo3BotBlock: html => AuthorWatchCore.looksLikeAo3BotBlock?.(html) || false
    };
  }

  function makeBookmarkImportState() {
    return {
      open: false,
      loading: false,
      canceled: false,
      resumable: false,
      completed: false,
      quickMode: false,
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

  function makeMarkedForLaterImportState() {
    return {
      open: false,
      loading: false,
      canceled: false,
      resumable: false,
      completed: false,
      quickMode: false,
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

  function normalizeSyncState(raw) {
    return {
      knownWorkIds: Array.isArray(raw && raw.knownWorkIds)
        ? [...new Set(raw.knownWorkIds.map(id => String(id || '').trim()).filter(Boolean))].slice(-5000)
        : [],
      lastFetchedAt: Number(raw && raw.lastFetchedAt) || null
    };
  }

  function normalizeSyncAccountKey(value) {
    return String(value || 'default').trim().toLowerCase() || 'default';
  }

  function parseStoredSyncStates(raw, normalizer) {
    if (raw && typeof raw === 'object' && raw.accounts && typeof raw.accounts === 'object') {
      const states = {};
      Object.entries(raw.accounts).forEach(([account, state]) => {
        states[normalizeSyncAccountKey(account)] = normalizer(state || {});
      });
      return Object.keys(states).length ? states : { default: normalizer({}) };
    }
    return { default: normalizer(raw || {}) };
  }

  function serializeSyncStates(states) {
    return { accounts: states && typeof states === 'object' ? states : {} };
  }

  function currentBookmarkSyncState() {
    const key = normalizeSyncAccountKey(bookmarkSyncAccount);
    return bookmarkSyncStates[key] || { knownWorkIds: [], lastFetchedAt: null };
  }

  function currentMflSyncState() {
    const key = normalizeSyncAccountKey(markedForLaterSyncAccount);
    return markedForLaterSyncStates[key] || { knownWorkIds: [], lastFetchedAt: null };
  }

  function parseAo3Html(html) {
    const coreSanitized = typeof AuthorWatchCore.sanitizeFetchedAo3Html === 'function'
      ? AuthorWatchCore.sanitizeFetchedAo3Html(html)
      : stripFetchedAo3HtmlLocally(html);
    const sanitized = stripFetchedAo3HtmlLocally(coreSanitized);
    const parsed = new DOMParser().parseFromString(sanitized, 'text/html');
    removeFetchedAo3ResourceLoads(parsed);
    const doc = document.implementation.createHTMLDocument('ao3-fetched');
    doc.body.append(...Array.from(parsed.body.childNodes).map(node => node.cloneNode(true)));
    removeFetchedAo3ResourceLoads(doc);
    const base = doc.createElement('base');
    base.href = 'https://archiveofourown.org/';
    doc.head.prepend(base);
    return doc;
  }

  function stripFetchedAo3HtmlLocally(html) {
    const raw = String(html || '');
    const bodyMatch = raw.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    return (bodyMatch ? bodyMatch[1] : raw)
      .replace(/<!doctype\b[^>]*>/gi, '')
      .replace(/<head\b[\s\S]*?<\/head\s*>/gi, '')
      .replace(/<script\b[\s\S]*?<\/script\s*>/gi, '')
      .replace(/<script\b[^>]*(?:\/\s*)?>/gi, '')
      .replace(/<style\b[\s\S]*?<\/style\s*>/gi, '')
      .replace(/<style\b[^>]*(?:\/\s*)?>/gi, '')
      .replace(/<noscript\b[\s\S]*?<\/noscript\s*>/gi, '')
      .replace(/<noscript\b[^>]*(?:\/\s*)?>/gi, '')
      .replace(/<(?:video|audio|picture|object|iframe|embed)\b[\s\S]*?<\/(?:video|audio|picture|object|iframe|embed)\s*>/gi, '')
      .replace(/<(?:link|meta|base|iframe|embed|img|source|track)\b[^>]*(?:\/\s*)?>/gi, '')
      .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/\s+(?:src|srcset|poster|ping|integrity|crossorigin|nonce)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  }

  function removeFetchedAo3ResourceLoads(doc) {
    if (!doc || typeof doc.querySelectorAll !== 'function') return;
    doc.querySelectorAll('script, link, meta, style, noscript, iframe, embed, object, img, source, track, video, audio, picture')
      .forEach(node => node.remove());
    doc.querySelectorAll('*').forEach(node => {
      Array.from(node.attributes || []).forEach(attr => {
        const name = String(attr.name || '').toLowerCase();
        if (name.startsWith('on') || ['src', 'srcset', 'poster', 'ping'].includes(name)) {
          node.removeAttribute(attr.name);
        }
      });
    });
  }

  function waitMs(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function extractWorkIdFromUrl(url) {
    return AuthorWatchCore.extractWorkIdFromUrl?.(url) ||
      ((String(url || '').match(/archiveofourown\.org\/(?:collections\/[^/]+\/)?works\/(\d+)/) || [])[1] || null);
  }

  function labelFor(status) {
    return STATUS_LABELS[status] || '';
  }

  function nextTheme(current) {
    const index = THEME_CYCLE.indexOf(current);
    return THEME_CYCLE[((index >= 0 ? index : 0) + 1) % THEME_CYCLE.length];
  }

  function dashboardFilterLabel() {
    if (!activeDashboardFilter) return '';
    if (activeDashboardFilter.type === 'subscribed') return 'Subscribed Works';
    if (activeDashboardFilter.type === 'added-this-month') return 'Added This Month';
    if (activeDashboardFilter.type === 'completed-this-month') return 'Completed This Month';
    if (activeDashboardFilter.type === 'fandom') return `Fandom: ${activeDashboardFilter.value || 'Unknown'}`;
    if (activeDashboardFilter.type === 'relationship') return `Relationship: ${activeDashboardFilter.value || 'Unknown'}`;
    return '';
  }

  function libraryFilterLabels() {
    const labels = [];
    if (libraryFilters.fandom) labels.push(`Fandom: ${libraryFilters.fandom}`);
    if (libraryFilters.author) labels.push(`Author: ${libraryFilters.author}`);
    if (libraryFilters.relationship) labels.push(`Relationship: ${libraryFilters.relationship}`);
    if (libraryFilters.rating) labels.push(libraryFilters.rating === 'unrated' ? 'Unrated' : `${libraryFilters.rating} stars`);
    if (libraryFilters.metadata) {
      const metadataLabels = {
        missing: 'Missing metadata',
        complete: 'Metadata complete',
        'has-notes': 'Has notes',
        'no-notes': 'No notes'
      };
      labels.push(metadataLabels[libraryFilters.metadata] || libraryFilters.metadata);
    }
    if (libraryFilters.subscription) labels.push(libraryFilters.subscription === 'subscribed' ? 'Subscribed' : 'Not subscribed');
    return labels;
  }

  function activeFilterChips() {
    const chips = [];
    if (activeTab !== 'all') chips.push({ key: 'tab', label: `Category: ${tabLabelFor(activeTab)}` });
    if (activeSmartView) chips.push({ key: 'smart', label: smartViewLabel(activeSmartView) });
    const dashboardLabel = dashboardFilterLabel();
    if (dashboardLabel) chips.push({ key: 'dashboard', label: dashboardLabel });
    if (searchQuery) chips.push({ key: 'search', label: `Search: ${searchQuery}` });
    if (libraryFilters.fandom) chips.push({ key: 'fandom', label: `Fandom: ${libraryFilters.fandom}` });
    if (libraryFilters.author) chips.push({ key: 'author', label: `Author: ${libraryFilters.author}` });
    if (libraryFilters.relationship) chips.push({ key: 'relationship', label: `Relationship: ${libraryFilters.relationship}` });
    if (libraryFilters.rating) chips.push({ key: 'rating', label: libraryFilters.rating === 'unrated' ? 'Unrated' : `${libraryFilters.rating} stars` });
    if (libraryFilters.metadata) {
      const labels = {
        missing: 'Missing metadata',
        complete: 'Metadata complete',
        'has-notes': 'Has notes',
        'no-notes': 'No notes'
      };
      chips.push({ key: 'metadata', label: labels[libraryFilters.metadata] || libraryFilters.metadata });
    }
    if (libraryFilters.subscription) chips.push({ key: 'subscription', label: libraryFilters.subscription === 'subscribed' ? 'Subscribed' : 'Not subscribed' });
    if (groupBy) chips.push({ key: 'group', label: `Grouped by ${groupBy}` });
    return chips;
  }

  function clearFilterChip(key) {
    if (key === 'tab') activeTab = 'all';
    if (key === 'smart') activeSmartView = '';
    if (key === 'dashboard') activeDashboardFilter = null;
    if (key === 'search') {
      searchQuery = '';
      const search = document.getElementById('dashboardSearch');
      if (search) search.value = '';
    }
    if (['fandom', 'author', 'relationship', 'rating', 'metadata', 'subscription'].includes(key)) {
      libraryFilters = { ...libraryFilters, [key]: '' };
    }
    if (key === 'group') groupBy = '';
  }

  function tabLabelFor(tabId) {
    const builtin = BUILTIN_TABS.find(([id]) => id === tabId);
    if (builtin) return builtin[1];
    return customCats?.[tabId]?.name || tabId;
  }

  function hasAnyLibraryFilter() {
    return Object.values(libraryFilters || {}).some(Boolean);
  }

  function groupLabelForWork(work, key) {
    if (key === 'status') return labelFor(work.status) || 'Uncategorized';
    if (key === 'fandom') return (work.fandoms || []).find(Boolean) || 'No fandom';
    if (key === 'author') return work.author || 'Anonymous';
    if (key === 'rating') return work.rating ? `${work.rating} stars` : 'Unrated';
    if (key === 'metadata') return isMissingMetadataWork(work) ? 'Missing metadata' : 'Metadata complete';
    if (key === 'subscription') return work.subscribedAtAo3 === true ? 'Subscribed' : 'Not subscribed';
    return '';
  }

  function getReadingProgress(work, options = {}) {
    const chapter = work?.furthestChapter || {};
    const current = Number(chapter.num || work?.chaptersCurrent) || 0;
    const total = Number(chapter.total || work?.chaptersTotal) || 0;
    const shouldDisplayCompletedAsFull = options.completedAsFull === true && work?.status === 'completed';
    const completedDisplayTotal = total || current;
    if (shouldDisplayCompletedAsFull && completedDisplayTotal > 0) {
      return {
        known: true,
        percent: 100,
        label: `${completedDisplayTotal} out of ${completedDisplayTotal} chapters`,
      };
    }
    if (current > 0 && total > 0) {
      const percent = Math.max(0, Math.min(100, Math.round((current / total) * 100)));
      return { known: true, percent, label: `Chapter ${current} of ${total}` };
    }
    if (current > 0) return { known: true, percent: 8, label: `Chapter ${current}` };
    return { known: false, percent: 0, label: 'No saved chapter progress yet' };
  }

  function statusColor(status) {
    return STATUS_COLORS[status] || CHART_COLORS[0];
  }

  function seriesPartNumber(position) {
    const text = String(position || '');
    const match = text.match(/(?:part\s*)?(\d+)/i);
    return match ? Number(match[1]) || 0 : 0;
  }

  function coverLetters(text) {
    const words = String(text || '').trim().split(/\s+/).filter(Boolean);
    if (!words.length) return 'FG';
    return words.map(word => word[0]).join('').toUpperCase();
  }

  function detailTitleSizeClass(title) {
    const length = String(title || '').trim().length;
    if (length > 120) return 'dashboard-detail-title-tiny';
    if (length > 86) return 'dashboard-detail-title-compact';
    if (length > 52) return 'dashboard-detail-title-long';
    return '';
  }

  function fitDetailTitleToTwoLines(root) {
    const title = root?.querySelector?.('#dashboardDetailTitle');
    if (!title) return;
    title.style.fontSize = '';
    window.requestAnimationFrame(() => {
      const width = title.clientWidth;
      if (!width) return;
      const baseStyle = window.getComputedStyle(title);
      let size = parseFloat(baseStyle.fontSize) || 34;
      const minSize = window.matchMedia?.('(max-width: 640px)')?.matches ? 15 : 17;
      const clone = title.cloneNode(true);
      clone.removeAttribute('id');
      clone.style.position = 'absolute';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      clone.style.visibility = 'hidden';
      clone.style.pointerEvents = 'none';
      clone.style.width = `${width}px`;
      clone.style.maxWidth = `${width}px`;
      clone.style.display = 'block';
      clone.style.webkitLineClamp = 'unset';
      clone.style.lineClamp = 'unset';
      clone.style.webkitBoxOrient = 'initial';
      clone.style.overflow = 'visible';
      document.body.appendChild(clone);
      try {
        while (size > minSize) {
          clone.style.fontSize = `${size}px`;
          const cloneStyle = window.getComputedStyle(clone);
          const lineHeight = parseFloat(cloneStyle.lineHeight) || size * 1.18;
          if (clone.scrollHeight <= (lineHeight * 2) + 3) break;
          size -= 1;
        }
        title.style.fontSize = `${Math.max(minSize, Math.floor(size))}px`;
      } finally {
        clone.remove();
      }
    });
  }

  function isAuthorWatchedForWork(work) {
    if (!work || isOrphanedWork(work)) return false;
    const authorUrl = normalizeAuthorWatchUrlForDashboard(work.authorUrl);
    const fandom = firstFandomForWork(work);
    const fandomKey = normalizeWatchFandomForDashboard(fandom);
    if (!authorUrl || !fandomKey) return false;
    return Object.values(authorWatches || {}).some(watch =>
      normalizeAuthorWatchUrlForDashboard(watch.authorUrl) === authorUrl &&
      normalizeWatchFandomForDashboard(watch.fandom) === fandomKey
    );
  }

  function isOrphanAccountAuthor(author, authorUrl) {
    if (typeof TrackedWorkCore.isOrphanAccountAuthor === 'function') {
      return TrackedWorkCore.isOrphanAccountAuthor(author, authorUrl);
    }
    const name = String(author || '').trim().toLowerCase();
    const url = String(authorUrl || '').toLowerCase();
    return name === 'orphan_account' || /\/users\/orphan_account(?:\/|$)/.test(url);
  }

  function isOrphanedWork(work) {
    return !!(work && (work.isOrphaned === true || isOrphanAccountAuthor(work.author, work.authorUrl)));
  }

  function toggleAuthorWatchForWork(work) {
    if (!work) return;
    if (isOrphanedWork(work)) {
      showToast('Author Watch is disabled for orphaned AO3 works.');
      return;
    }
    const authorUrl = normalizeAuthorWatchUrlForDashboard(work.authorUrl);
    const fandom = firstFandomForWork(work);
    const fandomKey = normalizeWatchFandomForDashboard(fandom);
    if (!authorUrl || !work.author || !fandom || !fandomKey) {
      showToast('This work needs an author URL and fandom before it can be added to Author Watch.');
      return;
    }
    const existing = Object.values(authorWatches || {}).find(watch =>
      normalizeAuthorWatchUrlForDashboard(watch.authorUrl) === authorUrl &&
      normalizeWatchFandomForDashboard(watch.fandom) === fandomKey
    );
    if (existing) {
      showToast('Author Watch is already active for this author and fandom.');
      return;
    }
    const id = `watch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    authorWatches = {
      ...(authorWatches || {}),
      [id]: {
        id,
        author: String(work.author || '').trim(),
        authorUrl,
        fandom,
        fandomKey,
        fandomId: '',
        knownWorkIds: work.id ? [String(work.id)] : [],
        createdAt: Date.now(),
        lastCheckedAt: null,
        baselineReady: false
      }
    };
    saveAuthorWatches().then(() => {
      showToast(`Author Watch added for ${work.author}.`);
      renderAll();
    });
  }

  function openWorkForSubscription(work) {
    if (!work?.url) {
      showToast('This work needs an AO3 URL first.');
      return;
    }
    try { chrome.tabs.create({ url: work.url, active: true }); }
    catch (e) { window.open(work.url, '_blank', 'noopener'); }
    showToast('Open the AO3 work page to manage subscription.');
  }

  function firstFandomForWork(work) {
    return (work?.fandoms || []).find(fandom => String(fandom || '').trim()) || '';
  }

  function sharesAnyFandom(a, b) {
    const aFandoms = new Set((a?.fandoms || []).map(normalizeCompare).filter(Boolean));
    return (b?.fandoms || []).map(normalizeCompare).some(fandom => aFandoms.has(fandom));
  }

  function sameRelationship(a, b) {
    return sameRelationshipValue(a?.relationship, b?.relationship);
  }

  function sameRelationshipValue(a, b) {
    const left = relationshipGroupKey(a);
    const right = relationshipGroupKey(b);
    return !!left && left === right;
  }

  function relationshipFacetEntries(all) {
    const counts = new Map();
    (all || []).forEach(work => {
      const rel = String(work.relationship || '').trim();
      if (!rel) return;
      const label = relationshipDisplayName(rel);
      counts.set(label, (counts.get(label) || 0) + 1);
    });
    return topEntries(counts, 120);
  }

  function addRelationshipAlias(baseRelationship, aliasRelationship) {
    const base = String(baseRelationship || '').trim();
    const alias = String(aliasRelationship || '').trim();
    if (!base || !alias || RelationshipCore.normalizeRelationship(base) === RelationshipCore.normalizeRelationship(alias)) return;
    const baseGroup = findRelationshipGroup(base);
    const aliasGroup = findRelationshipGroup(alias);
    const aliases = RelationshipCore.uniqueRelationshipAliases([
      ...(baseGroup?.aliases || [base]),
      ...(aliasGroup?.aliases || [alias]),
      base,
      alias
    ]);
    const id = baseGroup?.id || aliasGroup?.id || `rel-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const nextGroups = { ...(relationshipGroups || {}) };
    if (baseGroup && baseGroup.id !== id) delete nextGroups[baseGroup.id];
    if (aliasGroup && aliasGroup.id !== id) delete nextGroups[aliasGroup.id];
    nextGroups[id] = {
      id,
      name: RelationshipCore.chooseRelationshipGroupName(aliases, base),
      aliases,
      createdAt: Number(baseGroup?.createdAt || aliasGroup?.createdAt) || Date.now(),
      updatedAt: Date.now()
    };
    relationshipGroups = RelationshipCore.sanitizeRelationshipGroups(nextGroups);
    saveRelationshipGroups().then(() => {
      showToast('Relationship alias grouped.');
      renderAll();
    });
  }

  function removeRelationshipGroup(groupId) {
    if (!groupId || !relationshipGroups[groupId]) return;
    if (!window.confirm(`Remove relationship group "${relationshipGroups[groupId].name || 'this group'}"?`)) return;
    const next = { ...(relationshipGroups || {}) };
    delete next[groupId];
    relationshipGroups = RelationshipCore.sanitizeRelationshipGroups(next);
    saveRelationshipGroups().then(() => {
      showToast('Relationship group removed.');
      renderAll();
    });
  }

  function findRelationshipGroup(rel) { return RelationshipCore.findRelationshipGroup(rel, relationshipGroups); }
  function relationshipDisplayName(rel) { return RelationshipCore.relationshipDisplayName(rel, relationshipGroups); }
  function relationshipGroupKey(rel) { return RelationshipCore.relationshipGroupKey(rel, relationshipGroups); }

  function normalizeAuthorWatchUrlForDashboard(url) {
    if (typeof AuthorWatchCore.normalizeAuthorWatchUrl === 'function') return AuthorWatchCore.normalizeAuthorWatchUrl(url);
    const raw = String(url || '').trim();
    if (!raw) return '';
    try {
      const u = new URL(raw, 'https://archiveofourown.org/');
      u.hash = '';
      u.search = '';
      u.pathname = u.pathname.replace(/\/works\/?$/i, '').replace(/\/+$/, '');
      return u.href.replace(/\/+$/, '');
    } catch (e) {
      return raw.replace(/[?#].*$/, '').replace(/\/works\/?$/i, '').replace(/\/+$/, '');
    }
  }

  function normalizeWatchFandomForDashboard(fandom) {
    return typeof AuthorWatchCore.normalizeWatchFandom === 'function'
      ? AuthorWatchCore.normalizeWatchFandom(fandom)
      : String(fandom || '').trim().toLowerCase();
  }

  function initFooterCompanion() {
    const bar = document.getElementById('dashboardNowBar');
    if (!bar) return;

    footerCatStage = document.createElement('div');
    footerCatStage.className = 'footer-cat-stage';
    const actor = document.createElement('div');
    actor.className = 'footer-cat-actor';
    footerCatStage.appendChild(actor);
    bar.appendChild(footerCatStage);

    const WALK_MS  = 28000;
    const SIT_MS   = 22000;
    const PAUSE_MS = 3000;
    let companionToken = 0;
    let activeCompanion = '';
    const companionTimers = new Set();

    const CAT_SLEEP_HTML = '<div class="footer-cat-sleep-wrap"><div class="cat-zzz-wrap" aria-hidden="true"><span class="cat-z cat-z1">z</span><span class="cat-z cat-z2">z</span><span class="cat-z cat-z3">Z</span></div><div class="cat-heart-wrap" aria-hidden="true"><span class="cat-heart cat-heart-1">♥</span><span class="cat-heart cat-heart-2">♥</span><span class="cat-heart cat-heart-3">♥</span></div><img class="cat-companion-img" src="icons/noun-sleeping-cat-196644.svg" alt="" aria-hidden="true" /></div>';

    const BROCCOLI_IMG_HTML = '<img class="broccoli-companion-img" src="icons/broccoli-svgrepo-com.svg" alt="" aria-hidden="true" />';
    const BROCCOLI_REST_HTML = `<div class="broccoli-sit-wrap"><div class="broccoli-surprise-marks" aria-hidden="true"><span>!</span><span>!</span><span>!</span></div><div class="broccoli-face-wrap">${BROCCOLI_IMG_HTML}<span class="broccoli-blush broccoli-blush-left"></span><span class="broccoli-blush broccoli-blush-right"></span></div></div>`;

    function setCompanionTimer(callback, delay) {
      const timer = setTimeout(() => {
        companionTimers.delete(timer);
        callback();
      }, delay);
      companionTimers.add(timer);
      return timer;
    }

    function clearCompanion() {
      companionToken++;
      companionTimers.forEach(timer => clearTimeout(timer));
      companionTimers.clear();
      actor.onclick = null;
      actor.title = '';
      actor.className = 'footer-cat-actor';
      actor.innerHTML = '';
      activeCompanion = '';
      companionRunning = false;
    }

    function doWalk(innerHtml, onDone, walkDistancePx) {
      actor.className = 'footer-cat-actor is-walking';
      actor.style.setProperty('--cat-walk-dist', `${walkDistancePx || window.innerWidth + 80}px`);
      actor.style.setProperty('--cat-walk-dur', `${WALK_MS}ms`);
      actor.innerHTML = innerHtml;
      function onEnd(e) {
        if (e.animationName !== 'cat-walk-across') return;
        actor.removeEventListener('animationend', onEnd);
        onDone();
      }
      actor.addEventListener('animationend', onEnd);
    }

    function doSit(innerHtml, onDone) {
      actor.className = 'footer-cat-actor is-sleeping';
      actor.innerHTML = innerHtml;
      setCompanionTimer(() => {
        actor.className = 'footer-cat-actor';
        actor.innerHTML = '';
        setCompanionTimer(onDone, PAUSE_MS);
      }, SIT_MS);
    }

    function runCatTurn(done, token) {
      let heartTimer = null;
      activeCompanion = 'cat';
      actor.className = 'footer-cat-actor is-cat-rest';
      actor.innerHTML = CAT_SLEEP_HTML;
      actor.title = 'Click to pet. Cat icon by parkjisun from Noun Project.';
      actor.onclick = () => {
        if (token !== companionToken || !catMode) return;
        clearTimeout(heartTimer);
        companionTimers.delete(heartTimer);
        actor.className = 'footer-cat-actor is-cat-loved';
        heartTimer = setCompanionTimer(() => {
          if (token !== companionToken || !catMode) return;
          actor.className = 'footer-cat-actor is-cat-rest';
        }, 1800);
      };
    }

    function runBroccoliTurn(done, token) {
      activeCompanion = 'broccoli';
      const broccoliRestLeft = window.innerWidth - 24 - 58;
      const broccoliWalkDistance = Math.max(0, broccoliRestLeft + 70);
      doWalk(`<div class="broccoli-spinner">${BROCCOLI_IMG_HTML}</div>`, () => {
        if (token !== companionToken || !broccoliMode) return;
        let clicked = false;
        actor.className = 'footer-cat-actor is-broccoli-rest';
        actor.innerHTML = BROCCOLI_REST_HTML;
        actor.title = 'Click to startle. Broccoli icon by OpenGameArt from SVG Repo.';

        function finishTurn() {
          if (token !== companionToken) return;
          actor.removeEventListener('click', startle);
          actor.title = '';
          actor.className = 'footer-cat-actor';
          actor.innerHTML = '';
          activeCompanion = '';
          companionRunning = false;
          setCompanionTimer(done, PAUSE_MS);
        }

        function startle() {
          if (token !== companionToken || !broccoliMode) return;
          if (clicked) return;
          clicked = true;
          actor.removeEventListener('click', startle);
          actor.title = '';
          actor.className = 'footer-cat-actor is-broccoli-startled';
          setCompanionTimer(() => {
            if (token !== companionToken || !broccoliMode) return;
            actor.className = 'footer-cat-actor is-broccoli-blushing';
            setCompanionTimer(() => {
              if (token !== companionToken || !broccoliMode) return;
              actor.className = 'footer-cat-actor is-broccoli-fleeing';
              function onFleeEnd(e) {
                if (e.animationName !== 'broccoli-flee') return;
                actor.removeEventListener('animationend', onFleeEnd);
                finishTurn();
              }
              actor.addEventListener('animationend', onFleeEnd);
            }, 650);
          }, 520);
        }

        actor.addEventListener('click', startle);
      }, broccoliWalkDistance);
    }

    function runCycle() {
      const token = companionToken;
      const active = [];
      if (catMode) active.push('cat');
      if (broccoliMode) active.push('broccoli');
      if (!active.length) { companionRunning = false; return; }
      companionRunning = true;
      const who = active[companionIndex % active.length];
      companionIndex++;
      if (who === 'cat') runCatTurn(runCycle, token);
      else runBroccoliTurn(runCycle, token);
    }

    _companionMaybeStart = function () {
      if (!companionRunning && (catMode || broccoliMode)) runCycle();
    };

    _companionRefresh = function () {
      if (!catMode && !broccoliMode) {
        clearCompanion();
        return;
      }
      if ((activeCompanion === 'cat' && !catMode) || (activeCompanion === 'broccoli' && !broccoliMode)) {
        clearCompanion();
      }
      _companionMaybeStart();
    };

    setTimeout(_companionMaybeStart, 2000);
  }

  function iconSvg(name) {
    const icons = {
      open: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3.5H3.5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V10"/><path d="M9 2.5h4.5V7"/><path d="M8 8l5-5"/></svg>',
      note: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11.5 2.5l2 2-8 8H3.5v-2l8-8Z"/><path d="M10 4l2 2"/></svg>',
      expand: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 2.5h-4v4"/><path d="M2.5 2.5l5 5"/><path d="M9.5 13.5h4v-4"/><path d="M13.5 13.5l-5-5"/></svg>',
      watch: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3.5c3.2 0 5.4 2.8 6.2 4.5-.8 1.7-3 4.5-6.2 4.5S2.6 9.7 1.8 8C2.6 6.3 4.8 3.5 8 3.5Z"/><circle cx="8" cy="8" r="2"/></svg>',
      subscribe: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6a4 4 0 0 1 8 0c0 4 1.5 4.5 1.5 5.5h-11C2.5 10.5 4 10 4 6Z"/><path d="M6.5 13a1.7 1.7 0 0 0 3 0"/></svg>',
      close: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 4.5l7 7"/><path d="M11.5 4.5l-7 7"/></svg>'
    };
    return icons[name] || '';
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value);
  }

  function showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  function flattenCounts(items) {
    const counts = new Map();
    items.forEach(item => {
      const key = String(item || '').trim();
      if (key) counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }

  function topCountLabel(countsMap) {
    if (!countsMap || countsMap.size === 0) return '?';
    let topKey = '';
    let topCount = -1;
    countsMap.forEach((count, key) => {
      if (count > topCount) {
        topKey = key;
        topCount = count;
      }
    });
    return topKey || '?';
  }

  function topEntries(countsMap, limit) {
    return [...countsMap.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
      .slice(0, limit);
  }

  function buildAo3TagUrl(label) {
    const tag = String(label || '').trim();
    if (!tag || tag === '?') return '';
    const ao3Encoded = encodeURIComponent(tag)
      .replace(/\./g, '*d*')
      .replace(/%2F/gi, '*s*');
    return `https://archiveofourown.org/tags/${ao3Encoded}/works`;
  }

  function buildAo3AuthorUrl(label) {
    const author = String(label || '').split(',')[0].trim();
    if (!author || /^anonymous$/i.test(author) || author === '?') return '';
    return `https://archiveofourown.org/users/${encodeURIComponent(author)}`;
  }

  function normalizeCompare(value) {
    return String(value || '').trim().toLowerCase();
  }

  function countAddedThisMonth(all) {
    return (Array.isArray(all) ? all : []).filter(work => isThisMonth(work.addedAt || work.movedAt)).length;
  }

  function countCompletedThisMonth(all) {
    return (Array.isArray(all) ? all : []).filter(work => isThisMonth(getCompletedTimestamp(work))).length;
  }

  function getCompletedTimestamp(work) {
    return Number(work?.completedAt) || Number(work?.inferredCompletedAt) || 0;
  }

  function getStatusDateSummary(work) {
    const completedAt = getCompletedTimestamp(work);
    if (completedAt) return `Completed ${formatDateShort(completedAt)}`;
    if (Number(work?.chaptersCurrent) > 0 && Number(work?.chaptersTotal) > 0 && Number(work?.chaptersCurrent) === Number(work?.chaptersTotal)) {
      return 'Completed';
    }
    const updatedAt = Number(work?.updatedAt) || 0;
    if (updatedAt) return `Updated ${formatDateShort(updatedAt)}`;
    return '';
  }

  function getDetailUpdatedMeta(work) {
    const completedAt = getCompletedTimestamp(work);
    if (completedAt) {
      return { label: 'Completed', value: formatDateShort(completedAt) };
    }
    if (Number(work?.chaptersCurrent) > 0 && Number(work?.chaptersTotal) > 0 && Number(work?.chaptersCurrent) === Number(work?.chaptersTotal)) {
      return { label: 'Completed', value: 'Date not saved' };
    }
    const updatedAt = Number(work?.updatedAt) || 0;
    if (updatedAt) return { label: 'Updated', value: formatDateShort(updatedAt) };
    return { label: 'Updated', value: 'Unknown' };
  }

  function backfillCompletedWorkDates(worksMap) {
    return false;
  }

  function normalizeFFNetWorkUrls(worksMap) {
    let changed = false;
    Object.values(worksMap || {}).forEach(work => {
      if (!work || work.platform !== 'ffnet' || !work.url) return;
      const normalized = work.url.replace(/(\/s\/\d+\/)\d+(\/|$)/i, (_, base, sep) => base + '1' + sep);
      if (normalized !== work.url) {
        work.url = normalized;
        changed = true;
      }
    });
    return changed;
  }

  function isThisMonth(timestamp) {
    const n = Number(timestamp) || 0;
    if (!n) return false;
    const d = new Date(n);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }

  function formatNumber(value) {
    return new Intl.NumberFormat('en-US').format(Number(value) || 0);
  }

  function formatDateShort(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US');
  }

  function paginateWorks(items) {
    const list = Array.isArray(items) ? items : [];
    const start = (currentPage - 1) * pageSize;
    return list.slice(start, start + pageSize);
  }

  function paginationWindow(page, totalPages) {
    const pages = new Set([1, totalPages, page - 1, page, page + 1].filter(n => n >= 1 && n <= totalPages));
    const sorted = [...pages].sort((a, b) => a - b);
    const result = [];
    sorted.forEach((value, index) => {
      if (index > 0 && value - sorted[index - 1] > 1) result.push('gap');
      result.push(value);
    });
    return result;
  }

  function buildLibraryMeta(filteredCount, totalCount) {
    const totalPages = Math.max(1, Math.ceil(filteredCount / pageSize));
    const start = filteredCount ? ((currentPage - 1) * pageSize) + 1 : 0;
    const end = Math.min(filteredCount, currentPage * pageSize);
    const base = filteredCount ? `Showing ${start}-${end} of ${filteredCount}` : 'Showing 0';
    const filterLabel = dashboardFilterLabel();
    const contexts = [
      activeSmartView ? smartViewLabel(activeSmartView) : '',
      filterLabel,
      ...libraryFilterLabels()
    ].filter(Boolean);
    const groupText = groupBy ? `, grouped by ${groupBy}` : '';
    return `${base} of ${totalCount} work${totalCount !== 1 ? 's' : ''}${contexts.length ? ` in ${contexts.join(', ')}` : ''}${groupText}${totalPages > 1 ? `, page ${currentPage} of ${totalPages}` : ''}.`;
  }

  function monthName(index) {
    return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][index] || '';
  }

  function truncate(str, len) {
    const text = String(str || '');
    return text.length > len ? text.slice(0, len - 1) + '...' : text;
  }

  function escHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
})();
