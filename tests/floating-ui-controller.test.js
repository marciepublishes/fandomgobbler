const test = require('node:test');
const assert = require('node:assert/strict');

const controller = require('../modules/floating-ui/controller.js');

function makeClassList() {
  const classes = new Set();
  return {
    add(name) {
      classes.add(name);
    },
    remove(...names) {
      names.forEach(name => classes.delete(name));
    },
    contains(name) {
      return classes.has(name);
    },
    toggle(name, force) {
      if (force) classes.add(name);
      else classes.delete(name);
    }
  };
}

function makeFab() {
  return {
    offsetWidth: 48,
    offsetHeight: 48,
    style: {},
    classList: makeClassList(),
    title: ''
  };
}

test('floating button can tuck into the left edge with a visible tab', () => {
  controller.init({
    window: { innerWidth: 300, innerHeight: 500 },
    document: {}
  });
  const fab = makeFab();

  const pos = controller.applyFabPosition(fab, { left: 0, top: 100, peekEdge: 'left' });

  assert.deepEqual(pos, { left: -26, top: 100, peekEdge: 'left' });
  assert.equal(fab.style.left, '-26px');
  assert.equal(fab.style.top, '100px');
  assert.equal(fab.classList.contains('aot-peek-left'), true);
  assert.equal(fab.classList.contains('aot-peek-right'), false);
  assert.match(fab.title, /tucked away/);
});

test('floating button can tuck into the right edge with a visible tab', () => {
  controller.init({
    window: { innerWidth: 300, innerHeight: 500 },
    document: {}
  });
  const fab = makeFab();

  const pos = controller.applyFabPosition(fab, { left: 252, top: 100, peekEdge: 'right' });

  assert.deepEqual(pos, { left: 278, top: 100, peekEdge: 'right' });
  assert.equal(fab.style.left, '278px');
  assert.equal(fab.classList.contains('aot-peek-left'), false);
  assert.equal(fab.classList.contains('aot-peek-right'), true);
});

test('floating button reset clears tucked state', () => {
  const fab = makeFab();
  fab.classList.add('aot-peek-left');
  fab.classList.add('aot-peek-right');

  controller.resetFabPosition(fab);

  assert.equal(fab.style.left, '');
  assert.equal(fab.style.top, '');
  assert.equal(fab.style.right, '28px');
  assert.equal(fab.style.bottom, '28px');
  assert.equal(fab.classList.contains('aot-peek-left'), false);
  assert.equal(fab.classList.contains('aot-peek-right'), false);
  assert.match(fab.title, /FandomGobbler/);
});

test('floating button click restore pulls tucked button back onscreen', () => {
  controller.init({
    window: { innerWidth: 300, innerHeight: 500 },
    document: {}
  });
  const fab = makeFab();
  controller.applyFabPosition(fab, { left: 0, top: 100, peekEdge: 'right' });

  const pos = controller.restoreFabFromPeek(fab);

  assert.deepEqual(pos, { left: 224, top: 100 });
  assert.equal(fab.style.left, '224px');
  assert.equal(fab.classList.contains('aot-peek-left'), false);
  assert.equal(fab.classList.contains('aot-peek-right'), false);
  assert.match(fab.title, /FandomGobbler/);
});
