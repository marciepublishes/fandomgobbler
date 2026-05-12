# Marked for Later Import Module

## Purpose

This slice holds Marked for Later import domain helpers for the popup runtime.

It mirrors the structure of `bookmark-import/` but targets AO3's Marked for Later list instead of bookmarks.

The key distinction: AO3's Marked for Later page uses `li.work.blurb.group` blurbs (standard work listing format), while bookmarks use `li.bookmark.blurb.group` (which also carries user notes and bookmark tags). Marked for Later entries have no user annotation — only standard work metadata.

## Public API

`core.js` exports:

- `normalizeMarkedForLaterSyncState` — sanitizes stored sync state
- `filterMarkedForLaterCandidates` — filters candidates by title/author/fandom
- `extractBlurbTextSummary` — parses work summary from a blurb DOM element
- `extractBlurbStatNumber` — parses a numeric stat (words, kudos, hits, bookmarks) from a blurb
- `parseMarkedForLaterEntry` — converts a single MFL work blurb DOM element into a work entry
- `parseMarkedForLaterPageDocument` — parses a full MFL page into entries and pagination info
- `mergeKnownMarkedForLaterWorkIds` — deduped merge of known work id arrays, capped at 5000
- `buildTrackedWorkFromMarkedForLaterEntry` — maps an MFL entry into a tracked work record

Both `globalThis.AO3TrackerMarkedForLaterImportCore` (popup runtime) and `module.exports` (Node tests) are exposed.

`popup-controller.js` owns popup-specific MFL import orchestration:

- modal rendering
- fetch pacing and throttling with backoff
- resume and cancel state handling
- import button behavior
- review filtering and import execution

Context getter/setter keys: `getMflImportState` / `setMflImportState`, `getMflSyncState` / `setMflSyncState`.

## What Belongs Here

- MFL page parsing
- candidate filtering
- MFL sync-state normalization
- mapping MFL entries into tracked-work records

## What Does Not Belong Here

- cross-feature popup layout
- shared popup helper functions
- toast presentation

## Differences from Bookmark Import

| Concern | Bookmark Import | Marked for Later Import |
| --- | --- | --- |
| AO3 URL pattern | `/users/[name]/bookmarks` | `/users/[name]/readings?show=to-read` |
| Blurb selector | `li.bookmark.blurb.group` | `li.work.blurb.group` |
| User notes | Yes (extracted from bookmark annotation) | No (MFL has no user annotations) |
| Default import status | `completed` | `want` (For Later) |
| Storage key constant | `BOOKMARK_SYNC_KEY` | `MARKED_FOR_LATER_SYNC_KEY` |
| Global namespace | `AO3TrackerBookmarkImportCore` | `AO3TrackerMarkedForLaterImportCore` |
| Modal element ID prefix | `bookmark` | `mfl` |
| CSS class prefix (selects) | `bookmark-import-select` | `mfl-import-select` |
