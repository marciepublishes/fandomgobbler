const test = require('node:test');
const assert = require('node:assert/strict');

function loadFreshAuth() {
  delete require.cache[require.resolve('../modules/google-sheets-sync/auth.js')];
  return require('../modules/google-sheets-sync/auth.js');
}

function resetGlobals() {
  delete globalThis.chrome;
  delete globalThis.browser;
  delete globalThis.FGSheetsOAuthConfig;
  delete globalThis.FGSheetsAuth;
  delete globalThis.fetch;
}

test('isConfigured returns false for placeholder OAuth client id', () => {
  resetGlobals();
  globalThis.chrome = {
    runtime: {
      getManifest() {
        return { oauth2: { client_id: 'REPLACE_WITH_CLIENT_ID' } };
      }
    }
  };

  const Auth = loadFreshAuth();
  assert.equal(Auth.isConfigured(), false);
});

test('getToken resolves with a cached token when configured', async () => {
  resetGlobals();
  globalThis.chrome = {
    identity: {
      getAuthToken(options, cb) {
        assert.equal(options.interactive, true);
        cb('token-123');
      }
    },
    runtime: {
      getManifest() {
        return { oauth2: { client_id: 'client-id' } };
      },
      get lastError() {
        return null;
      }
    }
  };

  const Auth = loadFreshAuth();
  await assert.doesNotReject(() => Auth.getToken(true));
  assert.equal(await Auth.getToken(true), 'token-123');
});

test('getToken maps Chrome identity errors to stable auth codes', async () => {
  resetGlobals();
  let errorMessage = 'User not signed in';
  globalThis.chrome = {
    identity: {
      getAuthToken(_options, cb) {
        cb(undefined);
      }
    },
    runtime: {
      getManifest() {
        return { oauth2: { client_id: 'client-id' } };
      },
      get lastError() {
        return { message: errorMessage };
      }
    }
  };

  const Auth = loadFreshAuth();

  await assert.rejects(() => Auth.getToken(false), /AUTH_NEEDED/);

  errorMessage = 'The user canceled the sign-in flow.';
  await assert.rejects(() => Auth.getToken(true), /AUTH_CANCELLED/);
});

test('refreshExpiredToken revokes stale token then requests a fresh one', async () => {
  resetGlobals();
  const calls = [];
  globalThis.chrome = {
    identity: {
      removeCachedAuthToken({ token }, cb) {
        calls.push(['revoke', token]);
        cb();
      },
      getAuthToken(options, cb) {
        calls.push(['get', options.interactive]);
        cb('fresh-token');
      }
    },
    runtime: {
      getManifest() {
        return { oauth2: { client_id: 'client-id' } };
      },
      get lastError() {
        return null;
      }
    }
  };

  const Auth = loadFreshAuth();
  const token = await Auth.refreshExpiredToken('expired-token');

  assert.equal(token, 'fresh-token');
  assert.deepEqual(calls, [
    ['revoke', 'expired-token'],
    ['get', false]
  ]);
});

test('getUserEmail returns email on success and blank string on failure', async () => {
  resetGlobals();
  globalThis.chrome = {
    runtime: {
      getManifest() {
        return { oauth2: { client_id: 'client-id' } };
      }
    }
  };

  globalThis.fetch = async () => ({
    ok: true,
    async json() {
      return { email: 'reader@example.com' };
    }
  });

  let Auth = loadFreshAuth();
  assert.equal(await Auth.getUserEmail('token'), 'reader@example.com');

  globalThis.fetch = async () => {
    throw new Error('offline');
  };

  Auth = loadFreshAuth();
  assert.equal(await Auth.getUserEmail('token'), '');
});

test('isConfigured supports Firefox launchWebAuthFlow config', () => {
  resetGlobals();
  globalThis.FGSheetsOAuthConfig = {
    firefoxClientId: 'firefox-client-id.apps.googleusercontent.com'
  };
  globalThis.chrome = {
    runtime: {
      getManifest() {
        return {};
      }
    }
  };
  globalThis.browser = {
    identity: {
      getRedirectURL() {
        return 'https://example.extensions.allizom.org/';
      },
      launchWebAuthFlow() {}
    }
  };

  const Auth = loadFreshAuth();
  assert.equal(Auth.isConfigured(), true);
  assert.equal(Auth.__test.configuredFirefoxClientId(), 'firefox-client-id.apps.googleusercontent.com');
  assert.equal(
    Auth.__test.firefoxLoopbackRedirectURL(),
    'http://127.0.0.1/mozoauth2/example'
  );
});

