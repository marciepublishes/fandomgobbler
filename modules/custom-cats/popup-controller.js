(function (global) {
  'use strict';

  // --- Constants ---
  const CAT_PRESETS_POP = ['#7c3aed','#db2777','#dc2626','#d97706','#16a34a','#0891b2','#2563eb','#4f46e5','#d946ef','#6b7280'];

  const PENCIL_SVG = '<svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.3 2.3l3.4 3.4a1 1 0 0 1 0 1.4L6.2 14.4 2 15l.6-4.2 7.5-7.5a1 1 0 0 1 1.2-.2z"/><path d="M9 4l3 3"/></svg>';

  // --- Module state ---
  let _popEditingCatId = null;

  // --- Context accessors ---
  function getCustomCats(context, cb) {
    if (typeof context.getCustomCats === 'function') {
      context.getCustomCats(cb);
    } else {
      cb({});
    }
  }

  function setCustomCats(context, cats) {
    if (typeof context.setCustomCats === 'function') context.setCustomCats(cats);
  }

  function genCatId(context) {
    if (typeof context.genCatId === 'function') return context.genCatId();
    return 'cat-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
  }

  function getWorks(context) {
    return typeof context.getWorks === 'function' ? context.getWorks() : {};
  }

  function saveWorks(context) {
    if (typeof context.saveWorks === 'function') context.saveWorks();
  }

  function pruneWork(context, workId) {
    if (typeof context.pruneWork === 'function') return context.pruneWork(workId);
    return false;
  }

  function showToast(context, msg) {
    if (typeof context.showToast === 'function') context.showToast(msg);
  }

  function renderAll(context) {
    if (typeof context.renderAll === 'function') context.renderAll();
  }

  function escHtml(context, str) {
    if (typeof context.escHtml === 'function') return context.escHtml(str);
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // --- Internal helpers ---
  function updatePopSwatch(color) {
    const s = document.getElementById('catSwatch');
    if (s) s.style.background = color;
  }

  function closePopCatModal() {
    const overlay = document.getElementById('catOverlay');
    if (overlay) overlay.classList.add('hidden');
    _popEditingCatId = null;
  }

  // --- Public API ---
  function renderCategoryManager(context) {
    const container = document.getElementById('categoryManagerList');
    if (!container) return;
    const works = getWorks(context);
    getCustomCats(context, cats => {
      container.innerHTML = '';
      const catList = Object.values(cats);
      if (!catList.length) {
        container.innerHTML = '<div class="category-manager-empty">No custom categories yet. Create one here and it will show up on the sidebar cards.</div>';
        return;
      }
      catList.forEach(cat => {
        const count = Object.values(works).filter(w => (w.customCats || []).includes(cat.id)).length;
        const row = document.createElement('div');
        row.className = 'category-manager-row';
        row.innerHTML = `
          <div class="category-manager-main">
            <span class="category-manager-dot" style="background:${escHtml(context, cat.color)}"></span>
            <div class="category-manager-copy">
              <div class="category-manager-name">${escHtml(context, cat.name)}</div>
              <div class="category-manager-count">${count} work${count !== 1 ? 's' : ''}</div>
            </div>
          </div>
          <button class="category-manager-edit" data-cat-id="${escHtml(context, cat.id)}" title="Edit category" type="button">${PENCIL_SVG}</button>
        `;
        row.querySelector('.category-manager-edit').addEventListener('click', e => {
          e.stopPropagation();
          openModal(cat.id, context);
        });
        container.appendChild(row);
      });
    });
  }

  function openModal(catId, context) {
    _popEditingCatId = catId;
    const overlay = document.getElementById('catOverlay');
    const titleEl = document.getElementById('catModalTitle');
    const nameEl  = document.getElementById('catNameInput');
    const hexEl   = document.getElementById('catHexInput');
    const delBtn  = document.getElementById('catDeleteBtn');
    if (!overlay) return;

    const hidePillEl = document.getElementById('catHidePill');
    if (catId) {
      getCustomCats(context, cats => {
        const cat = cats[catId];
        if (!cat) return;
        if (titleEl) titleEl.textContent = 'Edit Category';
        if (nameEl) nameEl.value = cat.name;
        if (hexEl) hexEl.value = cat.color;
        if (hidePillEl) hidePillEl.checked = !!cat.hideOnListings;
        updatePopSwatch(cat.color);
        document.querySelectorAll('.cat-preset').forEach(p => p.classList.toggle('cat-preset-active', p.dataset.color === cat.color));
        if (delBtn) delBtn.classList.remove('hidden');
        overlay.classList.remove('hidden');
        setTimeout(() => { if (nameEl) nameEl.focus(); }, 50);
      });
    } else {
      if (titleEl) titleEl.textContent = 'New Category';
      if (nameEl) nameEl.value = '';
      const def = CAT_PRESETS_POP[0];
      if (hexEl) hexEl.value = def;
      if (hidePillEl) hidePillEl.checked = false;
      updatePopSwatch(def);
      document.querySelectorAll('.cat-preset').forEach(p => p.classList.toggle('cat-preset-active', p.dataset.color === def));
      if (delBtn) delBtn.classList.add('hidden');
      overlay.classList.remove('hidden');
      setTimeout(() => { if (nameEl) nameEl.focus(); }, 50);
    }
  }

  function savePopCatModal(context) {
    const nameEl = document.getElementById('catNameInput');
    const hexEl  = document.getElementById('catHexInput');
    if (!nameEl) return;
    const name = nameEl.value.trim();
    if (!name) { nameEl.focus(); return; }
    const hex = hexEl ? hexEl.value.trim() : '';
    const color = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : CAT_PRESETS_POP[0];
    const hidePillEl = document.getElementById('catHidePill');
    const hideOnListings = hidePillEl ? hidePillEl.checked : false;
    const editingId = _popEditingCatId;
    getCustomCats(context, cats => {
      if (editingId) {
        cats[editingId] = { ...cats[editingId], name, color, hideOnListings };
      } else {
        const id = genCatId(context);
        cats[id] = { id, name, color, hideOnListings };
      }
      setCustomCats(context, cats);
      closePopCatModal();
      renderCategoryManager(context);
      showToast(context, editingId ? 'Category updated!' : `Category "${name}" created!`);
    });
  }

  function deletePopCat(context) {
    if (!_popEditingCatId) return;
    const catId = _popEditingCatId;
    getCustomCats(context, cats => {
      const catName = cats[catId] ? cats[catId].name : 'Category';
      delete cats[catId];
      setCustomCats(context, cats);
      // Remove from all works
      const works = getWorks(context);
      Object.values(works).forEach(w => {
        if ((w.customCats || []).includes(catId)) {
          w.customCats = w.customCats.filter(c => c !== catId);
          pruneWork(context, w.id);
        }
      });
      saveWorks(context);
      closePopCatModal();
      renderCategoryManager(context);
      renderAll(context);
      showToast(context, `"${catName}" deleted.`);
    });
  }

  function setupControls(context) {
    const newCatBtn = document.getElementById('newCatBtn');
    if (!newCatBtn) return;

    newCatBtn.addEventListener('click', e => {
      e.stopPropagation();
      openModal(null, context);
    });

    // Modal events
    const catClose = document.getElementById('catClose');
    const catCancelBtn = document.getElementById('catCancelBtn');
    const catSaveBtn = document.getElementById('catSaveBtn');
    const catDeleteBtn = document.getElementById('catDeleteBtn');

    if (catClose) catClose.addEventListener('click', closePopCatModal);
    if (catCancelBtn) catCancelBtn.addEventListener('click', closePopCatModal);
    if (catSaveBtn) catSaveBtn.addEventListener('click', () => savePopCatModal(context));
    if (catDeleteBtn) catDeleteBtn.addEventListener('click', () => deletePopCat(context));

    // Preset swatches
    const presetsEl = document.getElementById('catPresets');
    if (presetsEl) {
      CAT_PRESETS_POP.forEach(color => {
        const s = document.createElement('button');
        s.className = 'cat-preset';
        s.style.background = color;
        s.dataset.color = color;
        s.type = 'button';
        s.addEventListener('click', () => {
          const hexEl = document.getElementById('catHexInput');
          if (hexEl) hexEl.value = color;
          updatePopSwatch(color);
          presetsEl.querySelectorAll('.cat-preset').forEach(p => p.classList.toggle('cat-preset-active', p.dataset.color === color));
        });
        presetsEl.appendChild(s);
      });
    }

    const catHexInput = document.getElementById('catHexInput');
    if (catHexInput) {
      catHexInput.addEventListener('input', e => {
        const v = e.target.value.trim();
        if (/^#[0-9a-fA-F]{6}$/.test(v)) {
          updatePopSwatch(v);
          if (presetsEl) {
            presetsEl.querySelectorAll('.cat-preset').forEach(p => p.classList.toggle('cat-preset-active', p.dataset.color === v.toLowerCase()));
          }
        }
      });
    }

    renderCategoryManager(context);
  }

  global.AO3TrackerCustomCatsPopupController = {
    setupControls,
    renderCategoryManager,
    openModal
  };

})(typeof globalThis !== 'undefined' ? globalThis : this);
