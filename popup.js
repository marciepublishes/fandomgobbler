const {
  AO3_PAGE_THEME_KEY, EXTENSION_THEME_KEY, THEME_SYNC_KEY,
  DASHBOARD_PLATFORM_KEY,
  LIBRARY_SORT_KEY, FAB_POSITION_KEY, LAST_EXPORT_KEY, AO3_FLOATING_KEY,
  AUTHOR_WATCHES_KEY, AUTHOR_WATCH_MATCHES_KEY, BOOKMARK_SYNC_KEY,
  MARKED_FOR_LATER_SYNC_KEY, ONBOARDING_DISMISSED_KEY, MFL_PENDING_COUNT_KEY,
  LOST_WORK_ACK_KEY,
  SHEETS_ENABLED_KEY, SHEETS_SPREADSHEET_ID_KEY, SHEETS_OWNER_EMAIL_KEY,
  SHEETS_SYNC_STATUS_KEY, SHEETS_NEEDS_PUSH_KEY, SHEETS_PENDING_TOMBSTONES_KEY,
} = globalThis.AO3TrackerStorageKeys;
const PlatformsCore = globalThis.AO3TrackerPlatformsCore || {};
const {
  normalizeAuthorWatchUrl,
  normalizeWatchFandom,
  sanitizeAuthorWatchesMap,
  sanitizeAuthorWatchMatches,
  sanitizeFetchedAo3Html,
  looksLikeAo3BotBlock,
  extractWorkIdFromUrl
} = globalThis.AO3TrackerAuthorWatchCore;
const TrackedWorkCore = globalThis.AO3TrackerTrackedWorkCore || {};
const {
  normalizeBookmarkSyncState,
  filterBookmarkCandidates,
  parseBookmarkPageDocument,
  mergeKnownBookmarkWorkIds,
  buildTrackedWorkFromBookmarkEntry
} = globalThis.AO3TrackerBookmarkImportCore || {};
const AuthorWatchPopupController = globalThis.AO3TrackerAuthorWatchPopupController || {};
const BookmarkImportPopupController = globalThis.AO3TrackerBookmarkImportPopupController || {};
const MarkedForLaterImportPopupController = globalThis.AO3TrackerMarkedForLaterImportPopupController || {};
const NotesModalPopupController = globalThis.AO3TrackerNotesModalPopupController || {};
const CustomCatsPopupController = globalThis.AO3TrackerCustomCatsPopupController || {};
const ExportImportPopupController = globalThis.AO3TrackerExportImportPopupController || {};
const SubscriptionRefreshPopupController = globalThis.AO3TrackerSubscriptionRefreshPopupController || {};
const PopupStorageAdapter = globalThis.AO3TrackerStorageAdapter || {};
const CurrentWorkPopupController = globalThis.AO3TrackerCurrentWorkPopupController || {};
let works = {};
let currentWork = null;
let currentPlatform = 'ao3';
let onboardingDismissed = false;
let popupSortBy = 'recently-added';
let authorWatches = {};
let authorWatchMatches = [];
let bookmarkSyncStates = { default: { knownWorkIds: [], lastFetchedAt: null } };
let bookmarkSyncAccount = 'default';
let bookmarkImportState = {
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
  bookmarksUrl: '',
  error: '',
  hasMore: false
};
let markedForLaterSyncStates = { default: { knownWorkIds: [], lastFetchedAt: null } };
let markedForLaterSyncAccount = 'default';
let markedForLaterImportState = {
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
const BUILTIN_STATUSES = TrackedWorkCore.BUILTIN_STATUSES || ['want', 'progress', 'completed', 'rereading', 'onhold', 'dnf', 'lost'];
let mflPendingCount = null;
let ao3WorksForMarkedForLater = null;
let deletedWorkNotifyHidden = false;
let acknowledgedLostWorkIds = new Set();
let sheetsSyncEnabled = false;
let sheetsSyncStatus = { state: 'idle', message: '', lastSyncedAt: null };

function normalizePlatform(platform) {
  return typeof PlatformsCore.normalizePlatformId === 'function'
    ? PlatformsCore.normalizePlatformId(platform)
    : (platform || 'ao3');
}

function inferPlatformFromUrl(url) {
  const raw = String(url || '');
  if (/archiveofourown\.org/i.test(raw)) return 'ao3';
  if (/fanfiction\.net/i.test(raw)) return 'ffnet';
  return '';
}

function platformEditionLabel(platform = currentPlatform) {
  return typeof PlatformsCore.getEditionLabel === 'function'
    ? PlatformsCore.getEditionLabel(platform)
    : 'AO3 Edition';
}

function platformBetaNote(platform = currentPlatform) {
  return typeof PlatformsCore.getBetaNote === 'function'
    ? PlatformsCore.getBetaNote(platform)
    : '';
}

function platformHas(capabilityName, platform = currentPlatform) {
  return typeof PlatformsCore.hasCapability === 'function'
    ? PlatformsCore.hasCapability(platform, capabilityName)
    : true;
}

function currentWorksStorageKey() {
  return typeof PlatformsCore.getWorksStorageKey === 'function'
    ? PlatformsCore.getWorksStorageKey(currentPlatform)
    : 'ao3works';
}

function currentCustomCatsStorageKey() {
  return typeof PlatformsCore.getCustomCatsStorageKey === 'function'
    ? PlatformsCore.getCustomCatsStorageKey(currentPlatform)
    : 'ao3customcats';
}

function normalizeSyncAccountKey(value) {
  return String(value || 'default').trim().toLowerCase() || 'default';
}

function currentBookmarkSyncState() {
  const key = normalizeSyncAccountKey(bookmarkSyncAccount);
  return bookmarkSyncStates[key] || { knownWorkIds: [], lastFetchedAt: null };
}

function currentMflSyncState() {
  const key = normalizeSyncAccountKey(markedForLaterSyncAccount);
  return markedForLaterSyncStates[key] || { knownWorkIds: [], lastFetchedAt: null };
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

function authorWatchPopupControllerContext() {
  return {
    window,
    document,
    chrome,
    getCurrentWork: () => currentWork,
    getWorksMap: () => currentPlatform === 'ao3' ? works : (ao3WorksForMarkedForLater || {}),
    getAuthorWatches: () => authorWatches,
    setAuthorWatches: next => { authorWatches = next; },
    getAuthorWatchMatches: () => authorWatchMatches,
    setAuthorWatchMatches: next => { authorWatchMatches = next; },
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

function bookmarkImportPopupControllerContext() {
  return {
    window,
    document,
    getBookmarkImportState: () => bookmarkImportState,
    setBookmarkImportState: next => { bookmarkImportState = next; },
    getBookmarkSyncState: () => currentBookmarkSyncState(),
    setBookmarkSyncState: next => {
      bookmarkSyncStates[normalizeSyncAccountKey(bookmarkSyncAccount)] = next;
    },
    setBookmarkSyncAccount: account => {
      bookmarkSyncAccount = normalizeSyncAccountKey(account);
      if (!bookmarkSyncStates[bookmarkSyncAccount]) {
        bookmarkSyncStates[bookmarkSyncAccount] = { knownWorkIds: [], lastFetchedAt: null };
      }
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

function markedForLaterImportPopupControllerContext() {
  return {
    window,
    document,
    getMflImportState: () => markedForLaterImportState,
    setMflImportState: next => { markedForLaterImportState = next; },
    getMflSyncState: () => currentMflSyncState(),
    setMflSyncState: next => {
      markedForLaterSyncStates[normalizeSyncAccountKey(markedForLaterSyncAccount)] = next;
    },
    setMflSyncAccount: account => {
      markedForLaterSyncAccount = normalizeSyncAccountKey(account);
      if (!markedForLaterSyncStates[markedForLaterSyncAccount]) {
        markedForLaterSyncStates[markedForLaterSyncAccount] = { knownWorkIds: [], lastFetchedAt: null };
      }
    },
    getWorksMap: () => works,
    getCustomCats,
    saveWorks: async (deleteIds) => {
      const result = await saveWorks(deleteIds);
      if (result && mflPendingCount > 0) {
        mflPendingCount = 0;
        try {
          const prevMfl = await PopupStorageAdapter.get(MFL_PENDING_COUNT_KEY);
          // sweptAt=0 forces a fresh sweep on the next popup open so newly-added
          // MFL works are detected immediately rather than blocked for an hour.
          await PopupStorageAdapter.set(MFL_PENDING_COUNT_KEY, {
            count: 0,
            sweptAt: 0,
            mflUrl: (prevMfl && prevMfl.mflUrl) || ''
          });
        } catch (e) {}
        updateCombinedPendingBadge();
        renderMflNotifyBanner();
      }
      return result;
    },
    saveMflSyncState,
    renderAll,
    showToast,
    parseAo3Html,
    waitMs,
    escHtml
  };
}

function formatDateShort(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US');
}

const normalizeStatusValue = TrackedWorkCore.normalizeStatusValue || function (status) {
  return BUILTIN_STATUSES.includes(status) ? status : '';
};

const hasCustomCategories = TrackedWorkCore.hasCustomCategories || function (work) {
  return Array.isArray(work && work.customCats) && work.customCats.length > 0;
};

const isTrackedWorkValid = TrackedWorkCore.isTrackedWorkValid || function (work) {
  return !!(normalizeStatusValue(work && work.status) || hasCustomCategories(work));
};

function trackedLabelFor(status) {
  return labelFor(status) || 'Tracked';
}

const nextFinishedAt = TrackedWorkCore.nextFinishedAt || function (oldStatus, newStatus, existingFinishedAt) {
  const normalizedOld = normalizeStatusValue(oldStatus);
  const normalizedNew = normalizeStatusValue(newStatus);
  if (normalizedNew === 'completed' && normalizedOld !== 'completed') return Date.now();
  return existingFinishedAt || null;
};

const getRestoreStatus = TrackedWorkCore.getRestoreStatus || function (work) {
  if (work && Object.prototype.hasOwnProperty.call(work, 'lostFrom')) {
    return normalizeStatusValue(work.lostFrom);
  }
  return hasCustomCategories(work) ? '' : 'want';
};

const pruneTrackedWorkIfInvalidInMap = TrackedWorkCore.pruneTrackedWorkIfInvalid || function (worksMap, workId) {
  const work = worksMap[workId];
  if (!work) return false;
  work.status = normalizeStatusValue(work.status);
  if (!isTrackedWorkValid(work)) {
    delete worksMap[workId];
    return true;
  }
  return false;
};

function pruneTrackedWorkIfInvalid(workId) {
  return pruneTrackedWorkIfInvalidInMap(works, workId);
}

const sanitizeTrackedWorksMap = TrackedWorkCore.sanitizeTrackedWorksMap || function (inputWorks) {
  const source = (inputWorks && typeof inputWorks === 'object') ? inputWorks : {};
  const sanitized = {};
  let changed = false;

  Object.entries(source).forEach(([workId, rawWork]) => {
    if (!rawWork || typeof rawWork !== 'object') {
      changed = true;
      return;
    }

    const normalizedStatus = normalizeStatusValue(rawWork.status);
    const normalizedCustomCats = Array.isArray(rawWork.customCats)
      ? [...new Set(rawWork.customCats.filter(catId => typeof catId === 'string' && catId))]
      : [];

    const normalizedWork = {
      ...rawWork,
      id: typeof rawWork.id === 'string' && rawWork.id ? rawWork.id : workId,
      status: normalizedStatus,
      customCats: normalizedCustomCats,
      title: typeof rawWork.title === 'string' && rawWork.title.trim() ? rawWork.title : (rawWork.url || `Work ${workId}`),
      author: typeof rawWork.author === 'string' && rawWork.author.trim() ? rawWork.author : 'Anonymous',
      authorUrl: typeof rawWork.authorUrl === 'string' && rawWork.authorUrl ? rawWork.authorUrl : null,
      url: typeof rawWork.url === 'string' && rawWork.url
        ? rawWork.url
        : (/^\d+$/.test(String(workId)) ? `https://archiveofourown.org/works/${workId}` : (rawWork.url || ''))
    };

    if (!isTrackedWorkValid(normalizedWork)) {
      changed = true;
      return;
    }

    if (
      normalizedWork.id !== rawWork.id ||
      normalizedStatus !== rawWork.status ||
      normalizedCustomCats.length !== (Array.isArray(rawWork.customCats) ? rawWork.customCats.length : 0) ||
      normalizedWork.title !== rawWork.title ||
      normalizedWork.author !== rawWork.author ||
      normalizedWork.authorUrl !== (rawWork.authorUrl || null) ||
      normalizedWork.url !== rawWork.url
    ) {
      changed = true;
    }

    sanitized[workId] = normalizedWork;
  });

  if (Object.keys(sanitized).length !== Object.keys(source).length) changed = true;
  return { works: sanitized, changed };
};


async function loadOnboardingState() {
  onboardingDismissed = !!(await PopupStorageAdapter.get(ONBOARDING_DISMISSED_KEY));
}

function setupOnboardingDismiss() {
  const btn = document.getElementById('onboardingDismiss');
  if (!btn) return;
  btn.addEventListener('click', () => {
    onboardingDismissed = true;
    PopupStorageAdapter.set(ONBOARDING_DISMISSED_KEY, true);
    const banner = document.getElementById('onboardingBanner');
    if (banner) banner.style.display = 'none';
  });
}

function validatePopupDeps() {
  const checks = [
    ['AO3TrackerStorageAdapter', ['get', 'set', 'remove']],
    ['AO3TrackerPlatformsCore', ['hasCapability', 'getWorksStorageKey']],
    ['AO3TrackerTrackedWorkCore', ['normalizeStatusValue', 'sanitizeTrackedWorksMap']],
    ['AO3TrackerCurrentWorkPopupController', ['showBar']],
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
  console.error(`[AO3 Tracker] popup: missing dependencies — ${missing.join(', ')}`);
  const app = document.querySelector('.app') || document.body;
  app.innerHTML = `<div style="padding:16px;color:#b91c1c;font:13px/1.6 sans-serif;max-width:320px">
    <strong>Extension failed to load.</strong><br>
    Missing: <code style="font-size:11px">${missing.join(', ')}</code><br><br>
    <small>Try disabling and re-enabling from chrome://extensions, then reload.</small>
  </div>`;
  return false;
}

// --- Google Sheets Sync ---

// Initialize the engine with storage keys. Runs once on popup open.
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
  sheetsSyncEnabled = !!(await PopupStorageAdapter.get(SHEETS_ENABLED_KEY));
  sheetsSyncStatus  = (await PopupStorageAdapter.get(SHEETS_SYNC_STATUS_KEY))
    || { state: 'idle', message: '', lastSyncedAt: null };
}

function sheetsSyncContext() {
  return {
    getSheetsEnabled:  () => sheetsSyncEnabled,
    getSyncStatus:     () => sheetsSyncStatus,
    SHEETS_SYNC_STATUS_KEY,
    SHEETS_ENABLED_KEY,
    SHEETS_OWNER_EMAIL_KEY,
    showToast,
    renderSheetsSection: renderSheetsSyncSection
  };
}

function setupSheetsSyncSection() {
  const controller = globalThis.FGSheetsSyncPopupController;
  if (!controller) return;
  setupSectionToggle('sheetsSyncToggle', 'sheetsSyncPanel', false);
  controller.setupControls(sheetsSyncContext());
}

function renderSheetsSyncSection() {
  const controller = globalThis.FGSheetsSyncPopupController;
  if (!controller) return;
  controller.renderSection(sheetsSyncContext());
}

// --- MFL Sweep ---

async function updateCombinedPendingBadge() {
  try {
    const storedMfl = MFL_PENDING_COUNT_KEY ? await PopupStorageAdapter.get(MFL_PENDING_COUNT_KEY) : null;
    const mflCount = Number(storedMfl && storedMfl.count) || 0;
    const authorCount = Array.isArray(authorWatchMatches) ? authorWatchMatches.length : 0;
    const deletedCount = countDeletedWorks();
    const total = Math.max(0, mflCount) + Math.max(0, authorCount) + Math.max(0, deletedCount);
    if (chrome.action?.setBadgeText) chrome.action.setBadgeText({ text: total > 99 ? '99+' : total > 0 ? String(total) : '' });
    if (total > 0) chrome.action?.setBadgeBackgroundColor?.({ color: '#2aa198' });
    chrome.runtime?.sendMessage?.({ type: 'FG_UPDATE_BADGE' });
  } catch (e) {}
}

function renderMflNotifyBanner() {
  const banner = document.getElementById('mflNotifyBanner');
  const msg = document.getElementById('mflNotifyMsg');
  const fetchBtn = document.getElementById('fetchMarkedForLaterBtn');
  if (!banner || !msg) return;
  if (currentPlatform !== 'ao3') {
    banner.classList.add('hidden');
    fetchBtn?.classList.remove('tool-btn-mfl-pending');
    return;
  }
  const count = mflPendingCount;
  if (!count || count <= 0) {
    banner.classList.add('hidden');
    fetchBtn?.classList.remove('tool-btn-mfl-pending');
    return;
  }
  msg.textContent = `${count} untracked work${count !== 1 ? 's' : ''} in your Mark for Later.`;
  banner.classList.remove('hidden');
  fetchBtn?.classList.add('tool-btn-mfl-pending');
}

function setupMflNotifyBanner() {
  document.getElementById('mflNotifyImportBtn')?.addEventListener('click', async () => {
    if (typeof MarkedForLaterImportPopupController.openModal === 'function') {
      MarkedForLaterImportPopupController.openModal(markedForLaterImportPopupControllerContext());
    }
    if (typeof MarkedForLaterImportPopupController.startFetch === 'function') {
      await MarkedForLaterImportPopupController.startFetch(markedForLaterImportPopupControllerContext(), false);
    }
  });
  document.getElementById('mflNotifyDismiss')?.addEventListener('click', async () => {
    mflPendingCount = 0;
    try {
      const stored = await PopupStorageAdapter.get(MFL_PENDING_COUNT_KEY);
      await PopupStorageAdapter.set(MFL_PENDING_COUNT_KEY, { ...(stored || {}), count: 0 });
    } catch (e) {}
    updateCombinedPendingBadge();
    renderMflNotifyBanner();
  });
}

function renderAuthorWatchNotifyBanner() {
  const banner = document.getElementById('authorWatchNotifyBanner');
  const msg = document.getElementById('authorWatchNotifyMsg');
  if (!banner || !msg) return;
  const count = Array.isArray(authorWatchMatches) ? authorWatchMatches.length : 0;
  if (!count) {
    banner.classList.add('hidden');
    updateCombinedPendingBadge();
    return;
  }
  msg.textContent = `${count} new Author Watch alert${count !== 1 ? 's' : ''}.`;
  banner.classList.remove('hidden');
  updateCombinedPendingBadge();
}

function countDeletedWorks() {
  return getUnacknowledgedDeletedWorks().length;
}

function getDeletedWorks() {
  return Object.values(works || {}).filter(work => work && work.status === 'lost');
}

function getUnacknowledgedDeletedWorks() {
  return getDeletedWorks().filter(work => !acknowledgedLostWorkIds.has(String(work.id || '')));
}

async function loadAcknowledgedLostWorks() {
  const storageKey = LOST_WORK_ACK_KEY || 'fandomgobbler_lost_work_acknowledged';
  const allAcknowledged = (await PopupStorageAdapter.get(storageKey)) || {};
  const ids = Array.isArray(allAcknowledged[currentWorksStorageKey()])
    ? allAcknowledged[currentWorksStorageKey()]
    : [];
  acknowledgedLostWorkIds = new Set(ids.map(String));
}

async function saveAcknowledgedLostWorks(ids) {
  const storageKey = LOST_WORK_ACK_KEY || 'fandomgobbler_lost_work_acknowledged';
  const worksKey = currentWorksStorageKey();
  const allAcknowledged = (await PopupStorageAdapter.get(storageKey)) || {};
  const stillLostIds = new Set(getDeletedWorks().map(work => String(work.id || '')));
  const mergedIds = [...new Set([...(allAcknowledged[worksKey] || []), ...ids].map(String))]
    .filter(id => id && stillLostIds.has(id));
  allAcknowledged[worksKey] = mergedIds;
  acknowledgedLostWorkIds = new Set(mergedIds);
  await PopupStorageAdapter.set(storageKey, allAcknowledged);
}

function renderDeletedWorkNotifyBanner() {
  const banner = document.getElementById('deletedWorkNotifyBanner');
  const msg = document.getElementById('deletedWorkNotifyMsg');
  if (!banner || !msg) return;
  const count = countDeletedWorks();
  if (!count) {
    banner.classList.add('hidden');
    updateCombinedPendingBadge();
    return;
  }
  msg.textContent = `${count} tracked work${count !== 1 ? 's' : ''} may be deleted or unavailable.`;
  banner.classList.remove('hidden');
  updateCombinedPendingBadge();
}

function setupAuthorWatchNotifyBanner() {
  document.getElementById('authorWatchNotifyViewBtn')?.addEventListener('click', () => {
    const panel = document.getElementById('authorWatchesPanel');
    const toggle = document.getElementById('authorWatchesToggle');
    panel?.classList.remove('hidden');
    toggle?.setAttribute('aria-expanded', 'true');
    (toggle?.closest('.dashboard-section') || panel)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  });
  document.getElementById('authorWatchNotifyDismiss')?.addEventListener('click', () => {
    document.getElementById('authorWatchNotifyBanner')?.classList.add('hidden');
  });
}

function setupDeletedWorkNotifyBanner() {
  document.getElementById('deletedWorkNotifyViewBtn')?.addEventListener('click', async () => {
    await PopupStorageAdapter.set(DASHBOARD_PLATFORM_KEY, currentPlatform);
    const dashboardUrl = `${chrome.runtime.getURL('dashboard.html')}?platform=${encodeURIComponent(currentPlatform)}&smart=lost-works`;
    if (chrome.tabs && typeof chrome.tabs.create === 'function') chrome.tabs.create({ url: dashboardUrl });
    else window.open(dashboardUrl, '_blank', 'noopener');
  });
  document.getElementById('deletedWorkNotifyDismiss')?.addEventListener('click', async () => {
    const ids = getUnacknowledgedDeletedWorks().map(work => String(work.id || '')).filter(Boolean);
    await saveAcknowledgedLostWorks(ids);
    document.getElementById('deletedWorkNotifyBanner')?.classList.add('hidden');
    updateCombinedPendingBadge();
  });
}

async function sweepMflForUntracked() {
  if (!MFL_PENDING_COUNT_KEY) return;
  try {
    ao3WorksForMarkedForLater = currentPlatform === 'ao3' ? works : await loadAo3WorksForMarkedForLater();
    const stored = await PopupStorageAdapter.get(MFL_PENDING_COUNT_KEY);
    const lastSwept = (stored && stored.sweptAt) || 0;
    const TEN_MIN = 10 * 60 * 1000;
    const canReuseCachedCount = stored && stored.count != null && stored.count > 0 && stored.sourceWorksKey === 'ao3works';

    if (Date.now() - lastSwept < TEN_MIN && canReuseCachedCount) {
      mflPendingCount = stored.count;
      renderMflNotifyBanner();
      updateCombinedPendingBadge();
      return;
    }

    let mflUrl = (stored && stored.mflUrl) || '';
    if (!mflUrl) {
      mflUrl = await MarkedForLaterImportPopupController.resolveOwnMarkedForLaterUrl?.(markedForLaterImportPopupControllerContext()) || '';
    }
    if (!mflUrl) return;

    if (typeof MarkedForLaterImportPopupController.countPendingUntrackedWorks !== 'function') return;
    const result = await MarkedForLaterImportPopupController.countPendingUntrackedWorks(
      markedForLaterImportPopupControllerContext(),
      mflUrl
    );
    const count = result && Number.isFinite(result.count) ? result.count : 0;
    const resolvedUrl = (result && result.mflUrl) || mflUrl;

    mflPendingCount = count;
    await PopupStorageAdapter.set(MFL_PENDING_COUNT_KEY, { count, sweptAt: Date.now(), mflUrl: resolvedUrl, sourceWorksKey: 'ao3works' });
    renderMflNotifyBanner();
    updateCombinedPendingBadge();
  } catch (e) {
    console.warn('FandomGobbler MFL sweep failed:', e);
  }
}

// --- Init ---
document.addEventListener('DOMContentLoaded', async () => {
  if (!validatePopupDeps()) return;
  initSheetsEngine();
  await loadPopupPlatform();
  await loadWorks();
  await loadAcknowledgedLostWorks();
  await loadAuthorWatches();
  await loadAuthorWatchMatches();
  await loadBookmarkSyncState();
  await loadMarkedForLaterSyncState();
  await loadSheetsSyncState();
  await loadOnboardingState();
  popupSortBy = await getLibrarySortSetting();
    await setupAo3ThemeToggle();
    await setupExtensionThemeToggle();
    setupThemeSyncToggle();
    setupGoToDashboard();
    setupDashboardSectionToggles();
    await detectCurrentPage();
  setupNotesModal();
  setupFloatToggle();
  setupExport();
  setupResetCurrentChapterTool();
  setupCustomCats();
  setupPopupLibrarySort();
  setupAuthorWatchControls();
  setupBookmarkImportControls();
  setupMarkedForLaterImportControls();
  setupSubscriptionRefresh();
  setupOnboardingDismiss();
  setupMflNotifyBanner();
  setupAuthorWatchNotifyBanner();
  setupDeletedWorkNotifyBanner();
  setupSheetsSyncSection();
  applyPopupPlatform();
  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      if (changes[DASHBOARD_PLATFORM_KEY]) {
        switchPopupPlatform(changes[DASHBOARD_PLATFORM_KEY].newValue || 'ao3', { reloadWorks: true }).then(renderAll);
      }
      if (changes[SHEETS_SYNC_STATUS_KEY]) {
        sheetsSyncStatus = changes[SHEETS_SYNC_STATUS_KEY].newValue || sheetsSyncStatus;
        renderSheetsSyncSection();
      }
      if (changes[SHEETS_ENABLED_KEY]) {
        sheetsSyncEnabled = !!changes[SHEETS_ENABLED_KEY].newValue;
        renderSheetsSyncSection();
      }
      if (changes[AUTHOR_WATCH_MATCHES_KEY]) {
        authorWatchMatches = sanitizeAuthorWatchMatches(changes[AUTHOR_WATCH_MATCHES_KEY].newValue || []);
        renderAuthorWatchNotifyBanner();
        renderAll();
      }
      if (changes[MFL_PENDING_COUNT_KEY]) {
        mflPendingCount = Number(changes[MFL_PENDING_COUNT_KEY].newValue?.count) || 0;
        renderMflNotifyBanner();
        updateCombinedPendingBadge();
      }
      if (changes[currentWorksStorageKey()]) {
        works = sanitizeTrackedWorksMap(changes[currentWorksStorageKey()].newValue || {}).works;
        renderDeletedWorkNotifyBanner();
        renderAll();
      }
      if (changes[LOST_WORK_ACK_KEY]) {
        loadAcknowledgedLostWorks().then(() => {
          renderDeletedWorkNotifyBanner();
          updateCombinedPendingBadge();
        });
      }
    });
  } catch (e) {}
  renderAll();
  renderAuthorWatchNotifyBanner();
  renderDeletedWorkNotifyBanner();
  updateCombinedPendingBadge();
  renderSheetsSyncSection();
  sweepMflForUntracked();
  // Trigger a sync in the background after the popup is ready.
  // Non-interactive: never shows a dialog; status updates propagate via storage.
  setTimeout(() => {
    try { globalThis.FGSheetsEngine?.fullSync(false); } catch (e) {}
  }, 800);
});

function applyThemeButtonState(btn, modeLabel, theme) {
  const t = theme === 'dark' ? 'dark' : theme === 'sol-light' ? 'sol-light' : 'light';
  if (btn) {
    btn.dataset.themeState = t;
    const currentThemeLabel = t === 'dark'
      ? 'Solarized Dark'
      : t === 'sol-light'
        ? 'Solarized Light'
        : 'Default AO3';
    btn.title = currentThemeLabel;
    btn.setAttribute('aria-label', currentThemeLabel);
    if (modeLabel) modeLabel.textContent = currentThemeLabel;
  }
  return t;
}

function getThemeSyncState() {
  return new Promise(resolve => {
    chrome.storage.local.get(THEME_SYNC_KEY, d => resolve(d[THEME_SYNC_KEY] !== false));
  });
}

async function setupAo3ThemeToggle() {
  const btn = document.getElementById('themeToggle');
  const modeLabel = document.getElementById('themeModeLabel');
  if (!btn) return;

  function apply(theme) {
    applyThemeButtonState(btn, modeLabel, theme);
  }

  await new Promise(resolve => {
    chrome.storage.local.get(AO3_PAGE_THEME_KEY, d => {
      apply(d[AO3_PAGE_THEME_KEY] || 'light');
      resolve();
    });
  });

  btn.addEventListener('click', () => {
    const cur = btn.dataset.themeState || 'light';
    const next = cur === 'dark' ? 'light' : cur === 'sol-light' ? 'dark' : 'sol-light';
    chrome.storage.local.get(THEME_SYNC_KEY, d => {
      const updates = { [AO3_PAGE_THEME_KEY]: next };
      if (d[THEME_SYNC_KEY] !== false) updates[EXTENSION_THEME_KEY] = next;
      chrome.storage.local.set(updates);
      apply(next);
    });
  });

  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local' || !changes[AO3_PAGE_THEME_KEY]) return;
      apply(changes[AO3_PAGE_THEME_KEY].newValue || 'light');
    });
  } catch (e) {}
}

async function setupExtensionThemeToggle() {
  const btn = document.getElementById('extensionThemeToggle');
  const modeLabel = document.getElementById('extensionThemeModeLabel');
  if (!btn) return;

  function apply(theme) {
    const t = applyThemeButtonState(btn, modeLabel, theme);
    document.body.dataset.theme = t;
  }

  await new Promise(resolve => {
    chrome.storage.local.get([EXTENSION_THEME_KEY, AO3_PAGE_THEME_KEY], d => {
      apply(d[EXTENSION_THEME_KEY] || d[AO3_PAGE_THEME_KEY] || 'light');
      resolve();
    });
  });

  btn.addEventListener('click', () => {
    const cur = btn.dataset.themeState || 'light';
    const next = cur === 'dark' ? 'light' : cur === 'sol-light' ? 'dark' : 'sol-light';
    chrome.storage.local.get(THEME_SYNC_KEY, d => {
      const updates = { [EXTENSION_THEME_KEY]: next };
      if (d[THEME_SYNC_KEY] !== false) updates[AO3_PAGE_THEME_KEY] = next;
      chrome.storage.local.set(updates);
      apply(next);
    });
  });

  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      if (changes[EXTENSION_THEME_KEY]) {
        apply(changes[EXTENSION_THEME_KEY].newValue || 'light');
      }
    });
  } catch (e) {}
}

