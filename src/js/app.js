/* App shell: view registry, layout/scaling, toolbar, export actions. Loaded before the views. */
(function () {
  const views = {};
  const order = [];
  let scale = 1;
  let busy = false;
  let toastTimer;

  const App = {
    register(name, view) { views[name] = view; order.push(name); },
    isEditing: () => Store.state.mode === 'edit',
    scale: () => scale,
    active: () => views[Store.state.view],

    toast(msg) {
      const el = U.$('#toast');
      el.textContent = msg;
      el.classList.add('is-on');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => el.classList.remove('is-on'), 2600);
    },

    async capture(opts = {}) {
      const name = Store.state.view;
      const v = views[name];
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      if (v.beforeExport) v.beforeExport();
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const node = v.exportNode(opts);
      const ratio = node.offsetWidth > 900 ? 2 : 3;
      return v.capture && !opts.full ? v.capture(ratio) : Exporter.capture(node, { pixelRatio: ratio });
    },

    async saveImage(opts = {}) {
      if (busy) return;
      busy = true;
      document.body.classList.add('is-busy');
      try {
        const canvas = await App.capture(opts);
        const blob = await Exporter.toBlob(canvas);
        Exporter.download(blob, `${App.active().filename(opts)}.png`);
        App.toast('Image saved to your downloads.');
      } catch (e) {
        console.error(e);
        App.toast(e.message || 'Saving the image failed. Try again.');
      } finally {
        busy = false;
        document.body.classList.remove('is-busy');
      }
    },

    async copyImage(opts = {}) {
      if (busy) return;
      busy = true;
      document.body.classList.add('is-busy');
      try {
        const canvas = await App.capture(opts);
        await Exporter.copy(canvas);
        App.toast('Image copied. Paste it anywhere.');
      } catch (e) {
        console.error(e);
        App.toast(e.message || 'Copying failed. Use Save image instead.');
      } finally {
        busy = false;
        document.body.classList.remove('is-busy');
      }
    },
  };
  window.App = App;

  /* ---------- layout ---------- */

  const boards = {};
  const panels = {};

  function fit() {
    const stage = U.$('#stage');
    const name = Store.state.view;
    const v = views[name];
    if (!v) return;
    const { w, h } = v.size();
    const r = stage.getBoundingClientRect();
    const narrow = window.matchMedia('(max-width: 900px)').matches;
    const padX = narrow ? 16 : 48, padY = narrow ? 16 : 40;
    const availW = Math.max(100, r.width - padX * 2);
    const availH = narrow ? Infinity : Math.max(100, r.height - padY * 2 - 28);
    scale = Math.min(availW / w, availH / h, 1.6);
    const forced = parseFloat(new URLSearchParams(location.search).get('scale'));
    if (forced > 0) scale = forced; // ?scale=1 renders the replica at its true size
    const b = boards[name];
    b.box.style.width = w * scale + 'px';
    b.box.style.height = h * scale + 'px';
    b.inner.style.width = w + 'px';
    b.inner.style.height = h + 'px';
    b.inner.style.transform = `scale(${scale})`;
  }

  function show(name) {
    if (!views[name]) name = order[0];
    Store.state.view = name;
    order.forEach((n) => {
      boards[n].wrap.hidden = n !== name;
      panels[n].hidden = n !== name;
    });
    U.$$('.tabs [data-view]').forEach((b) => {
      const on = b.dataset.view === name;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-selected', on);
    });
    views[name].render();
    views[name].sync();
    fit();
    U.$('#inspector').scrollTop = 0;
  }

  function setMode(mode) {
    Store.state.mode = mode;
    document.body.classList.toggle('mode-edit', mode === 'edit');
    document.body.classList.toggle('mode-preview', mode !== 'edit');
    U.$$('.mode [data-mode]').forEach((b) => {
      const on = b.dataset.mode === mode;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-checked', on);
    });
  }

  const HINTS = {
    calendar: 'Click a day and type its PnL. Enter moves to the next day.',
    pnl: 'Click any text to edit it. Drop a picture, GIF or video on the card to change the background.',
    trade: 'Click any text on the card to edit it. Click the avatar or token icon to change them.',
  };

  function init() {
    const stage = U.$('#stage');
    const inspector = U.$('#inspector');
    const tabs = U.$('.tabs');

    order.forEach((name) => {
      const v = views[name];
      const inner = U.h('div', { class: 'artboard-inner' }, v.build());
      const box = U.h('div', { class: 'artboard-box' }, inner);
      const wrap = U.h('div', { class: 'artboard', 'data-view': name },
        box, U.h('p', { class: 'artboard-hint' }, HINTS[name] || ''));
      stage.appendChild(wrap);
      boards[name] = { wrap, box, inner };

      const panel = U.h('div', { class: 'panel', 'data-view': name }, v.buildInspector());
      inspector.appendChild(panel);
      panels[name] = panel;

      const tab = U.h('button', { type: 'button', role: 'tab', 'data-view': name }, v.label);
      tab.addEventListener('click', () => { show(name); Store.commit(); });
      tabs.appendChild(tab);
    });

    Store.on(() => {
      const v = App.active();
      v.render();
      v.sync();
    });

    U.$$('.mode [data-mode]').forEach((b) => b.addEventListener('click', () => { setMode(b.dataset.mode); Store.commit(); }));
    U.$('#save').addEventListener('click', () => App.saveImage());

    new ResizeObserver(fit).observe(stage);
    window.addEventListener('resize', fit);

    document.addEventListener('keydown', (e) => {
      const typing = e.target.closest('input, textarea, [contenteditable]');
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); App.saveImage(); return; }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      const i = ['1', '2', '3'].indexOf(e.key);
      if (i >= 0 && order[i]) { show(order[i]); Store.commit(); }
      if (e.key.toLowerCase() === 'p') { setMode(App.isEditing() ? 'preview' : 'edit'); Store.commit(); }
    });

    setMode(Store.state.mode);
    show(Store.state.view);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    // Prepare export fonts in the background so the first save is quick.
    setTimeout(() => Exporter.warmFonts(), 1500);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
