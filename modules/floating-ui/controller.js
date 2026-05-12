(function (global) {
  'use strict';

  let _deps = null;

  const FAB_DEFAULT_MARGIN = 28;
  const FAB_DRAG_THRESHOLD = 6;
  const FAB_VERTICAL_SNAP_RANGE = 56;
  const FAB_PEEK_VISIBLE = 22;
  const FAB_PEEK_TRIGGER = 10;

  function extensionContextAvailable() {
    try {
      return !!(global.chrome && chrome.runtime && chrome.runtime.id);
    } catch (e) {
      return false;
    }
  }

  function handleInvalidatedContext() {
    try {
      const sidebar = global.document?.getElementById('ao3tracker-sidebar');
      const fab = global.document?.getElementById('ao3tracker-fab');
      sidebar?.classList.add('aot-hidden');
      if (fab) {
        fab.disabled = true;
        fab.title = 'Reload this AO3 tab to reopen FandomGobbler.';
      }
    } catch (e) {}
  }

  function openDashboardUrl(url) {
    try {
      if (chrome.tabs && typeof chrome.tabs.create === 'function') {
        chrome.tabs.create({ url });
      } else {
        window.open(url, '_blank', 'noopener');
      }
    } catch (err) {
      try { window.open(url, '_blank', 'noopener'); } catch (_e) {}
    }
  }

  function requestDashboardOpen(platform, url) {
    try {
      if (chrome.runtime && typeof chrome.runtime.sendMessage === 'function') {
        chrome.runtime.sendMessage({ type: 'FG_OPEN_DASHBOARD', platform }, response => {
          if (chrome.runtime?.lastError || !response?.ok) openDashboardUrl(url);
        });
        return;
      }
    } catch (err) {}
    openDashboardUrl(url);
  }

  function isInvalidatedError(error) {
    return !!(error && String(error.message || error).includes('Extension context invalidated'));
  }

  function init(deps) {
    if (global.AO3TrackerUtils && typeof global.AO3TrackerUtils.validateDeps === 'function') {
      global.AO3TrackerUtils.validateDeps(deps, [
        'document', 'window',
        'FAB_POSITION_KEY', 'AO3_FLOATING_KEY',
        'toggleSidebar', 'closeSidebar', 'renderSidebar', 'getSidebarOpen',
        'applyTrackerThemeToSidebar', 'nextAo3trackerTheme', 'syncAo3trackerThemeToPage',
        'aotDoExport', 'aotDoImport',
        'renderCustomTabs',
        'openCatModal', 'closeCatModal', 'saveCatModal', 'deleteCat', 'updateCatSwatch', 'CAT_PRESETS',
        'openNotesModal', 'closeNotesModal', 'saveNotesModal', 'updateStars',
        'getPendingRating', 'setPendingRating',
        'setActiveTab', 'setSearchQuery',
        'EXTENSION_THEME_KEY', 'AO3_PAGE_THEME_KEY', 'THEME_SYNC_KEY', 'EXPORT_BANNER_DISMISS_SESSION'
      ], 'FloatingUIController');
    }
    _deps = deps;
  }

  // ── FAB position helpers ──

  function fabViewportBounds(fab) {
    const { window } = _deps;
    const width = fab?.offsetWidth || 48;
    const height = fab?.offsetHeight || 48;
    return {
      minLeft: 0,
      minTop: FAB_DEFAULT_MARGIN,
      maxLeft: Math.max(0, window.innerWidth - width),
      maxTop: Math.max(FAB_DEFAULT_MARGIN, window.innerHeight - height - FAB_DEFAULT_MARGIN)
    };
  }

  function clampFabPosition(pos, fab) {
    const bounds = fabViewportBounds(fab);
    return {
      left: Math.min(bounds.maxLeft, Math.max(bounds.minLeft, Math.round(pos.left))),
      top: Math.min(bounds.maxTop, Math.max(bounds.minTop, Math.round(pos.top)))
    };
  }

  function applyFabPosition(fab, pos) {
    const { window } = _deps;
    const width = fab?.offsetWidth || 48;
    const next = pos && pos.peekEdge
      ? {
        left: pos.peekEdge === 'left' ? -(width - FAB_PEEK_VISIBLE) : window.innerWidth - FAB_PEEK_VISIBLE,
        top: clampFabPosition(pos, fab).top,
        peekEdge: pos.peekEdge
      }
      : clampFabPosition(pos, fab);
    fab.style.left = `${next.left}px`;
    fab.style.top = `${next.top}px`;
    fab.style.right = 'auto';
    fab.style.bottom = 'auto';
    fab.classList.toggle('aot-peek-left', next.peekEdge === 'left');
    fab.classList.toggle('aot-peek-right', next.peekEdge === 'right');
    fab.title = next.peekEdge ? 'FandomGobbler. — tucked away' : 'FandomGobbler.';
    return next;
  }

  function resetFabPosition(fab) {
    if (!fab) return;
    fab.style.left = '';
    fab.style.top = '';
    fab.style.right = `${FAB_DEFAULT_MARGIN}px`;
    fab.style.bottom = `${FAB_DEFAULT_MARGIN}px`;
    fab.classList.remove('aot-peek-left', 'aot-peek-right');
    fab.title = 'FandomGobbler.';
  }

  function restoreFabFromPeek(fab) {
    if (!fab) return null;
    const { window } = _deps;
    const width = fab?.offsetWidth || 48;
    const top = parseFloat(fab.style.top) || FAB_DEFAULT_MARGIN;
    const peekEdge = fab.classList.contains('aot-peek-left') ? 'left' : (fab.classList.contains('aot-peek-right') ? 'right' : '');
    if (!peekEdge) return null;
    const left = peekEdge === 'left'
      ? FAB_DEFAULT_MARGIN
      : Math.max(FAB_DEFAULT_MARGIN, window.innerWidth - width - FAB_DEFAULT_MARGIN);
    return applyFabPosition(fab, { left, top });
  }

  function snapFabPosition(pos, fab) {
    const { window } = _deps;
    const bounds = fabViewportBounds(fab);
    const width = fab?.offsetWidth || 48;
    const height = fab?.offsetHeight || 48;
    const centerX = pos.left + width / 2;
    const centerY = pos.top + height / 2;
    const snapped = { ...pos };
    const leftEdge = FAB_DEFAULT_MARGIN;
    const rightEdge = Math.max(FAB_DEFAULT_MARGIN, window.innerWidth - width - FAB_DEFAULT_MARGIN);
    const topEdge = bounds.minTop;
    const bottomEdge = bounds.maxTop;

    if (pos.left <= FAB_PEEK_TRIGGER) {
      return {
        left: -(width - FAB_PEEK_VISIBLE),
        top: clampFabPosition(pos, fab).top,
        peekEdge: 'left'
      };
    }
    if (pos.left >= window.innerWidth - width - FAB_PEEK_TRIGGER) {
      return {
        left: window.innerWidth - FAB_PEEK_VISIBLE,
        top: clampFabPosition(pos, fab).top,
        peekEdge: 'right'
      };
    }

    snapped.left = centerX < window.innerWidth / 2 ? leftEdge : rightEdge;
    if (Math.abs(centerY - (topEdge + height / 2)) <= FAB_VERTICAL_SNAP_RANGE) {
      snapped.top = topEdge;
    } else if (Math.abs(centerY - (bottomEdge + height / 2)) <= FAB_VERTICAL_SNAP_RANGE) {
      snapped.top = bottomEdge;
    }
    return clampFabPosition(snapped, fab);
  }

  function loadFabPosition(fab) {
    const { FAB_POSITION_KEY } = _deps;
    if (!fab) return;
    if (!extensionContextAvailable() || !chrome.storage?.local) {
      resetFabPosition(fab);
      return;
    }
    try {
      chrome.storage.local.get(FAB_POSITION_KEY, data => {
        const pos = data[FAB_POSITION_KEY];
        if (pos && Number.isFinite(pos.left) && Number.isFinite(pos.top)) {
          applyFabPosition(fab, pos);
        } else {
          resetFabPosition(fab);
        }
      });
    } catch (e) {
      if (isInvalidatedError(e)) handleInvalidatedContext();
      resetFabPosition(fab);
    }
  }

  function persistFabPosition(pos) {
    const { FAB_POSITION_KEY } = _deps;
    if (!extensionContextAvailable() || !chrome.storage?.local) return;
    try {
      chrome.storage.local.set({ [FAB_POSITION_KEY]: pos });
    } catch (e) {
      if (isInvalidatedError(e)) handleInvalidatedContext();
    }
  }

  function setupFabDragging(fab) {
    const { window, document } = _deps;
    if (!fab || fab._aotDragSetup) return;
    fab._aotDragSetup = true;

    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;
    let dragging = false;
    let moved = false;

    function endDrag() {
      fab.classList.remove('aot-dragging');
      pointerId = null;
      dragging = false;
      if (moved) {
        fab._aotSuppressClick = true;
        const current = {
          left: parseFloat(fab.style.left) || FAB_DEFAULT_MARGIN,
          top: parseFloat(fab.style.top) || FAB_DEFAULT_MARGIN
        };
        const snapped = snapFabPosition(current, fab);
        applyFabPosition(fab, snapped);
        persistFabPosition(snapped);
      }
      moved = false;
    }

    fab.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      pointerId = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      const rect = fab.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
      dragging = true;
      moved = false;
      try { fab.setPointerCapture(pointerId); } catch (err) {}
    });

    fab.addEventListener('pointermove', e => {
      if (!dragging || e.pointerId !== pointerId) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!moved && Math.hypot(dx, dy) < FAB_DRAG_THRESHOLD) return;
      moved = true;
      fab.classList.add('aot-dragging');
      const next = clampFabPosition({ left: startLeft + dx, top: startTop + dy }, fab);
      applyFabPosition(fab, next);
    });

    fab.addEventListener('pointerup', e => {
      if (e.pointerId !== pointerId) return;
      try { fab.releasePointerCapture(pointerId); } catch (err) {}
      endDrag();
    });

    fab.addEventListener('pointercancel', endDrag);
    window.addEventListener('resize', () => {
      if (!document.body.contains(fab)) return;
      if (fab.style.left && fab.style.top) {
        const currentPeek = fab.classList.contains('aot-peek-left') ? 'left' : (fab.classList.contains('aot-peek-right') ? 'right' : '');
        const next = currentPeek ? applyFabPosition(fab, {
          left: parseFloat(fab.style.left) || FAB_DEFAULT_MARGIN,
          top: parseFloat(fab.style.top) || FAB_DEFAULT_MARGIN,
          peekEdge: currentPeek
        }) : applyFabPosition(fab, {
          left: parseFloat(fab.style.left) || FAB_DEFAULT_MARGIN,
          top: parseFloat(fab.style.top) || FAB_DEFAULT_MARGIN
        }, fab);
        persistFabPosition(next);
      } else {
        resetFabPosition(fab);
      }
    });
  }

  // ── Main inject ──

  function injectFloatingUI() {
    const {
      document, window,
      toggleSidebar, closeSidebar, renderSidebar, getSidebarOpen,
      applyTrackerThemeToSidebar, nextAo3trackerTheme, syncAo3trackerThemeToPage,
      aotDoExport, aotDoImport,
      renderCustomTabs, openCatModal, closeCatModal, saveCatModal, deleteCat, updateCatSwatch, CAT_PRESETS,
      openNotesModal, closeNotesModal, saveNotesModal, updateStars, getPendingRating, setPendingRating,
      setActiveTab, setSearchQuery,
      EXTENSION_THEME_KEY, AO3_PAGE_THEME_KEY, THEME_SYNC_KEY, EXPORT_BANNER_DISMISS_SESSION
    } = _deps;

    if (document.getElementById('ao3tracker-fab')) return;

    const fab = document.createElement('button');
    fab.id = 'ao3tracker-fab';
    fab.title = 'FandomGobbler.';
    fab.innerHTML = '<span id="ao3tracker-fab-label">FG</span>';
    document.body.appendChild(fab);
    setupFabDragging(fab);
    loadFabPosition(fab);
    fab.addEventListener('click', (e) => {
      if (fab._aotSuppressClick) {
        fab._aotSuppressClick = false;
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      const restored = restoreFabFromPeek(fab);
      if (restored) {
        persistFabPosition(restored);
        return;
      }
      toggleSidebar();
    });

    const sidebar = document.createElement('div');
    sidebar.id = 'ao3tracker-sidebar';
    sidebar.innerHTML = global.AO3TrackerFloatingUITemplate || '';
    /* Template source: modules/floating-ui/template.js */
    if (!global.AO3TrackerFloatingUITemplate) {
      console.error('[AO3 Tracker] FloatingUIController: sidebar template not loaded — check modules/floating-ui/template.js in manifest.json');
    }
    document.body.appendChild(sidebar);
    applyTrackerThemeToSidebar();

    document.getElementById('aot-close').addEventListener('click', closeSidebar);

    const fullscreenBtn = document.getElementById('aot-fullscreen-btn');
    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        if (!extensionContextAvailable()) {
          console.warn('[AO3 Tracker] Extension context is unavailable. Reload this AO3 tab to reopen the dashboard.');
          handleInvalidatedContext();
          return;
        }
        let url = '';
        const platform = 'ao3';
        try {
          url = `${chrome.runtime.getURL('dashboard.html')}?platform=${encodeURIComponent(platform)}`;
        } catch (err) {
          console.warn('[AO3 Tracker] Extension context is unavailable. Reload this AO3 tab to reopen the dashboard.', err);
          handleInvalidatedContext();
          return;
        }
        requestDashboardOpen(platform, url);
      });
    }

    // Export reminder banner
    document.getElementById('aot-reminder-dismiss').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      try { sessionStorage.setItem(EXPORT_BANNER_DISMISS_SESSION, '1'); } catch (err) {}
      document.getElementById('aot-export-reminder')?.classList.add('aot-hidden');
    });
    document.getElementById('aot-reminder-export').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      document.getElementById('aot-export-reminder')?.classList.add('aot-hidden');
      aotDoExport('json');
    });

    // MFL pending banner
    const MFL_PENDING_COUNT_KEY = _deps.MFL_PENDING_COUNT_KEY;
    function updateSidebarMflBanner() {
      if (!MFL_PENDING_COUNT_KEY || !extensionContextAvailable() || !chrome.storage?.local) return;
      try {
        chrome.storage.local.get(MFL_PENDING_COUNT_KEY, data => {
          const stored = data[MFL_PENDING_COUNT_KEY];
          const count = (stored && stored.count) || 0;
          const banner = document.getElementById('aot-mfl-banner');
          const msg = document.getElementById('aot-mfl-banner-msg');
          if (!banner) return;
          if (count > 0) {
            if (msg) msg.textContent = `${count} For Later work${count !== 1 ? 's' : ''} not yet tracked. Open the extension popup to import.`;
            banner.classList.remove('aot-hidden');
          } else {
            banner.classList.add('aot-hidden');
          }
        });
      } catch (e) {}
    }
    updateSidebarMflBanner();
    try {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && MFL_PENDING_COUNT_KEY && changes[MFL_PENDING_COUNT_KEY]) {
          updateSidebarMflBanner();
        }
      });
    } catch (e) {}
    document.getElementById('aot-mfl-banner-dismiss')?.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      if (!MFL_PENDING_COUNT_KEY || !extensionContextAvailable() || !chrome.storage?.local) return;
      try {
        chrome.storage.local.get(MFL_PENDING_COUNT_KEY, data => {
          const stored = data[MFL_PENDING_COUNT_KEY] || {};
          chrome.storage.local.set({ [MFL_PENDING_COUNT_KEY]: { ...stored, count: 0 } });
        });
      } catch (err) {}
      document.getElementById('aot-mfl-banner')?.classList.add('aot-hidden');
    });

    // Export / Import button
    const aotExportBtn = document.getElementById('aot-export-btn');
    const aotExportDd  = document.getElementById('aot-export-dropdown');

    aotExportBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      aotExportDd.classList.toggle('aot-hidden');
    });
    if (document._ao3ExportCloseHandler) {
      document.removeEventListener('click', document._ao3ExportCloseHandler);
    }
    document._ao3ExportCloseHandler = (e) => {
      const btn = document.getElementById('aot-export-btn');
      const dd = document.getElementById('aot-export-dropdown');
      if (btn && dd && !btn.contains(e.target) && !dd.contains(e.target)) {
        dd.classList.add('aot-hidden');
      }
    };
    document.addEventListener('click', document._ao3ExportCloseHandler);

    document.getElementById('aot-export-csv').onclick  = (e) => { e.stopPropagation(); aotDoExport('csv');  aotExportDd.classList.add('aot-hidden'); };
    document.getElementById('aot-export-json').onclick = (e) => { e.stopPropagation(); aotDoExport('json'); aotExportDd.classList.add('aot-hidden'); };
    document.getElementById('aot-import-csv').onclick  = (e) => { e.stopPropagation(); aotDoImport('csv');  aotExportDd.classList.add('aot-hidden'); };
    document.getElementById('aot-import-json').onclick = (e) => { e.stopPropagation(); aotDoImport('json'); aotExportDd.classList.add('aot-hidden'); };

    // Theme toggle - 3-way cycle
    const aotThemeBtn = document.getElementById('aot-theme-toggle');
    if (aotThemeBtn) {
      aotThemeBtn.addEventListener('click', () => {
        if (!extensionContextAvailable() || !chrome.storage?.local) {
          handleInvalidatedContext();
          return;
        }
        try {
          chrome.storage.local.get([EXTENSION_THEME_KEY, AO3_PAGE_THEME_KEY, THEME_SYNC_KEY], d => {
            const cur = d[EXTENSION_THEME_KEY] || d[AO3_PAGE_THEME_KEY] || 'light';
            const next = nextAo3trackerTheme(cur);
            const updates = { [EXTENSION_THEME_KEY]: next };
            if (d[THEME_SYNC_KEY] !== false) updates[AO3_PAGE_THEME_KEY] = next;
            chrome.storage.local.set(updates);
            applyTrackerThemeToSidebar(next);
            if (d[THEME_SYNC_KEY] !== false) syncAo3trackerThemeToPage(next);
          });
        } catch (e) {
          if (isInvalidatedError(e)) {
            handleInvalidatedContext();
            return;
          }
          const panel = document.getElementById('ao3tracker-panel');
          const cur = panel?.classList.contains('aot-dark') ? 'dark' :
            panel?.classList.contains('aot-sol-light') ? 'sol-light' : 'light';
          const next = nextAo3trackerTheme(cur);
          try { chrome.storage.local.set({ [EXTENSION_THEME_KEY]: next }); } catch (_e) {}
          applyTrackerThemeToSidebar(next);
        }
      });
    }

    // Outside-click closes sidebar
    if (document._ao3SidebarCloseHandler) {
      document.removeEventListener('click', document._ao3SidebarCloseHandler);
    }
    document._ao3SidebarCloseHandler = (e) => {
      const currentSidebar = document.getElementById('ao3tracker-sidebar');
      const currentFab = document.getElementById('ao3tracker-fab');
      const notesOverlay = document.getElementById('aot-notes-overlay');
      const catOverlay   = document.getElementById('aot-cat-overlay');
      const notesOpen = notesOverlay && !notesOverlay.classList.contains('aot-hidden');
      const catOpen   = catOverlay   && !catOverlay.classList.contains('aot-hidden');
      if (getSidebarOpen() && !notesOpen && !catOpen && currentSidebar && currentFab &&
          !currentSidebar.contains(e.target) && e.target !== currentFab) {
        closeSidebar();
      }
    };
    document.addEventListener('click', document._ao3SidebarCloseHandler);

    // Tabs
    sidebar.querySelectorAll('.aot-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        setActiveTab(tab.dataset.tab);
        sidebar.querySelectorAll('.aot-tab').forEach(t => t.classList.remove('aot-active'));
        tab.classList.add('aot-active');
        tab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        renderSidebar();
      });
    });

    // Search
    document.getElementById('aot-search').addEventListener('input', e => {
      setSearchQuery(e.target.value.trim().toLowerCase());
      renderSidebar();
    });

    // Notes modal
    document.getElementById('aot-notes-close').addEventListener('click', closeNotesModal);
    document.getElementById('aot-notes-cancel').addEventListener('click', closeNotesModal);
    document.getElementById('aot-notes-save').addEventListener('click', saveNotesModal);
    document.getElementById('aot-clear-rating').addEventListener('click', () => {
      setPendingRating(null);
      updateStars(null);
    });
    sidebar.querySelectorAll('.aot-star').forEach(star => {
      star.addEventListener('click', () => { setPendingRating(+star.dataset.val); updateStars(+star.dataset.val); });
      star.addEventListener('mouseenter', () => updateStars(+star.dataset.val));
    });
    document.getElementById('aot-stars').addEventListener('mouseleave', () => updateStars(getPendingRating()));

    // New category button
    document.getElementById('aot-new-cat-btn').addEventListener('click', e => {
      e.stopPropagation();
      openCatModal(null);
    });

    // Category modal events
    document.getElementById('aot-cat-close').addEventListener('click', closeCatModal);
    document.getElementById('aot-cat-cancel').addEventListener('click', closeCatModal);
    document.getElementById('aot-cat-save').addEventListener('click', saveCatModal);
    document.getElementById('aot-cat-delete').addEventListener('click', deleteCat);

    // Preset swatches
    const presetsEl = document.getElementById('aot-cat-presets');
    CAT_PRESETS.forEach(color => {
      const s = document.createElement('button');
      s.className = 'aot-cat-preset';
      s.style.background = color;
      s.style.setProperty('--fg-cat-preset-color', color);
      s.dataset.color = color;
      s.addEventListener('click', () => {
        document.getElementById('aot-cat-hex').value = color;
        updateCatSwatch(color);
        presetsEl.querySelectorAll('.aot-cat-preset').forEach(p => p.classList.toggle('aot-cat-preset-active', p.dataset.color === color));
      });
      presetsEl.appendChild(s);
    });

    // Hex input live update
    document.getElementById('aot-cat-hex').addEventListener('input', e => {
      const v = e.target.value.trim();
      if (/^#[0-9a-fA-F]{6}$/.test(v)) {
        updateCatSwatch(v);
        presetsEl.querySelectorAll('.aot-cat-preset').forEach(p => p.classList.toggle('aot-cat-preset-active', p.dataset.color === v.toLowerCase()));
      }
    });

    // Close labels dropdowns on outside click
    if (!document._ao3LabelsDropdownListener) {
      document._ao3LabelsDropdownListener = true;
      document.addEventListener('click', () => {
        document.querySelectorAll('.aot-labels-dropdown.open').forEach(d => d.classList.remove('open'));
      });
    }
  }

  function initFloating() {
    const { AO3_FLOATING_KEY } = _deps;
    if (!extensionContextAvailable() || !chrome.storage?.local) {
      handleInvalidatedContext();
      return;
    }
    chrome.storage.local.get(AO3_FLOATING_KEY, data => {
      if (data[AO3_FLOATING_KEY] === undefined) {
        chrome.storage.local.set({ [AO3_FLOATING_KEY]: true });
      }
      if (data[AO3_FLOATING_KEY] !== false) injectFloatingUI();
    });
  }

  const AO3TrackerFloatingUI = {
    init,
    injectFloatingUI,
    initFloating,
    applyFabPosition,
    resetFabPosition,
    restoreFabFromPeek
  };

  global.AO3TrackerFloatingUI = AO3TrackerFloatingUI;
  if (typeof module !== 'undefined' && module.exports) module.exports = AO3TrackerFloatingUI;
})(typeof globalThis !== 'undefined' ? globalThis : this);
