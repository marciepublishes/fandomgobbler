const test = require('node:test');
const assert = require('node:assert/strict');

function loadFreshEngine() {
  delete require.cache[require.resolve('../modules/google-sheets-sync/engine.js')];
  return require('../modules/google-sheets-sync/engine.js');
}

function installStorage(initialStore) {
  const store = Object.assign({}, initialStore);
  globalThis.chrome = {
    storage: {
      local: {
        get(key, cb) {
          if (Array.isArray(key)) {
            const out = {};
            key.forEach(name => {
              if (Object.prototype.hasOwnProperty.call(store, name)) out[name] = store[name];
            });
            cb(out);
            return;
          }
          cb(Object.prototype.hasOwnProperty.call(store, key) ? { [key]: store[key] } : {});
        },
        set(obj, cb) {
          Object.assign(store, obj);
          if (cb) cb();
        }
      }
    },
    runtime: {
      getManifest() {
        return { version: '3.1.2' };
      }
    }
  };
  return store;
}

function installSheetsDeps() {
  const Schema = require('../modules/google-sheets-sync/schema.js');
  globalThis.FGSheetsSchema = Schema;
  globalThis.FGSheetsAuth = {
    isConfigured() {
      return true;
    },
    async getToken() {
      return 'token-1';
    },
    async getUserEmail() {
      return 'reader@example.com';
    }
  };
}

const KEYS = {
  SHEETS_SYNC_STATUS_KEY: 'fg_sync_status',
  SHEETS_PENDING_TOMBSTONES_KEY: 'fg_pending_tombstones',
  SHEETS_ENABLED_KEY: 'fg_sync_enabled',
  SHEETS_NEEDS_PUSH_KEY: 'fg_sync_needs_push',
  SHEETS_SPREADSHEET_ID_KEY: 'fg_sheet_id',
  SHEETS_OWNER_EMAIL_KEY: 'fg_owner_email'
};

test('mergeWorks keeps deletions authoritative and pulls newer remote copies', () => {
  installStorage({});
  installSheetsDeps();
  const Engine = loadFreshEngine();

  const localWorks = {
    localOnly: { workId: 'localOnly', lastModifiedAt: 500 },
    olderLocal: { workId: 'olderLocal', lastModifiedAt: 100 }
  };
  const remoteWorks = {
    olderLocal: { workId: 'olderLocal', lastModifiedAt: 300 },
    deletedRemote: { workId: 'deletedRemote', lastModifiedAt: 200 }
  };
  const deletions = {
    deletedRemote: { workId: 'deletedRemote', deletedAt: 250 }
  };

  const result = Engine.__test.mergeWorks(localWorks, remoteWorks, deletions);

  assert.equal(result.merged.olderLocal.lastModifiedAt, 300);
  assert.equal(result.merged.deletedRemote, undefined);
  assert.deepEqual(result.localUpdates, {
    olderLocal: { workId: 'olderLocal', lastModifiedAt: 300 }
  });
  assert.deepEqual(result.needsPush.sort(), ['localOnly']);
});

test('recordDeletion stores tombstones and marks sync as needing a push', async () => {
  const store = installStorage({
    [KEYS.SHEETS_ENABLED_KEY]: true,
    [KEYS.SHEETS_PENDING_TOMBSTONES_KEY]: {}
  });
  installSheetsDeps();
  const Engine = loadFreshEngine();
  Engine.init(KEYS);

  await Engine.recordDeletion('ao3-77', 'ao3');

  assert.equal(store[KEYS.SHEETS_NEEDS_PUSH_KEY], true);
  assert.equal(store[KEYS.SHEETS_PENDING_TOMBSTONES_KEY]['ao3-77'].platform, 'ao3');
  assert.equal(typeof store[KEYS.SHEETS_PENDING_TOMBSTONES_KEY]['ao3-77'].deletedAt, 'number');
});

