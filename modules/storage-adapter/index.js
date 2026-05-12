(function (global) {
  'use strict';

  function get(key) {
    return new Promise(resolve => {
      try {
        chrome.storage.local.get(key, data => {
          resolve((data != null && Object.prototype.hasOwnProperty.call(data, key)) ? data[key] : null);
        });
      } catch (e) { resolve(null); }
    });
  }

  function getMany(keys) {
    return new Promise(resolve => {
      try {
        chrome.storage.local.get(keys, data => {
          resolve((data != null && typeof data === 'object') ? data : {});
        });
      } catch (e) { resolve({}); }
    });
  }

  function set(key, value) {
    return new Promise(resolve => {
      try {
        chrome.storage.local.set({ [key]: value }, () => {
          resolve(!(chrome.runtime && chrome.runtime.lastError));
        });
      } catch (e) { resolve(false); }
    });
  }

  function remove(key) {
    return new Promise(resolve => {
      try {
        chrome.storage.local.remove(key, resolve);
      } catch (e) { resolve(); }
    });
  }

  const adapter = { get, getMany, set, remove };
  global.AO3TrackerStorageAdapter = adapter;
  if (typeof module !== 'undefined' && module.exports) module.exports = adapter;
})(typeof globalThis !== 'undefined' ? globalThis : this);
