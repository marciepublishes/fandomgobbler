function initSheetsEngineFromBackgroundModules() {
  if (globalThis.FGSheetsEngine && globalThis.AO3TrackerStorageKeys) {
    const {
      SHEETS_ENABLED_KEY, SHEETS_SPREADSHEET_ID_KEY, SHEETS_OWNER_EMAIL_KEY,
      SHEETS_SYNC_STATUS_KEY, SHEETS_NEEDS_PUSH_KEY, SHEETS_PENDING_TOMBSTONES_KEY
    } = globalThis.AO3TrackerStorageKeys;
    globalThis.FGSheetsEngine.init({
      SHEETS_ENABLED_KEY,
      SHEETS_SPREADSHEET_ID_KEY,
      SHEETS_OWNER_EMAIL_KEY,
      SHEETS_SYNC_STATUS_KEY,
      SHEETS_NEEDS_PUSH_KEY,
      SHEETS_PENDING_TOMBSTONES_KEY
    });
  }
}

// Chrome MV3 service workers use importScripts. Firefox background pages load
// these files through manifest.background.scripts instead.
try {
  if (typeof importScripts !== 'function') throw new Error('IMPORT_SCRIPTS_UNAVAILABLE');
  importScripts(
    'modules/storage-keys/index.js',
    'modules/ao3-page/core.js',
    'modules/availability-checker/controller.js',
    'modules/google-sheets-sync/oauth-config.js',
    'modules/google-sheets-sync/auth.js',
    'modules/google-sheets-sync/api.js',
    'modules/google-sheets-sync/schema.js',
    'modules/google-sheets-sync/engine.js'
  );
} catch (importErr) {
  if (!importErr || importErr.message !== 'IMPORT_SCRIPTS_UNAVAILABLE') {
    console.warn('[FandomGobbler] Sheets sync modules failed to load:', importErr);
  }
}

initSheetsEngineFromBackgroundModules();


// Create the periodic sync alarm on installation and startup.
// Non-interactive: never shows a sign-in dialog. If auth fails the status
// is updated in storage and the popup surfaces it to the user.
const SYNC_ALARM_NAME = 'fg-sheets-sync';
const SYNC_ALARM_PERIOD_MINUTES = 15;
const AVAILABILITY_ALARM_NAME = 'fg-availability-check';
const AVAILABILITY_ALARM_PERIOD_MINUTES = 60;
const AVAILABILITY_RECHECK_MIN_MS = 6 * 60 * 60 * 1000;
const AVAILABILITY_CHECK_BATCH = 10;

function badgeTextForCount(count) {
  const n = Math.max(0, Number(count) || 0);
  if (!n) return '';
  return n > 99 ? '99+' : String(n);
}

function updateCombinedPendingBadge() {
  try {
    const keys = globalThis.AO3TrackerStorageKeys || {};
    const mflKey = keys.MFL_PENDING_COUNT_KEY;
    const authorMatchesKey = keys.AUTHOR_WATCH_MATCHES_KEY;
    const worksKeys = ['ao3works', 'fandomgobbler_ffnet_works', 'fandomgobbler_wattpad_works', 'fandomgobbler_tumblr_works'];
    if (!mflKey || !authorMatchesKey || !chrome.storage?.local || !chrome.action?.setBadgeText) return;
    chrome.storage.local.get([mflKey, authorMatchesKey, keys.LOST_WORK_ACK_KEY, ...worksKeys], data => {
      const mflCount = Number(data[mflKey]?.count) || 0;
      const authorCount = Array.isArray(data[authorMatchesKey]) ? data[authorMatchesKey].length : 0;
      const lostAck = (keys.LOST_WORK_ACK_KEY && data[keys.LOST_WORK_ACK_KEY]) || {};
      const deletedCount = worksKeys.reduce((sum, key) => {
        const map = data[key] || {};
        const acknowledgedIds = new Set(Array.isArray(lostAck[key]) ? lostAck[key].map(String) : []);
        return sum + Object.values(map).filter(work =>
          work &&
          work.status === 'lost' &&
          !acknowledgedIds.has(String(work.id || ''))
        ).length;
      }, 0);
      const total = Math.max(0, mflCount) + Math.max(0, authorCount) + Math.max(0, deletedCount);
      chrome.action.setBadgeText({ text: badgeTextForCount(total) });
      if (total > 0) chrome.action.setBadgeBackgroundColor?.({ color: '#2aa198' });
    });
  } catch (error) {}
}

