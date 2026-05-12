# FandomGobbler Architecture

## Overview

FandomGobbler is a local-first, storage-first MV3 browser extension built as a modular monolith.

The long-term product direction is multi-platform rather than AO3-only. The same extension brand should support multiple site editions:

- AO3 Edition
- FanFiction.net Edition
- Wattpad Edition
- Tumblr Edition

The dashboard, popup, and tracker workflows should adapt per edition so each site can expose only the features that make sense for its metadata, URLs, reading model, and available page hooks.

The runtime has three user-facing entrypoints:

- `content.js` orchestrates AO3 page integration: sidebar injection, floating UI, work-page controls, listing/search badges, page theme behavior, in-page modals, chapter progress, export/import actions, deleted-work checks, and author-watch hooks.
- `popup.js` orchestrates the extension popup: library rendering, current-page detection, settings, import/export tools, author watches, custom categories, subscription refresh, notes, and account-level workflows.
- `dashboard.js` orchestrates the full-tab dashboard: paginated library browsing, bulk actions, visual stats (right-column charts), dashboard filters, author-watch management, fetch workflows, subscription refresh, and export/import tools.

Most growing behavior now lives in feature modules under `modules/`. The entrypoints are no longer the only place where feature logic lives, but `popup.js` still carries more orchestration and rendering responsibility than the long-term target.

## Architectural Direction

The intended shape is a modular monolith with vertical feature slices:

- feature slices over generic utility buckets
- pure domain helpers for parsing, normalization, filtering, and mapping rules
- controller modules for runtime-specific DOM/storage orchestration
- thin entrypoints that compose modules, initialize dependencies, and preserve runtime boundaries
- small, explicit seams between AO3 fetching/parsing, storage, and UI rendering
- regression tests around extracted logic before broadening a refactor

The codebase should avoid drifting into either extreme: one large script pile or a premature framework/bundler architecture.

### Edition Model

Edition support should follow these rules:

- keep one brand and one shared extension shell
- keep site parsing, capability flags, labels, and incompatible workflows site-aware
- prefer feature gating over pretending all sites support the same tracker behavior
- avoid AO3 assumptions in new shared abstractions unless the abstraction is explicitly AO3-only
- keep each platform's tracked library separate instead of merging all sites into one shared works map
- keep per-edition sidebar theme state separate as well, so changing FF.net's sidebar appearance does not mutate AO3 page, AO3 sidebar, or popup theme preferences
- keep the core UX language stable across editions so platform switching feels like using the same tracker, not a different extension
- reuse shared surface primitives for floating buttons, sidebar shells, inline track controls, listing badges, popup sections, and dashboard layouts before introducing platform-specific UI
- let platform adapters change labels, capability visibility, and data wiring while preserving familiar interaction patterns wherever the target site allows it

Separate libraries are the preferred architectural direction because the supported sites do not provide equivalent identifiers, tags, stats, subscriptions, chapter structures, or import surfaces. Treating them as one combined library would make storage normalization, dashboard analytics, and filtering much less trustworthy.

This means multi-platform scaling should prefer:

- shared view shells with platform-specific content adapters
- shared platform-shell templates for repeated sidebar structure, with per-platform controllers filling in parsing, storage, and capability-specific behavior
- shared CSS vocabulary and component classes where the interaction meaning is the same
- platform-specific parsing/controller modules that plug into familiar UI patterns

It should avoid:

- edition-by-edition reinvention of sidebar layout, button language, or badge semantics
- shipping a beta platform with a visibly different interaction model unless the host site truly blocks the shared pattern
- coupling reusable UI primitives directly to AO3-only parsing assumptions

## Runtime Loading Model

This extension currently uses ordered script loading rather than ES module imports.

### Content Runtime

`manifest.json` loads `dark-early.js` at `document_start`, then loads the content runtime at `document_end` in dependency order:

- shared keys, theme CSS modules, utilities, toast, storage, and UI helpers
- shared core modules such as tracked works, AO3 page parsing, and author watches
- content-side feature controllers such as sidebar, listing badges, work page, page theme, notes modal, category modal, export/import, availability checks, chapter progress, track button, and floating UI
- `content.js` as the final orchestrator

### Popup Runtime

`popup.html` loads popup dependencies in script order:

