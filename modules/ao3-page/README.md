# AO3 Page Module

## Purpose

This slice holds shared AO3 page parsing helpers used by the content script.

It exists to keep work-page and listing-page extraction rules out of the already-large `content.js` runtime.

## Public API

`core.js` currently exports:

- `detectSubscribedStateFromMarkup`
- `extractBlurbTextSummary`
- `extractBlurbStatNumber`
- `extractTrackedWorkFromBlurb`
- `extractWorkInfoFromDocument`

The file exposes the API in two ways:

- `globalThis.AO3TrackerAo3PageCore` for extension runtime use
- `module.exports` for Node-based regression tests

## What Belongs Here

Good candidates for this module:

- AO3 work-page metadata parsing
- AO3 listing blurb metadata parsing
- markup-based subscription detection
- pure DOM-reading helpers

## What Does Not Belong Here Yet

These still belong in the content runtime for now:

- sidebar rendering
- in-page event wiring
- tracking state writes
- toasts and UI orchestration

## Why This Slice Matters

The AO3 DOM is one of the most fragile parts of the extension. Centralizing page parsing makes it easier to:

- update selectors safely
- test extraction logic
- avoid duplicating AO3-specific assumptions across the runtime
