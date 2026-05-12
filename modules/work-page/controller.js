(function (global) {
  'use strict';

  function initCurrentBar(context) {
    const {
      window,
      document,
      extractWorkInfo,
      getWorks,
      getCustomCats,
      setWorks,
      trackedLabelFor,
      labelFor,
      normalizeStatusValue,
      nextFinishedAt,
      applyRereadingChapterResetIfNeeded,
      pruneTrackedWorkIfInvalid,
      showMiniToast,
      renderSidebar,
      syncWorkPageTrackingControls,
      confirmRemoveFromTracker,
      esc,
      setActiveTab
    } = context || {};

    const info = typeof extractWorkInfo === 'function' ? extractWorkInfo() : null;
    const bar = document && document.getElementById('aot-current-bar');
    if (!bar) return;
    if (!info) {
      bar.style.display = 'none';
      return;
    }

    const titleEl = document.getElementById('aot-current-title');
    const dropdown = document.getElementById('aot-current-dropdown');
    if (!titleEl || !dropdown) return;

    titleEl.textContent = info.title.length > 34 ? `${info.title.slice(0, 33)}\u2026` : info.title;
    titleEl.style.cursor = 'pointer';
    titleEl.title = 'Jump to card';
    titleEl.onclick = () => {
      getWorks(works => {
        const work = works[info.workId];
        if (!work) return;
        const targetTab = work.status || 'all';
        if (typeof setActiveTab === 'function') setActiveTab(targetTab);
        const sidebar = document.getElementById('ao3tracker-panel');
        if (sidebar) {
          sidebar.querySelectorAll('.aot-tab').forEach(tab => tab.classList.toggle('aot-active', tab.dataset.tab === targetTab));
        }
        if (global.AO3TrackerSidebarController && typeof global.AO3TrackerSidebarController.setPendingCardJump === 'function') {
          global.AO3TrackerSidebarController.setPendingCardJump(info.workId);
        }
        renderSidebar();
      });
    };
    bar.style.display = 'flex';

    function syncAddBtnLabel() {
      getWorks(works => {
        const addBtn = document.getElementById('aot-current-add-btn');
        const addLabel = document.getElementById('aot-current-add-label');
        if (!addBtn || !addLabel) return;
        const existing = works[info.workId];
        if (existing) {
          addLabel.textContent = trackedLabelFor(existing.status);
          addBtn.classList.add('aot-has-status');
        } else {
          addLabel.textContent = '+ Add';
          addBtn.classList.remove('aot-has-status');
        }
        document.querySelectorAll('.aot-cur-opt[data-status]').forEach(opt => {
          const status = opt.dataset.status;
          if (!status || status === 'remove') return;
          opt.classList.toggle('aot-cur-opt-active', !!(existing && existing.status === status));
        });
      });
    }

    syncAddBtnLabel();

    function refreshCurrentDropdownCustomCats() {
      const existingDivider = dropdown.querySelector('.aot-cur-custom-divider');
      if (existingDivider) {
        let node = existingDivider;
        while (node) {
          const next = node.nextSibling;
          dropdown.removeChild(node);
          node = next;
        }
      }

      getCustomCats(cats => {
        const catList = Object.values(cats);
        if (!catList.length) return;
        const divider = document.createElement('div');
        divider.className = 'aot-cur-custom-divider';
        dropdown.appendChild(divider);
        const catScroll = document.createElement('div');
        catScroll.className = 'aot-cat-scroll-wrap';
        dropdown.appendChild(catScroll);
        catList.forEach(cat => {
          const button = document.createElement('button');
          button.className = 'aot-cur-opt aot-cur-opt-cat';
          button.dataset.catId = cat.id;
          button.innerHTML = `<span class="aot-cur-cat-dot" style="background:${esc(cat.color)}"></span><span class="aot-cur-cat-label" style="color:${esc(cat.color)}">${esc(cat.name)}</span>`;
          button.onclick = event => {
            event.stopPropagation();
            getWorks(works => {
              const existing = works[info.workId];
              if (!existing) {
                works[info.workId] = {
                  id: info.workId,
                  title: info.title,
                  author: info.author,
                  authorUrl: info.authorUrl || null,
                  isOrphaned: info.isOrphaned === true,
                  summary: info.summary || '',
                  url: info.url,
                  fandoms: info.fandoms || [],
                  relationship: info.relationship || '',
                  seriesTitle: info.seriesTitle || '',
                  seriesUrl: info.seriesUrl || null,
                  seriesPosition: info.seriesPosition || '',
                  status: '',
                  wordCount: info.wordCount || null,
                  updatedAt: info.updatedAt || null,
                  completedAt: info.completedAt || null,
                  publishedAt: info.publishedAt || null,
                  inferredCompletedAt: info.inferredCompletedAt || null,
                  finishedAt: null,
                  subscribedAtAo3: typeof info.subscribedAtAo3 === 'boolean' ? info.subscribedAtAo3 : null,
                  customCats: [],
                  addedAt: Date.now(),
                  movedAt: Date.now()
                };
              }
              const current = works[info.workId].customCats || [];
              if (current.includes(cat.id)) {
                works[info.workId].customCats = current.filter(id => id !== cat.id);
                const removedWork = pruneTrackedWorkIfInvalid(works, info.workId);
                showMiniToast(removedWork ? 'Removed from tracker' : `Removed from ${cat.name}`);
              } else {
                works[info.workId].customCats = [...current, cat.id];
                showMiniToast(existing ? `Added to ${cat.name}!` : `Tracked in ${cat.name}!`);
              }
              setWorks(works);
              dropdown.classList.add('aot-hidden');
              syncAddBtnLabel();
              renderSidebar();
            });
          };
          catScroll.appendChild(button);
        });
      });
    }

    const addBtn = document.getElementById('aot-current-add-btn');
    if (addBtn) {
      addBtn.onclick = event => {
        event.stopPropagation();
        const wasHidden = dropdown.classList.contains('aot-hidden');
        dropdown.classList.toggle('aot-hidden');
        if (wasHidden) {
          syncAddBtnLabel();
          refreshCurrentDropdownCustomCats();
        }
      };
    }

    if (!document._ao3CurrentBarListenerAdded) {
      document._ao3CurrentBarListenerAdded = true;
      document.addEventListener('click', event => {
        const currentAddBtn = document.getElementById('aot-current-add-btn');
        const currentDropdown = document.getElementById('aot-current-dropdown');
        if (currentAddBtn && currentDropdown && !currentAddBtn.contains(event.target) && !currentDropdown.contains(event.target)) {
          currentDropdown.classList.add('aot-hidden');
        }
      });
    }

    document.querySelectorAll('#aot-current-dropdown .aot-cur-opt[data-status]').forEach(button => {
      button.onclick = event => {
        event.stopPropagation();
        const status = button.dataset.status;
        if (!status) return;
        if (status === 'remove') {
          if (!confirmRemoveFromTracker()) return;
          getWorks(works => {
            if (!works[info.workId]) {
              dropdown.classList.add('aot-hidden');
              return;
            }
            delete works[info.workId];
            setWorks(works);
            showMiniToast('Removed from tracker');
            dropdown.classList.add('aot-hidden');
            syncAddBtnLabel();
            syncWorkPageTrackingControls();
            renderSidebar();
          });
          return;
        }

        getWorks(works => {
          const existing = works[info.workId];
          if (existing && existing.status === status) {
            showMiniToast(`Already in ${labelFor(status)}!`);
            dropdown.classList.add('aot-hidden');
            return;
          }

          const merged = {
            ...(existing || {}),
            id: info.workId,
            title: info.title,
            author: info.author,
            authorUrl: info.authorUrl || existing?.authorUrl || null,
            isOrphaned: info.isOrphaned === true || existing?.isOrphaned === true,
            summary: info.summary || existing?.summary || '',
            url: info.url,
            fandoms: info.fandoms,
            relationship: info.relationship || existing?.relationship || '',
            seriesTitle: info.seriesTitle || existing?.seriesTitle || '',
            seriesUrl: info.seriesUrl || existing?.seriesUrl || null,
            seriesPosition: info.seriesPosition || existing?.seriesPosition || '',
            status: normalizeStatusValue(status),
            wordCount: info.wordCount || existing?.wordCount || null,
            updatedAt: info.updatedAt || existing?.updatedAt || null,
            completedAt: info.completedAt || existing?.completedAt || null,
            publishedAt: info.publishedAt || existing?.publishedAt || null,
            inferredCompletedAt: info.inferredCompletedAt || existing?.inferredCompletedAt || null,
            finishedAt: nextFinishedAt(existing?.status, status, existing?.finishedAt),
            subscribedAtAo3: typeof info.subscribedAtAo3 === 'boolean' ? info.subscribedAtAo3 : existing?.subscribedAtAo3,
            addedAt: existing?.addedAt || Date.now(),
            movedAt: Date.now()
          };
          works[info.workId] = merged;

          if (existing && status === 'rereading' && existing.status !== 'rereading' && merged.furthestChapter) {
            applyRereadingChapterResetIfNeeded(existing.status, status, merged, () => setWorks(works));
          } else {
            setWorks(works);
          }

          dropdown.classList.add('aot-hidden');
          showMiniToast(existing ? `Moved to ${labelFor(status)}!` : `Added to ${labelFor(status)}!`);
          syncAddBtnLabel();
          if (typeof setActiveTab === 'function') setActiveTab(status);
          const sidebar = document.getElementById('ao3tracker-sidebar');
          if (sidebar) {
            sidebar.querySelectorAll('.aot-tab').forEach(tab => {
              tab.classList.toggle('aot-active', tab.dataset.tab === status);
            });
          }
          renderSidebar();
        });
      };
    });
  }

  function refreshWorkPageMetaRow(context) {
    const {
      window,
      document,
      getWorks,
      getCustomCats,
      normalizeStatusValue,
      esc
    } = context || {};

    const wrap = document && document.getElementById('ao3tracker-work-meta');
    if (!wrap) return;
    const row = wrap.querySelector('.ao3t-work-meta-row');
    if (!row) return;
    const workMatch = window.location.href.match(/\/works\/(\d+)/);
    if (!workMatch) return;
    const workId = workMatch[1];

    getWorks(works => {
      getCustomCats(cats => {
        const work = works[workId];
        if (!work) {
          wrap.style.display = 'none';
          return;
        }
        wrap.style.display = '';

        const statusLabels = {
          want: 'For Later',
          progress: 'Reading',
          completed: 'Completed',
          rereading: 'Re-reading',
          onhold: 'On Hold',
          dnf: 'Did Not Finish',
          lost: 'Deleted'
        };
        const normalizedStatus = normalizeStatusValue(work.status);
        const statusLabel = statusLabels[normalizedStatus];
        const filledSvg = '<svg class="ao3t-star-svg ao3t-star-filled" viewBox="0 0 16 16" fill="#f59e0b" xmlns="http://www.w3.org/2000/svg"><polygon points="8,1.5 10,6 15,6.5 11.5,10 12.5,15 8,12.5 3.5,15 4.5,10 1,6.5 6,6"/></svg>';
        const emptySvg = '<svg class="ao3t-star-svg ao3t-star-empty" viewBox="0 0 16 16" fill="none" stroke="#d1d5db" stroke-width="1.3" xmlns="http://www.w3.org/2000/svg"><polygon points="8,1.5 10,6 15,6.5 11.5,10 12.5,15 8,12.5 3.5,15 4.5,10 1,6.5 6,6"/></svg>';

        const parts = [];
        if (statusLabel) {
          parts.push(`<span class="ao3t-search-badge ao3t-search-badge-${normalizedStatus}">${esc(statusLabel)}</span>`);
        }
        (work.customCats || []).forEach(catId => {
          const cat = cats[catId];
          if (!cat) return;
          parts.push(`<span class="ao3t-work-meta-cat" style="--chip-color:${esc(cat.color)}">${esc(cat.name)}</span>`);
        });
        if (work.furthestChapter && normalizedStatus !== 'completed') {
          const chapter = work.furthestChapter;
          const href = chapter.id
            ? `https://archiveofourown.org/works/${workId}/chapters/${chapter.id}`
            : `https://archiveofourown.org/works/${workId}`;
          const chapterLabel = `Ch. ${chapter.num}${chapter.total ? '/' + chapter.total : ''}`;
          parts.push(`<a class="ao3t-search-chap" href="${esc(href)}">${esc(chapterLabel)}</a>`);
        }
        if (work.rating) {
          parts.push(`<span class="ao3t-search-stars">${filledSvg.repeat(work.rating) + emptySvg.repeat(5 - work.rating)}</span>`);
        }

        row.innerHTML = parts.join('');
      });
    });
  }

  function injectWorkPageMetaRow(context) {
    const {
      window,
      document,
      chrome,
      WORK_META_COLLAPSE_KEY,
      refreshWorkPageMetaRow
    } = context || {};

    if (!window.location.href.match(/archiveofourown\.org\/(?:collections\/[^/]+\/)?works\/\d+/)) return;
    if (document.getElementById('ao3tracker-work-meta')) {
      refreshWorkPageMetaRow();
      return;
    }

    const byline = document.querySelector('.preface.group h3.byline') ||
      document.querySelector('.chapter.preface.group h3.byline') ||
      document.querySelector('h3.byline');
    if (!byline) return;

    const wrap = document.createElement('div');
    wrap.id = 'ao3tracker-work-meta';
    wrap.className = 'ao3t-work-meta';
    const toggleSvg = '<svg class="ao3t-work-meta-toggle-svg" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="8" cy="8" r="5.75" fill="none" stroke="currentColor" stroke-width="1.2"/><text class="ao3t-work-meta-toggle-i" x="8" y="8" text-anchor="middle" dominant-baseline="central" fill="currentColor" font-size="11" font-weight="700" font-family="Georgia, \'Times New Roman\', Times, serif">i</text></svg>';
    wrap.innerHTML = `
      <button type="button" class="ao3t-work-meta-toggle" aria-expanded="true" aria-label="Hide tracker details" title="Show or hide tracker details">
        ${toggleSvg}<span class="ao3t-work-meta-chevron">\u25BE</span>
      </button>
      <div class="ao3t-work-meta-row" aria-hidden="false"></div>`;
    byline.insertAdjacentElement('afterend', wrap);

    const button = wrap.querySelector('.ao3t-work-meta-toggle');
    const chevron = wrap.querySelector('.ao3t-work-meta-chevron');
    button.addEventListener('click', () => {
      const collapsed = wrap.classList.toggle('ao3t-work-meta-collapsed');
      button.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      button.setAttribute('aria-label', collapsed ? 'Show tracker details' : 'Hide tracker details');
      if (chevron) chevron.textContent = collapsed ? '\u25B8' : '\u25BE';
      wrap.querySelector('.ao3t-work-meta-row').setAttribute('aria-hidden', collapsed ? 'true' : 'false');
      try {
        if (chrome?.storage?.local) chrome.storage.local.set({ [WORK_META_COLLAPSE_KEY]: collapsed });
      } catch (error) {}
    });

    try {
      if (!chrome?.storage?.local) {
        refreshWorkPageMetaRow();
        return;
      }
    } catch (error) {
      refreshWorkPageMetaRow();
      return;
    }

    chrome.storage.local.get(WORK_META_COLLAPSE_KEY, data => {
      if (data[WORK_META_COLLAPSE_KEY]) {
        wrap.classList.add('ao3t-work-meta-collapsed');
        button.setAttribute('aria-expanded', 'false');
        button.setAttribute('aria-label', 'Show tracker details');
        if (chevron) chevron.textContent = '\u25B8';
        wrap.querySelector('.ao3t-work-meta-row').setAttribute('aria-hidden', 'true');
      }
      refreshWorkPageMetaRow();
    });
  }

  const controller = {
    initCurrentBar,
    refreshWorkPageMetaRow,
    injectWorkPageMetaRow
  };

  global.AO3TrackerWorkPageController = controller;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = controller;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
