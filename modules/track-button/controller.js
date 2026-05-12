(function (global) {
  'use strict';

  let _deps = null;

  function init(deps) {
    _deps = deps;
  }

  function updateInlineBadge(status) {
    const { document } = _deps;
    const b = document.getElementById('ao3tracker-badge');
    if (!b) return;
    b.textContent = { want: 'For Later', progress: 'Reading', completed: 'Done', rereading: 'Re-reading', onhold: 'Hold', dnf: 'DNF' }[status] || '';
    b.dataset.status = status || '';
  }

  function _doInjectTrackButton(info) {
    const {
      getWorks, setWorks, getCustomCats, renderSidebar, showMiniToast, nextFinishedAt,
      normalizeStatusValue, applyRereadingChapterResetIfNeeded, confirmRemoveFromTracker,
      labelFor, refreshWorkPageMetaRow, document, esc
    } = _deps;

    if (document.getElementById('ao3tracker-btn')) return;
    const anchor = document.querySelector('.preface.group h3.byline') ||
                   document.querySelector('.chapter.preface.group h3.byline') ||
                   document.querySelector('h3.byline') ||
                   document.querySelector('.work.meta.group') ||
                   document.querySelector('.chapter.preface.group') ||
                   document.querySelector('#feedback');
    if (!anchor) return;

    const container = document.createElement('div');
    container.id = 'ao3tracker-btn';
    container.innerHTML = `
      <div class="ao3tracker-widget">
        <span class="ao3tracker-label"><svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 13.5C8 13.5 3 11 1.5 11V3C3 3 8 5.5 8 5.5C8 5.5 13 3 14.5 3V11C13 11 8 13.5 8 13.5Z"/><line x1="8" y1="5.5" x2="8" y2="13.5"/></svg> Track</span>
        <div class="ao3tracker-dropdown">
          <button class="ao3tracker-option" data-status="want"><svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="8,1.5 10,6 15,6.5 11.5,10 12.5,15 8,12.5 3.5,15 4.5,10 1,6.5 6,6"/></svg> For Later</button>
          <button class="ao3tracker-option" data-status="progress"><svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 13.5C8 13.5 3 11 1.5 11V3C3 3 8 5.5 8 5.5C8 5.5 13 3 14.5 3V11C13 11 8 13.5 8 13.5Z"/><line x1="8" y1="5.5" x2="8" y2="13.5"/></svg> Reading</button>
          <button class="ao3tracker-option" data-status="completed"><svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="2.5,8.5 6.5,12.5 13.5,4"/></svg> Completed</button>
          <button class="ao3tracker-option" data-status="rereading"><svg class="ico" viewBox="0 0 383.631 383.631" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M47.331,210.289c-1.408,1.375-3.273,2.296-5.374,2.508c-0.116,0.012-0.232,0.021-0.349,0.029c-0.006,0-0.013,0.001-0.02,0.001c-0.185,0.011-0.367,0.017-0.549,0.017c-2.109,0-4.073-0.737-5.624-1.982c-0.001,0-0.001,0-0.001-0.001c-0.007-0.005-0.013-0.01-0.019-0.015c-0.002-0.001-0.004-0.003-0.006-0.004c-0.004-0.003-0.009-0.007-0.013-0.011c-0.003-0.002-0.007-0.005-0.01-0.008s-0.006-0.005-0.009-0.007c-0.004-0.003-0.009-0.007-0.013-0.01c-0.002-0.001-0.004-0.003-0.006-0.005c-0.005-0.004-0.011-0.008-0.016-0.013c-0.046-0.038-0.092-0.077-0.138-0.116c-0.006-0.005-0.012-0.01-0.018-0.015c-0.001-0.001-0.002-0.002-0.003-0.002c-0.005-0.004-0.01-0.009-0.016-0.013c-0.001-0.002-0.004-0.004-0.006-0.005c-0.004-0.004-0.008-0.007-0.013-0.011c-0.003-0.002-0.006-0.005-0.009-0.007c-0.003-0.003-0.006-0.006-0.01-0.009c-0.004-0.004-0.009-0.008-0.014-0.012c-0.001-0.002-0.003-0.003-0.005-0.005c-0.207-0.183-0.405-0.375-0.595-0.575L2.505,176.658c-3.44-3.587-3.322-9.285,0.266-12.725c3.587-3.44,9.284-3.322,12.725,0.265l16.426,17.125c3.887-58.736,40.101-111.535,95.123-135.771c39.08-17.212,82.524-18.177,122.331-2.714c39.805,15.462,71.206,45.501,88.417,84.582c2.004,4.549-0.06,9.861-4.608,11.864c-4.55,2.003-9.862-0.061-11.864-4.609c-15.273-34.68-43.139-61.336-78.462-75.058c-35.322-13.721-73.875-12.867-108.558,2.409C85.342,83.591,53.163,130.64,49.854,182.927l18.381-17.632c3.589-3.44,9.285-3.322,12.726,0.265s3.322,9.284-0.265,12.725L47.331,210.289z M381.087,207.409l-32.648-33.615c-1.759-1.838-4.291-2.921-7-2.769c-0.005,0-0.01,0-0.017,0.001c-0.143,0.008-0.285,0.02-0.428,0.034c-2.123,0.221-4.005,1.169-5.415,2.575l-32.732,32.273c-3.54,3.49-3.58,9.188-0.091,12.728c3.491,3.54,9.189,3.58,12.728,0.09l17.594-17.346c-3.513,52.052-35.643,98.837-84.405,120.314c-18.545,8.168-37.91,12.033-56.982,12.032c-54.556-0.002-106.675-31.636-130.038-84.682c-2.003-4.548-7.314-6.612-11.864-4.609c-4.549,2.003-6.612,7.315-4.608,11.864c26.329,59.781,85.053,95.43,146.536,95.426c21.487-0.001,43.319-4.357,64.213-13.559c55.03-24.239,91.261-77.082,95.127-135.845l17.12,17.627c3.463,3.565,9.16,3.649,12.727,0.186C384.467,216.673,384.55,210.975,381.087,207.409z"/></svg> Re-reading</button>
          <button class="ao3tracker-option" data-status="onhold"><svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="5.5" y1="3" x2="5.5" y2="13"/><line x1="10.5" y1="3" x2="10.5" y2="13"/></svg> On Hold</button>
          <button class="ao3tracker-option" data-status="dnf"><svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="3.5" y1="3.5" x2="12.5" y2="12.5"/><line x1="12.5" y1="3.5" x2="3.5" y2="12.5"/></svg> Did Not Finish</button>
          <div class="ao3tracker-divider"></div>
          <button class="ao3tracker-option ao3tracker-remove" data-status="remove"><svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="3.5" y1="3.5" x2="12.5" y2="12.5"/><line x1="12.5" y1="3.5" x2="3.5" y2="12.5"/></svg> Remove</button>
        </div>
        <span class="ao3tracker-status-badge" id="ao3tracker-badge"></span>
      </div>`;
    anchor.insertAdjacentElement('afterend', container);
    updateInlineBadge(null);

    const label = container.querySelector('.ao3tracker-label');
    const dropdown = container.querySelector('.ao3tracker-dropdown');

    if (typeof getCustomCats === 'function') {
      getCustomCats(cats => {
        const catList = Object.values(cats || {});
        if (!catList.length) return;
        const divider = document.createElement('div');
        divider.className = 'ao3tracker-divider';
        dropdown.appendChild(divider);
        const catScroll = document.createElement('div');
        catScroll.className = 'aot-cat-scroll-wrap';
        dropdown.appendChild(catScroll);
        catList.forEach(cat => {
          const btn = document.createElement('button');
          btn.className = 'ao3tracker-option ao3tracker-cat-opt';
          btn.dataset.catId = cat.id;
          const safeEsc = typeof esc === 'function' ? esc : s => String(s);
          btn.innerHTML = `<span class="ao3t-bd-cat-dot" style="--ao3t-dot-color:${safeEsc(cat.color)};background-color:${safeEsc(cat.color)}"></span> ${safeEsc(cat.name)}`;
          btn.addEventListener('click', e => {
            e.stopPropagation();
            dropdown.classList.remove('open');
            getWorks(works => {
              const prev = works[info.workId];
              works[info.workId] = {
                ...(prev || {}),
                id: info.workId, title: info.title, author: info.author,
                authorUrl: info.authorUrl || prev?.authorUrl || null,
                isOrphaned: info.isOrphaned === true || prev?.isOrphaned === true,
                summary: info.summary || prev?.summary || '',
                url: info.url,
                fandoms: info.fandoms,
                relationship: info.relationship || prev?.relationship || '',
                seriesTitle: info.seriesTitle || prev?.seriesTitle || '',
                seriesUrl: info.seriesUrl || prev?.seriesUrl || null,
                seriesPosition: info.seriesPosition || prev?.seriesPosition || '',
                status: prev?.status || '',
                wordCount: info.wordCount || prev?.wordCount || null,
                customCats: [...new Set([...(prev?.customCats || []), cat.id])],
                addedAt: prev?.addedAt || Date.now(),
                movedAt: Date.now()
              };
              setWorks(works);
              container.remove();
              showMiniToast(prev ? `Added to ${cat.name}!` : `Tracked in ${cat.name}!`);
              renderSidebar();
            });
          });
          catScroll.appendChild(btn);
        });
      });
    }

    label.addEventListener('click', e => { e.stopPropagation(); dropdown.classList.toggle('open'); });
    if (!document._ao3DropdownListenerAdded) {
      document._ao3DropdownListenerAdded = true;
      document.addEventListener('click', () => {
        document.querySelectorAll('.ao3tracker-dropdown').forEach(d => d.classList.remove('open'));
      });
    }

    container.querySelectorAll('.ao3tracker-option').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const status = btn.dataset.status;
        dropdown.classList.remove('open');
        getWorks(works => {
          if (status === 'remove') {
            if (!confirmRemoveFromTracker()) return;
            delete works[info.workId];
            updateInlineBadge(null);
            showMiniToast('Removed from tracker');
          } else if (works[info.workId]?.status === status) {
            showMiniToast('Already in ' + labelFor(status) + '!');
            return;
          } else {
            const isNew = !works[info.workId];
            const prev = works[info.workId];
            works[info.workId] = {
              ...(prev || {}),
              id: info.workId, title: info.title, author: info.author,
              authorUrl: info.authorUrl || prev?.authorUrl || null,
              isOrphaned: info.isOrphaned === true || prev?.isOrphaned === true,
              summary: info.summary || prev?.summary || '',
              url: info.url,
              fandoms: info.fandoms,
              relationship: info.relationship || prev?.relationship || '',
              seriesTitle: info.seriesTitle || prev?.seriesTitle || '',
              seriesUrl: info.seriesUrl || prev?.seriesUrl || null,
              seriesPosition: info.seriesPosition || prev?.seriesPosition || '',
              status,
              wordCount: info.wordCount || prev?.wordCount || null,
              kudosCount: info.kudosCount != null ? info.kudosCount : (prev?.kudosCount ?? null),
              bookmarksCount: info.bookmarksCount != null ? info.bookmarksCount : (prev?.bookmarksCount ?? null),
              hitsCount: info.hitsCount != null ? info.hitsCount : (prev?.hitsCount ?? null),
              updatedAt: info.updatedAt || prev?.updatedAt || null,
              completedAt: info.completedAt || prev?.completedAt || null,
              publishedAt: info.publishedAt || prev?.publishedAt || null,
              inferredCompletedAt: info.inferredCompletedAt || prev?.inferredCompletedAt || null,
              finishedAt: nextFinishedAt(prev?.status, status, prev?.finishedAt),
              subscribedAtAo3: typeof info.subscribedAtAo3 === 'boolean' ? info.subscribedAtAo3 : prev?.subscribedAtAo3,
              addedAt: prev?.addedAt || Date.now(),
              movedAt: Date.now()
            };
            if (!isNew && prev && status === 'rereading' && prev.status !== 'rereading') {
              applyRereadingChapterResetIfNeeded(prev.status, status, works[info.workId], () => setWorks(works));
            }
            container.remove();
            showMiniToast(isNew ? { want: 'Added to For Later!', progress: 'Added to Reading!', completed: 'Added to Completed!', rereading: 'Added to Re-reading!', onhold: 'Added to On Hold!', dnf: 'Added to DNF!' }[status] || 'Saved!' : `Moved to ${labelFor(status)}!`);
          }
          setWorks(works);
          if (status === 'remove') syncWorkPageTrackingControls();
          renderSidebar();
        });
      });
    });
  }

  function injectTrackButton() {
    const { getWorks, extractWorkInfo, document, window } = _deps;
    if (!window.location.href.match(/archiveofourown\.org\/(?:collections\/[^/]+\/)?works\/\d+/)) return;
    if (document.getElementById('ao3tracker-btn')) return;
    const info = extractWorkInfo();
    if (!info) return;

    // Check storage FIRST - only inject for untracked works to avoid insert->remove->reinject loop
    getWorks(works => {
      if (works[info.workId]) return;
      _doInjectTrackButton(info);
    });
  }

  function syncWorkPageTrackingControls() {
    const { refreshWorkPageMetaRow, document, window } = _deps;
    if (!window.location.href.match(/archiveofourown\.org\/(?:collections\/[^/]+\/)?works\/\d+/)) return;
    const trackBtn = document.getElementById('ao3tracker-btn');
    if (trackBtn) trackBtn.remove();
    injectTrackButton();
    refreshWorkPageMetaRow();
  }

  const AO3TrackerTrackButton = {
    init,
    injectTrackButton,
    syncWorkPageTrackingControls
  };

  global.AO3TrackerTrackButton = AO3TrackerTrackButton;
  if (typeof module !== 'undefined' && module.exports) module.exports = AO3TrackerTrackButton;
})(typeof globalThis !== 'undefined' ? globalThis : this);