function notificationPayloadForDeletedWork(work) {
  const checker = globalThis.AO3TrackerAvailabilityChecker;
  if (checker?.__test?.deletedWorkNotificationPayload) {
    return checker.__test.deletedWorkNotificationPayload(work);
  }
  const title = String(work?.title || 'A tracked work');
  const shortTitle = title.length > 40 ? title.slice(0, 39) + '...' : title;
  return {
    type: 'basic',
    iconUrl: 'icons/fg-icon128.png',
    title: 'Tracked work may be gone',
    message: `"${shortTitle}" may have been removed from AO3.`
  };
}

function createDeletedWorkNotification(work) {
  try {
    if (!chrome.notifications?.create) return;
    chrome.notifications.create(
      `fandomgobbler-lost-${work?.id || Date.now()}`,
      notificationPayloadForDeletedWork(work)
    );
  } catch (error) {}
}

function normalizeDashboardLaunchPlatform(platform) {
  const value = String(platform || '').trim().toLowerCase();
  return ['ao3', 'ffnet', 'wattpad', 'tumblr'].includes(value) ? value : 'ao3';
}

function openDashboardFromMessage(message, sendResponse) {
  const platform = normalizeDashboardLaunchPlatform(message?.platform);
  const dashboardUrl = `${chrome.runtime.getURL('dashboard.html')}?platform=${encodeURIComponent(platform)}`;
  const platformKey = globalThis.AO3TrackerStorageKeys?.DASHBOARD_PLATFORM_KEY || 'fandomgobbler_platform';
  const reply = payload => {
    try { sendResponse?.(payload); } catch (error) {}
  };
  const openTab = () => {
    try {
      if (!chrome.tabs?.create) {
        reply({ ok: false, url: dashboardUrl, reason: 'tabs_unavailable' });
        return;
      }
      chrome.tabs.create({ url: dashboardUrl }, () => {
        const err = chrome.runtime?.lastError;
        reply(err
          ? { ok: false, url: dashboardUrl, reason: String(err.message || err) }
          : { ok: true, url: dashboardUrl });
      });
    } catch (error) {
      reply({ ok: false, url: dashboardUrl, reason: String(error?.message || error) });
    }
  };

  try {
    if (chrome.storage?.local) {
      chrome.storage.local.set({ [platformKey]: platform }, openTab);
      return true;
    }
  } catch (error) {}
  openTab();
  return true;
}

function getAo3Works() {
  return new Promise(resolve => {
    try {
      chrome.storage.local.get('ao3works', data => resolve(data.ao3works || {}));
    } catch (error) {
      resolve({});
    }
  });
}

function setAo3Works(works) {
  return new Promise(resolve => {
    try {
      chrome.storage.local.set({ ao3works: works }, resolve);
    } catch (error) {
      resolve();
    }
  });
}

function mergeAvailabilityResult(work, result, now) {
  work.lastChecked = now;
  if (result.wordCount) work.wordCount = result.wordCount;
  if (result.kudosCount) work.kudosCount = result.kudosCount;
  if (result.bookmarksCount) work.bookmarksCount = result.bookmarksCount;
  if (result.hitsCount) work.hitsCount = result.hitsCount;
  if (result.updatedAt && !work.updatedAt) work.updatedAt = result.updatedAt;
  if (result.completedAt && !work.completedAt) work.completedAt = result.completedAt;
  if (result.publishedAt && !work.publishedAt) work.publishedAt = result.publishedAt;
  if (result.inferredCompletedAt && !work.inferredCompletedAt) work.inferredCompletedAt = result.inferredCompletedAt;
  if (result.subscribedAtAo3 !== null && work.subscribedAtAo3 !== result.subscribedAtAo3) {
    work.subscribedAtAo3 = result.subscribedAtAo3;
  }
}

async function runAvailabilityAlarmCheck() {
  const checker = globalThis.AO3TrackerAvailabilityChecker;
  const checkWorkAvailable = checker?.__test?.checkWorkAvailable;
  if (typeof checkWorkAvailable !== 'function' || !chrome.storage?.local) return;

  const works = await getAo3Works();
  const now = Date.now();
  const candidates = Object.values(works)
    .filter(work =>
      work &&
      work.status !== 'lost' &&
      work.url &&
      work.url.includes('archiveofourown.org/works/') &&
      (!work.lastChecked || (now - work.lastChecked) > AVAILABILITY_RECHECK_MIN_MS)
    )
    .sort((a, b) => (a.lastChecked || 0) - (b.lastChecked || 0))
    .slice(0, AVAILABILITY_CHECK_BATCH);
  if (!candidates.length) return;

  let changed = false;
  for (const candidate of candidates) {
    const liveWorks = changed ? await getAo3Works() : works;
    const work = liveWorks[candidate.id];
    if (!work || work.status === 'lost') continue;

    const result = await checkWorkAvailable(work.url);
    mergeAvailabilityResult(work, result, Date.now());
    if (result.availability === 'deleted' && work.status !== 'lost') {
      work.lostFrom = work.status;
      work.status = 'lost';
      work.lostAt = Date.now();
      createDeletedWorkNotification(work);
    }
    await setAo3Works(liveWorks);
    changed = true;
  }
  if (changed) updateCombinedPendingBadge();
}

