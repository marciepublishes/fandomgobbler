// CSS for AO3_SOL_LIGHT_CSS — loaded before content.js via manifest.
// Edit CSS here; the variable is consumed directly in content.js.
globalThis.AO3TrackerSolLightCSS = `
    /* AO3 Tracker: Page Solarized Light Mode */
    html, body {
      background: #fdf6e3 !important;
      color: #586e75 !important;
    }
    #header {
      background: #eee8d5 !important;
      background-image: none !important;
      border-bottom: 1px solid rgba(88,110,117,0.2) !important;
      box-shadow: none !important;
    }
    #header.region,
    #header #login,
    #header .heading,
    #header h1, #header h2, #header h3,
    #header ul.actions, #header .actions,
    #header #dashboard,
    #header .search,
    #header fieldset,
    #header .menu,
    #header nav,
    #header .primary,
    #header > nav,
    #header > div {
      background: #eee8d5 !important;
      background-image: none !important;
      background-color: #eee8d5 !important;
      box-shadow: none !important;
    }
    /* Tracker theme pill: Solarized light only supplies color tokens; layout lives in AO3_PILL_LAYOUT_CSS */
    #aot-page-theme-switch {
      --aot-pill-bg: rgba(253, 246, 227, 0.85);
      --aot-pill-border: rgba(88, 110, 117, 0.28);
      --aot-pill-text: #586e75;
      --aot-pill-hover-bg: rgba(88, 110, 117, 0.12);
      --aot-pill-hover-text: #073642;
      --aot-pill-shadow: 0 4px 18px rgba(0, 0, 0, 0.22);
    }
    #header a, #header a:link { color: #268bd2 !important; }
    #header a:visited { color: #2aa198 !important; }
    #header a:hover, #header a:active { color: #b58900 !important; }
    /* Header search: keep AO3's search bar from retaining the site's darker skin */
    #header .search input[type="text"],
    #header .search input[type="search"],
    #header #search input[type="text"],
    #header #search input[type="search"],
    #header form[role="search"] input[type="text"],
    #header form[role="search"] input[type="search"],
    #header input[name="query"] {
      background: #fdf6e3 !important;
      background-color: #fdf6e3 !important;
      border: 1px solid rgba(88,110,117,0.28) !important;
      color: #586e75 !important;
      -webkit-text-fill-color: #586e75 !important;
      box-shadow: none !important;
    }
    #header .search input::placeholder,
    #header #search input::placeholder,
    #header form[role="search"] input::placeholder,
    #header input[name="query"]::placeholder {
      color: #93a1a1 !important;
      opacity: 1 !important;
    }
    #header .search input[type="submit"],
    #header .search button,
    #header #search input[type="submit"],
    #header #search button,
    #header form[role="search"] button[type="submit"] {
      background: #eee8d5 !important;
      background-color: #eee8d5 !important;
      border: 1px solid rgba(88,110,117,0.25) !important;
      color: #586e75 !important;
      text-shadow: none !important;
      box-shadow: none !important;
    }
    #header .search input[type="submit"]:hover,
    #header .search button:hover,
    #header #search input[type="submit"]:hover,
    #header #search button:hover,
    #header form[role="search"] button[type="submit"]:hover {
      background: #d3cbb9 !important;
      color: #073642 !important;
    }
    #header .search input:focus,
    #header .search input:focus-visible,
    #header #search input:focus,
    #header #search input:focus-visible,
    #header form[role="search"] input:focus,
    #header form[role="search"] input:focus-visible,
    #header input[name="query"]:focus,
    #header input[name="query"]:focus-visible {
      border-color: #268bd2 !important;
      outline: none !important;
      box-shadow: 0 0 0 2px rgba(38,139,210,0.18) !important;
    }
    #header .search input:-webkit-autofill,
    #header #search input:-webkit-autofill,
    #header form[role="search"] input:-webkit-autofill {
      -webkit-box-shadow: 0 0 0 40px #fdf6e3 inset !important;
      box-shadow: 0 0 0 40px #fdf6e3 inset !important;
      -webkit-text-fill-color: #586e75 !important;
      caret-color: #586e75 !important;
    }
    #outer, #inner, #main, #content, .region {
      background: #fdf6e3 !important;
      background-image: none !important;
    }
    a, a:link { color: #268bd2 !important; }
    a:visited { color: #2aa198 !important; }
    a:hover { color: #b58900 !important; }
    /* Main content */
    #workskin, #chapters, .userstuff {
      background: #fdf6e3 !important;
      color: #586e75 !important;
    }
    /* Module panels (non-blurb, non-group, non-header) */
    .module:not(.blurb):not(.group):not(.header) {
      background: #eee8d5 !important;
      color: #586e75 !important;
    }
    .module > h3, .module > h3.heading, .module h3.heading,
    .module h3.landmark, .module h3.landmark.heading,
    .module > h4, .module h4.heading,
    fieldset > legend {
      background: #d3cbb9 !important;
      color: #586e75 !important;
      border: none !important;
      box-shadow: none !important;
    }
    /* Work listing blurb cards */
    ol.index li.blurb, ol.index li.work.blurb.group,
    ol.index li.bookmark.blurb.group, ol.index li.series.blurb.group {
      background: #eee8d5 !important;
      color: #586e75 !important;
      border-color: rgba(88,110,117,0.15) !important;
    }
    ol.index li.blurb + li.blurb {
      border-top: 2px solid #fdf6e3 !important;
    }
    /* Blurb title/author/recipient strip ? remove AO3's darker .header.module highlight
       AND override .module h4.heading { background: #d3cbb9 } which hits blurb titles */
    li.work.blurb.group .header, li.work.blurb.group .header.module,
    li.bookmark.blurb.group .header, li.bookmark.blurb.group .header.module,
    li.series.blurb.group .header, li.series.blurb.group .header.module,
    li.work.blurb.group h4, li.work.blurb.group h4.heading,
    li.work.blurb.group h5, li.work.blurb.group h5.heading,
    li.work.blurb.group h6, li.work.blurb.group h6.heading,
    li.bookmark.blurb.group h4, li.bookmark.blurb.group h4.heading,
    li.bookmark.blurb.group h5, li.bookmark.blurb.group h5.heading,
    li.bookmark.blurb.group h6, li.bookmark.blurb.group h6.heading,
    li.series.blurb.group h4, li.series.blurb.group h4.heading,
    li.series.blurb.group h5, li.series.blurb.group h5.heading {
      background: transparent !important;
      background-color: transparent !important;
    }
    /* Series page work rows: keep header, summary, and stats on the same card surface.
       Scope this only to /series/... pages in Solarized light so other listing pages stay untouched. */
    html body[data-ao3-sol-light="1"].ao3t-series-page #main li.work.blurb.group,
    html body[data-ao3-sol-light="1"].ao3t-series-page #main li.work.blurb.group .header,
    html body[data-ao3-sol-light="1"].ao3t-series-page #main li.work.blurb.group .header.module,
    html body[data-ao3-sol-light="1"].ao3t-series-page #main li.work.blurb.group h4,
    html body[data-ao3-sol-light="1"].ao3t-series-page #main li.work.blurb.group h4.heading,
    html body[data-ao3-sol-light="1"].ao3t-series-page #main li.work.blurb.group h5,
    html body[data-ao3-sol-light="1"].ao3t-series-page #main li.work.blurb.group h5.heading,
    html body[data-ao3-sol-light="1"].ao3t-series-page #main li.work.blurb.group .heading,
    html body[data-ao3-sol-light="1"].ao3t-series-page #main li.work.blurb.group .heading *:not(img),
    html body[data-ao3-sol-light="1"].ao3t-series-page #main li.work.blurb.group .byline,
    html body[data-ao3-sol-light="1"].ao3t-series-page #main li.work.blurb.group .byline *:not(img),
    html body[data-ao3-sol-light="1"].ao3t-series-page #main li.work.blurb.group blockquote.userstuff,
    html body[data-ao3-sol-light="1"].ao3t-series-page #main li.work.blurb.group blockquote.userstuff *:not(a),
    html body[data-ao3-sol-light="1"].ao3t-series-page #main li.work.blurb.group .summary,
    html body[data-ao3-sol-light="1"].ao3t-series-page #main li.work.blurb.group .summary *,
    html body[data-ao3-sol-light="1"].ao3t-series-page #main li.work.blurb.group .stats,
    html body[data-ao3-sol-light="1"].ao3t-series-page #main li.work.blurb.group .stats *,
    html body[data-ao3-sol-light="1"].ao3t-series-page #main li.work.blurb.group .datetime,
    html body[data-ao3-sol-light="1"].ao3t-series-page #main li.work.blurb.group .datetime * {
      background: #eee8d5 !important;
      background-color: #eee8d5 !important;
      background-image: none !important;
      box-shadow: none !important;
      color: #586e75 !important;
    }
    /* Collections page Recent Works panel: AO3 nests this listbox differently than normal listings.
       Keep this scoped to collection landing pages in Solarized light only. */
    html body[data-ao3-sol-light="1"].ao3t-collection-page #main .ao3t-collection-recent-works,
    html body[data-ao3-sol-light="1"].ao3t-collection-page #main .ao3t-collection-recent-works > h3,
    html body[data-ao3-sol-light="1"].ao3t-collection-page #main .ao3t-collection-recent-works > h3.heading,
    html body[data-ao3-sol-light="1"].ao3t-collection-page #main .ao3t-collection-recent-works ol.index,
    html body[data-ao3-sol-light="1"].ao3t-collection-page #main .ao3t-collection-recent-works li.work.blurb.group,
    html body[data-ao3-sol-light="1"].ao3t-collection-page #main .ao3t-collection-recent-works li.work.blurb.group .header,
    html body[data-ao3-sol-light="1"].ao3t-collection-page #main .ao3t-collection-recent-works li.work.blurb.group .header.module,
    html body[data-ao3-sol-light="1"].ao3t-collection-page #main .ao3t-collection-recent-works li.work.blurb.group h4,
    html body[data-ao3-sol-light="1"].ao3t-collection-page #main .ao3t-collection-recent-works li.work.blurb.group h4.heading,
    html body[data-ao3-sol-light="1"].ao3t-collection-page #main .ao3t-collection-recent-works li.work.blurb.group h5,
    html body[data-ao3-sol-light="1"].ao3t-collection-page #main .ao3t-collection-recent-works li.work.blurb.group h5.heading,
    html body[data-ao3-sol-light="1"].ao3t-collection-page #main .ao3t-collection-recent-works li.work.blurb.group .heading,
    html body[data-ao3-sol-light="1"].ao3t-collection-page #main .ao3t-collection-recent-works li.work.blurb.group .heading *:not(img),
    html body[data-ao3-sol-light="1"].ao3t-collection-page #main .ao3t-collection-recent-works li.work.blurb.group .byline,
    html body[data-ao3-sol-light="1"].ao3t-collection-page #main .ao3t-collection-recent-works li.work.blurb.group .byline *:not(img),
    html body[data-ao3-sol-light="1"].ao3t-collection-page #main .ao3t-collection-recent-works li.work.blurb.group blockquote.userstuff,
    html body[data-ao3-sol-light="1"].ao3t-collection-page #main .ao3t-collection-recent-works li.work.blurb.group blockquote.userstuff *:not(a),
    html body[data-ao3-sol-light="1"].ao3t-collection-page #main .ao3t-collection-recent-works li.work.blurb.group .summary,
    html body[data-ao3-sol-light="1"].ao3t-collection-page #main .ao3t-collection-recent-works li.work.blurb.group .summary *,
    html body[data-ao3-sol-light="1"].ao3t-collection-page #main .ao3t-collection-recent-works li.work.blurb.group .stats,
    html body[data-ao3-sol-light="1"].ao3t-collection-page #main .ao3t-collection-recent-works li.work.blurb.group .stats *,
    html body[data-ao3-sol-light="1"].ao3t-collection-page #main .ao3t-collection-recent-works li.work.blurb.group .datetime,
    html body[data-ao3-sol-light="1"].ao3t-collection-page #main .ao3t-collection-recent-works li.work.blurb.group .datetime * {
      background: #eee8d5 !important;
      background-color: #eee8d5 !important;
      background-image: none !important;
      box-shadow: none !important;
      color: #586e75 !important;
    }
    /* AO3 can still leave a darker strip on blurb title/byline rows via header/module descendants.
       Keep this narrow so required-tag warning icons on the left retain AO3's sprite/background handling. */
    li.work.blurb.group .header,
    li.work.blurb.group .header.module,
    li.work.blurb.group .heading,
    li.work.blurb.group .heading *:not(img),
    li.work.blurb.group .byline,
    li.work.blurb.group .byline *:not(img),
    li.bookmark.blurb.group .header,
    li.bookmark.blurb.group .header.module,
    li.bookmark.blurb.group .heading,
    li.bookmark.blurb.group .heading *:not(img),
    li.bookmark.blurb.group .byline,
    li.bookmark.blurb.group .byline *:not(img),
    li.series.blurb.group .header,
    li.series.blurb.group .header.module,
    li.series.blurb.group .heading,
    li.series.blurb.group .heading *:not(img),
    li.collection.blurb.group .header,
    li.collection.blurb.group .header.module,
    li.collection.blurb.group .heading,
    li.collection.blurb.group .heading *:not(img) {
      background: #eee8d5 !important;
      background-color: #eee8d5 !important;
      background-image: none !important;
      box-shadow: none !important;
    }
    /* Blurb headings */
    .blurb h4 a, .blurb h5 a, .blurb .heading a,
    .blurb h4.heading a { color: #268bd2 !important; }
    .fandoms.heading a { color: #2aa198 !important; }
    /* Preserve AO3 warning/archive icons on listing cards */
    .blurb ul.required-tags,
    .blurb ul.required-tags li {
      box-shadow: none !important;
    }
    .blurb ul.required-tags li a,
    .blurb ul.required-tags li span {
      background-color: transparent !important;
      box-shadow: none !important;
    }
    /* Tags */
    .tag {
      background: #d3cbb9 !important;
      color: #586e75 !important;
      border-color: rgba(88,110,117,0.25) !important;
    }
    .tag:hover { background: #c4bba9 !important; }
    /* Tables */
    #main table, #main thead, #main tbody, #main tr,
    #main td, #main th, .works-list table {
      background: #eee8d5 !important;
      color: #586e75 !important;
    }
    /* Comments */
    li.comment { background: #fdf6e3 !important; }
    li.comment > div {
      background: #eee8d5 !important;
      color: #586e75 !important;
    }
    /* Filter/search sidebar */
    .filters, .filters .module, form#work-filters, form#bookmark-filters,
    form#work-filters fieldset, form#bookmark-filters fieldset,
    form#work-filters dl, form#bookmark-filters dl,
    form#work-filters legend, form#bookmark-filters legend,
    form#work-filters label, form#bookmark-filters label {
      background: #eee8d5 !important;
      color: #586e75 !important;
    }
    form#work-filters input[type="text"],
    form#work-filters input[type="search"],
    form#bookmark-filters input[type="text"],
    form#bookmark-filters input[type="search"] {
      background: #fdf6e3 !important;
      color: #586e75 !important;
      border-color: rgba(88,110,117,0.3) !important;
    }
    /* User dashboard / profile sidebar */
    .sidebar, .sidebar .module, .sidebar li, .sidebar ul {
      background: #fdf6e3 !important;
    }
    /* Dashboard main areas */
    html body.ao3t-user-dashboard #outer,
    html body.ao3t-user-dashboard #inner,
    html body.ao3t-user-dashboard #main {
      background: #fdf6e3 !important;
      background-image: none !important;
    }
    html body.ao3t-user-dashboard #main .module,
    html body.ao3t-user-dashboard #main .module.group,
    html body.ao3t-user-dashboard #main fieldset,
    html body.ao3t-user-dashboard #main ol,
    html body.ao3t-user-dashboard #main ul:not(.navigation):not(.actions),
    html body.ao3t-user-dashboard #main dl {
      background-color: #eee8d5 !important;
      background-image: none !important;
      color: #586e75 !important;
    }
    html body.ao3t-user-dashboard #main li.work.blurb.group,
    html body.ao3t-user-dashboard #main li.bookmark.blurb.group,
    html body.ao3t-user-dashboard #main li.series.blurb.group {
      background: #eee8d5 !important;
      border: 0 !important;
      box-shadow: none !important;
    }
    html body.ao3t-user-dashboard #main li.work.blurb.group + li.work.blurb.group,
    html body.ao3t-user-dashboard #main li.bookmark.blurb.group + li.bookmark.blurb.group,
    html body.ao3t-user-dashboard #main li.series.blurb.group + li.series.blurb.group {
      border-top: 2px solid #fdf6e3 !important;
    }
    /* Current dashboard/profile tab should use the light theme accent instead of AO3's default highlight */
    html body.ao3t-user-dashboard #dashboard .navigation.actions a.current,
    html body.ao3t-user-dashboard #dashboard .navigation.actions a.current:visited,
    html body.ao3t-user-dashboard #dashboard .navigation.actions span.current,
    html body.ao3t-user-dashboard #main ul.navigation.actions a.current,
    html body.ao3t-user-dashboard #main ul.navigation.actions a.current:visited,
    html body.ao3t-user-dashboard #main ul.navigation.actions span.current {
      background: #d3cbb9 !important;
      background-color: #d3cbb9 !important;
      color: #073642 !important;
      border-color: rgba(88,110,117,0.35) !important;
      box-shadow: none !important;
      text-shadow: none !important;
    }
    /* Site home/profile modules like Favorites, News, Unread Messages, Follow Us */
    body.home #main .module,
    body.home #main .module.group,
    body.home #main .favorite,
    body.home #main .favorite ul,
    body.home #main .favorite li,
    body.home #main .news,
    body.home #main .splash .module,
    body.home #main .listbox.group {
      background: #eee8d5 !important;
      background-color: #eee8d5 !important;
      background-image: none !important;
      box-shadow: none !important;
      border-color: rgba(88,110,117,0.15) !important;
    }
    body.home #main .module > h3,
    body.home #main .module > h3.heading,
    body.home #main .module h3.heading,
    body.home #main .module h3.landmark,
    body.home #main .module h3.landmark.heading,
    body.home #main .module > h4,
    body.home #main .module > h4.heading,
    body.home #main .module .header,
    body.home #main .module .header.module,
    body.home #main .listbox.group > h3,
    body.home #main .listbox.group > h3.heading,
    body.home #main .favorite h3,
    body.home #main .favorite h4 {
      background: #eee8d5 !important;
      background-color: #eee8d5 !important;
      background-image: none !important;
      color: #586e75 !important;
      border: none !important;
      box-shadow: none !important;
    }
    /* Footer */
    #footer, #outer #footer {
      background: #fdf6e3 !important;
      border-color: rgba(88,110,117,0.2) !important;
    }
    /* Inputs and buttons on AO3 */
    input[type="text"], input[type="search"], input[type="email"],
    input[type="password"], textarea, select {
      background: #fdf6e3 !important;
      color: #586e75 !important;
      border-color: rgba(88,110,117,0.3) !important;
    }
    /* Locked-work icon: visible on solarized base */
    .blurb h4 img[src*="locked"] {
      filter: brightness(0.6) sepia(0.2) !important;
      opacity: 0.75 !important;
    }

    /* Issue 1: Action/navigation buttons; flat Solarized Light style */
    .navigation.actions ul, .work.navigation ul,
    .navigation.actions li, .work.navigation li {
      background: transparent !important;
    }
    .navigation.actions li a,
    .work.navigation li a,
    .navigation.actions li a:link,
    .work.navigation li a:link,
    .navigation.actions li input[type="submit"],
    .navigation.actions li button:not([id^="aot-"]),
    .work.navigation li input[type="submit"],
    .work.navigation li button:not([id^="aot-"]) {
      background: #eee8d5 !important;
      border-color: rgba(88,110,117,0.25) !important;
      color: #586e75 !important;
      text-shadow: none !important;
      box-shadow: none !important;
    }
    .navigation.actions li a:hover,
    .work.navigation li a:hover,
    .navigation.actions li input[type="submit"]:hover,
    .navigation.actions li button:not([id^="aot-"]):hover,
    .work.navigation li input[type="submit"]:hover,
    .work.navigation li button:not([id^="aot-"]):hover {
      background: #d3cbb9 !important;
      color: #073642 !important;
    }
    #main ul.actions li a,
    #main ul.actions li a:link,
    #main ul.actions li input[type="submit"],
    #main ul.actions li button:not([id^="aot-"]),
    #kudos input[type="submit"], #kudos button,
    .kudos input[type="submit"], .kudos button,
    #new_kudo input[type="submit"],
    .bookmark-form input[type="submit"], .bookmark-form button,
    #comments input[type="submit"], #comments button,
    #add_comment_placeholder input[type="submit"],
    #add_comment_placeholder button,
    .actions input[type="submit"],
    .actions button:not([id^="aot-"]),
    .actions a, .actions a:link {
      background: #eee8d5 !important;
      border-color: rgba(88,110,117,0.25) !important;
      color: #586e75 !important;
      text-shadow: none !important;
      box-shadow: none !important;
    }
    #main ul.actions li a:hover,
    #main ul.actions li input[type="submit"]:hover,
    #main ul.actions li button:not([id^="aot-"]):hover,
    #kudos input[type="submit"]:hover, #kudos button:hover,
    .bookmark-form input[type="submit"]:hover,
    .actions input[type="submit"]:hover,
    .actions button:not([id^="aot-"]):hover,
    .actions a:hover {
      background: #d3cbb9 !important;
      color: #073642 !important;
    }
    /* Current page indicator in navigation */
    #main ul.navigation.actions a.current,
    #main ul.navigation.actions a.current:visited,
    #main ul.navigation.actions span.current,
    #main ul.actions.navigation a.current,
    #main ul.actions.navigation a.current:visited,
    #main ul.actions.navigation span.current {
      background: #d3cbb9 !important;
      color: #073642 !important;
      border-color: rgba(88,110,117,0.35) !important;
    }

    /* Issue 7 (part A): Pagination buttons */
    ol.pagination li { background: transparent !important; }
    ol.pagination li a, ol.pagination li a:link {
      background: #eee8d5 !important;
      border-color: rgba(88,110,117,0.25) !important;
      color: #586e75 !important;
      text-shadow: none !important;
      box-shadow: none !important;
    }
    ol.pagination li a:visited { color: #586e75 !important; }
    ol.pagination li a:hover {
      background: #d3cbb9 !important;
      color: #073642 !important;
    }
    ol.pagination li span.current {
      background: #d3cbb9 !important;
      color: #073642 !important;
      border-color: rgba(88,110,117,0.35) !important;
    }
    ol.pagination li.gap { color: #93a1a1 !important; background: transparent !important; }

    /* Issue 2: Work metadata group; remove gray boxed background */
    .work.meta.group,
    .work.meta.group dl,
    .work.meta.group dt,
    .work.meta.group dd,
    .work.meta.group dd.tags {
      background: transparent !important;
      background-color: transparent !important;
      box-shadow: none !important;
    }

    /* Issues 3 & 4: Summary/Notes highlights; remove everywhere */
    .preface .summary,
    .preface .summary .module,
    .preface .notes,
    .preface .notes .module,
    .preface .module.summary,
    .preface .module.notes,
    #workskin .preface .summary,
    #workskin .preface .notes,
    #chapters .preface .summary,
    #chapters .preface .notes,
    .chapter.preface .notes,
    .chapter.preface .summary,
    blockquote.userstuff,
    .userstuff.module {
      background: transparent !important;
      background-color: transparent !important;
      box-shadow: none !important;
    }

    /* Issue 5: Main work text body; remove darker background */
    #chapters *, #workskin * {
      background-color: #fdf6e3 !important;
    }
    /* Restore links and interactive elements inside the reading area */
    #chapters a, #workskin a,
    #chapters a:link, #workskin a:link { color: #268bd2 !important; background-color: transparent !important; }
    #chapters a:visited, #workskin a:visited { color: #2aa198 !important; background-color: transparent !important; }
    #chapters a:hover, #workskin a:hover { color: #b58900 !important; }
    /* Restore tag chips inside chapters */
    #chapters a.tag, #workskin a.tag { background: transparent !important; color: #586e75 !important; }

    /* Issue 8: Listing page; remove darker highlight from title/author/fandom/tags */
    a.tag { background: transparent !important; }
    li.work.blurb.group .header.module,
    li.bookmark.blurb.group .header.module {
      background: #eee8d5 !important;
    }

    /* Issue 7 (part B): Listing page heading highlight and navigation */
    h1, h2, h3, h4, h5, h6 { color: #586e75 !important; }
    h2.heading, h3.heading, h4.heading, h5.heading {
      background: transparent !important;
      background-color: transparent !important;
    }
    #main ul.navigation.actions,
    #main ul.navigation.actions > li.module,
    #main ul.navigation.actions > li.module.group {
      background: #fdf6e3 !important;
      background-color: #fdf6e3 !important;
    }
    #main .module:has(ul.navigation.actions) {
      background: #fdf6e3 !important;
      background-color: #fdf6e3 !important;
    }

    /* Stats bar text */
    .stats dd, .stats dt { color: #586e75 !important; }

    /* Issue 9: Footer; nuke remaining list-item backgrounds */
    #footer li,
    #footer ul li,
    #footer ol li,
    #footer ul.group li,
    #footer #customize li,
    #footer #customize ul,
    #footer #customize ul li {
      background: transparent !important;
      background-color: transparent !important;
      background-image: none !important;
    }
    #footer #customize li a,
    #footer #customize li a:link,
    #footer #customize li a:visited {
      background: transparent !important;
      color: #586e75 !important;
    }
    #footer #customize li a:hover {
      background: rgba(88,110,117,0.08) !important;
      color: #268bd2 !important;
    }

    /* Issue 9: Footer; full override */
    #footer {
      background: #fdf6e3 !important;
      background-color: #fdf6e3 !important;
      border-top: 1px solid rgba(88,110,117,0.2) !important;
      color: #586e75 !important;
    }
    #footer.region,
    #footer .module,
    #footer .module.group,
    #footer li.module,
    #footer li.module.group,
    #footer ul.navigation.actions,
    #footer ul.navigation.actions > li,
    #footer h3.landmark,
    #footer h4,
    #footer h4.heading,
    #footer ul.menu,
    #footer ul.menu > li {
      background: #fdf6e3 !important;
      background-color: #fdf6e3 !important;
      background-image: none !important;
      box-shadow: none !important;
    }
    #footer a, #footer a:link {
      background: transparent !important;
      color: #586e75 !important;
    }
    #footer a:visited {
      background: transparent !important;
      color: #93a1a1 !important;
    }
    #footer a:hover {
      background: transparent !important;
      color: #268bd2 !important;
    }
    #footer ul.menu li a,
    #footer ul.menu a,
    #footer ul.navigation.actions ul.menu li a {
      background: transparent !important;
      border-color: transparent !important;
      box-shadow: none !important;
      color: #586e75 !important;
    }
    #footer ul.menu li a:visited { color: #93a1a1 !important; }
    #footer ul.menu li a:hover {
      background: rgba(88,110,117,0.08) !important;
      color: #268bd2 !important;
    }
    #footer ul.menu input[type="submit"],
    #footer ul.menu button,
    #footer li.module input[type="submit"],
    #footer li.module button {
      background: transparent !important;
      border-color: rgba(88,110,117,0.2) !important;
      color: #586e75 !important;
      box-shadow: none !important;
    }
    #footer ul.menu input[type="submit"]:hover,
    #footer ul.menu button:hover {
      background: rgba(88,110,117,0.08) !important;
      color: #268bd2 !important;
    }

    /* Issue 10: Scrollbar; warm Solarized palette */
    * { scrollbar-color: #93a1a1 #fdf6e3; }
    ::-webkit-scrollbar { background: #fdf6e3; width: 8px; height: 8px; }
    ::-webkit-scrollbar-thumb { background: #93a1a1; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #657b83; }
  `;
