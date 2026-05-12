const test = require('node:test');
const assert = require('node:assert/strict');

// Mock chrome API before requiring the module
let _store = {};
let _simulateError = false;

globalThis.chrome = {
  storage: {
    local: {
      get(key, cb) {
        if (Array.isArray(key)) {
          const result = {};
          key.forEach(k => { if (Object.prototype.hasOwnProperty.call(_store, k)) result[k] = _store[k]; });
          cb(result);
        } else {
          cb(Object.prototype.hasOwnProperty.call(_store, key) ? { [key]: _store[key] } : {});
        }
      },
      set(obj, cb) {
        if (!_simulateError) Object.assign(_store, obj);
        if (cb) cb();
      },
      remove(key, cb) {
        delete _store[key];
        if (cb) cb();
      }
    }
  },
  runtime: {
    get lastError() { return _simulateError ? { message: 'Quota exceeded' } : null; }
  }
};

const adapter = require('../modules/storage-adapter/index.js');

function reset() { _store = {}; _simulateError = false; }

test('get returns stored value', async () => {
  reset();
  _store['my_key'] = { some: 'data' };
  const val = await adapter.get('my_key');
  assert.deepEqual(val, { some: 'data' });
});

test('get returns null when key not present', async () => {
  reset();
  const val = await adapter.get('missing_key');
  assert.equal(val, null);
});

test('set stores a value and returns true', async () => {
  reset();
  const ok = await adapter.set('saved_key', 42);
  assert.equal(ok, true);
  assert.equal(_store['saved_key'], 42);
});

test('set returns false when chrome.runtime.lastError is set', async () => {
  reset();
  _simulateError = true;
  const ok = await adapter.set('bad_key', 'value');
  assert.equal(ok, false);
});

test('remove deletes a key and resolves', async () => {
  reset();
  _store['to_remove'] = 'here';
  await adapter.remove('to_remove');
  assert.equal(Object.prototype.hasOwnProperty.call(_store, 'to_remove'), false);
});

test('set followed by get round-trips correctly', async () => {
  reset();
  const data = { platform: 'ffnet', count: 7 };
  await adapter.set('round_trip', data);
  const retrieved = await adapter.get('round_trip');
  assert.deepEqual(retrieved, data);
});

test('get after remove returns null', async () => {
  reset();
  _store['ephemeral'] = true;
  await adapter.remove('ephemeral');
  const val = await adapter.get('ephemeral');
  assert.equal(val, null);
});

test('getMany returns all present keys and omits missing ones', async () => {
  reset();
  _store['a'] = 1;
  _store['b'] = 2;
  const data = await adapter.getMany(['a', 'b', 'c']);
  assert.equal(data.a, 1);
  assert.equal(data.b, 2);
  assert.equal(Object.prototype.hasOwnProperty.call(data, 'c'), false);
});

test('getMany returns empty object when no keys match', async () => {
  reset();
  const data = await adapter.getMany(['x', 'y']);
  assert.deepEqual(data, {});
});
