const test = require('node:test');
const assert = require('node:assert/strict');

const controller = require('../modules/work-page/controller.js');

test('work page controller exports expected entrypoints', () => {
  assert.equal(typeof controller.initCurrentBar, 'function');
  assert.equal(typeof controller.refreshWorkPageMetaRow, 'function');
  assert.equal(typeof controller.injectWorkPageMetaRow, 'function');
});

test('work page controller no-ops when current bar is missing', () => {
  controller.initCurrentBar({
    document: {
      getElementById() {
        return null;
      }
    },
    extractWorkInfo() {
      return null;
    }
  });
});
