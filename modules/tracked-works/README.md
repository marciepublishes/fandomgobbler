# Tracked Works Module

## Purpose

This slice holds shared tracked-work domain rules used by both the popup and the content script.

It exists to keep the extension's work validity and normalization behavior consistent across both runtimes.

## Public API

`core.js` currently exports:

- `BUILTIN_STATUSES`
- `normalizeStatusValue`
- `hasCustomCategories`
- `isTrackedWorkValid`
- `nextFinishedAt`
- `getRestoreStatus`
- `pruneTrackedWorkIfInvalid`
- `sanitizeTrackedWorksMap`

The file exposes the API in two ways:

- `globalThis.AO3TrackerTrackedWorkCore` for extension runtime use
- `module.exports` for Node-based regression tests

## What Belongs Here

Good candidates for this module:

- status normalization
- tracked-work validity rules
- shared finished-date transition rules
- restoration defaults for deleted/lost works
- storage sanitization for tracked works

## What Does Not Belong Here Yet

These still belong in the runtimes for now:

- popup rendering and card layout
- sidebar rendering and listing badges
- toast copy
- event wiring
- AO3 page parsing for work metadata

## Why This Slice Matters

Both runtimes read and write the same tracked-work records. If they drift, users can end up with:

- works silently dropped
- mismatched status handling
- different defaults for category-only tracked works
- inconsistent completion-date behavior

This module keeps those rules consistent in one place.