function setupThemeSyncToggle() {
  const btn = document.getElementById('themeSyncToggle');
  const tip = document.getElementById('themeSyncTooltip');
  const title = document.getElementById('themeSyncTitle');
  if (!btn || !tip || !title) return;

  function setToggleState(enabled) {
    btn.classList.toggle('disabled', !enabled);
    title.textContent = enabled ? 'Theme Sync On' : 'Theme Sync Off';
    tip.textContent = enabled
      ? 'Changing theme anywhere syncs AO3, the sidebar, and this popup. Click once to turn it off.'
      : 'AO3 Theme and Extension Theme can be changed separately. Click once to turn sync back on.';
  }

  chrome.storage.local.get(THEME_SYNC_KEY, d => {
    if (d[THEME_SYNC_KEY] === undefined) {
      try { chrome.storage.local.set({ [THEME_SYNC_KEY]: true }); } catch (e) {}
    }
    setToggleState(d[THEME_SYNC_KEY] !== false);
  });

  btn.addEventListener('click', () => {
    chrome.storage.local.get([THEME_SYNC_KEY, EXTENSION_THEME_KEY, AO3_PAGE_THEME_KEY], d => {
      const nextEnabled = d[THEME_SYNC_KEY] === false;
      const syncedTheme = d[EXTENSION_THEME_KEY] || d[AO3_PAGE_THEME_KEY] || 'light';
      const updates = { [THEME_SYNC_KEY]: nextEnabled };
      if (nextEnabled) {
        updates[AO3_PAGE_THEME_KEY] = syncedTheme;
        updates[EXTENSION_THEME_KEY] = syncedTheme;
      }
      chrome.storage.local.set(updates);
      setToggleState(nextEnabled);
      showToast(nextEnabled ? 'Theme sync on' : 'Theme sync off');
    });
  });

  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local' || !changes[THEME_SYNC_KEY]) return;
      setToggleState(changes[THEME_SYNC_KEY].newValue !== false);
    });
    } catch (e) {}
  }

