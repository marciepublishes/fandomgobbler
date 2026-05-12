# Popup UI Guide

## Purpose

The popup is the extension control center. It should help users manage their library, settings, imports, exports, categories, author watches, and summary views.

Use this guide when changing:

- `popup.html`
- `popup.css`
- `popup.js`
- popup-side controllers under `modules/*/popup-controller.js`

## Popup Role

The popup is for management and batch workflows:

- reading setup
- theme and sidebar settings
- library sorting
- import/export
- bookmark fetching
- subscription refresh
- author watches
- custom categories
- quick snapshot
- library insights
- popup library browsing
- notes and category editing when launched from popup

Quick in-page reading actions belong in the sidebar. If a feature needs more space, review, or account-level context, it belongs in the popup.

As more site editions are added, the popup should remain the same management surface across editions. Platform changes should mostly affect available tools, helper copy, detected current-work data, and unsupported workflows rather than the popup's overall structure.

## Layout Anatomy

The popup currently uses:

- `.app` as the fixed-height shell
- `.header` for title and total count
- `#addCurrentBar` for the detected AO3 current work
- `.popup-dashboard` as the scrolling dashboard stack
- `.dashboard-section` for major sections
- `.section-head` and `.section-head-collapsible` for headings
- `.insights-panel` for collapsible section bodies
- `.setup-grid`, `.tool-grid`, `.snapshot-grid`, and `.insights-grid` for section layouts
- `.toast` for brief feedback
- overlay modals for notes, categories, and bookmark import

New features should fit into this section/panel model unless they are part of the popup library list or an existing modal.

Edition-specific popup behavior should preserve this section/panel model so users can move between AO3, FanFiction.net, Wattpad, and Tumblr editions without relearning where management tools live.

## Header

The popup header should stay simple:

- extension name
- total tracked works pill

Do not add settings, filters, or extra actions to the header. Use dashboard sections instead.

## Current Work Banner

`#addCurrentBar` is for the active AO3 tab/work:

- show the current work title
- add or move the work through the dropdown
- remove from tracker when already tracked

Keep this banner compact. Full metadata, notes, category management, and library-wide actions belong below.

## Dashboard Sections

Use `.dashboard-section` for major popup areas.

Current section types:

- Reading Setup
- Sort Library
- Library Tools
- Author Watch
- Custom Categories
- Quick Snapshot
- Library Insights

Section rules:

- heading is short
- helper copy is one sentence
- controls live in the panel below the heading
- collapsible sections use `.section-head-collapsible`, `.insights-toggle`, and `.insights-panel`
- keep default expanded/collapsed state intentional

Do not create a new section for a single minor action if it naturally fits an existing section.

## Setup Cards

Use `.setup-card` for setting-like controls with a title and supporting text.

Good setup-card uses:

- sidebar button on/off
- reset floating button position
- AO3 theme
- extension theme
- theme sync

Setup cards should:

- be full-width in the setup grid unless a local pattern exists
- use `.setup-card-copy`, `.setup-card-title`, and `.setup-card-sub`
- include icons only when they clarify the setting
- avoid long descriptions
- show state in the title or subtitle

## Tool Buttons

Use `.tool-btn` for command actions:

- export
- import
- refresh
- fetch
- reset

Tool buttons should be short and action-oriented. Use `.tool-btn-wide` for commands that need a wider row or supporting text.

When a tool is unavailable, disable the button and explain why in adjacent `.tool-meta` text rather than changing the button label into a paragraph.

## Collapsible Panels

Use collapsible panels for sections that are useful but not always needed.

Rules:

- keep `aria-expanded` in sync
- rotate the chevron through CSS
- hide panel content with `.hidden`
- do not remove panel content from the DOM just to collapse it

Do not put critical one-click setup controls behind a collapsed panel unless the user has already configured them.

## Popup Library

The popup library is for browsing and managing tracked works from the extension popup.

Keep popup library behavior consistent with the sidebar:

