const test = require('node:test');
const assert = require('node:assert/strict');

globalThis.AO3TrackerUtils = {
  validateDeps() {}
};

globalThis.AO3TrackerAuthorWatchCore = require('../modules/author-watches/core.js');
const controller = require('../modules/author-watches/controller.js');

test('author watch auto-check stamps the day only after a successful run', async () => {
  const storage = {
    author_watches: {
      watch1: {
        id: 'watch1',
        author: 'Example',
        authorUrl: 'https://archiveofourown.org/users/example',
        fandom: 'Good Omens',
        fandomKey: 'good omens',
        knownWorkIds: [],
        baselineReady: false
      }
    },
    author_matches: [],
    auto_day: null,
    auto_lock: null
  };
  const setCalls = [];

  globalThis.fetch = async () => ({
    ok: true,
    async text() {
      return '<html><body><ol class="work index group"><li class="work blurb group"><h4 class="heading"><a href="https://archiveofourown.org/works/123">Work 123</a></h4><h5 class="fandoms heading"><a class="tag" href="/tags/Good%20Omens/works">Good Omens</a></h5></li></ol></body></html>';
    }
  });

  globalThis.chrome = {
    storage: {
      local: {
        get(_keys, cb) {
          cb({
            author_watches: storage.author_watches,
            author_matches: storage.author_matches,
            auto_day: storage.auto_day,
            auto_lock: storage.auto_lock
          });
        },
        set(obj, cb) {
          setCalls.push(obj);
          Object.assign(storage, obj);
          if (cb) cb();
        },
        remove(key) {
          delete storage[key];
        }
      }
    },
    runtime: {
      getURL(path) {
        return `chrome-extension://test/${path}`;
      }
    },
    notifications: {
      create() {}
    }
  };

  controller.init({
    window: { location: { hostname: 'archiveofourown.org' } },
    document: {
      implementation: {
        createHTMLDocument() {
          const body = {
            innerHTML: '',
            querySelectorAll(selector) {
              if (selector === 'li.work.blurb.group') {
                return [{
                  querySelector(sel) {
                    if (sel === 'h4.heading a[href*="/works/"], h4 a[href*="/works/"]') {
                      return { href: 'https://archiveofourown.org/works/123', textContent: 'Work 123' };
                    }
                    return null;
                  },
                  querySelectorAll(sel) {
                    if (sel === '.fandoms a.tag, .fandom.tags a.tag') {
                      return [{ textContent: 'Good Omens' }];
                    }
                    return [];
                  }
                }];
              }
              return [];
            }
          };
          return {
            head: { appendChild() {} },
            body,
            querySelectorAll(selector) {
              return body.querySelectorAll(selector);
            },
            createElement() {
              return {};
            }
          };
        }
      }
    },
    waitMs: async () => {},
    currentLocalDayStamp: () => '2026-04-28',
    showMiniToast() {},
    AuthorWatchCore: globalThis.AO3TrackerAuthorWatchCore,
    AUTHOR_WATCHES_KEY: 'author_watches',
    AUTHOR_WATCH_MATCHES_KEY: 'author_matches',
    AUTHOR_WATCH_AUTO_DAY_KEY: 'auto_day',
    AUTHOR_WATCH_AUTO_LOCK_KEY: 'auto_lock'
  });

  await controller.__test.runDailyAuthorWatchAutoCheck();

  assert.equal(storage.auto_day, '2026-04-28');
  assert.ok(setCalls.some(call => Object.prototype.hasOwnProperty.call(call, 'auto_day')));
});

test('author watch auto-check does not stamp the day when AO3 blocks the run', async () => {
  const storage = {
    author_watches: {
      watch1: {
        id: 'watch1',
        author: 'Example',
        authorUrl: 'https://archiveofourown.org/users/example',
        fandom: 'Good Omens',
        fandomKey: 'good omens',
        knownWorkIds: [],
        baselineReady: false
      }
    },
    author_matches: [],
    auto_day: null,
    auto_lock: null
  };
  const setCalls = [];

  globalThis.fetch = async () => ({
    ok: true,
    async text() {
      return 'Please slow down and retry later.';
    }
  });

  globalThis.chrome = {
    storage: {
      local: {
        get(_keys, cb) {
          cb({
            author_watches: storage.author_watches,
            author_matches: storage.author_matches,
            auto_day: storage.auto_day,
            auto_lock: storage.auto_lock
          });
        },
        set(obj, cb) {
          setCalls.push(obj);
          Object.assign(storage, obj);
          if (cb) cb();
        },
        remove(key) {
          delete storage[key];
        }
      }
    },
    runtime: {
      getURL(path) {
        return `chrome-extension://test/${path}`;
      }
    },
    notifications: {
      create() {}
    }
  };

  controller.init({
    window: { location: { hostname: 'archiveofourown.org' } },
    document: {
      implementation: {
        createHTMLDocument() {
          return {
            head: { appendChild() {} },
            body: { innerHTML: '' },
            createElement() {
              return {};
            }
          };
        }
      }
    },
    waitMs: async () => {},
    currentLocalDayStamp: () => '2026-04-28',
    showMiniToast() {},
    AuthorWatchCore: globalThis.AO3TrackerAuthorWatchCore,
    AUTHOR_WATCHES_KEY: 'author_watches',
    AUTHOR_WATCH_MATCHES_KEY: 'author_matches',
    AUTHOR_WATCH_AUTO_DAY_KEY: 'auto_day',
    AUTHOR_WATCH_AUTO_LOCK_KEY: 'auto_lock'
  });

  await controller.__test.runDailyAuthorWatchAutoCheck();

  assert.equal(storage.auto_day, null);
  assert.equal(setCalls.some(call => Object.prototype.hasOwnProperty.call(call, 'auto_day')), false);
});
