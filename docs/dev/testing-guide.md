# Testing Guide

## Purpose

This project uses lightweight Node-based regression tests plus syntax checks. The goal is to protect extracted domain logic and catch obvious runtime breakage without requiring a full browser automation setup.

Use this guide when adding tests or deciding how much verification a change needs.

The current tests are plain Node tests. There is no committed `node_modules/` folder, and no dependency install is required for the existing test suite.

## Test Commands

Run all Node tests:

```powershell
node --test .\tests\*.js
```

Check the main runtime scripts parse:

```powershell
node --check content.js
node --check popup.js
```

Check a module parses:

```powershell
node --check modules\feature\file.js
```

## Current Test Shape

Tests live in `tests/` and use:

- `node:test`
- `node:assert/strict`
- CommonJS `require`

Existing coverage includes:

- AO3 page parsing
- author watch core logic
- author watch popup controller smoke coverage
- bookmark import core logic
- bookmark import popup controller behavior
- listing badge core and controller smoke coverage
- mojibake regression checks
- platform capability gating and storage key switching (platforms-core)
- popup storage adapter (get/set/remove, error handling, round-trip)
- current-work popup controller smoke coverage
- sidebar core: all sort keys, search (author, fandom, no-match), empty library
- sidebar controller smoke coverage
- tracked work core logic
- work-page controller smoke coverage

## Module Export Pattern

Testable modules should expose browser globals and CommonJS exports.

```js
global.AO3TrackerFeatureCore = core;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = core;
}
```

This lets the same code run in the extension and in Node tests.

## What To Test

### Pure Core Modules

Test pure modules thoroughly. Good targets:

- parsing
- normalization
- sanitization
- filtering
- sorting
- view-model building
- mapping imported data into tracked works
- malformed input handling

Pure logic tests should cover:

- ordinary input
- empty input
- malformed input
- duplicate data
- legacy shape if applicable
- edge cases that previously broke

### Controllers

Controller tests can be smaller. Good targets:

- module exports expected entrypoints
- render functions no-op safely when DOM anchors are missing
- setup functions tolerate minimal dependencies when designed to do so
- one key interaction if it can be tested with a small fake DOM object

Do not overbuild fake browser environments in unit tests. If a controller needs a real browser to verify, document a manual smoke check in the release checklist.

### Storage Changes

Storage-related tests should verify:

- missing buckets default safely
- malformed data is pruned or normalized
- valid legacy data remains valid
- new optional fields are preserved
- invalid statuses are rejected
- category-only works remain valid

Update `docs/dev/storage-schema.md` whenever storage shape changes.

### UI Copy And Encoding

The mojibake regression test protects user-facing files from common encoding damage.

When adding visible copy:

- keep files UTF-8
- prefer ASCII unless the file already uses intentional non-ASCII
- run the mojibake test with the full suite

## Test Naming

Use descriptive names:

```js
test('sanitizeTrackedWorksMap normalizes fields and drops invalid works', () => {
  // ...
});
```

Prefer behavior-focused names over implementation names.

## Test File Placement

Put tests next to the feature name:

- `tracked-work-core.test.js`
- `bookmark-import-core.test.js`
- `bookmark-import-popup-controller.test.js`
- `sidebar-core.test.js`
- `sidebar-controller.test.js`

Use `core` in the test name for pure domain modules. Use `controller` or `popup-controller` for runtime orchestration smoke tests.

## When Syntax Checks Are Enough

Syntax checks may be enough for:

- documentation-only changes
- comment-only changes
- tiny copy-only HTML/CSS changes
- edits to code paths already covered by focused tests where behavior did not change

Still run `node --check` for touched JavaScript entrypoints or modules.

## When To Add Tests

Add tests when:

- extracting logic from `content.js` or `popup.js`
- changing parsing logic
- changing storage sanitization
- changing sort/filter behavior
- changing import/export mapping
- fixing a bug
- adding feature logic that can be tested without a browser

## Manual Smoke Checks

Some behavior is browser-extension-specific and should be checked manually before release:

- load unpacked extension
- open AO3 work page
- add/move/remove current work
- open/close sidebar
- search/filter/sort sidebar
- edit notes and rating
- create/edit/delete custom category
- export/import backup
- open popup on an AO3 work page
- check default, dark, and Solarized Light themes

Manual smoke checks belong in `docs/release-checklist.md`.

## Test Checklist For A Change

Before finishing:

- run relevant focused tests
- run `node --test tests` for broad changes
- run `node --check` on touched JavaScript files
- update or add tests for new pure logic
- update docs when storage, architecture, or UI placement changes
- record any tests that could not be run
