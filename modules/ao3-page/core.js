(function (global) {
  'use strict';

  function textOf(node) {
    if (!node) return '';
    return String(node.innerText != null ? node.innerText : (node.textContent || ''));
  }

  function trimmedTextOf(node) {
    return textOf(node).trim();
  }

  function extractWorkIdFromAo3Url(url) {
    const match = String(url || '').match(/archiveofourown\.org\/(?:collections\/[^/]+\/)?works\/(\d+)/);
    return match ? match[1] : null;
  }

  function isAo3WorkPageUrl(url) {
    return !!extractWorkIdFromAo3Url(url);
  }

  function isOrphanAccountAuthor(author, authorUrl) {
    const name = String(author || '').trim().toLowerCase();
    const url = String(authorUrl || '').toLowerCase();
    return name === 'orphan_account' || /\/users\/orphan_account(?:[/?#]|$)/.test(url);
  }

  // AO3 prints dates as YYYY-MM-DD with no time. Date.parse() treats date-only
  // ISO strings as midnight UTC, which renders one day early in local time for
  // anyone west of UTC. Construct via local Date() to anchor at local midnight.
  function parseAo3DateLocal(text) {
    const s = String(text || '').trim();
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
    const parsed = Date.parse(s);
    return Number.isFinite(parsed) ? parsed : NaN;
  }

  function detectSubscribedStateFromMarkup(markup, workId) {
    if (!markup || !workId) return null;
    try {
      const workSubRe = new RegExp(`/works/${workId}[^"'\\s>]*subscriptions`, 'i');
      if (!workSubRe.test(markup)) return null;

      const subWithIdRe = new RegExp(`/works/${workId}[^"'\\s>]*subscriptions/\\d+`, 'i');
      if (subWithIdRe.test(markup)) return true;
      if (workSubRe.test(markup)) return false;
      return null;
    } catch (e) {
      return null;
    }
  }

  function extractBlurbTextSummary(blurb) {
    const summaryEl =
      blurb.querySelector('.summary blockquote.userstuff') ||
      blurb.querySelector('.summary .userstuff') ||
      blurb.querySelector('blockquote.userstuff');
    if (!summaryEl) return '';
    return textOf(summaryEl).replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
  }

  function extractBlurbStatNumber(blurb, className) {
    const el = blurb.querySelector(`dd.${className}, li.${className}`);
    if (!el) return null;
    return parseInt(trimmedTextOf(el).replace(/,/g, ''), 10) || null;
  }

  function extractTrackedWorkFromBlurb(blurb, workId) {
    const h4 = blurb.querySelector('h4.heading, h4');
    const userLinks = h4 ? h4.querySelectorAll('a[href*="/users/"]') : [];
    const lastUserLink = userLinks.length > 0 ? userLinks[userLinks.length - 1] : null;
    const titleLink = h4 && h4.querySelector('a[href*="/works/"]');
    const fandomEls = blurb.querySelectorAll('.fandoms a.tag, .fandom.tags a.tag');
    const relationshipEl = blurb.querySelector('.relationships a.tag, .relationship.tags a.tag');

    const author = trimmedTextOf(lastUserLink || blurb.querySelector('a[href*="/users/"]')) || 'Anonymous';
    const authorUrl = lastUserLink ? lastUserLink.href || null : null;

    return {
      id: workId,
      title: trimmedTextOf(titleLink) || 'Unknown',
      author,
      authorUrl,
      isOrphaned: isOrphanAccountAuthor(author, authorUrl),
      url: `https://archiveofourown.org/works/${workId}`,
      fandoms: Array.from(fandomEls).map(el => trimmedTextOf(el)).slice(0, 3),
      relationship: trimmedTextOf(relationshipEl),
      summary: extractBlurbTextSummary(blurb),
      wordCount: extractBlurbStatNumber(blurb, 'words'),
      kudosCount: extractBlurbStatNumber(blurb, 'kudos'),
      bookmarksCount: extractBlurbStatNumber(blurb, 'bookmarks'),
      hitsCount: extractBlurbStatNumber(blurb, 'hits')
    };
  }

  function extractWorkInfoFromDocument(doc, locationHref, documentTitle) {
    const url = String(locationHref || '');
    const workId = extractWorkIdFromAo3Url(url);
    if (!workId) return null;

    const titleEl = doc.querySelector('h2.title.heading');
    const title = trimmedTextOf(titleEl) || String(documentTitle || '');
    const byline = doc.querySelector('h3.byline.heading');
    const statsRoot = doc.querySelector('dl.stats');
    const summaryEl =
      doc.querySelector('#workskin .preface.group .summary blockquote.userstuff') ||
      doc.querySelector('#chapters .preface.group .summary blockquote.userstuff') ||
      doc.querySelector('#workskin .preface.group .summary .userstuff') ||
      doc.querySelector('#chapters .preface.group .summary .userstuff');

    let author = 'Anonymous';
    let authorUrl = null;
    if (byline) {
      const relAuthor =
        byline.querySelector('a[rel~="author"]') ||
        byline.querySelector('a[rel="author"]') ||
        byline.querySelector('a[rel*="author"]');
      if (relAuthor && trimmedTextOf(relAuthor)) {
        author = trimmedTextOf(relAuthor);
        authorUrl = relAuthor.href || null;
      } else {
        const userLinks = Array.from(byline.querySelectorAll('a[href*="/users/"]'));
        if (userLinks.length) {
          let chosen = userLinks[0];
          for (const a of userLinks) {
            const prevText = (a.previousSibling && a.previousSibling.textContent) ? a.previousSibling.textContent : '';
            if (!String(prevText).toLowerCase().includes('for')) {
              chosen = a;
              break;
            }
          }
          if (trimmedTextOf(chosen)) {
            author = trimmedTextOf(chosen);
            authorUrl = chosen.href || null;
          }
        }
      }
    }

    const fandomEls = doc.querySelectorAll('.fandom.tags a.tag');
    const fandoms = Array.from(fandomEls).map(el => trimmedTextOf(el)).slice(0, 3);
    const relationshipEl = doc.querySelector('.relationship.tags a.tag');
    const relationship = trimmedTextOf(relationshipEl);
    const seriesLink =
      doc.querySelector('dd.series a[href*="/series/"]') ||
      doc.querySelector('dl.series a[href*="/series/"]') ||
      doc.querySelector('.series a[href*="/series/"]');

    let seriesTitle = '';
    let seriesUrl = null;
    let seriesPosition = '';
    if (seriesLink) {
      seriesTitle = trimmedTextOf(seriesLink);
      seriesUrl = seriesLink.href || null;
      const seriesContainer = seriesLink.closest('dd') || seriesLink.closest('li') || seriesLink.parentElement;
      const rawSeriesText = seriesContainer ? textOf(seriesContainer).replace(/\s+/g, ' ').trim() : '';
      const idx = rawSeriesText.indexOf(seriesTitle);
      if (idx !== -1) {
        const before = rawSeriesText.slice(0, idx).trim();
        const after = rawSeriesText.slice(idx + seriesTitle.length).trim();
        seriesPosition = [before, after].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
        if (/\bof\s*$/i.test(seriesPosition)) {
          seriesPosition = `${seriesPosition} ?`;
        }
      }
    }

    const wordEl = doc.querySelector('dl.stats dd.words');
    const wordCount = wordEl ? parseInt(textOf(wordEl).replace(/,/g, ''), 10) || null : null;
    const kudosEl = doc.querySelector('dl.stats dd.kudos');
    const kudosCount = kudosEl ? parseInt(textOf(kudosEl).replace(/,/g, ''), 10) || null : null;
    const bookmarksEl = doc.querySelector('dl.stats dd.bookmarks');
    const bookmarksCount = bookmarksEl ? parseInt(textOf(bookmarksEl).replace(/,/g, ''), 10) || null : null;
    const hitsEl = doc.querySelector('dl.stats dd.hits');
    const hitsCount = hitsEl ? parseInt(textOf(hitsEl).replace(/,/g, ''), 10) || null : null;

    let subscribedAtAo3 = null;
    try {
      const pageHtml = doc.documentElement && doc.documentElement.innerHTML || '';
      subscribedAtAo3 = detectSubscribedStateFromMarkup(pageHtml, workId);

      if (subscribedAtAo3 === null) {
        const forms = Array.from(doc.querySelectorAll('form[action*="subscriptions"]'));
        for (const form of forms) {
          const action = String(form.getAttribute('action') || '').toLowerCase();
          const text = trimmedTextOf(form).toLowerCase();
          const hiddenVals = Array.from(form.querySelectorAll('input[type="hidden"]'))
            .map(inp => String(inp.value || '').trim());
          const matchesWork = action.includes(`/works/${workId}`) || hiddenVals.includes(String(workId));
          if (!matchesWork) continue;
          if (/\/subscriptions\/\d+/.test(action) || text.includes('unsubscribe')) {
            subscribedAtAo3 = true;
            break;
          }
          if (action.includes('subscriptions') || text.includes('subscribe')) {
            subscribedAtAo3 = false;
            break;
          }
        }
      }
    } catch (e) {
      subscribedAtAo3 = null;
    }

    let updatedAt = null;
    let completedAt = null;
    let publishedAt = null;
    let chaptersCurrent = null;
    let chaptersTotal = null;
    let isComplete = null;

    const dtEls = doc.querySelectorAll('dl.stats dt');
    dtEls.forEach(dt => {
      const key = trimmedTextOf(dt).toLowerCase();
      if (key.startsWith('updated')) {
        const dd = dt.nextElementSibling;
        if (dd) {
          const parsed = parseAo3DateLocal(trimmedTextOf(dd));
          if (!isNaN(parsed)) updatedAt = parsed;
        }
      }
      if (key.startsWith('completed')) {
        const dd = dt.nextElementSibling;
        if (dd) {
          const parsed = parseAo3DateLocal(trimmedTextOf(dd));
          if (!isNaN(parsed)) completedAt = parsed;
        }
      }
      if (key.startsWith('published') || key.startsWith('posted')) {
        const dd = dt.nextElementSibling;
        if (dd) {
          const parsed = parseAo3DateLocal(trimmedTextOf(dd));
          if (!isNaN(parsed)) publishedAt = parsed;
        }
      }
      if (key.startsWith('chapters')) {
        const dd = dt.nextElementSibling;
        if (dd) {
          const raw = trimmedTextOf(dd);
          const match = raw.match(/(\d+)\s*\/\s*(\d+|\?)/);
          if (match) {
            chaptersCurrent = parseInt(match[1], 10);
            chaptersTotal = match[2] === '?' ? null : parseInt(match[2], 10);
            isComplete = (chaptersTotal != null && chaptersCurrent === chaptersTotal);
          }
        }
      }
    });

    const inferredCompletedAt = (!completedAt && isComplete && publishedAt) ? publishedAt : null;
    const canSyncIdentity = !!(titleEl && trimmedTextOf(titleEl) && (byline || statsRoot));
    const summary = summaryEl
      ? textOf(summaryEl).replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim()
      : null;

    return {
      workId,
      title,
      author,
      authorUrl,
      isOrphaned: isOrphanAccountAuthor(author, authorUrl),
      canSyncIdentity,
      summary,
      fandoms,
      relationship,
      seriesTitle,
      seriesUrl,
      seriesPosition,
      url: `https://archiveofourown.org/works/${workId}`,
      wordCount,
      kudosCount,
      bookmarksCount,
      hitsCount,
      updatedAt,
      completedAt,
      publishedAt,
      inferredCompletedAt,
      chaptersCurrent,
      chaptersTotal,
      isComplete,
      subscribedAtAo3
    };
  }

  const core = {
    extractWorkIdFromAo3Url,
    isAo3WorkPageUrl,
    isOrphanAccountAuthor,
    detectSubscribedStateFromMarkup,
    extractBlurbTextSummary,
    extractBlurbStatNumber,
    extractTrackedWorkFromBlurb,
    extractWorkInfoFromDocument,
    parseAo3DateLocal
  };

  global.AO3TrackerAo3PageCore = core;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = core;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