function setupGoToDashboard() {
  const btn = document.getElementById('goToDashboardBtn');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    const launchPlatform = await getDashboardLaunchPlatform();
    await PopupStorageAdapter.set(DASHBOARD_PLATFORM_KEY, launchPlatform);
    const dashboardUrl = `${chrome.runtime.getURL('dashboard.html')}?platform=${encodeURIComponent(launchPlatform)}`;
    if (chrome.tabs && typeof chrome.tabs.create === 'function') {
      chrome.tabs.create({ url: dashboardUrl });
      return;
    }
    window.open(dashboardUrl, '_blank', 'noopener');
  });
}

async function getDashboardLaunchPlatform() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return inferPlatformFromUrl(tab?.url) === 'ffnet' ? 'ffnet' : 'ao3';
  } catch (e) {
    return 'ao3';
  }
}

function setupDashboardSectionToggles() {
  setupSectionToggle('libraryToolsToggle', 'libraryToolsPanel', false);
  setupSectionToggle('authorWatchesToggle', 'authorWatchesPanel', false);
  setupSectionToggle('categoriesToggle', 'categoriesPanel', false);
}

function setupSectionToggle(buttonId, panelId, defaultExpanded = true) {
  const btn = document.getElementById(buttonId);
  const panel = document.getElementById(panelId);
  if (!btn || !panel) return;

  panel.classList.toggle('hidden', !defaultExpanded);
  btn.setAttribute('aria-expanded', defaultExpanded ? 'true' : 'false');

  btn.addEventListener('click', () => {
    const expand = panel.classList.contains('hidden');
    panel.classList.toggle('hidden', !expand);
    btn.setAttribute('aria-expanded', expand ? 'true' : 'false');
  });
}

