// CSS for AO3_PILL_LAYOUT_CSS — loaded before content.js via manifest.
// Edit CSS here; the variable is consumed directly in content.js.
globalThis.AO3TrackerPillLayoutCSS = `
    #aot-page-theme-switch {
      --aot-pill-bg: rgba(255,255,255,0.92);
      --aot-pill-border: rgba(0,0,0,0.12);
      --aot-pill-text: #555550;
      --aot-pill-hover-bg: rgba(0,0,0,0.07);
      --aot-pill-hover-text: #1a1a18;
      --aot-pill-shadow: 0 4px 18px rgba(0,0,0,0.22);
      display: inline-flex !important;
      flex-direction: row !important;
      justify-content: center !important;
      align-items: stretch !important;
      flex-shrink: 0 !important;
      height: 22px !important;
      max-width: 54px !important;
      padding: 0 !important;
      gap: 0 !important;
      overflow: hidden !important;
      vertical-align: middle !important;
      box-sizing: border-box !important;
      border-radius: 999px !important;
      background: var(--aot-pill-bg) !important;
      background-color: var(--aot-pill-bg) !important;
      background-image: none !important;
      border: 1px solid var(--aot-pill-border) !important;
      color: var(--aot-pill-text) !important;
      box-shadow: none !important;
      text-shadow: none !important;
      transform: translate(8px, 2px) !important;
      transition: max-width 0.32s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease, border-color 0.15s ease, background 0.15s ease !important;
    }
    #aot-page-theme-switch:hover,
    #aot-page-theme-switch:focus-within,
    li.aot-page-dark-li--login #aot-page-theme-switch:hover,
    li.aot-page-dark-li--login #aot-page-theme-switch:focus-within {
      max-width: 400px !important;
      overflow: visible !important;
      z-index: 100 !important;
      box-shadow: var(--aot-pill-shadow) !important;
    }
    #aot-page-theme-switch .aot-page-theme-preview {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 4px !important;
      width: 54px !important;
      min-width: 54px !important;
      height: 100% !important;
      padding: 0 6px !important;
      color: inherit !important;
      pointer-events: none !important;
    }
    #aot-page-theme-switch .aot-page-theme-preview svg {
      display: block !important;
      flex-shrink: 0 !important;
      pointer-events: none !important;
    }
    #aot-page-theme-switch .aot-page-theme-preview .aot-page-theme-preview-sun,
    #aot-page-theme-switch .aot-page-theme-preview .aot-page-theme-preview-moon {
      width: 12px !important;
      height: 12px !important;
    }
    #aot-page-theme-switch .aot-page-theme-preview .aot-page-theme-preview-sun {
      width: 13px !important;
      height: 13px !important;
    }
    #aot-page-theme-switch .aot-page-theme-preview .aot-page-theme-preview-arrow {
      width: 8px !important;
      height: 8px !important;
      opacity: 0.72 !important;
    }
    #aot-page-theme-switch .aot-page-theme-seg {
      display: inline-flex !important;
      flex-direction: row !important;
      flex-wrap: nowrap !important;
      align-items: center !important;
      justify-content: flex-start !important;
      min-height: 100% !important;
      gap: 5px !important;
      padding: 0 6px 0 4px !important;
      margin: 0 !important;
      border: none !important;
      background: transparent !important;
      background-color: transparent !important;
      background-image: none !important;
      color: inherit !important;
      cursor: pointer !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
      font-size: 11px !important;
      font-weight: 600 !important;
      line-height: 1.2 !important;
      letter-spacing: 0.01em !important;
      white-space: nowrap !important;
      border-radius: 5px !important;
      box-shadow: none !important;
      text-shadow: none !important;
      outline: none !important;
      -webkit-appearance: none !important;
      appearance: none !important;
      transition: background 0.12s ease, color 0.12s ease !important;
    }
    #aot-page-theme-switch .aot-page-theme-seg *,
    #aot-page-theme-switch .aot-page-theme-seg .aot-page-theme-seg-ico,
    #aot-page-theme-switch .aot-page-theme-seg .aot-page-theme-seg-label {
      background: transparent !important;
      background-color: transparent !important;
      background-image: none !important;
      box-shadow: none !important;
      text-shadow: none !important;
    }
    #aot-page-theme-switch .aot-page-theme-seg:hover,
    #aot-page-theme-switch .aot-page-theme-seg:focus-visible {
      background: var(--aot-pill-hover-bg) !important;
      background-color: var(--aot-pill-hover-bg) !important;
      color: var(--aot-pill-hover-text) !important;
      outline: none !important;
    }
    #aot-page-theme-switch .aot-page-theme-seg:active {
      background: var(--aot-pill-hover-bg) !important;
      background-color: var(--aot-pill-hover-bg) !important;
    }
    #aot-page-theme-switch .aot-page-theme-seg-ico {
      position: relative !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 16px !important;
      height: 16px !important;
      flex-shrink: 0 !important;
      border-radius: 0 !important;
    }
    #aot-page-theme-switch .aot-page-theme-seg-ico svg {
      width: 16px !important;
      height: 16px !important;
      display: block !important;
      pointer-events: none !important;
      flex-shrink: 0 !important;
    }
    #aot-page-theme-switch .aot-page-theme-seg-label {
      max-width: 0 !important;
      opacity: 0 !important;
      overflow: hidden !important;
      font-size: 11px !important;
      font-weight: 600 !important;
      line-height: 1.2 !important;
      letter-spacing: 0.01em !important;
      align-self: center !important;
      flex: 0 1 auto !important;
      transition: max-width 0.28s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease !important;
    }
    #aot-page-theme-switch:hover .aot-page-theme-seg-label,
    #aot-page-theme-switch:focus-within .aot-page-theme-seg-label {
      max-width: 200px !important;
      opacity: 1 !important;
      overflow: visible !important;
    }
    #aot-page-theme-switch:hover .aot-page-theme-preview,
    #aot-page-theme-switch:focus-within .aot-page-theme-preview,
    #header .actions #aot-page-theme-switch:hover .aot-page-theme-preview,
    #header .actions #aot-page-theme-switch:focus-within .aot-page-theme-preview,
    #header ul.actions #aot-page-theme-switch:hover .aot-page-theme-preview,
    #header ul.actions #aot-page-theme-switch:focus-within .aot-page-theme-preview,
    #login .actions #aot-page-theme-switch:hover .aot-page-theme-preview,
    #login .actions #aot-page-theme-switch:focus-within .aot-page-theme-preview,
    #login ul.actions #aot-page-theme-switch:hover .aot-page-theme-preview,
    #login ul.actions #aot-page-theme-switch:focus-within .aot-page-theme-preview {
      display: none !important;
    }
    #aot-page-theme-switch:not(:hover):not(:focus-within) .aot-page-theme-seg,
    #header .actions #aot-page-theme-switch:not(:hover):not(:focus-within) .aot-page-theme-seg,
    #header ul.actions #aot-page-theme-switch:not(:hover):not(:focus-within) .aot-page-theme-seg,
    #login .actions #aot-page-theme-switch:not(:hover):not(:focus-within) .aot-page-theme-seg,
    #login ul.actions #aot-page-theme-switch:not(:hover):not(:focus-within) .aot-page-theme-seg {
      display: none !important;
    }
    ul.actions:has(.aot-page-dark-li--login) {
      overflow: visible !important;
    }
  `;
