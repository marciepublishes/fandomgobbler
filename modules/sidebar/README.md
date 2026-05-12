# Sidebar Module

## Purpose

This slice holds shared sidebar presentation logic used by the content script.

It exists to keep sidebar filtering, sorting, and empty-state rules out of the already-large `content.js` runtime.

## Public API

`core.js` currently exports:

- `BUILTIN_SIDEBAR_TABS`
- `emptyMsg`
- `librarySortLabel`
- `sortWorksForSidebar`
- `buildSidebarBuckets`
- `computeSidebarViewModel`
- `buildSidebarSortIndicatorText`
- `formatWorkWordCountDisplay`

`controller.js` currently exports:

- `renderSidebar`
- `openSidebar`
- `closeSidebar`

The file exposes the API in two ways:

- `globalThis.AO3TrackerSidebarCore` for shared helper use
- `globalThis.AO3TrackerSidebarController` for content-side orchestration
- `module.exports` for Node-based regression tests

## What Belongs Here

Good candidates for this module:

- sidebar tab bucketing
- sidebar search matching
- library sort ordering
- sidebar empty-state copy
- sidebar sort-indicator copy
- sidebar word-count presentation helpers

## What Does Not Belong Here Yet

These still belong in the content runtime for now:

- card front/back markup
- lower-level event handlers attached inside card markup
- AO3 page writes and storage orchestration outside the sidebar shell
- non-sidebar page orchestration

## Why This Slice Matters

The sidebar is one of the busiest parts of the extension. Pulling both its shared view-model logic and controller orchestration into one place makes it easier to:

- change sorting without touching DOM code
- keep tab/search filtering consistent
- test sidebar behavior without booting the whole content script
- make future `content.js` extraction steps smaller and safer
