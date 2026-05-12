(function (global) {
  'use strict';

  const PLATFORM_ORDER = ['ao3', 'ffnet', 'wattpad', 'tumblr'];

  const PLATFORMS = {
    ao3: {
      id: 'ao3',
      editionLabel: 'AO3 Edition',
      menuLabel: 'AO3 Edition',
      worksStorageKey: 'ao3works',
      customCatsStorageKey: 'ao3customcats',
      beta: false,
      betaNote: '',
      capabilities: {
        bookmarkImport: true,
        markedForLaterImport: true,
        subscriptions: true,
        authorWatch: true,
        relationshipTools: true,
        relationshipFilter: true,
        relationshipInsights: true,
        subscriptionFilter: true,
        ao3EngagementSorts: true
      }
    },
    ffnet: {
      id: 'ffnet',
      editionLabel: 'FanFiction.net Edition',
      menuLabel: 'FFNet (beta)',
      worksStorageKey: 'fandomgobbler_ffnet_works',
      customCatsStorageKey: 'fandomgobbler_ffnet_customcats',
      beta: true,
      betaNote: 'FanFiction.net Edition is currently in beta.',
      capabilities: {
        bookmarkImport: false,
        markedForLaterImport: false,
        subscriptions: false,
        authorWatch: false,
        relationshipTools: false,
        relationshipFilter: false,
        relationshipInsights: false,
        subscriptionFilter: false,
        ao3EngagementSorts: false
      }
    },
    wattpad: {
      id: 'wattpad',
      editionLabel: 'Wattpad Edition',
      menuLabel: 'Wattpad (beta)',
      worksStorageKey: 'fandomgobbler_wattpad_works',
      customCatsStorageKey: 'fandomgobbler_wattpad_customcats',
      beta: true,
      betaNote: 'Wattpad Edition is in beta compatibility mode. The shared dashboard shell stays available, but AO3-specific import, subscription, Author Watch, and relationship tools remain off until Wattpad-specific workflows exist.',
      capabilities: {
        bookmarkImport: false,
        markedForLaterImport: false,
        subscriptions: false,
        authorWatch: false,
        relationshipTools: false,
        relationshipFilter: false,
        relationshipInsights: false,
        subscriptionFilter: false,
        ao3EngagementSorts: false
      }
    },
    tumblr: {
      id: 'tumblr',
      editionLabel: 'Tumblr Edition',
      menuLabel: 'Tumblr (beta)',
      worksStorageKey: 'fandomgobbler_tumblr_works',
      customCatsStorageKey: 'fandomgobbler_tumblr_customcats',
      beta: true,
      betaNote: 'Tumblr Edition is in beta compatibility mode. FandomGobbler keeps the shared dashboard layout, but AO3-shaped imports, subscriptions, Author Watch, and relationship-only tools stay disabled until Tumblr-compatible tracking is added.',
      capabilities: {
        bookmarkImport: false,
        markedForLaterImport: false,
        subscriptions: false,
        authorWatch: false,
        relationshipTools: false,
        relationshipFilter: false,
        relationshipInsights: false,
        subscriptionFilter: false,
        ao3EngagementSorts: false
      }
    }
  };

  function normalizePlatformId(platformId) {
    return Object.prototype.hasOwnProperty.call(PLATFORMS, platformId) ? platformId : 'ao3';
  }

  function getPlatformConfig(platformId) {
    return PLATFORMS[normalizePlatformId(platformId)];
  }

  function getEditionLabel(platformId) {
    return getPlatformConfig(platformId).editionLabel;
  }

  function getMenuLabel(platformId) {
    return getPlatformConfig(platformId).menuLabel;
  }

  function getWorksStorageKey(platformId) {
    return getPlatformConfig(platformId).worksStorageKey;
  }

  function getCustomCatsStorageKey(platformId) {
    return getPlatformConfig(platformId).customCatsStorageKey;
  }

  function hasCapability(platformId, capabilityName) {
    const config = getPlatformConfig(platformId);
    return !!(config.capabilities && config.capabilities[capabilityName]);
  }

  function getBetaNote(platformId) {
    return getPlatformConfig(platformId).betaNote || '';
  }

  const core = {
    PLATFORM_ORDER,
    PLATFORMS,
    normalizePlatformId,
    getPlatformConfig,
    getEditionLabel,
    getMenuLabel,
    getWorksStorageKey,
    getCustomCatsStorageKey,
    hasCapability,
    getBetaNote
  };

  global.AO3TrackerPlatformsCore = core;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = core;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
