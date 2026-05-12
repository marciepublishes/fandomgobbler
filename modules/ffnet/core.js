(function (global) {
  'use strict';

  function textContent(node) {
    return String(node && node.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function getQueryableRoot(root) {
    if (root && typeof root.querySelectorAll === 'function') return root;
    if (typeof document !== 'undefined' && document && typeof document.querySelectorAll === 'function') return document;
    return null;
  }

  function absoluteUrl(href, baseUrl) {
    if (!href) return '';
    try {
      return new URL(href, baseUrl || 'https://www.fanfiction.net/').toString();
    } catch (e) {
      return '';
    }
  }

  function parseNumber(raw) {
    const normalized = String(raw || '').replace(/,/g, '').trim();
    const value = Number(normalized);
    return Number.isFinite(value) ? value : null;
  }

  function parseDateValue(raw) {
    const value = String(raw || '').trim();
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
  }

  function extractStoryIdFromUrl(url) {
    const match = String(url || '').match(/fanfiction\.net\/s\/(\d+)/i) || String(url || '').match(/^\/s\/(\d+)/i);
    return match ? match[1] : null;
  }

  function isStoryUrl(url) {
    return !!extractStoryIdFromUrl(url);
  }

  function buildWorkId(storyId) {
    return storyId ? `ffnet-${storyId}` : '';
  }

  function parseMetaText(metaText) {
    const text = String(metaText || '');
    const fields = {};
    text.split(/\s+-\s+/).forEach(part => {
      const match = String(part || '').match(/^([^:]+):\s*(.*)$/);
      if (!match) return;
      fields[match[1].trim().toLowerCase()] = match[2].trim();
    });
    const capture = label => fields[String(label || '').toLowerCase()] || '';

    const relationshipMatch = text.match(/\s-\s\[(.+?)\](?=\s|-\sChapters:|-\sWords:|$)/);

    return {
      chapters: parseNumber(capture('Chapters')),
      words: parseNumber(capture('Words')),
      reviews: parseNumber(capture('Reviews')),
      favs: parseNumber(capture('Favs')),
      follows: parseNumber(capture('Follows')),
      updatedAt: parseDateValue(capture('Updated')),
      publishedAt: parseDateValue(capture('Published')),
      completed: /Status:\s*Complete/i.test(text),
      relationship: relationshipMatch ? String(relationshipMatch[1]).trim() : ''
    };
  }

  function extractFandomsFromDocument(doc) {
    const genericLabels = new Set(['anime', 'books', 'cartoons', 'comics', 'games', 'misc', 'movies', 'plays', 'tv', 'fanfiction']);
    const root = getQueryableRoot(doc);
    if (!root) return [];
    const links = Array.from(root.querySelectorAll('a[href*="/book/"], a[href*="/anime/"], a[href*="/cartoon/"], a[href*="/comic/"], a[href*="/game/"], a[href*="/misc/"], a[href*="/movie/"], a[href*="/play/"], a[href*="/tv/"]'));
    return [...new Set(links
      .map(link => textContent(link))
      .filter(label => label && !genericLabels.has(label.toLowerCase())))];
  }

  function extractSummaryFromProfile(profileTop, metaText) {
    const root = getQueryableRoot(profileTop);
    if (!root) return '';
    const candidates = Array.from(root.querySelectorAll('span, div, p'))
      .map(node => textContent(node))
      .filter(text => text && text.length > 24)
      .filter(text => text !== metaText)
      .filter(text => !/^By:/i.test(text))
      .filter(text => !/^Rated:/i.test(text))
      .filter(text => !/^Follow\/Fav/i.test(text))
      .filter(text => !/^Chapter\s+\d+/i.test(text));
    return candidates[0] || '';
  }

  function extractWorkInfoFromDocument(doc, url) {
    const pageUrl = String(url || (doc && doc.location && doc.location.href) || '');
    const storyId = extractStoryIdFromUrl(pageUrl);
    if (!storyId) return null;

    const chapterMatch = pageUrl.match(/\/s\/\d+\/(\d+)/i);
    const chapterNum = parseNumber(chapterMatch && chapterMatch[1]);
    const profileTop = doc.getElementById('profile_top') || doc.querySelector('#content_wrapper_inner');
    const authorLink = (profileTop || doc).querySelector('a[href*="/u/"]');
    const titleNode = (profileTop || doc).querySelector('b.xcontrast_txt, .xcontrast_txt b, b');
    const metaNode = Array.from((profileTop || doc).querySelectorAll('span, div, p'))
      .find(node => /Rated:\s*Fiction/i.test(textContent(node)) && /Words:/i.test(textContent(node)));
    const metaText = textContent(metaNode);
    const meta = parseMetaText(metaText);
    const titleFromNode = textContent(titleNode);
    const titleFromPage = String(doc.title || '').replace(/\s*\|\s*FanFiction.*$/i, '').trim();
    const title = (titleFromNode && titleFromNode.length < 200 && !/Rated:/i.test(titleFromNode))
      ? titleFromNode
      : (titleFromPage || titleFromNode);

    return {
      platform: 'ffnet',
      site: 'fanfiction',
      workId: buildWorkId(storyId),
      sourceId: storyId,
      title: title || `Story ${storyId}`,
      author: textContent(authorLink) || 'Anonymous',
      authorUrl: absoluteUrl(authorLink && authorLink.getAttribute('href'), pageUrl) || null,
      url: pageUrl.split('#')[0].replace(/(\/s\/\d+\/)\d+(\/|$)/i, (_, base, sep) => base + '1' + sep),
      fandoms: extractFandomsFromDocument(doc),
      relationship: meta.relationship,
      summary: extractSummaryFromProfile(profileTop, metaText),
      wordCount: meta.words,
      reviewsCount: meta.reviews,
      favoritesCount: meta.favs,
      followsCount: meta.follows,
      bookmarksCount: meta.favs,
      kudosCount: meta.reviews,
      hitsCount: meta.follows,
      updatedAt: meta.updatedAt,
      publishedAt: meta.publishedAt,
      completedAt: meta.completed ? (meta.updatedAt || meta.publishedAt) : null,
      inferredCompletedAt: meta.completed ? (meta.updatedAt || meta.publishedAt) : null,
      chapterCount: meta.chapters,
      furthestChapter: chapterNum ? { num: chapterNum, total: meta.chapters || null } : null
    };
  }

  function extractListingStoryIdFromLink(link) {
    const href = link && (link.getAttribute('href') || link.href);
    return extractStoryIdFromUrl(href);
  }

  function findListingStoryLinks(doc) {
    const root = getQueryableRoot(doc);
    if (!root) return [];
    return Array.from(root.querySelectorAll('a[href*="/s/"]'))
      .filter(link => extractListingStoryIdFromLink(link))
      .filter(link => {
        const href = String(link.getAttribute('href') || link.href || '');
        return !/\/r\/|\/u\/|\/community\//i.test(href);
      })
      .filter(link => !!link.closest('.z-list, .z-indent, .story, .lst, .list-group, .team_story_item'));
  }

  function findListingContainer(link) {
    if (!link || typeof link.closest !== 'function') return null;
    return link.closest('.z-list, .z-indent, .story, .lst, .list-group, .team_story_item')
      || link.closest('div')
      || link.parentElement
      || null;
  }

  function extractTrackedWorkFromListingLink(link, baseUrl) {
    const storyId = extractListingStoryIdFromLink(link);
    if (!storyId) return null;
    const container = findListingContainer(link);
    const titleFromText = textContent(link);
    const titleFromAttr = String(link.getAttribute('title') || '').trim();
    const titleLink = (!titleFromText && !titleFromAttr && container)
      ? container.querySelector(`a[href*="/s/${storyId}/"]`)
      : null;
    const titleFromContainer = titleLink
      ? (textContent(titleLink) || String(titleLink.getAttribute('title') || '').trim())
      : '';
    const title = titleFromText || titleFromAttr || titleFromContainer || `Story ${storyId}`;
    const containerText = textContent(container);
    const perStoryContainer = link.closest('.z-list, .z-indent, .story, .lst, .list-group, .team_story_item');
    const authorLink = (perStoryContainer || container) && (perStoryContainer || container).querySelector('a[href*="/u/"]');
    let author = textContent(authorLink);
    if (!author && containerText) {
      const byMatch = containerText.match(/\bby\s+([\w][\w .'-]{1,38}?)(?=\s+\d|\s+Rated:|\s*$)/i);
      author = byMatch ? byMatch[1].trim() : '';
    }
    author = author || 'Anonymous';
    const meta = parseMetaText(containerText);
    const summary = container && Array.from(container.querySelectorAll('div, span')).map(textContent)
      .find(text => text && text.length > 24 && text !== title && text !== containerText && !/Rated:\s*Fiction/i.test(text)) || '';

    return {
      platform: 'ffnet',
      site: 'fanfiction',
      workId: buildWorkId(storyId),
      sourceId: storyId,
      title,
      author,
      authorUrl: absoluteUrl(authorLink && authorLink.getAttribute('href'), baseUrl) || null,
      url: absoluteUrl(link.getAttribute('href') || link.href, baseUrl),
      fandoms: extractFandomsFromDocument(link && link.ownerDocument),
      relationship: meta.relationship,
      summary,
      wordCount: meta.words,
      bookmarksCount: meta.favs,
      kudosCount: meta.reviews,
      hitsCount: meta.follows,
      updatedAt: meta.updatedAt,
      publishedAt: meta.publishedAt,
      completedAt: meta.completed ? (meta.updatedAt || meta.publishedAt) : null,
      inferredCompletedAt: meta.completed ? (meta.updatedAt || meta.publishedAt) : null
    };
  }

  function safeTimestamp(value, fallback) {
    if (fallback === undefined) fallback = null;
    if (value == null || value === '') return fallback;
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
    const p = Date.parse(value);
    return Number.isFinite(p) ? p : fallback;
  }

  function normalizeImportedCategory(cat) {
    if (!cat || typeof cat.name !== 'string') return null;
    const name = cat.name.trim().slice(0, 30);
    if (!name) return null;
    const color = /^#[0-9a-fA-F]{6}$/.test(cat.color || '') ? cat.color : '#6b7280';
    return {
      id: typeof cat.id === 'string' && cat.id ? cat.id : null,
      name,
      color,
      hideOnListings: cat.hideOnListings === true
    };
  }

  function csvCell(value) {
    const str = String(value || '');
    return (str.includes(',') || str.includes('"') || str.includes('\n'))
      ? `"${str.replace(/"/g, '""')}"`
      : str;
  }

  function parseCsvRecords(text) {
    const normalized = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const records = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < normalized.length; i += 1) {
      const ch = normalized[i];
      if (ch === '"') {
        current += ch;
        if (inQuotes && normalized[i + 1] === '"') { current += normalized[i + 1]; i += 1; }
        else { inQuotes = !inQuotes; }
      } else if (ch === '\n' && !inQuotes) {
        if (current.trim()) records.push(current);
        current = '';
      } else { current += ch; }
    }
    if (current.trim()) records.push(current);
    return records;
  }

  function parseCsvRow(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i += 1; }
        else { inQuotes = !inQuotes; }
      } else if (ch === ',' && !inQuotes) {
        result.push(current); current = '';
      } else { current += ch; }
    }
    result.push(current);
    return result;
  }

  const core = {
    textContent,
    absoluteUrl,
    parseNumber,
    parseDateValue,
    extractStoryIdFromUrl,
    isStoryUrl,
    buildWorkId,
    parseMetaText,
    extractWorkInfoFromDocument,
    extractListingStoryIdFromLink,
    findListingStoryLinks,
    findListingContainer,
    extractTrackedWorkFromListingLink,
    safeTimestamp,
    normalizeImportedCategory,
    csvCell,
    parseCsvRecords,
    parseCsvRow
  };

  global.AO3TrackerFfnetCore = core;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = core;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
