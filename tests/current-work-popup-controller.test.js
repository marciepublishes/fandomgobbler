const test = require('node:test');
const assert = require('node:assert/strict');

const ctrl = require('../modules/current-work/popup-controller.js');

test('module exports showBar as a function', () => {
  assert.equal(typeof ctrl.showBar, 'function');
});

test('showBar returns immediately when getCurrentWork returns null', () => {
  // Should not throw or access document
  let documentAccessed = false;
  globalThis.document = new Proxy({}, {
    get() { documentAccessed = true; return () => null; }
  });

  ctrl.showBar({ getCurrentWork: () => null });

  assert.equal(documentAccessed, false, 'document should not be touched when no currentWork');
});

test('showBar sets bar visible and populates title for an untracked work', () => {
  const removedClasses = [];
  const barEl = { classList: { remove: (c) => removedClasses.push(c) } };
  const titleEl = { textContent: '', style: {}, title: '', addEventListener() {} };
  const addBtnEl = { onclick: null, classList: { add() {}, remove() {} } };
  const addBtnLabelEl = { textContent: '' };
  const dropdownEl = {
    classList: { contains: () => true, toggle() {}, add() {} },
    querySelectorAll: () => []
  };

  const domMap = {
    addCurrentBar: barEl,
    currentWorkTitle: titleEl,
    currentAddBtn: addBtnEl,
    currentAddBtnLabel: addBtnLabelEl,
    currentAddDropdown: dropdownEl
  };

  globalThis.document = {
    getElementById: (id) => domMap[id] || null,
    querySelectorAll: () => [],
    _ao3PopupDropdownListenerAdded: true,
    addEventListener() {}
  };

  const ctx = {
    getCurrentWork: () => ({ workId: 'w1', title: 'Test Fic', url: 'https://example.com', platform: 'ao3' }),
    getCurrentPlatform: () => 'ao3',
    getWorksMap: () => ({}),
    platformEditionLabel: () => 'AO3 Edition',
    trackedLabelFor: (s) => s || 'Tracked',
    labelFor: (s) => s || '',
    addWork: () => {},
    removeWork: () => false,
    getCustomCats: (cb) => cb({}),
    escHtml: (s) => String(s),
    pruneTrackedWorkIfInvalid: () => false,
    saveWorks: () => {},
    showToast: () => {},
    renderAll: () => {}
  };

  ctrl.showBar(ctx);

  assert.equal(removedClasses.includes('hidden'), true, 'hidden class should be removed from bar');
  assert.equal(titleEl.textContent, 'Test Fic');
});

test('showBar marks existing work status on the add button label', () => {
  const barEl = { classList: { remove() {} } };
  const titleEl = { textContent: '', style: {}, title: '', addEventListener() {} };
  let addedClasses = [];
  const addBtnEl = { onclick: null, classList: { add: (c) => addedClasses.push(c), remove() {} } };
  const addBtnLabelEl = { textContent: '' };
  const dropdownEl = {
    classList: { contains: () => true, toggle() {}, add() {} },
    querySelectorAll: () => []
  };

  const domMap = {
    addCurrentBar: barEl,
    currentWorkTitle: titleEl,
    currentAddBtn: addBtnEl,
    currentAddBtnLabel: addBtnLabelEl,
    currentAddDropdown: dropdownEl
  };

  globalThis.document = {
    getElementById: (id) => domMap[id] || null,
    querySelectorAll: () => [],
    _ao3PopupDropdownListenerAdded: true,
    addEventListener() {}
  };

  const ctx = {
    getCurrentWork: () => ({ workId: 'w1', title: 'Tracked Fic', url: 'https://example.com' }),
    getCurrentPlatform: () => 'ao3',
    getWorksMap: () => ({ w1: { status: 'progress' } }),
    platformEditionLabel: () => 'AO3 Edition',
    trackedLabelFor: (s) => ({ progress: 'Reading' }[s] || s),
    labelFor: (s) => s,
    addWork: () => {},
    removeWork: () => false,
    getCustomCats: (cb) => cb({}),
    escHtml: (s) => String(s),
    pruneTrackedWorkIfInvalid: () => false,
    saveWorks: () => {},
    showToast: () => {},
    renderAll: () => {}
  };

  ctrl.showBar(ctx);

  assert.equal(addBtnLabelEl.textContent, 'Reading');
  assert.equal(addedClasses.includes('has-status'), true);
});
