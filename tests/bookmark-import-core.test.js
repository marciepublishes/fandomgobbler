const test = require('node:test');
const assert = require('node:assert/strict');

globalThis.AO3TrackerAuthorWatchCore = {
  extractWorkIdFromUrl(url) {
    const match = String(url || '').match(/archiveofourown\.org\/works\/(\d+)/);
    return match ? match[1] : null;
  }
};

globalThis.AO3TrackerTrackedWorkCore = {
  normalizeStatusValue(status) {
    return ['want', 'progress', 'completed', 'rereading', 'onhold', 'dnf', 'lost'].includes(status) ? status : '';
  },
  nextFinishedAt(oldStatus, newStatus, existingFinishedAt) {
    const normalizedOld = ['want', 'progress', 'completed', 'rereading', 'onhold', 'dnf', 'lost'].includes(oldStatus) ? oldStatus : '';
    const normalizedNew = ['want', 'progress', 'completed', 'rereading', 'onhold', 'dnf', 'lost'].includes(newStatus) ? newStatus : '';
    if (normalizedNew === 'completed' && normalizedOld !== 'completed') return 1234567890;
    return existingFinishedAt || null;
  }
};

const core = require('../modules/bookmark-import/core.js');

test('normalizeBookmarkSyncState dedupes and caps known work ids', () => {
  const input = {
    knownWorkIds: ['1', '2', '2', '', null],
    lastFetchedAt: '1700'
  };

  const result = core.normalizeBookmarkSyncState(input);

  assert.deepEqual(result.knownWorkIds, ['1', '2']);
  assert.equal(result.lastFetchedAt, 1700);
});

test('filterBookmarkCandidates matches title, author, and fandom', () => {
  const candidates = [
    { title: 'One', author: 'Alpha', fandoms: ['Good Omens'] },
    { title: 'Two', author: 'Beta', fandoms: ['Star Wars'] }
  ];

  assert.equal(core.filterBookmarkCandidates(candidates, 'alpha').length, 1);
  assert.equal(core.filterBookmarkCandidates(candidates, 'wars').length, 1);
  assert.equal(core.filterBookmarkCandidates(candidates, '').length, 2);
});

test('mergeKnownBookmarkWorkIds merges uniquely and preserves limit', () => {
  const merged = core.mergeKnownBookmarkWorkIds(['1', '2'], ['2', '3'], 3);
  assert.deepEqual(merged, ['1', '2', '3']);
});

test('buildTrackedWorkFromBookmarkEntry maps bookmark entry into tracked work shape', () => {
  const work = core.buildTrackedWorkFromBookmarkEntry({
    id: '123',
    title: 'Example',
    author: 'Author',
    fandoms: ['Good Omens'],
    relationship: 'Crowley/Aziraphale',
    notes: 'Bookmark note',
    wordCount: 5000
  }, {
    selectedStatus: 'completed',
    selectedCustomCat: 'unfinished',
    now: 999
  });

  assert.equal(work.id, '123');
  assert.equal(work.status, 'completed');
  assert.deepEqual(work.customCats, ['unfinished']);
  assert.equal(work.finishedAt, 1234567890);
  assert.equal(work.addedAt, 999);
  assert.equal(work.movedAt, 999);
});

test('buildTrackedWorkFromBookmarkEntry preserves orphaned author state', () => {
  const work = core.buildTrackedWorkFromBookmarkEntry({
    id: '777',
    title: 'Orphaned Example',
    author: 'orphan_account',
    authorUrl: 'https://archiveofourown.org/users/orphan_account?view_adult=true'
  }, {
    selectedStatus: 'want',
    now: 999
  });

  assert.equal(work.isOrphaned, true);
});

test('buildImportedBookmarkNotes returns only the bookmark note text', () => {
  const blurb = {
    querySelector(selector) {
      if (selector.includes('.bookmark .notes')) return { textContent: '  personal note  ' };
      return null;
    },
    querySelectorAll() { return []; }
  };

  assert.equal(
    core.buildImportedBookmarkNotes(blurb),
    'personal note'
  );
});

test('parseBookmarkPageDocument parses entries and pagination from a document-like object', () => {
  const blurb = {
    querySelector(selector) {
      if (selector === 'h4.heading a[href*="/works/"], h4 a[href*="/works/"]') {
        return { href: 'https://archiveofourown.org/works/123', textContent: ' Example Work ' };
      }
      if (selector === '.relationships a.tag, .relationship.tags a.tag') {
        return { textContent: 'Pairing' };
      }
      if (selector === '.summary blockquote.userstuff' || selector === '.summary .userstuff' || selector === 'blockquote.userstuff.summary' || selector === '.work .summary .userstuff') {
        return { textContent: ' Summary here ' };
      }
      if (selector.includes('a[href*="/users/"]')) {
        return { textContent: 'Author' };
      }
      return null;
    },
    querySelectorAll(selector) {
      if (selector === 'h4.heading a[href*="/users/"], h4 a[href*="/users/"]') {
        return [{ href: 'https://archiveofourown.org/users/author', textContent: 'Author' }];
      }
      if (selector === '.fandoms a.tag, .fandom.tags a.tag') {
        return [{ textContent: 'Good Omens' }];
      }
      if (selector === 'dl.stats dt') {
        return [{ textContent: 'Words:', nextElementSibling: { textContent: '12,345' } }];
      }
      if (selector.includes('.bookmark .meta.tags')) {
        return [];
      }
      return [];
    }
  };

  const doc = {
    querySelectorAll(selector) {
      if (selector === 'li.bookmark.blurb.group') return [blurb];
      if (selector === 'ol.pagination a[href*="page="], nav.pagy a[href*="page="]') {
        return [{ href: 'https://archiveofourown.org/users/test/bookmarks?page=3' }];
      }
      return [];
    },
    querySelector(selector) {
      if (selector === 'ol.pagination .next a, nav.pagy a[rel="next"], a[rel="next"]') return { href: '#' };
      return null;
    }
  };

  const result = core.parseBookmarkPageDocument(doc);

  assert.equal(result.entries.length, 1);
  assert.equal(result.entries[0].id, '123');
  assert.equal(result.totalPages, 3);
  assert.equal(result.hasNext, true);
});

test('parseBookmarkPageDocument marks orphan_account entries as orphaned', () => {
  const blurb = {
    querySelector(selector) {
      if (selector === 'h4.heading a[href*="/works/"], h4 a[href*="/works/"]') {
        return { href: 'https://archiveofourown.org/works/777', textContent: ' Orphaned Work ' };
      }
      if (selector === '.relationships a.tag, .relationship.tags a.tag') return null;
      if (selector.includes('a[href*="/users/"]')) {
        return { href: 'https://archiveofourown.org/users/orphan_account', textContent: 'orphan_account' };
      }
      return null;
    },
    querySelectorAll(selector) {
      if (selector === 'h4.heading a[href*="/users/"], h4 a[href*="/users/"]') {
        return [{ href: 'https://archiveofourown.org/users/orphan_account', textContent: 'orphan_account' }];
      }
      return [];
    }
  };

  const doc = {
    querySelectorAll(selector) {
      if (selector === 'li.bookmark.blurb.group') return [blurb];
      return [];
    },
    querySelector() {
      return null;
    }
  };

  const result = core.parseBookmarkPageDocument(doc);

  assert.equal(result.entries[0].isOrphaned, true);
});
