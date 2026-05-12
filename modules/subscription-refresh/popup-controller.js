(function (global) {
  'use strict';

  // --- Context accessors ---
  function getWorks(context) {
    return typeof context.getWorks === 'function' ? context.getWorks() : {};
  }

  function saveWorks(context) {
    if (typeof context.saveWorks === 'function') return context.saveWorks();
    return Promise.resolve();
  }

  function showToast(context, msg) {
    if (typeof context.showToast === 'function') context.showToast(msg);
  }

  function renderAll(context) {
    if (typeof context.renderAll === 'function') context.renderAll();
  }

  function waitMs(context, ms) {
    if (typeof context.waitMs === 'function') return context.waitMs(ms);
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function extractWorkIdFromUrl(context, url) {
    if (typeof context.extractWorkIdFromUrl === 'function') return context.extractWorkIdFromUrl(url);
    const m = String(url || '').match(/archiveofourown\.org\/works\/(\d+)/);
    return m ? m[1] : null;
  }

  function looksLikeAo3BotBlock(context, html) {
    if (typeof context.looksLikeAo3BotBlock === 'function') return context.looksLikeAo3BotBlock(html);
    return false;
  }

  // --- Core logic ---
  function detectSubscribedStateFromHtml(html, workId) {
    if (!html || !workId) return null;
    try {
      const workSubRe = new RegExp(`/works/${workId}[^"'\\s>]*subscriptions`, 'i');
      if (!workSubRe.test(html)) return null;

      const subWithIdRe = new RegExp(`/works/${workId}[^"'\\s>]*subscriptions/\\d+`, 'i');
      if (subWithIdRe.test(html)) return true;
      if (workSubRe.test(html)) return false;
      return null;
    } catch (e) {
      return null;
    }
  }

  async function fetchSubscribedStateForWork(context, url) {
    const workId = extractWorkIdFromUrl(context, url);
    if (!workId) return null;

    try {
      const resp = await fetch(url, { credentials: 'include' });
      if (!resp.ok) return null;
      const html = await resp.text();
      if (looksLikeAo3BotBlock(context, html)) return 'bot-blocked';
      return detectSubscribedStateFromHtml(html, workId);
    } catch (e) {
      return null;
    }
  }

  async function refreshTrackedSubscriptions(context) {
    const btn = document.getElementById('refreshSubscriptionsBtn');
    const works = getWorks(context);
    const allWorks = Object.values(works);

    if (!allWorks.length) {
      showToast(context, 'Nothing to refresh yet.');
      return;
    }

    const SUBSCRIPTION_REFRESH_BATCH = 8;
    const SUBSCRIPTION_REFRESH_DELAY = 3000;

    const candidates = allWorks
      .filter(w => w.url && extractWorkIdFromUrl(context, w.url))
      .sort((a, b) => {
        const aPriority = a.subscribedAtAo3 === true ? 0 : a.subscribedAtAo3 == null ? 1 : 2;
        const bPriority = b.subscribedAtAo3 === true ? 0 : b.subscribedAtAo3 == null ? 1 : 2;
        return aPriority - bPriority;
      })
      .slice(0, SUBSCRIPTION_REFRESH_BATCH);

    if (!candidates.length) {
      showToast(context, 'No trackable AO3 works found to refresh.');
      return;
    }

    const previousLabel = btn ? (btn.textContent || 'Refresh Subscriptions') : 'Refresh Subscriptions';
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Refreshing...';
    }

    let updated = 0;
    let unchanged = 0;
    let skipped = 0;
    let botBlocked = false;

    try {
      for (let i = 0; i < candidates.length; i++) {
        if (i > 0) await waitMs(context, SUBSCRIPTION_REFRESH_DELAY);
        const work = candidates[i];
        const nextState = await fetchSubscribedStateForWork(context, work.url);
        if (nextState === 'bot-blocked') {
          botBlocked = true;
          break;
        }
        if (nextState === null) {
          skipped += 1;
          continue;
        }
        const currentWorks = getWorks(context);
        if (currentWorks[work.id] && currentWorks[work.id].subscribedAtAo3 !== nextState) {
          currentWorks[work.id].subscribedAtAo3 = nextState;
          updated += 1;
        } else {
          unchanged += 1;
        }
      }

      await saveWorks(context);
      renderAll(context);

      const currentWorks = getWorks(context);
      const currentAllWorks = Object.values(currentWorks);

      if (botBlocked) {
        showToast(context, `AO3 slowed the check down. Updated ${updated}, left the rest for later. Wait a bit, then try again.`);
      } else {
        const remaining = Math.max(0, currentAllWorks.filter(w => w.url && extractWorkIdFromUrl(context, w.url)).length - candidates.length);
        showToast(context, `Subscriptions refreshed: ${updated} updated, ${unchanged} unchanged, ${skipped} skipped.${remaining ? ` ${remaining} left for another pass.` : ''}`);
      }
    } catch (e) {
      console.error('Subscription refresh failed:', e);
      showToast(context, 'Subscription refresh failed. Try again while logged into AO3.');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = previousLabel;
      }
    }
  }

  // --- Setup ---
  function setupControls(context) {
    const btn = document.getElementById('refreshSubscriptionsBtn');
    if (btn) {
      btn.addEventListener('click', () => refreshTrackedSubscriptions(context));
    }
  }

  global.AO3TrackerSubscriptionRefreshPopupController = {
    setupControls
  };

})(typeof globalThis !== 'undefined' ? globalThis : this);
