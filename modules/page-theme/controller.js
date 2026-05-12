(function (global) {
  'use strict';

  const {
    AO3_PAGE_THEME_KEY, EXTENSION_THEME_KEY, THEME_SYNC_KEY, AO3_PAGE_DARK_KEY,
    AO3_DARK_LS_KEY
  } = global.AO3TrackerStorageKeys || {};

  let _deps = null;

  const AO3_DARK_STYLE_ID = 'ao3tracker-page-dark-style';
  const AO3_SOL_LIGHT_STYLE_ID = 'ao3tracker-page-sol-light-style';
  const AO3_PILL_DEFAULT_STYLE_ID = 'ao3tracker-pill-default-style';
  const AO3_PILL_LAYOUT_STYLE_ID = 'ao3tracker-pill-layout-style';

  const AO3_DARK_PIN_DELAYS_MS = [0, 40, 120, 350, 900, 2200];
  const AOT_THEME_CYCLE = ['light', 'sol-light', 'dark'];

  let _ao3DarkPinObserverSetup = false;
  let _loadAO3PageDarkRan = false;

  function init(deps) {
    if (global.AO3TrackerUtils && typeof global.AO3TrackerUtils.validateDeps === 'function') {
      global.AO3TrackerUtils.validateDeps(deps, ['document', 'window'], 'PageThemeController');
    }
    _deps = deps;
  }

  function _document() {
    return (_deps && _deps.document) ? _deps.document : globalThis.document;
  }

  function _window() {
    return (_deps && _deps.window) ? _deps.window : globalThis.window;
  }

  function _css() {
    return {
      AO3_PILL_LAYOUT_CSS: global.AO3TrackerPillLayoutCSS || '',
      AO3_PILL_DEFAULT_CSS: global.AO3TrackerPillDefaultCSS || '',
      AO3_DARK_CSS: global.AO3TrackerDarkCSS || '',
      AO3_SOL_LIGHT_CSS: global.AO3TrackerSolLightCSS || ''
    };
  }

  function pinAo3DarkStyleLast() {
    const doc = _document();
    const el = doc.getElementById(AO3_DARK_STYLE_ID);
    const h = doc.head;
    if (!el || !h) return;
    try {
      h.appendChild(el);
    } catch (e) {}
  }

  function schedulePinAo3DarkStyle() {
    pinAo3DarkStyleLast();
    AO3_DARK_PIN_DELAYS_MS.forEach(ms => {
      try {
        setTimeout(pinAo3DarkStyleLast, ms);
      } catch (e) {}
    });
  }

  function setupAo3DarkStylePinObserver() {
    if (_ao3DarkPinObserverSetup) return;
    const doc = _document();
    const head = doc.head;
    if (!head) return;
    _ao3DarkPinObserverSetup = true;
    let deb;
    const obs = new MutationObserver(() => {
      if (!doc.getElementById(AO3_DARK_STYLE_ID)) return;
      clearTimeout(deb);
      deb = setTimeout(pinAo3DarkStyleLast, 40);
    });
    try {
      obs.observe(head, { childList: true });
    } catch (e) {}
  }

  /** True on user home views: /users/:name, /profile, /dashboard, /pseuds/:pseud (optional /en/? prefix). Not /works, /bookmarks, etc. */
  function syncUserProfileBodyClass() {
    const win = _window();
    const doc = _document();
    try {
      const raw = (win.location && win.location.pathname) ? win.location.pathname : '';
      const p = raw.replace(/\/+$/, '') || '/';
      const re = /^(\/[a-z]{2})?\/users\/[^/]+(\/(profile|dashboard|pseuds\/[^/]+))?$/;
      doc.body?.classList.toggle('ao3t-user-dashboard', re.test(p));
    } catch (e) {}
  }

  function syncSeriesPageBodyClass() {
    const win = _window();
    const doc = _document();
    try {
      const raw = (win.location && win.location.pathname) ? win.location.pathname : '';
      const p = raw.replace(/\/+$/, '') || '/';
      const re = /^(\/[a-z]{2})?\/series\/\d+$/;
      doc.body?.classList.toggle('ao3t-series-page', re.test(p));
    } catch (e) {}
  }

  function syncCollectionPageBodyClass() {
    const win = _window();
    const doc = _document();
    try {
      const raw = (win.location && win.location.pathname) ? win.location.pathname : '';
      const p = raw.replace(/\/+$/, '') || '/';
      const re = /^(\/[a-z]{2})?\/collections\/[^/]+$/;
      const isCollectionPage = re.test(p);
      doc.body?.classList.toggle('ao3t-collection-page', isCollectionPage);
      doc.querySelectorAll?.('.ao3t-collection-recent-works').forEach(panel => {
        panel.classList.remove('ao3t-collection-recent-works');
      });
      if (!isCollectionPage) return;
      doc.querySelectorAll?.('#main .listbox.group').forEach(panel => {
        const heading = panel.querySelector('h2, h3, h4, .heading');
        const label = String(heading?.textContent || '').replace(/\s+/g, ' ').trim();
        if (/^Recent Works$/i.test(label)) {
          panel.classList.add('ao3t-collection-recent-works');
        }
      });
    } catch (e) {}
  }

  function buildAO3ThemeHardeningCss(mode) {
    const dark = mode === 'dark';
    const root = dark ? 'html body[data-ao3-dark="1"]' : 'html body[data-ao3-sol-light="1"]';
    const pageBg = dark ? '#002b36' : '#fdf6e3';
    const panelBg = dark ? '#073642' : '#eee8d5';
    const panelBgStrong = dark ? '#073642' : '#eee8d5';
    const text = dark ? '#839496' : '#586e75';
    const muted = dark ? '#93a1a1' : '#657b83';
    const border = dark ? 'rgba(131,148,150,0.18)' : 'rgba(88,110,117,0.18)';
    const accent = '#268bd2';

    return `
      /* AO3 theme hardening pass: stubborn AO3 chrome that can survive the main theme blocks */
      ${root} #main .notice,
      ${root} #main .caution,
      ${root} #main .error,
      ${root} #main .announcement,
      ${root} #main .flash,
      ${root} #main .wrapper,
      ${root} #main .listbox,
      ${root} #main .listbox.group,
      ${root} #main .filters,
      ${root} #main form.verbose,
      ${root} #main fieldset,
      ${root} #main legend,
      ${root} #main blockquote,
      ${root} #main pre,
      ${root} #main code,
      ${root} #main .meta,
      ${root} #main dl.meta,
      ${root} #main .comment_notice,
      ${root} #main .thread .comment,
      ${root} #main .thread .comment .header,
      ${root} #main .thread .comment fieldset,
      ${root} #main .dashboard .secondary,
      ${root} #main .dashboard .primary,
      ${root} #main .splash .module,
      ${root} #main .module .landmark,
      ${root} #main .actions li > a,
      ${root} #main .actions li > button,
      ${root} #main .actions li > input[type="submit"] {
        background: ${panelBg} !important;
        background-color: ${panelBg} !important;
        background-image: none !important;
        color: ${muted} !important;
        border-color: ${border} !important;
        box-shadow: none !important;
        text-shadow: none !important;
      }

      ${root} #main input[type="text"],
      ${root} #main input[type="search"],
      ${root} #main input[type="email"],
      ${root} #main input[type="url"],
      ${root} #main input[type="password"],
      ${root} #main textarea,
      ${root} #main select,
      ${root} #main option {
        background: ${pageBg} !important;
        background-color: ${pageBg} !important;
        color: ${text} !important;
        border-color: ${border} !important;
        box-shadow: none !important;
      }

      ${root} #main input[type="text"]:focus,
      ${root} #main input[type="search"]:focus,
      ${root} #main input[type="email"]:focus,
      ${root} #main input[type="url"]:focus,
      ${root} #main input[type="password"]:focus,
      ${root} #main textarea:focus,
      ${root} #main select:focus {
        border-color: ${accent} !important;
        box-shadow: 0 0 0 2px ${dark ? 'rgba(38,139,210,0.28)' : 'rgba(38,139,210,0.18)'} !important;
        outline: none !important;
      }

      ${root} #main table,
      ${root} #main thead,
      ${root} #main tbody,
      ${root} #main tr,
      ${root} #main td,
      ${root} #main th {
        border-color: ${border} !important;
        color: ${muted} !important;
      }

      ${root} #main th,
      ${root} #main thead,
      ${root} #main caption,
      ${root} #main fieldset > legend,
      ${root} #main .module > h3,
      ${root} #main .module > h3.heading,
      ${root} #main .module > h4,
      ${root} #main .module > h4.heading {
        background: ${panelBgStrong} !important;
        background-color: ${panelBgStrong} !important;
        color: ${text} !important;
      }

      ${root} #main .notice a,
      ${root} #main .caution a,
      ${root} #main .error a,
      ${root} #main .announcement a,
      ${root} #main blockquote a,
      ${root} #main .meta a {
        color: ${accent} !important;
      }

      ${root} li.work.blurb.group .header,
      ${root} li.work.blurb.group .header.module,
      ${root} li.work.blurb.group .header.module > h4,
      ${root} li.work.blurb.group .header.module > h5,
      ${root} li.bookmark.blurb.group .header,
      ${root} li.bookmark.blurb.group .header.module,
      ${root} li.bookmark.blurb.group .header.module > h4,
      ${root} li.bookmark.blurb.group .header.module > h5,
      ${root} li.series.blurb.group .header,
      ${root} li.series.blurb.group .header.module,
      ${root} li.series.blurb.group .header.module > h4,
      ${root} li.series.blurb.group .header.module > h5,
      ${root} li.collection.blurb.group .header,
      ${root} li.collection.blurb.group .header.module,
      ${root} li.collection.blurb.group .header.module > h4,
      ${root} li.collection.blurb.group .header.module > h5 {
        background: ${panelBg} !important;
        background-color: ${panelBg} !important;
        background-image: none !important;
        box-shadow: none !important;
      }

      /* Series pages can still retain AO3 header strips on the listed work cards.
         Keep this final override narrow to series views so those rows flatten cleanly. */
      ${root}.ao3t-series-page #main li.work.blurb.group .header,
      ${root}.ao3t-series-page #main li.work.blurb.group .header.module,
      ${root}.ao3t-series-page #main li.work.blurb.group .heading,
      ${root}.ao3t-series-page #main li.work.blurb.group .heading *:not(img),
      ${root}.ao3t-series-page #main li.work.blurb.group .byline,
      ${root}.ao3t-series-page #main li.work.blurb.group .byline *:not(img),
      ${root}.ao3t-series-page #main li.work.blurb.group h4,
      ${root}.ao3t-series-page #main li.work.blurb.group h4.heading,
      ${root}.ao3t-series-page #main li.work.blurb.group h5,
      ${root}.ao3t-series-page #main li.work.blurb.group h5.heading,
      ${root}.ao3t-series-page #main li.work.blurb.group h6,
      ${root}.ao3t-series-page #main li.work.blurb.group h6.heading,
      ${root}.ao3t-series-page #main li.work.blurb.group .stats,
      ${root}.ao3t-series-page #main li.work.blurb.group .stats *:not(img) {
        background: ${panelBg} !important;
        background-color: ${panelBg} !important;
        background-image: none !important;
        box-shadow: none !important;
      }

      /* Series page metadata panel: only flatten the Description block in dark mode.
         Leave creator / series begun / series updated / stats alone. */
      html body[data-ao3-dark="1"].ao3t-series-page #main .series.meta .description,
      html body[data-ao3-dark="1"].ao3t-series-page #main .series.meta .description .userstuff,
      html body[data-ao3-dark="1"].ao3t-series-page #main .series.meta .description .userstuff *,
      html body[data-ao3-dark="1"].ao3t-series-page #main .series.meta .description blockquote,
      html body[data-ao3-dark="1"].ao3t-series-page #main .series.meta .description blockquote *,
      html body[data-ao3-dark="1"].ao3t-series-page #main dl.series.meta dd.description,
      html body[data-ao3-dark="1"].ao3t-series-page #main dl.series.meta dd.description .userstuff,
      html body[data-ao3-dark="1"].ao3t-series-page #main dl.series.meta dd.description .userstuff *,
      html body[data-ao3-dark="1"].ao3t-series-page #main dl.series.meta dd.description blockquote,
      html body[data-ao3-dark="1"].ao3t-series-page #main dl.series.meta dd.description blockquote *,
      html body[data-ao3-dark="1"].ao3t-series-page #main .series.meta blockquote.userstuff,
      html body[data-ao3-dark="1"].ao3t-series-page #main .series.meta blockquote.userstuff *,
      html body[data-ao3-dark="1"].ao3t-series-page #main .series.meta .userstuff,
      html body[data-ao3-dark="1"].ao3t-series-page #main .series.meta .userstuff * {
        background: transparent !important;
        background-color: transparent !important;
        background-image: none !important;
        border: 0 !important;
        border-color: transparent !important;
        outline: none !important;
        box-shadow: none !important;
        color: #93a1a1 !important;
      }
      html body[data-ao3-dark="1"].ao3t-series-page #main .series.meta .description blockquote,
      html body[data-ao3-dark="1"].ao3t-series-page #main .series.meta .description .userstuff,
      html body[data-ao3-dark="1"].ao3t-series-page #main dl.series.meta dd.description blockquote,
      html body[data-ao3-dark="1"].ao3t-series-page #main dl.series.meta dd.description .userstuff {
        margin: 0 !important;
        padding: 0 !important;
      }

      ${root} .blurb ul.required-tags,
      ${root} .blurb ul.required-tags li,
      ${root} .blurb ul.required-tags li a,
      ${root} .blurb ul.required-tags li span,
      ${root} .blurb ul.required-tags li .text {
        background-color: transparent !important;
        box-shadow: none !important;
      }

      /* Work page summary/notes: keep these reading-area blocks on the page background,
         not the stronger generic module-heading/background treatment from above. */
      ${root} #workskin .preface.group .summary,
      ${root} #workskin .preface.group .summary.module,
      ${root} #workskin .preface.group .summary .module,
      ${root} #workskin .preface.group .notes,
      ${root} #workskin .preface.group .notes.module,
      ${root} #workskin .preface.group .notes .module,
      ${root} #workskin .chapter.preface.group .notes,
      ${root} #workskin .chapter.postamble.group .notes,
      ${root} #chapters .preface.group .summary,
      ${root} #chapters .preface.group .notes,
      ${root} #chapters .chapter.preface.group .notes,
      ${root} #chapters .chapter.postamble.group .notes,
      ${root} #workskin .preface.group .summary h3,
      ${root} #workskin .preface.group .summary h3.heading,
      ${root} #workskin .preface.group .summary h4,
      ${root} #workskin .preface.group .summary h4.heading,
      ${root} #workskin .preface.group .notes h3,
      ${root} #workskin .preface.group .notes h3.heading,
      ${root} #workskin .preface.group .notes h4,
      ${root} #workskin .preface.group .notes h4.heading,
      ${root} #chapters .preface.group .summary h3,
      ${root} #chapters .preface.group .summary h3.heading,
      ${root} #chapters .preface.group .summary h4,
      ${root} #chapters .preface.group .summary h4.heading,
      ${root} #chapters .preface.group .notes h3,
      ${root} #chapters .preface.group .notes h3.heading,
      ${root} #chapters .preface.group .notes h4,
      ${root} #chapters .preface.group .notes h4.heading {
        background: ${pageBg} !important;
        background-color: ${pageBg} !important;
        background-image: none !important;
        box-shadow: none !important;
        border-color: ${border} !important;
        border-bottom: none !important;
      }

      ${root} #workskin .preface.group .notes:empty,
      ${root} #chapters .preface.group .notes:empty,
      ${root} #workskin .chapter.preface.group .notes:empty,
      ${root} #workskin .chapter.postamble.group .notes:empty,
      ${root} #chapters .chapter.preface.group .notes:empty,
      ${root} #chapters .chapter.postamble.group .notes:empty {
        background: transparent !important;
        background-color: transparent !important;
        border-color: transparent !important;
        box-shadow: none !important;
      }

      ${root} #workskin .preface.group .notes blockquote,
      ${root} #workskin .preface.group .notes blockquote *,
      ${root} #workskin .preface.group .notes .userstuff,
      ${root} #workskin .preface.group .notes .userstuff *,
      ${root} #workskin .preface.group .notes p,
      ${root} #workskin .preface.group .notes p *,
      ${root} #workskin .chapter.preface.group .notes blockquote,
      ${root} #workskin .chapter.preface.group .notes blockquote *,
      ${root} #workskin .chapter.preface.group .notes .userstuff,
      ${root} #workskin .chapter.preface.group .notes .userstuff *,
      ${root} #workskin .chapter.preface.group .notes p,
      ${root} #workskin .chapter.preface.group .notes p *,
      ${root} #workskin .chapter.postamble.group .notes blockquote,
      ${root} #workskin .chapter.postamble.group .notes blockquote *,
      ${root} #workskin .chapter.postamble.group .notes .userstuff,
      ${root} #workskin .chapter.postamble.group .notes .userstuff *,
      ${root} #workskin .chapter.postamble.group .notes p,
      ${root} #workskin .chapter.postamble.group .notes p *,
      ${root} #chapters .preface.group .notes blockquote,
      ${root} #chapters .preface.group .notes blockquote *,
      ${root} #chapters .preface.group .notes .userstuff,
      ${root} #chapters .preface.group .notes .userstuff *,
      ${root} #chapters .preface.group .notes p,
      ${root} #chapters .preface.group .notes p *,
      ${root} #chapters .chapter.preface.group .notes blockquote,
      ${root} #chapters .chapter.preface.group .notes blockquote *,
      ${root} #chapters .chapter.preface.group .notes .userstuff,
      ${root} #chapters .chapter.preface.group .notes .userstuff *,
      ${root} #chapters .chapter.preface.group .notes p,
      ${root} #chapters .chapter.preface.group .notes p *,
      ${root} #chapters .chapter.postamble.group .notes blockquote,
      ${root} #chapters .chapter.postamble.group .notes blockquote *,
      ${root} #chapters .chapter.postamble.group .notes .userstuff,
      ${root} #chapters .chapter.postamble.group .notes .userstuff *,
      ${root} #chapters .chapter.postamble.group .notes p,
      ${root} #chapters .chapter.postamble.group .notes p * {
        background: transparent !important;
        background-color: transparent !important;
        background-image: none !important;
        box-shadow: none !important;
      }

      ${root} #workskin .preface.group .summary blockquote,
      ${root} #workskin .preface.group .summary blockquote *,
      ${root} #workskin .preface.group .summary .userstuff,
      ${root} #workskin .preface.group .summary .userstuff *,
      ${root} #workskin .preface.group .summary p,
      ${root} #workskin .preface.group .summary p *,
      ${root} #chapters .preface.group .summary blockquote,
      ${root} #chapters .preface.group .summary blockquote *,
      ${root} #chapters .preface.group .summary .userstuff,
      ${root} #chapters .preface.group .summary .userstuff *,
      ${root} #chapters .preface.group .summary p,
      ${root} #chapters .preface.group .summary p * {
        background: transparent !important;
        background-color: transparent !important;
        background-image: none !important;
        box-shadow: none !important;
      }

      ${root}.home #main a[href*="bsky.app/profile/status.archiveofourown.org"],
      ${root}.home #main a[href*="bsky.app/profile/status.archiveofourown.org"]:link,
      ${root}.home #main a[href*="bsky.app/profile/status.archiveofourown.org"]:visited,
      ${root}.home #main a[href*="bsky.app/profile/status.archiveofourown.org"] *,
      ${root}.home #main a[href*="bsky.app/profile/status.archiveofourown.org"] span,
      ${root}.home #main a[href*="bsky.app/profile/status.archiveofourown.org"] strong {
        color: #ffffff !important;
        text-shadow: none !important;
      }
    `;
  }

  function applyAO3PageDark(enabled) {
    const doc = _document();
    // Keep localStorage in sync so dark-early.js can prevent the white flash on next load
    try { localStorage.setItem(AO3_DARK_LS_KEY, enabled ? '1' : '0'); } catch (e) {}
    // Disabling dark? Make sure sol-light is also off (caller handles setting it if needed)
    if (enabled) applyAO3SolLight(false);
    syncUserProfileBodyClass();
    syncSeriesPageBodyClass();
    syncCollectionPageBodyClass();
    const existing = doc.getElementById(AO3_DARK_STYLE_ID);
    const { AO3_DARK_CSS } = _css();
    if (enabled) {
      if (existing) return;
      const style = doc.createElement('style');
      style.id = AO3_DARK_STYLE_ID;
        style.textContent = AO3_DARK_CSS + buildAO3ThemeHardeningCss('dark');
      doc.head.appendChild(style);
      schedulePinAo3DarkStyle();
      setupAo3DarkStylePinObserver();
      doc.documentElement.setAttribute('data-ao3-dark', '1');
      doc.body.setAttribute('data-ao3-dark', '1');
      // Drop the early-inject style now that the full CSS is in place
      doc.getElementById('ao3tracker-dark-early')?.remove();
      try {
        doc.documentElement.style.removeProperty('background-color');
        doc.documentElement.style.removeProperty('color-scheme');
      } catch (e) {}
    } else {
      if (existing) existing.remove();
      doc.documentElement.removeAttribute('data-ao3-dark');
      doc.body.removeAttribute('data-ao3-dark');
      doc.getElementById('ao3tracker-dark-early')?.remove();
      doc.getElementById('ao3tracker-theme-color-meta')?.remove();
      try {
        doc.documentElement.style.removeProperty('background-color');
        doc.documentElement.style.removeProperty('color-scheme');
      } catch (e) {}
    }
  }

  function applyAO3SolLight(enabled) {
    const doc = _document();
    if (enabled) {
      // Sol-light and dark are mutually exclusive
      applyAO3PageDark(false);
    }
    syncSeriesPageBodyClass();
    syncCollectionPageBodyClass();
    const existing = doc.getElementById(AO3_SOL_LIGHT_STYLE_ID);
    const { AO3_SOL_LIGHT_CSS } = _css();
    if (enabled) {
      if (!existing) {
        const style = doc.createElement('style');
        style.id = AO3_SOL_LIGHT_STYLE_ID;
         style.textContent = AO3_SOL_LIGHT_CSS + buildAO3ThemeHardeningCss('sol-light');
        doc.head.appendChild(style);
      }
      doc.documentElement.setAttribute('data-ao3-sol-light', '1');
      doc.body.setAttribute('data-ao3-sol-light', '1');
    } else {
      if (existing) existing.remove();
      doc.documentElement.removeAttribute('data-ao3-sol-light');
      doc.body?.removeAttribute('data-ao3-sol-light');
    }
  }

  function nextAo3trackerTheme(current) {
    const i = AOT_THEME_CYCLE.indexOf(current);
    const idx = i >= 0 ? i : 0;
    return AOT_THEME_CYCLE[(idx + 1) % AOT_THEME_CYCLE.length];
  }

  function updatePageThemeToggleUI(theme) {
    const doc = _document();
    const wrap = doc.getElementById('aot-page-theme-switch');
    if (!wrap) return;
    wrap.setAttribute('data-aot-page-theme', theme);
    wrap.querySelectorAll('.aot-page-theme-seg').forEach(seg => {
      const on = seg.dataset.theme === theme;
      seg.classList.toggle('is-active', on);
      seg.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function applyAO3PillLayout() {
    const doc = _document();
    if (doc.getElementById(AO3_PILL_LAYOUT_STYLE_ID)) return;
    const { AO3_PILL_LAYOUT_CSS } = _css();
    if (!AO3_PILL_LAYOUT_CSS) return;
    const style = doc.createElement('style');
    style.id = AO3_PILL_LAYOUT_STYLE_ID;
    style.textContent = AO3_PILL_LAYOUT_CSS;
    doc.head.appendChild(style);
  }

  function applyAO3PillDefault(enabled) {
    const doc = _document();
    const existing = doc.getElementById(AO3_PILL_DEFAULT_STYLE_ID);
    const { AO3_PILL_DEFAULT_CSS } = _css();
    if (enabled) {
      if (!existing) {
        const style = doc.createElement('style');
        style.id = AO3_PILL_DEFAULT_STYLE_ID;
        style.textContent = AO3_PILL_DEFAULT_CSS;
        doc.head.appendChild(style);
      }
    } else {
      if (existing) existing.remove();
    }
  }

  function syncAo3trackerThemeToPage(theme) {
    if (theme === 'dark') {
      applyAO3PageDark(true);
      applyAO3PillDefault(false);
    } else if (theme === 'sol-light') {
      applyAO3SolLight(true);
      applyAO3PillDefault(false);
    } else {
      applyAO3PageDark(false);
      applyAO3SolLight(false);
      applyAO3PillDefault(true);
    }
    updatePageThemeToggleUI(theme);
  }

  function extensionContextAvailable() {
    try {
      return !!(chrome.runtime && chrome.runtime.id && chrome.storage && chrome.storage.local);
    } catch (e) {
      return false;
    }
  }

  function persistAndApplyAo3trackerTheme(theme) {
    syncAo3trackerThemeToPage(theme);
    if (!extensionContextAvailable()) return;
    try {
      chrome.storage.local.get(THEME_SYNC_KEY, d => {
        const updates = { [AO3_PAGE_THEME_KEY]: theme };
        if (d[THEME_SYNC_KEY] !== false) {
          updates[EXTENSION_THEME_KEY] = theme;
          applyTrackerThemeToSidebar(theme);
        }
        chrome.storage.local.set(updates);
      });
    } catch (e) {
      try { chrome.storage.local.set({ [AO3_PAGE_THEME_KEY]: theme }); } catch (_e) {}
    }
  }

  function findWorkNavigationActionsUl() {
    const doc = _document();
    const sets = doc.querySelectorAll(
      '#workskin ul.actions[role="navigation"], #chapters ul.actions[role="navigation"], #workskin .navigation.actions ul.actions'
    );
    for (const ul of sets) {
      const t = (ul.textContent || '').replace(/\s+/g, ' ');
      if (/Entire Work|Next Chapter|Previous Chapter|Chapter Index|Chapter by Chapter|Full work|Continue/i.test(t)) {
        return ul;
      }
    }
    const broad = doc.querySelectorAll('#workskin ul.actions, #chapters ul.actions');
    for (const ul of broad) {
      const t = (ul.textContent || '').replace(/\s+/g, ' ');
      if (/Entire Work|Chapter Index|Next Chapter/.test(t) && ul.querySelectorAll('li').length >= 2) return ul;
    }
    return null;
  }

  /** Header About in #login — href is usually /about (locale paths possible) */
  function hrefIsAbout(href) {
    if (!href) return false;
    const p = href.split(/[?#]/)[0];
    if (/\/about\/?$/i.test(p)) return true;
    if (/archiveofourown\.org\/about\/?$/i.test(p)) return true;
    return false;
  }

  function findAboutListItem() {
    const doc = _document();
    const login = doc.getElementById('login');
    if (login) {
      for (const ul of login.querySelectorAll('ul')) {
        for (const a of ul.querySelectorAll('a[href]')) {
          if (hrefIsAbout(a.getAttribute('href'))) return a.closest('li');
        }
        for (const a of ul.querySelectorAll('a[href]')) {
          const label = (a.textContent || '').replace(/\s+/g, ' ').trim();
          if (/^About$/i.test(label)) return a.closest('li');
        }
      }
    }
    for (const a of doc.querySelectorAll('#header a[href*="/about"]')) {
      const href = a.getAttribute('href') || '';
      if (/\/users\//i.test(href)) continue;
      if (hrefIsAbout(href)) return a.closest('li');
    }
    return null;
  }

  /** Place toggle immediately left of the Entire Work (or full-work) nav link when possible */
  function findEntireWorkListItem(ul) {
    if (!ul) return null;
    const links = ul.querySelectorAll('li a[href]');
    for (const a of links) {
      const label = (a.textContent || '').replace(/\s+/g, ' ').trim();
      if (/^Entire Work$/i.test(label) || /^Full work$/i.test(label) || /^Whole Work$/i.test(label)) {
        return a.closest('li');
      }
    }
    for (const a of links) {
      if (/view_full_work|style=full|\/chapters$/i.test(a.getAttribute('href') || '')) {
        return a.closest('li');
      }
    }
    return null;
  }

  function injectAO3DarkToggle() {
    const doc = _document();
    if (doc.getElementById('aot-page-theme-switch')) return;

    const wrap = doc.createElement('div');
    wrap.id = 'aot-page-theme-switch';
    wrap.className = 'aot-page-theme-switch';
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', 'AO3 page appearance');
    wrap.setAttribute('data-aot-page-theme', 'light');
    wrap.innerHTML = `
      <span class="aot-page-theme-preview" aria-hidden="true">
        <svg class="aot-page-theme-preview-sun" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8 1.8v1.8M8 12.4v1.8M1.8 8h1.8M12.4 8h1.8M3.3 3.3l1.3 1.3M11.4 11.4l1.3 1.3M12.7 3.3l-1.3 1.3M4.6 11.4l-1.3 1.3"/><circle cx="8" cy="8" r="2.5"/>
        </svg>
        <svg class="aot-page-theme-preview-arrow" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M1.5 5h5.5"/><path d="M5.5 2.7 8 5 5.5 7.3"/>
        </svg>
        <svg class="aot-page-theme-preview-moon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8 2a4 4 0 0 0 6 6 6 6 0 1 1-6-6Z"/>
        </svg>
      </span>
      <button type="button" class="aot-page-theme-seg" data-theme="light" aria-pressed="false" title="to default">
        <span class="aot-page-theme-seg-ico">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M8 1.5v2.2M8 12.3v2.2M1.5 8h2.2M12.3 8h2.2M3 3l1.6 1.6M11.4 11.4L13 13M13 3l-1.6 1.6M3 13l1.6-1.6"/><circle cx="8" cy="8" r="3.1"/>
          </svg>
        </span>
        <span class="aot-page-theme-seg-label">to default</span>
      </button>
      <button type="button" class="aot-page-theme-seg" data-theme="sol-light" aria-pressed="false" title="to light mode">
        <span class="aot-page-theme-seg-ico">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="1.5" y1="11" x2="14.5" y2="11"/><path d="M5 11a3 3 0 0 1 6 0"/><line x1="8" y1="3" x2="8" y2="5.5"/><line x1="3.5" y1="5.8" x2="5.1" y2="7.4"/><line x1="12.5" y1="5.8" x2="10.9" y2="7.4"/>
          </svg>
        </span>
        <span class="aot-page-theme-seg-label">to light mode</span>
      </button>
      <button type="button" class="aot-page-theme-seg" data-theme="dark" aria-pressed="false" title="to Solarized Dark">
        <span class="aot-page-theme-seg-ico">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M8 2a4 4 0 0 0 6 6 6 6 0 1 1-6-6Z"/>
          </svg>
        </span>
        <span class="aot-page-theme-seg-label">to Solarized Dark</span>
      </button>`;
    wrap.querySelectorAll('.aot-page-theme-seg').forEach(seg => {
      seg.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const t = seg.dataset.theme;
        if (t) persistAndApplyAo3trackerTheme(t);
      });
    });
    /* Collapse to the current-mode icon when the pointer leaves: click leaves :focus-within
       true, so CSS would otherwise keep the pill expanded. Skip if focus is keyboard (:focus-visible). */
    wrap.addEventListener('pointerleave', () => {
      try {
        const ae = doc.activeElement;
        if (!ae || !wrap.contains(ae)) return;
        let keyboardFocus = false;
        try {
          keyboardFocus = typeof ae.matches === 'function' && ae.matches(':focus-visible');
        } catch (e) {}
        if (keyboardFocus) return;
        ae.blur();
      } catch (e) {}
    });

    /* 1) Header: immediately to the RIGHT of About (same ul.actions) */
    const aboutLi = findAboutListItem();
    if (aboutLi && aboutLi.parentElement) {
      const li = doc.createElement('li');
      li.className = 'aot-page-dark-li aot-page-dark-li--login';
      li.appendChild(wrap);
      aboutLi.insertAdjacentElement('afterend', li);
      return;
    }

    /* 2) Work chapter nav (Entire Work / ?) — may be moved next to About when #login appears */
    const actionsUl = findWorkNavigationActionsUl();
    if (actionsUl) {
      const li = doc.createElement('li');
      li.className = 'aot-page-dark-li';
      li.appendChild(wrap);
      const entireLi = findEntireWorkListItem(actionsUl);
      if (entireLi) {
        actionsUl.insertBefore(li, entireLi);
      } else if (actionsUl.firstChild) {
        actionsUl.insertBefore(li, actionsUl.firstChild);
      } else {
        actionsUl.appendChild(li);
      }
      return;
    }

    /* 3) Last resort: beside title */
    const heading = doc.querySelector('#header .heading a') ||
                    doc.querySelector('#header h1 a') ||
                    doc.querySelector('#header h1') ||
                    doc.querySelector('#header .heading');
    if (!heading) return;
    wrap.classList.add('aot-page-theme-switch--header');
    heading.insertAdjacentElement('afterend', wrap);
  }

  function movePageTogglesNextToAbout() {
    const doc = _document();
    const aboutLi = findAboutListItem();
    const wrap = doc.getElementById('aot-page-theme-switch');
    if (!aboutLi || !wrap || !aboutLi.parentElement) return;

    let li = wrap.closest('li.aot-page-dark-li');
    if (!li) {
      li = doc.createElement('li');
      li.className = 'aot-page-dark-li aot-page-dark-li--login';
      wrap.replaceWith(li);
      li.appendChild(wrap);
    }
    if (li.parentElement === aboutLi.parentElement && aboutLi.nextElementSibling === li) {
      return;
    }
    aboutLi.insertAdjacentElement('afterend', li);
    li.classList.add('aot-page-dark-li--login');
    wrap.classList.remove('aot-page-theme-switch--header');
  }

  function loadAO3PageDark() {
    if (_loadAO3PageDarkRan) return;
    _loadAO3PageDarkRan = true;
    if (!extensionContextAvailable()) {
      _loadAO3PageDarkRan = false;
      return;
    }
    try {
      chrome.storage.local.get([AO3_PAGE_THEME_KEY, AO3_PAGE_DARK_KEY], d => {
        const theme = d[AO3_PAGE_THEME_KEY];
        let dark = theme === 'dark';
        let solLight = theme === 'sol-light';
        // Legacy: page-only flag before themes were unified
        if (theme === undefined && d[AO3_PAGE_DARK_KEY] !== undefined) {
          dark = !!d[AO3_PAGE_DARK_KEY];
          chrome.storage.local.set({ [AO3_PAGE_THEME_KEY]: dark ? 'dark' : 'light' });
        }
        applyAO3PillLayout();
        injectAO3DarkToggle();
        const resolved = dark ? 'dark' : solLight ? 'sol-light' : 'light';
        if (dark) {
          applyAO3PageDark(true);
          applyAO3PillDefault(false);
        } else if (solLight) {
          applyAO3SolLight(true);
          applyAO3PillDefault(false);
        } else {
          applyAO3PageDark(false);
          applyAO3SolLight(false);
          applyAO3PillDefault(true);
        }
        updatePageThemeToggleUI(resolved);
        [0, 200, 600, 1500].forEach(ms => setTimeout(movePageTogglesNextToAbout, ms));
      });
    } catch (e) {
      _loadAO3PageDarkRan = false;
    }
  }

  function applyTrackerThemeToSidebar(explicitTheme) {
    const doc = _document();
    const run = (theme) => {
      const panel = doc.getElementById('ao3tracker-panel');
      if (panel) {
        panel.classList.remove('aot-dark', 'aot-sol-light');
        if (theme === 'dark') panel.classList.add('aot-dark');
        else if (theme === 'sol-light') panel.classList.add('aot-sol-light');
        panel.dataset.extensionTheme = theme || 'light';
      }
      const btn = doc.getElementById('aot-theme-toggle');
      if (btn) {
        const meta = {
          light: 'Switch to Solarized Light',
          'sol-light': 'Switch to Solarized Dark',
          dark: 'Switch to default AO3'
        };
        const t = meta[theme] || meta.light;
        btn.title = t;
        btn.setAttribute('aria-label', t);
      }
    };
    if (explicitTheme !== undefined && explicitTheme !== null) {
      run(explicitTheme);
    } else {
      if (!extensionContextAvailable()) {
        run('light');
        return;
      }
      try {
        chrome.storage.local.get([EXTENSION_THEME_KEY, AO3_PAGE_THEME_KEY], d => {
          run(d[EXTENSION_THEME_KEY] || d[AO3_PAGE_THEME_KEY] || 'light');
        });
      } catch (e) {}
    }
  }

  const AO3TrackerPageThemeController = {
    init,
    loadAO3PageDark,
    syncAo3trackerThemeToPage,
    persistAndApplyAo3trackerTheme,
    applyTrackerThemeToSidebar,
    nextAo3trackerTheme,
    syncUserProfileBodyClass,
    syncSeriesPageBodyClass,
    syncCollectionPageBodyClass,
    schedulePinAo3DarkStyle,
    setupAo3DarkStylePinObserver,
    injectAO3DarkToggle,
    movePageTogglesNextToAbout,
    // expose style ID for early-load block in content.js
    AO3_DARK_STYLE_ID,
    AO3_PILL_LAYOUT_STYLE_ID
  };

  global.AO3TrackerPageThemeController = AO3TrackerPageThemeController;
  if (typeof module !== 'undefined' && module.exports) module.exports = AO3TrackerPageThemeController;
})(typeof globalThis !== 'undefined' ? globalThis : this);
