/* Trade share screen (fomo) replica + inspector. */
(function () {
  const h = U.h;
  const W = 1180, H = 1082;           // whole screen
  const CW = 528, CH = 619;           // card
  const CX = (W - CW) / 2, CY = 193;  // card position on the screen
  const S = () => Store.state.trade;

  // chart geometry, in chart-box coordinates (box sits at card x 9, y 95)
  const G = { left: 9, top: 95, w: 510, h: 195, topY: 20, zeroY: 129, x0: 0, n: 34, pitch: 7.6, body: 5.6, lineEnd: 400 };

  const IC = {
    back: '<svg viewBox="0 0 10 16" width="9" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2 2 8l6 6"/></svg>',
    left: '<svg viewBox="0 0 12 20" width="10" height="17" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 2.5 2.5 10l7 7.5"/></svg>',
    right: '<svg viewBox="0 0 12 20" width="10" height="17" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 2.5 9.5 10l-7 7.5"/></svg>',
    save: '<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="2.5" y="2.5" width="15" height="15" rx="3.5"/><circle cx="7.6" cy="7.6" r="1.7" fill="currentColor" stroke="none"/><path d="M17.5 12.6 13.4 9 4 17.4" stroke-linecap="round"/></svg>',
    copy: '<svg viewBox="0 0 20 20" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="6.5" y="6.5" width="11" height="11" rx="2.5"/><path d="M13.5 6.5V4.8c0-1.3-1-2.3-2.3-2.3H4.8c-1.3 0-2.3 1-2.3 2.3v6.4c0 1.3 1 2.3 2.3 2.3h1.7"/></svg>',
    link: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M9.5 7.5H7a4.5 4.5 0 0 0 0 9h2.5M14.5 7.5H17a4.5 4.5 0 0 1 0 9h-2.5M8.5 12h7"/></svg>',
    x: '<svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor"><path d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.3L5.3 21H2.2l7.2-8.3L1.9 3h6.4l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.3 4.7H5.5l11.2 14.5Z"/></svg>',
    pause: '<svg viewBox="0 0 14 18" width="13" height="17" fill="currentColor"><rect x="1.5" y="1.5" width="3.6" height="15" rx="1.3"/><rect x="8.9" y="1.5" width="3.6" height="15" rx="1.3"/></svg>',
    play: '<svg viewBox="0 0 14 18" width="13" height="17" fill="currentColor"><path d="M2 2.4v13.2c0 .9 1 1.4 1.7.9l9.4-6.6c.6-.4.6-1.4 0-1.8L3.7 1.5C3 1 2 1.5 2 2.4Z"/></svg>',
    eye: '<svg viewBox="0 0 22 14" width="21" height="13" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M1.5 7S5 1.5 11 1.5 20.5 7 20.5 7 17 12.5 11 12.5 1.5 7 1.5 7Z"/><circle cx="11" cy="7" r="2.6"/></svg>',
    eyeOff: '<svg viewBox="0 0 22 14" width="21" height="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M1.5 7S5 1.5 11 1.5 20.5 7 20.5 7 17 12.5 11 12.5 1.5 7 1.5 7Z"/><path d="M3 13 19 1"/></svg>',
    candles: '<svg viewBox="0 0 20 20" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M4.5 2.5v15M10 4v12M15.5 2.5v15"/><rect x="2.8" y="6" width="3.4" height="7" rx=".8" fill="currentColor"/><rect x="8.3" y="8" width="3.4" height="5" rx=".8" fill="currentColor"/><rect x="13.8" y="5" width="3.4" height="8" rx=".8" fill="currentColor"/></svg>',
    line: '<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 11h3l2.5-6 4 10 3-7 1.5 3h3"/></svg>',
  };

  const DEFAULT_AVATAR = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><radialGradient id="g" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#e9edf5"/><stop offset="1" stop-color="#9aa3b5"/></radialGradient></defs><rect width="64" height="64" fill="url(#g)"/><circle cx="31" cy="26" r="11" fill="#6f7789"/><path d="M10 64c2-14 11-21 21-21s19 7 21 21z" fill="#5d6577"/></svg>');
  const DEFAULT_TOKEN = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs><radialGradient id="t" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#c9d6ff"/><stop offset=".45" stop-color="#5b6fd6"/><stop offset="1" stop-color="#1b2257"/></radialGradient></defs><circle cx="16" cy="16" r="16" fill="url(#t)"/><path d="M6 19c4-2 8-2.5 12-1.5s6 1 8-.5" stroke="#e8edff" stroke-opacity=".55" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="11" cy="11" r="3" fill="#fff" fill-opacity=".35"/></svg>');

  let screen, card, chartSvg, F;
  let playing = false, raf = 0, lastT = 0, resumeAt = null;

  /* ---------- numbers ---------- */

  function nums() {
    const s = S();
    if (!s.auto) return { pnl: s.pnl, pct: s.pct };
    const r = s.entry ? s.current / s.entry - 1 : 0;
    return { pnl: s.invested * r, pct: r * 100 };
  }
  const setNum = {
    pnl(v) { const s = S(); if (s.auto) { if (s.invested) s.current = s.entry * (1 + v / s.invested); } else s.pnl = v; },
    pct(v) { const s = S(); if (s.auto) s.current = s.entry * (1 + v / 100); else s.pct = v; },
    invested(v) { S().invested = v; },
    entry(v) { S().entry = v; },
    current(v) { S().current = v; },
  };
  function setAuto(on) {
    const s = S();
    if (!on && s.auto) { const n = nums(); s.pnl = n.pnl; s.pct = n.pct; }
    s.auto = on;
  }

  const num = (key, show, edit) => ({
    get: show,
    edit: edit || show,
    set: (raw) => { const v = U.parseNum(raw); if (isNaN(v)) return false; setNum[key](v); },
  });
  const text = (key) => ({ get: () => S()[key], set: (raw) => { S()[key] = raw; } });

  const fields = {
    username: text('username'),
    status: text('status'),
    date: text('date'),
    tag: text('tag'),
    token: text('token'),
    pnl: num('pnl', () => U.fullMoney(nums().pnl, true)),
    pct: num('pct', () => Math.abs(nums().pct).toFixed(2) + '%', () => U.pct2(nums().pct)),
    invested: num('invested', () => '$' + U.dec1(S().invested)),
    entry: num('entry', () => '$' + U.dec1(S().entry)),
    current: num('current', () => '$' + U.dec1(S().current)),
    brand: text('brand'),
    promo: text('promo'),
    code: text('code'),
    thesis: text('thesis'),
    link: text('link'),
    x0: { get: () => S().xLabels[0], set: (v) => { S().xLabels[0] = v; } },
    x1: { get: () => S().xLabels[1], set: (v) => { S().xLabels[1] = v; } },
  };

  /* ---------- chart ---------- */

  function series() {
    const s = S();
    const rnd = U.rng(s.seed * 9973 + 17);
    const C = Math.max(1e-9, Math.abs(s.current) || 1);
    const E = Math.max(1e-9, Math.abs(s.entry) || C);
    // seed 7 (the default) reproduces the reference: $9.9M top label for a $3.6M entry
    const peak = Math.max(C, E) * (2.74 + 0.45 * Math.sin(s.seed * 1.7 - 11.9));
    const base = C * (0.17 + rnd() * 0.06);
    const pre = 7 + Math.floor(rnd() * 2);
    const out = [];
    for (let i = 0; i < pre; i++) {
      const p = base * (1 + (rnd() - 0.5) * 0.02);
      out.push({ o: p, c: p, hi: p, lo: p, flat: true });
    }
    const first = Math.max(C, E) * (1.02 + rnd() * 0.12);
    out.push({ o: base, c: first, hi: peak, lo: base });
    let prev = first;
    const rest = G.n - out.length;
    for (let i = 1; i <= rest; i++) {
      const t = i / rest;
      // chop around a path that drifts from the entry toward the current price
      const target = (E * (1 - t) + C * t) * (1 + Math.sin(i * 0.55 + s.seed) * 0.07);
      const c = target + (rnd() - 0.5) * C * 0.45;
      const o = prev;
      const close = i === rest ? C : c;
      out.push({ o, c: close, hi: Math.max(o, close) * (1 + rnd() * 0.09), lo: Math.min(o, close) * (1 - rnd() * 0.09) });
      prev = close;
    }
    const entryIdx = pre + 1 + out.slice(pre + 1).reduce((best, k, i, arr) => (Math.abs(k.c - E) < Math.abs(arr[best].c - E) ? i : best), 0);
    return { candles: out, peak, entryIdx };
  }

  function drawChart(progress) {
    const s = S();
    const { candles, peak, entryIdx } = series();
    const yOf = (p) => G.zeroY - (p / peak) * (G.zeroY - G.topY);
    const xOf = (i) => G.x0 + i * G.pitch + G.pitch / 2;
    const visible = Math.max(1, Math.ceil(candles.length * progress));
    const parts = [];
    const cY = yOf(Math.abs(s.current));

    // current price line
    parts.push(`<line x1="0" x2="${G.lineEnd}" y1="${cY}" y2="${cY}" class="pl"/>`);

    if (s.chart === 'line') {
      const pts = candles.slice(0, visible).map((k, i) => `${xOf(i).toFixed(1)},${yOf(k.c).toFixed(1)}`);
      const lastX = xOf(visible - 1).toFixed(1);
      parts.push(`<path class="area" d="M${xOf(0)},${G.zeroY} L${pts.join(' L')} L${lastX},${G.zeroY} Z"/>`);
      parts.push(`<polyline class="ln" points="${pts.join(' ')}"/>`);
    } else {
      const flat = [];
      candles.slice(0, visible).forEach((k, i) => {
        if (k.flat) { flat.push(`${(G.x0 + i * G.pitch).toFixed(1)},${yOf(k.c).toFixed(1)}`, `${(G.x0 + (i + 1) * G.pitch).toFixed(1)},${yOf(k.c).toFixed(1)}`); return; }
        const up = k.c >= k.o;
        const x = xOf(i);
        const y1 = yOf(Math.max(k.o, k.c)), y2 = yOf(Math.min(k.o, k.c));
        parts.push(`<g class="${up ? 'up' : 'dn'}"><line x1="${x}" x2="${x}" y1="${yOf(k.hi)}" y2="${yOf(k.lo)}"/><rect x="${(x - G.body / 2).toFixed(2)}" y="${y1.toFixed(2)}" width="${G.body}" height="${Math.max(1, y2 - y1).toFixed(2)}" rx=".4"/></g>`);
      });
      if (flat.length) parts.push(`<polyline class="flat" points="${flat.join(' ')}"/>`);
    }

    if (s.show.buysell && entryIdx < visible) {
      const k = candles[entryIdx];
      const x = xOf(entryIdx), y = yOf(k.lo) + 4;
      parts.push(`<path class="mk buy" d="M${x} ${y}l3.2 5.2h-6.4z"/>`);
      if (/close|sold|exit/i.test(s.status) && visible === candles.length) {
        const j = candles.length - 1, kk = candles[j];
        const xs = xOf(j), ys = yOf(kk.hi) - 4;
        parts.push(`<path class="mk sell" d="M${xs} ${ys}l3.2 -5.2h-6.4z"/>`);
      }
    }
    chartSvg.innerHTML = parts.join('');

    // axis labels + price tag
    U.$('.ylab.top', card).textContent = '$' + U.dec1(peak);
    U.$('.ylab.top', card).style.top = G.top + G.topY + 'px';
    U.$('.ylab.mid', card).textContent = '$' + U.dec1(peak / 2);
    U.$('.ylab.mid', card).style.top = G.top + yOf(peak / 2) + 'px';
    const tag = U.$('.ptag', card);
    tag.textContent = '$' + U.dec1(Math.abs(s.current));
    tag.style.top = G.top + cY + 'px';
    tag.classList.toggle('is-down', s.current < s.entry);
  }

  /* ---------- replay ---------- */

  // Play starts from the beginning unless the replay was paused or scrubbed part-way.
  function setPlaying(on) {
    if (!on && playing) resumeAt = S().progress;
    playing = on;
    cancelAnimationFrame(raf);
    if (on) {
      S().progress = resumeAt != null && resumeAt < 1 ? resumeAt : 0;
      resumeAt = null;
      lastT = performance.now();
      raf = requestAnimationFrame(step);
    }
    render();
  }

  function step(t) {
    const dt = (t - lastT) / 1000;
    lastT = t;
    const s = S();
    s.progress = Math.min(1, s.progress + (dt / 6) * s.speed);
    renderReplay();
    if (s.progress >= 1) { playing = false; Store.commit('trade'); return; }
    raf = requestAnimationFrame(step);
  }

  function renderReplay() {
    const s = S();
    U.$('.fomo-progress i', screen).style.width = (s.progress * 100).toFixed(2) + '%';
    U.$('.fomo-play', screen).innerHTML = playing ? IC.pause : IC.play;
    drawChart(playing ? s.progress : 1);
  }

  /* ---------- replica ---------- */

  function build() {
    screen = h('div', { class: 'fomo', 'data-replica': 'trade' });
    screen.style.setProperty('--cx', CX + 'px');
    screen.innerHTML = `
      <button class="fomo-back" type="button">${IC.back}<span>Back</span></button>
      <div class="fomo-tabs">
        <button type="button" data-tab="position">Position</button>
        <button type="button" data-tab="thesis">Thesis</button>
      </div>
      <button class="fomo-nav prev" type="button" aria-label="Previous chart">${IC.left}</button>
      <button class="fomo-nav next" type="button" aria-label="Next chart">${IC.right}</button>

      <div class="fomo-card">
        <div class="fomo-body">
          <div class="fomo-avatar" title="Click to change the avatar"><img alt="" draggable="false"></div>
          <div class="fomo-user" data-f="username"></div>
          <div class="fomo-status" data-f="status"></div>
          <div class="fomo-date" data-f="date"></div>
          <div class="fomo-tag" data-f="tag"></div>

          <div class="fomo-chart">
            <svg class="fomo-svg" viewBox="0 0 ${G.w} ${G.h}" width="${G.w}" height="${G.h}"></svg>
            <span class="xlab a" data-f="x0"></span>
            <span class="xlab b" data-f="x1"></span>
          </div>
          <span class="ylab top"></span>
          <span class="ylab mid"></span>
          <span class="ptag"></span>
          <div class="fomo-thesis"><div class="fomo-thesis-h">Thesis</div><p data-f="thesis"></p></div>

          <div class="fomo-panel">
            <div class="fomo-token"><span class="fomo-token-ic" title="Click to change the token icon"><img alt="" draggable="false"></span><span data-f="token"></span></div>
            <div class="fomo-pnl"><span class="amt" data-f="pnl"></span><span class="pct"><b>(</b><i class="arr"></i><span data-f="pct"></span><b>)</b></span></div>
            <div class="fomo-cols">
              <div><span>Invested</span><strong data-f="invested"></strong></div>
              <div><span>Avg. entry</span><strong data-f="entry"></strong></div>
              <div><span>Current</span><strong data-f="current"></strong></div>
            </div>
          </div>
        </div>
        <div class="fomo-foot">
          <div class="fomo-logo" data-f="brand"></div>
          <div class="fomo-ref"><span data-f="promo"></span><strong data-f="code"></strong></div>
        </div>
      </div>

      <div class="fomo-side">
        <button class="fomo-sbtn save" type="button">${IC.save}<span>Save image</span></button>
        <button class="fomo-sbtn copyimg" type="button">${IC.copy}<span>Copy image</span></button>
        <div class="fomo-linkbox">${IC.link}<span data-f="link"></span></div>
        <div class="fomo-circles">
          <button class="fomo-circle copylink" type="button"><span class="c">${IC.link}</span><span class="t">Copy link</span></button>
          <button class="fomo-circle xpost" type="button"><span class="c">${IC.x}</span><span class="t">X</span></button>
        </div>
      </div>

      <div class="fomo-replay">
        <button class="fomo-play" type="button" aria-label="Replay trade"></button>
        <span class="fomo-replay-t">Replay trade</span>
        <button class="fomo-speed" type="button"></button>
        <div class="fomo-progress"><i></i></div>
      </div>
      <div class="fomo-chips">
        <div class="row">
          <button type="button" data-chip="pnl"><i></i>PnL ($)</button>
          <button type="button" data-chip="buysell"><i></i>Buy/Sell</button>
          <button type="button" data-chip="ref"><i></i>Ref code</button>
        </div>
        <div class="row">
          <button type="button" data-chip="thesis"><i></i>Thesis</button>
          <button type="button" class="ct" data-chart="candle">${IC.candles}</button>
          <button type="button" class="ct" data-chart="line">${IC.line}</button>
        </div>
      </div>`;
    card = U.$('.fomo-card', screen);
    chartSvg = U.$('.fomo-svg', screen);

    Inline.bind(screen, fields);

    U.$$('.fomo-tabs button', screen).forEach((b) => b.addEventListener('click', () => { S().tab = b.dataset.tab; Store.commit('trade'); }));
    U.$('.fomo-nav.prev', screen).addEventListener('click', () => { S().seed = Math.max(1, S().seed - 1); Store.commit('trade'); });
    U.$('.fomo-nav.next', screen).addEventListener('click', () => { S().seed += 1; Store.commit('trade'); });
    U.$('.fomo-play', screen).addEventListener('click', () => setPlaying(!playing));
    U.$('.fomo-speed', screen).addEventListener('click', () => { const s = S(); s.speed = s.speed >= 4 ? 1 : s.speed * 2; Store.commit('trade'); });
    U.$('.fomo-progress', screen).addEventListener('click', (e) => {
      const r = e.currentTarget.getBoundingClientRect();
      resumeAt = U.clamp((e.clientX - r.left) / r.width, 0, 0.999);
      if (playing) { S().progress = resumeAt; resumeAt = null; } else setPlaying(true);
    });
    U.$$('[data-chip]', screen).forEach((b) => b.addEventListener('click', () => { const k = b.dataset.chip; S().show[k] = !S().show[k]; Store.commit('trade'); }));
    U.$$('[data-chart]', screen).forEach((b) => b.addEventListener('click', () => { S().chart = b.dataset.chart; Store.commit('trade'); }));
    U.$('.fomo-sbtn.save', screen).addEventListener('click', () => App.saveImage());
    U.$('.fomo-sbtn.copyimg', screen).addEventListener('click', () => App.copyImage());
    U.$('.fomo-circle.copylink', screen).addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(S().link); App.toast('Link copied.'); } catch (e) { App.toast('Couldn’t copy the link.'); }
    });

    const avatar = U.$('.fomo-avatar', screen);
    avatar.addEventListener('click', async () => { if (!App.isEditing()) return; const f = await Inline.pickFile('image/*'); if (f) setImage('avatar', f); });
    Inline.dropzone(avatar, (f) => setImage('avatar', f));
    const tokenIc = U.$('.fomo-token-ic', screen);
    tokenIc.addEventListener('click', async (e) => { if (!App.isEditing()) return; e.stopPropagation(); const f = await Inline.pickFile('image/*'); if (f) setImage('tokenIcon', f); });
    Inline.dropzone(tokenIc, (f) => setImage('tokenIcon', f));
    return screen;
  }

  async function setImage(key, file) {
    try {
      if (U.mediaKind(file) === 'video') throw new Error('Use a picture or a GIF here.');
      const m = await Store.media.put(file);
      if (S()[key]) Store.media.remove(S()[key].id);
      S()[key] = { id: m.id, kind: m.kind };
      Store.commit('trade');
    } catch (e) { App.toast(e.message); }
  }

  async function setImg(el, media, fallback) {
    const url = media ? await Store.media.url(media.id) : null;
    const src = url || fallback;
    if (el.getAttribute('src') !== src) el.setAttribute('src', src);
  }

  function render() {
    const s = S();
    Inline.paint(screen, fields);
    const n = nums();
    screen.dataset.tab = s.tab;
    screen.classList.toggle('is-up', n.pnl >= 0);
    screen.classList.toggle('hide-pnl', !s.show.pnl);
    screen.classList.toggle('hide-ref', !s.show.ref);
    screen.classList.toggle('show-thesis', s.tab === 'thesis' && s.show.thesis);
    screen.classList.toggle('is-closed', /close|sold|exit/i.test(s.status));
    U.$('.fomo-pnl .arr', screen).textContent = n.pct < 0 ? '▼' : '▲';
    U.$$('.fomo-tabs button', screen).forEach((b) => b.classList.toggle('is-on', b.dataset.tab === s.tab));
    U.$$('[data-chip]', screen).forEach((b) => {
      const on = !!s.show[b.dataset.chip];
      b.classList.toggle('is-off', !on);
      b.querySelector('i').innerHTML = on ? IC.eye : IC.eyeOff;
    });
    U.$$('[data-chart]', screen).forEach((b) => b.classList.toggle('is-on', b.dataset.chart === s.chart));
    U.$('.fomo-speed', screen).textContent = s.speed + 'x';
    setImg(U.$('.fomo-avatar img', screen), s.avatar, DEFAULT_AVATAR);
    setImg(U.$('.fomo-token-ic img', screen), s.tokenIcon, DEFAULT_TOKEN);
    renderReplay();
  }

  /* ---------- inspector ---------- */

  function buildInspector() {
    F = Form.create();
    const wrap = h('div', { class: 'ins-view' });
    const imgTile = (key, label) => F.media({
      label,
      accept: 'image/*',
      getUrl: () => (S()[key] ? Store.media.url(S()[key].id) : Promise.resolve(null)),
      onFile: (f) => setImage(key, f),
      onClear: () => { if (S()[key]) Store.media.remove(S()[key].id); S()[key] = null; Store.commit('trade'); },
    });

    wrap.append(
      F.section(null, F.note('Click any text on the card to edit it. Click the avatar or token icon to change the picture.')),
      F.section('Token',
        F.field('Token name', F.text({ get: () => S().token, set: (v) => { S().token = v; } })),
        imgTile('tokenIcon', 'Token icon')),
      F.section('Numbers',
        F.row(
          F.field('Invested ($)', F.num({ get: () => S().invested, set: setNum.invested })),
          F.field('Avg. entry ($)', F.num({ get: () => S().entry, set: setNum.entry }))),
        F.row(
          F.field('Current ($)', F.num({ get: () => S().current, set: setNum.current })),
          h('span')),
        F.toggle({ label: 'Calculate PnL from these numbers', get: () => S().auto, set: setAuto }),
        F.row(
          F.field('PnL ($)', F.num({ get: () => nums().pnl, set: setNum.pnl, decimals: 2 })),
          F.field('PnL (%)', F.num({ get: () => nums().pct, set: setNum.pct, decimals: 2 })))),
      F.section('Footer',
        F.field('Promo text', F.text({ get: () => S().promo, set: (v) => { S().promo = v; } })),
        F.field('Ref code', F.text({ get: () => S().code, set: (v) => { S().code = v; } }))),
      F.section('Trader',
        imgTile('avatar', 'Avatar picture or GIF'),
        F.row(
          F.field('Username', F.text({ get: () => S().username, set: (v) => { S().username = v; } })),
          F.field('Status', F.segment({ options: [['Open', 'Open'], ['Closed', 'Closed']], get: () => S().status, set: (v) => { S().status = v; } }))),
        F.row(
          F.field('Date', F.text({ get: () => S().date, set: (v) => { S().date = v; } })),
          F.field('Corner label', F.text({ get: () => S().tag, set: (v) => { S().tag = v; } })))),
      F.section('Chart',
        F.field('Style', F.segment({ options: [['candle', 'Candles'], ['line', 'Line']], get: () => S().chart, set: (v) => { S().chart = v; } })),
        F.row(
          F.button('Previous shape', () => { S().seed = Math.max(1, S().seed - 1); Store.commit('trade'); }, 'ghost'),
          F.button('Next shape', () => { S().seed += 1; Store.commit('trade'); }, 'ghost')),
        F.row(
          F.field('Time label 1', F.text({ get: () => S().xLabels[0], set: (v) => { S().xLabels[0] = v; } })),
          F.field('Time label 2', F.text({ get: () => S().xLabels[1], set: (v) => { S().xLabels[1] = v; } }))),
        F.note('The chart is drawn from Avg. entry and Current. Replay trade under the card animates it.')),
      F.section('Thesis', F.field('Shown on the Thesis tab', F.text({ multiline: true, get: () => S().thesis, set: (v) => { S().thesis = v; } }))),
      F.section('Export',
        F.row(F.button('Save card', () => App.saveImage(), 'primary'), F.button('Save full screen', () => App.saveImage({ full: true }), 'secondary')),
        F.button('Copy card image', () => App.copyImage(), 'ghost')),
      F.section(null, F.button('Restore original trade', () => {
        [S().avatar, S().tokenIcon].filter(Boolean).forEach((m) => Store.media.remove(m.id));
        setPlaying(false);
        Store.reset('trade');
        App.toast('Trade restored.');
      }, 'link')),
    );
    return wrap;
  }

  App.register('trade', {
    label: 'Trade card',
    size: () => ({ w: W, h: H }),
    build,
    buildInspector,
    render,
    sync: () => F && F.sync(),
    exportNode: (opts) => (opts && opts.full ? screen : card),
    filename: (opts) => `trade-${(S().token || 'card').toLowerCase().replace(/[^a-z0-9]+/g, '-')}${opts && opts.full ? '-screen' : ''}`,
    beforeExport: () => { if (playing) setPlaying(false); },
  });
})();
