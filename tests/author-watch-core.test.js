const test = require('node:test');
const assert = require('node:assert/strict');

const core = require('../modules/author-watches/core.js');

test('normalizeAuthorWatchUrl removes query, hash, trailing slash, and works suffix', () => {
  assert.equal(
    core.normalizeAuthorWatchUrl('https://archiveofourown.org/users/TestUser/works?page=2#recent'),
    'https://archiveofourown.org/users/TestUser'
  );
});

test('normalizeWatchFandom trims and lowercases', () => {
  assert.equal(core.normalizeWatchFandom('  Good Omens (TV)  '), 'good omens (tv)');
});

test('buildAuthorWatchFeedUrl requests author works by posted date', () => {
  assert.equal(
    core.buildAuthorWatchFeedUrl('https://archiveofourown.org/users/example', 2),
    'https://archiveofourown.org/users/example/works?page=2&sort_column=created_at&sort_direction=desc'
  );
});

test('buildAuthorWatchOpenUrl and feed URL support fandom ids', () => {
  assert.equal(
    core.buildAuthorWatchOpenUrl('https://archiveofourown.org/users/example/pseuds/example', '801274'),
    'https://archiveofourown.org/users/example/pseuds/example/works?fandom_id=801274'
  );
  assert.equal(
    core.buildAuthorWatchFeedUrl('https://archiveofourown.org/users/example/pseuds/example', 1, '801274'),
    'https://archiveofourown.org/users/example/pseuds/example/works?fandom_id=801274&page=1&sort_column=created_at&sort_direction=desc'
  );
});

test('extractFandomIdFromDocument finds matching AO3 fandom filter ids', () => {
  const doc = {
    querySelectorAll(selector) {
      if (selector === 'a[href*="fandom_id="]') {
        return [
          { href: 'https://archiveofourown.org/users/example/works?fandom_id=123', textContent: 'Other Fandom' }
        ];
      }
      if (selector === 'input[name*="fandom"], input[id*="fandom"]') {
        const label = { textContent: 'The Locked Tomb Series - Tamsyn Muir' };
        return [
          {
            value: '801274',
            textContent: '',
            closest(kind) {
              return kind === 'label' ? label : null;
            }
          }
        ];
      }
      return [];
    }
  };

  assert.equal(core.extractFandomIdFromDocument(doc, 'The Locked Tomb Series - Tamsyn Muir'), '801274');
});

test('sanitizeAuthorWatchesMap keeps valid watches and normalizes fields', () => {
  const input = {
    watch1: {
      author: '  Example Author ',
      authorUrl: 'https://archiveofourown.org/users/example/works?page=1',
      fandom: ' Good Omens ',
      fandomId: '801274',
      knownWorkIds: ['123', '123', ' 456 '],
      baselineReady: true
    },
    bad: {
      author: '',
      authorUrl: '',
      fandom: ''
    }
  };

  const result = core.sanitizeAuthorWatchesMap(input);

  assert.equal(result.changed, true);
  assert.deepEqual(Object.keys(result.watches), ['watch1']);
  assert.equal(result.watches.watch1.author, 'Example Author');
  assert.equal(result.watches.watch1.authorUrl, 'https://archiveofourown.org/users/example');
  assert.equal(result.watches.watch1.fandomKey, 'good omens');
  assert.equal(result.watches.watch1.fandomId, '801274');
  assert.deepEqual(result.watches.watch1.knownWorkIds, ['123', '456']);
});

test('sanitizeAuthorWatchMatches removes duplicates, invalid rows, and sorts newest first', () => {
  const result = core.sanitizeAuthorWatchMatches([
    { id: 'older', watchId: 'w1', workId: '1', title: 'Old', url: 'https://archiveofourown.org/works/1', foundAt: 10 },
    { id: 'newer', watchId: 'w1', workId: '2', title: 'New', url: 'https://archiveofourown.org/works/2', foundAt: 20 },
    { id: 'newer', watchId: 'w1', workId: '2', title: 'Duplicate', url: 'https://archiveofourown.org/works/2', foundAt: 30 },
    { id: '', watchId: 'w1', workId: '3', title: 'Bad', url: 'https://archiveofourown.org/works/3' }
  ]);

  assert.deepEqual(result.map(item => item.id), ['newer', 'older']);
});

test('sanitizeFetchedAo3Html strips executable and head-level noise', () => {
  const html = [
    '<html><head>',
    '<script src="https://archiveofourown.org/javascripts/application.js"></script>',
    '<script src="https://archiveofourown.org/javascripts/rails.js" async>',
    '<script src="https://archiveofourown.org/javascripts/livevalidation_standalone.js" />',
    '<link rel="preload" href="https://archiveofourown.org/stylesheets/sandbox.css" as="style">',
    '<link rel="stylesheet" href="https://archiveofourown.org/stylesheets/site.css">',
    '<meta http-equiv="refresh" content="0;url=https://archiveofourown.org/">',
    '<style>.x { color: red; }</style>',
    '</head><body>',
    '<noscript>fallback</noscript>',
    '<img src="https://archiveofourown.org/images/icon.png">',
    '<iframe src="https://archiveofourown.org/"></iframe>',
    '<div class="work" onclick="alert(1)">hello</div>',
    '<a href="/works/123" ping="https://archiveofourown.org/ping">safe link</a>',
    '</body></html>'
  ].join('');

  const sanitized = core.sanitizeFetchedAo3Html(html);

  assert.equal(sanitized.includes('<script'), false);
  assert.equal(sanitized.includes('livevalidation_standalone.js'), false);
  assert.equal(sanitized.includes('<head'), false);
  assert.equal(sanitized.includes('<link'), false);
  assert.equal(sanitized.includes('<meta'), false);
  assert.equal(sanitized.includes('<style'), false);
  assert.equal(sanitized.includes('<noscript'), false);
  assert.equal(sanitized.includes('<img'), false);
  assert.equal(sanitized.includes('<iframe'), false);
  assert.equal(sanitized.includes('onclick='), false);
  assert.equal(sanitized.includes('ping='), false);
  assert.equal(sanitized.includes('sandbox.css'), false);
  assert.equal(sanitized.includes('javascripts/rails.js'), false);
  assert.equal(sanitized.includes('hello'), true);
  assert.equal(sanitized.includes('href="/works/123"'), true);
});

test('looksLikeAo3BotBlock detects common throttling text', () => {
  assert.equal(core.looksLikeAo3BotBlock('Please slow down and retry later.'), true);
  assert.equal(core.looksLikeAo3BotBlock('Everything is normal here.'), false);
});

test('extractWorkIdFromUrl extracts AO3 work ids', () => {
  assert.equal(core.extractWorkIdFromUrl('https://archiveofourown.org/works/12345/chapters/67890'), '12345');
  assert.equal(core.extractWorkIdFromUrl('https://archiveofourown.org/tags/test/works'), null);
});
