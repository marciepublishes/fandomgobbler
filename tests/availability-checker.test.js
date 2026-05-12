const test = require('node:test');
const assert = require('node:assert/strict');

const checker = require('../modules/availability-checker/controller.js');

test('availability checker marks deleted responses as deleted', async () => {
  globalThis.fetch = async () => ({
    status: 404,
    async text() {
      return '';
    }
  });

  const result = await checker.__test.checkWorkAvailable('https://archiveofourown.org/works/123');

  assert.equal(result.availability, 'deleted');
});

test('availability checker treats restricted works as restricted, not deleted', async () => {
  globalThis.fetch = async () => ({
    status: 200,
    async text() {
      return "Sorry, you don't have permission to access this work.";
    }
  });

  const result = await checker.__test.checkWorkAvailable('https://archiveofourown.org/works/123');

  assert.equal(result.availability, 'restricted');
});

test('availability checker extracts availability metadata from an available work page', async () => {
  globalThis.fetch = async () => ({
    status: 200,
    async text() {
      return [
        '<dl class="stats">',
        '<dt>Words:</dt><dd class="words">12,345</dd>',
        '<dt>Kudos:</dt><dd class="kudos">456</dd>',
        '<dt>Bookmarks:</dt><dd class="bookmarks">78</dd>',
        '<dt>Hits:</dt><dd class="hits">9,876</dd>',
        '<dt>Updated:</dt><dd>2026-04-01</dd>',
        '<dt>Published:</dt><dd>2026-03-01</dd>',
        '<dt>Chapters:</dt><dd>10/10</dd>',
        '</dl>',
        '<form action="/works/123/subscriptions/456"></form>'
      ].join('');
    }
  });

  const result = await checker.__test.checkWorkAvailable('https://archiveofourown.org/works/123');

  assert.equal(result.availability, 'available');
  assert.equal(result.wordCount, 12345);
  assert.equal(result.kudosCount, 456);
  assert.equal(result.bookmarksCount, 78);
  assert.equal(result.hitsCount, 9876);
  assert.equal(result.subscribedAtAo3, true);
  assert.equal(typeof result.updatedAt, 'number');
  assert.equal(typeof result.publishedAt, 'number');
  assert.equal(typeof result.inferredCompletedAt, 'number');
});

test('availability checker builds deleted-work notification payload', () => {
  const payload = checker.__test.deletedWorkNotificationPayload({
    title: 'A Very Long Work Title That Needs To Be Shortened For Notifications',
    author: 'Test Author'
  });

  assert.equal(payload.type, 'basic');
  assert.equal(payload.title, 'Tracked work may be gone');
  assert.match(payload.message, /Test Author/);
  assert.ok(payload.message.length < 120);
});
