# Sidebar UI Guide

## Purpose

The sidebar is the in-page AO3 reading workspace. It should help users act on the current work and browse their tracked library without leaving AO3.

Use this guide when changing:

- `modules/floating-ui/template.js`
- `modules/floating-ui/controller.js`
- `modules/sidebar/card.js`
- `modules/sidebar/controller.js`
- `modules/sidebar/core.js`
- `content.css`
- content-side modals launched from the sidebar

## Sidebar Role

The sidebar is for immediate reading context:

- open the tracked library while browsing AO3
- add or update the current work
- search and filter tracked works
- move works between statuses
- manage notes and ratings for a work
- add/remove works from custom categories
- export/import from the in-page tool menu
- see lightweight backup reminders

Large account-level tools, long reviews, and dashboard summaries belong in the popup unless they directly support in-page reading.

As FandomGobbler expands to multiple site editions, the sidebar interaction model should stay familiar across platforms whenever the host site allows it. A user moving from AO3 to FanFiction.net should recognize the same floating entry point, the same sidebar shell, the same track-control vocabulary, and the same listing badge language.

Edition-specific sidebar theming should be isolated per platform. Changing the FF.net sidebar theme should not rewrite AO3 page theme, AO3 sidebar theme, or popup theme preferences.

## Layout Anatomy

The sidebar template currently has this structure:

- floating button: `#ao3tracker-fab`
- sidebar host: `#ao3tracker-sidebar`
- panel: `#ao3tracker-panel`
- header: `#aot-header`
- current work bar: `#aot-current-bar`
- export reminder: `#aot-export-reminder`
- tabs: `#aot-tabs-wrap`, `#aot-tabs`, `.aot-tab`
- search: `#aot-search-bar`, `#aot-search`
- sort indicator: `#aot-sort-indicator`
- list region: `#aot-list-wrap`, `#aot-empty`, `#aot-list`
- notes modal: `#aot-notes-overlay`
- category modal: `#aot-cat-overlay`

Keep new UI inside this anatomy unless the feature needs an AO3 page-level integration outside the sidebar.

For non-AO3 editions, prefer reusing this anatomy or a clearly recognizable adaptation of it instead of inventing a separate page-tool layout.

When possible, reuse a shared platform-sidebar shell/template rather than copying the full sidebar HTML into each platform controller. Platform controllers should plug data and behaviors into the shared shell instead of forking the structure.

## Docking And AO3 Coexistence

On wide screens, the sidebar docks and reserves page space. On narrow screens, it overlays the page.

New sidebar UI must:

- stay inside `#ao3tracker-panel`
- avoid leaking styles into AO3
- avoid changing AO3 page layout except through existing dock behavior
- keep `#inner` scroll restoration intact
- work when the floating button is hidden while the sidebar is open

Use `aot-` classes for sidebar elements. Avoid unprefixed selectors in `content.css`.

When building another edition's in-page library surface, reuse the same shell ids/classes and shared styles where practical. Platform-specific wrappers should adapt content, not replace the whole interaction language.

## Header

The header should stay compact:

- title
- total count pill
- export/import icon button
- theme icon button
- close icon button

Do not add large text controls to the header. If a new action is not used constantly, put it in a dropdown, the current work bar, a card back, or the popup.

Header icon buttons should be square, stable, and accessible:

- `title`
- `aria-label`
- SVG icon
- no layout-changing hover text

## Current Work Bar

Use the current work bar for actions about the AO3 work currently open in the page.

Good current-bar actions:

- add current work
- move current work to a status
- remove current work
- show concise current-work state

Avoid adding:

- long summaries
- full notes editing
- import/export controls
- account-level settings

If the current work needs details, open the existing notes/category modal or use the full card.

## Tabs

Tabs are for library filters:

- All
- built-in statuses
- Deleted
- custom categories

Tab rules:

- keep labels short
- keep counts visible and stable
- keep the built-in status icon vocabulary consistent across editions; if AO3 shows a status icon in the tab row, FF.net and future editions should show the same icon unless the shell explicitly changes everywhere
- use `.aot-active` for the selected tab
- keep custom categories after the built-in tabs
- preserve horizontal scrolling and arrow behavior
- do not add non-filter actions to the tab row except the existing add-category control

If a new library grouping is not a durable category/filter, it probably belongs in search, sort, or the popup.

## Search And Sort

Search should remain a single focused input across visible library content.

Sort behavior is controlled by shared sidebar view-model logic in `modules/sidebar/core.js`. New sorting rules should be added there first, then surfaced through existing popup/sidebar indicators.

The sort indicator should stay informational and compact. Do not turn it into a second toolbar.

## Work Cards

Sidebar cards are dense, repeated work items. The current pattern is a two-sided card:

- front: quick scan
- back: details and actions

Front side should include:

- title link
- author and word count
- limited fandom/relationship tags
- status badge and custom category chips
- chapter progress pill when relevant
- added/updated/completed/subscribed metadata
- rating stars when present
- flip control

Back side should include:

- summary
- series metadata when present
- notes preview and edit action
- lost/deleted notice when relevant
- move-status actions
- add/remove custom category actions
- remove work action
- flip-back control

Do not add a third card state. If more information is needed, use a modal or popup management flow.

## Card Density

Cards should remain scannable:

- truncate long titles and relationships
- show at most a small number of front-side tags
- keep metadata lines compact
- move secondary actions to the back
- keep destructive actions away from common quick actions

User-provided text must be escaped before insertion. Preserve the existing `esc` and `trunc` patterns in card rendering.

## Card Actions

Use existing action families:

- `.aot-btn`
- `.aot-btn-progress`
- `.aot-btn-completed`
- `.aot-btn-rereading`
- `.aot-btn-onhold`
- `.aot-btn-dnf`
- `.aot-btn-restore`
- `.aot-btn-remove`
- `.aot-btn-back-cat`

Move/status actions should update storage, refresh the sidebar, and keep the current work controls in sync.

Remove/destructive actions should use confirmation or undo behavior. Do not make destructive actions the default focused or most visually dominant control.

## Modals In The Sidebar

Sidebar modals should be narrow, focused, and launched by direct user intent.

Current sidebar modals:

- notes and rating
- custom category create/edit

Modal rules:

- keep title, body, footer structure
- close button is icon-only
- footer uses Cancel/Save or equivalent
- avoid nested modals
- keep form fields within the panel width
- preserve keyboard focus behavior where possible

If a workflow needs multi-page review or batch operations, prefer the popup.

## Empty States

Use `#aot-empty` for no visible works. Empty state copy should be short and specific.

Examples:

- no tracked works
- no works in the selected status
- no search results
- no custom categories yet

Avoid long onboarding text inside the sidebar.

## Theme Requirements

Any new sidebar UI must be styled for:

- default tracker panel
- `#ao3tracker-panel.aot-dark`
- `#ao3tracker-panel.aot-sol-light`
- AO3 page dark mode interactions when relevant

Do not assume popup variables exist in `content.css`. Use existing sidebar colors and theme selectors.

## Responsive Requirements

Check new sidebar UI at:

- docked desktop width
- overlay/narrow width
- tall and short viewport heights
- many tracked works
- no tracked works
- many custom tabs
- long title/author/category names

Controls must not overlap the close button, tab arrows, search bar, or card content.

## What Belongs Elsewhere

Move a feature to the popup if it is mainly about:

- imports
- exports
- account or library-wide refresh
- dashboards or insights
- settings
- long review lists
- feature explanations

The sidebar should stay close to the reading moment.
