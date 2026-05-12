# Dashboard UI Guide

## Purpose

The dashboard is the full-tab library workspace. It combines the most useful popup management tools, the sidebar's library browsing model, and larger visual summaries that need more room than either compact surface can provide.

Use this guide when changing:

- `dashboard.html`
- `dashboard.css`
- `dashboard.js`
- dashboard-specific reuse of popup controllers
- dashboard-facing documentation or feature placement

## Dashboard Role

The dashboard is for full-library review and batch work:

- browse and paginate tracked works
- search, sort, and filter the full library
- run bulk actions on selected works
- fetch bookmarks and Marked for Later
- refresh subscriptions
- manage author watches
- export, import, and check the last backup date
- review colorful charts and summary stats
- jump from stats into AO3 pages or dashboard library views

The dashboard should feel like the roomy version of the popup and sidebar, not a separate product. Keep data rules, status meanings, import/export behavior, and sort behavior aligned with existing shared modules.

The dashboard is also the most visible place where edition-switching should surface. As FandomGobbler expands beyond AO3, the dashboard should present a shared shell with edition-specific capabilities rather than forcing one AO3-shaped experience onto every site.

Edition switching should not create a new dashboard personality for each platform. The dashboard should keep the same layout language, controls, and navigation model across editions, while platform-specific capability gating changes what is available inside that shared shell.

## Layout Anatomy

The dashboard currently uses:

- `.dashboard-page` on `body` for dashboard-scoped theme and palette variables
- `.dashboard-app` as the page shell
- `.dashboard-header` for extension name, total count, and theme icon (sticky)
- `.dashboard-shell` as the centered page container
- `.dashboard-grid` for the three-column desktop layout: left tools column + library + right charts column
- `.dashboard-left` for the sticky left column (Browse by…, Library Insights, Smart Views, Author Watch, Library Tools, Backup & Import)
- `.dashboard-library` for the central searchable/paginated work list
- `.dashboard-visuals` for the sticky right column (charts)
- `.dashboard-chart-board` for the vertical chart stack inside `.dashboard-visuals`
- `.dashboard-chart-card` for individual visual cards
- overlay modals reused from popup controllers for fetch review flows

## Layout Principle

Desktop layout uses three columns: a sticky left tools column, a full-width library area, and a sticky right charts column.

`.dashboard-left` and `.dashboard-visuals` are sticky and scroll independently via CSS. Their scrollbar is hidden until hover. Each section within `.dashboard-left` is a separate `.dashboard-section` card.

The library center column is the main workspace: search, sort, filters, status tabs, bulk actions, work cards, and pagination. It should not become infinitely scrollable. Pagination is part of the design. Page size is set by `DEFAULT_PAGE_SIZE` in `dashboard.js`.

If the header height changes, update `--dash-header-h` in the `.dashboard-page` rule in `dashboard.css`.

At ≤1100px, the right column (`.dashboard-visuals`) hides and the grid becomes two-column (left + library). At ≤880px, the grid becomes single-column and `.dashboard-left` becomes static (no longer sticky).

## Current Work Layer

The dashboard has a persistent bottom "currently reading" bar:

- single-clicking a work card selects the current work
- if nothing is selected, the bar can fall back to a reading/re-reading work
- the bar shows title, author, status, word count, published/updated dates, and chapter progress when known
- clicking the work title opens the expanded work detail view in the Library column
- clicking the author name opens the expanded author detail view in the Library column
- right-side icon actions open AO3, open the expanded detail view, add/check Author Watch, and open AO3 for subscription management

Double-clicking a work card opens the expanded detail view. This view replaces the Library list instead of opening a modal. It must include a clear back control at the top that returns the user to the previous Library view. The detail view uses a music-library style structure: large work header, progress and quick actions, stats, summary, series parts, more works by the author, and an author fact panel based only on saved tracker data.

Within the dashboard, a work title should navigate to the dashboard detail view, not directly to AO3. Any AO3 exit for a work should be an explicit external-link icon so users can tell when they are leaving the dashboard.

