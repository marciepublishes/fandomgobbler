# Storage Schema

## Purpose

FandomGobbler is local-first. User data lives in `chrome.storage.local`, with one localStorage key used for early dark-mode boot and one sessionStorage key used for temporary export-reminder dismissal.

Use this document when changing:

- stored data fields
- import/export formats
- sanitizers
- storage migrations
- popup/content synchronization
- feature controllers that read or write user state

The canonical storage key constants live in `modules/storage-keys/index.js`.

## Multi-Platform Direction

FandomGobbler is intended to support multiple fanfiction sites through separate editions:

- AO3 Edition
- FFNet Edition
- Wattpad Edition
- Tumblr Edition

The preferred storage direction is separate libraries per platform, not one merged cross-site library.

Why this matters:

- site ids are not interchangeable
- metadata completeness differs by platform
- some features are AO3-specific and should not contaminate other editions
- charts, filters, and sort behavior are more trustworthy when calculated inside one platform library at a time

Future storage work should therefore prefer platform-aware keys, nested platform buckets, or an equivalent migration path that preserves clear library separation.

The dashboard now follows that direction for tracked works storage selection:

| Edition | Storage key |
| --- | --- |
| AO3 Edition | `ao3works` |
| FFNet Edition | `fandomgobbler_ffnet_works` |
| Wattpad Edition | `fandomgobbler_wattpad_works` |
| Tumblr Edition | `fandomgobbler_tumblr_works` |

These keys are not constants in `modules/storage-keys/index.js`. They are defined inside `modules/platforms/core.js` under each platform's `worksStorageKey` field and accessed at runtime through `PlatformsCore.getWorksStorageKey(platformId)`. When adding a new platform, define its storage key there, not in the storage-keys module.

## Storage Rules

Storage changes should be conservative.

- Keep existing user data readable.
- Normalize and sanitize on load before writing back.
- Prefer adding optional fields over changing meanings of existing fields.
- Store timestamps as millisecond epoch numbers unless an existing field uses another format.
- Store work ids as strings.
- Store maps as plain objects keyed by id.
- Store user-entered text as plain strings.
- Keep derived or cache-like data rebuildable where possible.
- Update tests when changing sanitizer behavior.

## Key Summary

| Constant | Stored key | Storage | Shape |
| --- | --- | --- | --- |
| none | `ao3works` | `chrome.storage.local` | map of tracked works by work id |
| none | `ao3customcats` | `chrome.storage.local` | map of custom categories by category id |
| `AO3_PAGE_THEME_KEY` | `ao3tracker_theme` | `chrome.storage.local` | theme string |
| `EXTENSION_THEME_KEY` | `ao3tracker_extension_theme` | `chrome.storage.local` | theme string |
| `THEME_SYNC_KEY` | `ao3tracker_theme_sync` | `chrome.storage.local` | boolean |
| `FFNET_SIDEBAR_THEME_KEY` | `fandomgobbler_ffnet_sidebar_theme` | `chrome.storage.local` | FF.net sidebar-only theme string |
| `DASHBOARD_PLATFORM_KEY` | `fandomgobbler_platform` | `chrome.storage.local` | selected edition id |
| `LIBRARY_SORT_KEY` | `ao3tracker_library_sort` | `chrome.storage.local` | sort key string |
| `AUTHOR_WATCHES_KEY` | `ao3tracker_author_watches` | `chrome.storage.local` | map of author watches |
| `AUTHOR_WATCH_MATCHES_KEY` | `ao3tracker_author_watch_matches` | `chrome.storage.local` | array of author watch matches |
| `AUTHOR_WATCH_AUTO_DAY_KEY` | `ao3tracker_author_watch_auto_day` | `chrome.storage.local` | local day string |
| `AUTHOR_WATCH_AUTO_LOCK_KEY` | `ao3tracker_author_watch_auto_lock` | `chrome.storage.local` | lock timestamp or token |
| `LAST_EXPORT_KEY` | `ao3tracker_last_export` | `chrome.storage.local` | timestamp |
| `FAB_POSITION_KEY` | `ao3tracker_fab_position` | `chrome.storage.local` | floating button position object |
| `AO3_FLOATING_KEY` | `ao3tracker_floating` | `chrome.storage.local` | boolean |
| `WORK_META_COLLAPSE_KEY` | `ao3tracker_workmeta_collapsed` | `chrome.storage.local` | boolean |
| `BOOKMARK_SYNC_KEY` | `ao3tracker_bookmark_sync` | `chrome.storage.local` | bookmark sync state |
| `MARKED_FOR_LATER_SYNC_KEY` | `ao3tracker_marked_for_later_sync` | `chrome.storage.local` | marked for later sync state |
| `AO3_PAGE_DARK_KEY` | `ao3_page_dark` | `chrome.storage.local` | legacy/compat dark flag |
| `AO3_DARK_LS_KEY` | `ao3tracker_dark` | `localStorage` | early dark-mode flag |
| `EXPORT_BANNER_DISMISS_SESSION` | `aot_export_reminder_dismissed` | `sessionStorage` | session-only dismissal flag |

