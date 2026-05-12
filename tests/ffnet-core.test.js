const test = require('node:test');
const assert = require('node:assert/strict');

const core = require('../modules/ffnet/core.js');

function makeNode(text, attrs = {}) {
  return {
    textContent: text,
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(attrs, name) ? attrs[name] : null;
    }
  };
}

test('extractStoryIdFromUrl and isStoryUrl recognize FF.net story pages', () => {
  assert.equal(core.extractStoryIdFromUrl('https://www.fanfiction.net/s/1234567/1/Title'), '1234567');
  assert.equal(core.extractStoryIdFromUrl('/s/7654321/3/Title'), '7654321');
  assert.equal(core.extractStoryIdFromUrl('https://www.fanfiction.net/u/42/Author'), null);
  assert.equal(core.isStoryUrl('https://www.fanfiction.net/s/1234567/1/Title'), true);
  assert.equal(core.isStoryUrl('https://www.fanfiction.net/u/42/Author'), false);
  assert.equal(core.buildWorkId('1234567'), 'ffnet-1234567');
});

test('parseMetaText reads FF.net counts, dates, and completion state', () => {
  const meta = core.parseMetaText('Rated: Fiction T - English - Chapters: 12 - Words: 45,678 - Reviews: 90 - Favs: 12 - Follows: 34 - Updated: 2024-05-01 - Published: 2024-01-02 - Status: Complete');

  assert.equal(meta.chapters, 12);
  assert.equal(meta.words, 45678);
  assert.equal(meta.reviews, 90);
  assert.equal(meta.favs, 12);
  assert.equal(meta.follows, 34);
  assert.equal(typeof meta.updatedAt, 'number');
  assert.equal(typeof meta.publishedAt, 'number');
  assert.equal(meta.completed, true);
});

test('extractWorkInfoFromDocument maps a story page into shared tracked-work shape', () => {
  const fandomLinks = [
    makeNode('Harry Potter', { href: '/book/Harry-Potter/' }),
    makeNode('Fanfiction', { href: '/book/' })
  ];
  const authorLink = makeNode('Potionpen', { href: '/u/42/Potionpen' });
  const titleNode = makeNode('A Very Specific Fic');
  const metaNode = makeNode('Rated: Fiction T - English - Chapters: 8 - Words: 12,345 - Reviews: 67 - Favs: 89 - Follows: 10 - Updated: 2024-04-10 - Published: 2024-01-01 - Status: Complete');
  const summaryNode = makeNode('A summary that is long enough to count as the fic description for this test.');

  const profileTop = {
    querySelector(selector) {
      if (selector === 'a[href*="/u/"]') return authorLink;
      if (selector === 'b.xcontrast_txt, .xcontrast_txt b, b') return titleNode;
      return null;
    },
    querySelectorAll(selector) {
      if (selector === 'span, div, p') return [metaNode, summaryNode];
      return [];
    }
  };

  const doc = {
    title: 'A Very Specific Fic | FanFiction',
    location: { href: 'https://www.fanfiction.net/s/1234567/3/A-Very-Specific-Fic' },
    getElementById(id) {
      return id === 'profile_top' ? profileTop : null;
    },
    querySelector(selector) {
      return selector === '#content_wrapper_inner' ? profileTop : null;
    },
    querySelectorAll(selector) {
      if (selector === 'a[href*="/book/"], a[href*="/anime/"], a[href*="/cartoon/"], a[href*="/comic/"], a[href*="/game/"], a[href*="/misc/"], a[href*="/movie/"], a[href*="/play/"], a[href*="/tv/"]') {
        return fandomLinks;
      }
      return [];
    }
  };

  const work = core.extractWorkInfoFromDocument(doc, doc.location.href);

  assert.equal(work.platform, 'ffnet');
  assert.equal(work.workId, 'ffnet-1234567');
  assert.equal(work.sourceId, '1234567');
  assert.equal(work.title, 'A Very Specific Fic');
  assert.equal(work.author, 'Potionpen');
  assert.equal(work.authorUrl, 'https://www.fanfiction.net/u/42/Potionpen');
  assert.equal(work.chapterCount, 8);
  assert.deepEqual(work.fandoms, ['Harry Potter']);
  assert.equal(work.furthestChapter.num, 3);
  assert.equal(work.summary.includes('summary'), true);
  assert.equal(typeof work.completedAt, 'number');
});

