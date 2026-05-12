# Refactor Playbook

## Purpose

Use this playbook when extracting code from `content.js`, `popup.js`, or a large controller module.

The goal is to make changes safer without changing user-visible behavior unless the task explicitly asks for it.

## Default Refactor Path

1. Identify the behavior boundary.
2. Extract pure logic first.
3. Add tests around the extracted logic.
4. Extract runtime orchestration only after the pure logic is stable.
5. Wire the new module through ordered script loading.
6. Keep the old entrypoint as a thin coordinator.
7. Run syntax checks and relevant tests.

## Choose The Right Module Type

Use `core.js` when the code is:

- parsing AO3 HTML
- normalizing stored data
- filtering or sorting data
- mapping one data shape into another
- producing view models
- validating user data
- independent of `document`, `window`, and `chrome`

Use `controller.js` when the code:

- reads or writes DOM
- calls `chrome.storage`
- coordinates multiple helpers
- attaches event listeners
- controls modal, sidebar, or page lifecycle
- needs injected dependencies from `content.js`

Use `popup-controller.js` when the code:

- only runs in the popup
- needs popup DOM ids/classes
- works with popup-local state
- receives a context object from `popup.js`

## Module Pattern

Most modules follow this shape:

```js
(function (global) {
  'use strict';

  function usefulHelper() {
    // ...
  }

  const api = { usefulHelper };

  global.AO3TrackerFeatureCore = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
```

Controller modules usually expose `init(deps)` plus public methods.

Prefer explicit dependency injection over reaching into entrypoint locals. If a controller needs `document`, `window`, storage helpers, rendering callbacks, or state accessors, pass them through `init(deps)` or a popup context object.

## Naming Rules

Browser global names are public contracts.

Use:

- `AO3TrackerFeatureCore`
- `AO3TrackerFeatureController`
- `AO3TrackerFeaturePopupController`

Examples:

- `AO3TrackerTrackedWorkCore`
- `AO3TrackerSidebarController`
- `AO3TrackerBookmarkImportPopupController`

Keep file paths aligned with global names where practical.

## Script Loading

This project does not use ES module imports or a bundler. Runtime order is controlled by:

- `manifest.json` for content scripts
- `popup.html` for popup scripts

When adding a new content module:

1. Put dependencies before dependents in `manifest.json`.
2. Put shared keys/utilities before feature modules.
3. Put cores before controllers.
4. Keep `content.js` last.

When adding a new popup module:

1. Add the script before `popup.js`.
2. Put cores before popup controllers.
3. Keep `popup.js` last.

If a module is needed in both runtimes, it must be loaded in both places.

## Dependency Validation

Use the existing dependency validation helper when a controller has required dependencies.

Validate:

- `window`
- `document`
- state accessors
- storage helpers
- rendering callbacks
- required pure helpers

Do not silently no-op required dependencies unless the old runtime behavior already depended on that fallback. Loud failure is better for new modules.

## Extracting From `content.js`

Good extraction candidates:

- AO3 page parsing
- current-work UI orchestration
- listing/search badges
- sidebar view models
- modal controllers
- chapter progress
- theme/page controls

Keep in `content.js`:

- startup lifecycle
- cross-feature coordination
- small compatibility wrappers
- shared state that spans multiple content modules

After extraction, `content.js` should read more like a wiring file than a feature implementation.

## Extracting From `popup.js`

Good extraction candidates:

- popup library rendering
- status mutation workflows
- custom category management
- import/export flows
- subscription refresh
- author watch controls
- bookmark import review
- notes modal behavior

Keep in `popup.js` for now:

- popup startup
- shared popup state
- context factories
- cross-feature render coordination
- current-page detection until it has a cleaner owner

When moving popup behavior, pass state through context methods such as `getWorksMap`, `saveWorks`, and `renderAll` rather than importing popup variables.

## Preserving Behavior

During architecture refactors:

- avoid copy changes unless needed
- avoid CSS changes unless needed
- preserve DOM ids consumed by code
- preserve storage keys and field meanings
- preserve event timing where user-visible
- preserve fallback behavior until tests cover the new path

If a refactor must change behavior, call it out as a feature change and test it that way.

## Testing Expectations

For pure logic extraction:

- add a focused `node:test` file under `tests/`
- require the module through `module.exports`
- cover malformed inputs and normal cases

For controller extraction:

- add a smoke test that verifies exported entrypoints
- test no-op behavior when required DOM anchors are missing
- test one meaningful interaction if it can be done without a browser

For storage changes:

- test sanitizer behavior
- test legacy/malformed shapes
- update `docs/dev/storage-schema.md`

## Refactor Checklist

Before calling a refactor done:

- new module is loaded in the correct runtime
- `content.js` or `popup.js` no longer duplicates moved logic
- globals use the `AO3Tracker...` convention
- tests cover extracted pure logic
- syntax checks pass
- docs are updated if ownership, storage, or UI placement changed
- manual smoke path is clear for sidebar or popup behavior
