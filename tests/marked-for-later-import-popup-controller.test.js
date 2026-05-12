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

require('../modules/marked-for-later-import/core.js');
const controller = require('../modules/marked-for-later-import/popup-controller.js');

test('marked for later import popup controller exports expected entrypoints', () => {
  assert.equal(typeof controller.setupControls, 'function');
  assert.equal(typeof controller.renderModal, 'function');
  assert.equal(typeof controller.startFetch, 'function');
  assert.equal(typeof controller.countPendingUntrackedWorks, 'function');
  assert.equal(typeof controller.importFetchedWorks, 'function');
  assert.equal(typeof controller.normalizeMflUrl, 'function');
});

test('marked for later import popup controller preserves show=to-read when normalizing MFL urls', () => {
  assert.equal(
    controller.normalizeMflUrl('https://archiveofourown.org/users/test/readings?show=to-read&page=2#foo'),
    'https://archiveofourown.org/users/test/readings?show=to-read'
  );
  assert.equal(
    controller.normalizeMflUrl('https://archiveofourown.org/users/test/readings'),
    'https://archiveofourown.org/users/test/readings?show=to-read'
  );
});

test('marked for later import popup controller default status is want', () => {
  let importState = {};
  controller.resetState({
    getMflSyncState() {
      return { knownWorkIds: [], lastFetchedAt: null };
    },
    getMflImportState() {
      return importState;
    },
    setMflImportState(next) {
      importState = next;
    }
  });

  assert.equal(importState.status, 'want');
  assert.equal(importState.completed, false);
});

test('marked for later import popup controller inherits quick mode from prior fetch', () => {
  let importState = {};
  controller.resetState({
    getMflSyncState() {
      return { knownWorkIds: [], lastFetchedAt: 9999 };
    },
    getMflImportState() {
      return importState;
    },
    setMflImportState(next) {
      importState = next;
    }
  });

  assert.equal(importState.quickMode, true);
});

test('marked for later import popup controller filters candidates through the shared core', () => {
  const candidates = [
    { title: 'One', author: 'Alpha', fandoms: ['Good Omens'] },
    { title: 'Two', author: 'Beta', fandoms: ['Star Wars'] }
  ];

  const result = controller.getFilteredCandidates({
    getMflImportState() {
      return { candidates, reviewFilter: 'omens' };
    }
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].title, 'One');
});

test('marked for later import popup controller imports works into custom category without forcing a status', async () => {
  const works = {};
  let saved = false;
  let rendered = false;
  let toast = '';
  let importState = {
    status: '',
    customCatId: 'favs',
    candidates: [
      {
        id: '456',
        title: 'A Story',
        author: 'Writer',
        authorUrl: null,
        url: 'https://archiveofourown.org/works/456',
        fandoms: ['Hannibal'],
        relationship: '',
        summary: '',
        wordCount: 8000
      }
    ],
    reviewFilter: ''
  };

  await controller.importFetchedWorks({
    document: {
      getElementById() { return null; }
    },
    getMflImportState() {
      return importState;
    },
    setMflImportState(next) {
      importState = next;
    },
    getWorksMap() {
      return works;
    },
    saveWorks: async () => { saved = true; },
    renderAll() { rendered = true; },
    showToast(message) { toast = message; }
  });

  assert.equal(saved, true);
  assert.equal(rendered, true);
  assert.equal(Object.prototype.hasOwnProperty.call(works, '456'), true);
  assert.equal(works['456'].status, '');
  assert.deepEqual(works['456'].customCats, ['favs']);
  assert.match(toast, /Imported 1 For Later work/);
});