async function getLibrarySortSetting() {
  return (await PopupStorageAdapter.get(LIBRARY_SORT_KEY)) || 'recently-added';
}

function setupPopupLibrarySort() {
  const select = document.getElementById('popupLibrarySort');
  if (!select) return;
  select.value = popupSortBy;
  select.addEventListener('change', () => {
    popupSortBy = select.value || 'recently-added';
    PopupStorageAdapter.set(LIBRARY_SORT_KEY, popupSortBy);
    renderAll();
  });
}


// Storage
async function loadPopupPlatform() {
  currentPlatform = normalizePlatform((await PopupStorageAdapter.get(DASHBOARD_PLATFORM_KEY)) || 'ao3');
}

async function switchPopupPlatform(nextPlatform, { persist = false, reloadWorks = true } = {}) {
  const normalized = normalizePlatform(nextPlatform);
  if (normalized === currentPlatform) {
    applyPopupPlatform();
    return;
  }
  currentPlatform = normalized;
  if (persist) PopupStorageAdapter.set(DASHBOARD_PLATFORM_KEY, currentPlatform);
  if (reloadWorks) await loadWorks();
  await loadAcknowledgedLostWorks();
  applyPopupPlatform();
}

async function loadAo3WorksForMarkedForLater() {
  const sanitized = sanitizeTrackedWorksMap((await PopupStorageAdapter.get('ao3works')) || {});
  if (sanitized.changed) await PopupStorageAdapter.set('ao3works', sanitized.works);
  return sanitized.works;
}

