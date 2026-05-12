// Google OAuth client IDs that are safe to ship in browser extensions.
// Chrome uses manifest.oauth2.client_id. Firefox uses this value with
// browser.identity.launchWebAuthFlow() and PKCE.
(function (global) {
  'use strict';

  global.FGSheetsOAuthConfig = {
    firefoxClientId: '183882310762-aaklnca5v78daoiic6gbquc48abd7016.apps.googleusercontent.com'
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = global.FGSheetsOAuthConfig;
})(typeof globalThis !== 'undefined' ? globalThis : this);