function makeEntry(id, author) {
  return {
    querySelector(selector) {
      if (selector === 'h4.heading a[href*="/works/"], h4 a[href*="/works/"]') {
        return { href: `https://archiveofourown.org/works/${id}`, textContent: ` Work ${id} ` };
      }
      if (selector === '.relationships a.tag, .relationship.tags a.tag') return null;
      if (
        selector === '.summary blockquote.userstuff' ||
        selector === '.summary .userstuff' ||
        selector === 'blockquote.userstuff.summary' ||
        selector === '.work .summary .userstuff'
      ) {
        return null;
      }
      if (selector.includes('a[href*="/users/"]')) {
        return { href: `https://archiveofourown.org/users/${author}`, textContent: author };
      }
      return null;
    },
    querySelectorAll(selector) {
      if (selector === 'h4.heading a[href*="/users/"], h4 a[href*="/users/"]') {
        return [{ href: `https://archiveofourown.org/users/${author}`, textContent: author }];
      }
      return [];
    }
  };
}

function makeDoc(entryIds, hasNext) {
  const blurbs = entryIds.map(id => makeEntry(id, `author${id}`));
  return {
    querySelectorAll(selector) {
      if (selector === 'li.work.blurb.group') return blurbs;
      if (selector === 'ol.pagination a[href*="page="], nav.pagy a[href*="page="]') {
        return hasNext ? [{ href: 'https://archiveofourown.org/users/test/readings?show=to-read&page=2' }] : [];
      }
      return [];
    },
    querySelector(selector) {
      if (selector === 'ol.pagination .next a, nav.pagy a[rel="next"], a[rel="next"]') {
        return hasNext ? { href: '#' } : null;
      }
      return null;
    }
  };
}

test('marked for later import popup controller counts untracked works across later pages', async () => {
  globalThis.fetch = async (url) => ({
    ok: true,
    async text() {
      return String(url).includes('page=2') ? 'page2' : 'page1';
    }
  });

  const result = await controller.countPendingUntrackedWorks({
    getWorksMap() {
      return { '1': { id: '1' } };
    },
    parseAo3Html(html) {
      return html === 'page1'
        ? makeDoc(['1'], true)
        : makeDoc(['2'], false);
    },
    waitMs() {
      return Promise.resolve();
    }
  }, 'https://archiveofourown.org/users/test/readings?show=to-read');

  assert.equal(result.count, 1);
});

test('marked for later import popup controller quick fetch keeps scanning after a known first page', async () => {
  let importState = {
    open: true,
    loading: false,
    canceled: false,
    resumable: false,
    completed: false,
    quickMode: true,
    fetchedPages: 0,
    totalPages: null,
    totalCandidates: 0,
    totalSeenWorks: 0,
    candidates: [],
    fetchedWorkIds: [],
    reviewFilter: '',
    status: 'want',
    customCatId: '',
    mflUrl: 'https://archiveofourown.org/users/test/readings?show=to-read',
    error: '',
    hasMore: false
  };
  let savedSync = false;
  globalThis.fetch = async (url) => ({
    ok: true,
    async text() {
      return String(url).includes('page=2') ? 'page2' : 'page1';
    }
  });

  await controller.startFetch({
    document: {
      getElementById() { return null; },
      querySelectorAll() { return []; }
    },
    getMflImportState() {
      return importState;
    },
    setMflImportState(next) {
      importState = next;
    },
    getMflSyncState() {
      return { knownWorkIds: ['1'], lastFetchedAt: 9999 };
    },
    setMflSyncState() {},
    saveMflSyncState: async () => { savedSync = true; },
    getWorksMap() {
      return { '1': { id: '1' } };
    },
    getCustomCats(cb) { cb({}); },
    saveWorks: async () => true,
    renderAll() {},
    showToast() {},
    parseAo3Html(html) {
      return html === 'page1'
        ? makeDoc(['1'], true)
        : makeDoc(['2'], false);
    },
    waitMs() {
      return Promise.resolve();
    },
    escHtml(value) {
      return String(value || '');
    }
  }, true);

  assert.equal(importState.completed, true);
  assert.equal(importState.totalCandidates, 1);
  assert.deepEqual(importState.fetchedWorkIds, ['1', '2']);
  assert.equal(savedSync, true);
});
