/* PnL share card (Axiom) replica + inspector. */
(function () {
  const h = U.h;
  const W = 1000, H = 566;
  const S = () => Store.state.pnl;
  const PRESETS = ['Graphite', 'Midnight', 'Ember'];

  const AXIOM_MARK = '<svg viewBox="0 0 83 71" aria-hidden="true"><path fill="currentColor" d="M41.5 0 60.6 32.6H22.4L41.5 0ZM15.4 44h52.2L83 71H0l15.4-27Z"/></svg>';
  const GEM = `<svg viewBox="0 0 30 21" aria-hidden="true">
    <path d="M5.4 1.2l.6 1.5 1.5.6-1.5.6-.6 1.5-.6-1.5-1.5-.6 1.5-.6z" fill="#d6ddff" opacity=".9"/>
    <path d="M23.4 11.6l.45 1.05 1.05.45-1.05.45-.45 1.05-.45-1.05-1.05-.45 1.05-.45z" fill="#d6ddff" opacity=".75"/>
    <path d="M15 20.6 7.4 7.6 10.6 2h8.8l3.2 5.6z" fill="#8c9ef7"/>
    <path d="M10.6 2h8.8l3.2 5.6H7.4z" fill="#dbe2ff"/>
    <path d="M15 2l-2.6 5.6h5.2z" fill="#f4f6ff"/>
    <path d="M15 20.6 12.4 7.6h5.2z" fill="#a8b6ff"/>
    <path d="M15 20.6 7.4 7.6h5z" fill="#7b8ef0"/>
  </svg>`;
  const CHEV_UP = '<svg viewBox="0 0 20 11" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1.2 9.8 10 1.2l8.8 8.6"/></svg>';
  const CHEV_DOWN = '<svg viewBox="0 0 20 11" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1.2 1.2 10 9.8l8.8-8.6"/></svg>';
  const GLOBE = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="6.7"/><path d="M1.3 8h13.4M8 1.3c1.8 1.9 2.7 4.1 2.7 6.7S9.8 12.8 8 14.7M8 1.3C6.2 3.2 5.3 5.4 5.3 8s.9 4.8 2.7 6.7"/></svg>';
  const DEFAULT_AVATAR = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0d1a1f"/><stop offset="1" stop-color="#1b3036"/></linearGradient></defs><rect width="64" height="64" fill="url(#g)"/><circle cx="34" cy="25" r="10" fill="#33474e"/><path d="M14 64c2-15 10-23 20-23s18 8 20 23z" fill="#3c535b"/></svg>');

  let root, bgLayer, mediaEl = null, bgKey = null, F;

  /* ---------- numbers ---------- */

  function nums() {
    const s = S();
    if (!s.auto) return { pnl: s.pnl, pct: s.pct };
    const pnl = s.position - s.invested;
    return { pnl, pct: s.invested ? (pnl / s.invested) * 100 : 0 };
  }

  const setNum = {
    pnl(v) { const s = S(); if (s.auto) s.position = s.invested + v; else s.pnl = v; },
    pct(v) { const s = S(); if (s.auto) s.position = s.invested * (1 + v / 100); else s.pct = v; },
    invested(v) { S().invested = v; },
    position(v) { S().position = v; },
  };

  function setAuto(on) {
    const s = S();
    if (!on && s.auto) { const n = nums(); s.pnl = n.pnl; s.pct = n.pct; }
    s.auto = on;
  }

  const numField = (key, show) => ({
    get: show,
    edit: () => show(),
    set: (raw) => { const v = U.parseNum(raw); if (isNaN(v)) return false; setNum[key](v); },
  });
  const textField = (key) => ({ get: () => S()[key], set: (raw) => { S()[key] = raw; } });

  const fields = {
    ticker: textField('ticker'),
    pnl: numField('pnl', () => { const v = nums().pnl; return (v < 0 ? '-' : '+') + '$' + U.sig3(v); }),
    pct: numField('pct', () => { const v = nums().pct; return (v < 0 ? '-' : '+') + Math.abs(v).toFixed(2) + '%'; }),
    invested: numField('invested', () => '$' + U.sig3(S().invested)),
    position: numField('position', () => '$' + U.sig3(S().position)),
    lblPnl: textField('lblPnl'),
    lblInvested: textField('lblInvested'),
    lblPosition: textField('lblPosition'),
    handle: textField('handle'),
    promo: textField('promo'),
    site: textField('site'),
  };

  /* ---------- backgrounds ---------- */

  const bgIds = () => [...PRESETS.map((_, i) => 'preset:' + i), ...S().media.map((m) => m.id)];
  const currentItem = () => S().media.find((m) => m.id === S().bg) || null;

  function cycleBg(delta) {
    const ids = bgIds();
    const i = Math.max(0, ids.indexOf(S().bg));
    S().bg = ids[(i + delta + ids.length) % ids.length];
    Store.commit('pnl');
  }

  async function addMedia(file) {
    try {
      const m = await Store.media.put(file);
      S().media.push({ ...m, zoom: 1, x: 50, y: 50 });
      S().bg = m.id;
      Store.commit('pnl');
      App.toast(m.kind === 'video' ? 'Video background added.' : m.kind === 'gif' ? 'GIF background added.' : 'Background added.');
    } catch (e) {
      App.toast(e.message);
    }
  }

  async function removeMedia(id) {
    const s = S();
    const i = s.media.findIndex((m) => m.id === id);
    if (i < 0) return;
    s.media.splice(i, 1);
    if (s.bg === id) s.bg = s.media[i] ? s.media[i].id : s.media[i - 1] ? s.media[i - 1].id : 'preset:0';
    Store.commit('pnl');
    await Store.media.remove(id);
  }

  function frameRect(nw, nh, item) {
    const k = Math.max(W / nw, H / nh) * item.zoom;
    const dw = nw * k, dh = nh * k;
    return { dw, dh, dx: (W - dw) * item.x / 100, dy: (H - dh) * item.y / 100 };
  }

  function naturalSize(el) {
    if (!el) return null;
    if (el.tagName === 'VIDEO') return el.videoWidth ? { w: el.videoWidth, h: el.videoHeight } : null;
    return el.naturalWidth ? { w: el.naturalWidth, h: el.naturalHeight } : null;
  }

  function layoutMedia() {
    const item = currentItem();
    const n = naturalSize(mediaEl);
    if (!item || !n) return;
    const r = frameRect(n.w, n.h, item);
    Object.assign(mediaEl.style, { left: r.dx + 'px', top: r.dy + 'px', width: r.dw + 'px', height: r.dh + 'px' });
  }

  async function renderBg() {
    const sel = S().bg;
    const item = currentItem();
    const url = item ? await Store.media.url(item.id) : null;
    const key = item && url ? item.id : sel.startsWith('preset:') ? sel : 'preset:0';
    if (key === bgKey) { layoutMedia(); return; }
    bgKey = key;
    bgLayer.innerHTML = '';
    mediaEl = null;
    root.dataset.bgKind = item && url ? item.kind : 'preset';
    if (!item || !url) {
      bgLayer.appendChild(h('div', { class: 'axpnl-preset p' + (+key.slice(7) || 0) }));
      return;
    }
    if (item.kind === 'video') {
      const v = h('video', { class: 'axpnl-media', src: url, autoplay: true, loop: true, playsinline: true, preload: 'auto' });
      v.muted = true;
      v.addEventListener('loadedmetadata', layoutMedia);
      v.play().catch(() => {});
      mediaEl = v;
    } else {
      const img = h('img', { class: 'axpnl-media', src: url, alt: '', draggable: 'false' });
      img.addEventListener('load', layoutMedia);
      mediaEl = img;
    }
    bgLayer.appendChild(mediaEl);
    layoutMedia();
  }

  /* ---------- replica ---------- */

  function build() {
    root = h('div', { class: 'axpnl', 'data-replica': 'pnl' });
    root.innerHTML = `
      <div class="axpnl-bg"></div>
      <div class="axpnl-dim"></div>
      <div class="axpnl-mark">${AXIOM_MARK}</div>
      <div class="axpnl-word">AXIOM</div>
      <div class="axpnl-ticker" data-f="ticker"></div>
      <div class="axpnl-box"><span data-f="pnl"></span></div>
      <div class="axpnl-stats">
        <div class="axpnl-row"><span class="lbl" data-f="lblPnl"></span><span class="val pct" data-f="pct"></span></div>
        <div class="axpnl-row"><span class="lbl" data-f="lblInvested"></span><span class="val" data-f="invested"></span></div>
        <div class="axpnl-row"><span class="lbl" data-f="lblPosition"></span><span class="val" data-f="position"></span></div>
      </div>
      <div class="axpnl-avatar" title="Click to change the avatar"><div class="gem">${GEM}</div><div class="frame"><img alt="" draggable="false"></div></div>
      <div class="axpnl-handle" data-f="handle"></div>
      <div class="axpnl-promo"><span data-f="promo"></span><span class="site">${GLOBE}<span data-f="site"></span></span></div>
      <button class="axpnl-arrow up" type="button" aria-label="Previous background">${CHEV_UP}</button>
      <button class="axpnl-arrow down" type="button" aria-label="Next background">${CHEV_DOWN}</button>
      <div class="axpnl-dropnote no-export">Drop to use as background</div>`;
    bgLayer = U.$('.axpnl-bg', root);

    Inline.bind(root, fields);
    U.$('.axpnl-arrow.up', root).addEventListener('click', () => cycleBg(-1));
    U.$('.axpnl-arrow.down', root).addEventListener('click', () => cycleBg(1));

    const avatar = U.$('.axpnl-avatar', root);
    avatar.addEventListener('click', async () => {
      if (!App.isEditing()) return;
      const f = await Inline.pickFile('image/*');
      if (f) setAvatar(f);
    });
    Inline.dropzone(avatar, setAvatar);
    Inline.dropzone(root, addMedia);
    bindPanZoom();
    return root;
  }

  async function setAvatar(file) {
    try {
      if (U.mediaKind(file) === 'video') throw new Error('Avatars can be a picture or a GIF.');
      const m = await Store.media.put(file);
      if (S().avatar) Store.media.remove(S().avatar.id);
      S().avatar = { id: m.id, kind: m.kind };
      Store.commit('pnl');
    } catch (e) { App.toast(e.message); }
  }

  function bindPanZoom() {
    let drag = null;
    root.addEventListener('pointerdown', (e) => {
      const item = currentItem();
      if (!App.isEditing() || !item || !mediaEl || e.button !== 0) return;
      if (e.target.closest('[data-f], button, .axpnl-avatar')) return;
      if (Inline.isActive()) document.activeElement.blur(); // finish any text edit first
      const n = naturalSize(mediaEl);
      if (!n) return;
      const r = frameRect(n.w, n.h, item);
      drag = { x: e.clientX, y: e.clientY, r, item, id: e.pointerId };
      root.setPointerCapture(e.pointerId);
      root.classList.add('is-panning');
      e.preventDefault();
    });
    root.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const k = App.scale();
      const { r, item } = drag;
      const nx = r.dx + (e.clientX - drag.x) / k;
      const ny = r.dy + (e.clientY - drag.y) / k;
      if (W - r.dw !== 0) item.x = U.clamp((nx / (W - r.dw)) * 100, 0, 100);
      if (H - r.dh !== 0) item.y = U.clamp((ny / (H - r.dh)) * 100, 0, 100);
      layoutMedia();
    });
    const end = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      drag = null;
      root.classList.remove('is-panning');
      Store.commit('pnl');
    };
    root.addEventListener('pointerup', end);
    root.addEventListener('pointercancel', end);
    root.addEventListener('wheel', (e) => {
      const item = currentItem();
      if (!App.isEditing() || !item || !mediaEl) return;
      e.preventDefault();
      item.zoom = U.clamp(item.zoom * Math.exp(-e.deltaY * 0.0015), 1, 4);
      layoutMedia();
      Store.commit('pnl');
    }, { passive: false });
  }

  async function render() {
    const s = S();
    Inline.paint(root, fields);
    const n = nums();
    root.classList.toggle('is-loss', n.pnl < 0);
    root.classList.toggle('no-gem', !s.gem);
    root.classList.toggle('no-arrows', !s.arrows);
    U.$('.axpnl-dim', root).style.opacity = s.dim;
    const img = U.$('.axpnl-avatar img', root);
    const url = s.avatar ? await Store.media.url(s.avatar.id) : null;
    const src = url || DEFAULT_AVATAR;
    if (img.getAttribute('src') !== src) img.setAttribute('src', src);
    renderBg();
  }

  /* ---------- export ---------- */

  function drawMedia(ctx, R) {
    const item = currentItem();
    const n = naturalSize(mediaEl);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W * R, H * R);
    if (item && n) {
      const r = frameRect(n.w, n.h, item);
      ctx.drawImage(mediaEl, r.dx * R, r.dy * R, r.dw * R, r.dh * R);
    }
    if (S().dim > 0) {
      ctx.fillStyle = `rgba(0,0,0,${S().dim})`;
      ctx.fillRect(0, 0, W * R, H * R);
    }
  }

  async function capture(R) {
    if (!mediaEl) return Exporter.capture(root, { pixelRatio: R });
    const fg = await Exporter.capture(root, { pixelRatio: R, nodeClass: 'is-fg-only' });
    const out = document.createElement('canvas');
    out.width = fg.width;
    out.height = fg.height;
    const ctx = out.getContext('2d');
    drawMedia(ctx, fg.width / W);
    ctx.drawImage(fg, 0, 0);
    return out;
  }

  async function saveVideo(btn) {
    const item = currentItem();
    if (!item || item.kind === 'image' || !mediaEl) { App.toast('Pick a video or GIF background first.'); return; }
    if (!Exporter.canRecord()) { App.toast('This browser can’t record video. Try Chrome, Edge or Safari.'); return; }
    const label = btn.textContent;
    btn.disabled = true;
    try {
      document.activeElement && document.activeElement.blur();
      const R = 2;
      btn.textContent = 'Preparing…';
      const fg = await Exporter.capture(root, { pixelRatio: R, nodeClass: 'is-fg-only' });
      let duration;
      if (item.kind === 'video') {
        duration = U.clamp(isFinite(mediaEl.duration) ? mediaEl.duration : 6, 1, 30);
        mediaEl.currentTime = 0;
        await mediaEl.play().catch(() => {});
      } else {
        const d = await Exporter.gifDuration(await Store.media.url(item.id));
        duration = U.clamp(d || 5, 2, 20);
        mediaEl.src = mediaEl.src; // restart the GIF from its first frame
      }
      const { blob, ext } = await Exporter.record({
        width: fg.width,
        height: fg.height,
        duration,
        drawFrame: (ctx) => { drawMedia(ctx, R); ctx.drawImage(fg, 0, 0); },
        onProgress: (p) => { btn.textContent = `Recording ${Math.round(p * 100)}%`; },
      });
      Exporter.download(blob, `pnl-card-${Exporter.stamp()}.${ext}`);
      App.toast(`Saved a ${Math.round(duration)}s ${ext.toUpperCase()} video.`);
    } catch (e) {
      App.toast(e.message || 'Video export failed.');
    } finally {
      btn.disabled = false;
      btn.textContent = label;
    }
  }

  /* ---------- inspector ---------- */

  function buildInspector() {
    F = Form.create();
    const wrap = h('div', { class: 'ins-view' });

    // Background picker
    const thumbs = h('div', { class: 'ins-bgs' });
    let thumbsKey = '';
    const syncThumbs = async () => {
      const s = S();
      const key = bgIds().join('|') + '#' + s.bg;
      if (key === thumbsKey) return;
      thumbsKey = key;
      const nodes = [];
      PRESETS.forEach((name, i) => {
        const id = 'preset:' + i;
        const b = h('button', { type: 'button', class: 'ins-bg' + (s.bg === id ? ' is-on' : ''), title: name },
          h('div', { class: 'axpnl-preset p' + i }));
        b.addEventListener('click', () => { S().bg = id; Store.commit('pnl'); });
        nodes.push(b);
      });
      for (const m of s.media) {
        const url = await Store.media.url(m.id);
        const media = m.kind === 'video'
          ? h('video', { src: url, muted: true, loop: true, autoplay: true, playsinline: true })
          : h('img', { src: url, alt: '' });
        const del = h('span', { class: 'ins-bg-del', role: 'button', title: 'Remove', 'aria-label': 'Remove background' }, '×');
        const b = h('button', { type: 'button', class: 'ins-bg' + (s.bg === m.id ? ' is-on' : ''), title: m.name },
          media, m.kind !== 'image' ? h('span', { class: 'ins-bg-kind' }, m.kind === 'video' ? 'Video' : 'GIF') : null, del);
        b.addEventListener('click', (e) => {
          if (e.target === del) { removeMedia(m.id); return; }
          S().bg = m.id; Store.commit('pnl');
        });
        nodes.push(b);
      }
      const add = h('button', { type: 'button', class: 'ins-bg ins-bg-add', title: 'Add a picture, GIF or video' }, '+');
      add.addEventListener('click', async () => { const f = await Inline.pickFile('image/*,video/*'); if (f) addMedia(f); });
      Inline.dropzone(add, addMedia);
      nodes.push(add);
      thumbs.replaceChildren(...nodes);
    };

    const zoom = F.range({ min: 1, max: 4, step: 0.01, get: () => (currentItem() ? currentItem().zoom : 1), set: (v) => { const it = currentItem(); if (it) it.zoom = v; }, format: (v) => Math.round(v * 100) + '%' });
    const framing = h('div', { class: 'ins-framing' },
      F.field('Zoom', zoom),
      F.button('Center picture', () => { const it = currentItem(); if (it) { it.zoom = 1; it.x = 50; it.y = 50; Store.commit('pnl'); } }, 'ghost'));

    const videoBtn = F.button('Save video', () => saveVideo(videoBtn), 'secondary');

    wrap.append(
      F.section('Background', thumbs,
        F.note('Drop a picture, GIF or video anywhere on the card. Drag it to reposition, scroll to zoom. The arrows on the card switch backgrounds.'),
        framing,
        F.field('Darken', F.range({ min: 0, max: 0.7, step: 0.01, get: () => S().dim, set: (v) => { S().dim = v; }, format: (v) => Math.round(v * 100) + '%' }))),
      F.section('Token', F.field('Name above the PnL', F.text({ get: () => S().ticker, set: (v) => { S().ticker = v; } }))),
      F.section('Numbers',
        F.toggle({ label: 'Calculate PnL from Invested and Position', get: () => S().auto, set: setAuto }),
        F.row(
          F.field('PnL ($)', F.num({ get: () => nums().pnl, set: setNum.pnl, decimals: 2 })),
          F.field('PnL (%)', F.num({ get: () => nums().pct, set: setNum.pct, decimals: 2 }))),
        F.row(
          F.field('Invested ($)', F.num({ get: () => S().invested, set: setNum.invested })),
          F.field('Position ($)', F.num({ get: () => S().position, set: setNum.position })))),
      F.section('Profile',
        F.media({
          label: 'Avatar picture or GIF',
          accept: 'image/*',
          getUrl: () => (S().avatar ? Store.media.url(S().avatar.id) : Promise.resolve(null)),
          getKind: () => 'image',
          onFile: setAvatar,
          onClear: () => { if (S().avatar) Store.media.remove(S().avatar.id); S().avatar = null; Store.commit('pnl'); },
        }),
        F.field('Username', F.text({ get: () => S().handle, set: (v) => { S().handle = v; } })),
        F.toggle({ label: 'Show diamond badge', get: () => S().gem, set: (v) => { S().gem = v; } })),
      F.section('Footer',
        F.field('Promo text', F.text({ get: () => S().promo, set: (v) => { S().promo = v; } })),
        F.field('Website', F.text({ get: () => S().site, set: (v) => { S().site = v; } })),
        F.toggle({ label: 'Show background arrows', get: () => S().arrows, set: (v) => { S().arrows = v; } })),
      F.section('Export',
        F.row(F.button('Save image', () => App.saveImage(), 'primary'), videoBtn),
        F.note('Save video records the card with your video or GIF background playing.')),
      F.section(null, F.button('Restore original card', async () => {
        const old = [...S().media.map((m) => m.id), S().avatar && S().avatar.id].filter(Boolean);
        Store.reset('pnl');
        old.forEach((id) => Store.media.remove(id));
        App.toast('Card restored.');
      }, 'link')),
    );

    const baseSync = F.sync;
    F.sync = () => {
      syncThumbs();
      const it = currentItem();
      framing.hidden = !it;
      videoBtn.hidden = !it || it.kind === 'image';
      baseSync();
    };
    return wrap;
  }

  App.register('pnl', {
    label: 'PnL card',
    size: () => ({ w: W, h: H }),
    build,
    buildInspector,
    render,
    sync: () => F && F.sync(),
    exportNode: () => root,
    capture,
    filename: () => `pnl-card-${(S().ticker || 'card').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
  });
})();