- `modules/storage-keys/index.js`
- author watches core and popup controller
- tracked works core
- bookmark import core and popup controller
- popup-only controllers for notes, custom categories, export/import, and subscription refresh
- `modules/marked-for-later-import/core.js` and popup controller
- popup-only controllers for notes, custom categories, export/import, and subscription refresh
- `popup.js` as the final orchestrator

### Dashboard Runtime

`dashboard.html` loads the dashboard dependencies in script order:

- `modules/storage-keys/index.js`
- `modules/platforms/core.js`
- author watches core and popup controller
- tracked works core
- bookmark import core and popup controller
- marked for later import core and popup controller
- sidebar core for shared library view-model behavior
- popup controllers for export/import and subscription refresh
- `dashboard.js` as the final orchestrator

The dashboard intentionally reuses popup controllers for long-running library workflows while owning its own layout, chart rendering, pagination, dashboard-specific filters, and platform switching.

`modules/platforms/core.js` must load before `dashboard.js` because `dashboard.js` calls `PlatformsCore.getWorksStorageKey`, `PlatformsCore.hasCapability`, and related helpers during startup to route storage and gate UI sections.

Side columns (`.dashboard-left` and `.dashboard-visuals`) are sticky and scroll independently via CSS — `dashboard.js` does not dynamically adjust layout to match column heights.

### Module Exposure

Runtime modules attach public APIs to `globalThis` using `AO3Tracker...` namespaces. Many modules also export through `module.exports` so Node-based regression tests can require them.

This keeps the extension simple to load as unpacked MV3 code, but it means script order and namespace naming are architectural contracts. New modules should fail loudly when required dependencies are missing, preferably through the existing dependency-validation helper where practical.

## Runtime Boundaries

### Extension CSP and Fetched Host HTML

Extension pages (`popup.html`, `dashboard.html`, and other `chrome-extension://` documents) must never insert raw HTML fetched from AO3, FFNet, or any other host site directly into an extension DOM or parser document. Host pages commonly include `<script src="https://archiveofourown.org/...">`, `<link>`, media, iframe, inline event handlers, and other resource-loading markup. In an MV3 extension page, handing that raw markup to `innerHTML`, `DOMParser`, or `createHTMLDocument().body.innerHTML` can produce Content Security Policy errors such as blocked AO3 scripts in the popup console.

When fetched host HTML is needed for parsing:

- sanitize before parsing or insertion, preferably through `AuthorWatchCore.sanitizeFetchedAo3Html`
- reduce full documents to body markup before parsing so host `<head>` resources never reach the extension page
- strip scripts, styles, noscript, link/meta/base tags, frames, media/image/source tags, inline event handlers, and resource-loading attributes such as `src`, `srcset`, `poster`, and `ping`
- parse sanitized markup with `DOMParser.parseFromString(..., 'text/html')`, then clone only sanitized body nodes into any extension-owned parsing document
- avoid `template.innerHTML`, `createHTMLDocument().body.innerHTML`, or any live extension DOM assignment for fetched host markup, even when the string was already sanitized
- do not preserve host page scripts to "make AO3 behavior work" inside extension UI; reimplement needed behavior in extension-owned controllers instead

Any new import, refresh, scraper, preview, or dashboard workflow that fetches host HTML should include a regression test proving fetched scripts and resource loads are removed before parsing.

### `content.js`

`content.js` should remain the AO3-page orchestrator. It owns cross-feature page lifecycle behavior and wires dependencies into content-side controllers.

It may own:

- content-script startup
- current page detection and page-level scheduling
- cross-feature coordination after storage changes
- state that spans multiple content modules, such as active sidebar tab, search query, flipped cards, expanded summaries, and saved scroll position
- small wrappers that keep legacy function names stable while modules are extracted

It should not re-own domain rules already available from shared cores.

### `popup.js`

`popup.js` is still the popup control center. It owns popup startup, shared popup state, popup-wide rendering, and context objects passed into popup controllers.

It currently still owns substantial library behavior, including:

- loading and saving tracked works
- popup library rendering
- current work detection
- status changes and custom category coordination
- popup sort state and random ordering
- setup functions for popup controls

Long term, `popup.js` should become thinner by moving feature-specific rendering and mutation workflows into popup feature controllers.

### `dashboard.js`

`dashboard.js` is the full-tab library orchestrator. It owns dashboard startup, dashboard state, three-column rendering, pagination, charts, bulk selection, platform switching, and adapter context objects passed into reused popup controllers.

