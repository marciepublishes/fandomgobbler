# FandomGobbler

FandomGobbler is a local-first browser extension for managing fanfiction libraries across site-specific editions. AO3 is the most complete edition right now, FanFiction.net support is in beta, and Wattpad/Tumblr are planned but not usable yet.

This is an independent project. It is not affiliated with, endorsed by, or operated by Archive of Our Own, FanFiction.net, Chrome, Firefox, Google, or their owners.

## Version

Current build: `3.17.52`

## Product Direction

FandomGobbler is being designed as one tracker brand with multiple site editions:

- `AO3 Edition`
- `FanFiction.net Edition`
- `Wattpad Edition`
- `Tumblr Edition`

The dashboard and the tracker as a whole should adapt per edition so each site only shows compatible features, labels, parsing rules, and workflows.

The intended rule is:

- shared brand, shared design language, shared extension shell
- site-specific behavior, parsing, imports, stats, and workflow differences
- separate libraries per platform rather than one merged cross-site library

UI consistency is part of the product direction. When users switch between editions, the tracker should still feel like the same FandomGobbler product:

- reuse the same core interaction patterns across editions where possible
- keep floating button, sidebar shell, popup sections, dashboard structure, inline track controls, and listing badges visually familiar
- change parsing, compatibility, labels, and unsupported workflows per site without inventing a brand-new UI language for each edition
- prefer shared surface primitives first, then add thin platform adapters instead of building bespoke edition-only UI from scratch

Keeping the libraries separate is the preferred direction because the supported sites do not share stable IDs, metadata quality, interaction models, or equivalent features. A separated library model reduces data collisions, keeps filtering and charts honest, and lets each edition disable or replace unsupported features without muddying the user's main library.

## Platform Feature Matrix

| Feature | AO3 | FF.net beta | Wattpad | Tumblr |
|---|:---:|:---:|:---:|:---:|
| Track works from page | Yes | Yes | No | No |
| Floating in-page sidebar | Yes | Yes | No | No |
| Listing page badges | Yes | Yes | No | No |
| Work-page track controls | Yes | Yes | No | No |
| Status organizing, such as For Later and Reading | Yes | Yes | No | No |
| Custom categories | Yes | Yes | No | No |
| Notes and ratings | Yes | Yes | No | No |
| Chapter progress | Yes | Yes | No | No |
| Export/import backup | Yes | Yes | No | No |
| Dashboard edition switching | Yes | Yes | No | No |
| Sort by popularity, kudos, bookmarks, or hits | Yes | No | No | No |
| Bookmark import | Yes | No | No | No |
| Marked for Later import | Yes | No | No | No |
| Subscription refresh | Yes | No | No | No |
| Author Watch | Yes | No | No | No |
| Relationship tools and filter | Yes | No | No | No |
| AO3 theme toggle | Yes | No | No | No |
| Extension theme for sidebar, popup, and dashboard | Yes | Yes | No | No |

Wattpad and Tumblr are registered platforms with isolated storage buckets. Their content integration and platform-specific workflows are not built yet.

## Privacy

FandomGobbler stores library data locally with `chrome.storage.local` by default.

- No account system
- No developer-run remote server
- Optional Google Sheets sync writes to a spreadsheet in the user's own Google Drive
- AO3 is the most complete edition; FanFiction.net support is beta

Some features fetch AO3 pages you explicitly ask the extension to review, such as bookmark import, Marked for Later import, author watch checks, or subscription refresh. Those requests go directly to AO3. See [PRIVACY.md](PRIVACY.md) for the fuller breakdown.

## Permissions

- `storage`: saves your library, settings, notes, categories, and UI state locally
- `activeTab`: reads the current tab context so the popup can detect the work you are viewing
- `notifications`: shows extension notifications for relevant tracker events
- `identity`: supports optional Google Sheets sync
- `alarms`: supports scheduled/background extension checks
- host access for AO3, FanFiction.net, and Google OAuth/API domains: supports site integrations and optional Google Sheets sync

## Project Shape

The current build has three main user-facing surfaces:

- page integration via content scripts
- popup management via `popup.html` and `popup.js`
- full-page library dashboard via `dashboard.html` and `dashboard.js`

The codebase is organized as a modular monolith with feature slices under [`modules/`](modules/).

## Installation From Source

1. Download or clone this repository.
2. Open `chrome://extensions`.
3. Enable **Developer Mode**.
4. Click **Load unpacked**.
5. Select this folder.

## Development

This repo is intentionally simple: the extension source lives at the repo root, feature modules live in `modules/`, and regression tests live in `tests/`.

Run the test suite with:

```powershell
node --test .\tests\*.js
```

For changed JavaScript entrypoints or modules, run:

```powershell
node --check path\to\file.js
```

Generated zips and `tmp-*` publication folders are local build artifacts, not source.

## Docs

- [Architecture](docs/dev/architecture.md)
- [Popup UI Guide](docs/dev/popup-ui.md)
- [Sidebar UI Guide](docs/dev/sidebar-ui.md)
- [Dashboard UI Guide](docs/dev/dashboard-ui.md)
- [Adding a Platform](docs/dev/adding-a-platform.md)
- [Testing Guide](docs/dev/testing-guide.md)
- [Release Checklist](docs/release-checklist.md)
- [Privacy Policy](PRIVACY.md)