async function loadWorks() {
  const worksKey = currentWorksStorageKey();
  const sanitized = sanitizeTrackedWorksMap((await PopupStorageAdapter.get(worksKey)) || {});
  works = sanitized.works;
  if (sanitized.changed) await PopupStorageAdapter.set(worksKey, works);
}

async function saveWorks(deleteIds = []) {
  const worksKey = currentWorksStorageKey();
  const latest = (await PopupStorageAdapter.get(worksKey)) || {};
  const merged = { ...latest, ...works };
  deleteIds.forEach(id => { delete merged[id]; });
  const ok = await PopupStorageAdapter.set(worksKey, merged);
  if (!ok) showToast('Save failed: storage is full or unavailable.');
  else {
    works = merged;
    try { globalThis.FGSheetsEngine?.markNeedsPush?.(); } catch (_e) {}
  }
  return ok;
}

async function loadAuthorWatches() {
  const sanitized = sanitizeAuthorWatchesMap((await PopupStorageAdapter.get(AUTHOR_WATCHES_KEY)) || {});
  authorWatches = sanitized.watches;
  if (sanitized.changed) await PopupStorageAdapter.set(AUTHOR_WATCHES_KEY, authorWatches);
}

async function saveAuthorWatches() {
  return PopupStorageAdapter.set(AUTHOR_WATCHES_KEY, authorWatches);
}

async function loadAuthorWatchMatches() {
  const raw = (await PopupStorageAdapter.get(AUTHOR_WATCH_MATCHES_KEY)) || [];
  authorWatchMatches = sanitizeAuthorWatchMatches(raw);
  if (JSON.stringify(authorWatchMatches) !== JSON.stringify(raw)) {
    await PopupStorageAdapter.set(AUTHOR_WATCH_MATCHES_KEY, authorWatchMatches);
  }
}

async function saveAuthorWatchMatches() {
  return PopupStorageAdapter.set(AUTHOR_WATCH_MATCHES_KEY, authorWatchMatches);
}

async function loadBookmarkSyncState() {
  const raw = (await PopupStorageAdapter.get(BOOKMARK_SYNC_KEY)) || {};
  const normalize = typeof normalizeBookmarkSyncState === 'function'
    ? normalizeBookmarkSyncState
    : value => ({
      knownWorkIds: Array.isArray(value.knownWorkIds)
        ? [...new Set(value.knownWorkIds.map(id => String(id || '').trim()).filter(Boolean))].slice(-5000)
        : [],
      lastFetchedAt: Number(value.lastFetchedAt) || null
    });
  bookmarkSyncStates = parseStoredSyncStates(raw, normalize);
}

async function saveBookmarkSyncState() {
  return PopupStorageAdapter.set(BOOKMARK_SYNC_KEY, serializeSyncStates(bookmarkSyncStates));
}

