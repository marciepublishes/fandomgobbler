# Bookmark Import Module

## Purpose

This slice holds bookmark import domain helpers for the popup runtime.

It exists to keep bookmark parsing, candidate shaping, and import-mapping rules out of the popup UI code.

## Public API

`core.js` currently exports:

- `normalizeBookmarkSyncState`
- `filterBookmarkCandidates`
- `extractBlurbTextSummary`
- `extractBookmarkNotes`
- `buildImportedBookmarkNotes`
- `extractBlurbStatNumber`
- `parseBookmarkEntry`
- `parseBookmarkPageDocument`
- `mergeKnownBookmarkWorkIds`
- `buildTrackedWorkFromBookmarkEntry`

The file exposes the API in two ways:

- `globalThis.AO3TrackerBookmarkImportCore` for popup runtime use
- `module.exports` for Node-based regression tests

`popup-controller.js` now owns popup-specific bookmark import orchestration:

- modal rendering
- fetch pacing and throttling
- resume and cancel state handling
- import button behavior
- bookmark review filtering and import execution

## What Belongs Here

Good candidates for this module:

- bookmark page parsing
- bookmark notes and tags shaping
- candidate filtering
- bookmark sync-state normalization
- mapping bookmark entries into tracked-work records

## What Does Not Belong Here Yet

These still belong in the popup runtime for now:

- cross-feature popup layout
- button copy outside the bookmark feature
- shared popup helper functions
- toast presentation

## Why This Slice Matters

Bookmark import now has enough behavior to deserve its own boundary:

- logged-in bookmark discovery
- private bookmark note/tag carryover
- quick fetch filtering
- tracked-work creation rules

Keeping those rules together makes future changes much safer.