test('fullSync merges remote changes, rewrites sheets, and clears needs-push flag', async () => {
  const store = installStorage({
    [KEYS.SHEETS_ENABLED_KEY]: true,
    [KEYS.SHEETS_SPREADSHEET_ID_KEY]: 'sheet-123',
    [KEYS.SHEETS_PENDING_TOMBSTONES_KEY]: {},
    [KEYS.SHEETS_NEEDS_PUSH_KEY]: true,
    ao3customcats: {
      cat1: { id: 'cat1', name: 'Cozy Reads', color: '#6b7280' }
    },
    fandomgobbler_ffnet_customcats: {
      ffcat1: { id: 'ffcat1', name: 'FFNet Favorites', color: '#2563eb' }
    },
    ao3works: {
      'ao3-1': { workId: 'ao3-1', platform: 'ao3', title: 'Local Older', addedAt: 100, lastModifiedAt: 100 }
    },
    fandomgobbler_ffnet_works: {
      'ffnet-1': {
        workId: 'ffnet-1',
        title: 'FF Local',
        author: 'Author B',
        url: 'https://www.fanfiction.net/s/1/1/FF-Local',
        customCats: ['ffcat1'],
        addedAt: 200,
        movedAt: 200,
        lastModifiedAt: 200
      }
    }
  });
  installSheetsDeps();

  const batchUpdateCalls = [];
  const clearCalls = [];
  globalThis.FGSheetsAPI = {
    colLetter: require('../modules/google-sheets-sync/api.js').colLetter,
    async getSpreadsheetMeta() {
      return {
        sheets: [
          { properties: { title: '_Meta' } },
          { properties: { title: 'AO3 Works' } },
          { properties: { title: 'FFNet Works' } },
          { properties: { title: 'Deletions' } },
          { properties: { title: 'Desktop View' } },
          { properties: { title: 'Mobile View' } }
        ]
      };
    },
    async addSheets() {
      throw new Error('should not add sheets in happy path');
    },
    async batchGetValues(_token, _spreadsheetId, ranges) {
      if (ranges.length === 3) {
        const Schema = globalThis.FGSheetsSchema;
        return {
          valueRanges: [
            {
              values: [
                Schema.WORK_COLUMNS,
                Schema.serializeWork({
                  workId: 'ao3-1',
                  id: 'ao3-1',
                  platform: 'ao3',
                  title: 'Remote Newer',
                  author: 'Author A',
                  url: 'https://archiveofourown.org/works/ao3-1',
                  status: 'progress',
                  customCats: ['cat1'],
                  rating: 4,
                  wordCount: 12345,
                  updatedAt: 200,
                  furthestChapter: { num: 3, total: 8, id: 'chap-3' },
                  addedAt: 100,
                  movedAt: 300,
                  lastModifiedAt: 300
                })
              ]
            },
            {
              values: [
                Schema.WORK_COLUMNS
              ]
            },
            {
              values: [
                Schema.DELETION_COLUMNS
              ]
            }
          ]
        };
      }
      return { valueRanges: [{ values: [] }] };
    },
    async batchUpdateValues(_token, _spreadsheetId, data) {
      batchUpdateCalls.push(data);
      return {};
    },
    async clearRange(_token, _spreadsheetId, range) {
      clearCalls.push(range);
      return {};
    }
  };

  const Engine = loadFreshEngine();
  Engine.init(KEYS);
  const result = await Engine.fullSync(false);

  assert.deepEqual(result, { ok: true, pulled: 1, pushed: 1 });
  assert.equal(store.ao3works['ao3-1'].title, 'Remote Newer');
  assert.equal(store[KEYS.SHEETS_NEEDS_PUSH_KEY], false);
  assert.equal(store[KEYS.SHEETS_SYNC_STATUS_KEY].state, 'idle');
  assert.match(store[KEYS.SHEETS_SYNC_STATUS_KEY].message, /Synced: 1 uploaded, 1 downloaded/);
  assert.ok(clearCalls.includes('AO3 Works!A2:AG'));
  assert.ok(clearCalls.includes('FFNet Works!A2:AG'));
  assert.ok(clearCalls.includes('Desktop View!A2:N'));
  assert.ok(clearCalls.includes('Mobile View!A2:H'));
  const desktopWrite = batchUpdateCalls.flat().find(entry => entry.range === 'Desktop View!A2:N3');
  assert.ok(desktopWrite, 'desktop pretty sheet should be written');
  assert.equal(desktopWrite.values[0][1], 'Remote Newer');
  assert.equal(desktopWrite.values[0][4], 'Cozy Reads');
  assert.match(desktopWrite.values[0][11], /chapters\/chap-3/);
  assert.equal(desktopWrite.values[1][1], 'FF Local');
  assert.equal(desktopWrite.values[1][4], 'FFNet Favorites');
  const mobileWrite = batchUpdateCalls.flat().find(entry => entry.range === 'Mobile View!A2:H3');
  assert.ok(mobileWrite, 'mobile pretty sheet should be written');
  assert.equal(mobileWrite.values[0][3], 'Cozy Reads');
  assert.match(mobileWrite.values[0][6], /Ch\. 3\/8/);
  assert.equal(mobileWrite.values[1][3], 'FFNet Favorites');
  assert.ok(batchUpdateCalls.some(call => call.some(entry => entry.range === '_Meta!B5')));
});