async function loadMarkedForLaterSyncState() {
  const raw = (await PopupStorageAdapter.get(MARKED_FOR_LATER_SYNC_KEY)) || {};
  const normalize = globalThis.AO3TrackerMarkedForLaterImportCore?.normalizeMarkedForLaterSyncState;
  const normalizeState = typeof normalize === 'function'
    ? normalize
    : value => ({
      knownWorkIds: Array.isArray(value.knownWorkIds)
        ? [...new Set(value.knownWorkIds.map(id => String(id || '').trim()).filter(Boolean))].slice(-5000)
        : [],
      lastFetchedAt: Number(value.lastFetchedAt) || null
    });
  markedForLaterSyncStates = parseStoredSyncStates(raw, normalizeState);
}

async function saveMflSyncState() {
  return PopupStorageAdapter.set(MARKED_FOR_LATER_SYNC_KEY, serializeSyncStates(markedForLaterSyncStates));
}

// Current Page Detection
async function detectCurrentPage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const pagePlatform = inferPlatformFromUrl(tab?.url);
    if (!pagePlatform) return;
    if (pagePlatform !== currentPlatform) {
      await switchPopupPlatform(pagePlatform, { persist: true, reloadWorks: true });
    }
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_WORK_INFO' });
    if (response?.workId) {
      currentWork = { ...response, platform: normalizePlatform(response.platform || pagePlatform) };
      showCurrentWorkBar();
    }
  } catch (e) {}
}

function applyPopupPlatform() {
  document.title = `FandomGobbler ${platformEditionLabel(currentPlatform)}`;
  const brand = document.getElementById('popupBrandTitle');
  if (brand) brand.textContent = 'FandomGobbler.';

  const note = document.getElementById('popupPlatformNote');
  if (note) {
    const text = platformBetaNote(currentPlatform);
    note.textContent = text;
    note.classList.toggle('hidden', !text);
  }

  const readingSetupSection = document.getElementById('readingSetupSection');
  const authorWatchSection = document.getElementById('authorWatchSection');
  const refreshSubscriptionsBtn = document.getElementById('refreshSubscriptionsBtn');
  const fetchBookmarksBtn = document.getElementById('fetchBookmarksBtn');
  const fetchMarkedForLaterBtn = document.getElementById('fetchMarkedForLaterBtn');
  const resetCurrentChapterBtn = document.getElementById('resetCurrentChapterBtn');
  const refreshAuthorWatchesBtn = document.getElementById('refreshAuthorWatchesBtn');
  const authorWatch = platformHas('authorWatch');
  const subscriptions = platformHas('subscriptions');
  const bookmarkImport = platformHas('bookmarkImport');
  const markedForLaterImport = platformHas('markedForLaterImport');
  const relationshipTools = platformHas('relationshipTools');
  const ao3Setup = currentPlatform === 'ao3';
  const chapterProgress = currentPlatform === 'ao3';
  const ao3EngagementSorts = platformHas('ao3EngagementSorts');

  if (readingSetupSection) readingSetupSection.hidden = !ao3Setup;
  if (authorWatchSection) authorWatchSection.hidden = !authorWatch;
  if (refreshSubscriptionsBtn) refreshSubscriptionsBtn.hidden = !subscriptions;
  if (fetchBookmarksBtn) fetchBookmarksBtn.hidden = !bookmarkImport;
  if (fetchMarkedForLaterBtn) fetchMarkedForLaterBtn.hidden = !markedForLaterImport;
  if (resetCurrentChapterBtn) resetCurrentChapterBtn.hidden = !chapterProgress;
  if (refreshAuthorWatchesBtn) refreshAuthorWatchesBtn.hidden = !authorWatch;

  setPopupSortOptionHidden('most-popular', !ao3EngagementSorts);
  setPopupSortOptionHidden('most-bookmarked', !ao3EngagementSorts);
  setPopupSortOptionHidden('most-kudos', !ao3EngagementSorts);
  setPopupSortOptionHidden('most-hits', !ao3EngagementSorts);
  ensureSupportedPopupSort(ao3EngagementSorts);
}

function setPopupSortOptionHidden(value, hidden) {
  const option = document.querySelector(`#popupLibrarySort option[value="${value}"]`);
  if (!option) return;
  option.hidden = hidden;
  option.disabled = hidden;
}

function ensureSupportedPopupSort(ao3EngagementSorts) {
  if (ao3EngagementSorts) return;
  if (!['most-popular', 'most-bookmarked', 'most-kudos', 'most-hits'].includes(popupSortBy)) return;
  popupSortBy = 'recently-added';
  const select = document.getElementById('popupLibrarySort');
  if (select) select.value = popupSortBy;
}

function showCurrentWorkBar() {
  if (typeof CurrentWorkPopupController.showBar === 'function') {
    CurrentWorkPopupController.showBar(currentWorkBarContext());
  }
}

function currentWorkBarContext() {
  return {
    getCurrentWork: () => currentWork,
    getCurrentPlatform: () => currentPlatform,
    getWorksMap: () => works,
    addWork,
    removeWork,
    getCustomCats,
    escHtml,
    pruneTrackedWorkIfInvalid,
    saveWorks,
    showToast,
    renderAll,
    labelFor,
    trackedLabelFor,
    platformEditionLabel
  };
}

// Work Management
function addWork(info) {
  const {
    workId, title, author, authorUrl, url, fandoms, relationship, summary,
    seriesTitle, seriesUrl, seriesPosition, status, wordCount, kudosCount,
    bookmarksCount, hitsCount, updatedAt, completedAt, publishedAt,
    inferredCompletedAt, subscribedAtAo3, platform
  } = info;
  const existing = works[workId] || {};
  const normalizedStatus = normalizeStatusValue(status);
  const statusChanged = existing.status && existing.status !== normalizedStatus;
  works[workId] = {
    ...existing,
    id: workId,
    title: title || 'Untitled',
    author: author || 'Anonymous',
    platform: normalizePlatform(platform || existing.platform || currentPlatform),
    authorUrl: authorUrl || existing.authorUrl || null,
    summary: summary || existing.summary || '',
    url: url || '#',
    fandoms: fandoms || [],
    relationship: relationship || existing.relationship || '',
    seriesTitle: seriesTitle || existing.seriesTitle || '',
    seriesUrl: seriesUrl || existing.seriesUrl || null,
    seriesPosition: seriesPosition || existing.seriesPosition || '',
    status: normalizedStatus,
    wordCount: wordCount != null ? wordCount : existing.wordCount,
    kudosCount: kudosCount != null ? kudosCount : existing.kudosCount,
    bookmarksCount: bookmarksCount != null ? bookmarksCount : existing.bookmarksCount,
    hitsCount: hitsCount != null ? hitsCount : existing.hitsCount,
    updatedAt: updatedAt != null ? updatedAt : existing.updatedAt,
    completedAt: completedAt != null ? completedAt : existing.completedAt,
    publishedAt: publishedAt != null ? publishedAt : existing.publishedAt,
    inferredCompletedAt: inferredCompletedAt != null ? inferredCompletedAt : existing.inferredCompletedAt,
    subscribedAtAo3: typeof subscribedAtAo3 === 'boolean' ? subscribedAtAo3 : existing.subscribedAtAo3,
    finishedAt: nextFinishedAt(existing.status, normalizedStatus, existing.finishedAt),
    addedAt: existing.addedAt || Date.now(),
    movedAt: statusChanged ? Date.now() : (existing.movedAt || undefined),
    lastModifiedAt: Date.now()
  };
  if (existing.status && normalizedStatus === 'rereading' && existing.status !== 'rereading') {
    applyRereadingChapterResetIfNeeded(existing.status, normalizedStatus, works[workId], () => saveWorks());
  } else {
    saveWorks();
  }
}

