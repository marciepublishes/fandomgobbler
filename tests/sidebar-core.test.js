const test = require('node:test');
const assert = require('node:assert/strict');

const core = require('../modules/sidebar/core.js');

// --- buildSidebarBuckets ---

test('buildSidebarBuckets groups works by builtin status', () => {
  const buckets = core.buildSidebarBuckets([
    { id: '1', status: 'want' },
    { id: '2', status: 'progress' },
    { id: '3', status: 'completed' },
    { id: '4', status: '' }
  ]);

  assert.deepEqual(buckets.want.map(work => work.id), ['1']);
  assert.deepEqual(buckets.progress.map(work => work.id), ['2']);
  assert.deepEqual(buckets.completed.map(work => work.id), ['3']);
  assert.deepEqual(buckets.rereading, []);
});

// --- computeSidebarViewModel ---

test('computeSidebarViewModel filters custom-category tabs across statuses', () => {
  const works = [
    { id: '1', title: 'One', author: 'A', status: 'progress', customCats: ['unfinished'], addedAt: 10, movedAt: 10 },
    { id: '2', title: 'Two', author: 'B', status: '', customCats: ['unfinished'], addedAt: 20, movedAt: 20 },
    { id: '3', title: 'Three', author: 'C', status: 'want', customCats: [], addedAt: 30, movedAt: 30 }
  ];

  const viewModel = core.computeSidebarViewModel({
    works, activeTab: 'unfinished', searchQuery: '', sortKey: 'recently-added', randomOrder: []
  });

  assert.deepEqual(viewModel.sorted.map(work => work.id), ['2', '1']);
  assert.equal(viewModel.showStatusBadge, true);
  assert.equal(viewModel.shouldUseSmartSort, true);
});

test('computeSidebarViewModel uses all works when searching and shows status badges', () => {
  const works = [
    { id: '1', title: 'Good Omens Fic', author: 'A', fandoms: ['Good Omens'], relationship: '', notes: '', status: 'progress', customCats: [], addedAt: 10, movedAt: 10 },
    { id: '2', title: 'Other Fic', author: 'B', fandoms: ['Different'], relationship: '', notes: '', status: 'completed', customCats: [], addedAt: 20, movedAt: 20 }
  ];

  const viewModel = core.computeSidebarViewModel({
    works, activeTab: 'completed', searchQuery: 'good', sortKey: 'recently-added', randomOrder: []
  });

  assert.deepEqual(viewModel.sorted.map(work => work.id), ['1']);
  assert.equal(viewModel.showStatusBadge, true);
  assert.equal(viewModel.shouldUseSmartSort, false);
  assert.equal(viewModel.emptyMessage, 'No results found.');
});

test('computeSidebarViewModel hides status badges inside builtin tabs without search', () => {
  const works = [
    { id: '1', title: 'Newest', author: 'A', status: 'progress', customCats: [], addedAt: 20, movedAt: 20 },
    { id: '2', title: 'Older', author: 'B', status: 'progress', customCats: [], addedAt: 10, movedAt: 10 }
  ];

  const viewModel = core.computeSidebarViewModel({
    works, activeTab: 'progress', searchQuery: '', sortKey: 'recently-added', randomOrder: []
  });

  assert.deepEqual(viewModel.sorted.map(work => work.id), ['1', '2']);
  assert.equal(viewModel.showStatusBadge, false);
  assert.equal(viewModel.nonLostCount, 2);
});

// --- Library filtering: sorting ---

test('sortWorksForSidebar recently-updated orders by updatedAt descending', () => {
  const works = [
    { id: 'old', updatedAt: 1000, addedAt: 3000 },
    { id: 'new', updatedAt: 9000, addedAt: 1000 }
  ];
  const { items } = core.sortWorksForSidebar(works, 'recently-updated', []);
  assert.equal(items[0].id, 'new');
  assert.equal(items[1].id, 'old');
});

test('sortWorksForSidebar recently-updated falls back to addedAt when updatedAt matches', () => {
  const works = [
    { id: 'a', updatedAt: null, addedAt: 500 },
    { id: 'b', updatedAt: null, addedAt: 1500 }
  ];
  const { items } = core.sortWorksForSidebar(works, 'recently-updated', []);
  assert.equal(items[0].id, 'b');
});

test('sortWorksForSidebar most-popular ranks higher engagement first', () => {
  const works = [
    { id: 'popular', kudosCount: 10000, bookmarksCount: 2000, hitsCount: 50000, addedAt: 1 },
    { id: 'obscure', kudosCount: 5, bookmarksCount: 1, hitsCount: 50, addedAt: 2 }
  ];
  const { items } = core.sortWorksForSidebar(works, 'most-popular', []);
  assert.equal(items[0].id, 'popular');
});

