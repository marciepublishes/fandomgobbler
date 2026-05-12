(function (global) {
  'use strict';

  function esc(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function buildPlatformSidebarShell(options) {
    const config = options || {};
    const title = esc(config.title || 'FandomGobbler.');
    const kicker = config.kicker ? `<span class="aot-title-kicker">${esc(config.kicker)}</span>` : '';
    const platformNote = config.platformNote || '';
    const emptyText = esc(config.emptyText || 'No works tracked yet.');
    const onboardingTitle = esc(config.onboardingTitle || 'No works tracked yet');
    const onboardingIntro = esc(config.onboardingIntro || 'Here are a few ways to get started:');
    const onboardingItems = Array.isArray(config.onboardingItems) ? config.onboardingItems : [];
    const onboardingHtml = onboardingItems.map(item => `<li>${item}</li>`).join('');

    return `
      <div id="ao3tracker-panel">
        <div id="aot-header">
          <div id="aot-logo"><span id="aot-title">${title}</span>${kicker}</div>
          <div id="aot-header-right">
            <span id="aot-total" class="aot-pill">0 works</span>
            <button id="aot-export-btn" title="Export / Import"><svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="2" x2="8" y2="11"></line><polyline points="4.5,7.5 8,11 11.5,7.5"></polyline><line x1="2.5" y1="14" x2="13.5" y2="14"></line></svg></button>
            <div id="aot-export-dropdown" class="aot-hidden">
              <div class="aot-export-section">Export</div>
              <button class="aot-export-opt" id="aot-export-csv" type="button">Export as CSV</button>
              <button class="aot-export-opt" id="aot-export-json" type="button">Export as JSON</button>
              <div class="aot-export-divider"></div>
              <div class="aot-export-section">Import</div>
              <button class="aot-export-opt" id="aot-import-csv" type="button">Import from CSV</button>
              <button class="aot-export-opt" id="aot-import-json" type="button">Import from JSON</button>
            </div>
            <button id="aot-theme-toggle" class="aot-theme-toggle" title="Switch to Solarized Light" aria-label="Switch to Solarized Light">
              <svg class="ico aot-theme-ico aot-theme-ico-sunset" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="1.5" y1="11" x2="14.5" y2="11"></line><path d="M5 11a3 3 0 0 1 6 0"></path><line x1="8" y1="3" x2="8" y2="5.5"></line><line x1="3.5" y1="5.8" x2="5.1" y2="7.4"></line><line x1="12.5" y1="5.8" x2="10.9" y2="7.4"></line></svg>
              <svg class="ico aot-theme-ico aot-theme-ico-moon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 2a4 4 0 0 0 6 6 6 6 0 1 1-6-6Z"></path></svg>
              <svg class="ico aot-theme-ico aot-theme-ico-sun" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 1.5v2.2M8 12.3v2.2M1.5 8h2.2M12.3 8h2.2M3 3l1.6 1.6M11.4 11.4L13 13M13 3l-1.6 1.6M3 13l1.6-1.6"></path><circle cx="8" cy="8" r="3.1"></circle></svg>
            </button>
            <button id="aot-fullscreen-btn" title="Open dashboard" aria-label="Open dashboard"><svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3.5H3.5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V10"/><path d="M9 2.5h4.5V7"/><path d="M8 8l5-5"/></svg></button>
            <button id="aot-close" title="Close" aria-label="Close"><svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="3.5" y1="3.5" x2="12.5" y2="12.5"></line><line x1="12.5" y1="3.5" x2="3.5" y2="12.5"></line></svg></button>
          </div>
        </div>
        <div class="fg-platform-note">${platformNote}</div>
        <div id="aot-export-reminder" class="aot-hidden">
          <span id="aot-reminder-msg"></span>
          <button type="button" id="aot-reminder-export">Export now</button>
          <button type="button" id="aot-reminder-dismiss" title="Dismiss" aria-label="Dismiss backup reminder">x</button>
        </div>
        <div id="aot-current-bar" style="display:none">
          <div id="aot-current-info">
            <span id="aot-current-label">Currently on</span>
            <span id="aot-current-title"></span>
            <span id="aot-current-meta" class="fg-current-meta"></span>
          </div>
          <div id="aot-current-add-wrap">
            <button id="aot-current-add-btn" type="button">
              <span id="aot-current-add-label">+ Add</span>
              <span class="aot-current-add-chevron" aria-hidden="true">&#9662;</span>
            </button>
            <div id="aot-current-dropdown" class="aot-hidden"></div>
          </div>
        </div>
        <div id="aot-tabs-wrap">
          <button id="aot-tabs-left" class="aot-tabs-arrow aot-tabs-arrow-left">&#x2039;</button>
          <button id="aot-tabs-right" class="aot-tabs-arrow aot-tabs-arrow-right">&#x203A;</button>
          <div id="aot-tabs">
            <div id="aot-status-tabs"></div>
            <span class="aot-tabs-divider"></span>
            <div id="aot-custom-tabs"></div>
            <button id="aot-new-cat-btn" class="aot-new-cat-tab" title="New category" type="button"><span class="aot-new-cat-plus">+</span> Add category</button>
          </div>
        </div>
        <div id="aot-search-bar">
          <span class="aot-srch-ico"><svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="6.5" cy="6.5" r="4"></circle><line x1="9.5" y1="9.5" x2="14" y2="14"></line></svg></span>
          <input id="aot-search" placeholder="Search works..." type="text" />
        </div>
        <div id="aot-sort-indicator" class="aot-hidden"></div>
        <div id="aot-list-wrap">
          <div id="aot-sidebar-onboarding" class="aot-sidebar-onboarding" style="display:none">
            <div class="aot-onboarding-head">
              <div id="aot-onboarding-title" class="aot-onboarding-title">${onboardingTitle}</div>
              <button type="button" id="aot-sidebar-onboarding-dismiss" class="aot-onboarding-dismiss" aria-label="Dismiss">x</button>
            </div>
            <div id="aot-onboarding-intro" class="aot-onboarding-intro">${onboardingIntro}</div>
            <ul class="aot-onboarding-list">${onboardingHtml}</ul>
          </div>
          <div id="aot-empty" class="aot-empty fg-empty">${emptyText}</div>
          <ul id="aot-list"></ul>
        </div>
        <div id="aot-notes-overlay" class="aot-hidden">
          <div id="aot-notes-modal">
            <div id="aot-notes-header">
              <span id="aot-notes-title"></span>
              <button id="aot-notes-close" type="button" aria-label="Close notes modal"><svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="3.5" y1="3.5" x2="12.5" y2="12.5"></line><line x1="12.5" y1="3.5" x2="3.5" y2="12.5"></line></svg></button>
            </div>
            <div id="aot-notes-body">
              <div id="aot-rating-row">
                <span class="aot-field-label">Rating</span>
                <div id="aot-stars">
                  <button class="aot-star" data-val="1" type="button"><svg class="ico ico-star-filled" viewBox="0 0 16 16" fill="currentColor"><polygon points="8,1.5 10,6 15,6.5 11.5,10 12.5,15 8,12.5 3.5,15 4.5,10 1,6.5 6,6"></polygon></svg></button>
                  <button class="aot-star" data-val="2" type="button"><svg class="ico ico-star-filled" viewBox="0 0 16 16" fill="currentColor"><polygon points="8,1.5 10,6 15,6.5 11.5,10 12.5,15 8,12.5 3.5,15 4.5,10 1,6.5 6,6"></polygon></svg></button>
                  <button class="aot-star" data-val="3" type="button"><svg class="ico ico-star-filled" viewBox="0 0 16 16" fill="currentColor"><polygon points="8,1.5 10,6 15,6.5 11.5,10 12.5,15 8,12.5 3.5,15 4.5,10 1,6.5 6,6"></polygon></svg></button>
                  <button class="aot-star" data-val="4" type="button"><svg class="ico ico-star-filled" viewBox="0 0 16 16" fill="currentColor"><polygon points="8,1.5 10,6 15,6.5 11.5,10 12.5,15 8,12.5 3.5,15 4.5,10 1,6.5 6,6"></polygon></svg></button>
                  <button class="aot-star" data-val="5" type="button"><svg class="ico ico-star-filled" viewBox="0 0 16 16" fill="currentColor"><polygon points="8,1.5 10,6 15,6.5 11.5,10 12.5,15 8,12.5 3.5,15 4.5,10 1,6.5 6,6"></polygon></svg></button>
                </div>
                <button id="aot-clear-rating" type="button">Clear</button>
              </div>
              <div id="aot-notes-field">
                <span class="aot-field-label">Notes</span>
                <textarea id="aot-notes-text" placeholder="What's this fic about? Any thoughts, warnings to remember, favorite moments..."></textarea>
              </div>
            </div>
            <div id="aot-notes-footer">
              <button id="aot-notes-cancel" type="button">Cancel</button>
              <button id="aot-notes-save" type="button">Save</button>
            </div>
          </div>
        </div>
        <div id="aot-cat-overlay" class="aot-hidden">
          <div id="aot-cat-modal">
            <div id="aot-cat-header">
              <span id="aot-cat-modal-title">New Category</span>
              <button id="aot-cat-close" type="button" aria-label="Close category modal">x</button>
            </div>
            <div id="aot-cat-body">
              <input id="aot-cat-name" placeholder="Category name..." maxlength="30" type="text" />
              <div class="aot-cat-color-label">Color</div>
              <div id="aot-cat-presets"></div>
              <div id="aot-cat-hex-row">
                <span id="aot-cat-swatch"></span>
                <input id="aot-cat-hex" type="text" placeholder="#7c3aed" maxlength="7" />
              </div>
            </div>
            <div id="aot-cat-footer">
              <button id="aot-cat-delete" class="aot-hidden" type="button">Delete</button>
              <button id="aot-cat-cancel" type="button">Cancel</button>
              <button id="aot-cat-save" type="button">Save</button>
            </div>
          </div>
        </div>
      </div>`;
  }

  const api = {
    buildPlatformSidebarShell
  };

  global.AO3TrackerPlatformSidebarTemplate = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

