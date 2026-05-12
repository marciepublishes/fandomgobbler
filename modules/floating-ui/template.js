// Sidebar HTML template — consumed by floating-ui/controller.js via global.AO3TrackerFloatingUITemplate
globalThis.AO3TrackerFloatingUITemplate = `
      <div id="ao3tracker-panel">
        <div id="aot-header">
          <div id="aot-logo"><div id="aot-logo-text"><span id="aot-title">FandomGobbler.</span></div></div>
          <div id="aot-header-right">
            <span id="aot-total" class="aot-pill">0 works</span>
            <button id="aot-export-btn" title="Export / Import"><svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="2" x2="8" y2="11"/><polyline points="4.5,7.5 8,11 11.5,7.5"/><line x1="2.5" y1="14" x2="13.5" y2="14"/></svg></button>
            <div id="aot-export-dropdown" class="aot-hidden">
              <div class="aot-export-section">Export</div>
              <button class="aot-export-opt" id="aot-export-csv">Export as CSV</button>
              <button class="aot-export-opt" id="aot-export-json">Export as JSON</button>
              <div class="aot-export-divider"></div>
              <div class="aot-export-section">Import</div>
              <button class="aot-export-opt" id="aot-import-csv">Import from CSV</button>
              <button class="aot-export-opt" id="aot-import-json">Import from JSON</button>
            </div>
            <button id="aot-theme-toggle" class="aot-theme-toggle" title="Switch to Solarized Light" aria-label="Switch to Solarized Light">
              <svg class="ico aot-theme-ico aot-theme-ico-sunset" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <line x1="1.5" y1="11" x2="14.5" y2="11"/><path d="M5 11a3 3 0 0 1 6 0"/><line x1="8" y1="3" x2="8" y2="5.5"/><line x1="3.5" y1="5.8" x2="5.1" y2="7.4"/><line x1="12.5" y1="5.8" x2="10.9" y2="7.4"/>
              </svg>
              <svg class="ico aot-theme-ico aot-theme-ico-moon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M8 2a4 4 0 0 0 6 6 6 6 0 1 1-6-6Z"/>
              </svg>
              <svg class="ico aot-theme-ico aot-theme-ico-sun" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M8 1.5v2.2M8 12.3v2.2M1.5 8h2.2M12.3 8h2.2M3 3l1.6 1.6M11.4 11.4L13 13M13 3l-1.6 1.6M3 13l1.6-1.6"/>
                <circle cx="8" cy="8" r="3.1"/>
              </svg>
            </button>
            <button id="aot-fullscreen-btn" title="Open dashboard" aria-label="Open dashboard"><svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3.5H3.5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V10"/><path d="M9 2.5h4.5V7"/><path d="M8 8l5-5"/></svg></button>
            <button id="aot-close"><svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="3.5" y1="3.5" x2="12.5" y2="12.5"/><line x1="12.5" y1="3.5" x2="3.5" y2="12.5"/></svg></button>
          </div>
        </div>
        <div id="aot-current-bar" style="display:none">
          <div id="aot-current-info">
            <span id="aot-current-label">Currently on</span>
            <span id="aot-current-title"></span>
          </div>
          <div id="aot-current-add-wrap">
            <button id="aot-current-add-btn">
              <span id="aot-current-add-label">+ Add</span>
              <span class="aot-current-add-chevron" aria-hidden="true">&#9662;</span>
            </button>
            <div id="aot-current-dropdown" class="aot-hidden">
              <button class="aot-cur-opt" data-status="want"><svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="8,1.5 10,6 15,6.5 11.5,10 12.5,15 8,12.5 3.5,15 4.5,10 1,6.5 6,6"/></svg> For Later</button>
              <button class="aot-cur-opt" data-status="progress"><svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 13.5C8 13.5 3 11 1.5 11V3C3 3 8 5.5 8 5.5C8 5.5 13 3 14.5 3V11C13 11 8 13.5 8 13.5Z"/><line x1="8" y1="5.5" x2="8" y2="13.5"/></svg> Reading</button>
              <button class="aot-cur-opt" data-status="completed"><svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="2.5,8.5 6.5,12.5 13.5,4"/></svg> Completed</button>
              <button class="aot-cur-opt" data-status="rereading"><svg class="ico" viewBox="0 0 383.631 383.631" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M47.331,210.289c-1.408,1.375-3.273,2.296-5.374,2.508c-0.116,0.012-0.232,0.021-0.349,0.029c-0.006,0-0.013,0.001-0.02,0.001c-0.185,0.011-0.367,0.017-0.549,0.017c-2.109,0-4.073-0.737-5.624-1.982c-0.001,0-0.001,0-0.001-0.001c-0.007-0.005-0.013-0.01-0.019-0.015c-0.002-0.001-0.004-0.003-0.006-0.004c-0.004-0.003-0.009-0.007-0.013-0.011c-0.003-0.002-0.007-0.005-0.01-0.008s-0.006-0.005-0.009-0.007c-0.004-0.003-0.009-0.007-0.013-0.01c-0.002-0.001-0.004-0.003-0.006-0.005c-0.005-0.004-0.011-0.008-0.016-0.013c-0.046-0.038-0.092-0.077-0.138-0.116c-0.006-0.005-0.012-0.01-0.018-0.015c-0.001-0.001-0.002-0.002-0.003-0.002c-0.005-0.004-0.01-0.009-0.016-0.013c-0.001-0.002-0.004-0.004-0.006-0.005c-0.004-0.004-0.008-0.007-0.013-0.011c-0.003-0.002-0.006-0.005-0.009-0.007c-0.003-0.003-0.006-0.006-0.01-0.009c-0.004-0.004-0.009-0.008-0.014-0.012c-0.001-0.002-0.003-0.003-0.005-0.005c-0.207-0.183-0.405-0.375-0.595-0.575L2.505,176.658c-3.44-3.587-3.322-9.285,0.266-12.725c3.587-3.44,9.284-3.322,12.725,0.265l16.426,17.125c3.887-58.736,40.101-111.535,95.123-135.771c39.08-17.212,82.524-18.177,122.331-2.714c39.805,15.462,71.206,45.501,88.417,84.582c2.004,4.549-0.06,9.861-4.608,11.864c-4.55,2.003-9.862-0.061-11.864-4.609c-15.273-34.68-43.139-61.336-78.462-75.058c-35.322-13.721-73.875-12.867-108.558,2.409C85.342,83.591,53.163,130.64,49.854,182.927l18.381-17.632c3.589-3.44,9.285-3.322,12.726,0.265s3.322,9.284-0.265,12.725L47.331,210.289z M381.087,207.409l-32.648-33.615c-1.759-1.838-4.291-2.921-7-2.769c-0.005,0-0.01,0-0.017,0.001c-0.143,0.008-0.285,0.02-0.428,0.034c-2.123,0.221-4.005,1.169-5.415,2.575l-32.732,32.273c-3.54,3.49-3.58,9.188-0.091,12.728c3.491,3.54,9.189,3.58,12.728,0.09l17.594-17.346c-3.513,52.052-35.643,98.837-84.405,120.314c-18.545,8.168-37.91,12.033-56.982,12.032c-54.556-0.002-106.675-31.636-130.038-84.682c-2.003-4.548-7.314-6.612-11.864-4.609c-4.549,2.003-6.612,7.315-4.608,11.864c26.329,59.781,85.053,95.43,146.536,95.426c21.487-0.001,43.319-4.357,64.213-13.559c55.03-24.239,91.261-77.082,95.127-135.845l17.12,17.627c3.463,3.565,9.16,3.649,12.727,0.186C384.467,216.673,384.55,210.975,381.087,207.409z"/></svg> Re-reading</button>
              <button class="aot-cur-opt" data-status="onhold"><svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="5.5" y1="3" x2="5.5" y2="13"/><line x1="10.5" y1="3" x2="10.5" y2="13"/></svg> On Hold</button>
              <button class="aot-cur-opt" data-status="dnf"><svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="3.5" y1="3.5" x2="12.5" y2="12.5"/><line x1="12.5" y1="3.5" x2="3.5" y2="12.5"/></svg> Did Not Finish</button>
              <div class="aot-cur-divider"></div>
              <button type="button" class="aot-cur-opt aot-cur-opt-remove" data-status="remove"><svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="3.5" y1="3.5" x2="12.5" y2="12.5"/><line x1="12.5" y1="3.5" x2="3.5" y2="12.5"/></svg> Remove from tracker</button>
            </div>
          </div>
        </div>
        <div id="aot-export-reminder" class="aot-hidden">
          <span id="aot-reminder-msg"></span>
          <button type="button" id="aot-reminder-export">Export now</button>
          <button type="button" id="aot-reminder-dismiss" title="Dismiss" aria-label="Dismiss backup reminder">✕</button>
        </div>
        <div id="aot-mfl-banner" class="aot-hidden">
          <span id="aot-mfl-banner-msg"></span>
          <button type="button" id="aot-mfl-banner-dismiss" title="Dismiss" aria-label="Dismiss">✕</button>
        </div>
        <div id="aot-tabs-wrap">
          <button id="aot-tabs-left" class="aot-tabs-arrow aot-tabs-arrow-left">‹</button>
          <button id="aot-tabs-right" class="aot-tabs-arrow aot-tabs-arrow-right">›</button>
        <div id="aot-tabs">
          <button class="aot-tab aot-active" data-tab="all"><span class="aot-tab-ico"><svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="2" y1="4" x2="14" y2="4"/><line x1="2" y1="8" x2="14" y2="8"/><line x1="2" y1="12" x2="14" y2="12"/></svg></span>All <span class="aot-cnt" id="aot-cnt-all">0</span></button>
          <button class="aot-tab" data-tab="want"><span class="aot-tab-ico"><svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="8,1.5 10,6 15,6.5 11.5,10 12.5,15 8,12.5 3.5,15 4.5,10 1,6.5 6,6"/></svg></span>For Later <span class="aot-cnt" id="aot-cnt-want">0</span></button>
          <button class="aot-tab" data-tab="progress"><span class="aot-tab-ico"><svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 13.5C8 13.5 3 11 1.5 11V3C3 3 8 5.5 8 5.5C8 5.5 13 3 14.5 3V11C13 11 8 13.5 8 13.5Z"/><line x1="8" y1="5.5" x2="8" y2="13.5"/></svg></span>Reading <span class="aot-cnt" id="aot-cnt-progress">0</span></button>
          <button class="aot-tab" data-tab="completed"><svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="2.5,8.5 6.5,12.5 13.5,4"/></svg> Completed <span class="aot-cnt" id="aot-cnt-completed">0</span></button>
          <button class="aot-tab" data-tab="rereading"><span class="aot-tab-ico"><svg class="ico" viewBox="0 0 383.631 383.631" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M47.331,210.289c-1.408,1.375-3.273,2.296-5.374,2.508c-0.116,0.012-0.232,0.021-0.349,0.029c-0.006,0-0.013,0.001-0.02,0.001c-0.185,0.011-0.367,0.017-0.549,0.017c-2.109,0-4.073-0.737-5.624-1.982c-0.001,0-0.001,0-0.001-0.001c-0.007-0.005-0.013-0.01-0.019-0.015c-0.002-0.001-0.004-0.003-0.006-0.004c-0.004-0.003-0.009-0.007-0.013-0.011c-0.003-0.002-0.007-0.005-0.01-0.008s-0.006-0.005-0.009-0.007c-0.004-0.003-0.009-0.007-0.013-0.01c-0.002-0.001-0.004-0.003-0.006-0.005c-0.005-0.004-0.011-0.008-0.016-0.013c-0.046-0.038-0.092-0.077-0.138-0.116c-0.006-0.005-0.012-0.01-0.018-0.015c-0.001-0.001-0.002-0.002-0.003-0.002c-0.005-0.004-0.01-0.009-0.016-0.013c-0.001-0.002-0.004-0.004-0.006-0.005c-0.004-0.004-0.008-0.007-0.013-0.011c-0.003-0.002-0.006-0.005-0.009-0.007c-0.003-0.003-0.006-0.006-0.01-0.009c-0.004-0.004-0.009-0.008-0.014-0.012c-0.001-0.002-0.003-0.003-0.005-0.005c-0.207-0.183-0.405-0.375-0.595-0.575L2.505,176.658c-3.44-3.587-3.322-9.285,0.266-12.725c3.587-3.44,9.284-3.322,12.725,0.265l16.426,17.125c3.887-58.736,40.101-111.535,95.123-135.771c39.08-17.212,82.524-18.177,122.331-2.714c39.805,15.462,71.206,45.501,88.417,84.582c2.004,4.549-0.06,9.861-4.608,11.864c-4.55,2.003-9.862-0.061-11.864-4.609c-15.273-34.68-43.139-61.336-78.462-75.058c-35.322-13.721-73.875-12.867-108.558,2.409C85.342,83.591,53.163,130.64,49.854,182.927l18.381-17.632c3.589-3.44,9.285-3.322,12.726,0.265s3.322,9.284-0.265,12.725L47.331,210.289z M381.087,207.409l-32.648-33.615c-1.759-1.838-4.291-2.921-7-2.769c-0.005,0-0.01,0-0.017,0.001c-0.143,0.008-0.285,0.02-0.428,0.034c-2.123,0.221-4.005,1.169-5.415,2.575l-32.732,32.273c-3.54,3.49-3.58,9.188-0.091,12.728c3.491,3.54,9.189,3.58,12.728,0.09l17.594-17.346c-3.513,52.052-35.643,98.837-84.405,120.314c-18.545,8.168-37.91,12.033-56.982,12.032c-54.556-0.002-106.675-31.636-130.038-84.682c-2.003-4.548-7.314-6.612-11.864-4.609c-4.549,2.003-6.612,7.315-4.608,11.864c26.329,59.781,85.053,95.43,146.536,95.426c21.487-0.001,43.319-4.357,64.213-13.559c55.03-24.239,91.261-77.082,95.127-135.845l17.12,17.627c3.463,3.565,9.16,3.649,12.727,0.186C384.467,216.673,384.55,210.975,381.087,207.409z"/></svg></span>Re-read <span class="aot-cnt" id="aot-cnt-rereading">0</span></button>
          <button class="aot-tab" data-tab="onhold"><span class="aot-tab-ico"><svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="5.5" y1="3" x2="5.5" y2="13"/><line x1="10.5" y1="3" x2="10.5" y2="13"/></svg></span>Hold <span class="aot-cnt" id="aot-cnt-onhold">0</span></button>
          <button class="aot-tab" data-tab="dnf"><span class="aot-tab-ico"><svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="3.5" y1="3.5" x2="12.5" y2="12.5"/><line x1="12.5" y1="3.5" x2="3.5" y2="12.5"/></svg></span>DNF <span class="aot-cnt" id="aot-cnt-dnf">0</span></button>
          <button class="aot-tab" data-tab="lost"><span class="aot-tab-ico"><svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="2,4 14,4"/><path d="M5 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/><rect x="3" y="4" width="10" height="10" rx="1"/><line x1="6" y1="7" x2="6" y2="11"/><line x1="10" y1="7" x2="10" y2="11"/></svg></span>Deleted <span class="aot-cnt aot-cnt-lost" id="aot-cnt-lost">0</span></button>
          <span class="aot-tabs-divider"></span>
          <div id="aot-custom-tabs"></div>
          <button id="aot-new-cat-btn" class="aot-new-cat-tab" title="New category"><span class="aot-new-cat-plus">+</span> Add category</button>
        </div>
        </div>
        <div id="aot-search-bar">
          <span class="aot-srch-ico"><svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="6.5" cy="6.5" r="4"/><line x1="9.5" y1="9.5" x2="14" y2="14"/></svg></span>
          <input id="aot-search" placeholder="Search works…" type="text" />
        </div>
        <div id="aot-sort-indicator" class="aot-sort-indicator aot-hidden"></div>
        <div id="aot-list-wrap">
          <div id="aot-sidebar-onboarding" class="aot-sidebar-onboarding" style="display:none">
            <div class="aot-onboarding-head">
              <div id="aot-onboarding-title" class="aot-onboarding-title">No works tracked yet</div>
              <button type="button" id="aot-sidebar-onboarding-dismiss" class="aot-onboarding-dismiss" aria-label="Dismiss">&#x2715;</button>
            </div>
            <div id="aot-onboarding-intro" class="aot-onboarding-intro">Open any AO3 story and click the floating button to get started.</div>
            <ul class="aot-onboarding-list">
              <li>Open any AO3 story and click the <strong>floating button</strong> to add it to your tracker.</li>
              <li>Have AO3 bookmarks? Open the extension popup and use <strong>Fetch Bookmarks</strong>.</li>
              <li>Browse on your phone? Save works to AO3's For Later on mobile, then use <strong>Fetch Marked for Later</strong> in the popup to bring them in.</li>
            </ul>
          </div>
          <div id="aot-empty" class="aot-empty">No works yet. Browse AO3 and click <strong>Track</strong> on any fic!</div>
          <ul id="aot-list"></ul>
        </div>
        <!-- Notes panel -->
        <div id="aot-notes-overlay" class="aot-hidden">
          <div id="aot-notes-modal">
            <div id="aot-notes-header">
              <span id="aot-notes-title"></span>
              <button id="aot-notes-close"><svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="3.5" y1="3.5" x2="12.5" y2="12.5"/><line x1="12.5" y1="3.5" x2="3.5" y2="12.5"/></svg></button>
            </div>
            <div id="aot-notes-body">
              <div id="aot-rating-row">
                <span class="aot-field-label">Rating</span>
                <div id="aot-stars">
                  <button class="aot-star" data-val="1"><svg class="ico ico-star-filled" viewBox="0 0 16 16" fill="currentColor"><polygon points="8,1.5 10,6 15,6.5 11.5,10 12.5,15 8,12.5 3.5,15 4.5,10 1,6.5 6,6"/></svg></button>
                  <button class="aot-star" data-val="2"><svg class="ico ico-star-filled" viewBox="0 0 16 16" fill="currentColor"><polygon points="8,1.5 10,6 15,6.5 11.5,10 12.5,15 8,12.5 3.5,15 4.5,10 1,6.5 6,6"/></svg></button>
                  <button class="aot-star" data-val="3"><svg class="ico ico-star-filled" viewBox="0 0 16 16" fill="currentColor"><polygon points="8,1.5 10,6 15,6.5 11.5,10 12.5,15 8,12.5 3.5,15 4.5,10 1,6.5 6,6"/></svg></button>
                  <button class="aot-star" data-val="4"><svg class="ico ico-star-filled" viewBox="0 0 16 16" fill="currentColor"><polygon points="8,1.5 10,6 15,6.5 11.5,10 12.5,15 8,12.5 3.5,15 4.5,10 1,6.5 6,6"/></svg></button>
                  <button class="aot-star" data-val="5"><svg class="ico ico-star-filled" viewBox="0 0 16 16" fill="currentColor"><polygon points="8,1.5 10,6 15,6.5 11.5,10 12.5,15 8,12.5 3.5,15 4.5,10 1,6.5 6,6"/></svg></button>
                </div>
                <button id="aot-clear-rating">Clear</button>
              </div>
              <div id="aot-notes-field">
                <span class="aot-field-label">Notes</span>
                <textarea id="aot-notes-text" placeholder="What's this fic about? Any thoughts, warnings to remember, favorite moments…"></textarea>
              </div>
            </div>
            <div id="aot-notes-footer">
              <button id="aot-notes-cancel">Cancel</button>
              <button id="aot-notes-save">Save</button>
            </div>
          </div>
        </div>
        <!-- Category modal -->
        <div id="aot-cat-overlay" class="aot-hidden">
          <div id="aot-cat-modal">
            <div id="aot-cat-header">
              <span id="aot-cat-modal-title">New Category</span>
              <button id="aot-cat-close"><svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="3.5" y1="3.5" x2="12.5" y2="12.5"/><line x1="12.5" y1="3.5" x2="3.5" y2="12.5"/></svg></button>
            </div>
            <div id="aot-cat-body">
              <input id="aot-cat-name" placeholder="Category name…" maxlength="30" type="text" />
              <div class="aot-cat-color-label">Color</div>
              <div id="aot-cat-presets"></div>
              <div id="aot-cat-hex-row">
                <span id="aot-cat-swatch"></span>
                <input id="aot-cat-hex" type="text" placeholder="#7c3aed" maxlength="7" />
              </div>
            </div>
            <div id="aot-cat-footer">
              <button id="aot-cat-delete" class="aot-hidden">Delete</button>
              <button id="aot-cat-cancel">Cancel</button>
              <button id="aot-cat-save">Save</button>
            </div>
          </div>
        </div>
      </div>`;

