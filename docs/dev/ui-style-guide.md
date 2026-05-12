# FandomGobbler. UI Style Guide

## Purpose

This guide defines the shared product and visual rules for FandomGobbler. UI work.

Use this when adding or changing visible features in:

- `popup.html`
- `popup.css`
- `content.css`
- sidebar templates and controllers
- popup-side and content-side modal/controllers

Architecture docs explain where code belongs. This guide explains how new UI should feel, behave, and fit the existing extension.

## Branding

Use a consistent FandomGobbler. wordmark across popup, dashboard, help, and sidebar surfaces.

Brand rules:

- The product name is written as `FandomGobbler.` with the period included.
- The default logo treatment is a text wordmark, not a mascot, badge, or illustrated icon.
- Use the existing condensed wordmark styling already established in the UI:
- `Arial Narrow`, Arial, sans-serif
  - compact uppercase-feeling weight and tight, sturdy presence
  - no decorative script, bubbly lettering, or novelty display fonts
- Keep the wordmark simple: one line when space allows, no stacked syllables, no curved text, no outline effects.
- Do not add gradients, glows, 3D bevels, mascot heads, or sticker-like treatments to the main brand wordmark.
- The period is part of the brand and should not be dropped casually in headers or titles.
- If supporting text is needed near the brand, it should be quiet and secondary, such as an edition label or a small `Help Page` kicker.
- Do not reintroduce `formerly AO3 Story Tracker` into the logo lockup unless a specific transition surface explicitly calls for it.

When in doubt, the logo should feel:

- editorial rather than cartoony
- compact rather than sprawling
- confident rather than decorative
- warm but still tool-like

## Product Feel

FandomGobbler. should feel like a calm reading companion: compact, useful, and a little warm without becoming noisy.

Prefer:

- dense but readable controls
- clear hierarchy over decorative flourish
- direct labels
- small contextual help text
- familiar icons for repeated actions
- restrained motion and hover states
- stable layouts that do not jump when content changes

Avoid:

- marketing-style hero sections
- tutorial copy inside the active UI
- large decorative graphics
- nested cards inside cards
- new one-off palettes
- layout shifts caused by hover, counters, long titles, or dynamic labels

## Visual System

The shared visual language is built around:

- light default surfaces with subtle borders
- Solarized Dark and Solarized Light variants
- status colors for reading states
- compact cards and pills
- native-feeling controls with custom styling

The popup uses CSS variables in `popup.css`:

- `--bg`, `--bg2`, `--bg3`, `--surface`
- `--border`, `--border-md`
- `--text`, `--text2`, `--text3`
- `--accent`, `--accent-bg`, `--accent-text`
- status tokens such as `--want`, `--progress`, `--completed`, `--rereading`, `--onhold`, `--dnf`, and `--lost`

The sidebar currently has its own `aot-` prefixed styles in `content.css`, including theme-specific variables on `#ao3tracker-panel.aot-dark` and `#ao3tracker-panel.aot-sol-light`.

New popup styling should use popup variables. New sidebar styling should use the existing `aot-` class/id patterns and theme selectors.

## Naming

Use predictable prefixes:

- Popup UI: descriptive popup feature classes, such as `bookmark-*`, `author-watch-*`, `category-manager-*`, `setup-*`, `snapshot-*`, or `insights-*`.
- Sidebar/content UI: `aot-*` for tracker sidebar elements and `ao3t-*` or `ao3tracker-*` for inline AO3 page integrations.
- Shared module globals: `AO3Tracker...`, as documented in `docs/dev/architecture.md`.

Do not introduce new broad class names such as `.card`, `.button`, `.panel`, or `.modal` in content CSS. AO3 pages already have their own styles, so tracker styles need clear ownership.

## Layout Rules

Use stable dimensions for repeated UI:

- cards
- tab rows
- icon buttons
- status pills
- counters
- toolbar buttons
- modal footers

Prefer CSS grid or flex with explicit gaps. Avoid hover states that change layout dimensions.

For fixed-format UI, define stable constraints:

- `min-width: 0` on flex children that contain titles
- `overflow-wrap: anywhere` for user-provided text
- `flex-shrink: 0` for icons, counters, and close buttons
- `grid-template-columns: repeat(...)` for repeated dashboard blocks
- predictable `min-height` for repeated cards where counts or dynamic text may vary

## Cards

Cards should represent repeated items or bounded tools:

- tracked works
- snapshot metrics
- insights
- author watch rows
- bookmark previews
- modal panels

Do not style every page section as a floating card. Popup sections can use `dashboard-section`, but avoid placing unrelated cards inside nested card shells unless the inner card is a repeated item.

Keep border radii close to the existing system. The current UI commonly uses `8px`, `10px`, `12px`, and `14px`; avoid larger rounded shapes unless matching an established pattern.

## Buttons And Controls

Use the existing control types before inventing a new one:

- Popup dashboard command: `.tool-btn`
- Popup setting/toggle tile: `.setup-card`
- Popup collapsible toggle: `.insights-toggle`
- Sidebar action button: `.aot-btn`
- Sidebar header icon button: existing `#aot-*` icon-button patterns
- Dropdown option: existing `*-option` or `aot-cur-opt` patterns

Use icon-only buttons for common symbolic actions such as close, theme, export/import, flip, edit, arrows, and dismiss. Add `title` and `aria-label` where the button has no visible text.

Use text buttons for clear commands such as:

- Export CSV
- Import JSON
- Refresh Subscriptions
- Fetch Bookmarks
- Remove Work
- Save
- Cancel

Destructive actions should use the existing danger styling family and should normally require confirmation or an undo path.

## Text And Copy

