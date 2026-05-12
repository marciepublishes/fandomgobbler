(function (global) {
  'use strict';

  const TrackedWorkCore = global.AO3TrackerTrackedWorkCore || {};
  const normalizeStatusValue = TrackedWorkCore.normalizeStatusValue || function (status) {
    return ['want', 'progress', 'completed', 'rereading', 'onhold', 'dnf', 'lost'].includes(status) ? status : '';
  };

  const LISTING_BLURB_SELECTOR = 'li.work.blurb.group, li.bookmark.blurb.group';

  const STATUS_LABELS = {
    want: 'For Later',
    progress: 'Reading',
    completed: 'Completed',
    rereading: 'Re-reading',
    onhold: 'On Hold',
    dnf: 'Did Not Finish'
  };

  const STATUS_OPTIONS = [
    { s: 'want', l: 'For Later' },
    { s: 'progress', l: 'Reading' },
    { s: 'completed', l: 'Completed' },
    { s: 'rereading', l: 'Re-reading' },
    { s: 'onhold', l: 'On Hold' },
    { s: 'dnf', l: 'Did Not Finish' }
  ];

  function extractWorkIdFromListingBlurb(blurb) {
    if (!blurb) return null;

    const dataId = blurb.dataset && blurb.dataset.workId;
    if (dataId) return dataId;

    const elementId = blurb.id && (String(blurb.id).match(/^work_(\d+)/) || [])[1];
    if (elementId) return elementId;

    const workLink = typeof blurb.querySelector === 'function'
      ? blurb.querySelector('a[href*="/works/"]')
      : null;
    const href = workLink && workLink.href;
    const match = href && String(href).match(/\/works\/(\d+)/);
    return match ? match[1] : null;
  }

  function buildListingCustomCatsKey(customCats) {
    return Array.isArray(customCats) && customCats.length
      ? [...customCats].sort().join(',')
      : '';
  }

  function getListingStatusLabel(status) {
    return STATUS_LABELS[normalizeStatusValue(status)] || 'Tracked';
  }

  function buildListingBadgeText(status) {
    return `${getListingStatusLabel(status)} \u25BE`;
  }

  function getListingChapterProgressMeta(workId, work, normalizeStatusFn) {
    const normalizer = typeof normalizeStatusFn === 'function' ? normalizeStatusFn : normalizeStatusValue;
    const normalizedStatus = normalizer(work && work.status);
    const chapter = work && work.furthestChapter;
    if (!chapter || normalizedStatus === 'completed') return null;

    return {
      label: `Ch. ${chapter.num}${chapter.total ? '/' + chapter.total : ''}`,
      href: chapter.id
        ? `https://archiveofourown.org/works/${workId}/chapters/${chapter.id}`
        : `https://archiveofourown.org/works/${workId}`
    };
  }

  function buildListingBadgeDataset(workId, work, normalizeStatusFn) {
    const normalizer = typeof normalizeStatusFn === 'function' ? normalizeStatusFn : normalizeStatusValue;
    const chapter = getListingChapterProgressMeta(workId, work, normalizer);
    return {
      workId: String(workId || ''),
      status: normalizer(work && work.status),
      rating: String((work && work.rating) || ''),
      chap: chapter ? String(work.furthestChapter && work.furthestChapter.num) : '',
      customCats: buildListingCustomCatsKey(work && work.customCats)
    };
  }

  function matchesListingBadgeDataset(element, workId, work, normalizeStatusFn) {
    if (!element || !work) return false;
    const expected = buildListingBadgeDataset(workId, work, normalizeStatusFn);
    return element.dataset.workId === expected.workId &&
      element.dataset.status === expected.status &&
      element.dataset.rating === expected.rating &&
      element.dataset.chap === expected.chap &&
      (element.dataset.customCats || '') === expected.customCats;
  }

  const core = {
    LISTING_BLURB_SELECTOR,
    STATUS_LABELS,
    STATUS_OPTIONS,
    extractWorkIdFromListingBlurb,
    buildListingCustomCatsKey,
    getListingStatusLabel,
    buildListingBadgeText,
    getListingChapterProgressMeta,
    buildListingBadgeDataset,
    matchesListingBadgeDataset
  };

  global.AO3TrackerListingBadgeCore = core;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = core;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
