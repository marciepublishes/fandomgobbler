# Adding a Platform

This guide explains the steps needed to add a new site edition to FandomGobbler. Use the FF.net beta as the reference implementation.

## Overview

Each platform has:

- a config entry in `modules/platforms/core.js`
- a storage key pair (works + custom categories)
- a capability map declaring which AO3-specific features apply
- a content script entry point (`{platform}-content.js`)
- a manifest block declaring host permissions and script load order
- optional: a platform-specific parsing core (`modules/{platform}/core.js`) and controller (`modules/{platform}/controller.js`)

## Step 1 — Register the platform

Open [`modules/platforms/core.js`](../modules/platforms/core.js) and add an entry to `PLATFORMS`:

```js
mysite: {
  id: 'mysite',
  editionLabel: 'MySite Edition',
  menuLabel: 'MySite (beta)',
  worksStorageKey: 'fandomgobbler_mysite_works',
  customCatsStorageKey: 'fandomgobbler_mysite_customcats',
  beta: true,
  betaNote: 'MySite Edition is in beta. AO3-specific workflows are hidden while MySite-compatible support is being built.',
  capabilities: {
    bookmarkImport: false,
    markedForLaterImport: false,
    subscriptions: false,
    authorWatch: false,
    relationshipTools: false,
    relationshipFilter: false,
    relationshipInsights: false,
    subscriptionFilter: false,
    ao3EngagementSorts: false
  }
}
```

Also add `'mysite'` to `PLATFORM_ORDER` so the dashboard switcher picks it up in the right position.

Set any capability to `true` only when the corresponding workflow is actually implemented. The capability map is the single source of truth used by the popup, dashboard, and sidebar to show or hide features. Getting it wrong causes features to appear that do not work.

## Step 2 — Add a content script entry point

Create `mysite-content.js` at the root. The pattern mirrors `ffnet-content.js`:

```js
(function () {
  'use strict';

  const _checks = [
    ['AO3TrackerStorageKeys', []],
    ['AO3TrackerMySiteCore', []],
    ['AO3TrackerMySiteController', ['init', 'start']],
    ['AO3TrackerPlatformsCore', ['getWorksStorageKey', 'getCustomCatsStorageKey']],
    ['AO3TrackerTrackedWorkCore', ['normalizeStatusValue', 'sanitizeTrackedWorksMap']],
  ];
  const _missing = [];
  for (const [name, methods] of _checks) {
    const mod = globalThis[name];
    if (!mod) { _missing.push(name); continue; }
    for (const m of methods) {
      if (typeof mod[m] !== 'function') _missing.push(`${name}.${m}`);
    }
  }
  if (_missing.length) {
    console.error(`[AO3 Tracker] mysite-content.js: missing dependencies — ${_missing.join(', ')}`);
    return;
  }

  AO3TrackerMySiteController.init();
  AO3TrackerMySiteController.start();
})();
```

If there is no platform-specific controller yet, the entry point can be a no-op stub that just runs the dependency check.

## Step 3 — Add platform modules

Parsing and controller logic for the new site lives under `modules/mysite/`:

- `modules/mysite/core.js` — page parsing, work ID extraction, listing blurb parsing. Export as `global.AO3TrackerMySiteCore`.
- `modules/mysite/controller.js` — content script orchestration (`init`, `start`). Export as `global.AO3TrackerMySiteController`.

Both files should use the dual-mode IIFE pattern so they can be tested in Node:

```js
(function (global) {
  'use strict';

  // ... implementation ...

  global.AO3TrackerMySiteCore = core;
  if (typeof module !== 'undefined' && module.exports) module.exports = core;
})(typeof globalThis !== 'undefined' ? globalThis : this);
```

## Step 4 — Register in manifest.json

Add a content script block and host permission for the new site:

```json
"host_permissions": [
  "https://archiveofourown.org/*",
  "https://www.fanfiction.net/*",
  "https://www.mysite.com/*"
],
"content_scripts": [
  {
    "matches": ["https://www.mysite.com/*"],
    "js": [
      "modules/storage-keys/index.js",
      "modules/utils/index.js",
      "modules/toast/index.js",
      "modules/platforms/core.js",
      "modules/tracked-works/core.js",
      "modules/mysite/core.js",
      "modules/mysite/controller.js",
      "mysite-content.js"
    ],
    "css": ["content.css"],
    "run_at": "document_end"
  }
]
```

Load order matters: shared modules first, platform core second, platform controller third, entry point last.

Only include the shared modules the platform actually needs. For example, if the platform does not use the AO3 sidebar or page-theme system, do not include those modules.

## Step 5 — Update popup.html load order

`popup.html` loads `modules/platforms/core.js` once and it covers all platforms. No popup script changes are needed just to register a new platform — the popup reads the config from `PlatformsCore` at runtime.

If the platform needs popup-side UI changes (for example, a new capability gate or a platform-specific section), add a module under `modules/popup/` and load it in `popup.html` before `popup.js`.

## Step 6 — Update popup.js dependency validation

`validatePopupDeps()` in `popup.js` checks required modules at startup. If the new platform adds a popup module, add its expected exports to that function's `checks` array.

Similarly, `validateDashboardDeps()` in `dashboard.js` and `validateModules()` in `content.js` should be updated if the platform introduces required shared modules.

## Step 7 — Add tests

Add a test file at `tests/mysite-core.test.js` covering:

- work ID extraction from a sample URL or page fragment
- listing blurb parsing — normal, malformed, missing fields
- any normalisation or sanitization the core does

If the controller exposes testable functions, add a smoke test at `tests/mysite-controller.test.js` following the pattern in `tests/current-work-popup-controller.test.js`.

Run the full suite to confirm nothing regressed:

```
node --test tests/*.js
```

## Step 8 — Update platform feature matrix

Update the table in `README.md` to reflect what the new platform supports. Update `help.html` to add an article for the new edition under the Site Editions section.

## Capability reference

| Capability key | What it gates |
|---|---|
| `bookmarkImport` | Bookmark import section in popup and dashboard |
| `markedForLaterImport` | Marked for Later import section |
| `subscriptions` | Subscription refresh tool and subscription column |
| `authorWatch` | Author Watch section in popup and dashboard |
| `relationshipTools` | Relationship editing and grouping controls |
| `relationshipFilter` | Relationship filter panel in dashboard |
| `relationshipInsights` | Relationship charts in dashboard |
| `subscriptionFilter` | Subscription state filter in dashboard |
| `ao3EngagementSorts` | Most Popular, Most Kudos, Most Bookmarks, Most Hits sort options |

All capability checks go through `PlatformsCore.hasCapability(platformId, capabilityName)`. Never hardcode platform IDs in UI code — use the capability map instead.