function applyRereadingChapterResetIfNeeded(oldStatus, newStatus, work, onDone) {
  if (!work || newStatus !== 'rereading' || oldStatus === 'rereading' || !work.furthestChapter) {
    if (onDone) onDone();
    return;
  }
  showConfirmModal(
    'Reset chapter progress?',
    'You\'re marking this as Re-reading. Reset chapter progress so the tracker starts from the beginning?',
    'Reset', 'Keep current',
    () => { delete work.furthestChapter; if (onDone) onDone(); },
    () => { if (onDone) onDone(); }
  );
}

function showConfirmModal(title, body, confirmLabel, cancelLabel, onConfirm, onCancel) {
  const existing = document.getElementById('confirmOverlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'confirmOverlay';
  overlay.className = 'confirm-overlay';
  overlay.innerHTML = `
    <div class="confirm-modal">
      <div class="confirm-title">${escHtml(title)}</div>
      <div class="confirm-body">${escHtml(body)}</div>
      <div class="confirm-footer">
        <button class="confirm-cancel-btn">${escHtml(cancelLabel)}</button>
        <button class="confirm-ok-btn">${escHtml(confirmLabel)}</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  overlay.querySelector('.confirm-ok-btn').addEventListener('click', () => {
    overlay.remove();
    if (onConfirm) onConfirm();
  });
  overlay.querySelector('.confirm-cancel-btn').addEventListener('click', () => {
    overlay.remove();
    if (onCancel) onCancel();
  });
}

function moveWork(workId, newStatus) {
  if (!works[workId]) return;
  const oldStatus = works[workId].status;
  works[workId].status = normalizeStatusValue(newStatus);
  works[workId].finishedAt = nextFinishedAt(oldStatus, works[workId].status, works[workId].finishedAt);
  works[workId].movedAt = Date.now();
  works[workId].lastModifiedAt = Date.now();
  if (works[workId].status === 'rereading' && oldStatus !== 'rereading' && works[workId].furthestChapter) {
    applyRereadingChapterResetIfNeeded(oldStatus, works[workId].status, works[workId], () => saveWorks());
  } else {
    saveWorks();
  }
}

let _lastRemovedWork = null;
let _undoTimer = null;

/** @returns {boolean} true if the work was removed */
function removeWork(workId) {
  if (!works[workId]) return false;
  if (!window.confirm('Are you sure you want to remove this story from tracking?')) return false;
  const _removedPlatform = works[workId].platform || currentPlatform;
  _lastRemovedWork = { id: workId, data: { ...works[workId] } };
  delete works[workId];
  saveWorks([workId]);
  try { globalThis.FGSheetsEngine?.recordDeletion?.(workId, _removedPlatform); } catch (_e) {}
  showUndoToast('Work removed.', () => {
    if (_lastRemovedWork && _lastRemovedWork.id === workId) {
      works[workId] = _lastRemovedWork.data;
      _lastRemovedWork = null;
      saveWorks();
      renderAll();
    }
  });
  return true;
}


// Rendering
function getOnboardingSteps(platform) {
  if (platform === 'ffnet') {
    return [
      'Go to any FanFiction.net story page. A sidebar will appear on the right — use it to add the work to any of your lists.',
      'Use the <strong>Sort Library</strong> control above to organize your reading list by recency, word count, or a shuffle.',
      'Open the <strong>Dashboard</strong> to see your full library, categories, and stats across all platforms.'
    ];
  }
  return [
    'Go to any AO3 story page. A floating button will appear in the corner. Click it to open your tracker sidebar and add the work to a list.',
    'Already have AO3 bookmarks? Use <strong>Fetch Bookmarks</strong> below to import them all at once.',
    'Read a lot on your phone? Save works to AO3\'s For Later on mobile, then use <strong>Fetch Marked for Later</strong> to pull them in and organize here.'
  ];
}

function renderAll() {
  const allWorks = Object.values(works);
  const byStatus = { all: allWorks, want: [], progress: [], completed: [], rereading: [], onhold: [], dnf: [], lost: [] };
  for (const w of allWorks) {
    const status = normalizeStatusValue(w.status);
    if (byStatus[status]) byStatus[status].push(w);
  }
  const totalCountEl = document.getElementById('totalCount');
  if (totalCountEl) {
    totalCountEl.textContent = `${allWorks.length} work${allWorks.length !== 1 ? 's' : ''}`;
  }

  const onboardingBanner = document.getElementById('onboardingBanner');
  if (onboardingBanner) {
    if (onboardingDismissed) {
      onboardingBanner.style.display = 'none';
    } else {
      onboardingBanner.style.display = '';
      const titleEl = document.getElementById('onboardingTitle');
      const introEl = document.getElementById('onboardingIntro');
      const stepsEl = document.getElementById('onboardingSteps');
      if (allWorks.length === 0) {
        if (titleEl) titleEl.textContent = 'Welcome to FandomGobbler!';
        if (introEl) introEl.textContent = "You haven't tracked any works yet. Here's how to get started:";
      } else {
        if (titleEl) titleEl.textContent = 'Great start!';
        if (introEl) introEl.textContent = `You've got ${allWorks.length} work${allWorks.length !== 1 ? 's' : ''} added. Here are a few more ways to bring works in:`;
      }
      if (stepsEl) {
        stepsEl.innerHTML = getOnboardingSteps(currentPlatform).map(s => `<li>${s}</li>`).join('');
      }
    }
  }

  const sortHint = document.getElementById('popupLibrarySortHint');
  if (sortHint) sortHint.textContent = popupSortHint(popupSortBy);
  renderResetCurrentChapterTool();
  renderAuthorWatchSection();
  renderPopCustomCatOptions();
  renderLastBackupStamp();
  if (bookmarkImportState.open) BookmarkImportPopupController.renderModal?.(bookmarkImportPopupControllerContext());
  if (markedForLaterImportState.open) MarkedForLaterImportPopupController.renderModal?.(markedForLaterImportPopupControllerContext());
}

function popupSortHint(sortKey) {
  if (currentPlatform !== 'ao3' && ['most-popular', 'most-bookmarked', 'most-kudos', 'most-hits'].includes(sortKey)) {
    return 'This sort is reserved for AO3 metadata right now.';
  }
  return {
    'recently-added': 'Newest additions first.',
    'recently-updated': 'Uses saved update dates when available.',
    'most-popular': 'Uses a logarithmic popularity score based on kudos, bookmarks, and hits.',
    'most-bookmarked': 'Bookmarks first, with kudos and hits as tie-breakers.',
    'most-kudos': 'Kudos first, with bookmarks and hits as tie-breakers.',
    'most-hits': 'Hits first, with kudos and bookmarks as tie-breakers.',
    'oldest-for-later': 'Prioritizes the oldest works still sitting in For Later.',
    'longest-unread': 'Prioritizes unfinished reads with the highest word counts.',
    'shortest-unread': 'Prioritizes unfinished reads with the lowest word counts.',
    'highest-rated': 'Your highest-rated works first.',
    'random': 'Shuffles the whole library each time you choose it.'
  }[sortKey] || 'Browse your tracked works with smart sorting in the popup.';
}

// Toast
let toastTimer;
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.innerHTML = escHtml(msg);
  toast.classList.remove('toast-undo');
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

function showUndoToast(msg, onUndo) {
  const toast = document.getElementById('toast');
  toast.innerHTML = `${escHtml(msg)} <button class="toast-undo-btn">Undo</button>`;
  toast.classList.add('show', 'toast-undo');
  clearTimeout(toastTimer);
  const btn = toast.querySelector('.toast-undo-btn');
  if (btn) btn.addEventListener('click', (e) => {
    e.stopPropagation();
    clearTimeout(toastTimer);
    toast.classList.remove('show', 'toast-undo');
    onUndo();
  });
  toastTimer = setTimeout(() => toast.classList.remove('show', 'toast-undo'), 4000);
}

// Helpers
function labelFor(status) {
  return {
    all:       'All Works',
    want:      'For Later',
    progress:  'Reading',
    completed: 'Completed',
    rereading: 'Re-reading',
    onhold:    'On Hold',
    dnf:       'Did Not Finish',
    lost:      'Deleted'
  }[status] || '';
}

