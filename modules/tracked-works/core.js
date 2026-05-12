(function (global) {
  'use strict';

  const BUILTIN_STATUSES = ['want', 'progress', 'completed', 'rereading', 'onhold', 'dnf', 'lost'];

  function normalizeStatusValue(status) {
    return BUILTIN_STATUSES.includes(status) ? status : '';
  }

  function hasCustomCategories(work) {
    return Array.isArray(work && work.customCats) && work.customCats.length > 0;
  }

  function isTrackedWorkValid(work) {
    return !!(normalizeStatusValue(work && work.status) || hasCustomCategories(work));
  }

  function isOrphanAccountAuthor(author, authorUrl) {
    const name = String(author || '').trim().toLowerCase();
    const url = String(authorUrl || '').toLowerCase();
    return name === 'orphan_account' || /\/users\/orphan_account(?:[/?#]|$)/.test(url);
  }

  function nextFinishedAt(oldStatus, newStatus, existingFinishedAt) {
    const normalizedOld = normalizeStatusValue(oldStatus);
    const normalizedNew = normalizeStatusValue(newStatus);
    if (normalizedNew === 'completed' && normalizedOld !== 'completed') return Date.now();
    return existingFinishedAt || null;
  }

  function getRestoreStatus(work) {
    if (work && Object.prototype.hasOwnProperty.call(work, 'lostFrom')) {
      return normalizeStatusValue(work.lostFrom);
    }
    return hasCustomCategories(work) ? '' : 'want';
  }

  function pruneTrackedWorkIfInvalid(worksMap, workId) {
    const map = (worksMap && typeof worksMap === 'object') ? worksMap : {};
    const work = map[workId];
    if (!work) return false;
    work.status = normalizeStatusValue(work.status);
    if (!isTrackedWorkValid(work)) {
      delete map[workId];
      return true;
    }
    return false;
  }

  function sanitizeTrackedWorksMap(inputWorks) {
    const source = (inputWorks && typeof inputWorks === 'object') ? inputWorks : {};
    const sanitized = {};
    let changed = false;

    Object.entries(source).forEach(([workId, rawWork]) => {
      if (!rawWork || typeof rawWork !== 'object') {
        changed = true;
        return;
      }

      const normalizedStatus = normalizeStatusValue(rawWork.status);
      const normalizedCustomCats = Array.isArray(rawWork.customCats)
        ? [...new Set(rawWork.customCats.filter(catId => typeof catId === 'string' && catId))]
        : [];

      const normalizedWork = {
        ...rawWork,
        id: typeof rawWork.id === 'string' && rawWork.id ? rawWork.id : workId,
        status: normalizedStatus,
        customCats: normalizedCustomCats,
        title: typeof rawWork.title === 'string' && rawWork.title.trim() ? rawWork.title : (rawWork.url || `Work ${workId}`),
        author: typeof rawWork.author === 'string' && rawWork.author.trim() ? rawWork.author : 'Anonymous',
        authorUrl: typeof rawWork.authorUrl === 'string' && rawWork.authorUrl ? rawWork.authorUrl : null,
        url: typeof rawWork.url === 'string' && rawWork.url
          ? rawWork.url
          : (/^\d+$/.test(String(workId)) ? `https://archiveofourown.org/works/${workId}` : (rawWork.url || ''))
      };
      normalizedWork.isOrphaned = rawWork.isOrphaned === true || isOrphanAccountAuthor(normalizedWork.author, normalizedWork.authorUrl);

      if (!isTrackedWorkValid(normalizedWork)) {
        changed = true;
        return;
      }

      if (
        normalizedWork.id !== rawWork.id ||
        normalizedStatus !== rawWork.status ||
        normalizedCustomCats.length !== (Array.isArray(rawWork.customCats) ? rawWork.customCats.length : 0) ||
        normalizedWork.title !== rawWork.title ||
        normalizedWork.author !== rawWork.author ||
        normalizedWork.authorUrl !== (rawWork.authorUrl || null) ||
        normalizedWork.isOrphaned !== rawWork.isOrphaned ||
        normalizedWork.url !== rawWork.url
      ) {
        changed = true;
      }

      sanitized[workId] = normalizedWork;
    });

    if (Object.keys(sanitized).length !== Object.keys(source).length) changed = true;
    return { works: sanitized, changed };
  }

  const core = {
    BUILTIN_STATUSES,
    normalizeStatusValue,
    hasCustomCategories,
    isOrphanAccountAuthor,
    isTrackedWorkValid,
    nextFinishedAt,
    getRestoreStatus,
    pruneTrackedWorkIfInvalid,
    sanitizeTrackedWorksMap
  };

  global.AO3TrackerTrackedWorkCore = core;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = core;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
