const test = require('node:test');
const assert = require('node:assert/strict');

const card = require('../modules/sidebar/card.js');

test('visibleCustomCatsForSidebarCard hides listing-hidden category chips outside their own tab', () => {
  const cats = {
    hidden: { id: 'hidden', name: 'Secret Shelf', color: '#123456', hideOnListings: true },
    visible: { id: 'visible', name: 'Public Shelf', color: '#abcdef', hideOnListings: false }
  };
  const work = { id: 'w1', customCats: ['hidden', 'visible'] };

  assert.deepEqual(
    card.visibleCustomCatsForSidebarCard(work, cats, 'all').map(cat => cat.id),
    ['visible']
  );
  assert.deepEqual(
    card.visibleCustomCatsForSidebarCard(work, cats, 'progress').map(cat => cat.id),
    ['visible']
  );
  assert.deepEqual(
    card.visibleCustomCatsForSidebarCard(work, cats, 'other-custom-cat').map(cat => cat.id),
    ['visible']
  );
});

test('visibleCustomCatsForSidebarCard shows listing-hidden category chip inside its own tab', () => {
  const cats = {
    hidden: { id: 'hidden', name: 'Secret Shelf', color: '#123456', hideOnListings: true },
    visible: { id: 'visible', name: 'Public Shelf', color: '#abcdef', hideOnListings: false }
  };
  const work = { id: 'w1', customCats: ['hidden', 'visible'] };

  assert.deepEqual(
    card.visibleCustomCatsForSidebarCard(work, cats, 'hidden').map(cat => cat.id),
    ['hidden', 'visible']
  );
});