Within the dashboard, an author name should navigate to the expanded author detail view, not directly to AO3. Any AO3 exit for an author should be an explicit external-link icon from the author detail view. Author detail stats, fandoms, relationships, library statuses, and tracked work lists should be based on saved tracker data unless the user explicitly triggers a small AO3 sample fetch elsewhere.

Large work and author names in expanded detail headers should fit inside a two-line title treatment by measuring the rendered title width and reducing font size when needed. Avoid clipping descenders such as `y`, `j`, and `g`, and prefer fitting the title over showing a trailing ellipsis.

Do not make the bottom bar perform hidden AO3 subscription writes. Subscription controls should open the AO3 work page and reflect detected subscription state from saved metadata.

Author recommendations in the detail view may load a small author-works sample from AO3, but only after an explicit user click. Do not fetch author works automatically, do not crawl multiple pages, and do not retry in the background. The loaded sample should split into:

- same author, same fandom, and same relationship group
- same author and same fandom, but different relationship group

Keep long recommendation lists scrollable inside the detail view.
Recommendation rows should show available word count beside the work title. If a section such as "same author, same fandom, and same relationship" has no rows after the AO3 sample loads, show `No other works.` instead of hiding the section.

Author detail views may also show `Other Works from Author` using the same click-only AO3 sample loader. This list should not auto-fetch, and it should sit below the saved tracker-data sections so the user can distinguish local library data from the optional AO3 sample.

## Relationship Groups

Relationship Groups let the dashboard treat AO3 relationship tags as equivalent when the user approves that grouping.

Use this for cases like:

- `Harry Potter/Tom Riddle`
- `Harry Potter/Voldemort`
- `Harry Potter/Tom Riddle | Voldemort`

The tracker should not infer these as permanently equivalent by itself. Smart suggestions may surface likely aliases based on the selected work, shared fandom, and overlapping relationship participants, but the user must click a suggestion before it is saved.

Saved relationship groups affect dashboard relationship matching:

- expanded detail recommendations can show grouped pairings in the "same author, fandom, and relationship" section
- relationship filters include works that match the selected relationship group
- top relationship insights use the group display name

Relationship groups are stored under `RELATIONSHIP_GROUPS_KEY` and should stay dashboard-controlled until another surface has a clear need for them.

## Header

The dashboard header should stay compact:

- extension name
- edition kicker
- total tracked works pill
- reading-platform settings menu
- extension theme icon button

The platform switcher button opens a dropdown listing available editions: AO3, FFNet, Wattpad, and Tumblr. The active edition is hidden from the list. Selecting an edition calls `applyDashboardPlatform`, which:

- updates the edition label in the header
- routes all tracked-works storage reads and writes through the correct platform bucket via `currentWorksStorageKey()`
- calls `applyPlatformCapabilities()` to show or hide sections based on capability flags
- resets any active filters that relied on now-hidden capabilities
- persists the selection to `DASHBOARD_PLATFORM_KEY`

Edition switching is a product-direction control, not cosmetic text. Changing platforms changes which features, workflows, and storage buckets are active. Do not treat platform switching as a cosmetic relabel.

When adding new editions, prefer hiding, relabeling, or swapping specific capability blocks over redesigning the dashboard around each site. Platform definitions live in `modules/platforms/core.js`.

If an edition is planned but not yet active, keep it visible in the platform menu as a disabled `coming soon` entry rather than letting it behave like a real switch target.

The dashboard theme button follows the sidebar model:

- the icon represents the next theme action
- the tooltip and `aria-label` also describe the next theme action
- default theme shows the sunset icon and says "Switch to Solarized Light"
- Solarized Light shows the moon icon and says "Switch to Solarized Dark"
- Solarized Dark shows the sun icon and says "Switch to Default AO3"

Do not add large text controls or library filters to the header.

## Browse by…

Browse by… is the dashboard's high-level jump panel. It should be generated from one data structure in `dashboard.js`, currently `QUICK_SNAPSHOT_ITEMS`, so labels, counts, tabs, and filters stay together.

Snapshot cards should:

