(function (global) {
  'use strict';

  let _deps = null;
  function init(deps) {
    _deps = deps;
  }

  function syncFrontCardDateWrapState(card) {
    const { window } = _deps;
    const front = card?.querySelector('.aot-card-front');
    const dateEl = front?.querySelector('.aot-card-date');
    if (!front || !dateEl) return;
    const lineHeight = parseFloat(window.getComputedStyle(dateEl).lineHeight) || 0;
    const wrapped = lineHeight > 0 && dateEl.getBoundingClientRect().height > (lineHeight * 1.5);
    front.classList.toggle('aot-card-front-has-wrapped-date', wrapped);
  }

  function buildCard(work, showStatus, cats) {
    cats = cats || {};
    const {
      document, window,
      getWorks, setWorks,
      normalizeStatusValue, nextFinishedAt, hasCustomCategories, pruneTrackedWorkIfInvalid, getRestoreStatus,
      esc, trunc, formatWorkWordCountDisplay, labelFor,
      showMiniToast, showMiniUndoToast, confirmRemoveFromTracker, applyRereadingChapterResetIfNeeded,
      openNotesModal, openCatModal, setCatModalSourceWorkId,
      flippedSidebarCards, expandedSummaryCards,
      getActiveTab,
      renderSidebar
    } = _deps;

    const li = document.createElement('li');
    li.className = 'aot-card';
    const normalizedStatus = normalizeStatusValue(work.status);
    li.dataset.status = normalizedStatus;
    const date = new Date(work.addedAt || Date.now()).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
    const completedDateReal = work.completedAt ? new Date(work.completedAt).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : null;
    const completedDateInferred = !work.completedAt && work.inferredCompletedAt
      ? new Date(work.inferredCompletedAt).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })
      : null;
    const starF = '<svg class="ico ico-star-filled" viewBox="0 0 16 16" fill="currentColor"><polygon points="8,1.5 10,6 15,6.5 11.5,10 12.5,15 8,12.5 3.5,15 4.5,10 1,6.5 6,6"/></svg>';
    const starE = '<svg class="ico ico-star-empty" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><polygon points="8,1.5 10,6 15,6.5 11.5,10 12.5,15 8,12.5 3.5,15 4.5,10 1,6.5 6,6"/></svg>';
    const stars = work.rating ? starF.repeat(work.rating) + starE.repeat(5 - work.rating) : '';
    const fandomTags = (work.fandoms || []).slice(0, 2).map(f => `<span class="aot-tag">${esc(f)}</span>`).join('');
    const relationshipTag = work.relationship ? `<span class="aot-tag aot-tag-relationship">${esc(trunc(work.relationship, 34))}</span>` : '';
    const tagRowHtml = (fandomTags || relationshipTag)
      ? `<div class="aot-card-tags">${fandomTags}${relationshipTag}</div>`
      : '';
    const notesExpanded = expandedSummaryCards.has(`${work.id}__notes`);
    const notesNeedsToggle = !!work.notes && work.notes.length > 160;
    const notesBodyText = work.notes ? (notesExpanded ? work.notes : trunc(work.notes, 160)) : null;
    const notesToggle = notesNeedsToggle
      ? `<button type="button" class="aot-card-summary-toggle" data-notes-toggle="${esc(work.id)}">${notesExpanded ? 'Show less' : 'Read more'}</button>`
      : '';
    const noteSnippet = notesBodyText !== null
      ? `<div class="aot-note-preview">${esc(notesBodyText)}${notesToggle}</div>`
      : `<div class="aot-note-preview aot-note-preview-empty">No notes yet.</div>`;
    const lostFrom = work.lostFrom ? labelFor(work.lostFrom) : null;
    const moveButtons = {
      want: `<button class="aot-btn aot-btn-progress" data-action="progress" data-id="${work.id}">Reading →</button>`,
      progress: `<button class="aot-btn aot-btn-completed" data-action="completed" data-id="${work.id}">Completed</button>
                 <button class="aot-btn" data-action="want" data-id="${work.id}">← Unread</button>
                 <button class="aot-btn aot-btn-dnf" data-action="dnf" data-id="${work.id}">DNF</button>`,
      completed: `<button class="aot-btn aot-btn-rereading" data-action="rereading" data-id="${work.id}">Re-read</button>
                  <button class="aot-btn aot-btn-onhold" data-action="onhold" data-id="${work.id}">On Hold</button>
                  <button class="aot-btn aot-btn-dnf" data-action="dnf" data-id="${work.id}">DNF</button>`,
      rereading: `<button class="aot-btn aot-btn-completed" data-action="completed" data-id="${work.id}">Complete again</button>
                  <button class="aot-btn" data-action="progress" data-id="${work.id}">← Reading</button>`,
      onhold: `<button class="aot-btn aot-btn-completed" data-action="completed" data-id="${work.id}">Completed</button>
               <button class="aot-btn aot-btn-progress" data-action="progress" data-id="${work.id}">Reading →</button>`,
      dnf: `<button class="aot-btn" data-action="want" data-id="${work.id}">← Try again</button>`,
      lost: `<button class="aot-btn aot-btn-restore" data-action="restore" data-id="${work.id}">↩ Restore${lostFrom ? ' to ' + lostFrom : ''}</button>`
    }[normalizedStatus] || '';
    const statusLabels = { want: 'For Later', progress: 'Reading', completed: 'Completed', rereading: 'Re-reading', onhold: 'On Hold', dnf: 'Did Not Finish', lost: 'Deleted' };
    const statusBadge = statusLabels[normalizedStatus]
      ? `<span class="aot-status-badge aot-status-${normalizedStatus}">${statusLabels[normalizedStatus]}</span>`
      : '';
    const lostDate = work.lostAt ? new Date(work.lostAt).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : null;
    const isOrphaned = work.isOrphaned === true || String(work.author || '').trim().toLowerCase() === 'orphan_account' || /\/users\/orphan_account(?:[/?#]|$)/.test(String(work.authorUrl || '').toLowerCase());
    const authorHtml = work.authorUrl && !isOrphaned
      ? `<a class="aot-author-link" href="${esc(work.authorUrl)}" target="_blank" rel="noopener noreferrer">${esc(work.author)}</a>`
      : `<span class="aot-author-link">${esc(isOrphaned ? 'orphan_account (orphaned work)' : work.author)}</span>`;
    const authorMetaHtml = `by ${authorHtml} &middot; <span class="aot-wordcount" title="Word count">${esc(formatWorkWordCountDisplay(work.wordCount))}</span>`;
    const hasSummary = !!work.summary;
    const summaryExpanded = expandedSummaryCards.has(work.id);
    const summaryNeedsToggle = hasSummary && work.summary.length > 360;
    const summaryBodyText = hasSummary
      ? (summaryExpanded ? work.summary : trunc(work.summary, 360))
      : 'Summary not saved yet. Open this work page again to capture it here.';
    const summaryText = esc(summaryBodyText);
    const summaryToggle = summaryNeedsToggle
      ? `<button type="button" class="aot-card-summary-toggle" data-summary-toggle="${esc(work.id)}">${summaryExpanded ? 'Show less' : 'Read more'}</button>`
      : '';
    const updatedMeta = work.updatedAt
      ? `Updated ${new Date(work.updatedAt).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}`
      : '';
    const completedMeta = completedDateReal
      ? `Completed ${completedDateReal}`
      : (completedDateInferred ? `Completed ${completedDateInferred}` : '');
    const trailingMetaBits = [];
    if (updatedMeta && !completedDateReal && !completedDateInferred) trailingMetaBits.push(updatedMeta);
    if (completedMeta) trailingMetaBits.push(completedMeta);
    if (work.subscribedAtAo3 === true) trailingMetaBits.push('Subscribed');
    const addedMeta = `Added ${date}`;
    const trailingMetaHtml = trailingMetaBits.length
      ? `<span class="aot-card-date-tail"><span class="aot-card-date-trailing">${trailingMetaBits.map(esc).join(' &middot; ')}</span></span>`
      : '';
    const seriesTitleHtml = work.seriesTitle
      ? (work.seriesUrl
          ? `<a class="aot-card-series-link" href="${esc(work.seriesUrl)}" target="_blank" rel="noopener noreferrer">${esc(trunc(work.seriesTitle, 52))}</a>`
          : `<span class="aot-card-series-link">${esc(trunc(work.seriesTitle, 52))}</span>`)
      : '';
    const seriesSection = work.seriesTitle
      ? `<div class="aot-card-section-head">
          <div class="aot-card-back-title">Series</div>
        </div>
        <div class="aot-card-series">
          <div class="aot-card-series-title">${seriesTitleHtml}</div>
          ${work.seriesPosition ? `<div class="aot-card-series-position">${esc(work.seriesPosition)}</div>` : ''}
        </div>`
      : '';
    const activeTab = typeof getActiveTab === 'function' ? getActiveTab() : 'all';
    const customChipsHtml = visibleCustomCatsForSidebarCard(work, cats, activeTab)
      .map(cat => `<span class="aot-custom-chip" style="--chip-color:${esc(cat.color)}">${esc(cat.name)}</span>`)
      .join('');
    const chapterPillHtml = (normalizedStatus === 'progress' || normalizedStatus === 'rereading')
      ? (work.furthestChapter
          ? `<a class="aot-card-chapter-pill" href="${esc(work.furthestChapter.id ? `https://archiveofourown.org/works/${work.id}/chapters/${work.furthestChapter.id}` : work.url)}" target="_blank" rel="noopener noreferrer" title="Continue from saved chapter progress">Ch. ${esc(String(work.furthestChapter.num))}${work.furthestChapter.total ? `/${esc(String(work.furthestChapter.total))}` : ''}</a>`
          : `<span class="aot-card-chapter-pill aot-card-chapter-pill-missing" title="Visit this work page to capture chapter progress.">Ch. -/-</span>`)
      : '';

    li.innerHTML = `
      <div class="aot-card-face aot-card-front">
        <div class="aot-card-meta">
          <div class="aot-card-title-row">
            <div class="aot-card-title"><a href="${esc(work.url)}" target="_blank">${esc(trunc(work.title, 58))}</a></div>
            ${stars ? `<div class="aot-card-stars aot-card-stars-front">${stars}</div>` : ''}
          </div>
          <div class="aot-card-author">${authorMetaHtml}</div>
          ${tagRowHtml}
          <div class="aot-card-pill-row">
            ${statusBadge}
            <div class="aot-custom-chips" data-work-id="${esc(work.id)}">${customChipsHtml}</div>
            ${chapterPillHtml}
          </div>
          <div class="aot-card-date"><span class="aot-card-date-added">${esc(addedMeta)}${trailingMetaBits.length ? ' &middot;&nbsp;' : ''}</span>${trailingMetaHtml}</div>
        </div>
        <button type="button" class="aot-card-flip aot-card-flip-front" data-flip="back" aria-label="Flip card for more" title="Flip card for more">
          <span class="aot-card-flip-label">Flip Card for More</span>
          <span class="aot-card-flip-icon" aria-hidden="true">↺</span>
        </button>
      </div>
      <div class="aot-card-face aot-card-back">
        <div class="aot-card-back-header">
          <div class="aot-card-back-title">Summary</div>
          <div class="aot-card-back-meta">
            <div class="aot-card-back-subtitle">${esc(trunc(work.title, 42))}</div>
            ${stars ? `<div class="aot-card-stars aot-card-stars-back">${stars}</div>` : ''}
          </div>
        </div>
        <div class="aot-card-summary${hasSummary ? '' : ' aot-card-summary-empty'}">${summaryText}${summaryToggle}</div>
        ${seriesSection}
        <div class="aot-card-section-head aot-card-notes-head">
          <div class="aot-card-back-title aot-card-notes-title">Notes & Ratings</div>
          <button type="button" class="aot-card-edit-notes" data-notes-id="${work.id}" aria-label="Edit notes and rating" title="Edit notes and rating">✎</button>
        </div>
        ${noteSnippet}
        ${normalizedStatus === 'lost' ? `<div class="aot-lost-notice">⚠ Detected unavailable${lostDate ? ' on ' + lostDate : ''}${lostFrom ? ' · was in ' + lostFrom : ''}</div>` : ''}
        <div class="aot-card-section-head">
          <div class="aot-card-back-title">Move Work To</div>
        </div>
        <div class="aot-card-actions aot-card-back-actions">
          ${moveButtons}
        </div>
        <div class="aot-card-section-head">
          <div class="aot-card-back-title">Add Work To</div>
        </div>
        <div class="aot-card-actions aot-card-back-actions aot-card-back-cats" data-back-cats-add="${esc(work.id)}"></div>
        <div class="aot-card-section-head">
          <div class="aot-card-back-title">Remove Work From</div>
        </div>
        <div class="aot-card-actions aot-card-back-actions aot-card-back-cats" data-back-cats-remove="${esc(work.id)}"></div>
        <div class="aot-card-back-footer">
          <div class="aot-card-remove-row">
          <button class="aot-btn aot-btn-remove" data-action="remove" data-id="${work.id}">Remove Work</button>
          </div>
          <button type="button" class="aot-card-flip aot-card-flip-back" data-flip="front" aria-label="Flip back to overview" title="Flip back to overview">
            <span class="aot-card-flip-label">Flip Back to Overview</span>
            <span class="aot-card-flip-icon" aria-hidden="true">↻</span>
          </button>
        </div>
      </div>`;

    li.querySelector('[data-notes-id]').addEventListener('click', () => openNotesModal(work.id));
    li.querySelectorAll('[data-summary-toggle]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        if (expandedSummaryCards.has(work.id)) expandedSummaryCards.delete(work.id);
        else expandedSummaryCards.add(work.id);
        flippedSidebarCards.add(work.id);
        renderSidebar();
      });
    });
    li.querySelectorAll('[data-notes-toggle]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const key = `${work.id}__notes`;
        if (expandedSummaryCards.has(key)) expandedSummaryCards.delete(key);
        else expandedSummaryCards.add(key);
        flippedSidebarCards.add(work.id);
        renderSidebar();
      });
    });
    li.querySelectorAll('[data-flip]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const showBack = btn.dataset.flip === 'back';
        li.classList.toggle('aot-card-flipped', showBack);
        if (showBack) flippedSidebarCards.add(work.id);
        else flippedSidebarCards.delete(work.id);
      });
    });

    const backCatsAddEl = li.querySelector('[data-back-cats-add]');
    const backCatsRemoveEl = li.querySelector('[data-back-cats-remove]');
    if (backCatsAddEl || backCatsRemoveEl) {
      if (backCatsAddEl) backCatsAddEl.innerHTML = '';
      if (backCatsRemoveEl) backCatsRemoveEl.innerHTML = '';
      const catList = Object.values(cats);
      const currentCatIds = work.customCats || [];
      const addableCats = catList.filter(cat => !currentCatIds.includes(cat.id));
      const removableCats = catList.filter(cat => currentCatIds.includes(cat.id));

      if (backCatsAddEl) {
        if (!catList.length) {
          backCatsAddEl.innerHTML = `
            <div class="aot-card-empty-actions">No custom categories yet.</div>
            <button type="button" class="aot-btn aot-btn-add-cat" data-add-category="${esc(work.id)}">Add Category</button>`;
        } else if (!addableCats.length) {
          backCatsAddEl.innerHTML = `<div class="aot-card-empty-actions">Already in every custom category.</div>`;
        } else {
          addableCats.forEach(cat => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'aot-btn aot-btn-back-cat';
            btn.dataset.customCatAdd = cat.id;
            btn.dataset.id = work.id;
            btn.style.setProperty('--aot-back-cat', cat.color);
            btn.textContent = cat.name;
            backCatsAddEl.appendChild(btn);
          });
        }
      }

      if (backCatsRemoveEl) {
        if (!catList.length) {
          backCatsRemoveEl.innerHTML = `<div class="aot-card-empty-actions">No custom categories to remove.</div>`;
        } else if (!removableCats.length && !normalizedStatus) {
          backCatsRemoveEl.innerHTML = `<div class="aot-card-empty-actions">Not in any custom category.</div>`;
        } else {
          if (normalizedStatus) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'aot-btn aot-btn-back-cat is-selected';
            btn.dataset.removeStatus = normalizedStatus;
            btn.dataset.id = work.id;
            btn.textContent = statusLabels[normalizedStatus];
            backCatsRemoveEl.appendChild(btn);
          }
          removableCats.forEach(cat => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'aot-btn aot-btn-back-cat is-selected';
            btn.dataset.customCatRemove = cat.id;
            btn.dataset.id = work.id;
            btn.style.setProperty('--aot-back-cat', cat.color);
            btn.textContent = cat.name;
            backCatsRemoveEl.appendChild(btn);
          });
        }
      }
    }

    li.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        const id = btn.dataset.id;
        getWorks(works => {
          if (action === 'remove') {
            if (!confirmRemoveFromTracker()) return;
            delete works[id];
            flippedSidebarCards.delete(id);
            expandedSummaryCards.delete(id);
            expandedSummaryCards.delete(`${id}__notes`);
            showMiniToast('Work removed.');
          } else if (action === 'restore') {
            if (works[id]) {
              const restoreTo = getRestoreStatus(works[id]);
              works[id].status = restoreTo;
              works[id].movedAt = Date.now();
              delete works[id].lostFrom;
              delete works[id].lostAt;
              showMiniToast(restoreTo ? `Restored to ${labelFor(restoreTo)}!` : 'Restored to tracked categories!');
            }
          } else if (works[id]) {
            const oldStatus = works[id].status;
            const oldFinishedAt = works[id].finishedAt;
            const oldMovedAt = works[id].movedAt || null;
            works[id].status = normalizeStatusValue(action);
            works[id].finishedAt = nextFinishedAt(oldStatus, works[id].status, works[id].finishedAt);
            works[id].movedAt = Date.now();
            showMiniUndoToast(`Moved to ${labelFor(action)}.`, () => {
              getWorks(ws => {
                if (!ws[id]) return;
                ws[id].status = oldStatus;
                ws[id].finishedAt = oldFinishedAt;
                ws[id].movedAt = oldMovedAt;
                setWorks(ws);
                renderSidebar();
              });
            });
            if (action === 'rereading' && oldStatus !== 'rereading' && works[id].furthestChapter) {
              applyRereadingChapterResetIfNeeded(oldStatus, action, works[id], () => setWorks(works));
              renderSidebar();
              return;
            }
          }
          setWorks(works);
          renderSidebar();
        });
      });
    });
    li.querySelectorAll('[data-custom-cat-add]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const catId = btn.dataset.customCatAdd;
        if (!id || !catId) return;
        getWorks(works => {
          if (!works[id]) return;
          const current = works[id].customCats || [];
          if (current.includes(catId)) return;
          works[id].customCats = [...current, catId];
          setWorks(works);
          renderSidebar();
        });
      });
    });
    li.querySelectorAll('[data-custom-cat-remove]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const catId = btn.dataset.customCatRemove;
        if (!id || !catId) return;
        getWorks(works => {
          if (!works[id]) return;
          const current = works[id].customCats || [];
          if (!current.includes(catId)) return;
          works[id].customCats = current.filter(c => c !== catId);
          const removedWork = pruneTrackedWorkIfInvalid(works, id);
          setWorks(works);
          if (removedWork) {
            flippedSidebarCards.delete(id);
            expandedSummaryCards.delete(id);
            expandedSummaryCards.delete(`${id}__notes`);
          }
          showMiniToast(removedWork ? 'Removed from tracker' : 'Removed from category');
          renderSidebar();
        });
      });
    });
    li.querySelectorAll('[data-remove-status]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const statusToRemove = normalizeStatusValue(btn.dataset.removeStatus);
        if (!id || !statusToRemove) return;
        getWorks(works => {
          const target = works[id];
          if (!target || normalizeStatusValue(target.status) !== statusToRemove) return;
          const wouldBeUntracked = !hasCustomCategories(target);
          if (wouldBeUntracked && !window.confirm('Removing this status will remove the work from tracking entirely. Continue?')) {
            return;
          }
          target.status = '';
          target.movedAt = Date.now();
          delete target.lostFrom;
          if (statusToRemove === 'lost') delete target.lostAt;
          const removedWork = pruneTrackedWorkIfInvalid(works, id);
          setWorks(works);
          if (removedWork) {
            flippedSidebarCards.delete(id);
            expandedSummaryCards.delete(id);
            expandedSummaryCards.delete(`${id}__notes`);
            showMiniToast('Removed from tracker');
          } else {
            showMiniToast(`Removed from ${labelFor(statusToRemove)}`);
          }
          renderSidebar();
        });
      });
    });
    li.querySelectorAll('[data-add-category]').forEach(btn => {
      btn.addEventListener('click', () => {
        setCatModalSourceWorkId(work.id);
        flippedSidebarCards.add(work.id);
        openCatModal(null);
      });
    });

    return li;
  }

  function visibleCustomCatsForSidebarCard(work, cats, activeTab) {
    const allCats = cats || {};
    const currentTab = String(activeTab || 'all');
    return (work && Array.isArray(work.customCats) ? work.customCats : [])
      .map(catId => allCats[catId])
      .filter(cat => cat && (!cat.hideOnListings || cat.id === currentTab));
  }

  const AO3TrackerSidebarCard = { init, buildCard, syncFrontCardDateWrapState, visibleCustomCatsForSidebarCard };

  global.AO3TrackerSidebarCard = AO3TrackerSidebarCard;
  if (typeof module !== 'undefined' && module.exports) module.exports = AO3TrackerSidebarCard;
})(typeof globalThis !== 'undefined' ? globalThis : this);
