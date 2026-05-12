const test = require('node:test');
const assert = require('node:assert/strict');

globalThis.AO3TrackerAuthorWatchCore = {
  looksLikeAo3BotBlock() {
    return false;
  },
  normalizeAuthorWatchUrl(url) {
    return String(url || '').trim();
  }
};

globalThis.AO3TrackerTrackedWorkCore = {
  normalizeStatusValue(status) {
    return ['want', 'progress', 'completed', 'rereading', 'onhold', 'dnf', 'lost'].includes(status) ? status : '';
  },
  nextFinishedAt(oldStatus, newStatus, existingFinishedAt) {
    if (newStatus === 'completed' && oldStatus !== 'completed') return 222;
    return existingFinishedAt || null;
  }
};

require('../modules/bookmark-import/core.js');
const controller = require('../modules/bookmark-import/popup-controller.js');

test('bookmark import popup controller exports expected entrypoints', () => {
  assert.equal(typeof controller.setupControls, 'function');
  assert.equal(typeof controller.renderModal, 'function');
  assert.equal(typeof controller.startFetch, 'function');
  assert.equal(typeof controller.importFetchedBookmarks, 'function');
});

test('bookmark import popup controller reset state inherits quick mode from prior fetch', () => {
  let importState = {};
  controller.resetState({
    getBookmarkSyncState() {
      return { knownWorkIds: [], lastFetchedAt: 1234 };
    },
    getBookmarkImportState() {
      return importState;
    },
    setBookmarkImportState(next) {
      importState = next;
    }
  });

  assert.equal(importState.quickMode, true);
  assert.equal(importState.status, 'completed');
  assert.equal(importState.completed, false);
});

test('bookmark import popup controller filters review candidates through the shared core', () => {
  const candidates = [
    { title: 'One', author: 'Alpha', fandoms: ['Good Omens'] },
    { title: 'Two', author: 'Beta', fandoms: ['Star Wars'] }
  ];

  const result = controller.getFilteredBookmarkCandidates({
    getBookmarkImportState() {
      return {
        candidates,
        reviewFilter: 'wars'
      };
    }
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].title, 'Two');
});

test('bookmark import popup controller imports custom-category-only works without forcing a status', async () => {
  const works = {};
  let saved = false;
  let rendered = false;
  let toast = '';
  let importState = {
    status: '',
    customCatId: 'unfinished',
    candidates: [
      {
        id: '123',
        title: 'Example',
        author: 'Author',
        authorUrl: null,
        url: 'https://archiveofourown.org/works/123',
        fandoms: ['Good Omens'],
        relationship: '',
        summary: '',
        notes: '',
        wordCount: 5000
      }
    ],
    reviewFilter: ''
  };

  await controller.importFetchedBookmarks({
    document: {
      getElementById() {
        return null;
      }
    },
    getBookmarkImportState() {
      return importState;
    },
    setBookmarkImportState(next) {
      importState = next;
    },
    getWorksMap() {
      return works;
    },
    saveWorks: async () => {
      saved = true;
    },
    renderAll() {
      rendered = true;
    },
    showToast(message) {
      toast = message;
    }
  });

  assert.equal(saved, true);
  assert.equal(rendered, true);
  assert.equal(Object.prototype.hasOwnProperty.call(works, '123'), true);
  assert.equal(works['123'].status, '');
  assert.deepEqual(works['123'].customCats, ['unfinished']);
  assert.match(toast, /Imported 1 bookmark work/);
});