test('sortWorksForSidebar longest-unread puts unread works first by word count desc', () => {
  const works = [
    { id: 'completed-long', status: 'completed', wordCount: 500000, addedAt: 1 },
    { id: 'progress-long', status: 'progress', wordCount: 200000, addedAt: 2 },
    { id: 'want-short', status: 'want', wordCount: 1000, addedAt: 3 }
  ];
  const { items } = core.sortWorksForSidebar(works, 'longest-unread', []);
  assert.equal(items[0].id, 'progress-long', 'longest unread should come first');
  assert.equal(items[1].id, 'want-short');
  assert.equal(items[2].id, 'completed-long', 'completed work goes to the end');
});

test('sortWorksForSidebar shortest-unread puts unread works first by word count asc', () => {
  const works = [
    { id: 'progress-long', status: 'progress', wordCount: 200000, addedAt: 1 },
    { id: 'want-short', status: 'want', wordCount: 1000, addedAt: 2 },
    { id: 'completed', status: 'completed', wordCount: 500, addedAt: 3 }
  ];
  const { items } = core.sortWorksForSidebar(works, 'shortest-unread', []);
  assert.equal(items[0].id, 'want-short', 'shortest unread should come first');
  assert.equal(items[1].id, 'progress-long');
  assert.equal(items[2].id, 'completed', 'completed work goes to the end');
});

test('sortWorksForSidebar oldest-for-later puts want works first by oldest addedAt', () => {
  const works = [
    { id: 'want-new', status: 'want', addedAt: 9000 },
    { id: 'want-old', status: 'want', addedAt: 1000 },
    { id: 'progress', status: 'progress', addedAt: 5000 }
  ];
  const { items } = core.sortWorksForSidebar(works, 'oldest-for-later', []);
  assert.equal(items[0].id, 'want-old');
  assert.equal(items[1].id, 'want-new');
  assert.equal(items[2].id, 'progress');
});

// --- Library filtering: search ---

test('computeSidebarViewModel search matches author name', () => {
  const works = [
    { id: '1', title: 'Fic One', author: 'Seraphina Voss', fandoms: [], relationship: '', notes: '', status: 'want', customCats: [], addedAt: 1 },
    { id: '2', title: 'Fic Two', author: 'Anonymous', fandoms: [], relationship: '', notes: '', status: 'want', customCats: [], addedAt: 2 }
  ];
  const vm = core.computeSidebarViewModel({
    works, activeTab: 'all', searchQuery: 'seraphina', sortKey: 'recently-added', randomOrder: []
  });
  assert.deepEqual(vm.sorted.map(w => w.id), ['1']);
});

test('computeSidebarViewModel search matches fandom name', () => {
  const works = [
    { id: '1', title: 'One', author: 'A', fandoms: ['Good Omens'], relationship: '', notes: '', status: 'want', customCats: [], addedAt: 1 },
    { id: '2', title: 'Two', author: 'B', fandoms: ['Sherlock Holmes'], relationship: '', notes: '', status: 'want', customCats: [], addedAt: 2 }
  ];
  const vm = core.computeSidebarViewModel({
    works, activeTab: 'all', searchQuery: 'sherlock', sortKey: 'recently-added', randomOrder: []
  });
  assert.deepEqual(vm.sorted.map(w => w.id), ['2']);
});

test('computeSidebarViewModel search with no matches returns empty with correct message', () => {
  const works = [
    { id: '1', title: 'Something', author: 'A', fandoms: [], relationship: '', notes: '', status: 'want', customCats: [], addedAt: 1 }
  ];
  const vm = core.computeSidebarViewModel({
    works, activeTab: 'all', searchQuery: 'zzznomatchzzz', sortKey: 'recently-added', randomOrder: []
  });
  assert.equal(vm.sorted.length, 0);
  assert.equal(vm.emptyMessage, 'No results found.');
});

test('computeSidebarViewModel empty library returns no works', () => {
  const vm = core.computeSidebarViewModel({
    works: [], activeTab: 'all', searchQuery: '', sortKey: 'recently-added', randomOrder: []
  });
  assert.equal(vm.sorted.length, 0);
  assert.equal(vm.all.length, 0);
});

// --- buildSidebarSortIndicatorText ---

test('buildSidebarSortIndicatorText and formatWorkWordCountDisplay provide display copy', () => {
  assert.equal(
    core.buildSidebarSortIndicatorText(true, 'most-popular'),
    'Sorted by: Most Popular. Sorting can be changed in the popup.'
  );
  assert.equal(core.buildSidebarSortIndicatorText(false, 'most-popular'), '');
  assert.equal(core.formatWorkWordCountDisplay(12345), '12,345 words');
  assert.equal(core.formatWorkWordCountDisplay(0), '—');
  assert.equal(core.formatWorkWordCountDisplay(null), '—');
});
