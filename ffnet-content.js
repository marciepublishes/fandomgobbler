(function () {
  'use strict';

  const storageKeys = globalThis.AO3TrackerStorageKeys || {};
  const utils = globalThis.AO3TrackerUtils || {};
  const toast = globalThis.AO3TrackerToast || {};
  const platformsCore = globalThis.AO3TrackerPlatformsCore || {};
  const platformSidebarTemplate = globalThis.AO3TrackerPlatformSidebarTemplate || {};
  const trackedWorkCore = globalThis.AO3TrackerTrackedWorkCore || {};
  const pageThemeController = globalThis.AO3TrackerPageThemeController || {};
  const notesModal = globalThis.AO3TrackerNotesModal || {};
  const ffnetCore = globalThis.AO3TrackerFfnetCore || {};
  const ffnetController = globalThis.AO3TrackerFfnetController || {};
  const customCursorCore = globalThis.FGCustomCursorCore || {};

  const _ffnetChecks = [
    ['AO3TrackerStorageKeys', []],
    ['AO3TrackerFfnetCore', []],
    ['AO3TrackerFfnetController', ['init', 'start']],
    ['AO3TrackerPlatformsCore', ['getWorksStorageKey', 'getCustomCatsStorageKey']],
    ['AO3TrackerTrackedWorkCore', ['normalizeStatusValue', 'sanitizeTrackedWorksMap']],
  ];
  const _ffnetMissing = [];
  for (const [name, methods] of _ffnetChecks) {
    const mod = globalThis[name];
    if (!mod) { _ffnetMissing.push(name); continue; }
    for (const m of methods) {
      if (typeof mod[m] !== 'function') _ffnetMissing.push(`${name}.${m}`);
    }
  }
  if (_ffnetMissing.length) {
    console.error(`[AO3 Tracker] ffnet-content.js: missing dependencies — ${_ffnetMissing.join(', ')}`);
    return;
  }

  if (typeof toast.init === 'function') {
    toast.init({ document });
  }

  if (typeof pageThemeController.init === 'function') {
    pageThemeController.init({ window, document });
  }

  customCursorCore.applySelectedFromStorage?.(document);
  customCursorCore.bindStorageListener?.(document);

  if (typeof notesModal.init === 'function') {
    notesModal.init({
      document,
      trunc: typeof utils.trunc === 'function' ? utils.trunc : (value, n) => String(value || '').slice(0, n),
      showMiniToast: typeof toast.showMiniToast === 'function' ? toast.showMiniToast : (() => {}),
      getWorks: cb => {
        try {
          const key = typeof platformsCore.getWorksStorageKey === 'function' ? platformsCore.getWorksStorageKey('ffnet') : 'fandomgobbler_ffnet_works';
          chrome.storage.local.get(key, data => { cb(data[key] || {}); });
        } catch (e) { cb({}); }
      },
      setWorks: works => {
        try {
          const key = typeof platformsCore.getWorksStorageKey === 'function' ? platformsCore.getWorksStorageKey('ffnet') : 'fandomgobbler_ffnet_works';
          chrome.storage.local.set({ [key]: works });
        } catch (e) {}
      },
      renderSidebar: () => ffnetController.renderSidebar?.()
    });
  }

  ffnetController.init({
    window,
    document,
    chrome,
    storageKeys,
    Utils: utils,
    Toast: toast,
    PlatformSidebarTemplate: platformSidebarTemplate,
    PageThemeController: pageThemeController,
    NotesModal: notesModal,
    FfnetCore: ffnetCore,
    normalizeStatusValue: trackedWorkCore.normalizeStatusValue,
    sanitizeTrackedWorksMap: trackedWorkCore.sanitizeTrackedWorksMap,
    nextFinishedAt: trackedWorkCore.nextFinishedAt,
    getWorksStorageKey: () => {
      if (typeof platformsCore.getWorksStorageKey === 'function') {
        return platformsCore.getWorksStorageKey('ffnet');
      }
      return 'fandomgobbler_ffnet_works';
    },
    getCustomCatsStorageKey: () => {
      if (typeof platformsCore.getCustomCatsStorageKey === 'function') {
        return platformsCore.getCustomCatsStorageKey('ffnet');
      }
      return 'fandomgobbler_ffnet_customcats';
    }
  });

  ffnetController.start();
})();
