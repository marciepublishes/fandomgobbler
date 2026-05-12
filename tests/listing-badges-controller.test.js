const test = require('node:test');
const assert = require('node:assert/strict');

require('../modules/listing-badges/core.js');
const controller = require('../modules/listing-badges/controller.js');

test('listing badge controller exports injectSearchBadges', () => {
  assert.equal(typeof controller.injectSearchBadges, 'function');
});

test('listing badge controller no-ops on work pages', () => {
  let getWorksCalled = false;
  controller.injectSearchBadges({
    window: { location: { href: 'https://archiveofourown.org/works/123' } },
    document: {
      querySelectorAll() {
        throw new Error('should not query listing blurbs on a work page');
      }
    },
    getWorks() {
      getWorksCalled = true;
    }
  });
  assert.equal(getWorksCalled, false);
});

test('listing badge controller applies hidden rules on AO3 works listing query pages', () => {
  assert.equal(
    controller.shouldApplyHiddenRulesOnPage(
      'https://archiveofourown.org/works?commit=Sort+and+Filter&tag_id=Harry+Potter*s*Tom+Riddle+%7C+Voldemort'
    ),
    true
  );
});

test('listing badge controller applies hidden rules on AO3 author and pseud profile pages', () => {
  assert.equal(
    controller.shouldApplyHiddenRulesOnPage('https://archiveofourown.org/users/AGlassRoseNeverFades/'),
    true
  );
  assert.equal(
    controller.shouldApplyHiddenRulesOnPage('https://archiveofourown.org/users/AGlassRoseNeverFades/pseuds/AGlassRoseNeverFades'),
    true
  );
});

test('listing badge controller does not count hide menu as the track button', () => {
  const selectors = [];
  const blurb = {
    querySelector(selector) {
      selectors.push(selector);
      if (selector === '.ao3t-track-wrap:not(.fg-hide-menu-wrap)') return null;
      throw new Error(`unexpected selector: ${selector}`);
    }
  };

  assert.equal(controller.hasListingTrackControl(blurb), false);
  assert.deepEqual(selectors, ['.ao3t-track-wrap:not(.fg-hide-menu-wrap)']);
});