test('extractTrackedWorkFromListingLink builds listing cards into trackable works', () => {
  const authorLink = makeNode('StoryCrafter', { href: '/u/77/StoryCrafter' });
  const summaryNode = makeNode('A long listing summary that describes the story enough to be reused by the tracker.');
  const titleLink = {
    href: 'https://www.fanfiction.net/s/7654321/1/Another-Story',
    getAttribute(name) {
      return name === 'href' ? '/s/7654321/1/Another-Story' : null;
    },
    textContent: 'Another Story',
    closest() {
      return container;
    },
    parentElement: null,
    insertAdjacentElement() {}
  };
  const container = {
    querySelector(selector) {
      return selector === 'a[href*="/u/"]' ? authorLink : null;
    },
    querySelectorAll(selector) {
      return selector === 'div, span' ? [summaryNode] : [];
    },
    textContent: 'Rated: Fiction K - English - Words: 3,210 - Reviews: 5 - Favs: 8 - Follows: 13 - Published: 2024-03-01'
  };

  const work = core.extractTrackedWorkFromListingLink(titleLink, 'https://www.fanfiction.net/anime/');

  assert.equal(work.workId, 'ffnet-7654321');
  assert.equal(work.title, 'Another Story');
  assert.equal(work.author, 'StoryCrafter');
  assert.equal(work.authorUrl, 'https://www.fanfiction.net/u/77/StoryCrafter');
  assert.equal(work.url, 'https://www.fanfiction.net/s/7654321/1/Another-Story');
  assert.equal(work.wordCount, 3210);
  assert.equal(work.bookmarksCount, 8);
  assert.equal(work.kudosCount, 5);
  assert.equal(work.hitsCount, 13);
});

// --- safeTimestamp ---

test('safeTimestamp returns numeric timestamps as-is', () => {
  assert.equal(core.safeTimestamp(1700000000000), 1700000000000);
  assert.equal(core.safeTimestamp('1700000000000'), 1700000000000);
});

test('safeTimestamp parses date strings', () => {
  const ts = core.safeTimestamp('2024-01-15');
  assert.ok(typeof ts === 'number' && ts > 0);
});

test('safeTimestamp returns fallback for null, empty, invalid', () => {
  assert.equal(core.safeTimestamp(null), null);
  assert.equal(core.safeTimestamp(''), null);
  assert.equal(core.safeTimestamp('not-a-date'), null);
  assert.equal(core.safeTimestamp(null, 0), 0);
});

// --- normalizeImportedCategory ---

test('normalizeImportedCategory returns null for invalid input', () => {
  assert.equal(core.normalizeImportedCategory(null), null);
  assert.equal(core.normalizeImportedCategory({ name: '' }), null);
  assert.equal(core.normalizeImportedCategory({ name: '   ' }), null);
});

test('normalizeImportedCategory normalizes valid category', () => {
  const cat = core.normalizeImportedCategory({ id: 'cat-1', name: 'Tragedy', color: '#dc2626', hideOnListings: true });
  assert.equal(cat.name, 'Tragedy');
  assert.equal(cat.color, '#dc2626');
  assert.equal(cat.hideOnListings, true);
});

test('normalizeImportedCategory uses fallback color for invalid hex', () => {
  const cat = core.normalizeImportedCategory({ name: 'Test', color: 'not-a-color' });
  assert.equal(cat.color, '#6b7280');
});

// --- csvCell ---

test('csvCell quotes cells containing comma, quote, or newline', () => {
  assert.equal(core.csvCell('hello'), 'hello');
  assert.equal(core.csvCell('hello, world'), '"hello, world"');
  assert.equal(core.csvCell('say "hi"'), '"say ""hi"""');
});

// --- parseCsvRecords / parseCsvRow ---

test('parseCsvRecords splits lines respecting quoted newlines', () => {
  const records = core.parseCsvRecords('a,b\nc,d\ne,f');
  assert.equal(records.length, 3);
});

test('parseCsvRow splits columns respecting quoted commas', () => {
  const cols = core.parseCsvRow('"hello, world",plain,another');
  assert.equal(cols.length, 3);
  assert.equal(cols[1], 'plain');
  assert.equal(cols[2], 'another');
  assert.ok(cols[0].includes('hello, world'), 'quoted field contains the comma-containing value');
});
