const test = require('node:test');
const assert = require('node:assert/strict');

const controller = require('../modules/chapter-progress/controller.js');

function option({ value = '', text = '', selected = false, url = '' } = {}) {
  return {
    value,
    textContent: text,
    label: text,
    selected,
    dataset: url ? { url } : {},
    getAttribute(name) {
      return name === 'data-url' ? url : null;
    }
  };
}

function docWithOptions(options) {
  return {
    querySelector(selector) {
      if (selector !== 'select[name="selected_id"]') return null;
      return { options };
    }
  };
}

function pageDocWithOptions(options, state = {}) {
  const listeners = {};
  const doc = {
    visibilityState: state.visibilityState || 'visible',
    webkitVisibilityState: state.webkitVisibilityState || '',
    hidden: state.hidden === true,
    prerendering: state.prerendering === true,
    querySelector(selector) {
      if (selector !== 'select[name="selected_id"]') return null;
      return { options };
    },
    addEventListener(type, fn) {
      if (!listeners[type]) listeners[type] = new Set();
      listeners[type].add(fn);
    },
    removeEventListener(type, fn) {
      listeners[type]?.delete(fn);
    },
    dispatch(type) {
      [...(listeners[type] || [])].forEach(fn => fn());
    },
    listenerCount(type) {
      return listeners[type]?.size || 0;
    }
  };
  return doc;
}

test('inferChapterProgress ignores non-chapter option before chapter one', () => {
  const doc = docWithOptions([
    option({ value: 'full', text: 'Entire work' }),
    option({ value: '111', text: 'Chapter 1', selected: true }),
    option({ value: '222', text: 'Chapter 2' })
  ]);

  assert.deepEqual(
    controller.inferChapterProgress(doc, 'https://archiveofourown.org/works/123/chapters/111'),
    { chapterId: '111', chapterNum: 1, totalChapters: 2 }
  );
});

test('inferChapterProgress counts selected real chapter among chapter options', () => {
  const doc = docWithOptions([
    option({ value: 'full', text: 'Entire work' }),
    option({ value: '111', text: 'Chapter 1' }),
    option({ value: '222', text: 'Chapter 2', selected: true }),
    option({ value: '333', text: 'Chapter 3' })
  ]);

  assert.deepEqual(
    controller.inferChapterProgress(doc, 'https://archiveofourown.org/works/123/chapters/222'),
    { chapterId: '222', chapterNum: 2, totalChapters: 3 }
  );
});

test('inferChapterProgress falls back to chapter one for single-page work urls', () => {
  assert.deepEqual(
    controller.inferChapterProgress(docWithOptions([]), 'https://archiveofourown.org/works/123'),
    { chapterId: null, chapterNum: 1, totalChapters: null }
  );
});

test('trackChapterProgress waits while Chrome prerenders the next chapter', () => {
  const works = {
    123: {
      id: '123',
      status: 'progress',
      title: 'Example',
      url: 'https://archiveofourown.org/works/123'
    }
  };
  const doc = pageDocWithOptions([
    option({ value: '222', text: 'Chapter 2', selected: true })
  ], { prerendering: true, visibilityState: 'hidden', hidden: true });
  let saves = 0;
  let renders = 0;

  controller.init({
    document: doc,
    window: { location: { href: 'https://archiveofourown.org/works/123/chapters/222' } },
    getWorks: cb => cb(works),
    setWorks: () => { saves += 1; },
    renderSidebar: () => { renders += 1; },
    refreshWorkPageMetaRow: () => {}
  });

  controller.trackChapterProgress();

  assert.equal(saves, 0);
  assert.equal(renders, 0);
  assert.equal(works[123].furthestChapter, undefined);
  assert.equal(doc.listenerCount('prerenderingchange'), 1);
});

test('trackChapterProgress resumes after a prerendered page becomes visible', () => {
  const works = {
    123: {
      id: '123',
      status: 'progress',
      title: 'Example',
      url: 'https://archiveofourown.org/works/123'
    }
  };
  const doc = pageDocWithOptions([
    option({ value: '222', text: 'Chapter 2', selected: true })
  ], { prerendering: true, visibilityState: 'hidden', hidden: true });
  let saves = 0;

  controller.init({
    document: doc,
    window: {
      location: { href: 'https://archiveofourown.org/works/123/chapters/222' },
      setTimeout: fn => { fn(); return 0; }
    },
    getWorks: cb => cb(works),
    setWorks: () => { saves += 1; },
    renderSidebar: () => {},
    refreshWorkPageMetaRow: () => {}
  });

  controller.trackChapterProgress();
  doc.prerendering = false;
  doc.visibilityState = 'visible';
  doc.hidden = false;

  const originalSetTimeout = global.setTimeout;
  global.setTimeout = fn => { fn(); return 0; };
  try {
    doc.dispatch('prerenderingchange');
  } finally {
    global.setTimeout = originalSetTimeout;
  }

  assert.equal(saves, 1);
  assert.deepEqual(works[123].furthestChapter, {
    id: '222',
    num: 1,
    total: 1,
    visitedAt: works[123].furthestChapter.visitedAt
  });
  assert.equal(doc.listenerCount('prerenderingchange'), 0);
});
