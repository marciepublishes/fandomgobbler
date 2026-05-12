(function (global) {
  'use strict';

  const TrackedWorkCore = global.AO3TrackerTrackedWorkCore || {};
  const normalizeStatusValue = TrackedWorkCore.normalizeStatusValue || function (status) {
    return ['want', 'progress', 'completed', 'rereading', 'onhold', 'dnf', 'lost'].includes(status) ? status : '';
  };

  const BUILTIN_SIDEBAR_TABS = ['all', 'want', 'progress', 'completed', 'rereading', 'onhold', 'dnf', 'lost'];

  function emptyMsg(tab) {
    return {
      all: 'No works tracked yet. Open any AO3 story and click the floating button to start tracking.',
      want: 'No works yet. Browse AO3 to add!',
      progress: 'Nothing reading yet.',
      completed: 'No completed reads yet.',
      rereading: 'Nothing re-reading yet. Move a completed fic here when you start it again.',
      onhold: 'Nothing on hold. Use this for fics awaiting new chapters.',
      dnf: 'No DNFs yet. It\'s okay to put down a fic.',
      lost: 'No deleted works detected. The checker runs in the background.'
    }[tab] || '';
  }

  function librarySortLabel(sortKey) {
    return {
      'recently-added': 'Recently Added',
      'recently-updated': 'Most Recently Updated',
      'most-popular': 'Most Popular',
      'most-bookmarked': 'Most Bookmarked',
      'most-kudos': 'Most Kudos',
      'most-hits': 'Most Hits',
      'oldest-for-later': 'Oldest in For Later',
      'longest-unread': 'Longest Unread',
      'shortest-unread': 'Shortest Unread',
      'highest-rated': 'Highest Rated by Me',
      'random': 'Random'
    }[sortKey] || 'Recently Added';
  }

  function compareNumbersDesc(a, b) {
    return numberOrNegInf(b) - numberOrNegInf(a);
  }

  function compareNumbersAsc(a, b) {
    return numberOrPosInf(a) - numberOrPosInf(b);
  }

  function compareStringsAsc(a, b) {
    return String(a || '').localeCompare(String(b || ''), undefined, { sensitivity: 'base' });
  }

  function numberOrNegInf(value) {
    return Number.isFinite(Number(value)) ? Number(value) : Number.NEGATIVE_INFINITY;
  }

  function numberOrPosInf(value) {
    return Number.isFinite(Number(value)) ? Number(value) : Number.POSITIVE_INFINITY;
  }

  function popularityScore(work) {
    const kudos = Math.max(0, Number(work && work.kudosCount) || 0);
    const bookmarks = Math.max(0, Number(work && work.bookmarksCount) || 0);
    const hits = Math.max(0, Number(work && work.hitsCount) || 0);
    return (3 * Math.log1p(kudos)) + (4 * Math.log1p(bookmarks)) + (1 * Math.log1p(hits));
  }

  function isUnreadWork(work) {
    return !['completed', 'dnf', 'lost'].includes(work && work.status);
  }

  function shuffleItems(items, randomFn) {
    const rand = typeof randomFn === 'function' ? randomFn : Math.random;
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rand() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function randomSortWorksForSidebar(items, existingOrder, randomFn) {
    const ids = items.map(item => item.id);
    const priorOrder = Array.isArray(existingOrder) ? existingOrder : [];
    const needsRefresh =
      priorOrder.length !== ids.length ||
      ids.some(id => !priorOrder.includes(id));
    const nextOrder = needsRefresh ? shuffleItems(ids, randomFn) : priorOrder.slice();
    const rank = new Map(nextOrder.map((id, index) => [id, index]));
    return {
      items: [...items].sort((a, b) => (rank.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.id) ?? Number.MAX_SAFE_INTEGER)),
      randomOrder: nextOrder
    };
  }

  function sortWorksForSidebar(items, sortKey, randomOrder, randomFn) {
    const worksCopy = [...items];
    switch (sortKey) {
      case 'recently-updated':
        return {
          items: worksCopy.sort((a, b) => compareNumbersDesc(a.updatedAt, b.updatedAt) || compareNumbersDesc(a.addedAt, b.addedAt)),
          randomOrder
        };
      case 'most-popular':
        return {
          items: worksCopy.sort((a, b) => compareNumbersDesc(popularityScore(a), popularityScore(b)) || compareNumbersDesc(a.bookmarksCount, b.bookmarksCount) || compareNumbersDesc(a.kudosCount, b.kudosCount) || compareNumbersDesc(a.hitsCount, b.hitsCount) || compareNumbersDesc(a.addedAt, b.addedAt)),
          randomOrder
        };
      case 'most-bookmarked':
        return {
          items: worksCopy.sort((a, b) => compareNumbersDesc(a.bookmarksCount, b.bookmarksCount) || compareNumbersDesc(a.kudosCount, b.kudosCount) || compareNumbersDesc(a.hitsCount, b.hitsCount) || compareNumbersDesc(a.addedAt, b.addedAt)),
          randomOrder
        };
      case 'most-kudos':
        return {
          items: worksCopy.sort((a, b) => compareNumbersDesc(a.kudosCount, b.kudosCount) || compareNumbersDesc(a.bookmarksCount, b.bookmarksCount) || compareNumbersDesc(a.hitsCount, b.hitsCount) || compareNumbersDesc(a.addedAt, b.addedAt)),
          randomOrder
        };
      case 'most-hits':
        return {
          items: worksCopy.sort((a, b) => compareNumbersDesc(a.hitsCount, b.hitsCount) || compareNumbersDesc(a.kudosCount, b.kudosCount) || compareNumbersDesc(a.bookmarksCount, b.bookmarksCount) || compareNumbersDesc(a.addedAt, b.addedAt)),
          randomOrder
        };
      case 'oldest-for-later':
        return {
          items: worksCopy.sort((a, b) => {
            const aWant = a.status === 'want' ? 0 : 1;
            const bWant = b.status === 'want' ? 0 : 1;
            return (aWant - bWant) || compareNumbersAsc(a.addedAt, b.addedAt) || compareStringsAsc(a.title, b.title);
          }),
          randomOrder
        };
      case 'longest-unread':
        return {
          items: worksCopy.sort((a, b) => {
            const aUnread = isUnreadWork(a) ? 0 : 1;
            const bUnread = isUnreadWork(b) ? 0 : 1;
            return (aUnread - bUnread) || compareNumbersDesc(a.wordCount, b.wordCount) || compareNumbersDesc(a.updatedAt, b.updatedAt) || compareStringsAsc(a.title, b.title);
          }),
          randomOrder
        };
      case 'shortest-unread':
        return {
          items: worksCopy.sort((a, b) => {
            const aUnread = isUnreadWork(a) ? 0 : 1;
            const bUnread = isUnreadWork(b) ? 0 : 1;
            return (aUnread - bUnread) || compareNumbersAsc(a.wordCount, b.wordCount) || compareNumbersDesc(a.updatedAt, b.updatedAt) || compareStringsAsc(a.title, b.title);
          }),
          randomOrder
        };
      case 'highest-rated':
        return {
          items: worksCopy.sort((a, b) => compareNumbersDesc(a.rating, b.rating) || compareNumbersDesc(a.completedAt || a.inferredCompletedAt, b.completedAt || b.inferredCompletedAt) || compareNumbersDesc(a.addedAt, b.addedAt)),
          randomOrder
        };
      case 'random':
        return randomSortWorksForSidebar(worksCopy, randomOrder, randomFn);
      case 'recently-added':
      default:
        return {
          items: worksCopy.sort((a, b) => compareNumbersDesc(a.addedAt, b.addedAt) || compareNumbersDesc(a.movedAt, b.movedAt)),
          randomOrder
        };
    }
  }

  function matchesSidebarSearch(work, normalizedQuery) {
    const q = String(normalizedQuery || '').trim().toLowerCase();
    if (!q) return true;
    return String(work.title || '').toLowerCase().includes(q) ||
      String(work.author || '').toLowerCase().includes(q) ||
      (work.fandoms || []).some(f => String(f || '').toLowerCase().includes(q)) ||
      String(work.relationship || '').toLowerCase().includes(q) ||
      String(work.note || '').toLowerCase().includes(q);
  }

  function buildSidebarBuckets(works) {
    const all = Array.isArray(works) ? works : [];
    const byStatus = { want: [], progress: [], completed: [], rereading: [], onhold: [], dnf: [], lost: [] };
    all.forEach(work => {
      const status = normalizeStatusValue(work && work.status);
      if (byStatus[status]) byStatus[status].push(work);
    });
    return byStatus;
  }

  function computeSidebarViewModel(options) {
    const config = (options && typeof options === 'object') ? options : {};
    const all = Array.isArray(config.works) ? config.works : [];
    const activeTab = String(config.activeTab || 'all');
    const query = String(config.searchQuery || '').trim().toLowerCase();
    const sortKey = String(config.sortKey || 'recently-added');
    const byStatus = buildSidebarBuckets(all);
    const isAllTab = activeTab === 'all';
    const isBuiltIn = BUILTIN_SIDEBAR_TABS.includes(activeTab);

    let sourceList;
    if (query || isAllTab) {
      sourceList = all;
    } else if (isBuiltIn) {
      sourceList = byStatus[activeTab] || [];
    } else {
      sourceList = all.filter(work => (work.customCats || []).includes(activeTab));
    }

    const filtered = query ? sourceList.filter(work => matchesSidebarSearch(work, query)) : sourceList;
    const showStatusBadge = isAllTab || !!query || !isBuiltIn;
    const shouldUseSmartSort = !query;
    const sortedResult = shouldUseSmartSort
      ? sortWorksForSidebar(filtered, sortKey, config.randomOrder, config.randomFn)
      : { items: [...filtered].sort((a, b) => (b.movedAt || b.addedAt) - (a.movedAt || a.addedAt)), randomOrder: config.randomOrder || [] };

    const nonLostCount = all.filter(work => normalizeStatusValue(work.status) !== 'lost').length;

    return {
      all,
      byStatus,
      nonLostCount,
      isBuiltIn,
      showStatusBadge,
      shouldUseSmartSort,
      sorted: sortedResult.items,
      randomOrder: sortedResult.randomOrder,
      emptyMessage: query ? 'No results found.' : emptyMsg(activeTab)
    };
  }

  function buildSidebarSortIndicatorText(visible, sortKey) {
    if (!visible) return '';
    return `Sorted by: ${librarySortLabel(sortKey)}. Sorting can be changed in the popup.`;
  }

  function formatWorkWordCountDisplay(wc) {
    const n = wc == null || wc === '' ? NaN : Number(wc);
    if (!Number.isFinite(n) || n <= 0) return '—';
    return n.toLocaleString() + ' words';
  }

  const core = {
    BUILTIN_SIDEBAR_TABS,
    emptyMsg,
    librarySortLabel,
    compareNumbersDesc,
    compareNumbersAsc,
    compareStringsAsc,
    numberOrNegInf,
    numberOrPosInf,
    popularityScore,
    isUnreadWork,
    shuffleItems,
    randomSortWorksForSidebar,
    sortWorksForSidebar,
    matchesSidebarSearch,
    buildSidebarBuckets,
    computeSidebarViewModel,
    buildSidebarSortIndicatorText,
    formatWorkWordCountDisplay
  };

  global.AO3TrackerSidebarCore = core;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = core;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
