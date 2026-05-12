// CSS for AO3_DARK_CSS — loaded before content.js via manifest.
// Edit CSS here; the variable is consumed directly in content.js.
globalThis.AO3TrackerDarkCSS = `
    /* --- AO3 Tracker: Page Dark Mode --- */
    html, body {
      background: #002b36 !important;
      color: #839496 !important;
    }
    #header {
      background: #073642 !important;
      background-image: none !important;
      border-bottom: 1px solid rgba(131,148,150,0.14) !important;
      box-shadow: none !important;
    }
    /* Strip AO3 default header chrome: gradient/inset bands (dark ?lowlight? after About / actions) */
    #header.region,
    #header #login,
    #header .heading,
    #header h1,
    #header h2,
    #header h3,
    #header ul.actions,
    #header .actions,
    #header #dashboard,
    #header nav,
    #header .primary.navigation,
    #header .secondary.navigation,
    #header fieldset {
      box-shadow: none !important;
      background-image: none !important;
      text-shadow: none !important;
    }
    /* One flat header band (fixes slightly different strip between nav and search) */
    #header.region,
    #header h1,
    #header h1.heading,
    #header .heading,
    #header #dashboard,
    #header #login,
    #header fieldset,
    #header .search fieldset,
    #header > ul,
    #header .menu,
    #header .menu.primary,
    #header .secondary {
      background: #073642 !important;
      background-color: #073642 !important;
    }
    /* AO3 logo: plate matches header bar (Base02), not main body (Base03) */
    #header .heading img,
    #header h1 img,
    #header .heading a img,
    #header h1 a img {
      background-color: #073642 !important;
      padding: 0 !important;
      border-radius: 2px;
      vertical-align: middle;
      filter: brightness(0.96) contrast(1.02);
    }
    /* Userpic beside username (#dashboard) ? plate matches header Base02; brighten so it reads on dark strip */
    #dashboard a[href*="/users/"] img,
    #header #dashboard a[href*="/users/"] img,
    #header .user img,
    #header .greeting img {
      background-color: #073642 !important;
      background: #073642 !important;
      padding: 0 !important;
      border-radius: 3px;
      vertical-align: middle;
      box-shadow: none !important;
      border: none !important;
      filter: brightness(1.38) contrast(1.12) saturate(0.96)
        drop-shadow(0 0 0.75px rgba(147,161,161,0.35));
    }
    /* Default AO3 placeholder / skin icons (dark art on light) - light glyph on dark header */
    #dashboard a[href*="/users/"] img[src*="skins/default"],
    #dashboard a[href*="/users/"] img[src*="icon_user"],
    #dashboard a[href*="/users/"] img[src*="placeholder"] {
      filter: brightness(0) invert(0.88) contrast(1.08) !important;
    }
    /* Username / greeting: muted grey (AO3 often uses near-white here) */
    #header .user,
    #header .user a,
    #header .user a:link,
    #header .greeting,
    #header .greeting a,
    #header .greeting a:link,
    #header #login a,
    #header #login a:link {
      color: #93a1a1 !important;
    }
    #header .user a:hover,
    #header .greeting a:hover,
    #header #login a:hover {
      color: #839496 !important;
    }
    /* Header search: dark mode needs explicit control or AO3's native search skin persists */
    #header .search input[type="text"],
    #header .search input[type="search"],
    #header #search input[type="text"],
    #header #search input[type="search"],
    #header form[role="search"] input[type="text"],
    #header form[role="search"] input[type="search"],
    #header input[name="query"] {
      background: #002b36 !important;
      background-color: #002b36 !important;
      border: 1px solid rgba(131,148,150,0.28) !important;
      color: #93a1a1 !important;
      -webkit-text-fill-color: #93a1a1 !important;
      box-shadow: none !important;
      text-shadow: none !important;
    }
    #header .search input::placeholder,
    #header #search input::placeholder,
    #header form[role="search"] input::placeholder,
    #header input[name="query"]::placeholder {
      color: #657b83 !important;
      opacity: 1 !important;
    }
    #header .search input[type="submit"],
    #header .search button,
    #header #search input[type="submit"],
    #header #search button,
    #header form[role="search"] button[type="submit"] {
      background: #073642 !important;
      background-color: #073642 !important;
      border: 1px solid rgba(131,148,150,0.25) !important;
      color: #93a1a1 !important;
      text-shadow: none !important;
      box-shadow: none !important;
      -webkit-appearance: none !important;
      appearance: none !important;
    }
    #header .search input[type="submit"]:hover,
    #header .search button:hover,
    #header #search input[type="submit"]:hover,
    #header #search button:hover,
    #header form[role="search"] button[type="submit"]:hover {
      background: #0b4a57 !important;
      color: #d5e4e8 !important;
      border-color: rgba(38,139,210,0.35) !important;
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
      box-shadow: 0 0 0 2px rgba(38,139,210,0.2) !important;
    }
    #header .search input:-webkit-autofill,
    #header #search input:-webkit-autofill,
    #header form[role="search"] input:-webkit-autofill {
      -webkit-box-shadow: 0 0 0 40px #002b36 inset !important;
      box-shadow: 0 0 0 40px #002b36 inset !important;
      -webkit-text-fill-color: #93a1a1 !important;
      caret-color: #93a1a1 !important;
    }
    #header .primary.navigation,
    #header .secondary.navigation,
    #header .primary.navigation li,
    #header .secondary.navigation li,
    #header .primary.navigation ul,
    #header .secondary.navigation ul,
    #header nav,
    #header nav ul,
    #header nav li,
    #header .dropdown-menu,
    #header .menu,
    #header form,
    #header form *,
    #header .search,
    #header .search *,
    #header .actions,
    #header .actions *,
    #header .user,
    #header .user *,
    #header .greeting,
    #header .greeting * {
      background: #073642 !important;
      background-color: #073642 !important;
    }
    /* Tracker page theme pill: dark mode only supplies color tokens; layout lives in AO3_PILL_LAYOUT_CSS */
    #aot-page-theme-switch {
      --aot-pill-bg: rgba(7, 54, 66, 0.5);
      --aot-pill-border: rgba(181, 137, 0, 0.35);
      --aot-pill-text: #b58900;
      --aot-pill-hover-bg: rgba(131, 148, 150, 0.2);
      --aot-pill-hover-text: #dcb678;
      --aot-pill-shadow: 0 4px 18px rgba(0, 0, 0, 0.35);
    }
    #header .primary.navigation li a,
    #header .secondary.navigation li a,
    #header .primary.navigation li.dropdown a,
    #header .secondary.navigation li.dropdown a {
      color: #93a1a1 !important;
      background: transparent !important;
    }
    #header .primary.navigation li a:hover,
    #header .secondary.navigation li a:hover {
      color: #839496 !important;
      background: rgba(147,161,161,0.12) !important;
    }
    #header .primary.navigation li.current a {
      color: #268bd2 !important;
    }
    /* Site search: Base03 field on Base02 header (AO3 uses type=search + role=search; plain #header form * was hiding it) */
    #header .search input[type="text"],
    #header .search input[type="search"],
    #header #search input[type="text"],
    #header #search input[type="search"],
    #header form[role="search"] input[type="text"],
    #header form[role="search"] input[type="search"],
    #header input[name="query"] {
      background: #002b36 !important;
      background-color: #002b36 !important;
      border: 1px solid rgba(131,148,150,0.42) !important;
      color: #839496 !important;
      -webkit-text-fill-color: #839496 !important;
    }
    #header .search input::placeholder,
    #header #search input::placeholder,
    #header form[role="search"] input::placeholder,
    #header input[name="query"]::placeholder {
      color: rgba(147,161,161,0.88) !important;
      opacity: 1 !important;
    }
    /* Search submit: same treatment as chapter nav + comment actions (Base02 fill, Base01 hover) */
    #header .search input[type="submit"],
    #header .search button,
    #header #search input[type="submit"],
    #header #search button,
    #header form[role="search"] button[type="submit"] {
      background: #073642 !important;
      border: 1px solid rgba(131,148,150,0.2) !important;
      color: #93a1a1 !important;
      text-shadow: none !important;
      box-shadow: none !important;
    }
    #header .search input[type="submit"]:hover,
    #header .search button:hover,
    #header #search input[type="submit"]:hover,
    #header #search button:hover,
    #header form[role="search"] button[type="submit"]:hover {
      background: #586e75 !important;
      color: #839496 !important;
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
      box-shadow: 0 0 0 2px rgba(38,139,210,0.28) !important;
    }
    /* WebKit autofill can paint a light box and hide dark-mode text */
    #header .search input:-webkit-autofill,
    #header #search input:-webkit-autofill,
    #header form[role="search"] input:-webkit-autofill {
      -webkit-box-shadow: 0 0 0 40px #002b36 inset !important;
      box-shadow: 0 0 0 40px #002b36 inset !important;
      -webkit-text-fill-color: #839496 !important;
      caret-color: #839496 !important;
    }
    #main,
    #main > div,
    #outer,
    #inner {
      background: #002b36 !important;
      background-image: none !important;
      box-shadow: none !important;
      color: #839496 !important;
    }
    #footer {
      background: #073642 !important;
      border-top: 1px solid rgba(131,148,150,0.14) !important;
      color: #93a1a1 !important;
    }
    #footer a { color: #93a1a1 !important; }
    /* Footer columns use li.module ? global .module / .module h4 was Base03 inside Base02 #footer */
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
      background: #073642 !important;
      background-color: #073642 !important;
      background-image: none !important;
      box-shadow: none !important;
    }
    #footer ul.menu li a,
    #footer ul.menu a,
    #footer ul.navigation.actions ul.menu li a {
      background: transparent !important;
      background-color: transparent !important;
      border-color: transparent !important;
      box-shadow: none !important;
      color: #93a1a1 !important;
    }
    #footer ul.menu li a:hover {
      background: rgba(38,139,210,0.12) !important;
      color: #93a1a1 !important;
    }
    #footer ul.menu input[type="submit"],
    #footer ul.menu button,
    #footer li.module input[type="submit"],
    #footer li.module button {
      background: transparent !important;
      background-color: transparent !important;
      border-color: rgba(131,148,150,0.2) !important;
      color: #93a1a1 !important;
      box-shadow: none !important;
    }
    #footer ul.menu input[type="submit"]:hover,
    #footer ul.menu button:hover {
      background: rgba(38,139,210,0.12) !important;
      color: #93a1a1 !important;
    }
    /* Work listing / blurbs */
    li.work.blurb.group,
    li.bookmark.blurb.group,
    li.series.blurb.group,
    li.collection.blurb.group,
    li.user.blurb.group {
      background: #073642 !important;
      background-color: #073642 !important;
      background-image: none !important;
      border-color: rgba(131,148,150,0.14) !important;
    }
    li.work.blurb.group:hover,
    li.bookmark.blurb.group:hover {
      background: #073642 !important;
    }
    .blurb h4 a, .blurb h4 a:link,
    .blurb .heading a, .blurb .heading a:link {
      color: #268bd2 !important;
    }
    .blurb h4 a:visited,
    .blurb .heading a:visited {
      color: #2aa198 !important;
    }
    .blurb .fandoms a,
    .blurb .tags a {
      color: #93a1a1 !important;
    }
    .blurb .tags a:hover { color: #268bd2 !important; }
    .blurb p.summary { color: #93a1a1 !important; }
    dl.stats { color: #93a1a1 !important; }
    dl.stats a { color: #268bd2 !important; }
    /* Work page: all content boxes match background */
    #workskin,
    #workskin *,
    #workskin *::before,
    #workskin *::after,
    .userstuff,
    .userstuff *,
    .chapter,
    .chapter > *,
    #chapters,
    #chapters > *,
    #chapters > * > *,
    div#chapters div,
    div#workskin div,
    div.userstuff,
    div.userstuff > *,
    .chapter-text,
    .chapter-text * {
      background: #002b36 !important;
      color: #839496 !important;
    }
    /* Re-apply link colours after the wildcard above */
    #workskin a, #workskin a:link,
    .userstuff a, .userstuff a:link,
    #chapters a, #chapters a:link {
      color: #268bd2 !important;
      background: transparent !important;
    }
    #workskin a:visited, .userstuff a:visited, #chapters a:visited { color: #2aa198 !important; }
    /* Listing blurbs: summary blockquote ? Base02 on blockquote AND all inlines (em/strong/etc.); global .userstuff * alone leaves Base03 patches */
    li.work.blurb.group blockquote.userstuff,
    li.work.blurb.group blockquote.userstuff *:not(a),
    li.bookmark.blurb.group blockquote.userstuff,
    li.bookmark.blurb.group blockquote.userstuff *:not(a),
    li.series.blurb.group blockquote.userstuff,
    li.series.blurb.group blockquote.userstuff *:not(a),
    li.collection.blurb.group blockquote.userstuff,
    li.collection.blurb.group blockquote.userstuff *:not(a) {
      background: #073642 !important;
      background-color: #073642 !important;
      color: #93a1a1 !important;
    }
    .notes,
    .notes .userstuff,
    .end.notes,
    .chapter.preface.group .notes,
    .chapter.postamble.group .notes {
      background: #002b36 !important;
      border-color: rgba(131,148,150,0.11) !important;
      color: #839496 !important;
    }
    .work.meta.group,
    .preface.group,
    .chapter.preface.group,
    .chapter.postamble.group,
    #workskin .preface,
    #workskin .chapter {
      background: #002b36 !important;
      border-color: rgba(131,148,150,0.11) !important;
    }
    .work.meta.group dd,
    .work.meta.group dt,
    .preface.group .heading,
    .chapter.preface.group .heading,
    .chapter.preface.group .byline {
      color: #93a1a1 !important;
    }
    .work.meta.group a,
    .preface.group a {
      color: #268bd2 !important;
    }
    .work.meta.group a:visited,
    .preface.group a:visited {
      color: #2aa198 !important;
    }
    /* Chapter/work nav action buttons (entire work, prev/next chapter, etc.) */
    .navigation.actions,
    .work.navigation,
    #chapters .navigation.actions,
    #workskin .navigation.actions {
      background: transparent !important;
    }
    .navigation.actions ul,
    .work.navigation ul {
      background: transparent !important;
    }
    .navigation.actions li,
    .work.navigation li {
      background: transparent !important;
    }
    .navigation.actions li a,
    .work.navigation li a,
    .navigation.actions li a:link,
    .work.navigation li a:link,
    .navigation.actions li input[type="submit"],
    .navigation.actions li button:not(.aot-page-theme-seg),
    .work.navigation li input[type="submit"],
    .work.navigation li button:not(.aot-page-theme-seg) {
      background: #073642 !important;
      border-color: rgba(131,148,150,0.2) !important;
      color: #93a1a1 !important;
    }
    .navigation.actions li a:hover,
    .work.navigation li a:hover,
    .navigation.actions li input[type="submit"]:hover,
    .navigation.actions li button:not(.aot-page-theme-seg):hover,
    .work.navigation li input[type="submit"]:hover,
    .work.navigation li button:not(.aot-page-theme-seg):hover {
      background: #586e75 !important;
      color: #839496 !important;
    }
    /* Pressed / keyboard focus: darker than hover (AO3 defaults and :hover can read as ?bright? on click) */
    .navigation.actions li a:active,
    .work.navigation li a:active,
    .navigation.actions li a:focus-visible,
    .work.navigation li a:focus-visible {
      background: #073642 !important;
      color: #93a1a1 !important;
      border-color: rgba(131,148,150,0.28) !important;
    }
    .navigation.actions li a,
    .navigation.actions li button:not(.aot-page-theme-seg) {
      -webkit-tap-highlight-color: rgba(7, 54, 66, 0.45) !important;
    }
    /* Bottom action buttons (kudos, bookmark, mark as read, comments, top/prev/next) */
    #main ul.actions li a,
    #main ul.actions li a:link,
    #main ul.actions li input[type="submit"],
    #main ul.actions li button:not(.aot-page-theme-seg),
    #kudos input[type="submit"],
    #kudos button,
    .kudos input[type="submit"],
    .kudos button,
    #new_kudo input[type="submit"],
    .bookmark-form input[type="submit"],
    .bookmark-form button,
    #comments input[type="submit"],
    #comments button,
    #add_comment_placeholder input[type="submit"],
    #add_comment_placeholder button,
    .actions input[type="submit"],
    .actions button:not(.aot-page-theme-seg),
    .actions a,
    .actions a:link {
      background: #073642 !important;
      border-color: rgba(131,148,150,0.2) !important;
      color: #93a1a1 !important;
      text-shadow: none !important;
      box-shadow: none !important;
    }
    #main ul.actions li a:hover,
    #main ul.actions li input[type="submit"]:hover,
    #main ul.actions li button:not(.aot-page-theme-seg):hover,
    #kudos input[type="submit"]:hover,
    #kudos button:hover,
    .bookmark-form input[type="submit"]:hover,
    .actions input[type="submit"]:hover,
    .actions button:not(.aot-page-theme-seg):hover,
    .actions a:hover {
      background: #586e75 !important;
      color: #839496 !important;
    }
    #main ul.actions li a:active,
    #main ul.actions li input[type="submit"]:active,
    #main ul.actions li button:not(.aot-page-theme-seg):active,
    #main ul.actions li a:focus-visible,
    #main ul.actions li button:focus-visible,
    #kudos input[type="submit"]:active,
    #kudos button:active,
    .bookmark-form input[type="submit"]:active,
    .actions input[type="submit"]:active,
    .actions button:not(.aot-page-theme-seg):active,
    .actions a:active,
    .actions a:focus-visible {
      background: #073642 !important;
      color: #93a1a1 !important;
      border-color: rgba(131,148,150,0.28) !important;
    }
    #main ul.navigation.actions a.current,
    #main ul.navigation.actions a.current:visited,
    #main ul.navigation.actions span.current,
    #main ul.actions.navigation a.current,
    #main ul.actions.navigation a.current:visited,
    #main ul.actions.navigation span.current {
      background: #073642 !important;
      color: #839496 !important;
      border-color: rgba(131,148,150,0.35) !important;
    }
    #main ul.actions li a,
    #main ul.actions li button {
      -webkit-tap-highlight-color: rgba(7, 54, 66, 0.45) !important;
    }
    /* Dashboard nav (top strip; sibling of #header on AO3) */
    #dashboard {
      background: transparent !important;
      background-image: none !important;
      box-shadow: none !important;
      filter: none !important;
    }
    #dashboard li a { color: #268bd2 !important; }
    #dashboard li a:hover { background: rgba(38,139,210,0.12) !important; }
    /* Left column #dashboard (Choices / Pitch / Switch): single Base02 slab ? global .navigation.actions li a was painting each link Base02 on transparent/Base03, so layers looked stacked/overlapping */
    html body[data-ao3-dark="1"] #inner #dashboard {
      background: #073642 !important;
      background-color: #073642 !important;
      background-image: none !important;
      box-shadow: none !important;
      /* Dark Base03 gutter on the left (#inner) so the light nav reads as a card, not edge-to-edge */
      margin-left: 10px !important;
      border-radius: 0 4px 4px 0 !important;
      box-sizing: border-box !important;
    }
    html body[data-ao3-dark="1"] #inner #dashboard h4.landmark.heading {
      background: #073642 !important;
      background-color: #073642 !important;
      color: #93a1a1 !important;
      margin: 0 !important;
      padding: 0.4em 0.65em 0.15em !important;
      border: none !important;
      box-shadow: none !important;
    }
    html body[data-ao3-dark="1"] #inner #dashboard h4.landmark.heading:first-child {
      padding-top: 0.5em !important;
    }
    html body[data-ao3-dark="1"] #inner #dashboard ul.navigation.actions,
    html body[data-ao3-dark="1"] #inner #dashboard ul.navigation.actions > li {
      background: #073642 !important;
      background-color: #073642 !important;
      background-image: none !important;
      box-shadow: none !important;
    }
    html body[data-ao3-dark="1"] #inner #dashboard ul.navigation.actions {
      margin: 0 0 0.35em 0 !important;
      padding: 0 0.4em 0.35em !important;
      border: none !important;
    }
    html body[data-ao3-dark="1"] #inner #dashboard ul.navigation.actions > li {
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
    }
    html body[data-ao3-dark="1"] #inner #dashboard .navigation.actions li a,
    html body[data-ao3-dark="1"] #inner #dashboard .navigation.actions li a:link,
    html body[data-ao3-dark="1"] #inner #dashboard .navigation.actions li input[type="submit"],
    html body[data-ao3-dark="1"] #inner #dashboard .navigation.actions li button:not(.aot-page-theme-seg) {
      background: transparent !important;
      background-color: transparent !important;
      border-color: rgba(131,148,150,0.16) !important;
      box-shadow: none !important;
    }
    html body[data-ao3-dark="1"] #inner #dashboard .navigation.actions li a:hover,
    html body[data-ao3-dark="1"] #inner #dashboard .navigation.actions li input[type="submit"]:hover,
    html body[data-ao3-dark="1"] #inner #dashboard .navigation.actions li button:not(.aot-page-theme-seg):hover {
      background: rgba(38,139,210,0.14) !important;
      background-color: rgba(38,139,210,0.14) !important;
      color: #93a1a1 !important;
    }
    html body[data-ao3-dark="1"] #inner #dashboard .navigation.actions li a:active,
    html body[data-ao3-dark="1"] #inner #dashboard .navigation.actions li a:focus-visible,
    html body[data-ao3-dark="1"] #inner #dashboard .navigation.actions li input[type="submit"]:active,
    html body[data-ao3-dark="1"] #inner #dashboard .navigation.actions li button:focus-visible {
      background: rgba(38,139,210,0.1) !important;
      color: #93a1a1 !important;
    }
    html body[data-ao3-dark="1"] #inner #dashboard .navigation.actions a.current,
    html body[data-ao3-dark="1"] #inner #dashboard .navigation.actions a.current:visited,
    html body[data-ao3-dark="1"] #inner #dashboard .navigation.actions span.current {
      background: rgba(147,161,161,0.14) !important;
      color: #839496 !important;
      border-color: rgba(131,148,150,0.22) !important;
    }
    /* Modules / panels; exclude blurb cards and their .header.module children */
    .module:not(.blurb):not(.group):not(.header),
    #main .module:not(.blurb):not(.group):not(.header) {
      background: #002b36 !important;
      border-color: rgba(131,148,150,0.14) !important;
    }
    .module:not(.blurb):not(.group):not(.header) h3,
    .module:not(.blurb):not(.group):not(.header) h4,
    .module:not(.blurb):not(.group):not(.header) .heading {
      color: #839496 !important;
      background: #002b36 !important;
      border-color: rgba(131,148,150,0.14) !important;
    }
    /* Work/bookmark/series listing blurbs: inner .header.module matches .module ? don?t paint title row Base03 inside Base02 blurb */
    li.work.blurb.group .header.module,
    li.work.blurb.group .header.module h4,
    li.work.blurb.group .header.module h5.fandoms,
    li.bookmark.blurb.group .header.module,
    li.bookmark.blurb.group .header.module h4,
    li.bookmark.blurb.group .header.module h5.fandoms,
    li.series.blurb.group .header.module,
    li.series.blurb.group .header.module h4,
    li.series.blurb.group .header.module h5.fandoms,
    li.collection.blurb.group .header.module,
    li.collection.blurb.group .header.module h4,
    li.user.blurb.group .header.module,
    li.user.blurb.group .header.module h4 {
      background: #073642 !important;
      background-color: #073642 !important;
      background-image: none !important;
      color: #839496 !important;
      border-color: rgba(131,148,150,0.14) !important;
    }
    /* Restricted/locked work icon in blurb header */
    .blurb h4 img[src*="locked"],
    .blurb h4 img[src*="lock"],
    .blurb .heading img[src*="locked"],
    .blurb .heading img[src*="lock"],
    li.work.blurb.group h4 img,
    li.bookmark.blurb.group h4 img {
      filter: brightness(0) invert(0.65) sepia(0.3) saturate(1.5) hue-rotate(170deg) !important;
    }
    /* Left sidebar nav on user/profile pages */
    .sidebar, .sidebar .module, .sidebar li,
    .sidebar ul, .sidebar fieldset, .sidebar dl,
    .navigation.module, .navigation.module li,
    .navigation.module ul {
      background: #002b36 !important;
      background-color: #002b36 !important;
      background-image: none !important;
    }
    .sidebar li a, .navigation.module li a {
      color: #268bd2 !important;
      background: transparent !important;
    }
    .sidebar li a:hover, .navigation.module li a:hover {
      background: rgba(38,139,210,0.12) !important;
    }
    /* User / author dashboard (/users/?): Fandoms, Recent works, AO3 mark in main column */
    #main.home,
    #main.home .module,
    #main.home .module.group,
    #main.home .collection,
    #main.home .index,
    #main.home ol,
    #main.home .module ul,
    #main.home .favorite ul,
    #main.home fieldset ul,
    #main.home dl,
    #main.home dt,
    #main.home dd,
    #main.home fieldset,
    #main.home .favorite,
    #main.home .favorite ul,
    #main.home .favorite li,
    #main.home blockquote,
    #main.home .userstuff,
    #main.home .userstuff *:not(a),
    #main.home table,
    #main.home thead,
    #main.home tbody,
    #main.home tr,
    #main.home td,
    #main.home th,
    /* Fallback if skin omits .home on profile (Rails: body.users.show) */
    body.users.show #main .favorite,
    body.users.show #main .favorite ul,
    body.users.show #main .favorite li,
    body.users.show #main fieldset {
      background: #073642 !important;
      background-color: #073642 !important;
      background-image: none !important;
      color: #93a1a1 !important;
    }
    /* Visible divider between blurb cards on user profile page */
    #main.home ol.index li.blurb + li.blurb,
    #main.home ol.index li.work + li.work,
    #main.home ol.index li.work + li.blurb,
    #main.home ol.index li.blurb + li.work,
    #main.home ol.index li.bookmark + li.bookmark,
    #main.home ol.index li.series + li.series,
    body.users.show #main ol.index li.blurb + li.blurb,
    body.users.show #main ol.index li.work + li.work,
    body.users.show #main ol.index li.work + li.blurb,
    body.users.show #main ol.index li.blurb + li.work {
      border-top: 2px solid #002b36 !important;
    }
    #main.home h1,
    #main.home h2,
    #main.home h2.heading,
    #main.home h3,
    #main.home h3.heading,
    #main.home h4,
    #main.home h4.heading,
    #main.home .landmark.heading {
      background: transparent !important;
      background-color: transparent !important;
      color: #839496 !important;
    }
    /* AO3 mark beside pseud on profile ? same treatment as #header logo (invert was washing it out) */
    #main.home .heading img,
    #main.home .heading a img,
    #main.home h1.heading a img,
    #main.home h2.heading a img,
    #main.home h1 a img,
    #main.home h2 a img,
    #main.home a[href="/"] img,
    #main.home a[href="https://archiveofourown.org/"] img,
    #main.home a[href$="archiveofourown.org/"] img,
    #main.home p.icon img,
    #main.home .icon img {
      background-color: #073642 !important;
      filter: brightness(0.96) contrast(1.02) !important;
    }
    /* Listing pages: top strip (Works / Bookmarks / Favorite tag / RSS) ? li.module here was picking up lifted Base02 from .module; match flat #main Base03 */
    #main ul.navigation.actions,
    #main ul.navigation.actions > li.module,
    #main ul.navigation.actions > li.module.group {
      background: #002b36 !important;
      background-color: #002b36 !important;
    }
    #main .module:has(ul.navigation.actions) {
      background: #002b36 !important;
      background-color: #002b36 !important;
    }
    /* Advanced works search (/works/search): facet labels (dt/legend/label) ? Base01, beats AO3 ink on dt */
    form#new_work_search dt,
    form#new_work_search legend,
    form#new_work_search label {
      color: #93a1a1 !important;
    }
    /* Works/bookmarks index filters ? strongest rules are at end of this stylesheet (form#work-filters) */
    /* Notes and reading area modules override back to page background */
    .notes,
    .notes.module,
    .end.notes,
    .end.notes.module,
    .beginning.notes,
    .beginning.notes.module,
    #workskin .module,
    #chapters .module,
    .chapter .module,
    .chapter.preface.group .module,
    .chapter.postamble.group .module,
    .preface.group .module {
      background: #002b36 !important;
      background-color: #002b36 !important;
    }
    /* General text & headings */
    h1, h2, h3, h4, h5, h6 { color: #839496 !important; }
    a, a:link { color: #268bd2 !important; }
    a:visited { color: #2aa198 !important; }
    a:hover { color: #2aa198 !important; }
    /* Forms */
    input[type="text"], input[type="email"], input[type="password"],
    input[type="search"], input[type="url"], textarea, select {
      background: #073642 !important;
      border-color: rgba(131,148,150,0.2) !important;
      color: #839496 !important;
    }
    input[type="text"]:focus,
    input[type="search"]:focus,
    textarea:focus,
    select:focus {
      border-color: #268bd2 !important;
      outline: none !important;
      box-shadow: 0 0 0 2px rgba(38,139,210,0.28) !important;
    }
    /* Tables */
    table { border-color: rgba(131,148,150,0.14) !important; }
    th { background: #073642 !important; color: #839496 !important; border-color: rgba(131,148,150,0.14) !important; }
    td { border-color: rgba(131,148,150,0.11) !important; color: #93a1a1 !important; }
    tr:nth-child(even) td { background: rgba(147,161,161,0.04) !important; }
    /* Notices / alerts */
    .notice, .caution {
      background: #073642 !important;
      border-color: rgba(131,148,150,0.14) !important;
      color: #93a1a1 !important;
    }
    /* Tags (relationships, characters, additional tags, fandoms) ? handled at end */
    /* Kill any remaining highlights/gradients across the page */
    #main *:not(.ao3t-search-badge):not(.ao3t-work-meta-cat):not(.aot-custom-chip):not(.ao3t-search-chap):not(.ao3t-track-pill):not(.ao3t-badge-wrap):not([class*="ao3t-"]):not([class*="aot-"]):not([id*="ao3tracker"]):not(ol.pagination a):not(ol.pagination span):not(nav.pagy a):not(nav.pagy span),
    #workskin *:not([class*="ao3t-"]):not([class*="aot-"]),
    .userstuff *:not([class*="ao3t-"]):not([class*="aot-"]),
    #chapters *:not([class*="ao3t-"]):not([class*="aot-"]) {
      text-shadow: none !important;
      box-shadow: none !important;
    }
    /* Pagination */
    ol.pagination li a,
    ol.pagination li span {
      background: #073642 !important;
      border-color: rgba(131,148,150,0.14) !important;
      color: #93a1a1 !important;
    }
    /* Current page ? same accent family as the rest of the skin; barely-there inset so it reads ?selected? */
    #main ol.pagination li.current a,
    #main ol.pagination li.current span,
    ol.pagination li.current a,
    ol.pagination li.current span,
    ol.pagination a[aria-current="page"],
    nav.pagy a[aria-current="page"],
    nav.pagy a.current,
    nav.pagy a.active,
    .pagy a[aria-current="page"] {
      background: #268bd2 !important;
      border-color: rgba(38, 139, 210, 0.55) !important;
      color: #fdf6e3 !important;
      box-shadow: inset 0 1px 2px rgba(0, 43, 54, 0.35) !important;
    }
    /* Disabled Previous (page 1) ? no pill background */
    ol.pagination li:first-child span,
    ol.pagination li.previous span,
    ol.pagination span.previous {
      background: transparent !important;
    }
    /* Reading area */
    #chapters p,
    .userstuff p,
    .chapter p {
      color: #839496 !important;
    }
    /* Breadcrumb */
    .landmark.heading { color: #93a1a1 !important; }
    .landmark.heading a { color: #268bd2 !important; }
    /* Comments area */
    #comments_placeholder,
    #comments,
    .comment_list,
    ol.thread,
    ol.thread li,
    #comments ol,
    #comments ul,
    #comments li {
      background: #002b36 !important;
      background-color: #002b36 !important;
      background-image: none !important;
      border-color: rgba(131,148,150,0.11) !important;
    }
    /* Comment li: dark bg so indent gap between nested replies shows page color */
    li.comment, li.comment.odd, li.comment.even {
      background: #002b36 !important;
      background-color: #002b36 !important;
      background-image: none !important;
      border-color: rgba(131,148,150,0.14) !important;
    }
    /* Direct child div/article is the visible comment box ? lighter blue fills the whole box */
    li.comment > div,
    li.comment > article,
    li.comment > div.comment,
    .comment_list > li > div,
    #comments li.comment > div {
      background: #073642 !important;
      background-color: #073642 !important;
      background-image: none !important;
    }
    /* Everything inside that box inherits the lighter bg */
    li.comment > div *,
    li.comment > article * {
      background: #073642 !important;
      background-color: #073642 !important;
      background-image: none !important;
    }
    /* Let text/content layers sit transparently on the lighter comment box instead of repainting darker blocks */
    li.comment > div > *:not(.actions):not(form):not(fieldset),
    li.comment > article > *:not(.actions):not(form):not(fieldset),
    .comment .header,
    .comment .header *,
    .comment .userstuff,
    .comment .userstuff *,
    .comment blockquote,
    .comment blockquote *,
    .comment p,
    .comment h3,
    .comment h4,
    .comment h5,
    .comment .byline,
    .comment .posted,
    .comment .datetime,
    .comment .icon,
    .comment .icon *,
    .comment .title,
    .comment .title * {
      background: transparent !important;
      background-color: transparent !important;
      background-image: none !important;
      box-shadow: none !important;
      text-shadow: none !important;
    }
    .comment p,
    .comment .userstuff p { color: #93a1a1 !important; }
    .comment .header,
    li.comment > div .header { border-color: rgba(131,148,150,0.14) !important; }
    #kudos {
      background: #002b36 !important;
      border-color: rgba(131,148,150,0.11) !important;
      color: #93a1a1 !important;
    }
    /* comment reply/new comment form box */
    #new_comment_placeholder,
    #add_comment_placeholder,
    .comment-container,
    fieldset.comment {
      background: #073642 !important;
      border-color: rgba(131,148,150,0.14) !important;
    }
    fieldset, fieldset legend {
      background: #073642 !important;
      border-color: rgba(131,148,150,0.14) !important;
      color: #93a1a1 !important;
    }
    /* Work stats bar */
    .stats dd, .stats dt { color: #93a1a1 !important; }
    /* Scrollbar */
    * { scrollbar-color: #586e75 #073642; }
    ::-webkit-scrollbar { background: #073642; width: 8px; height: 8px; }
    ::-webkit-scrollbar-thumb { background: #586e75; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #657b83; }
    /* Force flat #002b36 on all reading area descendants (overrides .module etc.) */
    #chapters, #chapters *,
    #workskin, #workskin *,
    div.userstuff, div.userstuff *,
    .notes, .notes *,
    .end.notes, .end.notes *,
    .beginning.notes, .beginning.notes *,
    .chapter.preface.group, .chapter.preface.group *,
    .chapter.postamble.group, .chapter.postamble.group * {
      background-color: #002b36 !important;
    }
    /* Restore link/tag colours inside reading area */
    #chapters a, #workskin a, .userstuff a,
    .notes a, .chapter.preface.group a {
      background-color: transparent !important;
      color: #268bd2 !important;
    }
    #chapters a:visited, #workskin a:visited, .userstuff a:visited { color: #2aa198 !important; }
    #chapters a.tag, #workskin a.tag, .notes a.tag {
      background-color: #073642 !important;
      color: #268bd2 !important;
    }
    /* Preserve extension-injected pill colours */
    .ao3t-search-badge-want      { color: #5b21b6 !important; background-color: #f5f3ff !important; }
    .ao3t-search-badge-progress  { color: #0e7490 !important; background-color: #ecfeff !important; }
    .ao3t-search-badge-completed { color: #047857 !important; background-color: #ecfdf5 !important; }
    .ao3t-search-badge-rereading { color: #b45309 !important; background-color: #fffbeb !important; }
    .ao3t-search-badge-onhold    { color: #0369a1 !important; background-color: #f0f9ff !important; }
    .ao3t-search-badge-dnf       { color: #4b5563 !important; background-color: #f9fafb !important; }
    .ao3t-search-chap            { color: #0e7490 !important; background-color: #ecfeff !important; }
    .ao3t-track-pill             { color: #2563eb !important; background-color: #fff !important; }
    .ao3t-work-meta-cat          { background-color: color-mix(in srgb, var(--chip-color, #555550) 10%, #fff) !important; }
    /* FINAL: strip chip backgrounds on tag/meta text (not blurb required-tags; those use imageset sprites plus visually hidden .text) */
    dl.tags, dl.tags dt, dl.tags dd, dl.tags li,
    .tags ul, .tags li, .tags span,
    .work.meta.group dd, .work.meta.group dd li, .work.meta.group dd span {
      background: transparent !important;
      background-color: transparent !important;
      background-image: none !important;
      box-shadow: none !important;
      text-shadow: none !important;
      color: #268bd2 !important;
    }
    /* Listing blurbs: keep AO3?s four icon cells (rating/warning/category/complete); FINAL used to kill sprites and force link color onto .text */
    .blurb ul.required-tags li a span.text,
    .blurb ul.required-tags span.text {
      color: transparent !important;
      font-size: 0.001em !important;
      width: 0 !important;
      height: 0 !important;
      overflow: hidden !important;
    }
    /* Tag links (fandoms, relationships, characters, additional tags) ? flat, no chip */
    a.tag, a.tag:link, a.tag:visited,
    .work.meta.group a.tag, .blurb a.tag,
    .tags a, .tags a:link, .tags a:visited {
      background: transparent !important;
      background-color: transparent !important;
      background-image: none !important;
      border: none !important;
      box-shadow: none !important;
      color: #268bd2 !important;
    }
    a.tag:hover, .tags a:hover { color: #2aa198 !important; }

    /* Floating #ao3tracker-panel: do not inherit page dark chrome; match extension popup */
    #ao3tracker-panel:not(.aot-dark):not(.aot-sol-light) {
      background: #ffffff !important;
      color: #1a1a18 !important;
      border-color: rgba(0,0,0,0.12) !important;
    }
    #ao3tracker-panel:not(.aot-dark):not(.aot-sol-light) #aot-header,
    #ao3tracker-panel:not(.aot-dark):not(.aot-sol-light) #aot-tabs-wrap,
    #ao3tracker-panel:not(.aot-dark):not(.aot-sol-light) #aot-current-bar {
      background: #ffffff !important;
      border-color: rgba(0,0,0,0.09) !important;
    }
    #ao3tracker-panel:not(.aot-dark):not(.aot-sol-light) #aot-search-bar {
      background: #f8f8f7 !important;
      border-color: rgba(0,0,0,0.09) !important;
    }
    #ao3tracker-panel:not(.aot-dark):not(.aot-sol-light) #aot-search {
      background: #ffffff !important;
      border: 1px solid rgba(0,0,0,0.15) !important;
      border-radius: 7px !important;
      padding: 5px 9px !important;
      color: #1a1a18 !important;
      box-shadow: none !important;
    }
    #ao3tracker-panel:not(.aot-dark):not(.aot-sol-light) #aot-search::placeholder {
      color: #99998f !important;
    }
    #ao3tracker-panel:not(.aot-dark):not(.aot-sol-light) #aot-search:focus,
    #ao3tracker-panel:not(.aot-dark):not(.aot-sol-light) #aot-search:focus-visible {
      outline: none !important;
      border-color: #2563eb !important;
      box-shadow: 0 0 0 2px rgba(37,99,235,0.2) !important;
    }
    #ao3tracker-panel:not(.aot-dark):not(.aot-sol-light) .aot-srch-ico .ico {
      color: #99998f !important;
    }
    #ao3tracker-panel:not(.aot-dark):not(.aot-sol-light) a,
    #ao3tracker-panel:not(.aot-dark):not(.aot-sol-light) a:link {
      color: inherit !important;
    }
    #ao3tracker-panel:not(.aot-dark):not(.aot-sol-light) a:visited {
      color: inherit !important;
    }
    #ao3tracker-panel:not(.aot-dark):not(.aot-sol-light) #aot-title {
      color: #1a1a18 !important;
    }
    #ao3tracker-panel:not(.aot-dark):not(.aot-sol-light) #aot-current-title,
    #ao3tracker-panel:not(.aot-dark):not(.aot-sol-light) #aot-current-title:link,
    #ao3tracker-panel:not(.aot-dark):not(.aot-sol-light) #aot-current-title:visited {
      color: #1a1a18 !important;
    }
    #ao3tracker-panel:not(.aot-dark):not(.aot-sol-light) #aot-current-title:hover {
      color: #2563eb !important;
    }
    #ao3tracker-panel:not(.aot-dark):not(.aot-sol-light) .aot-card-title a,
    #ao3tracker-panel:not(.aot-dark):not(.aot-sol-light) .aot-card-title a:link,
    #ao3tracker-panel:not(.aot-dark):not(.aot-sol-light) .aot-card-title a:visited {
      color: #1a1a18 !important;
    }
    #ao3tracker-panel:not(.aot-dark):not(.aot-sol-light) .aot-card-title a:hover {
      color: #2563eb !important;
    }
    #ao3tracker-panel:not(.aot-dark):not(.aot-sol-light) .aot-card-author,
    #ao3tracker-panel:not(.aot-dark):not(.aot-sol-light) .aot-card-author .aot-author-link,
    #ao3tracker-panel:not(.aot-dark):not(.aot-sol-light) .aot-card-author .aot-author-link:visited {
      color: #99998f !important;
    }
      #ao3tracker-panel:not(.aot-dark):not(.aot-sol-light) .aot-card-author .aot-author-link:hover {
        color: #2563eb !important;
      }
    /* Top/right/bottom only ? do not set border-left or status stripes disappear */
    #ao3tracker-panel:not(.aot-dark):not(.aot-sol-light) .aot-card {
      background: #ffffff !important;
      border-top-color: rgba(0,0,0,0.09) !important;
      border-right-color: rgba(0,0,0,0.09) !important;
      border-bottom-color: rgba(0,0,0,0.09) !important;
    }
    #ao3tracker-panel:not(.aot-dark):not(.aot-sol-light) .aot-note-preview,
    #ao3tracker-panel:not(.aot-dark):not(.aot-sol-light) .aot-card-date,
    #ao3tracker-panel:not(.aot-dark):not(.aot-sol-light) .aot-wordcount {
      color: #99998f !important;
    }
    #ao3tracker-panel:not(.aot-dark):not(.aot-sol-light) #aot-list-wrap {
      background: transparent !important;
    }
    #ao3tracker-panel:not(.aot-dark):not(.aot-sol-light) textarea,
    #ao3tracker-panel:not(.aot-dark):not(.aot-sol-light) #aot-notes-text,
    #ao3tracker-panel:not(.aot-dark):not(.aot-sol-light) #aot-cat-name,
    #ao3tracker-panel:not(.aot-dark):not(.aot-sol-light) #aot-cat-hex {
      background: #f8f8f7 !important;
      border-color: rgba(0,0,0,0.15) !important;
      color: #1a1a18 !important;
    }
    #ao3tracker-panel:not(.aot-dark):not(.aot-sol-light) #aot-notes-text:focus,
    #ao3tracker-panel:not(.aot-dark):not(.aot-sol-light) #aot-cat-name:focus,
    #ao3tracker-panel:not(.aot-dark):not(.aot-sol-light) #aot-cat-hex:focus {
      border-color: #2563eb !important;
      background: #ffffff !important;
      box-shadow: none !important;
    }
    #ao3tracker-panel:not(.aot-dark):not(.aot-sol-light) #aot-list-wrap {
      scrollbar-color: #efefed #ffffff;
    }
    #ao3tracker-panel:not(.aot-dark):not(.aot-sol-light) #aot-list-wrap::-webkit-scrollbar {
      width: 4px;
      background: #ffffff;
    }
    #ao3tracker-panel:not(.aot-dark):not(.aot-sol-light) #aot-list-wrap::-webkit-scrollbar-thumb {
      background: #efefed;
      border-radius: 2px;
    }
    #ao3tracker-panel:not(.aot-dark):not(.aot-sol-light) #aot-list-wrap::-webkit-scrollbar-thumb:hover {
      background: #e5e5e3;
    }

    /* Dark tracker theme on dark page: global a/input must not override panel */
    #ao3tracker-panel.aot-dark input[type="text"]#aot-search,
    #ao3tracker-panel.aot-dark input[type="search"]#aot-search {
      background: #073642 !important;
      border: 1px solid rgba(131,148,150,0.2) !important;
      border-radius: 7px !important;
      padding: 5px 9px !important;
      color: #e5e7eb !important;
    }
    #ao3tracker-panel.aot-dark #aot-search:focus,
    #ao3tracker-panel.aot-dark #aot-search:focus-visible {
      outline: none !important;
      border-color: rgba(38,139,210,0.38) !important;
      box-shadow: 0 0 0 2px rgba(38,139,210,0.18) !important;
    }
    #ao3tracker-panel.aot-dark .aot-card-title a,
    #ao3tracker-panel.aot-dark .aot-card-title a:link,
    #ao3tracker-panel.aot-dark .aot-card-title a:visited {
      color: #e3dcc2 !important;
    }
    #ao3tracker-panel.aot-dark .aot-card-title a:hover {
      color: #93c5fd !important;
    }
    #ao3tracker-panel.aot-dark .aot-card-author .aot-author-link,
    #ao3tracker-panel.aot-dark .aot-card-author .aot-author-link:visited {
      color: rgba(229,231,235,0.86) !important;
    }
    #ao3tracker-panel.aot-dark .aot-card-author .aot-author-link:hover {
      color: #93c5fd !important;
    }
    #ao3tracker-panel.aot-dark textarea,
    #ao3tracker-panel.aot-dark #aot-notes-text,
    #ao3tracker-panel.aot-dark #aot-cat-name,
    #ao3tracker-panel.aot-dark #aot-cat-hex {
      background: #073642 !important;
      border-color: rgba(131,148,150,0.2) !important;
      color: #839496 !important;
    }
    #ao3tracker-panel.aot-dark textarea:focus,
    #ao3tracker-panel.aot-dark #aot-notes-text:focus,
    #ao3tracker-panel.aot-dark #aot-cat-name:focus,
    #ao3tracker-panel.aot-dark #aot-cat-hex:focus {
      border-color: #268bd2 !important;
      box-shadow: 0 0 0 2px rgba(38,139,210,0.28) !important;
    }
    #ao3tracker-panel.aot-dark #aot-list-wrap {
      scrollbar-color: #586e75 #073642;
    }
    #ao3tracker-panel.aot-dark #aot-list-wrap::-webkit-scrollbar {
      width: 4px;
      background: #073642;
    }
    #ao3tracker-panel.aot-dark #aot-list-wrap::-webkit-scrollbar-thumb {
      background: #586e75;
      border-radius: 2px;
    }
    #ao3tracker-panel.aot-dark #aot-list-wrap::-webkit-scrollbar-thumb:hover {
      background: #657b83;
    }
    /* Page dark toggle in #login: keep wrapper visible; component styling lives in AO3_PILL_LAYOUT_CSS */
    #header #login ul.actions li.aot-page-dark-li--login,
    #header ul.actions li.aot-page-dark-li--login {
      overflow: visible !important;
      position: relative;
      z-index: 20;
    }
    /* FINAL: works/bookmarks index filter forms (#work-filters / #bookmark-filters)
       AO3 skins set dark ink on span/div/label inside .filters; beat them with html body + universal (minus form controls). */
    html body form#work-filters,
    html body form#work-filters *:not(input):not(select):not(textarea):not(option):not(a),
    html body form#bookmark-filters,
    html body form#bookmark-filters *:not(input):not(select):not(textarea):not(option):not(a) {
      color: #93a1a1 !important;
    }
    html body form#work-filters input[type="submit"],
    html body form#bookmark-filters input[type="submit"],
    html body form#work-filters button,
    html body form#bookmark-filters button {
      color: #93a1a1 !important;
    }
    html body form#work-filters a,
    html body form#work-filters a:link,
    html body form#bookmark-filters a,
    html body form#bookmark-filters a:link {
      color: #268bd2 !important;
    }
    html body form#work-filters a:visited,
    html body form#bookmark-filters a:visited {
      color: #2aa198 !important;
    }
    html body form#work-filters a *,
    html body form#bookmark-filters a * {
      color: inherit !important;
    }
    /* Filter sidebar expand/collapse arrows ? these are GIF background images (.expander),
       so color won't help; use filter:invert to flip black arrows white */
    .filters .expander,
    form#work-filters .expander,
    form#bookmark-filters .expander {
      filter: invert(0.85) brightness(1.4) !important;
    }
    /* Pseudo-element arrows (fallback for themes that use ::before/::after) */
    html body form#work-filters dt::before,
    html body form#work-filters dt::after,
    html body form#work-filters legend::before,
    html body form#work-filters legend::after,
    html body form#work-filters summary::before,
    html body form#work-filters summary::after,
    html body form#bookmark-filters dt::before,
    html body form#bookmark-filters dt::after,
    html body form#bookmark-filters legend::before,
    html body form#bookmark-filters legend::after,
    html body form#bookmark-filters summary::before,
    html body form#bookmark-filters summary::after {
      color: #93a1a1 !important;
    }
    html body form#work-filters details > summary::marker,
    html body form#work-filters details > summary::-webkit-details-marker,
    html body form#bookmark-filters details > summary::marker,
    html body form#bookmark-filters details > summary::-webkit-details-marker {
      color: #93a1a1 !important;
    }
    /* User profile dashboard (/users/name, optional /en/?, /profile); markup varies and is URL-scoped via body.ao3t-user-dashboard */
    html body[data-ao3-dark="1"].ao3t-user-dashboard #outer,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #inner,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main {
      background: #002b36 !important;
      background-color: #002b36 !important;
      background-image: none !important;
    }
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main .module,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main .module.group,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main fieldset,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main fieldset *,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main .favorite,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main .favorite *,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main ol,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main ul:not(.navigation):not(.actions),
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main dl,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main dt,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main dd,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main .collection,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main .index,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main blockquote,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main table,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main thead,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main tbody,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main tr,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main th,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main td,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main .userstuff,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main .userstuff *:not(a) {
      background-color: #073642 !important;
      background-image: none !important;
      color: #93a1a1 !important;
      box-shadow: none !important;
    }
    /* #main ul.navigation.actions: Base03 for in-page tab strips; NOT the pseud/user header row (that uses the same classes ? see _header_navigation.html.erb) */
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main ul.navigation.actions,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main ul.navigation.actions > li,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main ul.actions.navigation {
      background: #002b36 !important;
      background-color: #002b36 !important;
    }
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main .primary.header.module ul.navigation.actions,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main .primary.header.module ul.navigation.actions > li {
      background: #073642 !important;
      background-color: #073642 !important;
      background-image: none !important;
    }
    /* Top-of-page title only ? do NOT force #main h3 transparent (skins paint .module h3.heading light grey) */
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main > h1,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main > h2 {
      background: transparent !important;
      background-color: transparent !important;
      color: #839496 !important;
    }
    /* Fandoms / Recent works / series / bookmarks: listbox uses h3 outside .module ? match panel headers */
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main .listbox.group > h3.heading,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main .listbox.group > h3 {
      background: #073642 !important;
      background-color: #073642 !important;
      background-image: none !important;
      color: #268bd2 !important;
      border: none !important;
      box-shadow: none !important;
    }
    /* Module panel headers ? Base02 bar; Solarized blue title text (Base03 #002b36 on Base02 is illegible) */
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main .module > h3,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main .module > h3.heading,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main .module h3.heading,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main .module > h4,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main .module h3.landmark,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main .module h3.landmark.heading,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main fieldset > legend {
      background: #073642 !important;
      background-color: #073642 !important;
      background-image: none !important;
      color: #268bd2 !important;
      border: none !important;
      box-shadow: none !important;
    }
    /* Pseud/profile title row ? Base02 like .module body (was Base03; left a dark ?frame? around Subscribe/Mute/Block) */
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main h2.heading,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main h2.heading a,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main .title .heading,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main .title .heading a {
      background: #073642 !important;
      background-color: #073642 !important;
      background-image: none !important;
      color: #839496 !important;
    }
    /* ul.actions excluded from bulk #main ul rule ? fill list/li so gaps aren?t Base03 behind the buttons */
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main ul.actions:not(.navigation),
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main ul.actions:not(.navigation) > li {
      background: #073642 !important;
      background-color: #073642 !important;
      background-image: none !important;
    }
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main .heading img,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main .heading a img,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main h1 img,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main h2 img,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main h1 a img,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main h2 a img,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main .heading a[href*="archiveofourown.org"] img,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main a[href="/"] img,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main .icon img,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main p.icon img {
      background-color: #073642 !important;
      filter: brightness(0.96) contrast(1.02) !important;
      opacity: 1 !important;
    }
    /* User dashboard: strip skin grey frames (often from CSS loaded AFTER this tag ? JS re-appends our #ao3tracker-page-dark-style to head end). */
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main .module,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main .module.group,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main div.module,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main .module > div,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main .module .index,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main fieldset,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main .favorite,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main li.work.blurb.group,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main li.bookmark.blurb.group,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main li.series.blurb.group,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main ol.index,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main .works-list,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main ol.works,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main ul.tags,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main .tags {
      border: 0 !important;
      border-width: 0 !important;
      border-style: none !important;
      border-color: transparent !important;
      border-top: 0 !important;
      border-right: 0 !important;
      border-bottom: 0 !important;
      border-left: 0 !important;
      border-image: none !important;
      -webkit-border-image: none !important;
      outline: 0 !important;
      box-shadow: none !important;
    }
    /* Optional hairline between title strip and body ? same palette, not site grey */
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main .module > h3,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main .module > h3.heading,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main .module h3.heading {
      border-bottom: 1px solid rgba(131,148,150,0.14) !important;
    }
    /* Restore card boundaries on user profile modules like Recent Bookmarks / Recent Series / Fandoms.
       Keep this scoped to the user dashboard so the broader dark mode stays unchanged elsewhere. */
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main .listbox.group,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main .favorite,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main .favorite ul,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main .favorite li,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main li.work.blurb.group,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main li.bookmark.blurb.group,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main li.series.blurb.group,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main li.collection.blurb.group {
      border: 1px solid rgba(131,148,150,0.16) !important;
      box-shadow: 0 1px 0 rgba(0,0,0,0.14) !important;
    }
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main .listbox.group > h3.heading,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main .listbox.group > h3,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main .favorite h3,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main .favorite h4,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main li.work.blurb.group .header.module,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main li.bookmark.blurb.group .header.module,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main li.series.blurb.group .header.module,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main li.collection.blurb.group .header.module {
      border-bottom: 1px solid rgba(131,148,150,0.14) !important;
      box-shadow: none !important;
    }
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main li.bookmark.blurb.group .status,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main li.bookmark.blurb.group .datetime,
    html body[data-ao3-dark="1"].ao3t-user-dashboard #main li.bookmark.blurb.group .stats {
      border-top: 1px solid rgba(131,148,150,0.14) !important;
      margin-top: 8px !important;
      padding-top: 8px !important;
    }
  `;
