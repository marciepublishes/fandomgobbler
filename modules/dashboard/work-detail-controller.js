(function (global) {
  'use strict';

  let _authorWorksCache = {};
  let _seriesWorksCache = {};

  function openWork(ctx, workId) {
    if (!ctx.getWork(workId)) return;
    ctx.setDetailScrollY(window.scrollY);
    ctx.setSelectedWorkId(workId);
    ctx.setDetailWorkId(workId);
    ctx.setDetailAuthor(null);
    ctx.renderAll();
    document.querySelector('.dashboard-library')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  function openAuthor(ctx, author, authorUrl) {
    const name = String(author || '').trim() || 'Anonymous';
    if (ctx.isOrphanAccountAuthor(name, authorUrl)) {
      ctx.showToast('Orphaned works are not grouped as one author.');
      return;
    }
    ctx.setDetailScrollY(window.scrollY);
    ctx.setDetailWorkId('');
    ctx.setDetailAuthor({ name, url: String(authorUrl || '').trim() });
    ctx.renderAll();
    document.querySelector('.dashboard-library')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  function close(ctx) {
    if (!ctx.getDetailWorkId() && !ctx.getDetailAuthor()) return;
    ctx.setDetailWorkId('');
    ctx.setDetailAuthor(null);
    ctx.renderAll();
    window.scrollTo({ top: ctx.getDetailScrollY(), behavior: 'instant' });
  }

  function renderLibraryMode(ctx) {
    const detailOpen = !!((ctx.getDetailWorkId() && ctx.getWork(ctx.getDetailWorkId())) || ctx.getDetailAuthor());
    [
      'dashboardFilterToggle',
      'dashboardSearch',
      'dashboardActiveFilters',
      'dashboardFilterPanel',
      'dashboardTabs',
      'dashboardPagination',
      'dashboardEmpty',
      'dashboardWorkList'
    ].forEach(id => document.getElementById(id)?.classList.toggle('dashboard-detail-hidden', detailOpen));
    document.querySelector('.dashboard-bulk-bar')?.classList.toggle('dashboard-detail-hidden', detailOpen);
    document.querySelector('.dashboard-search-row')?.classList.toggle('dashboard-detail-hidden', detailOpen);
    document.getElementById('librarySortWrap')?.classList.toggle('dashboard-detail-hidden', detailOpen);
    const meta = document.getElementById('libraryResultMeta');
    if (detailOpen && meta) meta.textContent = ctx.getDetailAuthor() ? 'Expanded author details.' : 'Expanded work details.';
  }

  function renderDetailMode(ctx) {
    const panel = document.getElementById('dashboardDetailPanel');
    if (!panel) return;
    const work = ctx.getDetailWorkId() ? ctx.getWork(ctx.getDetailWorkId()) : null;
    panel.classList.toggle('hidden', !work && !ctx.getDetailAuthor());
    if (work) renderWorkDetail(ctx, work);
    else if (ctx.getDetailAuthor()) renderAuthorDetail(ctx, ctx.getDetailAuthor());
  }

  function renderWorkDetail(ctx, work) {
    const root = document.getElementById('dashboardDetailContent');
    if (!root || !work) return;
    const savedScrolls = Array.from(root.querySelectorAll('.dashboard-more-list-scroll')).map(el => el.scrollTop);
    const progress = ctx.getReadingProgress(work, { completedAsFull: true });
    const author = work.author || 'Anonymous';
    const orphaned = ctx.isOrphanedWork(work);
    const cover = ctx.coverLetters(work.title || author);
    const updatedMeta = ctx.getDetailUpdatedMeta(work);
    const isFFNet = work.platform === 'ffnet';
    const stats = [
      ['Words', work.wordCount ? ctx.formatNumber(work.wordCount) : 'Unknown'],
      [isFFNet ? 'Reviews' : 'Kudos', work.kudosCount ? ctx.formatNumber(work.kudosCount) : 'Unknown'],
      [isFFNet ? 'Favorites' : 'Bookmarks', work.bookmarksCount ? ctx.formatNumber(work.bookmarksCount) : 'Unknown'],
      [isFFNet ? 'Follows' : 'Hits', work.hitsCount ? ctx.formatNumber(work.hitsCount) : 'Unknown'],
      ['Published', work.publishedAt ? ctx.formatDateShort(work.publishedAt) : 'Unknown'],
      [updatedMeta.label, updatedMeta.value],
      ['Progress', progress.label],
      ...(!isFFNet ? [['Subscribed', work.subscribedAtAo3 === true ? 'Yes' : work.subscribedAtAo3 === false ? 'No' : 'Unknown']] : [])
    ];
    root.innerHTML = `
      <section class="dashboard-detail-hero">
        <div class="dashboard-detail-cover" style="--cover-color:${ctx.escHtml(ctx.statusColor(work.status))}">${ctx.escHtml(cover)}</div>
        <div>
          <p class="dashboard-detail-kicker">Work</p>
          <h2 class="dashboard-detail-title ${ctx.detailTitleSizeClass(work.title)}" id="dashboardDetailTitle">${ctx.escHtml(work.title || 'Untitled')}</h2>
          <div class="dashboard-detail-byline">
            <span>by ${orphaned ? `<span class="dashboard-detail-author-static">${ctx.escHtml(author)} (orphaned work)</span>` : `<button class="dashboard-detail-author-link" data-author-name="${ctx.escHtml(author)}" data-author-url="${ctx.escHtml(work.authorUrl || '')}" type="button">${ctx.escHtml(author)}</button>`}</span>
            <span>${ctx.escHtml(work.wordCount ? `${ctx.formatNumber(work.wordCount)} words` : 'Word count unknown')}</span>
          </div>
        </div>
      </section>
      <section class="dashboard-detail-body">
        <div>
          <div class="dashboard-detail-actions">
            ${work.url ? `<a class="dashboard-detail-external" href="${ctx.escHtml(work.url)}" target="_blank" rel="noopener noreferrer" title="Open page" aria-label="Open page">${ctx.iconSvg('open')}</a>` : ''}
            ${(!orphaned && ctx.platformHas('authorWatch')) ? `<button class="dashboard-detail-primary" data-detail-action="watch-author" type="button">${ctx.iconSvg('watch')} ${ctx.isAuthorWatchedForWork(work) ? 'Watching Author' : 'Watch Author'}</button>` : ''}
            ${ctx.platformHas('subscriptions') ? `<button class="dashboard-detail-primary" data-detail-action="subscribe" type="button">${ctx.iconSvg('subscribe')} ${work.subscribedAtAo3 === true ? 'Manage Subscription' : 'Subscribe'}</button>` : ''}
          </div>
          <div class="dashboard-now-progress">
            <div class="dashboard-progress-track"><div class="dashboard-progress-fill" style="--progress:${progress.percent}%"></div></div>
            <div class="dashboard-progress-meta"><span>${ctx.escHtml(progress.label)}</span><span>${progress.known ? `${progress.percent}%` : 'Progress unknown'}</span></div>
          </div>
          <div class="dashboard-detail-section">
            <h3>Stats</h3>
            <div class="dashboard-detail-stat-grid">
              ${stats.map(([label, value]) => `<div class="dashboard-detail-stat"><span>${ctx.escHtml(label)}</span><strong>${ctx.escHtml(value)}</strong></div>`).join('')}
            </div>
          </div>
          <div class="dashboard-detail-section">
            <h3>Summary</h3>
            <p class="dashboard-detail-summary">${ctx.escHtml(work.summary || 'Summary not saved yet. Open or refresh this work page to capture it.')}</p>
          </div>
          ${renderSeriesDetail(ctx, work)}
          ${ctx.platformHas('authorWatch') ? renderMoreByAuthor(ctx, work) : ''}
        </div>
        <div class="dashboard-detail-side">
          ${renderAuthorPanel(ctx, work)}
          ${renderWorkDetailCategoriesHtml(ctx, work)}
        </div>
      </section>
    `;
    root.querySelectorAll('.dashboard-more-list-scroll').forEach((el, i) => {
      if (savedScrolls[i]) el.scrollTop = savedScrolls[i];
    });
    root.querySelectorAll('[data-detail-action="watch-author"]').forEach(button => {
      button.addEventListener('click', () => ctx.toggleAuthorWatchForWork(work));
    });
    root.querySelector('[data-detail-action="edit-note"]')?.addEventListener('click', () => {
      root.querySelector('.dashboard-detail-note-editor')?.classList.remove('hidden');
      root.querySelector('.dashboard-note-input')?.focus();
    });
    root.querySelector('[data-detail-action="cancel-note"]')?.addEventListener('click', () => {
      const editor = root.querySelector('.dashboard-detail-note-editor');
      const input = root.querySelector('.dashboard-note-input');
      if (input) input.value = work.notes || '';
      editor?.classList.add('hidden');
    });
    root.querySelector('[data-detail-action="save-note"]')?.addEventListener('click', () => {
      const input = root.querySelector('.dashboard-note-input');
      if (!input || !ctx.getWork(work.id)) return;
      const text = input.value.trim();
      if (text) ctx.patchWork(work.id, { notes: text });
      else ctx.removeWorkField(work.id, 'notes');
      ctx.saveWorks().then(() => renderWorkDetail(ctx, ctx.getWork(work.id)));
    });
    root.querySelector('[data-detail-action="subscribe"]')?.addEventListener('click', () => ctx.openWorkForSubscription(work));
    root.querySelector('[data-detail-action="load-author-works"]')?.addEventListener('click', () => loadAuthorWorksForDetail(ctx, work));
    root.querySelector('[data-detail-action="load-series-works"]')?.addEventListener('click', () => loadSeriesWorksForDetail(ctx, work));
    root.querySelectorAll('[data-detail-action="set-status"]').forEach(button => {
      button.addEventListener('click', () => {
        const nextStatus = button.dataset.status || '';
        const w = ctx.getWork(work.id);
        if (!w || w.status === nextStatus) return;
        const oldStatus = w.status;
        ctx.patchWork(work.id, { status: nextStatus, movedAt: Date.now() });
        const TrackedWorkCore = ctx.TrackedWorkCore;
        if (typeof TrackedWorkCore?.nextFinishedAt === 'function') {
          ctx.patchWork(work.id, { finishedAt: TrackedWorkCore.nextFinishedAt(oldStatus, nextStatus, w.finishedAt) });
        }
        ctx.saveWorks().then(() => {
          ctx.showToast(`Moved to ${ctx.labelFor(nextStatus)}.`);
          renderWorkDetail(ctx, ctx.getWork(w.id));
        });
      });
    });
    root.querySelectorAll('[data-detail-action="toggle-cat"]').forEach(button => {
      button.addEventListener('click', () => {
        const catId = button.dataset.catId || '';
        const w = ctx.getWork(work.id);
        if (!w || !catId) return;
        const cats = Array.isArray(w.customCats) ? [...w.customCats] : [];
        const idx = cats.indexOf(catId);
        const adding = idx < 0;
        if (adding) cats.push(catId); else cats.splice(idx, 1);
        ctx.patchWork(work.id, { customCats: cats });
        let pruned = false;
        const TrackedWorkCore = ctx.TrackedWorkCore;
        if (typeof TrackedWorkCore?.pruneTrackedWorkIfInvalid === 'function') {
          pruned = TrackedWorkCore.pruneTrackedWorkIfInvalid(ctx.getWorks(), w.id);
        }
        const catName = ctx.getCustomCats()[catId]?.name || 'Category';
        ctx.saveWorks().then(() => {
          if (pruned) {
            ctx.showToast('Work removed (no status or category).');
            close(ctx);
            ctx.renderAll();
          } else {
            ctx.showToast(adding ? `Added to ${catName}.` : `Removed from ${catName}.`);
            renderWorkDetail(ctx, ctx.getWork(w.id));
          }
        });
      });
    });
    root.querySelectorAll('[data-detail-work]').forEach(button => {
      button.addEventListener('click', () => openWork(ctx, button.dataset.detailWork || ''));
    });
    root.querySelectorAll('[data-author-name]').forEach(button => {
      button.addEventListener('click', () => openAuthor(ctx, button.dataset.authorName || author, button.dataset.authorUrl || work.authorUrl || ''));
    });
    ctx.fitDetailTitleToTwoLines(root);
  }

  function renderAuthorDetail(ctx, authorDetail) {
    const root = document.getElementById('dashboardDetailContent');
    if (!root || !authorDetail) return;
    const authorWorks = getAuthorDetailWorks(ctx, authorDetail);
    const authorName = authorDetail.name || authorWorks[0]?.author || 'Anonymous';
    const authorUrl = authorDetail.url || authorWorks.find(work => work.authorUrl)?.authorUrl || ctx.buildAo3AuthorUrl(authorName);
    const totalWords = authorWorks.reduce((sum, item) => sum + (Number(item.wordCount) || 0), 0);
    const totalKudos = authorWorks.reduce((sum, item) => sum + (Number(item.kudosCount) || 0), 0);
    const totalBookmarks = authorWorks.reduce((sum, item) => sum + (Number(item.bookmarksCount) || 0), 0);
    const fandomEntries = ctx.topEntries(ctx.flattenCounts(authorWorks.flatMap(item => item.fandoms || [])), 6);
    const relationshipEntries = ctx.topEntries(ctx.flattenCounts(authorWorks.map(item => ctx.relationshipDisplayName(item.relationship)).filter(Boolean)), 6);
    const statusEntries = Object.entries(ctx.STATUS_LABELS)
      .map(([status, label]) => ({ label, status, count: authorWorks.filter(item => item.status === status).length }))
      .filter(entry => entry.count);
    const latestUpdated = authorWorks
      .map(item => Number(item.updatedAt) || 0)
      .filter(Boolean)
      .sort((a, b) => b - a)[0];
    const authorIsFFNet = authorWorks.length > 0 && authorWorks[0].platform === 'ffnet';
    const stats = [
      ['Tracked Works', ctx.formatNumber(authorWorks.length)],
      ['Fandoms', ctx.formatNumber(new Set(authorWorks.flatMap(item => item.fandoms || [])).size)],
      ['Relationships', ctx.formatNumber(new Set(authorWorks.map(item => ctx.relationshipDisplayName(item.relationship)).filter(Boolean)).size)],
      ['Words', ctx.formatNumber(totalWords)],
      [authorIsFFNet ? 'Reviews' : 'Kudos', ctx.formatNumber(totalKudos)],
      [authorIsFFNet ? 'Favorites' : 'Bookmarks', ctx.formatNumber(totalBookmarks)],
      ['Latest Update', latestUpdated ? ctx.formatDateShort(latestUpdated) : 'Unknown'],
      ...(!authorIsFFNet ? [['Author Watches', ctx.formatNumber(authorWatchCountForAuthor(ctx, authorName, authorUrl))]] : [])
    ];
    const authorNoteKey = ctx.normalizeCompare(authorName);
    const authorNote = ctx.getAuthorNotes()[authorNoteKey] || '';
    root.innerHTML = `
      <section class="dashboard-detail-hero dashboard-author-detail-hero">
        <div class="dashboard-detail-cover dashboard-author-detail-cover">${ctx.escHtml(ctx.coverLetters(authorName))}</div>
        <div>
          <p class="dashboard-detail-kicker">Author</p>
          <h2 class="dashboard-detail-title ${ctx.detailTitleSizeClass(authorName)}" id="dashboardDetailTitle">${ctx.escHtml(authorName)}</h2>
          <div class="dashboard-detail-byline">
            <span>${ctx.formatNumber(authorWorks.length)} tracked work${authorWorks.length !== 1 ? 's' : ''}</span>
            <span>${ctx.formatNumber(new Set(authorWorks.flatMap(item => item.fandoms || [])).size)} fandom${new Set(authorWorks.flatMap(item => item.fandoms || [])).size !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </section>
      <section class="dashboard-detail-body dashboard-author-detail-body">
        <div>
          <div class="dashboard-detail-actions">
            ${authorUrl ? `<a class="dashboard-detail-external" href="${ctx.escHtml(authorUrl)}" target="_blank" rel="noopener noreferrer" title="Open author page" aria-label="Open author page">${ctx.iconSvg('open')}</a>` : ''}
          </div>
          <div class="dashboard-detail-section">
            <h3>Author Stats</h3>
            <div class="dashboard-detail-stat-grid">
              ${stats.map(([label, value]) => `<div class="dashboard-detail-stat"><span>${ctx.escHtml(label)}</span><strong>${ctx.escHtml(value)}</strong></div>`).join('')}
            </div>
          </div>
          <div class="dashboard-detail-section">
            <h3>Tracked Works</h3>
            ${renderAuthorTrackedWorks(ctx, authorWorks)}
          </div>
          ${renderOtherWorksForAuthorDetail(ctx, authorName, authorUrl)}
        </div>
        <aside class="dashboard-author-panel">
          <div class="dashboard-author-card-cover"></div>
          <h3>About ${ctx.escHtml(authorName)}</h3>
          <p class="dashboard-author-meta">This author view is built from works already saved in your tracker.</p>
          ${renderAuthorFacetList(ctx, 'Top Fandoms', fandomEntries, 'fandom')}
          ${renderAuthorFacetList(ctx, 'Top Relationships', relationshipEntries, 'relationship')}
          ${renderAuthorFacetList(ctx, 'Library Status', statusEntries, 'status')}
          <div class="dashboard-author-notes">
            <div class="dashboard-author-notes-head">
              <h3>Your notes about ${ctx.escHtml(authorName)}</h3>
              <button class="dashboard-note-btn${authorNote ? ' has-note' : ''}" data-detail-action="edit-author-note" type="button" title="${authorNote ? 'Edit note' : 'Add note'}" aria-label="${authorNote ? 'Edit note' : 'Add note'}">${ctx.iconSvg('note')}</button>
            </div>
            <p class="dashboard-author-note-copy">${ctx.escHtml(authorNote || 'No notes saved for this author yet.')}</p>
            <div class="dashboard-detail-note-editor hidden">
              <textarea class="dashboard-note-input" placeholder="Add a personal note...">${ctx.escHtml(authorNote)}</textarea>
              <div class="dashboard-note-actions">
                <button class="dashboard-note-cancel" data-detail-action="cancel-author-note" type="button">Cancel</button>
                <button class="dashboard-note-save" data-detail-action="save-author-note" type="button">Save</button>
              </div>
            </div>
          </div>
        </aside>
      </section>
    `;
    root.querySelectorAll('[data-detail-work]').forEach(button => {
      button.addEventListener('click', () => openWork(ctx, button.dataset.detailWork || ''));
    });
    root.querySelector('[data-detail-action="edit-author-note"]')?.addEventListener('click', () => {
      root.querySelector('.dashboard-detail-note-editor')?.classList.remove('hidden');
      root.querySelector('.dashboard-note-input')?.focus();
    });
    root.querySelector('[data-detail-action="cancel-author-note"]')?.addEventListener('click', () => {
      const editor = root.querySelector('.dashboard-detail-note-editor');
      const input = root.querySelector('.dashboard-note-input');
      if (input) input.value = ctx.getAuthorNotes()[authorNoteKey] || '';
      editor?.classList.add('hidden');
    });
    root.querySelector('[data-detail-action="save-author-note"]')?.addEventListener('click', () => {
      const input = root.querySelector('.dashboard-note-input');
      if (!input) return;
      const text = input.value.trim();
      const notes = Object.assign({}, ctx.getAuthorNotes());
      if (text) notes[authorNoteKey] = text;
      else delete notes[authorNoteKey];
      ctx.setAuthorNotes(notes);
      ctx.saveAuthorNotes().then(() => renderAuthorDetail(ctx, authorDetail));
    });
    root.querySelector('[data-detail-action="load-author-works"]')?.addEventListener('click', () => loadAuthorWorksForDetail(ctx, { author: authorName, authorUrl }));
    root.querySelectorAll('[data-author-filter]').forEach(button => {
      button.addEventListener('click', () => {
        const type = button.dataset.authorFilter || '';
        const value = button.dataset.authorValue || '';
        if (type === 'fandom') {
          ctx.setActiveDashboardFilter({ type: 'fandom', value });
        } else if (type === 'relationship') {
          ctx.setActiveDashboardFilter({ type: 'relationship', value });
        } else if (type === 'status') {
          ctx.setActiveTab(button.dataset.authorStatus || 'all');
          ctx.setActiveDashboardFilter(null);
        }
        ctx.setDetailAuthor(null);
        ctx.setDetailWorkId('');
        ctx.setCurrentPage(1);
        ctx.renderAll();
      });
    });
    ctx.fitDetailTitleToTwoLines(root);
  }

  function renderWorkDetailCategoriesHtml(ctx, work) {
    const statusList = (ctx.TrackedWorkCore?.BUILTIN_STATUSES || ['want', 'progress', 'completed', 'rereading', 'onhold', 'dnf', 'lost'])
      .filter(s => s !== 'lost');
    const currentStatus = work.status || '';
    const currentStatusHtml = currentStatus && ctx.STATUS_LABELS[currentStatus]
      ? `<span class="dashboard-detail-cat-pill dashboard-detail-cat-pill-current">${ctx.escHtml(ctx.STATUS_LABELS[currentStatus])}</span>`
      : '<span class="dashboard-detail-cat-empty-inline">None — this work is only in custom categories.</span>';
    const moveToHtml = statusList
      .filter(s => s !== currentStatus)
      .map(s => `<button type="button" class="dashboard-detail-cat-pill" data-detail-action="set-status" data-status="${ctx.escHtml(s)}">${ctx.escHtml(ctx.STATUS_LABELS[s])}</button>`)
      .join('');
    const allCats = Object.values(ctx.getCustomCats() || {});
    const currentCatIds = new Set(work.customCats || []);
    const currentCats = allCats.filter(c => currentCatIds.has(c.id));
    const availableCats = allCats.filter(c => !currentCatIds.has(c.id));
    const currentCustomHtml = currentCats.length
      ? currentCats.map(cat => `<button type="button" class="dashboard-detail-cat-pill dashboard-detail-cat-pill-current dashboard-detail-cat-pill-removable" data-detail-action="toggle-cat" data-cat-id="${ctx.escHtml(cat.id)}" aria-label="Remove from ${ctx.escHtml(cat.name)}" title="Remove from ${ctx.escHtml(cat.name)}"><span>${ctx.escHtml(cat.name)}</span><span class="dashboard-detail-cat-pill-x" aria-hidden="true"><svg viewBox="0 0 8 8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><line x1="2" y1="2" x2="6" y2="6"/><line x1="6" y1="2" x2="2" y2="6"/></svg></span></button>`).join('')
      : '<span class="dashboard-detail-cat-empty-inline">None</span>';
    let availableCustomHtml;
    if (!allCats.length) {
      availableCustomHtml = '<span class="dashboard-detail-cat-empty-inline">No custom categories yet. Create one in Custom Categories.</span>';
    } else if (!availableCats.length) {
      availableCustomHtml = '<span class="dashboard-detail-cat-empty-inline">All categories added.</span>';
    } else {
      availableCustomHtml = availableCats
        .map(cat => `<button type="button" class="dashboard-detail-cat-pill" data-detail-action="toggle-cat" data-cat-id="${ctx.escHtml(cat.id)}" aria-label="Add to ${ctx.escHtml(cat.name)}" title="Add to ${ctx.escHtml(cat.name)}">${ctx.escHtml(cat.name)}</button>`)
        .join('');
    }
    return `
      <aside class="dashboard-detail-side-card dashboard-detail-categories">
        <h3>Categories</h3>
        <div class="dashboard-detail-cat-block">
          <div class="dashboard-detail-cat-label">Default category</div>
          <div class="dashboard-detail-cat-row">
            <span class="dashboard-detail-cat-rowlabel">Currently in</span>
            <div class="dashboard-detail-cat-pills">${currentStatusHtml}</div>
          </div>
          <div class="dashboard-detail-cat-row">
            <span class="dashboard-detail-cat-rowlabel">Move to</span>
            <div class="dashboard-detail-cat-pills">${moveToHtml}</div>
          </div>
        </div>
        <div class="dashboard-detail-cat-block">
          <div class="dashboard-detail-cat-label">Custom categories</div>
          <div class="dashboard-detail-cat-row">
            <span class="dashboard-detail-cat-rowlabel">Currently in</span>
            <div class="dashboard-detail-cat-pills">${currentCustomHtml}</div>
          </div>
          <div class="dashboard-detail-cat-row">
            <span class="dashboard-detail-cat-rowlabel">Add to</span>
            <div class="dashboard-detail-cat-pills">${availableCustomHtml}</div>
          </div>
        </div>
      </aside>
    `;
  }

  function renderSeriesDetail(ctx, work) {
    if (!work.seriesTitle) return '';
    const trackedSeriesWorks = Object.values(ctx.getWorks())
      .filter(item => ctx.normalizeCompare(item.seriesTitle) === ctx.normalizeCompare(work.seriesTitle))
      .sort((a, b) => ctx.seriesPartNumber(a.seriesPosition) - ctx.seriesPartNumber(b.seriesPosition) || String(a.title || '').localeCompare(String(b.title || '')));
    const trackedIds = new Set(trackedSeriesWorks.map(item => String(item.id || '')));
    const state = getSeriesWorksState(ctx, work);
    const fetchedItems = state?.status === 'loaded'
      ? (state.items || []).filter(item => item.id && !trackedIds.has(String(item.id)))
      : [];
    const list = [...(trackedSeriesWorks.length ? trackedSeriesWorks : [work]), ...fetchedItems]
      .sort((a, b) => {
        const partA = ctx.seriesPartNumber(a.seriesPosition) || Number(a.seriesIndex) || 0;
        const partB = ctx.seriesPartNumber(b.seriesPosition) || Number(b.seriesIndex) || 0;
        return partA - partB || String(a.title || '').localeCompare(String(b.title || ''));
      });
    const canFetch = !!work.seriesUrl;
    const loading = state?.status === 'loading';
    const error = state?.error || '';
    const note = error || (!canFetch
      ? 'Open or refresh this work page to capture the AO3 series link.'
      : state?.status === 'loaded'
        ? ''
        : 'Fetch the AO3 series page to show untracked works from this series.');
    return `
      <div class="dashboard-detail-section">
        <div class="dashboard-author-works-head">
          <h3>Series</h3>
          <button class="dashboard-detail-primary" data-detail-action="load-series-works" type="button" ${(!canFetch || loading) ? 'disabled' : ''}>${loading ? 'Loading...' : state?.status === 'loaded' ? 'Refresh series' : 'Fetch series'}</button>
        </div>
        ${note ? `<p class="dashboard-author-works-note">${ctx.escHtml(note)}</p>` : ''}
        <div class="dashboard-series-list">
          ${list.map((item, index) => `
            ${trackedIds.has(String(item.id || '')) ? `<button class="dashboard-series-row" data-detail-work="${ctx.escHtml(item.id)}" type="button">` : `<a class="dashboard-series-row dashboard-series-row-untracked" href="${ctx.escHtml(item.url || '#')}" target="_blank" rel="noopener noreferrer">`}
              <span class="dashboard-series-part">Part ${ctx.seriesPartNumber(item.seriesPosition) || index + 1}</span>
              <span class="dashboard-series-title">${ctx.escHtml(item.title || work.seriesTitle)}</span>
              <span class="dashboard-more-year">${trackedIds.has(String(item.id || '')) ? ctx.escHtml(ctx.labelFor(item.status) || 'Tracked') : 'Untracked'}</span>
            ${trackedIds.has(String(item.id || '')) ? '</button>' : '</a>'}
          `).join('')}
        </div>
      </div>
    `;
  }

  async function loadSeriesWorksForDetail(ctx, work) {
    if (!work?.seriesUrl) {
      ctx.showToast('This work needs a series link first.');
      return;
    }
    const key = seriesWorksCacheKey(work);
    if (!key) return;
    _seriesWorksCache[key] = { status: 'loading', items: [], error: '' };
    ctx.renderAll();
    try {
      const items = await fetchSeriesWorks(ctx, work);
      _seriesWorksCache[key] = { status: 'loaded', items, error: '', fetchedAt: Date.now() };
      ctx.renderAll();
    } catch (error) {
      _seriesWorksCache[key] = { status: 'error', items: [], error: 'Could not load this series. Try again later.' };
      ctx.renderAll();
    }
  }

  async function fetchSeriesWorks(ctx, work) {
    const seen = new Set();
    const items = [];
    for (let page = 1; page <= 3; page += 1) {
      const url = buildSeriesWorksUrl(work.seriesUrl, page);
      if (!url) break;
      if (page > 1 && typeof ctx.waitMs === 'function') await ctx.waitMs(900);
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) break;
      const html = await response.text();
      if (globalThis.AO3TrackerAuthorWatchCore?.looksLikeAo3BotBlock?.(html)) throw new Error('AO3 throttled request');
      const doc = ctx.parseAo3Html(html);
      const pageItems = parseSeriesWorksDocument(ctx, doc)
        .filter(item => {
          if (!item.id || seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        });
      items.push(...pageItems);
      if (pageItems.length < 20) break;
    }
    return items;
  }

  function parseSeriesWorksDocument(ctx, doc) {
    return Array.from(doc.querySelectorAll('li.work.blurb.group'))
      .map((blurb, index) => {
        const link = blurb.querySelector('h4.heading a[href*="/works/"], h4 a[href*="/works/"]');
        const id = ctx.extractWorkIdFromUrl(link?.href || '');
        if (!id) return null;
        const parsed = typeof ctx.Ao3PageCore?.extractTrackedWorkFromBlurb === 'function'
          ? ctx.Ao3PageCore.extractTrackedWorkFromBlurb(blurb, id)
          : null;
        return {
          ...(parsed || {}),
          id,
          title: parsed?.title || String(link?.textContent || 'Untitled').trim(),
          url: parsed?.url || `https://archiveofourown.org/works/${id}`,
          seriesIndex: index + 1,
          status: ctx.getWork(id)?.status || ''
        };
      })
      .filter(Boolean);
  }

  function getSeriesWorksState(ctx, work) {
    const key = seriesWorksCacheKey(work);
    return key ? (_seriesWorksCache[key] || null) : null;
  }

  function seriesWorksCacheKey(work) {
    return String(work?.seriesUrl || work?.seriesTitle || '').trim().toLowerCase();
  }

  function buildSeriesWorksUrl(seriesUrl, page = 1) {
    if (!seriesUrl) return '';
    try {
      const url = new URL(seriesUrl, 'https://archiveofourown.org/');
      url.searchParams.set('page', String(Math.max(1, Number(page) || 1)));
      return url.href;
    } catch (error) {
      const joiner = String(seriesUrl || '').includes('?') ? '&' : '?';
      return `${String(seriesUrl || '').trim()}${joiner}page=${Math.max(1, Number(page) || 1)}`;
    }
  }

  function renderMoreByAuthor(ctx, work) {
    if (ctx.isOrphanedWork(work)) {
      return `
        <div class="dashboard-detail-section">
          <h3>Other Works from Author</h3>
          <p class="dashboard-author-works-note">AO3's orphan_account is a non-user account, not one creator. FandomGobbler keeps this work visible but does not group it with other orphaned works as a shared author.</p>
        </div>
      `;
    }
    const authorKey = ctx.normalizeCompare(work.author || '');
    if (!authorKey) return '';
    const state = getAuthorWorksState(work);
    if (!state || state.status !== 'loaded') {
      return renderAuthorWorksLoader(ctx, work, state);
    }
    const authorWorks = (state.items || [])
      .filter(item => item.id !== work.id && ctx.sharesAnyFandom(item, work))
      .sort((a, b) => recommendationScore(ctx, b, work) - recommendationScore(ctx, a, work) || recommendationDate(b) - recommendationDate(a));
    const closeMatches = authorWorks.filter(item => ctx.sameRelationship(item, work));
    const closeIds = new Set(closeMatches.map(item => item.id));
    const otherSuggestions = authorWorks.filter(item => !closeIds.has(item.id));
    return `
      <div class="dashboard-detail-section">
        <div class="dashboard-author-works-head">
          <h3>Other Works from Author</h3>
          <button class="dashboard-detail-primary" data-detail-action="load-author-works" type="button">Refresh sample</button>
        </div>
        <h3>Same author, fandom, and relationship</h3>
        ${closeMatches.length
          ? `<div class="dashboard-more-list dashboard-more-list-scroll">${renderSuggestionRows(ctx, closeMatches)}</div>`
          : '<p class="dashboard-author-works-note">No other works.</p>'}
        <h3>Same author and fandom, different relationship</h3>
        ${otherSuggestions.length
          ? `<div class="dashboard-more-list dashboard-more-list-scroll">${renderSuggestionRows(ctx, otherSuggestions, false, true)}</div>`
          : '<p class="dashboard-author-works-note">No other works.</p>'}
      </div>
    `;
  }

  function renderSuggestionRows(ctx, items, showFandom = false, showPairing = false) {
    const works = ctx.getWorks();
    return items.map(item => {
      const tracked = !!works[item.id];
      const right = tracked
        ? `<span class="dashboard-more-year">${ctx.escHtml(item.publishedAt ? new Date(item.publishedAt).getFullYear() : 'Tracked')}</span>`
        : `<a class="dashboard-work-open" href="${ctx.escHtml(item.url || '#')}" target="_blank" rel="noopener noreferrer" title="Open page" aria-label="Open page">${ctx.iconSvg('open')}</a>`;
      const tag = tracked ? 'button' : 'div';
      const attrs = tracked ? `data-detail-work="${ctx.escHtml(item.id)}" type="button"` : '';
      const STATUS_SUB_LABELS = { want: 'For Later', progress: 'Reading', completed: 'Completed', rereading: 'Re-reading', onhold: 'On Hold', dnf: 'DNF', lost: 'Deleted' };
      const statusSub = tracked && STATUS_SUB_LABELS[item.status] ? `<span class="dashboard-more-status">${STATUS_SUB_LABELS[item.status]}</span>` : '';
      const wordsMeta = item.wordCount ? `<span class="dashboard-more-words">${ctx.escHtml(ctx.formatNumber(item.wordCount))} words</span>` : '';
      const fandomText = showFandom ? (Array.isArray(item.fandoms) ? item.fandoms[0] : (item.fandom || '')) : '';
      const fandomMeta = fandomText ? `<span class="dashboard-more-fandom">${ctx.escHtml(fandomText)}</span>` : '';
      const pairingText = showPairing ? (item.relationship || '') : '';
      const pairingMeta = pairingText ? `<span class="dashboard-more-pairing">${ctx.escHtml(pairingText)}</span>` : '';
      const subLine = statusSub || fandomMeta || pairingMeta ? `<span class="dashboard-more-sub">${statusSub}${fandomMeta}${pairingMeta}</span>` : '';
      return `
      <${tag} class="dashboard-more-row${tracked ? '' : ' dashboard-more-row-static'}" ${attrs}>
        <span class="dashboard-more-cover" style="--cover-color:${ctx.escHtml(ctx.statusColor(item.status))}"></span>
        <span class="dashboard-more-title-wrap">
          <span class="dashboard-more-title-line">
            <span class="dashboard-more-title">${ctx.escHtml(item.title || 'Untitled')}</span>
            ${wordsMeta}
          </span>
          ${subLine}
        </span>
        ${right}
      </${tag}>
    `;
    }).join('');
  }

  function renderAuthorWorksLoader(ctx, work, state) {
    if (ctx.isOrphanedWork(work)) {
      return `
        <div class="dashboard-detail-section">
          <div class="dashboard-author-works-head">
            <h3>Other Works from Author</h3>
          </div>
          <p class="dashboard-author-works-note">AO3's orphan_account is a non-user account, not one creator. FandomGobbler keeps this work visible but does not group it with other orphaned works as a shared author.</p>
        </div>
      `;
    }
    const canFetch = !!ctx.normalizeAuthorWatchUrlForDashboard(work.authorUrl);
    const loading = state?.status === 'loading';
    const error = state?.error || '';
    return `
      <div class="dashboard-detail-section">
        <div class="dashboard-author-works-head">
          <h3>Other Works from Author</h3>
          <button class="dashboard-detail-primary" data-detail-action="load-author-works" type="button" ${(!canFetch || loading) ? 'disabled' : ''}>${loading ? 'Loading...' : 'Fetch Other Works'}</button>
        </div>
        <p class="dashboard-author-works-note">
          ${ctx.escHtml(error || (canFetch
            ? 'See what else this author has written that you may like.'
            : 'This author needs a profile URL before other works can be loaded.'))}
        </p>
      </div>
    `;
  }

  async function loadAuthorWorksForDetail(ctx, work) {
    if (ctx.isOrphanedWork(work)) {
      ctx.showToast('Orphaned works are not grouped as one author.');
      return;
    }
    const key = authorWorksCacheKey(ctx, work);
    if (!key) {
      ctx.showToast('This work needs an author profile URL first.');
      return;
    }
    _authorWorksCache[key] = { status: 'loading', items: [], error: '' };
    ctx.renderAll();
    try {
      const items = await fetchAuthorWorksSample(ctx, work);
      _authorWorksCache[key] = { status: 'loaded', items, error: '', fetchedAt: Date.now() };
      ctx.renderAll();
    } catch (error) {
      _authorWorksCache[key] = { status: 'error', items: [], error: 'Could not load author works. Try again later.' };
      ctx.renderAll();
    }
  }

  async function fetchAuthorWorksSample(ctx, work) {
    const url = buildAuthorWorksSampleUrl(ctx, work);
    if (!url) return [];
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) throw new Error('Author works fetch failed');
    const html = await response.text();
    const Ao3PageCore = ctx.Ao3PageCore;
    if (globalThis.AO3TrackerAuthorWatchCore?.looksLikeAo3BotBlock?.(html)) throw new Error('AO3 throttled request');
    const doc = ctx.parseAo3Html(html);
    return parseAuthorWorksDocument(ctx, doc);
  }

  function parseAuthorWorksDocument(ctx, doc) {
    const Ao3PageCore = ctx.Ao3PageCore;
    return Array.from(doc.querySelectorAll('li.work.blurb.group'))
      .map(blurb => {
        const link = blurb.querySelector('h4.heading a[href*="/works/"], h4 a[href*="/works/"]');
        const id = ctx.extractWorkIdFromUrl(link?.href || '');
        if (!id) return null;
        const parsed = typeof Ao3PageCore?.extractTrackedWorkFromBlurb === 'function'
          ? Ao3PageCore.extractTrackedWorkFromBlurb(blurb, id)
          : null;
        return {
          ...(parsed || {}),
          id,
          title: parsed?.title || String(link?.textContent || 'Untitled').trim(),
          url: parsed?.url || `https://archiveofourown.org/works/${id}`,
          status: ctx.getWork(id)?.status || '',
          rating: ctx.getWork(id)?.rating || null,
          publishedAt: parsed?.publishedAt || null,
          updatedAt: parsed?.updatedAt || null
        };
      })
      .filter(Boolean);
  }

  function getAuthorWorksState(work) {
    const key = authorWorksCacheKey(null, work);
    return _authorWorksCache[key] || null;
  }

  function authorWorksCacheKey(ctx, work) {
    const normalizeUrl = ctx
      ? ctx.normalizeAuthorWatchUrlForDashboard
      : (url => String(url || '').trim());
    return normalizeUrl(work?.authorUrl || '');
  }

  function buildAuthorWorksSampleUrl(ctx, work) {
    const authorUrl = ctx.normalizeAuthorWatchUrlForDashboard(work?.authorUrl || '');
    if (!authorUrl) return '';
    try {
      const url = new URL(authorUrl, 'https://archiveofourown.org/');
      url.pathname = url.pathname.replace(/\/+$/, '') + '/works';
      url.search = '';
      url.searchParams.set('page', '1');
      url.searchParams.set('sort_column', 'created_at');
      url.searchParams.set('sort_direction', 'desc');
      return url.href;
    } catch (error) {
      return `${authorUrl.replace(/\/+$/, '')}/works?page=1&sort_column=created_at&sort_direction=desc`;
    }
  }

  function recommendationScore(ctx, item, current) {
    let score = 0;
    if (ctx.sharesAnyFandom(item, current)) score += 4;
    if (ctx.sameRelationship(item, current)) score += 3;
    if (Number(item.rating) > 0) score += Number(item.rating) / 10;
    return score;
  }

  function recommendationDate(work) {
    return Number(work?.publishedAt) || Number(work?.updatedAt) || Number(work?.addedAt) || 0;
  }

  function getAuthorDetailWorks(ctx, authorDetail) {
    const nameKey = ctx.normalizeCompare(authorDetail?.name || '');
    const urlKey = ctx.normalizeAuthorWatchUrlForDashboard(authorDetail?.url || '');
    if (ctx.isOrphanAccountAuthor(nameKey, urlKey)) return [];
    return Object.values(ctx.getWorks())
      .filter(work => !ctx.isOrphanedWork(work))
      .filter(work => {
        const workUrl = ctx.normalizeAuthorWatchUrlForDashboard(work.authorUrl || '');
        if (urlKey && workUrl && workUrl === urlKey) return true;
        return !!nameKey && ctx.normalizeCompare(work.author || 'Anonymous') === nameKey;
      })
      .sort((a, b) => recommendationDate(b) - recommendationDate(a) || String(a.title || '').localeCompare(String(b.title || '')));
  }

  function authorWatchCountForAuthor(ctx, author, authorUrl) {
    const nameKey = ctx.normalizeCompare(author || '');
    const urlKey = ctx.normalizeAuthorWatchUrlForDashboard(authorUrl || '');
    if (ctx.isOrphanAccountAuthor(nameKey, urlKey)) return 0;
    return Object.values(ctx.getAuthorWatches() || {}).filter(watch => {
      const watchUrl = ctx.normalizeAuthorWatchUrlForDashboard(watch.authorUrl || '');
      if (urlKey && watchUrl && watchUrl === urlKey) return true;
      return !!nameKey && ctx.normalizeCompare(watch.author || '') === nameKey;
    }).length;
  }

  function renderAuthorTrackedWorks(ctx, authorWorks) {
    if (!authorWorks.length) return '<div class="empty-state">No tracked works for this author yet.</div>';
    return `
      <div class="dashboard-more-list dashboard-more-list-scroll">
        ${renderSuggestionRows(ctx, authorWorks)}
      </div>
    `;
  }

  function renderOtherWorksForAuthorDetail(ctx, authorName, authorUrl) {
    const source = { author: authorName, authorUrl };
    const state = getAuthorWorksState(source);
    if (!state || state.status !== 'loaded') {
      return renderAuthorWorksLoader(ctx, source, state);
    }
    const trackedIds = new Set(Object.keys(ctx.getWorks()));
    const items = (state.items || [])
      .filter(item => item.id && !trackedIds.has(item.id))
      .sort((a, b) => recommendationDate(b) - recommendationDate(a) || String(a.title || '').localeCompare(String(b.title || '')));
    return `
      <div class="dashboard-detail-section">
        <div class="dashboard-author-works-head">
          <h3>Other Works from Author</h3>
          <button class="dashboard-detail-primary" data-detail-action="load-author-works" type="button">Refresh sample</button>
        </div>
        ${items.length
          ? `<div class="dashboard-more-list dashboard-more-list-scroll">${renderSuggestionRows(ctx, items, true, true)}</div>`
          : '<p class="dashboard-author-works-note">No other works in the loaded AO3 sample.</p>'}
      </div>
    `;
  }

  function renderAuthorFacetList(ctx, title, entries, type) {
    if (!entries.length) return '';
    return `
      <div class="dashboard-author-facet">
        <h3>${ctx.escHtml(title)}</h3>
        <div class="dashboard-author-facet-list">
          ${entries.map(entry => {
            const label = entry.label || '';
            const attrs = type === 'status'
              ? `data-author-filter="status" data-author-status="${ctx.escHtml(entry.status || statusValueForLabel(ctx, label))}"`
              : `data-author-filter="${ctx.escHtml(type)}" data-author-value="${ctx.escHtml(label)}"`;
            return `
              <button class="dashboard-author-facet-row" ${attrs} type="button">
                <span>${ctx.escHtml(label)}</span>
                <strong>${ctx.formatNumber(entry.count)}</strong>
              </button>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  function statusValueForLabel(ctx, label) {
    const match = Object.entries(ctx.STATUS_LABELS).find(([, value]) => value === label);
    return match ? match[0] : 'all';
  }

  function renderAuthorPanel(ctx, work) {
    if (ctx.isOrphanedWork(work)) {
      return `
        <aside class="dashboard-author-panel">
          <div class="dashboard-author-card-cover"></div>
          <h3>Orphaned work</h3>
          <p class="dashboard-author-meta">AO3's orphan_account is a non-user account, not one creator. FandomGobbler keeps this work visible but does not group it with other orphaned works as a shared author.</p>
        </aside>
      `;
    }
    const authorWorks = Object.values(ctx.getWorks()).filter(item => ctx.normalizeCompare(item.author || '') === ctx.normalizeCompare(work.author || ''));
    const totalWords = authorWorks.reduce((sum, item) => sum + (Number(item.wordCount) || 0), 0);
    const totalKudos = authorWorks.reduce((sum, item) => sum + (Number(item.kudosCount) || 0), 0);
    const totalBookmarks = authorWorks.reduce((sum, item) => sum + (Number(item.bookmarksCount) || 0), 0);
    const rated = authorWorks.filter(item => Number(item.rating) > 0);
    const avgRating = rated.length ? (rated.reduce((sum, item) => sum + Number(item.rating), 0) / rated.length).toFixed(1) : 'None';
    const workIsFFNet = work.platform === 'ffnet';
    return `
      <aside class="dashboard-author-panel">
        <div class="dashboard-author-card-cover"></div>
        <h3>About <button class="dashboard-author-heading-link" data-author-name="${ctx.escHtml(work.author || 'Anonymous')}" data-author-url="${ctx.escHtml(work.authorUrl || '')}" type="button">${ctx.escHtml(work.author || 'this author')}</button></h3>
        <p class="dashboard-author-meta">This author view is built from works already saved in your tracker.</p>
        <div class="dashboard-author-stat-list">
          <div class="dashboard-author-stat"><span>Tracked</span><strong>${ctx.formatNumber(authorWorks.length)}</strong></div>
          <div class="dashboard-author-stat"><span>Words</span><strong>${ctx.formatNumber(totalWords)}</strong></div>
          <div class="dashboard-author-stat"><span>${workIsFFNet ? 'Reviews' : 'Kudos'}</span><strong>${ctx.formatNumber(totalKudos)}</strong></div>
          <div class="dashboard-author-stat"><span>${workIsFFNet ? 'Favorites' : 'Bookmarks'}</span><strong>${ctx.formatNumber(totalBookmarks)}</strong></div>
          <div class="dashboard-author-stat"><span>Avg Rating</span><strong>${ctx.escHtml(avgRating)}</strong></div>
          <div class="dashboard-author-stat"><span>Fandoms</span><strong>${ctx.formatNumber(new Set(authorWorks.flatMap(item => item.fandoms || [])).size)}</strong></div>
        </div>
        <button class="dashboard-watch-pill${ctx.isAuthorWatchedForWork(work) ? ' active' : ''}" data-detail-action="watch-author" type="button">${ctx.isAuthorWatchedForWork(work) ? 'Author Watch Active' : 'Add Author Watch'}</button>
        <div class="dashboard-author-notes">
          <div class="dashboard-author-notes-head">
            <h3>Your notes about ${ctx.escHtml(work.title || 'this work')}</h3>
            <button class="dashboard-note-btn${work.notes ? ' has-note' : ''}" data-detail-action="edit-note" type="button" title="${work.notes ? 'Edit note' : 'Add note'}" aria-label="${work.notes ? 'Edit note' : 'Add note'}">${ctx.iconSvg('note')}</button>
          </div>
          <p class="dashboard-author-note-copy">${ctx.escHtml(work.notes || 'No notes saved for this work yet.')}</p>
          <div class="dashboard-detail-note-editor hidden">
            <textarea class="dashboard-note-input" placeholder="Add a personal note...">${ctx.escHtml(work.notes || '')}</textarea>
            <div class="dashboard-note-actions">
              <button class="dashboard-note-cancel" data-detail-action="cancel-note" type="button">Cancel</button>
              <button class="dashboard-note-save" data-detail-action="save-note" type="button">Save</button>
            </div>
          </div>
        </div>
      </aside>
    `;
  }

  const WorkDetailController = {
    openWork,
    openAuthor,
    close,
    renderLibraryMode,
    renderDetailMode
  };

  global.AO3TrackerDashboardWorkDetailController = WorkDetailController;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = WorkDetailController;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
