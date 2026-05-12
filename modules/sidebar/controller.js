(function (global) {
  'use strict';

  const SidebarCore = global.AO3TrackerSidebarCore || {};

  // Stored after init() — all three public methods use this instead of per-call context args.
  let _deps = null;
  let _pendingJumpWorkId = null;

  // ── Internal implementations (take deps explicitly so they're easily testable) ──

  function _renderImpl(deps) {
    const {
      document,
      getWorks,
      getLibrarySortSetting,
      getCustomCats,
      normalizeStatusValue,
      buildCard,
      flippedSidebarCards,
      syncFrontCardDateWrapState,
      updateSidebarSortIndicator,
      emptyMsg,
      state
    } = deps;

    if (!document || !document.getElementById('aot-list')) return;

    getWorks(works => {
      getLibrarySortSetting(sortKey => {
        getCustomCats(cats => {
          const all = Object.values(works);
          const viewModel = typeof SidebarCore.computeSidebarViewModel === 'function'
            ? SidebarCore.computeSidebarViewModel({
              works: all,
              activeTab: state.getActiveTab(),
              searchQuery: state.getSearchQuery(),
              sortKey,
              randomOrder: state.getSidebarRandomOrder()
            })
            : null;
          const byStatus = viewModel?.byStatus || { want: [], progress: [], completed: [], rereading: [], onhold: [], dnf: [], lost: [] };
          const nonLostCount = viewModel?.nonLostCount ?? all.filter(work => normalizeStatusValue(work.status) !== 'lost').length;
          const showStatusBadge = viewModel?.showStatusBadge ?? true;
          const shouldUseSmartSort = viewModel?.shouldUseSmartSort ?? !state.getSearchQuery();
          const sorted = viewModel?.sorted || [];

          if (Array.isArray(viewModel?.randomOrder)) state.setSidebarRandomOrder(viewModel.randomOrder);

          document.getElementById('aot-total').textContent = `${nonLostCount} work${nonLostCount !== 1 ? 's' : ''}`;
          document.getElementById('aot-cnt-all').textContent = all.length;
          ['want', 'progress', 'completed', 'rereading', 'onhold', 'dnf', 'lost'].forEach(status => {
            const element = document.getElementById(`aot-cnt-${status}`);
            if (element) element.textContent = byStatus[status].length;
          });

          updateSidebarSortIndicator(shouldUseSmartSort, sortKey);

          const list = document.getElementById('aot-list');
          const empty = document.getElementById('aot-empty');
          const onboarding = document.getElementById('aot-sidebar-onboarding');
          list.innerHTML = '';

          const onboardingDismissed = typeof deps.getSidebarOnboardingDismissed === 'function'
            ? deps.getSidebarOnboardingDismissed()
            : false;
          const showOnboarding = !onboardingDismissed && all.length === 0 && !state.getSearchQuery();

          if (onboarding) {
            onboarding.style.display = showOnboarding ? 'block' : 'none';
            if (showOnboarding) {
              const titleEl = document.getElementById('aot-onboarding-title');
              const introEl = document.getElementById('aot-onboarding-intro');
              if (titleEl) titleEl.textContent = 'No works tracked yet';
              if (introEl) introEl.textContent = 'Here are a few ways to get started:';
            }
          }

          if (sorted.length === 0) {
            empty.style.display = showOnboarding ? 'none' : 'block';
            if (!showOnboarding) empty.textContent = viewModel?.emptyMessage || (state.getSearchQuery() ? 'No results found.' : emptyMsg(state.getActiveTab()));
          } else {
            empty.style.display = 'none';
            sorted.forEach(work => {
              const card = buildCard(work, showStatusBadge, cats);
              if (flippedSidebarCards.has(work.id)) card.classList.add('aot-card-flipped');
              list.appendChild(card);
              syncFrontCardDateWrapState(card);
            });
          }

          const jumpId = _pendingJumpWorkId;
          if (jumpId) {
            _pendingJumpWorkId = null;
            setTimeout(() => {
              const lw = document.getElementById('aot-list-wrap');
              if (!lw) return;
              for (const card of document.querySelectorAll('#aot-list-wrap .aot-card')) {
                const a = card.querySelector('.aot-card-title a');
                if (!a || !a.href || !a.href.includes(`/works/${jumpId}`)) continue;
                const lwRect = lw.getBoundingClientRect();
                const cRect = card.getBoundingClientRect();
                const target = Math.max(0, lw.scrollTop + (cRect.top - lwRect.top) - Math.max(0, (lw.clientHeight - cRect.height) / 2));
                lw.scrollTo({ top: target, behavior: 'smooth' });
                card.style.outline = '2px solid rgba(37,99,235,0.5)';
                card.style.borderRadius = '8px';
                setTimeout(() => { card.style.outline = ''; }, 3000);
                break;
              }
            }, 50);
          }
        });
      });
    });
  }

  function _openImpl(deps) {
    const {
      window,
      document,
      state,
      checkExportReminder,
      renderCustomTabs,
      initCurrentBar
    } = deps;

    state.setActiveTab('all');
    state.setSearchQuery('');
    const searchInput = document.getElementById('aot-search');
    if (searchInput) searchInput.value = '';

    const sidebar = document.getElementById('ao3tracker-sidebar');
    if (sidebar) {
      sidebar.querySelectorAll('.aot-tab').forEach(tab => tab.classList.toggle('aot-active', tab.dataset.tab === 'all'));
    }

    const savedWindowScroll = window.scrollY;
    if (savedWindowScroll > 0) window.scrollTo({ top: 0, behavior: 'instant' });

    state.setSidebarOpen(true);
    document.body.classList.add('aot-tracker-dock-open');
    document.getElementById('ao3tracker-sidebar')?.classList.add('aot-open');
    document.getElementById('ao3tracker-fab')?.classList.add('aot-active');

    checkExportReminder();

    // Defer layout-heavy work to the next frame so the slide animation
    // can start painting immediately without being blocked by JS.
    requestAnimationFrame(() => {
      const inner = document.getElementById('inner');
      const header = document.getElementById('header');
      const footer = document.getElementById('footer');
      if (inner && header && header.parentNode !== inner) {
        header._aot_originalParent = header.parentNode;
        header._aot_originalNextSibling = header.nextSibling;
        inner.insertBefore(header, inner.firstChild);
      }
      if (inner && footer && footer.parentNode !== inner) {
        footer._aot_originalParent = footer.parentNode;
        footer._aot_originalNextSibling = footer.nextSibling;
        inner.appendChild(footer);
      }
      if (savedWindowScroll > 0 && inner) {
        inner.scrollTop = savedWindowScroll;
      }

      renderCustomTabs();
      _renderImpl(deps);
      initCurrentBar();

      setTimeout(() => {
        const tabs = document.getElementById('aot-tabs');
        const wrap = document.getElementById('aot-tabs-wrap');
        const leftBtn = document.getElementById('aot-tabs-left');
        const rightBtn = document.getElementById('aot-tabs-right');
        if (!tabs || !wrap || tabs._scrollListenerAdded) return;
        tabs._scrollListenerAdded = true;

        function updateArrows() {
          const atStart = tabs.scrollLeft <= 4;
          const atEnd = tabs.scrollLeft + tabs.clientWidth >= tabs.scrollWidth - 4;
          wrap.classList.toggle('can-scroll-left', !atStart);
          wrap.classList.toggle('can-scroll-right', !atEnd);
        }

        tabs.addEventListener('scroll', updateArrows);
        updateArrows();

        if (leftBtn) leftBtn.addEventListener('click', () => tabs.scrollBy({ left: -120, behavior: 'smooth' }));
        if (rightBtn) rightBtn.addEventListener('click', () => tabs.scrollBy({ left: 120, behavior: 'smooth' }));
      }, 50);
    });
  }

  function _closeImpl(deps) {
    const {
      window,
      document,
      state,
      flippedSidebarCards,
      expandedSummaryCards
    } = deps;

    const inner = document.getElementById('inner');
    if (inner) {
      state.setSavedPageScrollY(inner.scrollTop);
    }

    flippedSidebarCards.clear();
    expandedSummaryCards.clear();
    state.setSidebarOpen(false);
    document.body.classList.remove('aot-tracker-dock-open');
    document.getElementById('ao3tracker-sidebar')?.classList.remove('aot-open');
    document.getElementById('ao3tracker-fab')?.classList.remove('aot-active');

    const header = document.getElementById('header');
    if (header && header._aot_originalParent) {
      header._aot_originalParent.insertBefore(header, header._aot_originalNextSibling || null);
      delete header._aot_originalParent;
      delete header._aot_originalNextSibling;
    }

    const footer = document.getElementById('footer');
    if (footer && footer._aot_originalParent) {
      footer._aot_originalParent.insertBefore(footer, footer._aot_originalNextSibling || null);
      delete footer._aot_originalParent;
      delete footer._aot_originalNextSibling;
    }

    setTimeout(() => {
      window.scrollTo({ top: state.getSavedPageScrollY(), behavior: 'instant' });
    }, 260);
  }

  // ── Public API ──

  function init(deps) {
    if (global.AO3TrackerUtils && typeof global.AO3TrackerUtils.validateDeps === 'function') {
      global.AO3TrackerUtils.validateDeps(deps, [
        'window', 'document', 'state', 'checkExportReminder',
        'renderCustomTabs', 'initCurrentBar',
        'getWorks', 'getLibrarySortSetting', 'getCustomCats',
        'normalizeStatusValue', 'buildCard', 'flippedSidebarCards',
        'expandedSummaryCards', 'syncFrontCardDateWrapState',
        'updateSidebarSortIndicator', 'emptyMsg'
      ], 'SidebarController');
    }
    _deps = deps;
  }

  function open() {
    if (_deps) _openImpl(_deps);
  }

  function close() {
    if (_deps) _closeImpl(_deps);
  }

  function render() {
    if (_deps) _renderImpl(_deps);
  }

  function openSidebar(deps) {
    if (deps) _openImpl(deps);
    else open();
  }

  function closeSidebar(deps) {
    if (deps) _closeImpl(deps);
    else close();
  }

  function renderSidebar(deps) {
    if (deps) _renderImpl(deps);
    else render();
  }

  function setPendingCardJump(workId) { _pendingJumpWorkId = workId; }

  const controller = { init, open, close, render, openSidebar, closeSidebar, renderSidebar, setPendingCardJump };

  global.AO3TrackerSidebarController = controller;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = controller;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