It may own:

- dashboard-only visual rendering
- dashboard-only filters layered before the shared sidebar view model
- Browse by… definitions and counts
- library pagination (page size controlled by `DEFAULT_PAGE_SIZE`)
- bulk selection state
- context adapters for popup-controller reuse
- active platform state (`dashboardPlatform`) and platform menu wiring
- `currentWorksStorageKey()` — routes storage reads and writes through the active platform's bucket
- `platformHas(capabilityName)` — gates UI sections by platform capability; UI elements hidden by capability should use the `hidden` attribute, not CSS-only hiding
- `applyPlatformCapabilities()` — called on every platform switch to show/hide sections and reset any active filters that rely on now-hidden capabilities

Side columns (`.dashboard-left` and `.dashboard-visuals`) are sticky and scroll independently via CSS — `dashboard.js` does not dynamically adjust page size to match column heights.

It should not duplicate parsing, import, export, storage normalization, platform config rules, or shared sorting rules already available from core modules or popup controllers.

## Module Map

### Shared Domain Cores

These modules contain logic that should stay mostly pure and easy to test:

- `modules/tracked-works/core.js`: tracked-work statuses, validity, restore behavior, completion timestamps, and sanitization
- `modules/ao3-page/core.js`: AO3 work-page, listing blurb, subscription, and stats parsing helpers
- `modules/author-watches/core.js`: author-watch URL/fandom normalization, match sanitization, AO3 HTML sanitization, and bot-block detection
- `modules/bookmark-import/core.js`: bookmark parsing, candidate filtering, sync-state shaping, known-work merging, and imported tracked-work mapping
- `modules/marked-for-later-import/core.js`: Marked for Later page parsing, candidate filtering, sync-state shaping, known-work merging, and MFL tracked-work mapping (mirrors bookmark-import/core but targets `li.work.blurb.group` blurbs and carries no user notes)
- `modules/sidebar/core.js`: sidebar tab buckets, sorting, filtering, empty states (including actionable first-run message), sort indicator text, and view-model computation
- `modules/listing-badges/core.js`: listing/search work-id extraction, badge datasets, labels, and chapter-pill metadata
- `modules/platforms/core.js`: canonical platform registry — ids, edition labels, menu labels, per-platform storage keys, beta notes, and capability flag maps for AO3, FFNet, Wattpad, and Tumblr; authoritative source for adding or changing platform definitions
- `modules/ffnet/core.js`: FFNet URL parsing, metadata extraction, work-page normalization, and listing-link mapping for the FFNet edition

### Content-Side Controllers

These modules coordinate AO3 page DOM, storage callbacks, and shared helper APIs:

- `modules/sidebar/controller.js`: sidebar open/close/render orchestration
- `modules/sidebar/card.js`: sidebar card DOM construction and card-level interactions; status moves show an undo toast via `showMiniUndoToast`
- `modules/listing-badges/controller.js`: listing/search badge injection and refresh behavior
- `modules/work-page/controller.js`: work-page meta row and current-work bar orchestration
- `modules/author-watches/controller.js`: content-side author-watch auto-check hooks; fires a browser notification (`chrome.notifications`) when new matches are found
- `modules/page-theme/controller.js`: AO3 page theme application and synchronization
- `modules/notes-modal/controller.js`: content-side notes modal behavior
- `modules/cat-modal/controller.js`: content-side custom category modal behavior
- `modules/export-import/controller.js`: content-side export/import behavior
- `modules/availability-checker/controller.js`: deleted/unavailable work checking
- `modules/chapter-progress/controller.js`: chapter progress controls
- `modules/track-button/controller.js`: work-page tracking controls
- `modules/floating-ui/template.js`: floating sidebar UI markup; includes `#aot-sidebar-onboarding` banner shown by the controller when no works are tracked
- `modules/floating-ui/controller.js`: floating button/sidebar UI injection and behavior
- `modules/ffnet/controller.js`: FFNet on-page sidebar, story-page track controls, listing badges, and FFNet message handling

### Popup-Side Controllers

These modules coordinate popup DOM, popup state passed through context objects, and popup-specific workflows:

