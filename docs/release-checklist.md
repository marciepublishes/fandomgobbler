# Release Checklist

## Purpose

Use this checklist before packaging or sharing a new FandomGobbler build.

The checklist is intentionally practical: it focuses on extension load safety, user data safety, and the main popup/sidebar workflows.

## Version And Files

- Confirm `manifest.json` has the intended version.
- Confirm `README.md` still describes the shipped feature set.
- Confirm `docs/dev/architecture.md` is still accurate for new modules or runtime boundaries.
- Confirm relevant docs are updated for UI, storage, tests, or release behavior.
- Confirm no temporary test files or local debug artifacts are included.

## Static Checks

Run:

```powershell
node --check content.js
node --check popup.js
node --test .\tests\*.js
```

For any touched module, also run:

```powershell
node --check modules\path\file.js
```

If tests cannot run, record why before release.

## Encoding Check

Run the full test suite so the mojibake regression test executes.

Then spot-check visible UI copy in:

- `popup.html`
- `popup.js`
- `content.js`
- `modules/floating-ui/template.js`
- touched modal/controller files

Look for replacement characters or garbled punctuation.

## Manifest And Load Order

Check `manifest.json`:

- `manifest_version` is still 3
- permissions are still minimal
- host permissions are still scoped to the supported fanfiction sites and Google OAuth/API domains needed for optional Sheets sync
- `dark-early.js` still loads at `document_start`
- content modules load before `content.js`
- shared dependencies load before dependents
- CSS file list is correct

Check `popup.html`:

- popup modules load before `popup.js`
- cores load before popup controllers
- no stale script paths remain

## Manual Browser Smoke Test

Load the unpacked extension in the browser and test on AO3.

### Content Script

- Open an AO3 work page.
- Confirm the inline tracker control appears.
- Add the current work to For Later.
- Move it to Reading.
- Move it to Completed.
- Remove it from tracker.
- Re-add it if needed for later checks.

### AO3 Listing/Search Surfaces

- Open an AO3 listing or tag results page.
- Open the `Track` dropdown and confirm:
  - option spacing is intact
  - custom category rows keep their dot/check/label layout
  - category colors still render in default, Solarized Dark, and Solarized Light
- Open the `Hide` dropdown and confirm:
  - button size still matches the nearby `Track` pill closely
  - menu options are readable and not cut off
  - scrollbar behavior works when many options exist
- Trigger a hidden-work collapse if test data allows and confirm:
  - `Hidden due to N rule(s)` styling matches the active theme
  - `Show Hidden Tags` / `Hide Tags` works on first click
  - revealing hidden tags does not restyle nearby listing controls

### Sidebar

- Confirm the floating button appears when enabled.
- Drag the floating button and confirm position persists.
- Reset the button position from popup.
- Open the sidebar.
- Confirm AO3 page layout docks on wide viewport.
- Confirm sidebar overlays cleanly on narrow viewport.
- Search for a work.
- Switch built-in tabs.
- Switch a custom category tab if available.
- Flip a work card.
- Edit notes and rating.
- Add/remove a custom category from a work.
- Close sidebar and confirm page scroll restoration.

### Popup

- Open popup on an AO3 work page.
- Confirm current work banner appears.
- Add or move the current work from popup.
- Change library sort.
- Toggle sidebar button setting.
- Toggle AO3 theme.
- Toggle extension theme.
- Toggle theme sync.
- Open and close collapsible dashboard panels.
- Confirm Browse by… and Library Insights render without overlap.

### Data Tools

- Export JSON.
- Export CSV.
- Import a known-good JSON backup if safe for the test profile.
- Import a known-good CSV backup if safe for the test profile.
- Confirm last export timestamp updates.

### Author Watch And Bookmarks

- Confirm Author Watch section renders with no watches.
- If test data exists, refresh Author Watch.
- Open bookmark import modal.
- Confirm quick mode checkbox, fetch status, cancel/close buttons, and review state behave sensibly.

## Theme Smoke Test

Check each major surface in:

- default light
- Solarized Dark
- Solarized Light

Surfaces:

- popup dashboard
- popup modals
- sidebar panel
- sidebar cards
- notes modal
- category modal
- current work bar
- AO3 page theme switcher
- floating button
- AO3 listing/search `Track` and `Hide` dropdowns
- hidden-work banners and hidden-tag reveal controls

## Storage Safety

Before release, verify:

- existing `ao3works` data still loads
- custom categories still load
- category-only works are not deleted
- invalid works are pruned only by sanitizer rules
- author watches load and sanitize safely
- bookmark sync state remains bounded
- export/import includes new fields users expect to preserve

If a storage schema changed, update `docs/dev/storage-schema.md`.

## Accessibility Smoke Test

- Tab through popup controls.
- Tab through sidebar controls.
- Confirm icon-only buttons have labels or titles.
- Confirm collapsible controls report expanded/collapsed state.
- Confirm disabled tools look disabled.
- Confirm text does not rely on color alone.

## Packaging Notes

For Chrome:

- load the project folder as unpacked
- verify extension icon and popup load
- package from the same clean folder after checks pass

For Firefox or a copied build folder:

- copy only the intended runtime files
- verify `manifest.json` compatibility
- load the copied folder directly
- repeat a minimal popup/sidebar smoke test

## Final Release Gate

Release only when:

- syntax checks pass
- tests pass or skipped tests are explicitly justified
- manual smoke checks pass
- storage shape changes are documented
- no obvious encoding damage is visible
- version is correct
- packaged folder contains only intended files