- same status labels
- same sort options
- same custom category meaning
- same notes/rating data
- same remove behavior expectations

Keep popup behavior consistent across editions too. If a capability is unsupported on a platform, hide or disable it inside the existing popup structure rather than replacing the whole popup with a new interaction model.

Popup cards may show more management detail than sidebar fronts, but they should still be compact. Avoid reproducing every sidebar back-side action if the popup already has a better management pattern.

## Snapshot And Insights

Use snapshot cards for counts and stable metrics.

Use insights cards for derived facts such as top fandom, top relationship, words this month, subscribed works, total words, or random For Later.

Metric cards should:

- fit in the two-column grid
- use short labels
- handle empty values gracefully
- wrap long fandom/relationship names without breaking layout

Do not add speculative or overly clever insights that require confusing explanations.

## Author Watch

Author Watch belongs in the popup because it is an account/library monitoring workflow.

The popup pattern includes:

- current-page author watch card when relevant
- refresh button
- metadata/status text
- watch list
- match list

Saved watch rows should open the author's works page filtered to the watched fandom when a cached AO3 `fandom_id` is available. If the id is missing, the popup can resolve it lazily from the author's works page and fall back to the plain author URL if AO3 does not expose the filter id.

New author-watch UI should stay in `modules/author-watches/popup-controller.js` unless it becomes shared domain logic, in which case extract to `core.js`.

## Bookmark Import

Bookmark import is a modal workflow because it has phases:

- status
- options
- review
- preview
- import

Keep the bookmark modal deliberate and calm:

- explain fetch pacing briefly
- keep quick mode as a checkbox
- keep review filtering visible only when there are candidates
- make Cancel Fetch, Resume Fetch, Close, and Import states explicit
- avoid automatic imports without user review unless the mode clearly promises that behavior

## Custom Categories

Custom categories appear in both popup and sidebar, but popup is the management home.

Popup category UI should support:

- listing categories
- creating a category
- editing name/color
- deleting a category

Color controls should use existing swatches and hex input patterns. Category names must fit in sidebar tabs and chips, so keep length limits conservative.

## Modals

Popup modals currently include:

- notes
- category editor
- bookmark import

Modal rules:

- overlay uses `.hidden` to close
- header contains title and close button
- body contains fields/panels
- footer contains secondary and primary actions
- close buttons are icon-only with accessible names
- destructive actions are separated visually from save/import actions

Avoid nested modals. If a workflow gets too complex, split it into a dedicated dashboard section or a phased modal.

## Toasts And Feedback

Use `.toast` for brief success/failure feedback.

Good toast messages:

- Saved
- Imported 12 works
- Export complete
- Removed from tracker

Avoid using toasts for information the user must read before proceeding. Use inline `.tool-meta`, modal status text, or disabled button state for persistent guidance.

## Theme Requirements

New popup UI must work in:

- default theme
- `body[data-theme="dark"]`
- `body[data-theme="sol-light"]`

Use CSS variables whenever possible. If a component needs theme-specific overrides, group them near related component styles or alongside existing theme override sections.

## Copy Rules

Popup copy can be slightly more explanatory than sidebar copy, but keep it concise.

Use:

- section heading
- one sentence of helper text
- short button labels
- inline metadata for state

Avoid long paragraphs inside cards or buttons. Do not describe obvious mechanics such as "click this button to..." unless there is a real risk.

## Accessibility

Popup controls should:

- use real buttons and form inputs
- preserve labels for inputs and selects
- include `aria-expanded` for collapsible toggles
- include `aria-label` for icon-only controls
- keep focus visible
- keep disabled states clear
- maintain reasonable tab order

## Before Shipping Popup UI Changes

Check:

- popup at its fixed width
- popup with long work titles
- popup with many works
- popup with no works
- collapsed and expanded dashboard panels
- default, dark, and Solarized Light themes
- import/bookmark modal states
- disabled tool states
- keyboard navigation through new controls