test('setupSync reconnects to an existing Drive sync sheet before creating a new one', async () => {
  const store = installStorage({
    [KEYS.SHEETS_PENDING_TOMBSTONES_KEY]: {}
  });
  installSheetsDeps();

  const Schema = globalThis.FGSheetsSchema;
  let createCalled = false;
  globalThis.FGSheetsAPI = {
    colLetter: require('../modules/google-sheets-sync/api.js').colLetter,
    async findSpreadsheetsByTitle(_token, title) {
      assert.equal(title, Schema.SPREADSHEET_TITLE);
      return { files: [{ id: 'sheet-existing', name: title }] };
    },
    async createSpreadsheet() {
      createCalled = true;
      throw new Error('should reconnect instead of creating');
    },
    async getSpreadsheetMeta() {
      return {
        sheets: [
          { properties: { title: '_Meta' } },
          { properties: { title: 'AO3 Works' } },
          { properties: { title: 'FFNet Works' } },
          { properties: { title: 'Deletions' } },
          { properties: { title: 'Desktop View' } },
          { properties: { title: 'Mobile View' } }
        ]
      };
    },
    async addSheets() {},
    async batchGetValues(_token, _spreadsheetId, ranges) {
      if (ranges.length === 3) {
        return {
          valueRanges: [
            {
              values: [
                Schema.WORK_COLUMNS,
                Schema.serializeWork({ workId: 'ao3-restore', platform: 'ao3', title: 'Restored Work', addedAt: 100, lastModifiedAt: 100 })
              ]
            },
            { values: [Schema.WORK_COLUMNS] },
            { values: [Schema.DELETION_COLUMNS] }
          ]
        };
      }
      return { valueRanges: [{ values: [] }] };
    },
    async batchUpdateValues() {
      return {};
    },
    async clearRange() {
      return {};
    }
  };

  const Engine = loadFreshEngine();
  Engine.init(KEYS);
  await Engine.setupSync();

  assert.equal(createCalled, false);
  assert.equal(store[KEYS.SHEETS_SPREADSHEET_ID_KEY], 'sheet-existing');
  assert.equal(store[KEYS.SHEETS_OWNER_EMAIL_KEY], 'reader@example.com');
  assert.equal(store[KEYS.SHEETS_ENABLED_KEY], true);
  assert.equal(store.ao3works['ao3-restore'].title, 'Restored Work');
});

test('verifySpreadsheet removes legacy pretty sheet tabs after rename', async () => {
  installStorage({});
  installSheetsDeps();
  const batchRequests = [];
  globalThis.FGSheetsAPI = {
    colLetter: require('../modules/google-sheets-sync/api.js').colLetter,
    async getSpreadsheetMeta() {
      return {
        sheets: [
          { properties: { sheetId: 1, title: '_Meta' } },
          { properties: { sheetId: 2, title: 'AO3 Works' } },
          { properties: { sheetId: 3, title: 'FFNet Works' } },
          { properties: { sheetId: 4, title: 'Deletions' } },
          { properties: { sheetId: 5, title: 'Desktop View' } },
          { properties: { sheetId: 6, title: 'Mobile View' } },
          { properties: { sheetId: 7, title: 'Pretty Sheets - Desktop' } },
          { properties: { sheetId: 8, title: 'Pretty Sheets - Mobile' } }
        ]
      };
    },
    async addSheets() {
      throw new Error('no missing sheets expected');
    },
    async batchUpdate(_token, _spreadsheetId, requests) {
      batchRequests.push(...requests);
      return {};
    }
  };

  const Engine = loadFreshEngine();
  const result = await Engine.__test.verifySpreadsheet('token', 'sheet-123');

  assert.deepEqual(result, { ok: true });
  assert.deepEqual(batchRequests, [
    { deleteSheet: { sheetId: 7 } },
    { deleteSheet: { sheetId: 8 } }
  ]);
});