// Custom categories (popup)

function getCustomCats(cb) {
  const catsKey = currentCustomCatsStorageKey();
  chrome.storage.local.get(catsKey, d => cb(d[catsKey] || {}));
}
function setCustomCats(cats) {
  chrome.storage.local.set({ [currentCustomCatsStorageKey()]: cats });
}
function genCatId() { return 'cat-' + Date.now() + '-' + Math.random().toString(36).slice(2,6); }

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function truncate(str, len) {
  return str.length > len ? str.slice(0, len - 1) + '…' : str;
}

// --- Floating Button Toggle ---
function setupFloatToggle() {
  const btn = document.getElementById('floatToggle');
  const resetBtn = document.getElementById('floatResetBtn');
  const title = document.getElementById('floatTitle');
  if (!btn) return;

  function setToggleState(enabled) {
    btn.classList.toggle('disabled', !enabled);
    if (title) title.textContent = enabled ? 'Sidebar Button On' : 'Sidebar Button Off';
    const tip = document.getElementById('floatTooltip');
    if (tip) {
        tip.textContent = enabled
          ? 'Access your library, tracked works, and relevant actions on AO3 pages. Click once to hide the button.'
          : 'Hides the sidebar button on AO3 pages. Click once to turn it back on.';
    }
  }

  PopupStorageAdapter.get(AO3_FLOATING_KEY).then(value => setToggleState(value !== false));

  btn.addEventListener('click', async () => {
    const current = (await PopupStorageAdapter.get(AO3_FLOATING_KEY)) !== false;
    const next = !current;
    PopupStorageAdapter.set(AO3_FLOATING_KEY, next);
    setToggleState(next);
    showToast(next
      ? 'Sidebar button on'
      : 'Sidebar button off. Your full sidebar library is now hidden on AO3 pages.');
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      PopupStorageAdapter.remove(FAB_POSITION_KEY).then(() => showToast('Sidebar button position reset'));
    });
  }
}

// Context builders for feature modules
function notesModalContext() {
  return { getWorks: () => works, saveWorks, showToast, renderAll, truncate };
}

function customCatsContext() {
  return { getCustomCats, setCustomCats, genCatId, getWorks: () => works, saveWorks, pruneWork: workId => pruneTrackedWorkIfInvalidInMap(works, workId), showToast, renderAll, escHtml };
}

function exportImportContext() {
  return { getWorks: () => works, saveWorks, getCustomCats, setCustomCats, genCatId, showToast, renderAll, labelFor, formatDateShort };
}

function subscriptionRefreshContext() {
  return { getWorks: () => works, saveWorks, showToast, renderAll, waitMs, extractWorkIdFromUrl, looksLikeAo3BotBlock };
}

// Thin wrapper/delegate functions
function setupNotesModal() {
  if (typeof NotesModalPopupController.setupControls === 'function')
    NotesModalPopupController.setupControls(notesModalContext());
}
function openNotesModal(workId) {
  if (typeof NotesModalPopupController.openNotesModal === 'function')
    NotesModalPopupController.openNotesModal(workId, notesModalContext());
}
function setupCustomCats() {
  if (typeof CustomCatsPopupController.setupControls === 'function')
    CustomCatsPopupController.setupControls(customCatsContext());
}
function renderPopCustomCatOptions() {
  if (typeof CustomCatsPopupController.renderCategoryManager === 'function')
    CustomCatsPopupController.renderCategoryManager(customCatsContext());
}
// Export / Import
function setupExport() {
  if (typeof ExportImportPopupController.setupControls === 'function')
    ExportImportPopupController.setupControls(exportImportContext());
}
function renderLastBackupStamp() {
  if (typeof ExportImportPopupController.renderLastBackupStamp === 'function')
    ExportImportPopupController.renderLastBackupStamp(exportImportContext());
}
function setupSubscriptionRefresh() {
  if (typeof SubscriptionRefreshPopupController.setupControls === 'function')
    SubscriptionRefreshPopupController.setupControls(subscriptionRefreshContext());
}

function setupResetCurrentChapterTool() {
  const btn = document.getElementById('resetCurrentChapterBtn');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    const tracked = currentWork && works[currentWork.workId];
    if (!currentWork?.workId) {
      showToast('Open an AO3 work page first.');
      return;
    }
    if (!tracked) {
      showToast('Track this work first.');
      return;
    }
    if (!tracked.furthestChapter) {
      showToast('No saved chapter progress on this work yet.');
      return;
    }
    if (!window.confirm('Clear the saved chapter progress for this work?')) return;

    delete tracked.furthestChapter;
    await saveWorks();
    renderAll();
    showToast('Chapter progress cleared.');
  });
}

function renderResetCurrentChapterTool() {
  const btn = document.getElementById('resetCurrentChapterBtn');
  const meta = document.getElementById('resetCurrentChapterMeta');
  if (!btn || !meta) return;

  const tracked = currentWork?.workId ? works[currentWork.workId] : null;
  const hasProgress = !!tracked?.furthestChapter;

  btn.disabled = !hasProgress;

  if (!currentWork?.workId) {
    meta.textContent = 'Open a tracked AO3 work page to clear its saved chapter progress.';
    return;
  }
  if (!tracked) {
    meta.textContent = 'Track the current work first, then you can clear its saved chapter progress here.';
    return;
  }
  if (!hasProgress) {
    meta.textContent = 'This clears the saved chapter progress for the current work when there is progress to reset.';
    return;
  }

  const chapterLabel = tracked.furthestChapter.total
    ? `ch. ${tracked.furthestChapter.num} of ${tracked.furthestChapter.total}`
    : `ch. ${tracked.furthestChapter.num}`;
  meta.textContent = `Clears the saved ${chapterLabel} progress for the current work.`;
}

function setupAuthorWatchControls() {
  if (typeof AuthorWatchPopupController.setupControls === 'function') {
    AuthorWatchPopupController.setupControls(authorWatchPopupControllerContext());
  }
}

function setupBookmarkImportControls() {
  if (typeof BookmarkImportPopupController.setupControls === 'function') {
    BookmarkImportPopupController.setupControls(bookmarkImportPopupControllerContext());
  }
}

function setupMarkedForLaterImportControls() {
  if (typeof MarkedForLaterImportPopupController.setupControls === 'function') {
    MarkedForLaterImportPopupController.setupControls(markedForLaterImportPopupControllerContext());
  }
}

function parseAo3Html(html) {
  const sanitized = stripFetchedAo3HtmlLocally(sanitizeFetchedAo3Html(html));
  const parsed = new DOMParser().parseFromString(sanitized, 'text/html');
  removeFetchedAo3ResourceLoads(parsed);
  const root = document.createElement('div');
  root.append(...Array.from(parsed.body.childNodes).map(node => node.cloneNode(true)));
  removeFetchedAo3ResourceLoads(root);

  root.querySelectorAll('[href]').forEach(el => {
    const rawHref = el.getAttribute('href');
    if (!rawHref) return;
    try {
      el.setAttribute('href', new URL(rawHref, 'https://archiveofourown.org/').toString());
    } catch (e) {}
  });

  root.querySelectorAll('[src]').forEach(el => {
    const rawSrc = el.getAttribute('src');
    if (!rawSrc) return;
    try {
      el.setAttribute('src', new URL(rawSrc, 'https://archiveofourown.org/').toString());
    } catch (e) {}
  });

  return root;
}

function stripFetchedAo3HtmlLocally(html) {
  const raw = String(html || '');
  const stripped = raw
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
  const bodyMatch = stripped.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return bodyMatch ? bodyMatch[1] : stripped;
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

function renderAuthorWatchSection() {
  if (typeof AuthorWatchPopupController.renderSection === 'function') {
    AuthorWatchPopupController.renderSection(authorWatchPopupControllerContext());
  }
}

function waitMs(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
