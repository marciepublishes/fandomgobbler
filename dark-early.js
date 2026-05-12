// document_start — paint a dark shell before body content renders (with localStorage + chrome.storage).
(function () {
  const EARLY_ID = 'ao3tracker-dark-early';
  const META_ID = 'ao3tracker-theme-color-meta';
  const LS_KEY = 'ao3tracker_dark';

  function paintRootShell() {
    try {
      document.documentElement.style.setProperty('background-color', '#002b36', 'important');
      document.documentElement.style.setProperty('color-scheme', 'dark');
    } catch (e) {}
  }

  function clearRootShell() {
    try {
      document.documentElement.style.removeProperty('background-color');
      document.documentElement.style.removeProperty('color-scheme');
    } catch (e) {}
  }

  // Broad AO3 shells + header strip; matches AO3_DARK_CSS palette to avoid handoff flash
  const EARLY_CSS = [
    ':root{color-scheme:dark!important}',
    'html,body{background:#002b36!important;color:#839496!important}',
    '#outer,#inner,#main,#content,.region{background:#002b36!important}',
    '#header,#header.region{background:#073642!important;background-color:#073642!important;background-image:none!important;border-bottom:1px solid rgba(131,148,150,0.14)!important;box-shadow:none!important}',
    '#dashboard,#login,#header #login,#header #dashboard,#header .heading,#header h1,#header fieldset,#header .search,#header .menu,#header nav{background:#073642!important;background-color:#073642!important;background-image:none!important}',
    '#workskin,#chapters,.userstuff,.works,.reading,.works-index,.work,.blurb,.module,article,.filters,.bookmark,.series,.collection,#main .works,#bookmarks-index,.work-index,.thread,#feedback,.comment,.comment_holder,.chapter,#drafts,#inbox,.home,.splash{background:#002b36!important;color:#839496!important}',
    '#main table,#main thead,#main tbody,#main tr,#main td,#main th,.works-list table{background:#002b36!important;color:#839496!important}',
    '#footer,#outer #footer{background:#002b36!important}',
    '#footer,#outer #footer{border-color:rgba(131,148,150,0.14)!important}'
  ].join('');

  function injectThemeColorMeta() {
    try {
      if (document.getElementById(META_ID)) return;
      var head = document.head;
      if (!head) {
        setTimeout(injectThemeColorMeta, 0);
        return;
      }
      var m = document.createElement('meta');
      m.id = META_ID;
      m.setAttribute('name', 'theme-color');
      m.setAttribute('content', '#002b36');
      head.insertBefore(m, head.firstChild);
    } catch (e) {}
  }

  function removeThemeColorMeta() {
    try {
      document.getElementById(META_ID)?.remove();
    } catch (e) {}
  }

  function injectEarly() {
    if (document.getElementById(EARLY_ID)) return;
    paintRootShell();
    var s = document.createElement('style');
    s.id = EARLY_ID;
    s.textContent = EARLY_CSS;
    document.documentElement.appendChild(s);
    document.documentElement.setAttribute('data-ao3-dark', '1');
    injectThemeColorMeta();
  }

  function removeEarly() {
    document.getElementById(EARLY_ID)?.remove();
    document.documentElement.removeAttribute('data-ao3-dark');
    clearRootShell();
    removeThemeColorMeta();
  }

  try {
    if (localStorage.getItem(LS_KEY) === '1') injectEarly();
  } catch (e) {}

  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['ao3tracker_theme', 'ao3_page_dark'], function (d) {
        var dark = d.ao3tracker_theme === 'dark';
        if (d.ao3tracker_theme === undefined && d.ao3_page_dark !== undefined) {
          dark = !!d.ao3_page_dark;
        }
        try {
          localStorage.setItem(LS_KEY, dark ? '1' : '0');
        } catch (e) {}

        if (dark) {
          injectEarly();
        } else {
          removeEarly();
        }
      });
    }
  } catch (e) {}
})();