- be clickable
- update the central Library view when they represent a tracker status
- apply a dashboard filter when they represent a metric, such as "Added This Month"
- use the same status vocabulary as popup and sidebar
- include all built-in statuses: All, For Later, Reading, Completed, Re-reading, On Hold, DNF, and Deleted
- keep month-based metrics aligned with popup snapshot expectations

Do not add a snapshot metric that needs a long explanation. Put that in Library Insights or a chart instead.

## Library Insights

Library Insights are compact derived facts.

Current patterns:

- Top Fandom links to the AO3 fandom tag page
- Top Relationship links to the AO3 relationship tag page
- Subscribed Works filters the central Library
- Total Words is informational only

Insight cards should make their behavior obvious:

- external AO3 links use anchors with `target="_blank"` and `rel="noopener noreferrer"`
- dashboard filters use buttons and active styling
- empty links should not navigate
- long tag names should wrap safely

If an insight filters the Library, include the active filter in the Library result meta.

## Library Column

The Library column is the source of truth for visible works in the dashboard.

It owns:

- search
- structured filters for common facets such as fandom, author, relationship, rating, metadata, and subscription
- visual grouping
- sort
- built-in status tabs
- custom category tabs
- bulk selection
- bulk open/move/untrack
- work cards
- pagination
- empty state

The resting state of the Library header should stay scannable:

- title, result meta, sort, filter toggle, search, tabs, and select-all remain visible
- structured filter controls live in the collapsed filter panel
- active filters render as removable chips above the panel
- the filter toggle should show the number of active filters
- bulk action buttons appear only after one or more works are selected

Keep the dashboard library behavior consistent with sidebar and popup:

- status labels mean the same thing
- custom categories are the same stored ids
- sorting should use shared sidebar view-model logic where possible
- work URLs open AO3 in a new tab
- destructive actions require confirmation

Dashboard-specific filters should layer before the shared view model and remain small, explicit functions.

Search should not be the only practical way to narrow the library. Prefer visible controls for common filtering paths so users can browse without knowing what to type. Use text search for fuzzy lookup across title, author, fandom, relationship, and notes.

Grouping should remain visual and local to the current page of results. Do not let grouping bypass pagination or turn the library into an infinitely scrolling report.

## Work Cards

Dashboard work cards should follow the sidebar's card language where it improves scanning:

- each card is a single overview surface
- longer details and management controls belong in the expanded detail view, not behind a flip state
- rating appears as star icons, not prose
- status appears as a visual status badge
- custom categories appear as colored chips using stored category color/name data
- fandom and relationship tags stay compact
- the remove `x` may stay on the front for quick cleanup

The dashboard can use wider spacing than the sidebar, but it should not invent a separate meaning for status badges, custom category chips, rating stars, or chapter progress pills.

This same rule applies across editions: FanFiction.net, Wattpad, and Tumblr variants should reuse the same card language unless a host-specific limitation makes that impossible.

## Charts

Charts are for browsing and comparison, not critical actions.

Current visual cards:

- Status Mix
- Added by Month
- Top Fandoms
- Top Authors
- Ratings

Chart labels may be clickable when there is a clear destination:

- fandom labels link to AO3 tag works pages
- author labels open the dashboard author detail view when a usable author name exists

Do not hide key library controls inside chart interactions. If chart clicks become dashboard filters later, keep them consistent with Library Insights and show the active filter in the Library meta.

## Tools

Dashboard tools reuse popup controllers where possible:

- export/import uses `modules/export-import/popup-controller.js`
- bookmark fetch uses `modules/bookmark-import/popup-controller.js`
- Marked for Later fetch uses `modules/marked-for-later-import/popup-controller.js`
- subscription refresh uses `modules/subscription-refresh/popup-controller.js`
- author watch uses `modules/author-watches/popup-controller.js`

This is intentional. The dashboard provides different layout and entry points, but it should not fork workflow rules unless the dashboard needs a genuinely different workflow.

When adding a new dashboard tool:

- prefer shared core or existing popup controller APIs
- keep dashboard-specific DOM ids explicit
- keep storage writes in existing controller paths when possible
- add small adapter context functions in `dashboard.js`
- avoid duplicating parsing, normalization, or import logic

## Theme Requirements

