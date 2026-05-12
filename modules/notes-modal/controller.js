(function (global) {
  'use strict';

  let _deps = null;
  let _notesWorkId = null;
  let _pendingRating = null;

  function init(deps) {
    _deps = deps;
  }

  function getPendingRating() { return _pendingRating; }
  function setPendingRating(val) { _pendingRating = val; }

  function openNotesModal(workId) {
    const { getWorks, trunc, document } = _deps;
    _notesWorkId = workId;
    getWorks(works => {
      const w = works[workId];
      if (!w) return;
      _pendingRating = w.rating || null;
      document.getElementById('aot-notes-title').textContent = trunc(w.title, 40);
      document.getElementById('aot-notes-text').value = w.notes || '';
      updateStars(_pendingRating);
      document.getElementById('aot-notes-overlay').classList.remove('aot-hidden');
      setTimeout(() => document.getElementById('aot-notes-text').focus(), 50);
    });
  }

  function closeNotesModal() {
    const { document } = _deps;
    document.getElementById('aot-notes-overlay')?.classList.add('aot-hidden');
    _notesWorkId = null;
  }

  function saveNotesModal() {
    const { getWorks, setWorks, renderSidebar, showMiniToast, document } = _deps;
    if (!_notesWorkId) return;
    getWorks(works => {
      if (works[_notesWorkId]) {
        works[_notesWorkId].rating = _pendingRating;
        works[_notesWorkId].notes = document.getElementById('aot-notes-text').value.trim();
        setWorks(works);
      }
      closeNotesModal();
      showMiniToast('Notes saved!');
      renderSidebar();
    });
  }

  function updateStars(rating) {
    const { document } = _deps;
    document.querySelectorAll('.aot-star').forEach(s => {
      s.classList.toggle('aot-star-on', +s.dataset.val <= (rating||0));
    });
  }

  const AO3TrackerNotesModal = {
    init,
    openNotesModal,
    closeNotesModal,
    saveNotesModal,
    updateStars,
    setPendingRating,
    getPendingRating
  };

  global.AO3TrackerNotesModal = AO3TrackerNotesModal;
  if (typeof module !== 'undefined' && module.exports) module.exports = AO3TrackerNotesModal;
})(typeof globalThis !== 'undefined' ? globalThis : this);
