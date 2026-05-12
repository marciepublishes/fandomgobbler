const test = require('node:test');
const assert = require('node:assert/strict');

const core = require('../modules/tracked-works/core.js');

test('normalizeStatusValue accepts only builtin statuses', () => {
  assert.equal(core.normalizeStatusValue('progress'), 'progress');
  assert.equal(core.normalizeStatusValue('mystery-status'), '');
});

test('isTrackedWorkValid allows status-only and custom-category-only works', () => {
  assert.equal(core.isTrackedWorkValid({ status: 'want', customCats: [] }), true);
  assert.equal(core.isTrackedWorkValid({ status: '', customCats: ['unfinished'] }), true);
  assert.equal(core.isTrackedWorkValid({ status: '', customCats: [] }), false);
});

test('nextFinishedAt stamps when a work newly becomes completed', () => {
  const before = Date.now();
  const stamped = core.nextFinishedAt('progress', 'completed', null);
  assert.equal(typeof stamped, 'number');
  assert.equal(stamped >= before, true);
});

test('nextFinishedAt preserves existing timestamp when status stays completed', () => {
  assert.equal(core.nextFinishedAt('completed', 'completed', 12345), 12345);
});

test('getRestoreStatus prefers lostFrom and otherwise keeps category-only works statusless', () => {
  assert.equal(core.getRestoreStatus({ lostFrom: 'progress' }), 'progress');
  assert.equal(core.getRestoreStatus({ customCats: ['unfinished'] }), '');
  assert.equal(core.getRestoreStatus({ customCats: [] }), 'want');
});

test('pruneTrackedWorkIfInvalid removes uncategorized statusless works', () => {
  const works = {
    a: { status: '', customCats: [] },
    b: { status: '', customCats: ['unfinished'] }
  };

  assert.equal(core.pruneTrackedWorkIfInvalid(works, 'a'), true);
  assert.equal(Object.prototype.hasOwnProperty.call(works, 'a'), false);
  assert.equal(core.pruneTrackedWorkIfInvalid(works, 'b'), false);
});

test('sanitizeTrackedWorksMap normalizes fields and drops invalid works', () => {
  const input = {
    '123': {
      status: 'progress',
      customCats: ['unfinished', 'unfinished', '', 5],
      title: '  ',
      author: '',
      authorUrl: '',
      url: ''
    },
    '456': {
      status: '',
      customCats: []
    }
  };

  const result = core.sanitizeTrackedWorksMap(input);

  assert.equal(result.changed, true);
  assert.deepEqual(Object.keys(result.works), ['123']);
  assert.equal(result.works['123'].status, 'progress');
  assert.deepEqual(result.works['123'].customCats, ['unfinished']);
  assert.equal(result.works['123'].title, 'Work 123');
  assert.equal(result.works['123'].author, 'Anonymous');
  assert.equal(result.works['123'].authorUrl, null);
  assert.equal(result.works['123'].url, 'https://archiveofourown.org/works/123');
});

test('sanitizeTrackedWorksMap marks orphan_account works as orphaned', () => {
  const result = core.sanitizeTrackedWorksMap({
    '123': {
      id: '123',
      title: 'Orphaned',
      author: 'orphan_account',
      authorUrl: 'https://archiveofourown.org/users/orphan_account/pseuds/orphan_account',
      status: 'want',
      customCats: [],
      url: 'https://archiveofourown.org/works/123'
    }
  });

  assert.equal(result.works['123'].isOrphaned, true);
  assert.equal(result.changed, true);
});
