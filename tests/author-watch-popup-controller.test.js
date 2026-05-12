const test = require('node:test');
const assert = require('node:assert/strict');

require('../modules/author-watches/core.js');
const controller = require('../modules/author-watches/popup-controller.js');

test('author watch popup controller exports expected entrypoints', () => {
  assert.equal(typeof controller.setupControls, 'function');
  assert.equal(typeof controller.renderSection, 'function');
  assert.equal(typeof controller.refreshAuthorWatches, 'function');
  assert.equal(typeof controller.fetchAuthorWatchFeed, 'function');
});

test('author watch popup controller render section no-ops without containers', () => {
  controller.renderSection({
    document: {
      getElementById() {
        return null;
      }
    },
    getCurrentWork() {
      return null;
    },
    getAuthorWatches() {
      return {};
    },
    getAuthorWatchMatches() {
      return [];
    },
    getWorksMap() {
      return {};
    }
  });
});

test('author watch popup controller returns empty feed when watch is incomplete', async () => {
  const result = await controller.fetchAuthorWatchFeed({
    document: {
      implementation: null
    }
  }, { authorUrl: '', fandomKey: '' });

  assert.deepEqual(result, []);
});
