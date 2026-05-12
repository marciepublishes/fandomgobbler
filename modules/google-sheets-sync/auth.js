// Google OAuth2 token management for Google Sheets sync.
// Runs in both the popup and background service-worker contexts.
(function (global) {
  'use strict';

  const FIREFOX_TOKEN_KEY = 'fandomgobbler_firefox_google_oauth_token';
  const FIREFOX_SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/userinfo.email'
  ];
  const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
  const TOKEN_URL = 'https://oauth2.googleapis.com/token';
  const TOKEN_EXPIRY_SKEW_MS = 60000;

  function runtimeApi() {
    return global.chrome && global.chrome.runtime ? global.chrome.runtime : null;
  }

  function identityApi() {
    const browserIdentity = global.browser && global.browser.identity;
    const chromeIdentity = global.chrome && global.chrome.identity;
    return browserIdentity || chromeIdentity || null;
  }

  function getManifest() {
    try {
      const runtime = runtimeApi();
      return runtime && runtime.getManifest ? runtime.getManifest() : {};
    } catch (e) {
      return {};
    }
  }

  function configuredChromeClientId() {
    const manifest = getManifest();
    const id = (manifest.oauth2 && manifest.oauth2.client_id) || '';
    return id && !id.startsWith('REPLACE_WITH') ? id : '';
  }

  function configuredFirefoxClientId() {
    const config = global.FGSheetsOAuthConfig || {};
    const id = String(config.firefoxClientId || '').trim();
    return id && !id.startsWith('REPLACE_WITH') ? id : '';
  }

  function hasChromeAuthPath() {
    const identity = identityApi();
    return !!(configuredChromeClientId() && identity && typeof identity.getAuthToken === 'function');
  }

  function hasFirefoxAuthPath() {
    const identity = identityApi();
    return !!(configuredFirefoxClientId() &&
      identity &&
      typeof identity.launchWebAuthFlow === 'function' &&
      typeof identity.getRedirectURL === 'function');
  }

  // Returns true if either the Chrome manifest OAuth client or the Firefox
  // launchWebAuthFlow client has been configured.
  function isConfigured() {
    return hasChromeAuthPath() || hasFirefoxAuthPath();
  }

  function storageGet(key) {
    return new Promise(resolve => {
      try {
        chrome.storage.local.get(key, data => resolve(data && data[key]));
      } catch (e) {
        resolve(null);
      }
    });
  }

  function storageSet(values) {
    return new Promise(resolve => {
      try {
        chrome.storage.local.set(values, resolve);
      } catch (e) {
        resolve();
      }
    });
  }

  function storageRemove(key) {
    return new Promise(resolve => {
      try {
        chrome.storage.local.remove(key, resolve);
      } catch (e) {
        resolve();
      }
    });
  }

  function base64Url(bytes) {
    const binary = Array.from(bytes, b => String.fromCharCode(b)).join('');
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  function randomVerifier() {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return base64Url(bytes);
  }

  async function sha256Base64Url(value) {
    const bytes = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return base64Url(new Uint8Array(digest));
  }

  function oauthError(message) {
    const msg = String(message || '');
    if (/cancel|closed|denied|access_denied/i.test(msg)) return new Error('AUTH_CANCELLED');
    if (/not configured|client/i.test(msg)) return new Error('OAUTH_NOT_CONFIGURED');
    return new Error(msg || 'AUTH_NEEDED');
  }

  async function readFirefoxToken() {
    const token = await storageGet(FIREFOX_TOKEN_KEY);
    return token && typeof token === 'object' ? token : null;
  }

  function usableAccessToken(token) {
    if (!token || !token.access_token) return '';
    const expiresAt = Number(token.expires_at) || 0;
    if (!expiresAt || Date.now() >= expiresAt - TOKEN_EXPIRY_SKEW_MS) return '';
    return token.access_token;
  }

  async function saveFirefoxToken(tokenResponse, previousToken) {
    const previous = previousToken || {};
    const expiresIn = Number(tokenResponse.expires_in) || 3600;
    const token = {
      access_token: tokenResponse.access_token || previous.access_token || '',
      refresh_token: tokenResponse.refresh_token || previous.refresh_token || '',
      expires_at: Date.now() + (expiresIn * 1000),
      token_type: tokenResponse.token_type || previous.token_type || 'Bearer',
      scope: tokenResponse.scope || previous.scope || FIREFOX_SCOPES.join(' ')
    };
    await storageSet({ [FIREFOX_TOKEN_KEY]: token });
    return token;
  }

  async function tokenRequest(params) {
    const resp = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params).toString()
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      throw oauthError((data.error_description || data.error || `HTTP ${resp.status}`));
    }
    if (!data.access_token) throw new Error('AUTH_NEEDED');
    return data;
  }

  async function refreshFirefoxToken(existingToken) {
    const current = existingToken || await readFirefoxToken();
    if (!current || !current.refresh_token) throw new Error('AUTH_NEEDED');
    const data = await tokenRequest({
      client_id: configuredFirefoxClientId(),
      grant_type: 'refresh_token',
      refresh_token: current.refresh_token
    });
    const saved = await saveFirefoxToken(data, current);
    return saved.access_token;
  }

  function firefoxLoopbackRedirectURL() {
    const identity = identityApi();
    if (!identity || typeof identity.getRedirectURL !== 'function') return '';
    const baseRedirect = identity.getRedirectURL();
    try {
      const url = new URL(baseRedirect);
      const subdomain = String(url.hostname || '').split('.')[0];
      if (subdomain) return `http://127.0.0.1/mozoauth2/${subdomain}`;
    } catch (e) {}
    return baseRedirect;
  }

  function launchWebAuthFlowCompat(identity, details) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const settle = (url, err) => {
        if (settled) return;
        settled = true;
        err ? reject(err) : resolve(url);
      };

      let result;
      try {
        result = identity.launchWebAuthFlow(details, redirectUrl => {
          const lastErr = typeof chrome !== 'undefined' && chrome.runtime?.lastError;
          lastErr ? settle(null, new Error(lastErr.message)) : settle(redirectUrl);
        });
      } catch (e) {
        settle(null, e);
        return;
      }

      if (result && typeof result.then === 'function') {
        result.then(url => settle(url), err => settle(null, err));
      }
    });
  }

  async function launchFirefoxAuthFlow() {
    if (!hasFirefoxAuthPath()) throw new Error('OAUTH_NOT_CONFIGURED');
    const identity = identityApi();
    const redirectUri = firefoxLoopbackRedirectURL();
    const verifier = randomVerifier();
    const challenge = await sha256Base64Url(verifier);
    const state = randomVerifier();
    const params = new URLSearchParams({
      client_id: configuredFirefoxClientId(),
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: FIREFOX_SCOPES.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      code_challenge: challenge,
      code_challenge_method: 'S256',
      state
    });
    const finalUrl = await launchWebAuthFlowCompat(identity, {
      url: `${AUTH_URL}?${params.toString()}`,
      interactive: true
    }).catch(err => {
      throw oauthError(err && err.message || err);
    });
    if (!finalUrl) throw new Error('AUTH_CANCELLED');
    const url = new URL(finalUrl);
    if (url.searchParams.get('state') !== state) throw new Error('AUTH_NEEDED');
    const error = url.searchParams.get('error');
    if (error) throw oauthError(error);
    const code = url.searchParams.get('code');
    if (!code) throw new Error('AUTH_NEEDED');
    const data = await tokenRequest({
      client_id: configuredFirefoxClientId(),
      code,
      code_verifier: verifier,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri
    });
    const saved = await saveFirefoxToken(data, {});
    return saved.access_token;
  }

  function getChromeToken(interactive) {
    return new Promise((resolve, reject) => {
      if (!hasChromeAuthPath()) {
        reject(new Error('OAUTH_NOT_CONFIGURED'));
        return;
      }
      try {
        chrome.identity.getAuthToken({ interactive: !!interactive }, token => {
          if (chrome.runtime.lastError) {
            const msg = chrome.runtime.lastError.message || 'Auth failed';
            // Translate Chrome Identity error strings into identifiable codes.
            if (/not signed in|not available/i.test(msg)) {
              reject(new Error('AUTH_NEEDED'));
            } else if (/canceled|cancelled/i.test(msg)) {
              reject(new Error('AUTH_CANCELLED'));
            } else {
              reject(new Error(msg));
            }
            return;
          }
          if (!token) {
            reject(new Error(interactive ? 'AUTH_CANCELLED' : 'AUTH_NEEDED'));
            return;
          }
          resolve(token);
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  async function getFirefoxToken(interactive) {
    if (!hasFirefoxAuthPath()) throw new Error('OAUTH_NOT_CONFIGURED');
    const existing = await readFirefoxToken();
    const usable = usableAccessToken(existing);
    if (usable) return usable;
    if (existing && existing.refresh_token) {
      try {
        return await refreshFirefoxToken(existing);
      } catch (e) {
        if (!interactive) throw new Error('AUTH_NEEDED');
      }
    }
    if (!interactive) throw new Error('AUTH_NEEDED');
    return launchFirefoxAuthFlow();
  }

  // Gets an OAuth access token. Chrome uses chrome.identity.getAuthToken.
  // Firefox uses browser.identity.launchWebAuthFlow() + PKCE and stored refresh
  // tokens.
  function getToken(interactive) {
    if (hasChromeAuthPath()) return getChromeToken(interactive);
    return getFirefoxToken(interactive);
  }

  // Removes a token from the browser cache/storage so the next getToken() fetches
  // a fresh one.
  function revokeTokenFromCache(token) {
    if (hasChromeAuthPath()) {
      return new Promise(resolve => {
        try {
          chrome.identity.removeCachedAuthToken({ token }, resolve);
        } catch (e) {
          resolve();
        }
      });
    }
    return storageRemove(FIREFOX_TOKEN_KEY);
  }

  // Called when a Sheets API request returns 401. Revokes the stale token and
  // attempts a non-interactive refresh. Throws if refresh fails.
  async function refreshExpiredToken(expiredToken) {
    if (hasChromeAuthPath()) {
      await revokeTokenFromCache(expiredToken);
      // Non-interactive: succeeds if Chrome still has a valid session for this account.
      return getToken(false);
    }
    const existing = await readFirefoxToken();
    if (existing && existing.refresh_token) return refreshFirefoxToken(existing);
    await revokeTokenFromCache(expiredToken);
    throw new Error('AUTH_NEEDED');
  }

  // Fetches the signed-in user's email. Used to detect account switches.
  async function getUserEmail(token) {
    try {
      const resp = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!resp.ok) return '';
      const data = await resp.json();
      return String(data.email || '');
    } catch (e) {
      return '';
    }
  }

  async function getFirefoxRedirectURL() {
    return firefoxLoopbackRedirectURL();
  }

  const Auth = {
    isConfigured,
    getToken,
    revokeTokenFromCache,
    refreshExpiredToken,
    getUserEmail,
    getFirefoxRedirectURL,
    __test: {
      FIREFOX_TOKEN_KEY,
      FIREFOX_SCOPES,
      configuredFirefoxClientId,
      firefoxLoopbackRedirectURL,
      launchWebAuthFlowCompat
    }
  };

  global.FGSheetsAuth = Auth;
  if (typeof module !== 'undefined' && module.exports) module.exports = Auth;
})(typeof globalThis !== 'undefined' ? globalThis : this);