function ensureAvailabilityAlarm() {
  try {
    chrome.alarms.get(AVAILABILITY_ALARM_NAME, alarm => {
      if (!alarm) {
        chrome.alarms.create(AVAILABILITY_ALARM_NAME, {
          delayInMinutes: 1,
          periodInMinutes: AVAILABILITY_ALARM_PERIOD_MINUTES
        });
      }
    });
  } catch (error) {}
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(SYNC_ALARM_NAME, { periodInMinutes: SYNC_ALARM_PERIOD_MINUTES });
  ensureAvailabilityAlarm();
  updateCombinedPendingBadge();
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.get(SYNC_ALARM_NAME, alarm => {
    if (!alarm) {
      chrome.alarms.create(SYNC_ALARM_NAME, { periodInMinutes: SYNC_ALARM_PERIOD_MINUTES });
    }
  });
  ensureAvailabilityAlarm();
  runAvailabilityAlarmCheck().catch(() => {});
  updateCombinedPendingBadge();
});

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === SYNC_ALARM_NAME) {
    if (!globalThis.FGSheetsEngine) return;
    globalThis.FGSheetsEngine.alarmSync().catch(() => {});
    return;
  }
  if (alarm.name === AVAILABILITY_ALARM_NAME) {
    runAvailabilityAlarmCheck().catch(() => {});
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'FG_UPDATE_BADGE') {
    updateCombinedPendingBadge();
    return;
  }
  if (message?.type === 'FG_OPEN_DASHBOARD') {
    return openDashboardFromMessage(message, sendResponse);
  }
  if (!message || message.type !== 'FG_NOTIFY' || !message.payload) return;
  try {
    chrome.notifications.create(
      message.id || `fandomgobbler-${Date.now()}`,
      message.payload
    );
  } catch (error) {
    // Notification support is best-effort; the in-page toast still carries the user-facing state.
  }
});

chrome.storage?.onChanged?.addListener((changes, area) => {
  if (area !== 'local') return;
  const keys = globalThis.AO3TrackerStorageKeys || {};
  if ((keys.MFL_PENDING_COUNT_KEY && changes[keys.MFL_PENDING_COUNT_KEY]) ||
      (keys.AUTHOR_WATCH_MATCHES_KEY && changes[keys.AUTHOR_WATCH_MATCHES_KEY]) ||
      (keys.LOST_WORK_ACK_KEY && changes[keys.LOST_WORK_ACK_KEY]) ||
      changes.ao3works ||
      changes.fandomgobbler_ffnet_works ||
      changes.fandomgobbler_wattpad_works ||
      changes.fandomgobbler_tumblr_works) {
    updateCombinedPendingBadge();
  }
});

async function generateAndSetIcon() {
  try {
    const sizes = [16, 48, 128];
    const imageData = {};

    for (const size of sizes) {
      const canvas = new OffscreenCanvas(size, size);
      const ctx = canvas.getContext('2d');

      // Dark rounded background — matches the dark-mode FAB (#073642)
      const r = Math.round(size * 0.22);
      ctx.beginPath();
      ctx.moveTo(r, 0);
      ctx.lineTo(size - r, 0);
      ctx.arcTo(size, 0, size, r, r);
      ctx.lineTo(size, size - r);
      ctx.arcTo(size, size, size - r, size, r);
      ctx.lineTo(r, size);
      ctx.arcTo(0, size, 0, size - r, r);
      ctx.lineTo(0, r);
      ctx.arcTo(0, 0, r, 0, r);
      ctx.closePath();
      ctx.fillStyle = '#073642';
      ctx.fill();

      // "FG" branding scale
      const fontSize = Math.round(size * 0.62);
      ctx.font = `800 ${fontSize}px 'Arial Narrow', Arial, sans-serif`;
      ctx.fillStyle = '#93a1a1';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.save();
      ctx.translate(size * 0.497, size * 0.535);
      ctx.scale(1.12, 1.2);
      ctx.fillText('FG', 0, 0);
      ctx.restore();

      imageData[size] = ctx.getImageData(0, 0, size, size);
    }

    await chrome.action.setIcon({ imageData });
  } catch (e) {
    // Static PNG icons remain as fallback if font loading fails
  }
}

generateAndSetIcon();
chrome.runtime.onInstalled.addListener(generateAndSetIcon);
chrome.runtime.onStartup.addListener(generateAndSetIcon);
