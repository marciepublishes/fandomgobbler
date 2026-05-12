(function (global) {
  'use strict';

  const MAX_CURSORS = 5;
  const MAX_DATA_URL_BYTES = 100 * 1024;
  const MAX_RASTER_SOURCE_BYTES = 2 * 1024 * 1024;
  const RENDER_SIZE = 32;
  const HOTSPOT = 2;
  const STYLE_ID = 'fandomgobbler-custom-cursor-style';
  const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/svg+xml', 'image/jpeg']);
  const ALLOWED_EXTENSIONS = new Set(['png', 'svg', 'jpg', 'jpeg']);

  function keys() {
    return global.AO3TrackerStorageKeys || {};
  }

  function customCursorsKey() {
    return keys().CUSTOM_CURSORS_KEY || 'fandomgobbler_custom_cursors';
  }

  function selectedCursorKey() {
    return keys().CUSTOM_CURSOR_SELECTED_KEY || 'fandomgobbler_custom_cursor_selected';
  }

  function byteLength(text) {
    return new Blob([String(text || '')]).size;
  }

  function escCssUrl(value) {
    return String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '');
  }

  function escName(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 40);
  }

  function makeId() {
    return `cursor-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function extensionFromName(name) {
    const match = String(name || '').toLowerCase().match(/\.([a-z0-9]+)$/);
    return match ? match[1] : '';
  }

  function normalizeMime(file) {
    const type = String(file?.type || '').toLowerCase();
    if (type === 'image/jpg') return 'image/jpeg';
    if (ALLOWED_MIME_TYPES.has(type)) return type;
    const ext = extensionFromName(file?.name);
    if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
    if (ext === 'png') return 'image/png';
    if (ext === 'svg') return 'image/svg+xml';
    return '';
  }

  function isSupportedFile(file) {
    const ext = extensionFromName(file?.name);
    return ALLOWED_MIME_TYPES.has(normalizeMime(file)) && ALLOWED_EXTENSIONS.has(ext);
  }

  function sanitizeCursor(cursor) {
    if (!cursor || typeof cursor !== 'object') return null;
    const id = String(cursor.id || '').trim();
    const name = escName(cursor.name) || 'Custom Cursor';
    const dataUrl = String(cursor.dataUrl || '');
    const mimeType = String(cursor.mimeType || '');
    const createdAt = Number(cursor.createdAt) || Date.now();
    if (!id || !dataUrl.startsWith('data:image/') || !ALLOWED_MIME_TYPES.has(mimeType)) return null;
    if (byteLength(dataUrl) > MAX_DATA_URL_BYTES) return null;
    return { id, name, dataUrl, mimeType, createdAt };
  }

  function sanitizeCursorList(value) {
    return (Array.isArray(value) ? value : [])
      .map(sanitizeCursor)
      .filter(Boolean)
      .slice(0, MAX_CURSORS);
  }

  function getSelectedCursor(cursors, selectedId) {
    const list = sanitizeCursorList(cursors);
    const id = String(selectedId || '');
    return list.find(cursor => cursor.id === id) || null;
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Could not read that image.'));
      reader.readAsDataURL(file);
    });
  }

  function resizeRasterDataUrl(dataUrl, mimeType) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = RENDER_SIZE;
        canvas.height = RENDER_SIZE;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not prepare that image.'));
          return;
        }
        ctx.clearRect(0, 0, RENDER_SIZE, RENDER_SIZE);
        const scale = Math.min(RENDER_SIZE / img.width, RENDER_SIZE / img.height);
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const x = Math.round((RENDER_SIZE - width) / 2);
        const y = Math.round((RENDER_SIZE - height) / 2);
        ctx.drawImage(img, x, y, width, height);
        const outputType = mimeType === 'image/jpeg' ? 'image/jpeg' : 'image/png';
        resolve({
          dataUrl: canvas.toDataURL(outputType, 0.9),
          mimeType: outputType
        });
      };
      img.onerror = () => reject(new Error('That image could not be loaded.'));
      img.src = dataUrl;
    });
  }

  async function prepareCursorFromFile(file, name) {
    if (!file) throw new Error('Choose an image first.');
    if (!isSupportedFile(file)) throw new Error('Please upload a PNG, SVG, JPG, or JPEG image.');
    const originalMime = normalizeMime(file);
    if (originalMime === 'image/svg+xml' && file.size > MAX_DATA_URL_BYTES) {
      throw new Error('That image is too large. Please choose one under 100 KB.');
    }
    if (originalMime !== 'image/svg+xml' && file.size > MAX_RASTER_SOURCE_BYTES) {
      throw new Error('That image is too large. Please choose one under 2 MB so FandomGobbler can resize it.');
    }

    const originalDataUrl = await readFileAsDataUrl(file);
    let prepared;
    try {
      prepared = await resizeRasterDataUrl(originalDataUrl, originalMime);
    } catch (error) {
      if (originalMime !== 'image/svg+xml') throw error;
      prepared = { dataUrl: originalDataUrl, mimeType: originalMime };
    }

    if (byteLength(prepared.dataUrl) > MAX_DATA_URL_BYTES) {
      throw new Error('That image is still too large after resizing. Try a simpler image under 100 KB.');
    }

    return {
      id: makeId(),
      name: escName(name) || file.name.replace(/\.[^.]+$/, '').slice(0, 40) || 'Custom Cursor',
      dataUrl: prepared.dataUrl,
      mimeType: prepared.mimeType,
      createdAt: Date.now()
    };
  }

  function cursorCss(cursor) {
    if (!cursor) return '';
    return `url("${escCssUrl(cursor.dataUrl)}") ${HOTSPOT} ${HOTSPOT}, auto`;
  }

  function applyCursor(cursor, doc) {
    const targetDoc = doc || global.document;
    if (!targetDoc || !targetDoc.documentElement) return false;
    let style = targetDoc.getElementById(STYLE_ID);
    if (!cursor) {
      if (style) style.remove();
      targetDoc.documentElement.classList.remove('fg-custom-cursor-active');
      return true;
    }

    if (!style) {
      style = targetDoc.createElement('style');
      style.id = STYLE_ID;
      (targetDoc.head || targetDoc.documentElement).appendChild(style);
    }
    const value = cursorCss(cursor);
    style.textContent = `
html.fg-custom-cursor-active,
html.fg-custom-cursor-active body {
  cursor: ${value} !important;
}
html.fg-custom-cursor-active * {
  cursor: ${value} !important;
}
html.fg-custom-cursor-active input,
html.fg-custom-cursor-active textarea,
html.fg-custom-cursor-active [contenteditable="true"] {
  cursor: text !important;
}
html.fg-custom-cursor-active button,
html.fg-custom-cursor-active a,
html.fg-custom-cursor-active select,
html.fg-custom-cursor-active label,
html.fg-custom-cursor-active summary,
html.fg-custom-cursor-active [role="button"] {
  cursor: ${value} !important;
}`;
    targetDoc.documentElement.classList.add('fg-custom-cursor-active');
    return true;
  }

  function applySelectedFromStorage(doc) {
    if (!global.chrome?.storage?.local) return;
    const listKey = customCursorsKey();
    const selectedKey = selectedCursorKey();
    global.chrome.storage.local.get([listKey, selectedKey], data => {
      const cursor = getSelectedCursor(data[listKey], data[selectedKey]);
      applyCursor(cursor, doc || global.document);
    });
  }

  function bindStorageListener(doc) {
    if (!global.chrome?.storage?.onChanged) return;
    if (bindStorageListener._bound) return;
    bindStorageListener._bound = true;
    const listKey = customCursorsKey();
    const selectedKey = selectedCursorKey();
    global.chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      if (!changes[listKey] && !changes[selectedKey]) return;
      applySelectedFromStorage(doc || global.document);
    });
  }

  const api = {
    MAX_CURSORS,
    MAX_DATA_URL_BYTES,
    RENDER_SIZE,
    customCursorsKey,
    selectedCursorKey,
    sanitizeCursorList,
    getSelectedCursor,
    prepareCursorFromFile,
    applyCursor,
    applySelectedFromStorage,
    bindStorageListener
  };

  global.FGCustomCursorCore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
