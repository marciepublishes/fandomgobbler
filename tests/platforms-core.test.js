const test = require('node:test');
const assert = require('node:assert/strict');

const core = require('../modules/platforms/core.js');

const ALL_CAPABILITIES = [
  'bookmarkImport', 'markedForLaterImport', 'subscriptions', 'authorWatch',
  'relationshipTools', 'relationshipFilter', 'relationshipInsights',
  'subscriptionFilter', 'ao3EngagementSorts'
];

const BETA_PLATFORMS = ['ffnet', 'wattpad', 'tumblr'];

// --- normalizePlatformId ---

test('normalizePlatformId falls back to ao3 for unknown values', () => {
  assert.equal(core.normalizePlatformId('ffnet'), 'ffnet');
  assert.equal(core.normalizePlatformId('unknown-site'), 'ao3');
});

test('normalizePlatformId falls back to ao3 for empty, null, and undefined', () => {
  assert.equal(core.normalizePlatformId(''), 'ao3');
  assert.equal(core.normalizePlatformId(null), 'ao3');
  assert.equal(core.normalizePlatformId(undefined), 'ao3');
});

test('normalizePlatformId accepts all four known platforms', () => {
  for (const id of core.PLATFORM_ORDER) {
    assert.equal(core.normalizePlatformId(id), id);
  }
});

// --- Dashboard platform switching: storage keys change with platform ---

test('storage keys are distinct for each platform', () => {
  const worksKeys = core.PLATFORM_ORDER.map(p => core.getWorksStorageKey(p));
  const catsKeys = core.PLATFORM_ORDER.map(p => core.getCustomCatsStorageKey(p));
  assert.equal(new Set(worksKeys).size, worksKeys.length, 'each platform must use a unique works key');
  assert.equal(new Set(catsKeys).size, catsKeys.length, 'each platform must use a unique custom-cats key');
});

test('getWorksStorageKey changes correctly when platform switches', () => {
  assert.equal(core.getWorksStorageKey('ao3'), 'ao3works');
  assert.equal(core.getWorksStorageKey('ffnet'), 'fandomgobbler_ffnet_works');
  assert.equal(core.getWorksStorageKey('wattpad'), 'fandomgobbler_wattpad_works');
  assert.equal(core.getWorksStorageKey('tumblr'), 'fandomgobbler_tumblr_works');
});

test('unknown platform falls back to ao3 storage key', () => {
  assert.equal(core.getWorksStorageKey('myspace'), core.getWorksStorageKey('ao3'));
});

// --- Capability gating: AO3 has everything ---

test('AO3 has all capabilities enabled', () => {
  for (const cap of ALL_CAPABILITIES) {
    assert.equal(core.hasCapability('ao3', cap), true, `AO3 should have ${cap}`);
  }
});

// --- Capability gating: beta platforms have all AO3-specific caps disabled ---

for (const platform of BETA_PLATFORMS) {
  test(`${platform} has all AO3-specific capabilities disabled`, () => {
    for (const cap of ALL_CAPABILITIES) {
      assert.equal(core.hasCapability(platform, cap), false, `${platform} should NOT have ${cap}`);
    }
  });
}

test('unknown capability returns false for any platform', () => {
  assert.equal(core.hasCapability('ao3', 'nonExistentFeature'), false);
  assert.equal(core.hasCapability('ffnet', 'nonExistentFeature'), false);
});

// --- Beta status and notes ---

test('AO3 is not a beta platform', () => {
  assert.equal(core.getPlatformConfig('ao3').beta, false);
  assert.equal(core.getBetaNote('ao3'), '');
});

test('beta platforms have non-empty beta notes', () => {
  for (const p of BETA_PLATFORMS) {
    const note = core.getBetaNote(p);
    assert.equal(typeof note, 'string');
    assert.ok(note.length > 0, `${p} should have a beta note`);
  }
});

// --- Labels ---

test('edition labels and menu labels are platform-aware', () => {
  assert.equal(core.getEditionLabel('ffnet'), 'FanFiction.net Edition');
  assert.equal(core.getMenuLabel('wattpad'), 'Wattpad (beta)');
  assert.equal(core.getMenuLabel('tumblr'), 'Tumblr (beta)');
  assert.equal(core.getMenuLabel('ao3'), 'AO3 Edition');
});
