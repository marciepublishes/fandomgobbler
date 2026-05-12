(function (global) {
  'use strict';

  // --- Context accessors ---
  function getWorks(context) {
    return typeof context.getWorks === 'function' ? context.getWorks() : {};
  }

  function saveWorks(context) {
    if (typeof context.saveWorks === 'function') context.saveWorks();
  }

  function showToast(context, msg) {
    if (typeof context.showToast === 'function') context.showToast(msg);
  }

  function renderAll(context) {
    if (typeof context.renderAll === 'function') context.renderAll();
  }

  function truncate(context, str, len) {
    if (typeof context.truncate === 'function') return context.truncate(str, len);
    return str.length > len ? str.slice(0, len - 1) + '\u2026' : str;
  }

  // --- Module state ---
  let _notesWorkId = null;
  let _pendingRating = null;

  // --- Internal helpers ---
  function updateStarDisplay(rating) {
    document.querySelectorAll('.star').forEach(s => {
      s.classList.toggle('active', parseInt(s.dataset.val) <= (rating || 0));
    });
  }

  function highlightStars(val) {
    document.querySelectorAll('.star').forEach(s => {
      s.classList.toggle('active', parseInt(s.dataset.val) <= val);
    });
  }

  // --- Public API ---
  function openNotesModal(workId, context) {
    const works = getWorks(context);
    const work = works[workId];
    if (!work) return;
    _notesWorkId = workId;
    _pendingRating = work.rating || null;

    const titleEl = document.getElementById('notesWorkTitle');
    const textarea = document.getElementById('notesTextarea');
    const overlay = document.getElementById('notesOverlay');
    if (titleEl) titleEl.textContent = truncate(context, work.title, 40);
    if (textarea) textarea.value = work.notes || '';
    updateStarDisplay(_pendingRating);
    if (overlay) overlay.classList.remove('hidden');
    setTimeout(() => {
      const ta = document.getElementById('notesTextarea');
      if (ta) ta.focus();
    }, 50);
  }

  function closeNotesModal() {
    const overlay = document.getElementById('notesOverlay');
    if (overlay) overlay.classList.add('hidden');
    _notesWorkId = null;
  }

  function setupControls(context) {
    const overlay = document.getElementById('notesOverlay');
    const clearBtn = document.getElementById('clearRating');

    ['notesClose', 'notesCancel'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', closeNotesModal);
    });

    if (overlay) {
      overlay.addEventListener('click', e => {
        if (e.target === overlay) closeNotesModal();
      });
    }

    const saveBtn = document.getElementById('notesSave');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        if (!_notesWorkId) return;
        const textarea = document.getElementById('notesTextarea');
        const works = getWorks(context);
        if (works[_notesWorkId]) {
          works[_notesWorkId].rating = _pendingRating;
          works[_notesWorkId].notes = textarea ? textarea.value.trim() : '';
          saveWorks(context);
        }
        closeNotesModal();
        showToast(context, 'Notes saved!');
        renderAll(context);
      });
    }

    document.querySelectorAll('.star').forEach(star => {
      star.addEventListener('click', () => {
        _pendingRating = parseInt(star.dataset.val);
        updateStarDisplay(_pendingRating);
      });
      star.addEventListener('mouseenter', () => {
        highlightStars(parseInt(star.dataset.val));
      });
    });

    const starsInput = document.getElementById('starsInput');
    if (starsInput) {
      starsInput.addEventListener('mouseleave', () => {
        updateStarDisplay(_pendingRating);
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        _pendingRating = null;
        updateStarDisplay(null);
      });
    }
  }

  global.AO3TrackerNotesModalPopupController = {
    setupControls,
    openNotesModal,
    closeNotesModal
  };

})(typeof globalThis !== 'undefined' ? globalThis : this);