Write UI copy like a helpful tool, not a marketing page.

Prefer:

- short section names
- clear action verbs
- calm helper text
- user-centered labels
- specific empty states

Avoid:

- long explanations in cards
- feature tutorials in active controls
- jokes in destructive or failure states
- inconsistent names for the same status or feature

Status labels should remain consistent:

- For Later
- Reading
- Completed
- Re-reading
- On Hold
- Did Not Finish
- Deleted

When space is tight, accepted short forms include:

- Re-read
- Hold
- DNF

## Empty States

Empty states should answer two questions:

- what is missing
- what the user can do next, if there is a natural next action

Keep empty states short. Use the existing patterns:

- popup: `.empty-state`, `.author-watch-empty`, `.popup-detail-empty`
- sidebar: `.aot-empty`, `.aot-card-empty-actions`

Do not add large illustrations or separate onboarding areas for ordinary empty states.

## Modals

Modals are appropriate for:

- notes and ratings
- custom category creation/editing
- bookmark import review
- confirmation flows

Modal structure should stay familiar:

- header with title and close button
- body with grouped fields or panels
- footer with secondary action first and primary action last

Close buttons should be icon-only with an accessible label. Save/import/confirm buttons should use clear text.

Do not put unrelated tools into the same modal. If a workflow has distinct phases, show or hide panels within that modal rather than creating nested modals.

## Themes

Any new visible feature must work in:

- default light
- Solarized Dark
- Solarized Light

Popup theme selectors use `body[data-theme="dark"]` and `body[data-theme="sol-light"]`.

Sidebar theme selectors use `#ao3tracker-panel.aot-dark` and `#ao3tracker-panel.aot-sol-light`.

When adding colors:

- start from existing variables or status colors
- check contrast in dark and Solarized Light
- preserve status color meaning
- avoid a new dominant hue family

## AO3 Skin Hardening Rules

AO3 pages are hostile styling territory. Custom site skins can and will override broad, casual CSS.

When touching AO3 page UI such as:

- listing/search badges and dropdowns
- hidden-work banners
- current-work controls
- sidebar controls injected onto AO3 pages

follow these rules:

- Scope styles to the smallest owned selector possible. Prefer a component class such as `.ao3t-badge-cat-opt` or `.fg-hidden-work-btn` over broad descendants like `.ao3t-badge-dropdown .ao3t-badge-opt *`.
- Do not use broad `all: unset` or `display` overrides on shared dropdown/button families unless the component is truly isolated. If a rule touches every option in a menu, assume it may break icons, chips, checkmarks, and spacing in one shot.
- Harden geometry and behavior separately from theming. Protect:
  - layout
  - spacing
  - sizing
  - display mode
  - click target behavior

  but let theme-specific rules continue to own:
  - colors
  - surfaces
  - borders
  - hover color treatments
- For AO3 listing/search dropdowns, avoid descendant rules that restyle every child node. If a menu item has substructure such as:
  - color dot
  - checkmark
  - icon
  - pill

  give that substructure its own class and its own rule.
- If a visual detail is semantically important, prefer self-contained rendering over fragile CSS paint tricks. Examples:
  - use inline SVG for tiny category color dots
  - prefer explicit icon SVGs over font glyph assumptions
  - avoid relying on inherited `currentColor` for meaning-bearing fills unless the inheritance chain is intentional
- Do not solve AO3 skin leakage by flattening all styling with `!important` across a whole feature family. If `!important` is needed, keep it local to the stubborn property and selector.
- If a change is intended to fix one surface, verify it does not also alter:
  - track dropdown options
  - hide dropdown options
  - current-work bar controls
  - hidden-work banners
  - sidebar pills or modal controls

### Change Discipline

For AO3-facing UI changes:

- change one component family at a time
- prefer adding a narrow corrective rule over rewriting a shared base rule
- when a shared base rule must change, audit every consumer before keeping it
- note in the PR or change summary which nearby components were checked for drift

### Fragile Surfaces

These surfaces have proven especially easy to drift and should be treated as high-risk:

- AO3 listing/search `Track` dropdown
- AO3 listing/search `Hide` dropdown
- hidden-work collapsed banners and `Show Hidden Tags` controls
- current-work `+ Add` button
- sidebar top-row icon buttons
- sidebar tab row and arrow controls
- back-of-card pills: `Move Work To`, `Add Work To`, `Remove Work From`
- notes modal controls
- category modal controls

## Accessibility

Minimum expectations:

- all buttons are real `<button>` elements unless a link is genuinely navigation
- icon-only buttons have `title` and `aria-label`
- collapsible controls maintain `aria-expanded`
- form inputs have labels or clear accessible names
- focus styles are preserved or intentionally replaced with visible alternatives
- text does not rely on color alone for meaning
- dynamic controls should not become unreachable by keyboard

## Motion

Motion should be short and functional:

- hover lift
- sidebar slide
- toast reveal
- dropdown open/close
- card flip

Avoid long, decorative, or looping animation. Respect layout stability over flourish.

## Feature Placement

Put a feature in the sidebar when it helps while actively browsing or reading AO3.

Put a feature in the popup when it is a library-level, settings-level, account-level, import/export, or batch workflow.

If a feature belongs in both places, keep the quick action in the sidebar and the management/detail workflow in the popup.

## Before Shipping UI Changes

Check:

- default light, Solarized Dark, and Solarized Light
- narrow and normal popup heights
- long work titles and author names
- wordmark still reads exactly `FandomGobbler.`
- empty library states
- many custom categories
- focus/keyboard behavior for new controls
- AO3 page coexistence for content/sidebar UI
- no visible mojibake in user-facing copy
