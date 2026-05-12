(function (global) {
  'use strict';

  function setupChartModeControls(ctx) {
    document.querySelectorAll('[data-status-chart-mode]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.statusChartMode === ctx.getStatusChartMode());
      btn.addEventListener('click', () => {
        ctx.setStatusChartMode(btn.dataset.statusChartMode);
        document.querySelectorAll('[data-status-chart-mode]').forEach(b => {
          b.classList.toggle('active', b.dataset.statusChartMode === ctx.getStatusChartMode());
        });
        const all = Object.values(ctx.getWorks());
        renderStatusDonut(ctx, all, ctx.buildBuckets(all));
      });
    });
  }

  function renderCharts(ctx, all, byStatus) {
    renderStatusDonut(ctx, all, byStatus);
    renderMonthlyAdds(ctx, all);
    renderRankChart(ctx, 'fandomChart', ctx.topEntries(ctx.flattenCounts(all.flatMap(w => w.fandoms || [])), 5), 'topFandomCount', 'fandom', ctx.buildAo3TagUrl);
    renderRankChart(ctx, 'authorChart', ctx.topEntries(ctx.flattenCounts(all.filter(work => !ctx.isOrphanedWork(work)).map(w => w.author || 'Anonymous')), 5), 'topAuthorCount', 'author', ctx.buildAo3AuthorUrl);
    renderRankChart(ctx, 'pairingChart', ctx.relationshipFacetEntries(all).slice(0, 5), 'topPairingCount', 'pairing', ctx.buildAo3TagUrl);
    renderRatingChart(ctx, all);
  }

  function renderSnapshotCards(ctx, all, byStatus) {
    const grid = document.getElementById('dashboardSnapshotGrid');
    if (!grid) return;
    grid.innerHTML = ctx.QUICK_SNAPSHOT_ITEMS.map(item => {
      const attrs = item.tab
        ? `data-dashboard-tab="${ctx.escHtml(item.tab)}"`
        : `data-dashboard-filter="${ctx.escHtml(item.filter)}"`;
      const count = typeof item.count === 'function' ? item.count(all, byStatus) : 0;
      return `
        <button class="snapshot-card dashboard-snapshot-card" ${attrs} type="button">
          <span class="snapshot-label">${ctx.escHtml(item.label)}</span>
          <span class="snapshot-value">${ctx.formatNumber(count)}</span>
        </button>
      `;
    }).join('');
  }

  function renderStatusDonut(ctx, all, byStatus) {
    if (ctx.getStatusChartMode() === 'category') {
      renderCategoryDonut(ctx, all);
      return;
    }
    const svg = document.getElementById('statusDonut');
    if (!svg) return;
    const statuses = Object.keys(ctx.STATUS_LABELS);
    const total = statuses.reduce((sum, status) => sum + (byStatus[status]?.length || 0), 0);
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const activeStatuses = statuses.filter(s => (byStatus[s]?.length || 0) > 0);
    const gap = activeStatuses.length > 1 ? 2 : 0;
    let offset = 0;
    const segments = [`<circle class="dashboard-donut-bg" cx="60" cy="60" r="${radius}"></circle>`];
    statuses.forEach(status => {
      const value = byStatus[status]?.length || 0;
      if (!value || !total) return;
      const fullArc = (value / total) * circumference;
      const drawLen = Math.max(0, fullArc - gap);
      segments.push(`<circle class="dashboard-donut-segment" cx="60" cy="60" r="${radius}" stroke="${ctx.STATUS_COLORS[status]}" stroke-dasharray="${drawLen} ${circumference - drawLen}" stroke-dashoffset="${-offset}"></circle>`);
      offset += fullArc;
    });
    svg.innerHTML = segments.join('');
    const legend = document.getElementById('statusLegend');
    if (legend) {
      const items = statuses
        .filter(status => (byStatus[status]?.length || 0) > 0)
        .map(status => {
          const value = byStatus[status]?.length || 0;
          return `<div class="dashboard-legend-item"><span class="dashboard-swatch" style="background:${ctx.STATUS_COLORS[status]}"></span><span>${ctx.STATUS_LABELS[status]}</span><strong>${value}</strong></div>`;
        }).join('');
      renderCollapsibleLegend(legend, items);
    }
  }

  function renderCollapsibleLegend(container, itemsHtml) {
    container.innerHTML = `
      <button class="dashboard-legend-toggle" type="button" aria-expanded="false">
        <span>Legend</span><span class="dashboard-legend-chevron">▾</span>
      </button>
      <div class="dashboard-legend-body" hidden>${itemsHtml}</div>`;
    const toggleBtn = container.querySelector('.dashboard-legend-toggle');
    const body = container.querySelector('.dashboard-legend-body');
    const toggleLabel = toggleBtn?.querySelector('span');
    if (toggleLabel) toggleLabel.textContent = 'Key';
    toggleBtn?.addEventListener('click', () => {
      const expanded = toggleBtn.getAttribute('aria-expanded') === 'true';
      toggleBtn.setAttribute('aria-expanded', String(!expanded));
      toggleBtn.querySelector('.dashboard-legend-chevron').textContent = expanded ? '▾' : '▴';
      expanded ? body.setAttribute('hidden', '') : body.removeAttribute('hidden');
    });
  }

  function renderCategoryDonut(ctx, all) {
    const svg = document.getElementById('statusDonut');
    const legend = document.getElementById('statusLegend');
    if (!svg) return;
    const cats = Object.values(ctx.getCustomCats() || {});
    const catEntries = cats
      .map(cat => ({ name: cat.name, color: cat.color, count: all.filter(w => Array.isArray(w.customCats) && w.customCats.includes(cat.id)).length }))
      .filter(e => e.count > 0)
      .sort((a, b) => b.count - a.count);
    const uncategorizedWorks = all.filter(w => !Array.isArray(w.customCats) || !w.customCats.length);
    const statusEntries = Object.keys(ctx.STATUS_LABELS)
      .map(status => ({ name: ctx.STATUS_LABELS[status], color: ctx.STATUS_COLORS[status], count: uncategorizedWorks.filter(w => w.status === status).length }))
      .filter(e => e.count > 0);
    const entries = [...catEntries, ...statusEntries];
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const base = Math.max(all.length, entries.reduce((s, e) => s + e.count, 0));
    const gap = entries.length > 1 ? 2 : 0;
    let offset = 0;
    const svgSegments = [`<circle class="dashboard-donut-bg" cx="60" cy="60" r="${radius}"></circle>`];
    entries.forEach(({ color, count }) => {
      if (!count || !base) return;
      const fullArc = (count / base) * circumference;
      const drawLen = Math.max(0, fullArc - gap);
      svgSegments.push(`<circle class="dashboard-donut-segment" cx="60" cy="60" r="${radius}" stroke="${color}" stroke-dasharray="${drawLen} ${circumference - drawLen}" stroke-dashoffset="${-offset}"></circle>`);
      offset += fullArc;
    });
    svg.innerHTML = svgSegments.join('');
    if (legend) {
      const items = entries.map(({ name, color, count }) =>
        `<div class="dashboard-legend-item"><span class="dashboard-swatch" style="background:${ctx.escHtml(color)}"></span><span>${ctx.escHtml(name)}</span><strong>${count}</strong></div>`
      ).join('');
      renderCollapsibleLegend(legend, items);
    }
  }

  function renderMonthlyAdds(ctx, all) {
    const chart = document.getElementById('monthAddedChart');
    if (!chart) return;
    const months = Array.from({ length: 12 }, () => 0);
    all.forEach(work => {
      const ts = work.addedAt || work.movedAt;
      const d = ts ? new Date(ts) : null;
      if (!d || Number.isNaN(d.getTime())) return;
      months[d.getMonth()] += 1;
    });
    const max = Math.max(1, ...months);
    const total = months.reduce((sum, n) => sum + n, 0);
    ctx.setText('monthAddedTotal', `${ctx.formatNumber(total)} work${total !== 1 ? 's' : ''}`);
    chart.innerHTML = months.map((value, i) => {
      const height = Math.max(value ? 6 : 0, Math.round((value / max) * 100));
      const color = ctx.CHART_COLORS[i % ctx.CHART_COLORS.length];
      return `
        <div class="dashboard-month-bar" title="${ctx.monthName(i)}: ${ctx.formatNumber(value)} work${value !== 1 ? 's' : ''} added">
          <div class="dashboard-month-track">
            <div class="dashboard-month-fill" style="height:${height}%; --bar-color:${color}"></div>
          </div>
          <div class="dashboard-month-label">${ctx.MONTH_LABELS[i]}</div>
        </div>
      `;
    }).join('');
  }

  function renderRatingChart(ctx, all) {
    const chart = document.getElementById('ratingChart');
    if (!chart) return;
    const counts = [1, 2, 3, 4, 5].map(rating => ({
      rating,
      count: all.filter(work => Number(work.rating) === rating).length
    }));
    const total = counts.reduce((sum, row) => sum + row.count, 0);
    const max = Math.max(1, ...counts.map(row => row.count));
    ctx.setText('ratedWorksCount', `${total} rated`);
    chart.innerHTML = counts.reverse().map((row, i) => {
      const pct = Math.max(row.count ? 6 : 0, Math.round((row.count / max) * 100));
      const color = ctx.CHART_COLORS[(i + 1) % ctx.CHART_COLORS.length];
      return `
        <div class="dashboard-rating-row">
          <div class="dashboard-rating-label">${row.rating} star</div>
          <div class="dashboard-rating-track"><div class="dashboard-rating-fill" style="width:${pct}%; --bar-color:${color}"></div></div>
          <div class="dashboard-rating-value">${row.count}</div>
        </div>
      `;
    }).join('');
  }

  function renderRankChart(ctx, chartId, entries, countId, noun, linkBuilder) {
    const chart = document.getElementById(chartId);
    if (!chart) return;
    ctx.setText(countId, `${entries.length} ${noun}${entries.length !== 1 ? 's' : ''}`);
    if (!entries.length) {
      chart.innerHTML = `<div class="empty-state">No ${noun} data yet.</div>`;
      return;
    }
    const max = Math.max(1, ...entries.map(entry => entry.count));
    chart.innerHTML = entries.map((entry, i) => {
      const pct = Math.max(5, Math.round((entry.count / max) * 100));
      const color = ctx.CHART_COLORS[i % ctx.CHART_COLORS.length];
      const href = typeof linkBuilder === 'function' ? linkBuilder(entry.label) : '';
      const label = noun === 'author'
        ? `<button class="dashboard-rank-label dashboard-rank-link dashboard-rank-button" data-author-name="${ctx.escHtml(entry.label)}" type="button">${ctx.escHtml(entry.label)}</button>`
        : href
        ? `<a class="dashboard-rank-label dashboard-rank-link" href="${ctx.escHtml(href)}" target="_blank" rel="noopener noreferrer">${ctx.escHtml(entry.label)}</a>`
        : `<div class="dashboard-rank-label">${ctx.escHtml(entry.label)}</div>`;
      return `
        <div class="dashboard-rank-row" title="${ctx.escHtml(entry.label)}: ${entry.count}">
          ${label}
          <div class="dashboard-rank-track"><div class="dashboard-rank-fill" style="width:${pct}%; --bar-color:${color}"></div></div>
          <div class="dashboard-rank-value">${entry.count}</div>
        </div>
      `;
    }).join('');
    if (noun === 'author') {
      chart.querySelectorAll('[data-author-name]').forEach(button => {
        button.addEventListener('click', () => ctx.openAuthorDetail(button.dataset.authorName || '', ''));
      });
    }
  }

  const ChartsController = {
    setupChartModeControls,
    renderCharts,
    renderSnapshotCards
  };

  global.AO3TrackerDashboardChartsController = ChartsController;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChartsController;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
