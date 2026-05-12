// FandomGobbler Sheets Sync Engine.
// Runs in both the popup page and the background service worker.
// Local chrome.storage.local is always the source of truth.
// Google Sheets is the sync layer: pull → merge → push on each sync cycle.
// Depends on: FGSheetsAuth, FGSheetsAPI, FGSheetsSchema (load in that order).
(function (global) {
  'use strict';

  // Injected via init(); these are the storage key strings.
  let _k = {};

  function init(keys) { _k = keys || {}; }

  // ── Storage helpers ──────────────────────────────────────────────────────────

  function sGet(key) {
    return new Promise(resolve => {
      try {
        chrome.storage.local.get(key, d => resolve(d[key] !== undefined ? d[key] : null));
      } catch (e) { resolve(null); }
    });
  }

  function sSet(obj) {
    return new Promise(resolve => {
      try { chrome.storage.local.set(obj, resolve); }
      catch (e) { resolve(); }
    });
  }

  function sGetMany(keys) {
    return new Promise(resolve => {
      try { chrome.storage.local.get(keys, d => resolve(d || {})); }
      catch (e) { resolve({}); }
    });
  }

  // ── Status helpers ────────────────────────────────────────────────────────────

  async function getSyncStatus() {
    return (await sGet(_k.SHEETS_SYNC_STATUS_KEY)) || { state: 'idle', message: '', lastSyncedAt: null };
  }

  async function setStatus(state, message, lastSyncedAt) {
    const prev = await getSyncStatus();
    await sSet({
      [_k.SHEETS_SYNC_STATUS_KEY]: {
        state,
        message: message || '',
        lastSyncedAt: lastSyncedAt !== undefined ? lastSyncedAt : prev.lastSyncedAt
      }
    });
  }

  // ── Works storage per platform ────────────────────────────────────────────────

  const S = () => global.FGSheetsSchema;

  function worksKey(platform) {
    const map = S().PLATFORM_WORKS_KEY;
    return map[platform] || map.ao3;
  }

  async function getLocalWorks(platform) {
    return (await sGet(worksKey(platform))) || {};
  }

  async function getLocalCustomCats(platform) {
    const key = platform === 'ffnet' ? 'fandomgobbler_ffnet_customcats' : 'ao3customcats';
    return (await sGet(key)) || {};
  }

  async function setLocalWorks(platform, works) {
    await sSet({ [worksKey(platform)]: works });
  }

  async function getPendingTombstones() {
    return (await sGet(_k.SHEETS_PENDING_TOMBSTONES_KEY)) || {};
  }

  // ── Token acquisition ─────────────────────────────────────────────────────────

  const Auth = () => global.FGSheetsAuth;
  const API  = () => global.FGSheetsAPI;

  async function acquireToken(interactive) {
    try {
      return await Auth().getToken(!!interactive);
    } catch (err) {
      const authErr = err.message === 'AUTH_NEEDED' || err.message === 'AUTH_CANCELLED'
        || err.message === 'OAUTH_NOT_CONFIGURED';
      const statusState = err.message === 'OAUTH_NOT_CONFIGURED'
        ? 'not_configured'
        : (authErr ? 'auth_needed' : 'error');
      const msg = err.message === 'OAUTH_NOT_CONFIGURED'
        ? 'Google Sheets sync requires OAuth setup. See instructions.'
        : (authErr ? 'Sign in to Google to enable sync.' : `Auth error: ${err.message}`);
      await setStatus(statusState, msg, null);
      throw err;
    }
  }

  // ── Spreadsheet lifecycle ─────────────────────────────────────────────────────

  async function createFreshSpreadsheet(token) {
    const { SPREADSHEET_TITLE, SHEET_NAMES, WORK_COLUMNS, DELETION_COLUMNS, META_COLUMNS, PRETTY_DESKTOP_COLUMNS, PRETTY_MOBILE_COLUMNS } = S();
    const sheetOrder = [
      SHEET_NAMES.META,
      SHEET_NAMES.AO3,
      SHEET_NAMES.FFNET,
      SHEET_NAMES.DELETIONS,
      SHEET_NAMES.PRETTY_DESKTOP,
      SHEET_NAMES.PRETTY_MOBILE
    ];

    const spreadsheet = await API().createSpreadsheet(token, SPREADSHEET_TITLE, sheetOrder);
    const spreadsheetId = spreadsheet.spreadsheetId;

    // Build sheetId map from response
    const sheetIdMap = {};
    (spreadsheet.sheets || []).forEach(s => {
      sheetIdMap[s.properties.title] = s.properties.sheetId;
    });

    const { colLetter } = API();
    const workEnd = colLetter(WORK_COLUMNS.length);

    // Write all header rows in one batch
    await API().batchUpdateValues(token, spreadsheetId, [
      { range: `${SHEET_NAMES.META}!A1:B1`,       values: [META_COLUMNS] },
      { range: `${SHEET_NAMES.AO3}!A1:${workEnd}1`,   values: [WORK_COLUMNS] },
      { range: `${SHEET_NAMES.FFNET}!A1:${workEnd}1`,  values: [WORK_COLUMNS] },
      { range: `${SHEET_NAMES.DELETIONS}!A1:D1`,   values: [DELETION_COLUMNS] },
      { range: `${SHEET_NAMES.PRETTY_DESKTOP}!A1:${API().colLetter(PRETTY_DESKTOP_COLUMNS.length)}1`, values: [PRETTY_DESKTOP_COLUMNS] },
      { range: `${SHEET_NAMES.PRETTY_MOBILE}!A1:${API().colLetter(PRETTY_MOBILE_COLUMNS.length)}1`, values: [PRETTY_MOBILE_COLUMNS] }
    ]);

    // Seed _Meta
    const ownerEmail = await Auth().getUserEmail(token).catch(() => '');
    const now = Date.now();
    const metaRows = [
      ['schemaVersion', S().SCHEMA_VERSION],
      ['extensionVersion', (chrome.runtime.getManifest().version || '')],
      ['createdAt', now],
      ['lastSyncedAt', now],
      ['ownerEmail', ownerEmail]
    ];
    await API().batchUpdateValues(token, spreadsheetId, [
      { range: `${SHEET_NAMES.META}!A2:B${1 + metaRows.length}`, values: metaRows }
    ]);

    // Protect + freeze header rows (best-effort; don't abort setup on failure)
    const headerDesc = 'FandomGobbler auto-managed — editing this row will break sync';
    for (const name of [SHEET_NAMES.AO3, SHEET_NAMES.FFNET, SHEET_NAMES.DELETIONS, SHEET_NAMES.PRETTY_DESKTOP, SHEET_NAMES.PRETTY_MOBILE]) {
      const sid = sheetIdMap[name];
      if (sid != null) {
        await API().protectHeaderRow(token, spreadsheetId, sid, headerDesc).catch(() => {});
        await API().freezeHeaderRow(token, spreadsheetId, sid).catch(() => {});
      }
    }

    await sSet({
      [_k.SHEETS_SPREADSHEET_ID_KEY]:  spreadsheetId,
      [_k.SHEETS_OWNER_EMAIL_KEY]:      ownerEmail
    });

    return { spreadsheetId, ownerEmail };
  }

  // Verifies the spreadsheet still exists and has the expected tabs.
  // Returns { ok: true } or { ok: false, reason: 'NOT_FOUND' | 'OTHER' }.
  const LEGACY_PRETTY_SHEET_NAMES = ['Pretty Sheets - Desktop', 'Pretty Sheets - Mobile'];

  async function verifySpreadsheet(token, spreadsheetId) {
    try {
      const meta = await API().getSpreadsheetMeta(token, spreadsheetId);
      const existingTitles = new Set((meta.sheets || []).map(s => s.properties.title));
      const { SHEET_NAMES, WORK_COLUMNS, DELETION_COLUMNS, META_COLUMNS, PRETTY_DESKTOP_COLUMNS, PRETTY_MOBILE_COLUMNS } = S();
      const allTabs = Object.values(SHEET_NAMES);
      const missing = allTabs.filter(t => !existingTitles.has(t));

      if (missing.length) {
        // Add missing tabs silently — user might have deleted one by mistake
        await API().addSheets(token, spreadsheetId, missing).catch(() => {});
        const { colLetter } = API();
        const workEnd = colLetter(WORK_COLUMNS.length);
        const toHeader = [];
        if (missing.includes(SHEET_NAMES.AO3))
          toHeader.push({ range: `${SHEET_NAMES.AO3}!A1:${workEnd}1`, values: [WORK_COLUMNS] });
        if (missing.includes(SHEET_NAMES.FFNET))
          toHeader.push({ range: `${SHEET_NAMES.FFNET}!A1:${workEnd}1`, values: [WORK_COLUMNS] });
        if (missing.includes(SHEET_NAMES.DELETIONS))
          toHeader.push({ range: `${SHEET_NAMES.DELETIONS}!A1:D1`, values: [DELETION_COLUMNS] });
        if (missing.includes(SHEET_NAMES.META))
          toHeader.push({ range: `${SHEET_NAMES.META}!A1:B1`, values: [META_COLUMNS] });
        if (missing.includes(SHEET_NAMES.PRETTY_DESKTOP))
          toHeader.push({ range: `${SHEET_NAMES.PRETTY_DESKTOP}!A1:${colLetter(PRETTY_DESKTOP_COLUMNS.length)}1`, values: [PRETTY_DESKTOP_COLUMNS] });
        if (missing.includes(SHEET_NAMES.PRETTY_MOBILE))
          toHeader.push({ range: `${SHEET_NAMES.PRETTY_MOBILE}!A1:${colLetter(PRETTY_MOBILE_COLUMNS.length)}1`, values: [PRETTY_MOBILE_COLUMNS] });
        if (toHeader.length) await API().batchUpdateValues(token, spreadsheetId, toHeader).catch(() => {});
      }

      await deleteLegacyPrettySheets(token, spreadsheetId, meta);

      return { ok: true };
    } catch (err) {
      if (err.status === 404 || err.status === 403) {
        return { ok: false, reason: err.status === 404 ? 'NOT_FOUND' : 'PERMISSION_DENIED' };
      }
      throw err;
    }
  }

  async function deleteLegacyPrettySheets(token, spreadsheetId, meta) {
    if (typeof API().batchUpdate !== 'function') return;
    const requests = (meta?.sheets || [])
      .filter(sheet => LEGACY_PRETTY_SHEET_NAMES.includes(sheet?.properties?.title))
      .map(sheet => sheet.properties.sheetId)
      .filter(sheetId => sheetId != null)
      .map(sheetId => ({ deleteSheet: { sheetId } }));
    if (requests.length) await API().batchUpdate(token, spreadsheetId, requests).catch(() => {});
  }

  function hasRequiredSyncSheets(meta) {
    const { SHEET_NAMES } = S();
    const existingTitles = new Set((meta?.sheets || []).map(s => s.properties?.title).filter(Boolean));
    return [
      SHEET_NAMES.META,
      SHEET_NAMES.AO3,
      SHEET_NAMES.FFNET,
      SHEET_NAMES.DELETIONS
    ].every(title => existingTitles.has(title));
  }

  async function findExistingSpreadsheet(token) {
    if (typeof API().findSpreadsheetsByTitle !== 'function') return null;
    const result = await API().findSpreadsheetsByTitle(token, S().SPREADSHEET_TITLE).catch(() => null);
    const candidates = Array.isArray(result?.files) ? result.files : [];
    for (const file of candidates) {
      const spreadsheetId = file && file.id;
      if (!spreadsheetId) continue;
      const meta = await API().getSpreadsheetMeta(token, spreadsheetId).catch(() => null);
      if (meta && hasRequiredSyncSheets(meta)) return { spreadsheetId };
    }
    return null;
  }

  // ── Remote read ───────────────────────────────────────────────────────────────

  async function readAllRemote(token, spreadsheetId) {
    const { SHEET_NAMES, WORK_COLUMNS, DELETION_COLUMNS } = S();
    const { colLetter } = API();
    const workEnd = colLetter(WORK_COLUMNS.length);

    const result = await API().batchGetValues(token, spreadsheetId, [
      `${SHEET_NAMES.AO3}!A1:${workEnd}`,
      `${SHEET_NAMES.FFNET}!A1:${workEnd}`,
      `${SHEET_NAMES.DELETIONS}!A1:D`
    ]);

    const vr = result.valueRanges || [];
    const ao3Raw   = vr[0] ? (vr[0].values || []) : [];
    const ffnetRaw = vr[1] ? (vr[1].values || []) : [];
    const delRaw   = vr[2] ? (vr[2].values || []) : [];

    // Header row from the sheet (may differ from WORK_COLUMNS on old installs)
    const ao3Headers   = ao3Raw[0]   || WORK_COLUMNS;
    const ffnetHeaders = ffnetRaw[0] || WORK_COLUMNS;

    const ao3Works   = parseWorkRows(ao3Raw.slice(1),   ao3Headers);
    const ffnetWorks = parseWorkRows(ffnetRaw.slice(1), ffnetHeaders);
    const deletions  = parseDeletionRows(delRaw.slice(1));

    return { ao3Works, ffnetWorks, deletions };
  }

  function parseWorkRows(rows, headers) {
    const out = {};
    rows.forEach(row => {
      if (!Array.isArray(row) || !row.length) return;
      const work = S().deserializeWork(row, headers);
      if (work && work.workId) out[work.workId] = work;
    });
    return out;
  }

  function parseDeletionRows(rows) {
    const out = {};
    rows.forEach(row => {
      const d = S().deserializeDeletion(row);
      if (d && d.workId) out[d.workId] = d;
    });
    return out;
  }

  // ── Merge logic ───────────────────────────────────────────────────────────────
  //
  // Strategy: last-write-wins on lastModifiedAt.
  // A tombstone (deletion record) beats any remote version whose lastModifiedAt
  // is older than the deletion timestamp.

  function mergeWorks(localWorks, remoteWorks, deletions) {
    const merged = Object.assign({}, localWorks);
    const localUpdates = {}; // remote → local (works added or updated from remote)

    for (const [id, remote] of Object.entries(remoteWorks)) {
      const deletion = deletions[id];
      const remoteTs = remote.lastModifiedAt || 0;

      // If there's a tombstone for this ID that's newer than the remote copy,
      // the user deleted it after this version was written — keep it deleted.
      if (deletion && deletion.deletedAt > remoteTs) continue;

      const local = localWorks[id];
      if (!local) {
        // New work from another device — add it locally
        merged[id] = remote;
        localUpdates[id] = remote;
      } else {
        const localTs = local.lastModifiedAt
          || Math.max(local.movedAt || 0, local.addedAt || 0);
        if (remoteTs > localTs) {
          // Remote is newer — adopt it
          merged[id] = remote;
          localUpdates[id] = remote;
        }
        // else: local is same-age or newer — local wins, will be pushed
      }
    }

    // Every local work not in remote needs to be pushed
    const needsPush = new Set();
    for (const id of Object.keys(localWorks)) {
      const local = localWorks[id];
      const remote = remoteWorks[id];
      if (!remote) {
        needsPush.add(id);
      } else {
        const localTs = local.lastModifiedAt
          || Math.max(local.movedAt || 0, local.addedAt || 0);
        const remoteTs = remote.lastModifiedAt || 0;
        if (localTs >= remoteTs && !localUpdates[id]) {
          needsPush.add(id); // local same-age or newer → push
        }
      }
    }

    return { merged, localUpdates, needsPush: [...needsPush] };
  }

  // ── Remote write ──────────────────────────────────────────────────────────────
  //
  // We rewrite the entire data section of a sheet on each sync.
  // This is the most reliable approach — no row-by-row position tracking needed.
  // Performance: a 1000-row × 33-col sheet is ~200KB per write, well within limits.

  async function rewriteSheetData(token, spreadsheetId, sheetName, works) {
    const { WORK_COLUMNS } = S();
    const { colLetter } = API();
    const endCol = colLetter(WORK_COLUMNS.length);

    // Always write current header row (handles schema column additions)
    await API().batchUpdateValues(token, spreadsheetId, [
      { range: `${sheetName}!A1:${endCol}1`, values: [WORK_COLUMNS] }
    ]);

    // Clear old data rows
    await API().clearRange(token, spreadsheetId, `${sheetName}!A2:${endCol}`);

    if (!works.length) return;

    const rows = works.map(w => S().serializeWork(w));
    await API().batchUpdateValues(token, spreadsheetId, [{
      range: `${sheetName}!A2:${endCol}${1 + rows.length}`,
      values: rows
    }]);
  }

  const STATUS_LABELS = {
    want: 'For Later',
    progress: 'Reading',
    completed: 'Completed',
    rereading: 'Re-reading',
    onhold: 'On Hold',
    dnf: 'Did Not Finish',
    lost: 'Deleted'
  };

  const STATUS_COLORS = {
    want: { red: 0.96, green: 0.94, blue: 1 },
    progress: { red: 0.93, green: 0.99, blue: 1 },
    completed: { red: 0.93, green: 0.99, blue: 0.96 },
    rereading: { red: 1, green: 0.98, blue: 0.92 },
    onhold: { red: 0.94, green: 0.98, blue: 1 },
    dnf: { red: 0.97, green: 0.98, blue: 0.99 },
    lost: { red: 1, green: 0.95, blue: 0.96 }
  };

  function formatDate(ts) {
    const n = Number(ts) || 0;
    if (!n) return '';
    const d = new Date(n);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  }

  function formatNumber(value) {
    const n = Number(value) || 0;
    return n ? n.toLocaleString('en-US') : '';
  }

  function ratingStars(value) {
    const n = Math.max(0, Math.min(5, Number(value) || 0));
    return n ? '★'.repeat(n) : '';
  }

  function joinList(value) {
    return Array.isArray(value) ? value.filter(Boolean).join(', ') : '';
  }

  function categoryNamesForWork(work, categoryMaps) {
    const maps = categoryMaps || {};
    const platform = String(work?.platform || '').toLowerCase();
    const workId = String(work?.workId || work?.id || '');
    const url = String(work?.url || '');
    const isFFNet = platform === 'ffnet' || /^ffnet-/i.test(workId) || /fanfiction\.net/i.test(url);
    const primary = isFFNet ? maps.ffnet : maps.ao3;
    const secondary = isFFNet ? maps.ao3 : maps.ffnet;
    return (Array.isArray(work.customCats) ? work.customCats : [])
      .map(catId => (primary && primary[catId] && primary[catId].name) || (secondary && secondary[catId] && secondary[catId].name) || catId)
      .filter(Boolean)
      .join(', ');
  }

  function chapterLinkForWork(work) {
    const chapter = work && work.furthestChapter;
    if (!chapter || !chapter.num) return '';
    const workId = work.id || work.workId;
    if (chapter.id && workId) return `https://archiveofourown.org/works/${workId}/chapters/${chapter.id}`;
    return work.url || '';
  }

  function chapterLabelForWork(work) {
    const chapter = work && work.furthestChapter;
    if (!chapter || !chapter.num) return '';
    return `Ch. ${chapter.num}${chapter.total ? `/${chapter.total}` : ''}`;
  }

  function prettyRowsForWorks(works, categoryMaps, mobile) {
    return [...works]
      .sort((a, b) => (b.movedAt || b.addedAt || 0) - (a.movedAt || a.addedAt || 0))
      .map(work => {
        const status = STATUS_LABELS[work.status] || work.status || 'Tracked';
        const categories = categoryNamesForWork(work, categoryMaps);
        const updated = formatDate(work.updatedAt || work.movedAt || work.addedAt);
        const chapterLabel = chapterLabelForWork(work);
        const chapterUrl = chapterLinkForWork(work);
        const chapter = chapterLabel && chapterUrl ? `${chapterLabel} - ${chapterUrl}` : chapterLabel;
        if (mobile) {
          return [
            status,
            work.title || '',
            work.author || '',
            categories,
            ratingStars(work.rating),
            updated,
            chapter,
            work.url || ''
          ];
        }
        return [
          status,
          work.title || '',
          work.author || '',
          work.platform === 'ffnet' ? 'FFNet' : 'AO3',
          categories,
          ratingStars(work.rating),
          joinList(work.fandoms),
          work.relationship || '',
          formatNumber(work.wordCount),
          updated,
          formatDate(work.completedAt || work.inferredCompletedAt),
          chapter,
          work.notes || '',
          work.url || ''
        ];
      });
  }

  async function rewritePrettySheet(token, spreadsheetId, sheetName, columns, rows) {
    const endCol = API().colLetter(columns.length);
    await API().batchUpdateValues(token, spreadsheetId, [
      { range: `${sheetName}!A1:${endCol}1`, values: [columns] }
    ]);
    await API().clearRange(token, spreadsheetId, `${sheetName}!A2:${endCol}`);
    if (rows.length) {
      await API().batchUpdateValues(token, spreadsheetId, [{
        range: `${sheetName}!A2:${endCol}${1 + rows.length}`,
        values: rows
      }]);
    }
  }

  async function rewritePrettySheets(token, spreadsheetId, works, categoryMaps) {
    const { SHEET_NAMES, PRETTY_DESKTOP_COLUMNS, PRETTY_MOBILE_COLUMNS } = S();
    const allWorks = Array.isArray(works) ? works : [];
    const desktopRows = prettyRowsForWorks(allWorks, categoryMaps, false);
    const mobileRows = prettyRowsForWorks(allWorks, categoryMaps, true);
    await rewritePrettySheet(
      token,
      spreadsheetId,
      SHEET_NAMES.PRETTY_DESKTOP,
      PRETTY_DESKTOP_COLUMNS,
      desktopRows
    );
    await rewritePrettySheet(
      token,
      spreadsheetId,
      SHEET_NAMES.PRETTY_MOBILE,
      PRETTY_MOBILE_COLUMNS,
      mobileRows
    );
    await applyPrettySheetFormatting(token, spreadsheetId, {
      [SHEET_NAMES.PRETTY_DESKTOP]: desktopRows,
      [SHEET_NAMES.PRETTY_MOBILE]: mobileRows
    }).catch(() => {});
  }

  async function applyPrettySheetFormatting(token, spreadsheetId, rowsBySheet) {
    if (typeof API().getSpreadsheetMeta !== 'function' || typeof API().batchUpdate !== 'function') return;
    const { SHEET_NAMES, PRETTY_DESKTOP_COLUMNS, PRETTY_MOBILE_COLUMNS } = S();
    const meta = await API().getSpreadsheetMeta(token, spreadsheetId);
    const sheetIds = {};
    (meta.sheets || []).forEach(sheet => {
      if (sheet?.properties?.title) sheetIds[sheet.properties.title] = sheet.properties.sheetId;
    });
    const requests = [];
    const colorByLabel = Object.fromEntries(Object.entries(STATUS_LABELS).map(([status, label]) => [label, STATUS_COLORS[status]]));
    [
      [SHEET_NAMES.PRETTY_DESKTOP, PRETTY_DESKTOP_COLUMNS.length],
      [SHEET_NAMES.PRETTY_MOBILE, PRETTY_MOBILE_COLUMNS.length]
    ].forEach(([name, colCount]) => {
      const sheetId = sheetIds[name];
      if (sheetId == null) return;
      requests.push(
        {
          updateSheetProperties: {
            properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
            fields: 'gridProperties.frozenRowCount'
          }
        },
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: colCount },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.04, green: 0.20, blue: 0.25 },
                textFormat: { foregroundColor: { red: 0.58, green: 0.63, blue: 0.63 }, bold: true },
                horizontalAlignment: 'CENTER'
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
          }
        },
        {
          setBasicFilter: {
            filter: { range: { sheetId, startRowIndex: 0, startColumnIndex: 0, endColumnIndex: colCount } }
          }
        },
        {
          autoResizeDimensions: {
            dimensions: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: colCount }
          }
        }
      );
      (rowsBySheet?.[name] || []).forEach((row, index) => {
        const color = colorByLabel[row[0]];
        if (!color) return;
        requests.push({
          repeatCell: {
            range: { sheetId, startRowIndex: index + 1, endRowIndex: index + 2, startColumnIndex: 0, endColumnIndex: 1 },
            cell: {
              userEnteredFormat: {
                backgroundColor: color,
                textFormat: { bold: true }
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat)'
          }
        });
      });
    });
    if (requests.length) await API().batchUpdate(token, spreadsheetId, requests);
  }

  // Append new tombstone rows to the Deletions sheet.
  async function pushTombstones(token, spreadsheetId, tombstones) {
    const { SHEET_NAMES, serializeDeletion } = S();
    const entries = Object.entries(tombstones);
    if (!entries.length) return;

    // Read existing deletion IDs to avoid duplicates
    const result = await API().batchGetValues(token, spreadsheetId,
      [`${SHEET_NAMES.DELETIONS}!A2:A`]).catch(() => ({ valueRanges: [] }));
    const existingIds = new Set(
      ((result.valueRanges[0] && result.valueRanges[0].values) || [])
        .map(r => r[0])
        .filter(Boolean)
    );

    const newRows = entries
      .filter(([id]) => !existingIds.has(id))
      .map(([id, t]) => serializeDeletion(id, t.platform || 'ao3', t.deletedAt));

    if (!newRows.length) return;

    // Count existing rows to find the correct append position
    const existingCount = existingIds.size;
    const startRow = 2 + existingCount;
    await API().batchUpdateValues(token, spreadsheetId, [{
      range: `${SHEET_NAMES.DELETIONS}!A${startRow}:D${startRow + newRows.length - 1}`,
      values: newRows
    }]);
  }

  // Update the lastSyncedAt value in the _Meta sheet.
  async function updateMetaTimestamp(token, spreadsheetId, ts) {
    const { SHEET_NAMES } = S();
    // Row 5 = lastSyncedAt (row 1 = headers, rows 2-6 = schemaVersion, extensionVersion, createdAt, lastSyncedAt, ownerEmail)
    await API().batchUpdateValues(token, spreadsheetId, [
      { range: `${SHEET_NAMES.META}!B5`, values: [[ts]] }
    ]).catch(() => {});
  }

  // ── Public API ────────────────────────────────────────────────────────────────

  // First-time setup: OAuth sign-in + create spreadsheet + initial push.
  async function setupSync() {
    if (!Auth().isConfigured()) {
      await setStatus('not_configured', 'OAuth setup required. See instructions.');
      throw new Error('OAUTH_NOT_CONFIGURED');
    }

    await setStatus('syncing', 'Signing in to Google...');

    const token = await acquireToken(true); // always interactive for setup

    // Detect account switch: if we already have an owner email and the current
    // account is different, warn but continue (user intentionally switching).
    const storedEmail = await sGet(_k.SHEETS_OWNER_EMAIL_KEY);
    const currentEmail = await Auth().getUserEmail(token).catch(() => '');

    let spreadsheetId = await sGet(_k.SHEETS_SPREADSHEET_ID_KEY);

    if (spreadsheetId && storedEmail && currentEmail && storedEmail !== currentEmail) {
      // Different Google account — create a new sheet for this account.
      // Don't delete the old sheet ID; store new one and move forward.
      spreadsheetId = null;
    }

    await setStatus('syncing', 'Setting up your sync sheet...');

    if (spreadsheetId) {
      const verify = await verifySpreadsheet(token, spreadsheetId);
      if (!verify.ok) spreadsheetId = null;
    }

    if (!spreadsheetId) {
      await setStatus('syncing', 'Looking for an existing sync sheet...');
      const existing = await findExistingSpreadsheet(token);
      if (existing?.spreadsheetId) {
        spreadsheetId = existing.spreadsheetId;
        await sSet({
          [_k.SHEETS_SPREADSHEET_ID_KEY]: spreadsheetId,
          [_k.SHEETS_OWNER_EMAIL_KEY]: currentEmail
        });
      }
    }

    if (!spreadsheetId) {
      await setStatus('syncing', 'Creating your sync sheet...');
      const result = await createFreshSpreadsheet(token);
      spreadsheetId = result.spreadsheetId;
    }

    await sSet({ [_k.SHEETS_ENABLED_KEY]: true });
    await fullSync(false); // push all existing local works into the new sheet
  }

  // Disconnect: turn off sync. Local data is untouched; the sheet stays in Drive.
  async function disconnectSync() {
    await sSet({
      [_k.SHEETS_ENABLED_KEY]:      false,
      [_k.SHEETS_NEEDS_PUSH_KEY]:   false,
      [_k.SHEETS_SYNC_STATUS_KEY]: { state: 'idle', message: 'Sync disconnected.', lastSyncedAt: null }
    });
  }

  // Full sync cycle: pull → merge → push → update timestamp.
  // interactive=true: may show a Google sign-in dialog if token is expired.
  // interactive=false: used by the alarm handler; never shows UI.
  async function fullSync(interactive) {
    const enabled = await sGet(_k.SHEETS_ENABLED_KEY);
    if (!enabled) return { skipped: 'disabled' };

    if (!Auth().isConfigured()) {
      await setStatus('not_configured', 'OAuth setup required. See instructions.');
      return { skipped: 'not_configured' };
    }

    const spreadsheetId = await sGet(_k.SHEETS_SPREADSHEET_ID_KEY);
    if (!spreadsheetId) return { skipped: 'no_sheet_id' };

    await setStatus('syncing', 'Syncing...');

    let token;
    try {
      token = await acquireToken(!!interactive);
    } catch (err) {
      return { error: err.message };
    }

    try {
      // 1. Verify the spreadsheet is accessible
      const verify = await verifySpreadsheet(token, spreadsheetId);
      if (!verify.ok) {
        if (verify.reason === 'NOT_FOUND') {
          await sSet({ [_k.SHEETS_SPREADSHEET_ID_KEY]: null });
          await setStatus('error',
            'Sync sheet was deleted from Google Drive. Open the popup and reconnect to create a new one.');
          return { error: 'SHEET_NOT_FOUND' };
        }
        if (verify.reason === 'PERMISSION_DENIED') {
          await setStatus('error',
            'Permission denied on sync sheet. It may have been moved to a different account.');
          return { error: 'PERMISSION_DENIED' };
        }
        throw new Error(`Could not access sync sheet: ${verify.reason}`);
      }

      // 2. Read remote state
      const { ao3Works: remoteAo3, ffnetWorks: remoteFFNet, deletions } =
        await readAllRemote(token, spreadsheetId);

      // 3. Read local state for both platforms
      const [localAo3, localFFNet] = await Promise.all([
        getLocalWorks('ao3'),
        getLocalWorks('ffnet')
      ]);
      const [ao3Cats, ffnetCats] = await Promise.all([
        getLocalCustomCats('ao3'),
        getLocalCustomCats('ffnet')
      ]);

      // 4. Merge
      const ao3Merge   = mergeWorks(localAo3,   remoteAo3,   deletions);
      const ffnetMerge = mergeWorks(localFFNet,  remoteFFNet, deletions);

      // 5. Apply any remote-wins changes to local storage
      const ao3Changed   = Object.keys(ao3Merge.localUpdates).length > 0;
      const ffnetChanged = Object.keys(ffnetMerge.localUpdates).length > 0;
      if (ao3Changed)   await setLocalWorks('ao3',   ao3Merge.merged);
      if (ffnetChanged) await setLocalWorks('ffnet', ffnetMerge.merged);

      // 6. Push pending tombstones before rewriting sheets
      const tombstones = await getPendingTombstones();
      if (Object.keys(tombstones).length) {
        await pushTombstones(token, spreadsheetId, tombstones);
        // Clear pushed tombstones
        await sSet({ [_k.SHEETS_PENDING_TOMBSTONES_KEY]: {} });
      }

      // 7. Rewrite both sheets with the merged data
      const { SHEET_NAMES } = S();
      await rewriteSheetData(token, spreadsheetId, SHEET_NAMES.AO3,
        Object.values(ao3Merge.merged));
      await rewriteSheetData(token, spreadsheetId, SHEET_NAMES.FFNET,
        Object.values(ffnetMerge.merged));
      await rewritePrettySheets(token, spreadsheetId, [
        ...Object.values(ao3Merge.merged),
        ...Object.values(ffnetMerge.merged)
      ], { ao3: ao3Cats, ffnet: ffnetCats });

      // 8. Update _Meta timestamp
      const now = Date.now();
      await updateMetaTimestamp(token, spreadsheetId, now);

      // 9. Clear the "needs push" flag
      await sSet({ [_k.SHEETS_NEEDS_PUSH_KEY]: false });

      const pulled = Object.keys(ao3Merge.localUpdates).length
        + Object.keys(ffnetMerge.localUpdates).length;
      const pushed = ao3Merge.needsPush.length + ffnetMerge.needsPush.length;
      const msg = pulled + pushed > 0
        ? `Synced: ${pushed} uploaded, ${pulled} downloaded`
        : 'Up to date';

      await setStatus('idle', msg, now);
      return { ok: true, pulled, pushed };

    } catch (err) {
      const prev = await getSyncStatus();
      await setStatus('error', `Sync failed: ${err.message}`, prev.lastSyncedAt);
      return { error: err.message };
    }
  }

  // ── Hooks called by popup.js on data changes ──────────────────────────────────

  // Mark that local works have changed and need to be pushed on next sync.
  async function markNeedsPush() {
    const enabled = await sGet(_k.SHEETS_ENABLED_KEY);
    if (!enabled) return;
    await sSet({ [_k.SHEETS_NEEDS_PUSH_KEY]: true });
  }

  // Record a deletion (tombstone) so the deleted work stays gone on other devices.
  async function recordDeletion(workId, platform) {
    const enabled = await sGet(_k.SHEETS_ENABLED_KEY);
    if (!enabled) return;
    const tombstones = await getPendingTombstones();
    tombstones[workId] = { platform: platform || 'ao3', deletedAt: Date.now() };
    await sSet({ [_k.SHEETS_PENDING_TOMBSTONES_KEY]: tombstones });
    await markNeedsPush();
  }

  // Should be called by the alarm handler. Only syncs if needsPush is set,
  // to avoid hammering the API when nothing changed.
  async function alarmSync() {
    const needsPush = await sGet(_k.SHEETS_NEEDS_PUSH_KEY);
    if (!needsPush) {
      // Even if nothing was pushed locally, do a pull once per alarm cycle
      // to pick up changes from other devices.
      return fullSync(false);
    }
    return fullSync(false);
  }

  const Engine = {
    init,
    setupSync,
    disconnectSync,
    fullSync,
    alarmSync,
    markNeedsPush,
    recordDeletion,
    getSyncStatus
  };

  Engine.__test = {
    worksKey,
    verifySpreadsheet,
    parseWorkRows,
    parseDeletionRows,
    mergeWorks,
    hasRequiredSyncSheets,
    findExistingSpreadsheet,
    deleteLegacyPrettySheets
  };

  global.FGSheetsEngine = Engine;
  if (typeof module !== 'undefined' && module.exports) module.exports = Engine;
})(typeof globalThis !== 'undefined' ? globalThis : this);