test('launchWebAuthFlowCompat resolves Firefox promise-style identity responses', async () => {
  resetGlobals();
  const Auth = loadFreshAuth();
  const details = { url: 'https://accounts.example/auth', interactive: true };
  let callbackCalled = false;
  const identity = {
    launchWebAuthFlow(receivedDetails, callback) {
      assert.equal(receivedDetails, details);
      assert.equal(typeof callback, 'function');
      setTimeout(() => {
        callbackCalled = true;
        callback('https://ignored.example/callback');
      }, 0);
      return Promise.resolve('https://promise.example/callback');
    }
  };

  const url = await Auth.__test.launchWebAuthFlowCompat(identity, details);

  assert.equal(url, 'https://promise.example/callback');
  await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal(callbackCalled, true);
});

test('launchWebAuthFlowCompat resolves Chrome callback-style identity responses', async () => {
  resetGlobals();
  globalThis.chrome = {
    runtime: {
      get lastError() {
        return null;
      }
    }
  };
  const Auth = loadFreshAuth();
  const details = { url: 'https://accounts.example/auth', interactive: true };
  const identity = {
    launchWebAuthFlow(receivedDetails, callback) {
      assert.equal(receivedDetails, details);
      assert.equal(typeof callback, 'function');
      callback('https://callback.example/redirect');
      return undefined;
    }
  };

  assert.equal(
    await Auth.__test.launchWebAuthFlowCompat(identity, details),
    'https://callback.example/redirect'
  );
});

test('launchWebAuthFlowCompat rejects synchronous identity errors', async () => {
  resetGlobals();
  const Auth = loadFreshAuth();
  const identity = {
    launchWebAuthFlow() {
      throw new Error('undefined is not an object evaluating parameters.length');
    }
  };

  await assert.rejects(
    () => Auth.__test.launchWebAuthFlowCompat(identity, { url: 'https://accounts.example/auth' }),
    /parameters\.length/
  );
});

test('Firefox getToken returns cached unexpired token', async () => {
  resetGlobals();
  const store = {
    fandomgobbler_firefox_google_oauth_token: {
      access_token: 'cached-firefox-token',
      refresh_token: 'refresh-token',
      expires_at: Date.now() + 300000
    }
  };
  globalThis.FGSheetsOAuthConfig = { firefoxClientId: 'firefox-client-id.apps.googleusercontent.com' };
  globalThis.chrome = {
    runtime: {
      getManifest() {
        return {};
      }
    },
    storage: {
      local: {
        get(key, cb) {
          cb({ [key]: store[key] });
        },
        set(values, cb) {
          Object.assign(store, values);
          cb && cb();
        }
      }
    }
  };
  globalThis.browser = {
    identity: {
      getRedirectURL() {
        return 'https://example.extensions.allizom.org/';
      },
      launchWebAuthFlow() {
        throw new Error('should not launch');
      }
    }
  };

  const Auth = loadFreshAuth();
  assert.equal(await Auth.getToken(false), 'cached-firefox-token');
});

test('Firefox refreshExpiredToken uses stored refresh token', async () => {
  resetGlobals();
  const store = {
    fandomgobbler_firefox_google_oauth_token: {
      access_token: 'expired-token',
      refresh_token: 'refresh-token',
      expires_at: Date.now() - 1000
    }
  };
  globalThis.FGSheetsOAuthConfig = { firefoxClientId: 'firefox-client-id.apps.googleusercontent.com' };
  globalThis.chrome = {
    runtime: {
      getManifest() {
        return {};
      }
    },
    storage: {
      local: {
        get(key, cb) {
          cb({ [key]: store[key] });
        },
        set(values, cb) {
          Object.assign(store, values);
          cb && cb();
        },
        remove(key, cb) {
          delete store[key];
          cb && cb();
        }
      }
    }
  };
  globalThis.browser = {
    identity: {
      getRedirectURL() {
        return 'https://example.extensions.allizom.org/';
      },
      launchWebAuthFlow() {}
    }
  };
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.method, 'POST');
    const params = new URLSearchParams(options.body);
    assert.equal(params.get('grant_type'), 'refresh_token');
    assert.equal(params.get('refresh_token'), 'refresh-token');
    return {
      ok: true,
      async json() {
        return { access_token: 'fresh-firefox-token', expires_in: 3600 };
      }
    };
  };

  const Auth = loadFreshAuth();
  assert.equal(await Auth.refreshExpiredToken('expired-token'), 'fresh-firefox-token');
  assert.equal(store.fandomgobbler_firefox_google_oauth_token.access_token, 'fresh-firefox-token');
  assert.equal(store.fandomgobbler_firefox_google_oauth_token.refresh_token, 'refresh-token');
});
