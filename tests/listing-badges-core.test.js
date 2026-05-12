const test = require('node:test');
const assert = require('node:assert/strict');

const core = require('../modules/listing-badges/core.js');

test('extractWorkIdFromListingBlurb prefers data-work-id, then work_ id, then work link', () => {
  assert.equal(core.extractWorkIdFromListingBlurb({ dataset: { workId: '123' } }), '123');
  assert.equal(core.extractWorkIdFromListingBlurb({ dataset: {}, id: 'work_456' }), '456');
  assert.equal(
    core.extractWorkIdFromListingBlurb({
      dataset: {},
      id: 'bookmark_999',
      querySelector(selector) {
        if (selector === 'a[href*="/works/"]') return { href: 'https://archiveofourown.org/works/789' };
        return null;
      }
    }),
    '789'
  );
});

test('buildListingCustomCatsKey sorts category ids for stable dataset matching', () => {
  assert.equal(core.buildListingCustomCatsKey(['b', 'a']), 'a,b');
  assert.equal(core.buildListingCustomCatsKey([]), '');
});

test('getListingStatusLabel and buildListingBadgeText support statusless tracked works', () => {
  assert.equal(core.getListingStatusLabel('progress'), 'Reading');
  assert.equal(core.getListingStatusLabel(''), 'Tracked');
  assert.equal(core.buildListingBadgeText('progress'), 'Reading ▾');
});

test('getListingChapterProgressMeta skips completed works and shapes chapter links', () => {
  assert.equal(
    core.getListingChapterProgressMeta('123', { status: 'completed', furthestChapter: { id: '9', num: 3, total: 12 } }),
    null
  );

  assert.deepEqual(
    core.getListingChapterProgressMeta('123', { status: 'progress', furthestChapter: { id: '9', num: 3, total: 12 } }),
    {
      label: 'Ch. 3/12',
      href: 'https://archiveofourown.org/works/123/chapters/9'
    }
  );
});

test('buildListingBadgeDataset and matchesListingBadgeDataset stay aligned', () => {
  const work = {
    status: 'progress',
    rating: 4,
    customCats: ['unfinished', 'favorites'],
    furthestChapter: { id: '9', num: 3, total: 12 }
  };

  const dataset = core.buildListingBadgeDataset('123', work);
  assert.deepEqual(dataset, {
    workId: '123',
    status: 'progress',
    rating: '4',
    chap: '3',
    customCats: 'favorites,unfinished'
  });

  assert.equal(
    core.matchesListingBadgeDataset({
      dataset: {
        workId: '123',
        status: 'progress',
        rating: '4',
        chap: '3',
        customCats: 'favorites,unfinished'
      }
    }, '123', work),
    true
  );

  assert.equal(
    core.matchesListingBadgeDataset({
      dataset: {
        workId: '123',
        status: 'progress',
        rating: '4',
        chap: '',
        customCats: 'favorites,unfinished'
      }
    }, '123', work),
    false
  );
});
