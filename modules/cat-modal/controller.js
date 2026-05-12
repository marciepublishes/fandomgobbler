(function (global) {
  'use strict';

  let _deps = null;
  let _editingCatId = null;
  let _catModalSourceWorkId = null;

  const CAT_PRESETS = ['#7c3aed','#db2777','#dc2626','#d97706','#16a34a','#0891b2','#2563eb','#4f46e5','#d946ef','#6b7280'];

  function init(deps) {
    _deps = deps;
  }

  function getCatModalSourceWorkId() { return _catModalSourceWorkId; }
  function setCatModalSourceWorkId(val) { _catModalSourceWorkId = val; }

  function updateCatSwatch(color) {
    const { document } = _deps;
    const swatch = document.getElementById('aot-cat-swatch');
    if (swatch) swatch.style.background = color;
  }

  function openCatModal(catId) {
    const { getCustomCats, document } = _deps;
    _editingCatId = catId;
    const overlay = document.getElementById('aot-cat-overlay');
    const titleEl = document.getElementById('aot-cat-modal-title');
    const nameEl  = document.getElementById('aot-cat-name');
    const hexEl   = document.getElementById('aot-cat-hex');
    const deleteBtn = document.getElementById('aot-cat-delete');
    if (!overlay || !titleEl || !nameEl || !hexEl) return;

    if (catId) {
      getCustomCats(cats => {
        const cat = cats[catId];
        if (!cat) return;
        titleEl.textContent = 'Edit Category';
        nameEl.value = cat.name;
        hexEl.value = cat.color;
        updateCatSwatch(cat.color);
        document.querySelectorAll('.aot-cat-preset').forEach(p => p.classList.toggle('aot-cat-preset-active', p.dataset.color === cat.color));
        deleteBtn?.classList.remove('aot-hidden');
        overlay.classList.remove('aot-hidden');
        setTimeout(() => nameEl.focus(), 50);
      });
    } else {
      titleEl.textContent = 'New Category';
      nameEl.value = '';
      const defaultColor = CAT_PRESETS[0];
      hexEl.value = defaultColor;
      updateCatSwatch(defaultColor);
      document.querySelectorAll('.aot-cat-preset').forEach(p => p.classList.toggle('aot-cat-preset-active', p.dataset.color === defaultColor));
      deleteBtn?.classList.add('aot-hidden');
      overlay.classList.remove('aot-hidden');
      setTimeout(() => nameEl.focus(), 50);
    }
  }

  function closeCatModal() {
    const { document } = _deps;
    document.getElementById('aot-cat-overlay')?.classList.add('aot-hidden');
    _editingCatId = null;
  }

  function saveCatModal() {
    const { getCustomCats, setCustomCats, genCatId, renderSidebar, showMiniToast, document, flippedSidebarCards } = _deps;
    const nameEl = document.getElementById('aot-cat-name');
    const hexEl = document.getElementById('aot-cat-hex');
    if (!nameEl || !hexEl) return;
    const name = nameEl.value.trim();
    if (!name) { nameEl.focus(); return; }
    const hex = hexEl.value.trim();
    const color = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : CAT_PRESETS[0];
    getCustomCats(cats => {
      if (_editingCatId) {
        cats[_editingCatId] = { ...cats[_editingCatId], name, color };
      } else {
        const id = genCatId();
        cats[id] = { id, name, color };
      }
      setCustomCats(cats);
      closeCatModal();
      renderCustomTabs();
      if (_catModalSourceWorkId) flippedSidebarCards.add(_catModalSourceWorkId);
      renderSidebar();
      showMiniToast(_editingCatId ? `Category updated!` : `Category "${name}" created!`);
      _catModalSourceWorkId = null;
    });
  }

  function deleteCat() {
    const { getCustomCats, setCustomCats, getWorks, setWorks, pruneTrackedWorkIfInvalid, renderSidebar, showMiniToast, document, getActiveTab, setActiveTab } = _deps;
    if (!_editingCatId) return;
    const catId = _editingCatId;
    getCustomCats(cats => {
      const catName = cats[catId]?.name || 'Category';
      delete cats[catId];
      setCustomCats(cats);
      // Remove this category from all works
      getWorks(works => {
        Object.values(works).forEach(w => {
          if ((w.customCats || []).includes(catId)) {
            w.customCats = w.customCats.filter(c => c !== catId);
            pruneTrackedWorkIfInvalid(works, w.id);
          }
        });
        setWorks(works);
        if (getActiveTab() === catId) setActiveTab('all');
        closeCatModal();
        renderCustomTabs();
        renderSidebar();
        showMiniToast(`"${catName}" deleted.`);
      });
    });
  }

  function buildLabelsDropdown(work) {
    const { getWorks, setWorks, getCustomCats, pruneTrackedWorkIfInvalid, renderSidebar, esc, flippedSidebarCards, expandedSummaryCards } = _deps;

    function updateCustomTabCounts() {
      if (typeof _deps.updateCustomTabCounts === 'function') _deps.updateCustomTabCounts();
    }

    const wrapper = document.createElement('span');
    wrapper.className = 'aot-labels-wrap';

    const btn = document.createElement('button');
    btn.className = 'aot-btn aot-btn-labels';
    btn.textContent = 'Custom category';

    const dropdown = document.createElement('div');
    dropdown.className = 'aot-labels-dropdown';

    function refreshDropdown(cats) {
      dropdown.innerHTML = '';
      const catList = Object.values(cats);
      if (!catList.length) {
        const empty = document.createElement('div');
        empty.className = 'aot-labels-empty';
        empty.textContent = 'No custom categories yet';
        dropdown.appendChild(empty);
        return;
      }
      // "None" option clears all custom categories from this work
      const noneRow = document.createElement('button');
      noneRow.className = 'aot-labels-opt aot-labels-none';
      const hasAnyCat = (work.customCats || []).length > 0;
      noneRow.innerHTML = `<span class="aot-labels-check">${hasAnyCat ? '' : '✓'}</span>None`;
      noneRow.addEventListener('click', e => {
        e.stopPropagation();
        getWorks(ws => {
          if (!ws[work.id]) return;
          ws[work.id].customCats = [];
          const removedWork = pruneTrackedWorkIfInvalid(ws, work.id);
          setWorks(ws);
          work.customCats = removedWork ? [] : (ws[work.id]?.customCats || []);
          getCustomCats(refreshDropdown);
          updateCustomTabCounts();
          if (removedWork) {
            flippedSidebarCards.delete(work.id);
            expandedSummaryCards.delete(work.id);
          }
          renderSidebar();
        });
      });
      dropdown.appendChild(noneRow);
      catList.forEach(cat => {
        const row = document.createElement('button');
        row.className = 'aot-labels-opt';
        const checked = (work.customCats || []).includes(cat.id);
        row.innerHTML = `<span class="aot-labels-check">${checked ? '✓' : ''}</span><span class="aot-labels-dot" style="background:${esc(cat.color)}"></span>${esc(cat.name)}`;
        row.addEventListener('click', e => {
          e.stopPropagation();
          getWorks(ws => {
            if (!ws[work.id]) return;
            const current = ws[work.id].customCats || [];
            if (current.includes(cat.id)) {
              ws[work.id].customCats = current.filter(c => c !== cat.id);
            } else {
              ws[work.id].customCats = [...current, cat.id];
            }
            const removedWork = pruneTrackedWorkIfInvalid(ws, work.id);
            setWorks(ws);
            work.customCats = removedWork ? [] : (ws[work.id]?.customCats || []);
            // Refresh check marks in this dropdown
            getCustomCats(refreshDropdown);
            updateCustomTabCounts();
            if (removedWork) {
              flippedSidebarCards.delete(work.id);
              expandedSummaryCards.delete(work.id);
            }
            renderSidebar();
          });
        });
        dropdown.appendChild(row);
      });
    }

    btn.addEventListener('click', e => {
      e.stopPropagation();
      const isOpen = dropdown.classList.contains('open');
      document.querySelectorAll('.aot-labels-dropdown.open').forEach(d => d.classList.remove('open'));
      if (!isOpen) {
        getCustomCats(cats => {
          refreshDropdown(cats);
          dropdown.classList.add('open');
        });
      }
    });

    wrapper.appendChild(btn);
    wrapper.appendChild(dropdown);
    return wrapper;
  }

  function renderCustomTabs() {
    const { getCustomCats, renderSidebar, esc, document, getActiveTab, setActiveTab } = _deps;
    const container = document.getElementById('aot-custom-tabs');
    if (!container) return;
    getCustomCats(cats => {
      container.innerHTML = '';
      Object.values(cats).forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'aot-tab aot-custom-tab' + (getActiveTab() === cat.id ? ' aot-active' : '');
        btn.dataset.tab = cat.id;
        btn.style.setProperty('--cat-color', cat.color);
        btn.innerHTML = `<span class="aot-custom-tab-dot" style="background:${esc(cat.color)}"></span>${esc(cat.name)} <span class="aot-cnt aot-custom-cnt" id="aot-cnt-${esc(cat.id)}">0</span>`;
        btn.addEventListener('click', () => {
          if (getActiveTab() === cat.id) {
            // Already active - click again to edit
            openCatModal(cat.id);
          } else {
            setActiveTab(cat.id);
            const sidebar = document.getElementById('ao3tracker-sidebar');
            sidebar && sidebar.querySelectorAll('.aot-tab').forEach(t => t.classList.toggle('aot-active', t.dataset.tab === cat.id));
            renderSidebar();
          }
        });
        container.appendChild(btn);
      });
      updateCustomTabCounts();
    });
  }

  function updateCustomTabCounts() {
    const { getCustomCats, getWorks } = _deps;
    getCustomCats(cats => {
      getWorks(works => {
        Object.values(cats).forEach(cat => {
          const el = document.getElementById(`aot-cnt-${cat.id}`);
          if (!el) return;
          const count = Object.values(works).filter(w => (w.customCats || []).includes(cat.id)).length;
          el.textContent = count;
        });
      });
    });
  }

  const AO3TrackerCatModal = {
    init,
    openCatModal,
    closeCatModal,
    saveCatModal,
    deleteCat,
    updateCatSwatch,
    buildLabelsDropdown,
    renderCustomTabs,
    updateCustomTabCounts,
    setCatModalSourceWorkId,
    getCatModalSourceWorkId,
    CAT_PRESETS
  };

  global.AO3TrackerCatModal = AO3TrackerCatModal;
  if (typeof module !== 'undefined' && module.exports) module.exports = AO3TrackerCatModal;
})(typeof globalThis !== 'undefined' ? globalThis : this);
