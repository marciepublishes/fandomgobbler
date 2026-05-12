(function (global) {
  'use strict';

  function showBar(ctx) {
    const currentWork = ctx.getCurrentWork();
    if (!currentWork) return;

    const bar = document.getElementById('addCurrentBar');
    const titleEl = document.getElementById('currentWorkTitle');
    const addBtn = document.getElementById('currentAddBtn');
    const addBtnLabel = document.getElementById('currentAddBtnLabel');
    const dropdown = document.getElementById('currentAddDropdown');

    bar.classList.remove('hidden');
    titleEl.textContent = currentWork.title || 'Unknown work';
    titleEl.style.cursor = 'pointer';
    const platform = currentWork.platform || ctx.getCurrentPlatform();
    titleEl.title = `Open work on ${ctx.platformEditionLabel(platform).replace(' Edition', '')}`;
    titleEl.addEventListener('click', () => {
      if (!currentWork.url) return;
      try { chrome.tabs.create({ url: currentWork.url }); } catch (e) {}
    });

    const existing = ctx.getWorksMap()[currentWork.workId];
    if (existing) {
      addBtnLabel.textContent = ctx.trackedLabelFor(existing.status);
      addBtn.classList.add('has-status');
    }

    function ensureCurrentWorkTracked(defaultStatus = '') {
      const tracked = ctx.getWorksMap()[currentWork.workId];
      if (tracked) return tracked;
      ctx.addWork({ ...currentWork, status: defaultStatus });
      addBtnLabel.textContent = ctx.trackedLabelFor(defaultStatus);
      addBtn.classList.add('has-status');
      return ctx.getWorksMap()[currentWork.workId];
    }

    if (!document._ao3PopupDropdownListenerAdded) {
      document._ao3PopupDropdownListenerAdded = true;
      document.addEventListener('click', (e) => {
        const btn2 = document.getElementById('currentAddBtn');
        const dd2 = document.getElementById('currentAddDropdown');
        if (btn2 && dd2 && !btn2.contains(e.target) && !dd2.contains(e.target)) {
          dd2.classList.add('hidden');
        }
      });
    }

    function refreshDropdownState() {
      const current = ctx.getWorksMap()[currentWork.workId];
      document.querySelectorAll('.current-add-option[data-status]').forEach(opt => {
        const status = opt.dataset.status;
        if (!status || status === 'remove') return;
        opt.classList.toggle('current-add-option-active', !!(current && current.status === status));
      });
    }

    document.querySelectorAll('.current-add-option').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const status = btn.dataset.status;
        if (!status) return;
        if (status === 'remove') {
          if (ctx.getWorksMap()[currentWork.workId] && ctx.removeWork(currentWork.workId)) {
            addBtnLabel.textContent = '+ Add to list';
            addBtn.classList.remove('has-status');
            dropdown.classList.add('hidden');
            refreshDropdownState();
            ctx.renderAll();
          }
          return;
        }
        const cur = ctx.getWorksMap()[currentWork.workId];
        if (cur && cur.status === status) {
          ctx.showToast('Already in ' + ctx.labelFor(status) + '!');
          dropdown.classList.add('hidden');
          return;
        }
        ctx.addWork({ ...currentWork, status });
        addBtnLabel.textContent = ctx.labelFor(status);
        addBtn.classList.add('has-status');
        dropdown.classList.add('hidden');
        refreshDropdownState();
        ctx.showToast(cur ? `Moved to ${ctx.labelFor(status)}!` : `Added to ${ctx.labelFor(status)}!`);
        ctx.renderAll();
      };
    });

    refreshDropdownState();

    function refreshPopupCurrentCustomCats() {
      dropdown.querySelectorAll('.pop-cur-custom-divider, .pop-cat-scroll-wrap').forEach(el => el.remove());
      ctx.getCustomCats(cats => {
        const catList = Object.values(cats);
        if (!catList.length) return;
        const divider = document.createElement('div');
        divider.className = 'pop-cur-custom-divider';
        dropdown.appendChild(divider);
        const catScroll = document.createElement('div');
        catScroll.className = 'pop-cat-scroll-wrap';
        dropdown.appendChild(catScroll);
        catList.forEach(cat => {
          const btn = document.createElement('button');
          btn.className = 'current-add-option pop-cur-opt-cat';
          btn.innerHTML = `<span class="pop-cur-cat-dot" style="background:${ctx.escHtml(cat.color)}"></span><span style="color:${ctx.escHtml(cat.color)}">${ctx.escHtml(cat.name)}</span>`;
          btn.onclick = (e) => {
            e.stopPropagation();
            const tracked = ensureCurrentWorkTracked('');
            const cur = tracked.customCats || [];
            tracked.customCats = cur.includes(cat.id)
              ? cur.filter(c => c !== cat.id)
              : [...cur, cat.id];
            const removedWork = ctx.pruneTrackedWorkIfInvalid(currentWork.workId);
            ctx.saveWorks();
            dropdown.classList.add('hidden');
            const added = !removedWork && tracked.customCats.includes(cat.id);
            ctx.showToast(added
              ? (cur.length ? `Added to ${cat.name}!` : `Tracked in ${cat.name}!`)
              : (removedWork ? 'Removed from tracker' : `Removed from ${cat.name}`));
            refreshDropdownState();
            ctx.renderAll();
          };
          catScroll.appendChild(btn);
        });
      });
    }

    addBtn.onclick = (e) => {
      e.stopPropagation();
      const wasHidden = dropdown.classList.contains('hidden');
      dropdown.classList.toggle('hidden');
      if (wasHidden) refreshPopupCurrentCustomCats();
    };
  }

  global.AO3TrackerCurrentWorkPopupController = { showBar };
  if (typeof module !== 'undefined' && module.exports) module.exports = global.AO3TrackerCurrentWorkPopupController;
})(typeof globalThis !== 'undefined' ? globalThis : this);
