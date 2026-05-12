(function (global) {
  'use strict';

  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /** When moving to Re-reading, optionally clear stored chapter progress (re-read from start). */
  function applyRereadingChapterResetIfNeeded(oldStatus, newStatus, work, onDone) {
    if (!work || newStatus !== 'rereading' || oldStatus === 'rereading' || !work.furthestChapter) {
      if (onDone) onDone();
      return;
    }
    // Show an inline confirm in the sidebar instead of window.confirm
    const sidebar = document.getElementById('ao3tracker-sidebar');
    const target = sidebar || document.body;

    const existing = target.querySelector('#aot-reread-confirm');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'aot-reread-confirm';
    modal.className = 'aot-reread-confirm-overlay';
    modal.innerHTML = `
      <div class="aot-reread-confirm-modal">
        <div class="aot-reread-confirm-title">Reset chapter progress?</div>
        <div class="aot-reread-confirm-body">You're marking this as Re-reading. Reset chapter progress so the tracker starts from the beginning?</div>
        <div class="aot-reread-confirm-footer">
          <button class="aot-reread-keep">Keep current</button>
          <button class="aot-reread-reset">Reset</button>
        </div>
      </div>`;
    target.appendChild(modal);

    modal.querySelector('.aot-reread-reset').addEventListener('click', () => {
      modal.remove();
      delete work.furthestChapter;
      if (onDone) onDone();
    });
    modal.querySelector('.aot-reread-keep').addEventListener('click', () => {
      modal.remove();
      if (onDone) onDone();
    });
  }

  function showInlineConfirm(target, title, body, confirmLabel, cancelLabel, onConfirm, onCancel) {
    const existing = document.getElementById('ao3t-confirm');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'ao3t-confirm';
    overlay.className = 'aot-reread-confirm-overlay';
    overlay.innerHTML = `
      <div class="aot-reread-confirm-modal">
        <div class="aot-reread-confirm-title">${esc(title || '')}</div>
        <div class="aot-reread-confirm-body">${esc(body || '')}</div>
        <div class="aot-reread-confirm-footer">
          <button type="button" class="aot-reread-keep">${esc(cancelLabel || 'Cancel')}</button>
          <button type="button" class="aot-reread-reset">${esc(confirmLabel || 'OK')}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.querySelector('.aot-reread-reset')?.addEventListener('click', () => {
      overlay.remove();
      if (onConfirm) onConfirm();
    });
    overlay.querySelector('.aot-reread-keep')?.addEventListener('click', () => {
      overlay.remove();
      if (onCancel) onCancel();
    });

    // Click backdrop to cancel
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
        if (onCancel) onCancel();
      }
    });
  }

  function confirmRemoveFromTracker() {
    return window.confirm('Are you sure you want to remove this story from tracking?');
  }

  const AO3TrackerUIUtils = {
    applyRereadingChapterResetIfNeeded,
    showInlineConfirm,
    confirmRemoveFromTracker
  };

  global.AO3TrackerUIUtils = AO3TrackerUIUtils;
  if (typeof module !== 'undefined' && module.exports) module.exports = AO3TrackerUIUtils;
})(typeof globalThis !== 'undefined' ? globalThis : this);
