// Low-level Google Sheets API v4 wrapper with retry logic and auth-refresh on 401.
// Depends on: FGSheetsAuth (auth.js loaded first).
(function (global) {
  'use strict';

  const BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
  const DRIVE_FILES_BASE = 'https://www.googleapis.com/drive/v3/files';
  const MAX_RETRIES = 3;
  const BASE_DELAY_MS = 1200;

  function getAuth() {
    return global.FGSheetsAuth;
  }

  // Column letter helper: 1→A, 26→Z, 27→AA, …
  function colLetter(n) {
    let s = '';
    while (n > 0) {
      n--;
      s = String.fromCharCode(65 + (n % 26)) + s;
      n = Math.floor(n / 26);
    }
    return s;
  }

  async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  // Core request wrapper: handles 401 (token refresh) and 429/5xx (exponential backoff).
  async function request(method, url, body, token, attempt) {
    attempt = attempt || 0;
    const opts = {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
    if (body !== undefined) opts.body = JSON.stringify(body);

    let resp;
    try {
      resp = await fetch(url, opts);
    } catch (networkErr) {
      if (attempt < MAX_RETRIES) {
        await sleep(BASE_DELAY_MS * Math.pow(2, attempt));
        return request(method, url, body, token, attempt + 1);
      }
      throw networkErr;
    }

    if (resp.status === 401 && attempt === 0) {
      const freshToken = await getAuth().refreshExpiredToken(token);
      return request(method, url, body, freshToken, 1);
    }

    if ((resp.status === 429 || resp.status >= 500) && attempt < MAX_RETRIES) {
      // Respect Retry-After header if present
      const retryAfter = parseInt(resp.headers.get('Retry-After') || '0', 10);
      const delay = retryAfter > 0 ? retryAfter * 1000 : BASE_DELAY_MS * Math.pow(2, attempt);
      await sleep(delay);
      return request(method, url, body, token, attempt + 1);
    }

    if (resp.status === 204) return {};
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const apiErr = new Error(
        (data.error && data.error.message) || `HTTP ${resp.status}`
      );
      apiErr.status = resp.status;
      apiErr.apiError = data.error || null;
      throw apiErr;
    }
    return data;
  }

  // Create a new spreadsheet with given sheet tab titles.
  function createSpreadsheet(token, title, sheetTitles) {
    return request('POST', BASE, {
      properties: { title },
      sheets: sheetTitles.map((t, i) => ({
        properties: { sheetId: i + 1, title: t, index: i }
      }))
    }, token);
  }

  // Get spreadsheet metadata (sheet list, IDs, etc.)
  function getSpreadsheetMeta(token, spreadsheetId) {
    return request('GET',
      `${BASE}/${spreadsheetId}?fields=spreadsheetId,properties.title,sheets.properties`,
      undefined, token
    );
  }

  // Batch-get multiple named ranges in one HTTP round-trip.
  function batchGetValues(token, spreadsheetId, ranges) {
    const qs = ranges.map(r => `ranges=${encodeURIComponent(r)}`).join('&');
    return request('GET',
      `${BASE}/${spreadsheetId}/values:batchGet?${qs}&valueRenderOption=UNFORMATTED_VALUE`,
      undefined, token
    );
  }

  function driveQueryLiteral(value) {
    return String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  function findSpreadsheetsByTitle(token, title) {
    const q = [
      "mimeType='application/vnd.google-apps.spreadsheet'",
      `name='${driveQueryLiteral(title)}'`,
      'trashed=false'
    ].join(' and ');
    const params = [
      `q=${encodeURIComponent(q)}`,
      'fields=files(id,name,modifiedTime,createdTime)',
      'orderBy=modifiedTime desc',
      'pageSize=10'
    ].join('&');
    return request('GET', `${DRIVE_FILES_BASE}?${params}`, undefined, token);
  }

  // Batch-write multiple named ranges in one HTTP round-trip.
  // data = [{ range: 'SheetName!A1:Z1', values: [[cell, cell, ...], ...] }]
  function batchUpdateValues(token, spreadsheetId, data) {
    return request('POST',
      `${BASE}/${spreadsheetId}/values:batchUpdate`,
      { valueInputOption: 'RAW', data },
      token
    );
  }

  // Clear all cells in a range (leaves row 1 header intact by design of callers).
  function clearRange(token, spreadsheetId, range) {
    return request('POST',
      `${BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`,
      {}, token
    );
  }

  // Add a warning-only protection to a row range (shows a dialog if the user
  // tries to edit it in the Sheets UI; API writes are always allowed).
  function protectHeaderRow(token, spreadsheetId, sheetId, description) {
    return request('POST', `${BASE}/${spreadsheetId}:batchUpdate`, {
      requests: [{
        addProtectedRange: {
          protectedRange: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
            description,
            warningOnly: true
          }
        }
      }]
    }, token);
  }

  // Freeze the first row so headers stay visible while scrolling.
  function freezeHeaderRow(token, spreadsheetId, sheetId) {
    return request('POST', `${BASE}/${spreadsheetId}:batchUpdate`, {
      requests: [{
        updateSheetProperties: {
          properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
          fields: 'gridProperties.frozenRowCount'
        }
      }]
    }, token);
  }

  function batchUpdate(token, spreadsheetId, requests) {
    if (!Array.isArray(requests) || !requests.length) return Promise.resolve({});
    return request('POST', `${BASE}/${spreadsheetId}:batchUpdate`, { requests }, token);
  }

  // Add missing sheet tabs to an existing spreadsheet.
  function addSheets(token, spreadsheetId, sheetTitles) {
    return request('POST', `${BASE}/${spreadsheetId}:batchUpdate`, {
      requests: sheetTitles.map(title => ({
        addSheet: { properties: { title } }
      }))
    }, token);
  }

  const API = {
    colLetter,
    createSpreadsheet,
    getSpreadsheetMeta,
    findSpreadsheetsByTitle,
    batchGetValues,
    batchUpdateValues,
    clearRange,
    protectHeaderRow,
    freezeHeaderRow,
    batchUpdate,
    addSheets
  };

  global.FGSheetsAPI = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
