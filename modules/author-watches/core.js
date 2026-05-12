(function (global) {
  'use strict';

  function normalizeAuthorWatchUrl(url) {
    const raw = String(url || '').trim();
    if (!raw) return '';
    try {
      const u = new URL(raw, 'https://archiveofourown.org/');
      u.hash = '';
      u.search = '';
      let path = u.pathname.replace(/\/+$/, '');
      path = path.replace(/\/works$/, '');
      u.pathname = path;
      return u.toString().replace(/\/+$/, '');
    } catch (e) {
      return raw.replace(/[#?].*$/, '').replace(/\/works$/, '').replace(/\/+$/, '');
    }
  }

  function normalizeWatchFandom(fandom) {
    return String(fandom || '').trim().toLowerCase();
  }

  function normalizeFandomId(fandomId) {
    const id = String(fandomId || '').trim();
    return /^\d+$/.test(id) ? id : '';
  }

  function buildAuthorWatchOpenUrl(authorUrl, fandomId) {
    const normalized = normalizeAuthorWatchUrl(authorUrl);
    if (!normalized) return '';
    const id = normalizeFandomId(fandomId);
    try {
      const u = new URL(normalized, 'https://archiveofourown.org/');
      let path = u.pathname.replace(/\/+$/, '');
      if (!/\/works$/i.test(path)) path = `${path}/works`;
      u.pathname = path;
      u.search = '';
      if (id) u.searchParams.set('fandom_id', id);
      return u.toString();
    } catch (e) {
      const base = normalized.replace(/\/+$/, '');
      const withWorks = /\/works$/i.test(base) ? base : `${base}/works`;
      return id ? `${withWorks}?fandom_id=${encodeURIComponent(id)}` : withWorks;
    }
  }

  function buildAuthorWatchFeedUrl(authorUrl, page, fandomId) {
    const openUrl = buildAuthorWatchOpenUrl(authorUrl, fandomId);
    if (!openUrl) return '';
    const pageNumber = Math.max(1, Number(page) || 1);
    try {
      const u = new URL(openUrl, 'https://archiveofourown.org/');
      u.searchParams.set('page', String(pageNumber));
      u.searchParams.set('sort_column', 'created_at');
      u.searchParams.set('sort_direction', 'desc');
      return u.toString();
    } catch (e) {
      const sep = openUrl.includes('?') ? '&' : '?';
      return `${openUrl}${sep}page=${pageNumber}&sort_column=created_at&sort_direction=desc`;
    }
  }

  function candidateTextForFandomNode(node) {
    if (!node) return '';
    const containers = [
      typeof node.closest === 'function' ? node.closest('label') : null,
      typeof node.closest === 'function' ? node.closest('li') : null,
      typeof node.closest === 'function' ? node.closest('dd') : null,
      typeof node.closest === 'function' ? node.closest('dt') : null,
      node
    ];
    return containers
      .map(container => String(container && container.textContent || '').trim())
      .find(Boolean) || '';
  }

  function extractFandomIdFromDocument(doc, fandom) {
    if (!doc || typeof doc.querySelectorAll !== 'function') return '';
    const target = normalizeWatchFandom(fandom);
    if (!target) return '';

    const candidates = [];
    const addCandidate = (id, text) => {
      const normalizedId = normalizeFandomId(id);
      const normalizedText = normalizeWatchFandom(text);
      if (normalizedId && normalizedText) candidates.push({ id: normalizedId, text: normalizedText });
    };

    Array.from(doc.querySelectorAll('a[href*="fandom_id="]')).forEach(link => {
      const href = String(link.href || (typeof link.getAttribute === 'function' ? link.getAttribute('href') : '') || '');
      try {
        const url = new URL(href, 'https://archiveofourown.org/');
        addCandidate(url.searchParams.get('fandom_id'), link.textContent);
      } catch (e) {
        const match = href.match(/[?&]fandom_id=(\d+)/);
        addCandidate(match && match[1], link.textContent);
      }
    });

    Array.from(doc.querySelectorAll('input[name*="fandom"], input[id*="fandom"]')).forEach(input => {
      const value = input.value || (typeof input.getAttribute === 'function' ? input.getAttribute('value') : '');
      addCandidate(value, candidateTextForFandomNode(input));
    });

    Array.from(doc.querySelectorAll('option[value]')).forEach(option => {
      const value = option.value || (typeof option.getAttribute === 'function' ? option.getAttribute('value') : '');
      addCandidate(value, option.textContent);
    });

    const exact = candidates.find(candidate => candidate.text === target);
    if (exact) return exact.id;
    const contains = candidates.find(candidate => candidate.text.includes(target) || target.includes(candidate.text));
    return contains ? contains.id : '';
  }

  function sanitizeAuthorWatchesMap(inputWatches) {
    const source = (inputWatches && typeof inputWatches === 'object') ? inputWatches : {};
    const sanitized = {};
    let changed = false;

    Object.entries(source).forEach(([watchId, rawWatch]) => {
      if (!rawWatch || typeof rawWatch !== 'object') {
        changed = true;
        return;
      }
      const authorUrl = normalizeAuthorWatchUrl(rawWatch.authorUrl);
      const author = String(rawWatch.author || '').trim();
      const fandom = String(rawWatch.fandom || '').trim();
      const fandomKey = normalizeWatchFandom(fandom);
      const fandomId = normalizeFandomId(rawWatch.fandomId);
      if (!authorUrl || !author || !fandom || !fandomKey) {
        changed = true;
        return;
      }
      const knownWorkIds = Array.isArray(rawWatch.knownWorkIds)
        ? [...new Set(rawWatch.knownWorkIds.map(id => String(id || '').trim()).filter(Boolean))]
        : [];
      const normalized = {
        ...rawWatch,
        id: String(rawWatch.id || watchId),
        author,
        authorUrl,
        fandom,
        fandomKey,
        fandomId,
        knownWorkIds,
        createdAt: Number(rawWatch.createdAt) || Date.now(),
        lastCheckedAt: Number(rawWatch.lastCheckedAt) || null,
        baselineReady: rawWatch.baselineReady === true
      };
      sanitized[normalized.id] = normalized;
      if (
        normalized.id !== rawWatch.id ||
        authorUrl !== rawWatch.authorUrl ||
        fandomId !== (rawWatch.fandomId || '') ||
        fandomKey !== rawWatch.fandomKey ||
        knownWorkIds.length !== (Array.isArray(rawWatch.knownWorkIds) ? rawWatch.knownWorkIds.length : 0)
      ) {
        changed = true;
      }
    });

    if (Object.keys(sanitized).length !== Object.keys(source).length) changed = true;
    return { watches: sanitized, changed };
  }

  function sanitizeAuthorWatchMatches(inputMatches) {
    const source = Array.isArray(inputMatches) ? inputMatches : [];
    const seen = new Set();
    const sanitized = [];
    source.forEach(raw => {
      if (!raw || typeof raw !== 'object') return;
      const id = String(raw.id || '').trim();
      const watchId = String(raw.watchId || '').trim();
      const workId = String(raw.workId || '').trim();
      const title = String(raw.title || '').trim();
      const url = String(raw.url || '').trim();
      if (!id || !watchId || !workId || !title || !url || seen.has(id)) return;
      seen.add(id);
      sanitized.push({
        ...raw,
        id,
        watchId,
        workId,
        title,
        url,
        author: String(raw.author || '').trim() || 'Anonymous',
        fandom: String(raw.fandom || '').trim(),
        foundAt: Number(raw.foundAt) || Date.now()
      });
    });
    sanitized.sort((a, b) => (b.foundAt || 0) - (a.foundAt || 0));
    return sanitized.slice(0, 100);
  }

  function sanitizeFetchedAo3Html(html) {
    const raw = String(html || '');
    const stripped = raw
      .replace(/<!doctype\b[^>]*>/gi, '')
      .replace(/<head\b[\s\S]*?<\/head\s*>/gi, '')
      .replace(/<script\b[\s\S]*?<\/script\s*>/gi, '')
      .replace(/<script\b[^>]*(?:\/\s*)?>/gi, '')
      .replace(/<style\b[\s\S]*?<\/style\s*>/gi, '')
      .replace(/<style\b[^>]*(?:\/\s*)?>/gi, '')
      .replace(/<noscript\b[\s\S]*?<\/noscript\s*>/gi, '')
      .replace(/<noscript\b[^>]*(?:\/\s*)?>/gi, '')
      .replace(/<(?:video|audio|picture|object|iframe|embed)\b[\s\S]*?<\/(?:video|audio|picture|object|iframe|embed)\s*>/gi, '')
      .replace(/<(?:link|meta|base|iframe|embed|img|source|track)\b[^>]*(?:\/\s*)?>/gi, '')
      .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/\s+(?:src|srcset|poster|ping|integrity|crossorigin|nonce)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
    const bodyMatch = stripped.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    return bodyMatch ? bodyMatch[1] : stripped;
  }

  function looksLikeAo3BotBlock(html) {
    const text = String(html || '').toLowerCase();
    return text.includes('retry later') ||
      text.includes('temporarily blocked') ||
      text.includes('too many requests') ||
      text.includes('rate limit') ||
      text.includes('slow down');
  }

  function extractWorkIdFromUrl(url) {
    const match = String(url || '').match(/archiveofourown\.org\/works\/(\d+)/);
    return match ? match[1] : null;
  }

  const core = {
    normalizeAuthorWatchUrl,
    normalizeWatchFandom,
    normalizeFandomId,
    buildAuthorWatchOpenUrl,
    buildAuthorWatchFeedUrl,
    extractFandomIdFromDocument,
    sanitizeAuthorWatchesMap,
    sanitizeAuthorWatchMatches,
    sanitizeFetchedAo3Html,
    looksLikeAo3BotBlock,
    extractWorkIdFromUrl
  };

  global.AO3TrackerAuthorWatchCore = core;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = core;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
