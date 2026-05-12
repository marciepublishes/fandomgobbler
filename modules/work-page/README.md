# Work Page Controller Module

## Purpose

This slice holds work-page and current-work controller orchestration used by the content script.

It exists to keep the current-work bar and work-page meta row behavior out of the main `content.js` runtime while preserving the same UI.

## Public API

`controller.js` currently exports:

- `initCurrentBar`
- `refreshWorkPageMetaRow`
- `injectWorkPageMetaRow`

The file exposes the API in two ways:

- `globalThis.AO3TrackerWorkPageController` for extension runtime use
- `module.exports` for Node-based regression tests

## What Belongs Here

Good candidates for this module:

- current-work bar wiring
- current-work dropdown orchestration
- work-page meta row rendering
- work-page meta row collapse behavior

## What Does Not Belong Here Yet

These still belong in the content runtime for now:

- AO3 page parsing
- global init timing
- mutation observation and rerun scheduling
- floating/sidebar shell orchestration

## Why This Slice Matters

The work-page controls are a high-touch area of the extension. Pulling their controller logic out of `content.js` makes it easier to:

- change work-page behavior without searching a giant file
- keep current-work and meta-row behavior together
- make future controller cleanup smaller and safer
