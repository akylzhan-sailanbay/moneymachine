/* Click-to-edit text on the replicas, plus file pick / drag-and-drop helpers. */
(function () {
  const Inline = {};
  let active = null; // { el, cancel }

  function selectAll(el) {
    const r = document.createRange();
    r.selectNodeContents(el);
    const s = window.getSelection();
    s.removeAllRanges();
    s.addRange(r);
  }

  function setEditable(el, on) {
    if (!on) { el.removeAttribute('contenteditable'); return; }
    el.setAttribute('contenteditable', 'plaintext-only');
    if (el.contentEditable !== 'plaintext-only') el.setAttribute('contenteditable', 'true');
  }

  function begin(root, el, fields) {
    const f = fields[el.dataset.f];
    if (!f) return;
    if (active && active.el === el) return;
    if (active) active.el.blur();

    const start = f.edit ? f.edit() : el.textContent;
    el.textContent = start;
    setEditable(el, true);
    el.classList.add('is-editing');
    el.spellcheck = false;
    el.focus();
    selectAll(el);

    const state = { el, cancel: false, next: 0 };
    active = state;

    const onKey = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); el.blur(); }
      else if (e.key === 'Escape') { e.preventDefault(); state.cancel = true; el.blur(); }
      else if (e.key === 'Tab') { e.preventDefault(); state.next = e.shiftKey ? -1 : 1; el.blur(); }
    };
    const onPaste = (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text').replace(/\s*\n\s*/g, ' ');
      document.execCommand('insertText', false, text);
    };
    const onBlur = () => {
      el.removeEventListener('keydown', onKey);
      el.removeEventListener('paste', onPaste);
      el.removeEventListener('blur', onBlur);
      setEditable(el, false);
      el.classList.remove('is-editing');
      if (active === state) active = null;
      const text = el.textContent.replace(/\s+/g, ' ').trim();
      let ok = true;
      if (!state.cancel && text !== start.trim()) ok = f.set(text) !== false;
      if (!ok) {
        el.classList.add('is-invalid');
        setTimeout(() => el.classList.remove('is-invalid'), 700);
        App.toast('That doesn’t look like a number. Try 12.5k, -800 or 1.2m.');
      }
      Store.commit();
      if (state.next) {
        const all = U.$$('[data-f]', root).filter((n) => n.offsetParent !== null);
        const i = all.indexOf(el);
        const target = all[(i + state.next + all.length) % all.length];
        if (target) begin(root, target, fields);
      }
    };
    el.addEventListener('keydown', onKey);
    el.addEventListener('paste', onPaste);
    el.addEventListener('blur', onBlur);
  }

  // Make every [data-f] inside root editable on click.
  Inline.bind = function (root, fields) {
    root.addEventListener('click', (e) => {
      if (!App.isEditing()) return;
      const el = e.target.closest('[data-f]');
      if (!el || !root.contains(el)) return;
      e.preventDefault();
      e.stopPropagation();
      begin(root, el, fields);
    });
    root.addEventListener('mousedown', (e) => {
      if (App.isEditing() && e.target.closest('[data-f]')) e.stopPropagation();
    });
    // keyboard: Tab to a field, Enter to edit it
    root.addEventListener('keydown', (e) => {
      const el = e.target;
      if (e.key !== 'Enter' || !App.isEditing() || !el.matches || !el.matches('[data-f]') || el.isContentEditable) return;
      e.preventDefault();
      begin(root, el, fields);
    });
  };

  // Write display text into every [data-f] that isn't being edited.
  Inline.paint = function (root, fields) {
    U.$$('[data-f]', root).forEach((el) => {
      if (active && active.el === el) return;
      const f = fields[el.dataset.f];
      if (!f) return;
      const v = f.get();
      if (el.textContent !== v) el.textContent = v;
      el.tabIndex = App.isEditing() ? 0 : -1;
    });
  };

  Inline.isActive = (el) => !!active && (!el || active.el === el);

  /* ---------- files ---------- */

  const picker = document.createElement('input');
  picker.type = 'file';
  picker.hidden = true;
  document.addEventListener('DOMContentLoaded', () => document.body.appendChild(picker));

  Inline.pickFile = function (accept) {
    return new Promise((resolve) => {
      picker.value = '';
      picker.accept = accept || 'image/*,video/*';
      picker.onchange = () => resolve(picker.files[0] || null);
      picker.click();
    });
  };

  // Drag files onto el. `onFile(file)`; el gets .is-drop while hovering.
  // dragover fires continuously while hovering, so the highlight simply times out when it stops.
  Inline.dropzone = function (el, onFile) {
    let timer;
    el.addEventListener('dragover', (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'copy';
      el.classList.add('is-drop');
      clearTimeout(timer);
      timer = setTimeout(() => el.classList.remove('is-drop'), 150);
    });
    el.addEventListener('drop', (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      e.stopPropagation();
      clearTimeout(timer);
      el.classList.remove('is-drop');
      const file = e.dataTransfer.files[0];
      if (file) onFile(file);
    });
  };

  function hasFiles(e) {
    return e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');
  }

  // Dropping a file outside a drop zone shouldn't navigate away from the app.
  window.addEventListener('dragover', (e) => { if (hasFiles(e)) e.preventDefault(); });
  window.addEventListener('drop', (e) => { if (hasFiles(e)) e.preventDefault(); });

  window.Inline = Inline;
})();
