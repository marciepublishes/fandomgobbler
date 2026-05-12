(function (global) {
  'use strict';

  const Core = global.AO3TrackerListingBadgeCore || {};
  const HiddenRulesCore = global.AO3TrackerHiddenRulesCore || {};
  const HIDDEN_EYE_ICON = '<svg class="fg-hide-menu-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M3 3l18 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M10.7 5.16A10.27 10.27 0 0 1 12 5c5.5 0 9 5.25 9 7 0 1.02-1.18 3.18-3.25 4.9" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="3.05" stroke="currentColor" stroke-width="2.1"/><circle cx="12" cy="12" r="1.15" fill="currentColor"/><path d="M6.53 6.8C4.28 8.42 3 10.82 3 12c0 1.75 3.5 7 9 7 1.54 0 2.92-.41 4.12-1.04" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  let _deps = null;
  const _pageState = { revealAllHidden: false };

  function getStatusOptions() {
    return Core.STATUS_OPTIONS || [
      { s: 'want', l: 'For Later' },
      { s: 'progress', l: 'Reading' },
      { s: 'completed', l: 'Completed' },
      { s: 'rereading', l: 'Re-reading' },
      { s: 'onhold', l: 'On Hold' },
      { s: 'dnf', l: 'Did Not Finish' }
    ];
  }

  function getStatusLabels() {
    return Core.STATUS_LABELS || {
      want: 'For Later',
      progress: 'Reading',
      completed: 'Completed',
      rereading: 'Re-reading',
      onhold: 'On Hold',
      dnf: 'Did Not Finish'
    };
  }

  function truncateTitle(title, max) {
    const text = String(title || 'This work');
    return text.length > max ? `${text.slice(0, max - 1)}\u2026` : text;
  }

  function trimNodeText(node) {
    return String(node?.textContent || '').trim().replace(/\s+/g, ' ');
  }

  function ensureDropdownDismissListener(doc) {
    if (!doc || doc._ao3BadgeDropdownListener) return;
    doc._ao3BadgeDropdownListener = true;
    doc.addEventListener('click', () => {
      doc.querySelectorAll('.ao3t-badge-dropdown.open').forEach(dropdown => {
        dropdown.classList.remove('open');
        const trigger = dropdown.parentElement?.querySelector('.fg-hide-menu-trigger[aria-expanded="true"]');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  function insertListingControl(blurb, element) {
    const heading = blurb.querySelector('h4.heading, h4');
    const userLinks = heading && heading.querySelectorAll('a[href*="/users/"]');
    const lastUserLink = userLinks && userLinks.length > 0 ? userLinks[userLinks.length - 1] : null;
    const titleLink = heading && heading.querySelector('a[href*="/works/"]');

    if (lastUserLink) {
      lastUserLink.insertAdjacentElement('afterend', element);
    } else if (titleLink) {
      titleLink.insertAdjacentElement('afterend', element);
    } else if (heading) {
      heading.appendChild(element);
    } else {
      blurb.prepend(element);
    }
  }

  function insertSecondaryListingControl(blurb, element) {
    const existingPrimary = blurb.querySelector('.ao3t-track-wrap, .ao3t-badge-wrap');
    if (existingPrimary) {
      existingPrimary.insertAdjacentElement('afterend', element);
      return;
    }
    insertListingControl(blurb, element);
  }

  function hasListingTrackControl(blurb) {
    return !!blurb?.querySelector?.('.ao3t-track-wrap:not(.fg-hide-menu-wrap)');
  }

  function buildTrackWrapper(blurb, workId, listingInfo, allCats, deps) {
    const {
      document,
      getWorks,
      setWorks,
      renderSidebar,
      nextFinishedAt,
      showMiniToast,
      esc
    } = deps;

    const workTitle = listingInfo.title || 'This work';
    const pill = document.createElement('span');
    pill.className = 'ao3t-track-pill';
    pill.innerHTML = '<svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 13.5C8 13.5 3 11 1.5 11V3C3 3 8 5.5 8 5.5C8 5.5 13 3 14.5 3V11C13 11 8 13.5 8 13.5Z"/><line x1="8" y1="5.5" x2="8" y2="13.5"/></svg> Track';

    const dropdown = document.createElement('div');
    dropdown.className = 'ao3t-badge-dropdown ao3t-track-dropdown';

    const wrapper = document.createElement('span');
    wrapper.className = 'ao3t-track-wrap';
    wrapper.appendChild(pill);
    wrapper.appendChild(dropdown);

    function buildTrackDropdown() {
      dropdown.innerHTML = '';

      getStatusOptions().forEach(({ s, l }) => {
        const button = document.createElement('button');
        button.className = 'ao3t-badge-opt';
        button.textContent = l;
        button.addEventListener('click', event => {
          event.stopPropagation();
          event.preventDefault();
          dropdown.classList.remove('open');
          getWorks(works => {
            works[workId] = {
              ...listingInfo,
              status: s,
              finishedAt: nextFinishedAt('', s, null),
              addedAt: Date.now(),
              movedAt: Date.now()
            };
            setWorks(works, () => {
              showMiniToast(`Added "${truncateTitle(workTitle, 30)}" to ${l}!`);
              renderSidebar();
            });
          });
        });
        dropdown.appendChild(button);
      });

      const customCategories = Object.values(allCats || {});
      if (customCategories.length > 0) {
        const divider = document.createElement('div');
        divider.className = 'ao3t-badge-divider';
        dropdown.appendChild(divider);
        const catScroll = document.createElement('div');
        catScroll.className = 'aot-cat-scroll-wrap';
        dropdown.appendChild(catScroll);

        customCategories.forEach(cat => {
          const button = document.createElement('button');
          button.className = 'ao3t-badge-opt ao3t-badge-cat-opt';
          button.innerHTML = `<span class="ao3t-bd-cat-dot" style="--ao3t-dot-color:${esc(cat.color)};background-color:${esc(cat.color)};color:${esc(cat.color)}"></span>${esc(cat.name)}`;
          button.addEventListener('click', event => {
            event.stopPropagation();
            event.preventDefault();
            dropdown.classList.remove('open');
            getWorks(works => {
              works[workId] = {
                ...listingInfo,
                status: '',
                finishedAt: null,
                customCats: [cat.id],
                addedAt: Date.now(),
                movedAt: Date.now()
              };
              setWorks(works, () => {
                showMiniToast(`Added to ${cat.name}!`);
                renderSidebar();
              });
            });
          });
          catScroll.appendChild(button);
        });
      }
    }

    pill.addEventListener('click', event => {
      event.stopPropagation();
      event.preventDefault();
      const isOpen = dropdown.classList.contains('open');
      document.querySelectorAll('.ao3t-badge-dropdown.open').forEach(openDropdown => openDropdown.classList.remove('open'));
      if (!isOpen) {
        buildTrackDropdown();
        dropdown.classList.add('open');
      }
    });

    insertListingControl(blurb, wrapper);
  }

  function buildCustomCatsStateKey(work, allCats) {
    return Array.isArray(work && work.customCats) && work.customCats.length
      ? work.customCats
        .sort()
        .map(catId => {
          const cat = allCats && allCats[catId];
          return `${catId}:${cat && cat.hideOnListings ? 'hidden' : 'visible'}`;
        })
        .join(',')
      : '';
  }

  function buildHiddenReasonStateKey(match) {
    return Array.isArray(match?.reasons)
      ? match.reasons.map(reason => `${reason.type}:${reason.label}`).sort().join('|')
      : '';
  }

  function buildTrackedBadgeWrapper(blurb, workId, work, allCats, hiddenRuleMatch, deps) {
    const {
      document,
      getWorks,
      setWorks,
      renderSidebar,
      normalizeStatusValue,
      nextFinishedAt,
      hasCustomCategories,
      pruneTrackedWorkIfInvalid,
      applyRereadingChapterResetIfNeeded,
      showMiniToast,
      esc,
      window
    } = deps;

    const labels = getStatusLabels();
    const normalizedStatus = normalizeStatusValue(work.status);
    const label = typeof Core.getListingStatusLabel === 'function'
      ? Core.getListingStatusLabel(normalizedStatus)
      : (labels[normalizedStatus] || 'Tracked');

    const wrapper = document.createElement('span');
    wrapper.className = 'ao3t-badge-wrap';

    const badgeDataset = typeof Core.buildListingBadgeDataset === 'function'
      ? Core.buildListingBadgeDataset(workId, work, normalizeStatusValue)
      : null;
    wrapper.dataset.workId = badgeDataset?.workId || String(workId);
    wrapper.dataset.status = badgeDataset?.status ?? normalizedStatus;
    wrapper.dataset.rating = badgeDataset?.rating ?? String(work.rating || '');
    wrapper.dataset.chap = badgeDataset?.chap ?? String((work.furthestChapter && normalizedStatus !== 'completed' && work.furthestChapter.num) || '');
    wrapper.dataset.customCats = buildCustomCatsStateKey(work, allCats);
    wrapper.dataset.hiddenMatch = buildHiddenReasonStateKey(hiddenRuleMatch);

    const badge = document.createElement('span');
    badge.className = normalizedStatus ? `ao3t-search-badge ao3t-search-badge-${normalizedStatus}` : 'ao3t-search-badge';
    badge.textContent = typeof Core.buildListingBadgeText === 'function'
      ? Core.buildListingBadgeText(normalizedStatus)
      : `${label} \u25BE`;

    const dropdown = document.createElement('div');
    dropdown.className = 'ao3t-badge-dropdown';

    getStatusOptions().forEach(({ s, l }) => {
      const button = document.createElement('button');
      button.className = 'ao3t-badge-opt' + (s === normalizedStatus ? ' ao3t-badge-opt-active' : '');
      button.textContent = l;
      button.addEventListener('click', event => {
        event.stopPropagation();
        event.preventDefault();
        dropdown.classList.remove('open');
        getWorks(works => {
          if (!works[workId]) return;
          const oldStatus = works[workId].status;
          const workTitle = works[workId].title || 'This work';
          const normalizedOldStatus = normalizeStatusValue(oldStatus);
          const isTogglingOff = normalizedOldStatus === s;
          const wouldBeUntracked = isTogglingOff && !hasCustomCategories(works[workId]);
          if (wouldBeUntracked && !window.confirm('Removing this status will remove the work from tracking entirely. Continue?')) return;

          works[workId].status = isTogglingOff ? '' : s;
          works[workId].finishedAt = nextFinishedAt(oldStatus, works[workId].status, works[workId].finishedAt);
          works[workId].movedAt = Date.now();
          const removedWork = isTogglingOff ? pruneTrackedWorkIfInvalid(works, workId) : false;
          const shortTitle = truncateTitle(workTitle, 40);

          const finishUpdate = () => {
            if (removedWork) showMiniToast('Removed from tracker');
            else if (isTogglingOff) showMiniToast(`"${shortTitle}" removed from ${labels[s]}`);
            else {
              const priorLabel = labels[normalizeStatusValue(oldStatus)] || 'Tracked';
              showMiniToast(`"${shortTitle}" moved from ${priorLabel} -> ${labels[s]}`);
            }
            renderSidebar();
          };

          if (!isTogglingOff && s === 'rereading' && oldStatus !== 'rereading' && works[workId].furthestChapter) {
            applyRereadingChapterResetIfNeeded(oldStatus, s, works[workId], () => setWorks(works, finishUpdate));
          } else {
            setWorks(works, finishUpdate);
          }
        });
      });
      dropdown.appendChild(button);
    });

    const customCategories = Object.values(allCats || {});
    if (customCategories.length > 0) {
      const divider = document.createElement('div');
      divider.className = 'ao3t-badge-divider';
      dropdown.appendChild(divider);
      const catScroll = document.createElement('div');
      catScroll.className = 'aot-cat-scroll-wrap';
      dropdown.appendChild(catScroll);

      customCategories.forEach(cat => {
        const button = document.createElement('button');
        const isChecked = (work.customCats || []).includes(cat.id);
        button.className = 'ao3t-badge-opt ao3t-badge-cat-opt' + (isChecked ? ' ao3t-badge-cat-checked' : '');
        button.innerHTML = `<span class="ao3t-bd-cat-check">${isChecked ? '\u2713' : ''}</span><svg class="ao3t-bd-cat-dot" viewBox="0 0 8 8" aria-hidden="true"><circle cx="4" cy="4" r="3.25" fill="${esc(cat.color)}"></circle></svg>${esc(cat.name)}`;
        button.addEventListener('click', event => {
          event.stopPropagation();
          event.preventDefault();
          dropdown.classList.remove('open');
          getWorks(works => {
            if (!works[workId]) return;
            const currentCategories = works[workId].customCats || [];
            const wasChecked = currentCategories.includes(cat.id);
            const currentStatus = normalizeStatusValue(works[workId].status);
            const nextCategories = wasChecked
              ? currentCategories.filter(id => id !== cat.id)
              : [...currentCategories, cat.id];
            const wouldBeUntracked = wasChecked && !currentStatus && nextCategories.length === 0;
            if (wouldBeUntracked && !window.confirm('Removing this category will remove the work from tracking entirely. Continue?')) return;

            works[workId].customCats = nextCategories;
            const removedWork = pruneTrackedWorkIfInvalid(works, workId);
            setWorks(works, () => {
              showMiniToast(removedWork ? 'Removed from tracker' : (wasChecked ? `Removed from ${cat.name}` : `Added to ${cat.name}!`));
              renderSidebar();
            });
          });
        });
        catScroll.appendChild(button);
      });
    }

    badge.addEventListener('click', event => {
      event.stopPropagation();
      event.preventDefault();
      const isOpen = dropdown.classList.contains('open');
      document.querySelectorAll('.ao3t-badge-dropdown.open').forEach(openDropdown => openDropdown.classList.remove('open'));
      if (!isOpen) dropdown.classList.add('open');
    });

    const filledSvg = '<svg class="ao3t-star-svg ao3t-star-filled" viewBox="0 0 16 16" fill="#f59e0b" xmlns="http://www.w3.org/2000/svg"><polygon points="8,1.5 10,6 15,6.5 11.5,10 12.5,15 8,12.5 3.5,15 4.5,10 1,6.5 6,6"/></svg>';
    const emptySvg = '<svg class="ao3t-star-svg ao3t-star-empty" viewBox="0 0 16 16" fill="none" stroke="#d1d5db" stroke-width="1.3" xmlns="http://www.w3.org/2000/svg"><polygon points="8,1.5 10,6 15,6.5 11.5,10 12.5,15 8,12.5 3.5,15 4.5,10 1,6.5 6,6"/></svg>';

    wrapper.appendChild(badge);

    if (hiddenRuleMatch?.reasons?.length) {
      const hiddenBadge = document.createElement('span');
      hiddenBadge.className = 'ao3t-search-badge fg-hidden-match-badge';
      hiddenBadge.textContent = 'Matches hidden';
      hiddenBadge.title = hiddenRuleMatch.reasons.map(reason => reason.label).join(', ');
      wrapper.appendChild(hiddenBadge);
    }

    (work.customCats || []).forEach(catId => {
      const cat = allCats[catId];
      if (!cat || cat.hideOnListings) return;
      const pill = document.createElement('span');
      pill.className = 'aot-custom-chip ao3t-search-custom-chip';
      pill.style.setProperty('--chip-color', cat.color);
      pill.textContent = cat.name;
      wrapper.appendChild(pill);
    });

    const chapterMeta = typeof Core.getListingChapterProgressMeta === 'function'
      ? Core.getListingChapterProgressMeta(workId, work, normalizeStatusValue)
      : null;
    if (chapterMeta) {
      const chapterLink = document.createElement('a');
      chapterLink.className = 'ao3t-search-chap';
      chapterLink.textContent = chapterMeta.label;
      chapterLink.href = chapterMeta.href;
      chapterLink.target = '_blank';
      chapterLink.rel = 'noopener noreferrer';
      wrapper.appendChild(chapterLink);
    }

    if (work.rating) {
      const stars = document.createElement('span');
      stars.className = 'ao3t-search-stars';
      stars.innerHTML = filledSvg.repeat(work.rating) + emptySvg.repeat(5 - work.rating);
      wrapper.appendChild(stars);
    }

    wrapper.appendChild(dropdown);
    insertListingControl(blurb, wrapper);
  }

  function shouldApplyHiddenRulesOnPage(url) {
    const href = String(url || '');
    if (!href || /archiveofourown\.org\/(?:collections\/[^/]+\/)?works\/\d+/i.test(href)) return false;
    return /archiveofourown\.org\/(?:works(?:\?|$)|works\/search|tags\/.+\/works|users\/[^/?#]+(?:\/(?:pseuds\/[^/?#]+|works|bookmarks))?(?:[/?#]|$)|series\/\d+|collections\/[^/]+(?:\/works)?)/i.test(href);
  }

  function extractListingRuleInfo(blurb, workId, extractTrackedWorkFromBlurb) {
    const listingInfo = typeof extractTrackedWorkFromBlurb === 'function'
      ? extractTrackedWorkFromBlurb(blurb, workId)
      : { id: workId, title: '', author: 'Anonymous', authorUrl: null };
    const authorLinks = Array.from(blurb.querySelectorAll('h4.heading a[href*="/users/"], h4 a[href*="/users/"]'));
    const authors = authorLinks.length
      ? authorLinks.map(link => ({ name: trimNodeText(link), url: link.href || '' })).filter(author => author.name)
      : [{ name: listingInfo.author || 'Anonymous', url: listingInfo.authorUrl || '' }];
    const relationships = Array.from(blurb.querySelectorAll('.relationships a.tag, .relationship.tags a.tag')).map(trimNodeText).filter(Boolean);
    const freeforms = Array.from(blurb.querySelectorAll('.freeforms a.tag, .freeform.tags a.tag')).map(trimNodeText).filter(Boolean);
    const fandoms = Array.from(blurb.querySelectorAll('.fandoms a.tag, .fandom.tags a.tag')).map(trimNodeText).filter(Boolean);
    const language = trimNodeText(blurb.querySelector('dd.language, li.language'));
    return {
      listingInfo,
      authors,
      relationships,
      freeforms,
      fandoms,
      fandomCount: fandoms.length,
      language
    };
  }

  function reasonSummary(reasons, showReasons) {
    if (!Array.isArray(reasons) || !reasons.length) return 'Hidden due to tag rule.';
    if (showReasons === false) return `Hidden due to ${reasons.length} rule${reasons.length !== 1 ? 's' : ''}.`;
    const labels = reasons.map(reason => reason.label);
    if (labels.length <= 3) return `Hidden due to: ${labels.join(', ')}`;
    return `Hidden due to: ${labels.slice(0, 3).join(', ')} +${labels.length - 3} more`;
  }

  function restoreBlurbChildren(blurb) {
    Array.from(blurb.children).forEach(child => {
      if (child.classList?.contains('fg-hidden-work-stub')) return;
      if (child.dataset?.fgHiddenChild === '1') {
        child.hidden = false;
        delete child.dataset.fgHiddenChild;
      }
    });
    blurb.classList.remove('fg-hidden-work');
    blurb.dataset.fgHiddenCollapsed = '0';
  }

  function applyCollapsedStub(blurb, info, hiddenMatch, prefs) {
    restoreBlurbChildren(blurb);
    let stub = blurb.querySelector('.fg-hidden-work-stub');
    const tagsWereShowing = blurb.dataset.fgHiddenTagsShown === '1';
    if (!stub) {
      stub = blurb.ownerDocument.createElement('div');
      stub.className = 'fg-hidden-work-stub';
      blurb.prepend(stub);
    }
    stub.innerHTML = '';
    const doc = blurb.ownerDocument;

    // Status text — always brief count, never the tag names here
    const summary = doc.createElement('span');
    summary.className = 'fg-hidden-work-text';
    summary.textContent = reasonSummary(hiddenMatch.reasons, false);
    stub.appendChild(summary);

    // Show Work — temporarily expands the collapsed blurb
    const showButton = doc.createElement('button');
    showButton.type = 'button';
    showButton.className = 'fg-hidden-work-btn';
    showButton.textContent = 'Show Work';
    showButton.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      blurb.dataset.fgManualReveal = '1';
      restoreBlurbChildren(blurb);
      stub.remove();

      if (!blurb.querySelector('.fg-rehide-bar')) {
        const rehideBar = doc.createElement('div');
        rehideBar.className = 'fg-rehide-bar';
        const rehideBtn = doc.createElement('button');
        rehideBtn.type = 'button';
        rehideBtn.className = 'fg-hidden-work-btn';
        rehideBtn.textContent = 'Hide Work';
        rehideBtn.addEventListener('click', ev => {
          ev.preventDefault();
          ev.stopPropagation();
          delete blurb.dataset.fgManualReveal;
          rehideBar.remove();
          applyCollapsedStub(blurb, info, hiddenMatch, prefs);
        });
        rehideBar.appendChild(rehideBtn);
        blurb.prepend(rehideBar);
      }
    });
    stub.appendChild(showButton);

    // Open Work — navigates to the work in a new tab
    if (info.listingInfo?.url) {
      const openLink = doc.createElement('a');
      openLink.className = 'fg-hidden-work-btn fg-hidden-work-link';
      openLink.href = info.listingInfo.url;
      openLink.target = '_blank';
      openLink.rel = 'noopener noreferrer';
      openLink.textContent = 'Open Work';
      stub.appendChild(openLink);
    }

    // Show Hidden Tags — inline toggle revealing the actual rule/tag values
    const hasReasons = Array.isArray(hiddenMatch.reasons) && hiddenMatch.reasons.length > 0;
    if (hasReasons) {
      // Tag pills row — starts hidden
      const tagsRow = doc.createElement('div');
      tagsRow.className = 'fg-hidden-stub-tags';
      tagsRow.hidden = !tagsWereShowing;
      hiddenMatch.reasons.forEach(reason => {
        const pill = doc.createElement('span');
        pill.className = 'fg-hidden-tag-pill';
        pill.textContent = reason.label;
        tagsRow.appendChild(pill);
      });

      const tagsBtn = doc.createElement('button');
      tagsBtn.type = 'button';
      tagsBtn.className = 'fg-hidden-work-btn';
      tagsBtn.textContent = tagsWereShowing ? 'Hide Tags' : 'Show Hidden Tags';
      tagsBtn.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        const isHidden = tagsRow.hidden;
        tagsRow.hidden = !isHidden;
        blurb.dataset.fgHiddenTagsShown = isHidden ? '1' : '0';
        tagsBtn.textContent = isHidden ? 'Hide Tags' : 'Show Hidden Tags';
      });

      stub.appendChild(tagsBtn);
      stub.appendChild(tagsRow);
    }

    Array.from(blurb.children).forEach(child => {
      if (child === stub) return;
      child.hidden = true;
      child.dataset.fgHiddenChild = '1';
    });
    blurb.classList.add('fg-hidden-work');
    blurb.dataset.fgHiddenCollapsed = '1';
  }

  function ensureHiddenToolbar(document, firstBlurb, hiddenCount, hideableCount) {
    const existing = document.getElementById('fg-hidden-rule-toolbar');
    if (!firstBlurb || !hideableCount) {
      existing?.remove();
      return;
    }
    const parent = firstBlurb.parentElement;
    if (!parent) return;
    const toolbar = existing || document.createElement('div');
    toolbar.id = 'fg-hidden-rule-toolbar';
    toolbar.className = 'fg-hidden-rule-toolbar';
    toolbar.innerHTML = '';

    const summary = document.createElement('span');
    summary.className = 'fg-hidden-rule-toolbar-text';
    summary.textContent = _pageState.revealAllHidden
      ? `${hideableCount} work${hideableCount !== 1 ? 's' : ''} hidden (shown)`
      : `${hiddenCount} work${hiddenCount !== 1 ? 's' : ''} collapsed`;
    toolbar.appendChild(summary);

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'fg-hidden-rule-toolbar-btn';
    toggle.textContent = _pageState.revealAllHidden ? 'Hide all hidden' : 'Show all hidden';
    toggle.addEventListener('click', () => {
      _pageState.revealAllHidden = !_pageState.revealAllHidden;
      injectSearchBadges();
    });
    toolbar.appendChild(toggle);

    if (!existing) parent.insertAdjacentElement('beforebegin', toolbar);
  }

  function ensureInlineStyles(document) {
    if (!document || document.getElementById('fg-hidden-rule-styles')) return;
    const style = document.createElement('style');
    style.id = 'fg-hidden-rule-styles';
    style.textContent = `
      .fg-hide-menu-wrap,
      .fg-hidden-work-stub,
      .fg-hidden-rule-toolbar,
      .fg-rehide-bar {
        box-sizing: border-box !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
        letter-spacing: 0 !important;
        text-transform: none !important;
      }
      .fg-hidden-work-stub *,
      .fg-hidden-rule-toolbar *,
      .fg-hide-menu-wrap *,
      .fg-rehide-bar * {
        box-sizing: border-box !important;
        letter-spacing: 0 !important;
        text-transform: none !important;
      }
      .fg-hidden-work-stub,
      .fg-hidden-rule-toolbar {
        --fg-hidden-surface: rgba(241, 245, 249, 0.9);
        --fg-hidden-border: rgba(88, 99, 117, 0.22);
        --fg-hidden-text: #334155;
        --fg-hidden-text-strong: #334155;
        --fg-hidden-btn-surface: #fff;
        --fg-hidden-btn-border: rgba(100, 116, 139, 0.34);
        --fg-hidden-btn-text: #1d4ed8;
        --fg-hidden-btn-hover-surface: #f1f5f9;
        --fg-hidden-btn-hover-text: #334155;
        --fg-hidden-tags-border: rgba(88, 99, 117, 0.18);
        --fg-hidden-pill-surface: rgba(59, 130, 246, 0.07);
        --fg-hidden-pill-border: rgba(59, 130, 246, 0.2);
        --fg-hidden-pill-text: #1d4ed8;
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        flex-wrap: wrap !important;
        margin: 8px 0 !important;
        padding: 8px 10px !important;
        border: 1px solid var(--fg-hidden-border) !important;
        border-radius: 10px !important;
        background: var(--fg-hidden-surface) !important;
        font-size: 12px !important;
        line-height: 1.45 !important;
        color: var(--fg-hidden-text) !important;
      }
      .fg-hide-menu-wrap,
      .fg-hide-menu-dropdown {
        --fg-hidden-btn-surface: #fff;
        --fg-hidden-btn-border: rgba(100, 116, 139, 0.34);
        --fg-hidden-btn-text: #1d4ed8;
        --fg-hidden-btn-hover-surface: #f1f5f9;
        --fg-hidden-btn-hover-text: #334155;
      }
      .fg-hidden-work-text,
      .fg-hidden-rule-toolbar-text {
        font-size: 12px !important;
        line-height: 1.45 !important;
        font-weight: 600 !important;
        color: var(--fg-hidden-text-strong) !important;
      }
      .fg-hidden-work-btn,
      .fg-hidden-rule-toolbar-btn,
      .fg-hide-rule-btn,
      .fg-hide-menu-trigger {
        all: unset !important;
        box-sizing: border-box !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        border: 1px solid var(--fg-hidden-btn-border) !important;
        background: var(--fg-hidden-btn-surface) !important;
        color: var(--fg-hidden-btn-text) !important;
        border-radius: 999px !important;
        padding: 1px 7px !important;
        height: 18px !important;
        min-height: 18px !important;
        cursor: pointer !important;
        text-decoration: none !important;
        white-space: nowrap !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
        font-size: 11px !important;
        font-weight: 600 !important;
        line-height: 1.55 !important;
        vertical-align: middle !important;
      }
      .fg-hidden-stub-tags {
        flex-basis: 100% !important;
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 4px !important;
        padding-top: 6px !important;
        border-top: 1px solid var(--fg-hidden-tags-border) !important;
        margin-top: 2px !important;
      }
      .fg-hidden-stub-tags[hidden] {
        display: none !important;
      }
      .fg-hidden-tag-pill {
        display: inline-flex !important;
        align-items: center !important;
        background: var(--fg-hidden-pill-surface) !important;
        border: 1px solid var(--fg-hidden-pill-border) !important;
        color: var(--fg-hidden-pill-text) !important;
        border-radius: 999px !important;
        padding: 1px 8px !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
        font-size: 11px !important;
        line-height: 1.55 !important;
        white-space: nowrap !important;
      }
      .fg-hide-rule-btn {
        margin-left: 4px !important;
      }
      .fg-hide-menu-wrap {
        display: inline-flex !important;
        align-items: center !important;
        vertical-align: middle !important;
      }
      .ao3t-track-pill.fg-hide-menu-trigger {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        color: var(--fg-hidden-btn-text) !important;
        border: 1px solid var(--fg-hidden-btn-border) !important;
        border-style: solid !important;
        border-width: 1px !important;
        background: var(--fg-hidden-btn-surface) !important;
        gap: 0 !important;
        height: 20.85px !important;
        min-height: 20.85px !important;
        max-height: 20.85px !important;
        padding: 0 6px !important;
        border-radius: 8px !important;
        line-height: 1 !important;
        box-shadow: inset 0 0 0 1px rgba(255,255,255,0.04) !important;
      }
      .ao3t-track-pill.fg-hide-menu-trigger:hover {
        background: var(--fg-hidden-btn-hover-surface) !important;
        color: var(--fg-hidden-btn-hover-text) !important;
      }
      .fg-hide-menu-icon {
        display: block !important;
        width: 12px !important;
        height: 12px !important;
        flex: 0 0 auto !important;
        opacity: 0.9 !important;
        overflow: visible !important;
      }
      .fg-hidden-work-link {
        text-decoration: none !important;
      }
      .fg-hidden-match-badge {
        display: inline-flex !important;
        align-items: center !important;
        color: #475569 !important;
        background: #f8fafc !important;
        border: 1px solid rgba(148, 163, 184, 0.35) !important;
      }
      .fg-rehide-bar {
        display: flex !important;
        align-items: center !important;
        margin-bottom: 6px !important;
      }
      .fg-hide-menu-dropdown {
        position: absolute !important;
        z-index: 1002 !important;
        max-height: 220px !important;
        overflow-y: auto !important;
        overscroll-behavior: contain !important;
        scrollbar-width: thin !important;
      }
      .fg-hide-menu-dropdown .ao3t-badge-opt {
        all: unset !important;
        box-sizing: border-box !important;
        display: block !important;
        width: 100% !important;
        padding: 8px 13px !important;
        background: transparent !important;
        color: inherit !important;
        text-align: left !important;
        cursor: pointer !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
        font-size: 13px !important;
        font-weight: 500 !important;
        line-height: 1.4 !important;
        white-space: normal !important;
      }
      .fg-hide-menu-dropdown .ao3t-badge-opt.ao3t-badge-opt-active {
        font-weight: 700 !important;
      }

      /* ── Solarized Light theme ─────────────────────────────────────────── */
      html[data-ao3-sol-light="1"] .fg-hidden-work-stub,
      html[data-ao3-sol-light="1"] .fg-hidden-rule-toolbar,
      body[data-ao3-sol-light="1"] .fg-hidden-work-stub,
      body[data-ao3-sol-light="1"] .fg-hidden-rule-toolbar {
        --fg-hidden-surface: rgba(238, 232, 213, 0.95);
        --fg-hidden-border: rgba(88, 110, 117, 0.28);
        --fg-hidden-text: #586e75;
        --fg-hidden-text-strong: #073642;
        --fg-hidden-btn-surface: #fdf6e3;
        --fg-hidden-btn-border: rgba(88, 110, 117, 0.32);
        --fg-hidden-btn-text: #268bd2;
        --fg-hidden-btn-hover-surface: rgba(88, 110, 117, 0.1);
        --fg-hidden-btn-hover-text: #073642;
        --fg-hidden-tags-border: rgba(88, 110, 117, 0.22);
        --fg-hidden-pill-surface: rgba(38, 139, 210, 0.1);
        --fg-hidden-pill-border: rgba(38, 139, 210, 0.28);
        --fg-hidden-pill-text: #268bd2;
      }
      html[data-ao3-sol-light="1"] .fg-hide-menu-wrap,
      html[data-ao3-sol-light="1"] .fg-hide-menu-dropdown,
      body[data-ao3-sol-light="1"] .fg-hide-menu-wrap,
      body[data-ao3-sol-light="1"] .fg-hide-menu-dropdown {
        --fg-hidden-btn-surface: #fdf6e3;
        --fg-hidden-btn-border: rgba(88, 110, 117, 0.32);
        --fg-hidden-btn-text: #268bd2;
        --fg-hidden-btn-hover-surface: rgba(88, 110, 117, 0.1);
        --fg-hidden-btn-hover-text: #073642;
      }

      /* ── Solarized Dark theme ──────────────────────────────────────────── */
      html[data-ao3-dark="1"] .fg-hidden-work-stub,
      html[data-ao3-dark="1"] .fg-hidden-rule-toolbar,
      body[data-ao3-dark="1"] .fg-hidden-work-stub,
      body[data-ao3-dark="1"] .fg-hidden-rule-toolbar {
        --fg-hidden-surface: #073642;
        --fg-hidden-border: rgba(131, 148, 150, 0.22);
        --fg-hidden-text: #839496;
        --fg-hidden-text-strong: #93a1a1;
        --fg-hidden-btn-surface: rgba(0, 43, 54, 0.75);
        --fg-hidden-btn-border: rgba(131, 148, 150, 0.24);
        --fg-hidden-btn-text: #268bd2;
        --fg-hidden-btn-hover-surface: rgba(0, 43, 54, 0.95);
        --fg-hidden-btn-hover-text: #2aa198;
        --fg-hidden-tags-border: rgba(131, 148, 150, 0.2);
        --fg-hidden-pill-surface: rgba(38, 139, 210, 0.12);
        --fg-hidden-pill-border: rgba(38, 139, 210, 0.28);
        --fg-hidden-pill-text: #268bd2;
      }
      html[data-ao3-dark="1"] .fg-hide-menu-wrap,
      html[data-ao3-dark="1"] .fg-hide-menu-dropdown,
      body[data-ao3-dark="1"] .fg-hide-menu-wrap,
      body[data-ao3-dark="1"] .fg-hide-menu-dropdown {
        --fg-hidden-btn-surface: transparent;
        --fg-hidden-btn-border: rgba(131, 148, 150, 0.24);
        --fg-hidden-btn-text: #268bd2;
        --fg-hidden-btn-hover-surface: rgba(0, 43, 54, 0.95);
        --fg-hidden-btn-hover-text: #2aa198;
      }
    `;
    document.head.appendChild(style);
  }

  function findMatchingHiddenRuleId(ruleInput, rulesMap) {
    const rulesArr = Object.values(rulesMap || {});
    if (!rulesArr.length) return '';
    const rule = HiddenRulesCore.sanitizeRule?.(ruleInput);
    if (!rule) return '';
    const match = rulesArr.find(existing => {
      if (!existing || existing.type !== rule.type) return false;
      if (rule.type === 'crossover') return true;
      return (existing.authorUrl || existing.normalizedValue) === (rule.authorUrl || rule.normalizedValue);
    });
    return match?.id || '';
  }

  function addHiddenRule(ruleInput, deps, labelText) {
    deps.getHiddenRules(rules => {
      const sanitized = HiddenRulesCore.sanitizeRulesMap?.(rules || {}) || {};
      const rule = HiddenRulesCore.sanitizeRule?.(ruleInput);
      if (!rule) return;
      const duplicateId = findMatchingHiddenRuleId(rule, sanitized);
      if (duplicateId) {
        delete sanitized[duplicateId];
        deps.setHiddenRules(sanitized, () => {
          deps.showMiniToast?.(`Hidden rule removed for ${labelText}.`);
          injectSearchBadges();
        });
        return;
      }
      sanitized[rule.id] = rule;
      deps.setHiddenRules(sanitized, () => {
        deps.showMiniToast?.(`Hidden rule added for ${labelText}.`);
        injectSearchBadges();
      });
    });
  }

  function isOptionActive(ruleInput, activeRules) {
    const rulesArr = Object.values(activeRules || {});
    if (!rulesArr.length) return false;
    return rulesArr.some(r => {
      if (r.type !== ruleInput.type) return false;
      if (ruleInput.type === 'crossover') return true;
      if (ruleInput.type === 'author') {
        const nUrl = HiddenRulesCore.normalizeAuthorUrl?.(ruleInput.authorUrl || '');
        const nName = HiddenRulesCore.normalizeExactValue?.(ruleInput.value || '');
        if (nUrl && r.authorUrl) return r.authorUrl === nUrl;
        return r.normalizedValue === nName;
      }
      const nVal = HiddenRulesCore.normalizeExactValue?.(ruleInput.value || '');
      return r.normalizedValue === nVal;
    });
  }

  function collectHideMenuOptions(info, prefs, activeRules) {
    const primaryOptions = [];
    const tagOptions = [];
    const secondaryOptions = [];
    const seen = new Set();
    const pushOption = (bucket, key, ruleInput, label, toastLabel) => {
      if (!key || seen.has(key)) return;
      seen.add(key);
      bucket.push({
        label,
        ruleInput,
        toastLabel,
        isActive: isOptionActive(ruleInput, activeRules)
      });
    };

    (info.authors || []).forEach(author => {
      const value = trimNodeText({ textContent: author.name });
      const key = `author:${(author.url || value).toLowerCase()}`;
      if (!value) return;
      const ruleInput = { type: 'author', value, authorUrl: author.url || '' };
      pushOption(primaryOptions, key, ruleInput, `Hide author: ${value}`, value);
    });

    if (info.language) {
      const key = `language:${info.language.toLowerCase()}`;
      const ruleInput = { type: 'language', value: info.language };
      pushOption(primaryOptions, key, ruleInput, `Hide language: ${info.language}`, info.language);
    }

    (info.relationships || []).forEach(value => {
      const key = `relationship:${value.toLowerCase()}`;
      if (!value) return;
      const ruleInput = { type: 'relationship', value };
      pushOption(tagOptions, key, ruleInput, `Hide relationship: ${value}`, value);
    });
    (info.freeforms || []).forEach(value => {
      const key = `freeform:${value.toLowerCase()}`;
      if (!value) return;
      const ruleInput = { type: 'freeform', value };
      pushOption(tagOptions, key, ruleInput, `Hide tag: ${value}`, value);
    });
    if ((Number(info.fandomCount) || 0) >= prefs.crossoverThreshold) {
      const key = `crossover:${prefs.crossoverThreshold}`;
      const ruleInput = { type: 'crossover' };
      pushOption(
        secondaryOptions,
        key,
        ruleInput,
        `Hide crossovers (${prefs.crossoverThreshold}+ fandoms)`,
        `crossovers (${prefs.crossoverThreshold}+ fandoms)`
      );
    }
    return [...primaryOptions, ...tagOptions, ...secondaryOptions];
  }

  function applyQuickActions(blurb, info, prefs, deps, activeRules) {
    const options = collectHideMenuOptions(info, prefs, activeRules);
    const signature = options.map(option => `${option.label}${option.isActive ? ':active' : ''}`).join('|');
    const existingWrap = blurb.querySelector('.fg-hide-menu-wrap');
    if (!options.length) {
      existingWrap?.remove();
      return;
    }
    if (existingWrap && existingWrap.dataset.hideMenuSignature === signature) return;
    existingWrap?.remove();

    const document = blurb.ownerDocument;
    const wrap = document.createElement('span');
    wrap.className = 'fg-hide-menu-wrap ao3t-track-wrap';
    wrap.dataset.hideMenuSignature = signature;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ao3t-track-pill fg-hide-menu-trigger';
    button.title = 'Hide this work and others like it by hiding a tag';
    button.setAttribute('aria-label', 'Hide this work and others like it by hiding a tag');
    button.setAttribute('aria-expanded', 'false');
    button.innerHTML = HIDDEN_EYE_ICON;
    wrap.appendChild(button);

    const dropdown = document.createElement('div');
    dropdown.className = 'ao3t-badge-dropdown fg-hide-menu-dropdown';
    options.forEach(option => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'ao3t-badge-opt' + (option.isActive ? ' ao3t-badge-opt-active' : '');
      item.textContent = option.isActive ? `✓ ${option.label}` : option.label;
      item.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        dropdown.classList.remove('open');
        button.setAttribute('aria-expanded', 'false');
        addHiddenRule(option.ruleInput, deps, option.toastLabel);
      });
      dropdown.appendChild(item);
    });
    wrap.appendChild(dropdown);

    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      const isOpen = dropdown.classList.contains('open');
      document.querySelectorAll('.ao3t-badge-dropdown.open').forEach(openDropdown => {
        openDropdown.classList.remove('open');
        const trigger = openDropdown.parentElement?.querySelector('.fg-hide-menu-trigger[aria-expanded="true"]');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
      });
      if (!isOpen) {
        dropdown.classList.add('open');
        button.setAttribute('aria-expanded', 'true');
      } else {
        button.setAttribute('aria-expanded', 'false');
      }
    });

    dropdown.addEventListener('click', event => {
      event.stopPropagation();
    });

    insertSecondaryListingControl(blurb, wrap);
  }

  function _injectImpl(deps) {
    const {
      window,
      document,
      getWorks,
      getCustomCats,
      getHiddenRules,
      getHiddenRulePrefs,
      extractTrackedWorkFromBlurb,
      normalizeStatusValue
    } = deps;

    if (!window || !document) return;
    if (window.location.href.match(/archiveofourown\.org\/(?:collections\/[^/]+\/)?works\/\d+/)) return;
    if (typeof document.querySelector === 'function' && document.querySelector('.ao3t-badge-dropdown.open')) return;

    const blurbs = document.querySelectorAll(Core.LISTING_BLURB_SELECTOR || 'li.work.blurb.group, li.bookmark.blurb.group');
    if (!blurbs.length) return;

    ensureDropdownDismissListener(document);
    ensureInlineStyles(document);

    getWorks(works => {
      getCustomCats(allCats => {
        getHiddenRules(rules => {
          getHiddenRulePrefs(prefs => {
            const hiddenRules = HiddenRulesCore.sanitizeRulesMap?.(rules || {}) || {};
            const hiddenPrefs = HiddenRulesCore.sanitizePrefs?.(prefs || {}) || { showReasons: false, crossoverThreshold: 3 };
            let hiddenCount = 0;
            let hideableCount = 0;

            blurbs.forEach(blurb => {
              const workId = typeof Core.extractWorkIdFromListingBlurb === 'function'
                ? Core.extractWorkIdFromListingBlurb(blurb)
                : null;
              if (!workId) return;

              const work = works[workId];
              const info = extractListingRuleInfo(blurb, workId, extractTrackedWorkFromBlurb);
              const hiddenMatch = HiddenRulesCore.evaluateHiddenRules?.(hiddenRules, hiddenPrefs, info) || { reasons: [], shouldCollapse: false };
              const catsKey = buildCustomCatsStateKey(work, allCats);
              const hiddenKey = buildHiddenReasonStateKey(hiddenMatch);

              blurb.querySelectorAll('.ao3t-track-wrap').forEach(element => {
                if (!work) return;
                element.remove();
              });

              blurb.querySelectorAll('.ao3t-badge-wrap').forEach(element => {
                const expectedDataset = typeof Core.buildListingBadgeDataset === 'function'
                  ? Core.buildListingBadgeDataset(workId, work, normalizeStatusValue)
                  : null;
                const matchesCurrent = expectedDataset
                  ? (element.dataset.workId === expectedDataset.workId &&
                    element.dataset.status === expectedDataset.status &&
                    element.dataset.rating === expectedDataset.rating &&
                    element.dataset.chap === expectedDataset.chap &&
                    (element.dataset.customCats || '') === catsKey &&
                    (element.dataset.hiddenMatch || '') === hiddenKey)
                  : false;
                if (matchesCurrent) return;
                element.remove();
              });

              if (!work) {
                blurb.querySelectorAll('.ao3t-badge-wrap').forEach(element => element.remove());
                if (!hasListingTrackControl(blurb)) {
                  buildTrackWrapper(blurb, workId, info.listingInfo, allCats, deps);
                }
              } else if (!blurb.querySelector(`.ao3t-badge-wrap[data-work-id="${workId}"]`)) {
                buildTrackedBadgeWrapper(blurb, workId, work, allCats, hiddenMatch, deps);
              }

              applyQuickActions(blurb, info, hiddenPrefs, deps, hiddenRules);

              const shouldCollapse = !work && hiddenMatch.shouldCollapse && shouldApplyHiddenRulesOnPage(window.location.href);
              const manuallyRevealed = blurb.dataset.fgManualReveal === '1';
              if (shouldCollapse && !manuallyRevealed) hideableCount += 1;
              if (shouldCollapse && !_pageState.revealAllHidden && !manuallyRevealed) {
                hiddenCount += 1;
                applyCollapsedStub(blurb, info, hiddenMatch, hiddenPrefs);
              } else {
                restoreBlurbChildren(blurb);
                blurb.querySelector('.fg-hidden-work-stub')?.remove();
              }
            });

            ensureHiddenToolbar(document, blurbs[0], hiddenCount, hideableCount);
          });
        });
      });
    });
  }

  function init(deps) {
    _deps = deps;
  }

  function injectSearchBadges(deps) {
    const nextDeps = deps || _deps;
    if (nextDeps) _injectImpl(nextDeps);
  }

  const controller = { init, injectSearchBadges, shouldApplyHiddenRulesOnPage, hasListingTrackControl };

  global.AO3TrackerListingBadgeController = controller;
  if (typeof module !== 'undefined' && module.exports) module.exports = controller;
})(typeof globalThis !== 'undefined' ? globalThis : this);