## `ao3works`

`ao3works` is a plain object keyed by AO3 work id.

This is the current AO3-specific implementation, not the long-term final storage shape for every edition. As multi-platform support is added, avoid treating `ao3works` as the permanent universal library bucket.

```js
{
  "123456": {
    id: "123456",
    title: "Work title",
    author: "Author",
    authorUrl: "https://archiveofourown.org/users/name",
    url: "https://archiveofourown.org/works/123456",
    status: "progress",
    customCats: ["cat-..."],
    addedAt: 1710000000000,
    movedAt: 1710000000000
  }
}
```

### Required After Sanitization

The tracked-work sanitizer in `modules/tracked-works/core.js` ensures:

- `id` is a non-empty string, falling back to the map key
- `status` is a known built-in status or an empty string
- `customCats` is an array of unique non-empty strings
- `title` is a non-empty string
- `author` is a non-empty string
- `authorUrl` is a string or `null`
- `url` is a non-empty string when possible

A work is valid if it has either a built-in status or at least one custom category. Statusless, uncategorized works should be pruned.

### Built-In Status Values

Valid statuses are:

- `want`
- `progress`
- `completed`
- `rereading`
- `onhold`
- `dnf`
- `lost`

An empty status is allowed only when the work belongs to one or more custom categories.

### Common Work Fields

Tracked works may include:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | AO3 work id; should match the map key |
| `title` | string | display title |
| `author` | string | display author |
| `authorUrl` | string or null | AO3 author URL when known |
| `url` | string | Work URL. Must always point to chapter 1 (or the base work URL), never a mid-chapter URL. For FFNet this means the `/s/{id}/1/{slug}` form. Normalised at parse time in `ffnet/core.js` and at load time via `normalizeFFNetWorkUrls` in `dashboard.js`. |
| `status` | string | built-in status or empty string |
| `customCats` | string array | custom category ids |
| `summary` | string | AO3 summary when captured |
| `notes` | string | user notes |
| `rating` | number | user rating, generally 1 through 5 |
| `fandoms` | string array | captured AO3 fandom tags |
| `relationship` | string | primary relationship tag when captured |
| `seriesTitle` | string | series title when captured |
| `seriesUrl` | string or null | series URL when captured |
| `seriesPosition` | string | series position text |
| `wordCount` | number or null | AO3 word count |
| `kudosCount` | number or null | AO3 kudos count |
| `bookmarksCount` | number or null | AO3 bookmark count |
| `hitsCount` | number or null | AO3 hit count |
| `updatedAt` | number or null | AO3 updated timestamp when parsed |
| `publishedAt` | number or null | AO3 published timestamp when parsed |
| `completedAt` | number or null | AO3 completion timestamp when parsed |
| `inferredCompletedAt` | number or null | inferred completion timestamp |
| `subscribedAtAo3` | boolean or null | AO3 subscription status when known |
| `addedAt` | number | timestamp added to tracker |
| `movedAt` | number | timestamp of last status/category move |
| `finishedAt` | number or null | stamped when newly moved to completed |
| `furthestChapter` | object | saved chapter progress |
| `lostFrom` | string | previous status before `lost` |
| `lostAt` | number | timestamp when detected unavailable |

### `furthestChapter`

`furthestChapter` stores reading progress for chaptered works.

Expected shape:

```js
{
  id: "987654",
  num: 4,
  total: 12,
  title: "Chapter title"
}
```

