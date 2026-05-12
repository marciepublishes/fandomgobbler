# Feature Placement Guide

## Purpose

Use this guide when deciding where a new feature belongs.

This document complements:

- `docs/dev/architecture.md` for runtime/module ownership
- `docs/dev/ui-style-guide.md` for shared UI rules
- `docs/dev/sidebar-ui.md` for sidebar behavior
- `docs/dev/popup-ui.md` for popup behavior
- `docs/dev/dashboard-ui.md` for full-tab dashboard behavior
- `docs/dev/storage-schema.md` for stored data shapes

## Quick Rule

Put the feature where the user naturally needs it.

- While reading or browsing AO3: sidebar or AO3 inline UI.
- While managing the whole library: popup.
- While reviewing, visualizing, or batch-managing the whole library in a roomy view: dashboard.
- While changing data rules: shared core.
- While wiring DOM/storage behavior: runtime controller.
- While coordinating multiple features: entrypoint.

## Placement Matrix

| Need | Best home |
| --- | --- |
| Act on the currently open AO3 work | current work bar, work-page controller, or track button |
| Browse tracked works while on AO3 | sidebar |
| Search/filter/move a tracked work in-page | sidebar |
| Edit notes or rating for one work | sidebar or popup modal |
| Manage custom categories | popup, with sidebar quick assignment |
| Change extension settings | popup |
| Run import/export | popup or existing sidebar export menu for quick access |
| Run batch refresh or account-level checks | popup |
| Review stats, charts, and paginated library-wide worklists | dashboard |
| Run library-wide bulk actions with visual context | dashboard |
| Parse AO3 work/listing/bookmark HTML | shared core |
| Normalize or sanitize stored data | shared core |
| Sort/filter/build view models | shared core |
| Inject AO3 page UI | content controller |
| Render popup-specific workflow | popup controller |
| Coordinate startup and cross-feature events | `content.js` or `popup.js` |

## Sidebar Or Popup

Choose the sidebar when:

- the user benefits while actively reading AO3
- the action is about the current work
- the action is a quick status/category/note update
- the feature needs to coexist with the AO3 page
- the result should be visible immediately in the in-page library

Choose the popup when:

- the feature is library-wide
- the feature is a setting
- the feature requires a larger review flow
- the feature edits many works at once
- the feature handles import/export
- the feature runs account-level fetches
- the feature summarizes the library
- the feature is better done away from the reading page

If both apply, put the quick action in the sidebar and the management workflow in the popup.

Choose the dashboard when:

- the feature benefits from a full tab
- the feature combines tools, the library list, and visual summaries
- the user needs pagination, charts, or bulk selection to keep the workflow manageable
- the feature should reuse popup workflows but needs more room than the popup

If both popup and dashboard apply, keep compact controls in the popup and put the fuller review/batch version in the dashboard.

## Current Work Bar Or Card

Use the current work bar for:

- adding the current AO3 work
- moving the current AO3 work status
- showing compact current-work state
- removing the current work from tracking

Use a work card for:

- browsing saved metadata
- seeing status/category chips
- opening the work
- editing notes/rating
- moving a saved work from the library list
- adding/removing categories from a saved work

Use a modal for:

- editing fields
- choosing colors
- confirming risky changes
- reviewing multi-step data before applying it

## Inline AO3 UI Or Sidebar

Use inline AO3 UI when:

- the control belongs near AO3's own work metadata
- the user should act without opening the sidebar
- the UI is tiny and directly related to the current page

Use the sidebar when:

- the feature needs more than one control
- the feature references the tracked library
- the feature should stay available while browsing multiple works
- the UI would clutter AO3's native page

## Core Or Controller

Use a core module when the logic can run without browser globals.

Examples:

- `modules/tracked-works/core.js`
- `modules/ao3-page/core.js`
- `modules/bookmark-import/core.js`
- `modules/sidebar/core.js`

Use a controller when the logic needs runtime services.

Examples:

- `modules/sidebar/controller.js`
- `modules/listing-badges/controller.js`
- `modules/work-page/controller.js`
- `modules/bookmark-import/popup-controller.js`

If a controller starts accumulating pure helper logic, extract that helper logic to a core module and test it.

## Shared Or Runtime-Specific

Make logic shared when:

- both popup and content need the same rule
- the same data shape is normalized in multiple places
- parsing or mapping behavior must stay consistent
- a bug fix would otherwise require changing two runtimes

Keep logic runtime-specific when:

- DOM ids/classes are runtime-specific
- event handling is unique to popup or content
- only one runtime uses the behavior
- sharing would require awkward dependency injection with no clear payoff

## Entry Point Or Module

Entry points may own:

- startup
- script-loaded module wiring
- cross-feature state
- current page detection
- render coordination
- compatibility wrappers during extraction

Entry points should not own:

- reusable parsing
- storage sanitization
- feature-specific modal internals
- large card rendering bodies
- sort/filter algorithms
- import mapping

When in doubt, keep the first version small and local, then extract once the feature's boundary is clear.

## Storage Placement

Add stored data only when:

- the user expects it to persist
- the value cannot be derived cheaply
- it is needed across sessions or runtimes

Before adding a storage field:

1. Check `docs/dev/storage-schema.md`.
2. Decide whether it belongs on a work, category, author watch, bookmark sync state, or a new key.
3. Add sanitizer/default behavior.
4. Update import/export if needed.
5. Add tests for malformed and missing values.

## UI Placement

Before adding UI, check:

- `docs/dev/ui-style-guide.md`
- `docs/dev/sidebar-ui.md` if in-page
- `docs/dev/popup-ui.md` if popup

Do not add a new visual pattern if an existing one fits:

- popup setup cards
- popup tool buttons
- popup dashboard sections
- sidebar tabs
- sidebar card back actions
- sidebar modals
- popup modals
- mini toasts

## Feature Placement Checklist

Before implementing:

- Who needs this feature?
- Are they reading AO3, managing the library, or configuring the extension?
- Is this current-work, single-work, or library-wide?
- Does it need persistent storage?
- Can the core logic be tested without a browser?
- Which runtime loads the needed dependencies?
- Does the UI follow the relevant guide?
- Does the storage shape need documentation?
