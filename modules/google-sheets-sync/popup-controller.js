// Google Sheets Sync section in the extension popup.
// Depends on: FGSheetsAuth, FGSheetsEngine (already loaded via popup.html scripts).
(function (global) {
  'use strict';

  function Engine() { return global.FGSheetsEngine; }
  function Auth()   { return global.FGSheetsAuth;   }

  // Relative-time formatter for the "last synced" display.
  function relativeTime(ts) {
    if (!ts) return 'never';
    const diff = Date.now() - ts;
    if (diff < 60000)        return 'just now';
    if (diff < 3600000)      return `${Math.floor(diff / 60000)} min ago`;
    if (diff < 86400000)     return `${Math.floor(diff / 3600000)} hr ago`;
    if (diff < 7 * 86400000) return `${Math.floor(diff / 86400000)}d ago`;
    return new Date(ts).toLocaleDateString('en-US');
  }

  function el(id) { return document.getElementById(id); }

  // Renders the sync section based on current status from chrome.storage.local.
  // context.getSyncStatus() returns the status object; context.getSheetsEnabled()
  // returns the enabled boolean.
  function renderSection(context) {
    const statusEl    = el('sheetsSyncStatus');
    const dotEl       = el('sheetsSyncDot');
    const connectBtn  = el('sheetsSyncConnectBtn');
    const disconnBtn  = el('sheetsSyncDisconnectBtn');
    const syncNowBtn  = el('sheetsSyncNowBtn');
    const reAuthBtn   = el('sheetsSyncReAuthBtn');
    const emailEl     = el('sheetsSyncEmail');
    const panelEl     = el('sheetsSyncPanel');
    const toggleBtn   = el('sheetsSyncToggle');

    if (!panelEl) return;

    const configured = Auth().isConfigured();
    const enabled    = context.getSheetsEnabled();
    const status     = context.getSyncStatus();

    function show(btn)  { btn && btn.classList.remove('hidden'); }
    function hide(btn)  { btn && btn.classList.add('hidden');    }

    if (!configured) {
      if (dotEl) dotEl.dataset.state = 'error';
      if (statusEl) statusEl.textContent = 'Google Sheets sync is not configured in this build.';
      hide(connectBtn); hide(disconnBtn); hide(syncNowBtn); hide(reAuthBtn);
      if (emailEl) emailEl.textContent = '';
      return;
    }

    if (!enabled) {
      if (dotEl) dotEl.dataset.state = '';
      if (statusEl) statusEl.textContent = 'Not connected.';
      show(connectBtn); hide(disconnBtn); hide(syncNowBtn); hide(reAuthBtn);
      if (emailEl) emailEl.textContent = '';
      return;
    }

    // Sync is enabled — show the appropriate controls based on state.
    hide(connectBtn);
    show(disconnBtn);

    const state = status.state || 'idle';
    if (dotEl) dotEl.dataset.state = state === 'auth_needed' ? 'auth' : state;

    if (state === 'syncing') {
      if (statusEl) statusEl.textContent = status.message || 'Syncing...';
      hide(syncNowBtn); hide(reAuthBtn);
    } else if (state === 'auth_needed') {
      if (statusEl) statusEl.textContent = 'Google sign-in required.';
      hide(syncNowBtn); show(reAuthBtn);
    } else if (state === 'error') {
      if (statusEl) statusEl.textContent = status.message || 'Sync error.';
      show(syncNowBtn); hide(reAuthBtn);
    } else {
      const lastStr = relativeTime(status.lastSyncedAt);
      if (statusEl) statusEl.textContent = status.message
        ? `${status.message} (${lastStr})`
        : `Last synced ${lastStr}.`;
      show(syncNowBtn); hide(reAuthBtn);
    }

    // Show owner email if stored
    if (emailEl) {
      chrome.storage.local.get(context.SHEETS_OWNER_EMAIL_KEY, d => {
        const email = d[context.SHEETS_OWNER_EMAIL_KEY] || '';
        emailEl.textContent = email ? `Connected as ${email}` : '';
      });
    }
  }

  function setupControls(context) {
    // Connect button — shows Google sign-in dialog, creates sheet, initial push.
    el('sheetsSyncConnectBtn')?.addEventListener('click', async () => {
      el('sheetsSyncConnectBtn')?.setAttribute('disabled', 'true');
      try {
        await Engine().setupSync();
        context.renderSheetsSection();
        context.showToast('Google Sheets sync enabled.');
      } catch (err) {
        context.renderSheetsSection();
        if (err.message !== 'AUTH_CANCELLED') {
          context.showToast(
            err.message === 'OAUTH_NOT_CONFIGURED'
              ? 'Google Sheets sync is not configured in this build.'
              : `Setup failed: ${err.message}`
          );
        }
      } finally {
        el('sheetsSyncConnectBtn')?.removeAttribute('disabled');
      }
    });

    // Disconnect — keeps local data and the sheet; just turns off auto-sync.
    el('sheetsSyncDisconnectBtn')?.addEventListener('click', () => {
      if (!window.confirm(
        'Disconnect Google Sheets sync?\n\nYour local library stays intact. The Google Sheet stays in your Drive.'
      )) return;
      Engine().disconnectSync().then(() => {
        context.renderSheetsSection();
        context.showToast('Google Sheets sync disconnected.');
      });
    });

    // Sync Now — non-interactive (won't show sign-in dialog; use Re-authorize for that).
    el('sheetsSyncNowBtn')?.addEventListener('click', async () => {
      el('sheetsSyncNowBtn')?.setAttribute('disabled', 'true');
      try {
        const result = await Engine().fullSync(false);
        context.renderSheetsSection();
        if (result.ok) context.showToast('Sync complete.');
        else if (result.error === 'AUTH_NEEDED') context.showToast('Sign in required. Click Re-authorize.');
        else if (result.skipped) { /* nothing to show */ }
        else context.showToast(`Sync: ${result.error || 'unknown error'}`);
      } finally {
        el('sheetsSyncNowBtn')?.removeAttribute('disabled');
        context.renderSheetsSection();
      }
    });

    // Re-authorize — interactive, shows Google sign-in if needed.
    el('sheetsSyncReAuthBtn')?.addEventListener('click', async () => {
      el('sheetsSyncReAuthBtn')?.setAttribute('disabled', 'true');
      try {
        const result = await Engine().fullSync(true);
        context.renderSheetsSection();
        if (result.ok) context.showToast('Re-authorized and synced.');
      } catch (err) {
        context.renderSheetsSection();
      } finally {
        el('sheetsSyncReAuthBtn')?.removeAttribute('disabled');
      }
    });

  }

  const Controller = { renderSection, setupControls };
  global.FGSheetsSyncPopupController = Controller;
  if (typeof module !== 'undefined' && module.exports) module.exports = Controller;
})(typeof globalThis !== 'undefined' ? globalThis : this);
