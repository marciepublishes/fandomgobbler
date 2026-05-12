const test = require('node:test');
const assert = require('node:assert/strict');

const core = require('../modules/ao3-page/core.js');

test('detectSubscribedStateFromMarkup detects explicit subscription ids', () => {
  const markup = '<form action="/works/123/subscriptions/456"></form>';
  assert.equal(core.detectSubscribedStateFromMarkup(markup, '123'), true);
});

test('detectSubscribedStateFromMarkup distinguishes unsubscribed state', () => {
  const markup = '<form action="/works/123/subscriptions"></form>';
  assert.equal(core.detectSubscribedStateFromMarkup(markup, '123'), false);
});

test('extractBlurbTextSummary normalizes line breaks', () => {
  const blurb = {
    querySelector(selector) {
      if (selector === '.summary blockquote.userstuff') {
        return { innerText: 'Line one\r\n\r\n\r\nLine two' };
      }
      return null;
    }
  };

  assert.equal(core.extractBlurbTextSummary(blurb), 'Line one\n\nLine two');
});

test('extractBlurbStatNumber reads dd/li stat values', () => {
  const blurb = {
    querySelector(selector) {
      if (selector === 'dd.words, li.words') return { textContent: '12,345' };
      return null;
    }
  };

  assert.equal(core.extractBlurbStatNumber(blurb, 'words'), 12345);
});

test('extractTrackedWorkFromBlurb shapes listing data from a blurb-like object', () => {
  const h4 = {
    querySelectorAll(selector) {
      if (selector === 'a[href*="/users/"]') return [{ href: 'https://archiveofourown.org/users/test', textContent: 'Author' }];
      return [];
    },
    querySelector(selector) {
      if (selector === 'a[href*="/works/"]') return { textContent: ' Example Title ' };
      return null;
    }
  };

  const blurb = {
    querySelector(selector) {
      if (selector === 'h4.heading, h4') return h4;
      if (selector === '.relationships a.tag, .relationship.tags a.tag') return { textContent: 'Pairing' };
      if (selector === '.summary blockquote.userstuff') return { innerText: 'Summary' };
      if (selector === 'dd.words, li.words') return { textContent: '5,000' };
      if (selector === 'dd.kudos, li.kudos') return { textContent: '100' };
      if (selector === 'dd.bookmarks, li.bookmarks') return { textContent: '30' };
      if (selector === 'dd.hits, li.hits') return { textContent: '900' };
      if (selector === 'a[href*="/users/"]') return { textContent: 'Author' };
      return null;
    },
    querySelectorAll(selector) {
      if (selector === '.fandoms a.tag, .fandom.tags a.tag') return [{ textContent: 'Good Omens' }, { textContent: 'Second Fandom' }];
      return [];
    }
  };

  const result = core.extractTrackedWorkFromBlurb(blurb, '123');

  assert.equal(result.id, '123');
  assert.equal(result.title, 'Example Title');
  assert.equal(result.author, 'Author');
  assert.equal(result.authorUrl, 'https://archiveofourown.org/users/test');
  assert.deepEqual(result.fandoms, ['Good Omens', 'Second Fandom']);
  assert.equal(result.summary, 'Summary');
  assert.equal(result.wordCount, 5000);
  assert.equal(result.kudosCount, 100);
});

test('extractTrackedWorkFromBlurb marks orphan_account as orphaned', () => {
  const h4 = {
    querySelectorAll(selector) {
      if (selector === 'a[href*="/users/"]') return [{ href: 'https://archiveofourown.org/users/orphan_account', textContent: 'orphan_account' }];
      return [];
    },
    querySelector(selector) {
      if (selector === 'a[href*="/works/"]') return { textContent: ' Orphaned Title ' };
      return null;
    }
  };

  const blurb = {
    querySelector(selector) {
      if (selector === 'h4.heading, h4') return h4;
      if (selector === 'a[href*="/users/"]') return { href: 'https://archiveofourown.org/users/orphan_account', textContent: 'orphan_account' };
      return null;
    },
    querySelectorAll() {
      return [];
    }
  };

  const result = core.extractTrackedWorkFromBlurb(blurb, '321');

  assert.equal(result.author, 'orphan_account');
  assert.equal(result.isOrphaned, true);
});

test('extractWorkIdFromAo3Url recognizes collection work urls', () => {
  assert.equal(
    core.extractWorkIdFromAo3Url('https://archiveofourown.org/collections/FunFanfic/works/787368'),
    '787368'
  );
  assert.equal(
    core.extractWorkIdFromAo3Url('https://archiveofourown.org/works/12345/chapters/67890'),
    '12345'
  );
});

test('extractWorkInfoFromDocument treats collection work urls as work pages', () => {
  const titleEl = { textContent: ' Collection Work ' };
  const authorEl = { href: 'https://archiveofourown.org/users/example', textContent: ' Example Author ' };
  const byline = {
    querySelector(selector) {
      if (selector.includes('author')) return authorEl;
      return null;
    },
    querySelectorAll() {
      return [];
    }
  };

  const doc = {
    documentElement: { innerHTML: '' },
    querySelector(selector) {
      if (selector === 'h2.title.heading') return titleEl;
      if (selector === 'h3.byline.heading') return byline;
      if (selector === 'dl.stats') return {};
      return null;
    },
    querySelectorAll(selector) {
      if (selector === '.fandom.tags a.tag') return [{ textContent: ' Good Omens ' }];
      if (selector === 'dl.stats dt') return [];
      return [];
    }
  };

  const result = core.extractWorkInfoFromDocument(
    doc,
    'https://archiveofourown.org/collections/FunFanfic/works/787368',
    'AO3'
  );

  assert.equal(result.workId, '787368');
  assert.equal(result.title, 'Collection Work');
  assert.equal(result.author, 'Example Author');
  assert.equal(result.url, 'https://archiveofourown.org/works/787368');
  assert.deepEqual(result.fandoms, ['Good Omens']);
});

test('extractWorkInfoFromDocument marks orphan_account as orphaned', () => {
  const titleEl = { textContent: ' Orphaned Work ' };
  const authorEl = { href: 'https://archiveofourown.org/users/orphan_account/pseuds/orphan_account', textContent: ' orphan_account ' };
  const byline = {
    querySelector(selector) {
      if (selector.includes('author')) return authorEl;
      return null;
    },
    querySelectorAll() {
      return [];
    }
  };

  const doc = {
    documentElement: { innerHTML: '' },
    querySelector(selector) {
      if (selector === 'h2.title.heading') return titleEl;
      if (selector === 'h3.byline.heading') return byline;
      if (selector === 'dl.stats') return {};
      return null;
    },
    querySelectorAll() {
      return [];
    }
  };

  const result = core.extractWorkInfoFromDocument(doc, 'https://archiveofourown.org/works/321', 'AO3');

  assert.equal(result.author, 'orphan_account');
  assert.equal(result.isOrphaned, true);
});
