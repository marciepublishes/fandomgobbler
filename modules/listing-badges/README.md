# Listing Badges Module

## Purpose

This slice holds shared logic for AO3 search/listing badge behavior used by the content script.

It exists to keep listing-page badge labels, dataset shaping, chapter-pill metadata, and work-id extraction out of the already-large `content.js` runtime.

## Public API

`core.js` currently exports:

- `LISTING_BLURB_SELECTOR`
- `STATUS_LABELS`
- `STATUS_OPTIONS`
- `extractWorkIdFromListingBlurb`
- `buildListingCustomCatsKey`
- `getListingStatusLabel`
- `buildListingBadgeText`
- `getListingChapterProgressMeta`
- `buildListingBadgeDataset`
- `matchesListingBadgeDataset`

`controller.js` currently exports:

- `injectSearchBadges`

The file exposes the API in two ways:

- `globalThis.AO3TrackerListingBadgeCore` for shared helper use
- `globalThis.AO3TrackerListingBadgeController` for content-side orchestration
- `module.exports` for Node-based regression tests

## What Belongs Here

Good candidates for this module:

- listing blurb work-id extraction
- search/listing badge labels and dropdown status options
- badge dataset shaping for stale-DOM detection
- chapter-progress link metadata for listing pills
- other pure or DOM-reading helpers specific to listing badges

## What Does Not Belong Here Yet

These still belong in the content runtime for now:

- higher-level init timing and mutation observation
- storage listeners that decide when to rerun listing injection
- non-listing AO3 page orchestration

## Why This Slice Matters

The listing/search badge flow is one of the busiest interaction paths in the extension. Centralizing both the shared helpers and the DOM/event controller makes it easier to:

- keep tracked and untracked badge behavior consistent
- reduce stale-DOM bugs during rerenders
- test listing logic without booting the full content script
- keep future listing-page refactors smaller and safer
