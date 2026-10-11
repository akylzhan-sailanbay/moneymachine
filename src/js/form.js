/* Inspector form controls that stay in sync with the store. */
(function () {
  const h = U.h;

  function create() {
    const syncers = [];
    const F = {};

    F.sync = () => syncers.forEach((fn) => fn());

    F.section = (title, ...kids) =>
      h('section', { class: 'ins-sec' }, title ? h('h3', { class: 'ins-title' }, title) : null, ...kids);

    F.row = (...kids) => h('div', { class: 'ins-row' }, ...kids);

    F.field = (label, control, hint) =>
      h('label', { class: 'ins-field' },
        h('span', { class: 'ins-label' }, label),
        control,
        hint ? h('span', { class: 'ins-hint' }, hint) : null);

    F.note = (text) => h('p', { class: 'ins-note' }, text);

    F.text = ({ get, set, placeholder, multiline }) => {
      const el = h(multiline ? 'textarea' : 'input', { class: 'ins-input', placeholder: placeholder || '', spellcheck: 'false', rows: multiline ? 3 : null });
      el.addEventListener('input', () => { set(el.value); Store.commit(); });
      syncers.push(() => { if (document.activeElement !== el && el.value !== get()) el.value = get(); });
      return el;
    };

    // Number box: accepts 12.5k, -800, 1.2m, $3,400 ...
    F.num = ({ get, set, placeholder, suffix, disabled, decimals }) => {
      const el = h('input', { class: 'ins-input', inputmode: 'decimal', placeholder: placeholder || '', spellcheck: 'false' });
      const round = (v) => (decimals == null ? v : +v.toFixed(decimals));
      const show = () => { const v = get(); el.value = v == null || isNaN(v) ? '' : U.editNum(round(v)); };
      el.addEventListener('input', () => {
        const v = U.parseNum(el.value);
        const bad = el.value.trim() !== '' && isNaN(v);
        el.classList.toggle('is-bad', bad);
        if (!bad && el.value.trim() !== '') { set(v); Store.commit(); }
      });
      el.addEventListener('blur', () => { el.classList.remove('is-bad'); show(); });
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter') el.blur(); });
      syncers.push(() => {
        const off = disabled ? disabled() : false;
        el.disabled = off;
        if (document.activeElement !== el) show();
      });
      if (!suffix) return el;
      return h('div', { class: 'ins-affix' }, el, h('span', null, suffix));
    };

    F.toggle = ({ get, set, label }) => {
      const input = h('input', { type: 'checkbox', class: 'ins-switch-input' });
      input.addEventListener('change', () => { set(input.checked); Store.commit(); });
      syncers.push(() => { input.checked = !!get(); });
      return h('label', { class: 'ins-switch' }, input, h('span', { class: 'ins-switch-ui' }), h('span', null, label));
    };

    F.segment = ({ options, get, set }) => {
      const wrap = h('div', { class: 'ins-seg', role: 'radiogroup' });
      const btns = options.map(([value, label]) => {
        const b = h('button', { type: 'button', role: 'radio', class: 'ins-seg-btn' }, label);
        b.addEventListener('click', () => { set(value); Store.commit(); });
        wrap.appendChild(b);
        return [value, b];
      });
      syncers.push(() => btns.forEach(([v, b]) => {
        const on = get() === v;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-checked', on);
      }));
      return wrap;
    };

    F.range = ({ min, max, step, get, set, format }) => {
      const input = h('input', { type: 'range', class: 'ins-range', min, max, step: step || 1 });
      const out = h('output', { class: 'ins-range-out' });
      input.addEventListener('input', () => { set(parseFloat(input.value)); Store.commit(); });
      syncers.push(() => {
        if (document.activeElement !== input) input.value = get();
        out.textContent = format ? format(get()) : get();
      });
      return h('div', { class: 'ins-range-wrap' }, input, out);
    };

    F.button = (label, onClick, variant) => {
      const b = h('button', { type: 'button', class: 'btn ' + (variant ? 'btn-' + variant : 'btn-ghost') }, label);
      b.addEventListener('click', onClick);
      return b;
    };

    // Media tile: shows a thumbnail, click to pick, drop to replace, × to clear.
    F.media = ({ getUrl, getKind, onFile, onClear, accept, label }) => {
      const thumb = h('div', { class: 'ins-media-thumb' });
      const clear = h('button', { type: 'button', class: 'ins-media-clear', title: 'Remove', 'aria-label': 'Remove' }, '×');
      const text = h('span', { class: 'ins-media-text' }, label);
      const tile = h('div', { class: 'ins-media', tabindex: 0, role: 'button' }, thumb, text, clear);
      const pick = async () => { const f = await Inline.pickFile(accept); if (f) onFile(f); };
      tile.addEventListener('click', (e) => { if (e.target !== clear) pick(); });
      tile.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
      clear.addEventListener('click', (e) => { e.stopPropagation(); onClear(); });
      Inline.dropzone(tile, onFile);
      let last = null;
      syncers.push(async () => {
        const url = await getUrl();
        const kind = getKind ? getKind() : 'image';
        clear.hidden = !url;
        const key = url + kind;
        if (key === last) return;
        last = key;
        thumb.innerHTML = '';
        if (!url) { thumb.classList.add('is-empty'); return; }
        thumb.classList.remove('is-empty');
        thumb.appendChild(kind === 'video'
          ? h('video', { src: url, muted: true, autoplay: true, loop: true, playsinline: true })
          : h('img', { src: url, alt: '' }));
      });
      return tile;
    };

    return F;
  }

  window.Form = { create };
})();
