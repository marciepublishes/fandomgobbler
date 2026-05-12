const test = require('node:test');
const assert = require('node:assert/strict');

require('../modules/sidebar/core.js');
const controller = require('../modules/sidebar/controller.js');

test('sidebar controller exports expected entrypoints', () => {
  assert.equal(typeof controller.renderSidebar, 'function');
  assert.equal(typeof controller.openSidebar, 'function');
  assert.equal(typeof controller.closeSidebar, 'function');
});

test('sidebar controller render no-ops when list is missing', () => {
  let getWorksCalled = false;
  controller.renderSidebar({
    document: {
      getElementById() {
        return null;
      }
    },
    getWorks() {
      getWorksCalled = true;
    }
  });
  assert.equal(getWorksCalled, false);
});

test('sidebar controller shows onboarding when no works exist', () => {
  const elements = {};
  const onboardingEl = { style: { display: 'none' } };
  const emptyEl = { style: { display: 'none' }, textContent: '' };
  const listEl = { innerHTML: '', appendChild() {} };

  function makeDoc() {
    return {
      getElementById(id) {
        if (id === 'aot-sidebar-onboarding') return onboardingEl;
        if (id === 'aot-empty') return emptyEl;
        if (id === 'aot-list') return listEl;
        if (id === 'aot-total') return { textContent: '' };
        if (id === 'aot-cnt-all') return { textContent: '' };
        if (id === 'aot-sort-indicator') return null;
        const statusIds = ['want','progress','completed','rereading','onhold','dnf','lost'];
        if (statusIds.some(s => id === `aot-cnt-${s}`)) return { textContent: '' };
        return null;
      }
    };
  }

  const state = {
    getActiveTab: () => 'all',
    getSearchQuery: () => '',
    getSidebarRandomOrder: () => [],
    setSidebarRandomOrder: () => {}
  };

  controller.renderSidebar({
    document: makeDoc(),
    getWorks: cb => cb({}),
    getLibrarySortSetting: cb => cb('recently-added'),
    getCustomCats: cb => cb({}),
    normalizeStatusValue: s => ['want','progress','completed','rereading','onhold','dnf','lost'].includes(s) ? s : '',
    buildCard: () => ({ classList: { add() {} } }),
    flippedSidebarCards: new Set(),
    expandedSummaryCards: new Set(),
    syncFrontCardDateWrapState: () => {},
    updateSidebarSortIndicator: () => {},
    emptyMsg: () => '',
    state
  });

  assert.equal(onboardingEl.style.display, 'block', 'onboarding banner should be visible with no works');
  assert.equal(emptyEl.style.display, 'none', 'regular empty message should be hidden during first-run');
});

test('sidebar controller hides onboarding when works exist', () => {
  const onboardingEl = { style: { display: 'block' } };
  const emptyEl = { style: { display: '' }, textContent: '' };
  const listEl = { innerHTML: '', appendChild() {} };

  const work = { id: 'w1', status: 'want', title: 'Test', addedAt: Date.now() };

  function makeDoc() {
    return {
      getElementById(id) {
        if (id === 'aot-sidebar-onboarding') return onboardingEl;
        if (id === 'aot-empty') return emptyEl;
        if (id === 'aot-list') return listEl;
        if (id === 'aot-total') return { textContent: '' };
        if (id === 'aot-cnt-all') return { textContent: '' };
        const statusIds = ['want','progress','completed','rereading','onhold','dnf','lost'];
        if (statusIds.some(s => id === `aot-cnt-${s}`)) return { textContent: '' };
        return null;
      }
    };
  }

  const state = {
    getActiveTab: () => 'all',
    getSearchQuery: () => '',
    getSidebarRandomOrder: () => [],
    setSidebarRandomOrder: () => {}
  };

  const fakeCard = { classList: { add() {} }, getBoundingClientRect: () => ({ height: 0 }) };

  controller.renderSidebar({
    document: makeDoc(),
    getWorks: cb => cb({ w1: work }),
    getLibrarySortSetting: cb => cb('recently-added'),
    getCustomCats: cb => cb({}),
    normalizeStatusValue: s => ['want','progress','completed','rereading','onhold','dnf','lost'].includes(s) ? s : '',
    buildCard: () => fakeCard,
    flippedSidebarCards: new Set(),
    expandedSummaryCards: new Set(),
    syncFrontCardDateWrapState: () => {},
    updateSidebarSortIndicator: () => {},
    emptyMsg: () => '',
    state
  });

  assert.equal(onboardingEl.style.display, 'none', 'onboarding banner should be hidden when works exist');
});