- `modules/author-watches/popup-controller.js`: Author Watches controls, rendering, checks, and match handling; fires a browser notification when a manual refresh finds new matches
- `modules/bookmark-import/popup-controller.js`: bookmark import modal, fetch pacing, review filtering, resume/cancel, and import execution
- `modules/marked-for-later-import/popup-controller.js`: Marked for Later import modal, fetch pacing, review filtering, resume/cancel, and import execution (default status: `want`)
- `modules/notes-modal/popup-controller.js`: popup notes controls
- `modules/custom-cats/popup-controller.js`: popup custom category controls
- `modules/export-import/popup-controller.js`: popup export/import tools
- `modules/subscription-refresh/popup-controller.js`: popup subscription refresh workflow

### Shared Runtime Infrastructure

These modules are not feature slices, but they provide cross-cutting runtime services:

- `modules/storage-keys/index.js`: canonical storage key names
- `modules/storage/index.js`: content-side storage helpers for works, custom categories, sort settings, and export reminders
- `modules/utils/index.js`: shared formatting, escaping, labels, waiting, date, and dependency validation helpers
- `modules/ui-utils/index.js`: UI helper flows shared by content-side modules
- `modules/toast/index.js`: mini-toast presentation, including `showMiniUndoToast` for status-move undo flows
- `modules/theme-css/*.js`: injected CSS payloads for AO3 theme and pill styling

## Storage Model

The extension stores user data locally through `chrome.storage.local`. Declared permissions: `storage`, `activeTab`, `notifications` (used for Author Watch match alerts).

Long-term, storage should evolve from AO3-only buckets toward platform-aware buckets. The preferred direction is separate per-platform libraries and per-platform feature state rather than one merged cross-site works collection.

Major storage buckets include:

- tracked works
- custom categories
- AO3 page theme, extension theme, and theme sync settings
- floating button/sidebar settings
- library sort setting
- author watches
- author watch matches
- bookmark import sync state
- marked for later import sync state
- export reminder state
- work meta collapse state

Shared modules may normalize and sanitize stored data, but runtime entrypoints and controllers still decide when storage is read or written. Storage access is intentionally local-first; no data is sent to a remote service.

## Testing Shape

Tests live under `tests/` and use Node's built-in test runner.

Current tests focus on extracted, low-risk-to-load modules:

- tracked-work normalization and validity
- AO3 page parsing
- author-watch core behavior
- bookmark import parsing and controller smoke coverage
- listing badge core/controller behavior
- sidebar core/controller behavior
- work-page controller smoke coverage
- mojibake regression checks

The healthiest modules expose both a browser global and `module.exports`, which lets the same implementation run in the extension and in Node tests.

## Refactor Rules

When adding or changing features:

1. Prefer extracting pure logic before moving UI.
2. Keep shared modules focused on one feature slice.
3. Use controller modules for runtime-specific DOM/storage orchestration.
4. Avoid introducing new cross-file dependencies unless they clearly reduce duplication or clarify ownership.
5. Keep popup/content UI behavior stable unless the task explicitly asks for UX changes.
6. Add or update regression tests for extracted shared logic before broadening a refactor.
7. Keep critical source files UTF-8 and guard against mojibake regressions in tests.
8. Treat script load order and `AO3Tracker...` global names as explicit public contracts.

## Current Pressure Points

The architecture is much healthier than the original two-entrypoint shape, but a few areas still need care:

- `popup.js` remains the largest runtime orchestrator and still owns too much library rendering and mutation behavior.
- Script-order dependency wiring through `globalThis` is simple but fragile.
- Several controller modules are large enough to become feature entrypoints if they continue growing.
- CSS remains large and split mostly by runtime/theme rather than by feature ownership.
- Controller test coverage is lighter than core helper coverage.

## Near-Term Extraction Targets

The next useful architecture work should focus on:

- popup library rendering and status-mutation workflows
- popup storage/load/save adapter helpers
- theme/settings normalization shared by popup and content
- stronger controller integration tests around popup/content workflows
- optional dependency bootstrap validation so missing globals fail clearly

These should continue as feature slices or runtime adapters, not as catch-all helper files.

## Long-Term Goal

The long-term goal is for `content.js` and `popup.js` to coordinate modules rather than own full feature bodies.

In the target shape:

- shared cores define domain rules
- content controllers own AO3 page behavior
- popup controllers own popup workflows
- infrastructure modules provide storage, keys, toasts, and shared UI helpers
- entrypoints initialize dependencies and coordinate cross-feature events