Dashboard CSS is loaded after popup CSS and should override only dashboard-specific behavior.

Rules:

- scope dashboard overrides under `.dashboard-page`
- keep dashboard palette variables in `dashboard.css`
- do not change popup or sidebar colors while tuning dashboard colors
- support default, `body[data-theme="sol-light"]`, and `body[data-theme="dark"]`
- when overriding shared popup classes, increase specificity with `.dashboard-page` rather than changing popup rules

## Platform Editions

Platform editions let the dashboard serve multiple fanfiction sites from one shared shell. The platform registry lives entirely in `modules/platforms/core.js`.

### Capability Flags

Each platform defines a `capabilities` map. `dashboard.js` reads these through `platformHas(capabilityName)` to show or hide sections. Current flags:

| Flag | Controls |
| --- | --- |
| `bookmarkImport` | Fetch Bookmarks button in Library Tools |
| `markedForLaterImport` | Fetch Marked for Later button in Library Tools |
| `subscriptions` | Subscription refresh button and subscribed-works insight |
| `authorWatch` | Author Watch section and Author Watch refresh button |
| `relationshipTools` | Relationship Groups section and relationship filter |
| `relationshipFilter` | Relationship facet filter in the filter panel |
| `relationshipInsights` | Top Relationship insight link |
| `subscriptionFilter` | Subscription facet filter in the filter panel |
| `ao3EngagementSorts` | Most Kudos, Most Bookmarked, Most Hits sort options |

When a capability is false and a user has an active filter that depends on it, `applyPlatformCapabilities` clears that filter before re-rendering.

### Adding a New Platform

1. Add an entry to the `PLATFORMS` object in `modules/platforms/core.js` with:
   - `id`: short lowercase string matching the object key
   - `editionLabel`: displayed in the header (e.g. `"Wattpad Edition"`)
   - `menuLabel`: displayed in the switcher dropdown (e.g. `"Wattpad (beta)"`)
   - `worksStorageKey`: unique `chrome.storage.local` key for this platform's tracked works
   - `beta`: `true` until full capability parity is reached
   - `betaNote`: one-sentence note shown in the dashboard explaining what is missing
   - `capabilities`: set all flags to `false` for a new beta platform; enable flags only as platform-specific workflows are built
2. Add the new `id` to `PLATFORM_ORDER` to control dropdown sort order.
3. Add a button to `dashboard.html` inside `#dashboardPlatformDropdown` with `data-platform="<id>"`.
4. Document the new platform's storage key in `docs/dev/storage-schema.md`.
5. Do not add platform-specific branches inside `dashboard.js` rendering functions. Capability flags should handle all gating. If a platform needs truly different rendering, build a platform-specific core module and wire it through a context adapter.

### Beta Platform Rules

Beta platforms use the shared dashboard shell with most capability flags set to false. The beta note is shown at the top of the dashboard when a beta edition is active.

Do not enable a capability flag until the matching data-layer support exists. Enabling a flag that has no backend (no parser, no import module, no storage shape) will silently produce empty or broken UI.

## Scalability Rules

Keep dashboard code scalable by using these boundaries:

- data definitions such as snapshot cards live in constants
- pure filters stay in small helper functions
- shared business rules belong in core modules
- DOM wiring stays in setup/render functions
- popup-controller reuse happens through context adapters
- repeated card/chart rendering should be data-driven
- dashboard-only behavior should not leak into popup or content scripts
- platform differences are expressed through capability flags and data adapters, not dashboard rendering branches

If dashboard logic starts being needed by popup or sidebar, move the pure part into a shared module and add focused tests there.

## Empty States

The Library empty state should distinguish:

- no tracked works
- no matches for the current search/filter/view
- no works on the current page after pagination changes

Keep empty copy short and specific. The dashboard has enough surrounding controls that it does not need long onboarding text inside the Library column.

## Responsive Requirements

Check dashboard changes at:

- wide desktop with all three columns visible
- medium width with stacked side columns
- narrow mobile width
- many tracked works
- no tracked works
- many custom categories
- long fandom, relationship, author, and title strings

Controls must not overlap, resize unpredictably, or make the Library column infinitely long.