Only `num` is expected everywhere. `id`, `total`, and `title` should be treated as optional.

## `ao3customcats`

`ao3customcats` is a plain object keyed by category id.

```js
{
  "cat-1710000000000-abcd": {
    id: "cat-1710000000000-abcd",
    name: "Favorites",
    color: "#7c3aed",
    createdAt: 1710000000000
  }
}
```

Expected fields:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | category id |
| `name` | string | user-visible category name |
| `color` | string | hex color |
| `createdAt` | number | creation timestamp when available |

Category ids are referenced by `work.customCats`.

## Author Watches

`ao3tracker_author_watches` is a map keyed by watch id.

```js
{
  "watch-id": {
    id: "watch-id",
    author: "Author",
    authorUrl: "https://archiveofourown.org/users/name",
    fandom: "Fandom Name",
    fandomKey: "fandom name",
    fandomId: "801274",
    knownWorkIds: ["123456"],
    createdAt: 1710000000000,
    lastCheckedAt: 1710000000000,
    baselineReady: true
  }
}
```

The sanitizer in `modules/author-watches/core.js`:

- normalizes `authorUrl`
- trims `author` and `fandom`
- computes lowercase `fandomKey`
- normalizes optional numeric `fandomId`
- deduplicates `knownWorkIds`
- drops incomplete watches
- defaults `createdAt`
- normalizes `lastCheckedAt`
- normalizes `baselineReady`

`fandomId` is optional and may be empty for older watches or failed lookups. When present, Author Watch can open the author's works filtered to the watched fandom with AO3's `fandom_id` query parameter.

## Author Watch Matches

`ao3tracker_author_watch_matches` is an array sorted newest first and capped at 100 items.

```js
[
  {
    id: "watch-id:123456",
    watchId: "watch-id",
    workId: "123456",
    title: "New work",
    url: "https://archiveofourown.org/works/123456",
    author: "Author",
    fandom: "Fandom Name",
    foundAt: 1710000000000
  }
]
```

Invalid or duplicate matches are dropped by `sanitizeAuthorWatchMatches`.

## Bookmark Sync State

`ao3tracker_bookmark_sync` tracks known bookmark work ids so quick bookmark fetches can skip older known items.

```js
{
  knownWorkIds: ["123456", "789012"],
  lastFetchedAt: 1710000000000
}
```

The bookmark sync sanitizer:

- converts ids to non-empty strings
- deduplicates ids
- keeps only the last 5000 ids
- normalizes `lastFetchedAt` to a timestamp or `null`

## Marked for Later Sync State

`ao3tracker_marked_for_later_sync` tracks known work ids from the user's AO3 Marked for Later list so quick fetches can skip already-seen items.

```js
{
  knownWorkIds: ["123456", "789012"],
  lastFetchedAt: 1710000000000
}
```

The sync sanitizer (same rules as bookmark sync):

- converts ids to non-empty strings
- deduplicates ids
- keeps only the last 5000 ids
- normalizes `lastFetchedAt` to a timestamp or `null`

## Theme And UI Settings

Theme values currently use:

- `light`
- `dark`
- `sol-light`

Settings:

- `ao3tracker_theme`: AO3 page theme preference
- `ao3tracker_extension_theme`: popup/extension theme preference
- `ao3tracker_theme_sync`: `true` unless explicitly set to `false`
- `ao3tracker_floating`: floating sidebar button enabled unless explicitly set to `false`
- `ao3tracker_fab_position`: persisted floating button position
- `ao3tracker_library_sort`: selected sort key, defaulting to `recently-added`
- `ao3tracker_workmeta_collapsed`: work-page meta row collapsed state

## Export Reminder State

`ao3tracker_last_export` stores the last successful export timestamp.

`aot_export_reminder_dismissed` lives in `sessionStorage`, not `chrome.storage.local`, so dismissal only lasts for the current browser session.

## Migration And Sanitization Checklist

When changing storage:

1. Add or update constants in `modules/storage-keys/index.js` when the key is shared.
2. Add sanitizer logic in a core module when possible.
3. Preserve old fields unless they are unsafe.
4. Keep defaults conservative.
5. Write a regression test for malformed, missing, and legacy data.
6. Ensure import/export preserves the new field if users expect backup/restore.
7. Update this document.
