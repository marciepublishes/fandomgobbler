(function (global) {
  'use strict';

  const AuthorWatchCore = global.AO3TrackerAuthorWatchCore || {};
  const TrackedWorkCore = global.AO3TrackerTrackedWorkCore || {};

  const extractWorkIdFromUrl = AuthorWatchCore.extractWorkIdFromUrl || function (url) {
    const match = String(url || '').match(/archiveofourown\.org\/works\/(\d+)/);
    return match ? match[1] : null;
  };

  const normalizeStatusValue = TrackedWorkCore.normalizeStatusValue || function (status) {
    return ['want', 'progress', 'completed', 'rereading', 'onhold', 'dnf', 'lost'].includes(status) ? status : '';
  };

  const nextFinishedAt = TrackedWorkCore.nextFinishedAt || function (oldStatus, newStatus, existingFinishedAt) {
    const normalizedOld = normalizeStatusValue(oldStatus);
    const normalizedNew = normalizeStatusValue(newStatus);
    if (normalizedNew === 'completed' && normalizedOld !== 'completed') return Date.now();
    return existingFinishedAt || null;
  };

  const isOrphanAccountAuthor = TrackedWorkCore.isOrphanAccountAuthor || function (author, authorUrl) {
    const name = String(author || '').trim().toLowerCase();
    const url = String(authorUrl || '').toLowerCase();
    return name === 'orphan_account' || /\/users\/orphan_account(?:[/?#]|$)/.test(url);
  };

  function normalizeBookmarkSyncState(raw) {
    const source = (raw && typeof raw === 'object') ? raw : {};
    return {
      knownWorkIds: Array.isArray(source.knownWorkIds)
        ? [...new Set(source.knownWorkIds.map(id => String(id || '').trim()).filter(Boolean))].slice(-5000)
        : [],
      lastFetchedAt: Number(source.lastFetchedAt) || null
    };
  }

  function filterBookmarkCandidates(candidates, query) {
    const list = Array.isArray(candidates) ? candidates : [];
    const q = String(query || '').trim().toLowerCase();
    if (!q) return list;
    return list.filter(item =>
      String(item && item.title || '').toLowerCase().includes(q) ||
      String(item && item.author || '').toLowerCase().includes(q) ||
      ((item && item.fandoms) || []).some(f => String(f || '').toLowerCase().includes(q))
    );
  }

  function extractBlurbTextSummary(blurb) {
    const summaryEl =
      blurb.querySelector('.summary blockquote.userstuff') ||
      blurb.querySelector('.summary .userstuff') ||
      blurb.querySelector('blockquote.userstuff.summary') ||
      blurb.querySelector('.work .summary .userstuff');
    if (!summaryEl) return '';
    return String(summaryEl.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function extractBookmarkNotes(blurb) {
    const notesEl =
      blurb.querySelector('.bookmark .notes blockquote.userstuff') ||
      blurb.querySelector('.bookmark blockquote.userstuff.notes') ||
      blurb.querySelector('.bookmark .userstuff.notes') ||
      blurb.querySelector('blockquote.bookmark_notes.userstuff') ||
      blurb.querySelector('.bookmark .userstuff');
    if (!notesEl) return '';
    return String(notesEl.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function buildImportedBookmarkNotes(blurb) {
    return extractBookmarkNotes(blurb);
  }

  function extractBlurbStatNumber(blurb, label) {
    const dtNodes = Array.from(blurb.querySelectorAll('dl.stats dt'));
    const dt = dtNodes.find(node => String(node.textContent || '').trim().toLowerCase() === `${label.toLowerCase()}:`);
    if (!dt) return null;
    const dd = dt.nextElementSibling;
    if (!dd) return null;
    const num = parseInt(String(dd.textContent || '').replace(/,/g, ''), 10);
    return Number.isFinite(num) ? num : null;
  }

  function parseBookmarkEntry(blurb) {
    const workLink = blurb.querySelector('h4.heading a[href*="/works/"], h4 a[href*="/works/"]');
    const url = workLink && workLink.href || '';
    const workId = extractWorkIdFromUrl(url);
    if (!workId) return null;

    const userLinks = Array.from(blurb.querySelectorAll('h4.heading a[href*="/users/"], h4 a[href*="/users/"]'));
    const lastUserLink = userLinks[userLinks.length - 1] || null;
    const fandoms = Array.from(blurb.querySelectorAll('.fandoms a.tag, .fandom.tags a.tag'))
      .map(el => String(el.textContent || '').trim())
      .filter(Boolean)
      .slice(0, 5);
    const relationship = blurb.querySelector('.relationships a.tag, .relationship.tags a.tag') &&
      blurb.querySelector('.relationships a.tag, .relationship.tags a.tag').textContent &&
      blurb.querySelector('.relationships a.tag, .relationship.tags a.tag').textContent.trim() || '';

    const author = String(lastUserLink && lastUserLink.textContent || blurb.querySelector('a[href*="/users/"]') && blurb.querySelector('a[href*="/users/"]').textContent || 'Anonymous').trim();
    const authorUrl = lastUserLink && lastUserLink.href || null;

    return {
      id: workId,
      title: String(workLink && workLink.textContent || 'Untitled').trim(),
      author,
      authorUrl,
      isOrphaned: isOrphanAccountAuthor(author, authorUrl),
      url: url || `https://archiveofourown.org/works/${workId}`,
      fandoms,
      relationship,
      summary: extractBlurbTextSummary(blurb),
      notes: buildImportedBookmarkNotes(blurb),
      wordCount: extractBlurbStatNumber(blurb, 'words'),
      kudosCount: extractBlurbStatNumber(blurb, 'kudos'),
      bookmarksCount: extractBlurbStatNumber(blurb, 'bookmarks'),
      hitsCount: extractBlurbStatNumber(blurb, 'hits'),
      updatedAt: null,
      completedAt: null,
      publishedAt: null,
      inferredCompletedAt: null,
      subscribedAtAo3: null
    };
  }

  function parseBookmarkPageDocument(doc) {
    const entries = Array.from(doc.querySelectorAll('li.bookmark.blurb.group'))
      .map(parseBookmarkEntry)
      .filter(Boolean);

    const paginationLinks = Array.from(doc.querySelectorAll('ol.pagination a[href*="page="], nav.pagy a[href*="page="]'));
    const totalPages = paginationLinks
      .map(link => {
        const match = String(link.href || '').match(/[?&]page=(\d+)/);
        return match ? parseInt(match[1], 10) : null;
      })
      .filter(Number.isFinite)
      .reduce((max, n) => Math.max(max, n), 0) || null;
    const hasNext = !!doc.querySelector('ol.pagination .next a, nav.pagy a[rel="next"], a[rel="next"]');

    return { entries, totalPages, hasNext };
  }

  function mergeKnownBookmarkWorkIds(existingKnownWorkIds, fetchedWorkIds, limit) {
    const max = Number(limit) > 0 ? Number(limit) : 5000;
    return [...new Set([...(Array.isArray(existingKnownWorkIds) ? existingKnownWorkIds : []), ...(Array.isArray(fetchedWorkIds) ? fetchedWorkIds : [])])].slice(-max);
  }

  function buildTrackedWorkFromBookmarkEntry(entry, options) {
    const source = entry || {};
    const config = (options && typeof options === 'object') ? options : {};
    const selectedStatus = normalizeStatusValue(config.selectedStatus);
    const selectedCustomCat = String(config.selectedCustomCat || '').trim();
    const now = Number(config.now) || Date.now();

    return {
      id: source.id,
      title: source.title || 'Untitled',
      author: source.author || 'Anonymous',
      authorUrl: source.authorUrl || null,
      isOrphaned: source.isOrphaned === true || isOrphanAccountAuthor(source.author, source.authorUrl),
      summary: source.summary || '',
      notes: source.notes || '',
      url: source.url || `https://archiveofourown.org/works/${source.id}`,
      fandoms: Array.isArray(source.fandoms) ? source.fandoms : [],
      relationship: source.relationship || '',
      seriesTitle: '',
      seriesUrl: null,
      seriesPosition: '',
      status: selectedStatus,
      customCats: selectedCustomCat ? [selectedCustomCat] : [],
      wordCount: source.wordCount || null,
      kudosCount: source.kudosCount || null,
      bookmarksCount: source.bookmarksCount || null,
      hitsCount: source.hitsCount || null,
      updatedAt: source.updatedAt || null,
      completedAt: source.completedAt || null,
      publishedAt: source.publishedAt || null,
      inferredCompletedAt: source.inferredCompletedAt || null,
      subscribedAtAo3: typeof source.subscribedAtAo3 === 'boolean' ? source.subscribedAtAo3 : null,
      finishedAt: nextFinishedAt('', selectedStatus, null),
      addedAt: now,
      movedAt: now
    };
  }

  const core = {
    normalizeBookmarkSyncState,
    filterBookmarkCandidates,
    extractBlurbTextSummary,
    extractBookmarkNotes,
    buildImportedBookmarkNotes,
    extractBlurbStatNumber,
    parseBookmarkEntry,
    parseBookmarkPageDocument,
    mergeKnownBookmarkWorkIds,
    buildTrackedWorkFromBookmarkEntry
  };

  global.AO3TrackerBookmarkImportCore = core;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = core;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
