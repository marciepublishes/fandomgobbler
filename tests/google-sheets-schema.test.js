const test = require('node:test');
const assert = require('node:assert/strict');

const Schema = require('../modules/google-sheets-sync/schema.js');

test('serializeWork and deserializeWork round-trip core tracked-work fields', () => {
  const work = {
    workId: 'ao3-1',
    platform: 'ao3',
    title: 'Example Work',
    author: 'Author',
    authorUrl: 'https://archiveofourown.org/users/author',
    url: 'https://archiveofourown.org/works/1',
    status: 'progress',
    customCats: ['tragedy', 'bittersweet'],
    fandoms: ['Fandom A'],
    relationship: 'A/B',
    summary: 'Summary',
    notes: 'Notes',
    rating: 4,
    wordCount: 1234,
    kudosCount: 12,
    bookmarksCount: 5,
    hitsCount: 99,
    seriesTitle: 'Series',
    seriesUrl: 'https://archiveofourown.org/series/2',
    seriesPosition: '2',
    isOrphaned: true,
    subscribedAtAo3: true,
    furthestChapter: { num: 4, total: 9 },
    lostFrom: 'bookmarks',
    addedAt: 100,
    movedAt: 150,
    finishedAt: 175,
    updatedAt: 200,
    publishedAt: 50,
    completedAt: 250,
    inferredCompletedAt: 250
  };

  const row = Schema.serializeWork(work);
  const roundTrip = Schema.deserializeWork(row, Schema.WORK_COLUMNS);

  assert.equal(roundTrip.workId, work.workId);
  assert.equal(roundTrip.platform, work.platform);
  assert.deepEqual(roundTrip.customCats, work.customCats);
  assert.deepEqual(roundTrip.fandoms, work.fandoms);
  assert.deepEqual(roundTrip.furthestChapter, work.furthestChapter);
  assert.equal(roundTrip.isOrphaned, true);
  assert.equal(roundTrip.subscribedAtAo3, true);
  assert.equal(roundTrip.lastModifiedAt, 200);
  assert.equal(roundTrip._schemaVersion, Schema.SCHEMA_VERSION);
});

test('deserializeWork normalizes empty arrays and backfills lastModifiedAt', () => {
  const headers = Schema.WORK_COLUMNS;
  const row = headers.map(col => {
    if (col === 'workId') return 'ao3-2';
    if (col === 'platform') return 'ao3';
    if (col === 'addedAt') return 400;
    if (col === 'movedAt') return 900;
    return '';
  });

  const work = Schema.deserializeWork(row, headers);

  assert.deepEqual(work.customCats, []);
  assert.deepEqual(work.fandoms, []);
  assert.equal(work.lastModifiedAt, 900);
});

test('deserializeWork tolerates malformed JSON cells', () => {
  const headers = Schema.WORK_COLUMNS;
  const row = headers.map(col => {
    if (col === 'workId') return 'ao3-3';
    if (col === 'platform') return 'ao3';
    if (col === 'customCats') return '{bad json';
    if (col === 'fandoms') return '{also bad';
    if (col === 'furthestChapter') return '{broken';
    return '';
  });

  const work = Schema.deserializeWork(row, headers);

  assert.deepEqual(work.customCats, []);
  assert.deepEqual(work.fandoms, []);
  assert.equal(work.furthestChapter, null);
});

test('serializeDeletion and deserializeDeletion round-trip deletion rows', () => {
  const row = Schema.serializeDeletion('ffnet-9', 'ffnet', 12345);
  const deletion = Schema.deserializeDeletion(row);

  assert.deepEqual(deletion, {
    workId: 'ffnet-9',
    platform: 'ffnet',
    deletedAt: 12345
  });
});

test('headersMatch validates canonical column order', () => {
  assert.equal(Schema.headersMatch(Schema.WORK_COLUMNS, Schema.WORK_COLUMNS), true);
  assert.equal(Schema.headersMatch(['workId', 'platform'], Schema.WORK_COLUMNS), false);
  assert.equal(Schema.headersMatch([...Schema.WORK_COLUMNS].reverse(), Schema.WORK_COLUMNS), false);
});
