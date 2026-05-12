# Author Watches Module

## Purpose

This slice holds shared Author Watches domain helpers used by both the popup and the content script.

It exists to keep Author Watches rules out of the large runtime entrypoints where possible.

## Public API

`core.js` currently exports:

- `normalizeAuthorWatchUrl`
- `normalizeWatchFandom`
- `buildAuthorWatchFeedUrl`
- `sanitizeAuthorWatchesMap`
- `sanitizeAuthorWatchMatches`
- `sanitizeFetchedAo3Html`
- `looksLikeAo3BotBlock`
- `extractWorkIdFromUrl`

The file exposes the API in two ways:

- `globalThis.AO3TrackerAuthorWatchCore` for extension runtime use
- `module.exports` for Node-based regression tests

`popup-controller.js` now owns popup-specific Author Watches orchestration:

- section rendering
- current-work watch creation UI
- saved-watch actions
- manual refresh flow
- popup-side AO3 fetch pacing for author watch refreshes

## What Belongs Here

Good candidates for this module:

- pure normalization helpers
- cross-runtime sanitization rules
- dedupe rules
- AO3 fetch-response safety helpers
- shared author-feed URL shaping so refreshes check posted-date order instead of resurfaced updates

## What Does Not Belong Here Yet

These still belong in the runtimes for now:

- content-script sidebar rendering
- storage orchestration
- cross-feature popup layout
- toast and notification behavior

## Storage Keys Used By This Feature

The Author Watches feature currently relies on:

- `ao3tracker_author_watches`
- `ao3tracker_author_watch_matches`
- `ao3tracker_author_watch_auto_day`
- `ao3tracker_author_watch_auto_lock`

This module should know the shape of Author Watches data, but not when the runtimes decide to read or write those keys.
