/* PNL Calendar (Axiom) replica + inspector. */
(function () {
  const h = U.h;
  const W = 1018, H = 800;
  const S = () => Store.state.calendar;

  const ICON = {
    left: '<svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 3.5 5 7l3.5 3.5"/></svg>',
    right: '<svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 3.5 9 7l-3.5 3.5"/></svg>',
    swap: '<svg viewBox="0 0 13 14" width="13" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 12V2M1 4.5 3.5 2 6 4.5M9.5 2v10M7 9.5 9.5 12 12 9.5"/></svg>',
    share: '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8 10V2.2M4.8 5.2 8 2l3.2 3.2"/><path d="M2.5 9.5v3.2c0 .7.6 1.3 1.3 1.3h8.4c.7 0 1.3-.6 1.3-1.3V9.5"/></svg>',
    close: '<svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M2 2l8 8M10 2l-8 8"/></svg>',
    sol: '<svg class="sol" viewBox="0 0 397 311" aria-hidden="true"><defs><linearGradient id="solg" x1="360" y1="-37" x2="141" y2="383" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#00FFA3"/><stop offset="1" stop-color="#DC1FFF"/></linearGradient></defs><path fill="url(#solg)" d="M64.6 237.9a13 13 0 0 1 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7a13 13 0 0 1-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7zM64.6 3.8A13.4 13.4 0 0 1 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7a13 13 0 0 1-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8zM333.1 120.1a13 13 0 0 0-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7a13 13 0 0 0 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z"/></svg>',
  };
  const AXIOM_MARK = '<svg viewBox="0 0 83 71" aria-hidden="true"><path fill="currentColor" d="M41.5 0 60.6 32.6H22.4L41.5 0ZM15.4 44h52.2L83 71H0l15.4-27Z"/></svg>';

  let root, grid, els = {}, editing = null, editorInput = null, F;

  /* ---------- data ---------- */

  function monthInfo() {
    const { y, m } = U.parseYM(S().ym);
    const n = U.daysIn(y, m);
    const lead = (new Date(y, m, 1).getDay() + 6) % 7; // Monday first
    return { y, m, n, lead };
  }

  function stats() {
    const { y, m, n } = monthInfo();
    const days = S().days;
    let posN = 0, posSum = 0, negN = 0, negSum = 0, maxPos = 0, maxNeg = 0, last = 0;
    const vals = [];
    for (let d = 1; d <= n; d++) {
      const v = days[U.ymd(y, m, d)];
      vals[d] = v;
      if (v == null) continue;
      last = d;
      if (v > 0) { posN++; posSum += v; maxPos = Math.max(maxPos, v); }
      else if (v < 0) { negN++; negSum += v; maxNeg = Math.max(maxNeg, -v); }
    }
    let best = 0, run = 0;
    for (let d = 1; d <= n; d++) {
      if (vals[d] != null && vals[d] > 0) { run++; best = Math.max(best, run); } else run = 0;
    }
    let cur = 0;
    for (let d = last; d >= 1; d--) {
      if (vals[d] != null && vals[d] > 0) cur++; else break;
    }
    return { posN, posSum, negN, negSum, maxPos, maxNeg, best, cur, net: posSum + negSum };
  }

  function tierOf(v, st) {
    if (v == null) return { tier: 'empty' };
    if (v === 0) return { tier: 'zero', a: 0.05 };
    if (v < 0) {
      const r = st.maxNeg ? -v / st.maxNeg : 1;
      return { tier: 'red', a: 0.08 + 0.12 * r };
    }
    const r = st.maxPos ? v / st.maxPos : 1;
    const cut = S().mediumCut / 100;
    // tint strength follows the day's size relative to the best day (sampled from the original)
    if (r >= cut) return { tier: 'green', a: 0.065 + 0.115 * r };
    return { tier: 'yellow', a: 0.1 + 0.07 * (r / Math.max(0.0001, cut)) };
  }

  function money(v, plus) {
    const sign = U.signOf(v, plus);
    return S().currency === 'SOL' ? `${sign}${ICON.sol}${U.sig3(v)}` : `${sign}$${U.sig3(v)}`;
  }

  /* ---------- replica ---------- */

  function build() {
    root = h('div', { class: 'axcal', 'data-replica': 'calendar' });
    root.innerHTML = `
      <div class="axcal-title">PNL Calendar</div>
      <button class="axcal-btn axcal-prev" type="button" aria-label="Previous month">${ICON.left}</button>
      <div class="axcal-month"></div>
      <button class="axcal-btn axcal-next" type="button" aria-label="Next month">${ICON.right}</button>
      <button class="axcal-btn axcal-cur" type="button">${ICON.swap}<span></span></button>
      <button class="axcal-btn axcal-share" type="button" aria-label="Save image">${ICON.share}</button>
      <button class="axcal-btn axcal-close" type="button" aria-label="Close">${ICON.close}</button>
      <div class="axcal-total"></div>
      <div class="axcal-bar"><i class="pos"></i><i class="neg"></i></div>
      <div class="axcal-count pos"></div>
      <div class="axcal-count neg"></div>
      <div class="axcal-week">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d) => `<span>${d}</span>`).join('')}</div>
      <div class="axcal-rule"></div>
      <div class="axcal-grid"></div>
      <div class="axcal-foot">
        <div class="axcal-pill">Current Positive Streak: <b class="cur"></b></div>
        <div class="axcal-pill">Best Positive Streak in <span class="mon"></span>: <b class="best"></b></div>
      </div>
      <div class="axcal-brand">${AXIOM_MARK}<span>AXIOM</span></div>`;
    els = {
      month: U.$('.axcal-month', root),
      cur: U.$('.axcal-cur span', root),
      total: U.$('.axcal-total', root),
      barPos: U.$('.axcal-bar .pos', root),
      barNeg: U.$('.axcal-bar .neg', root),
      cntPos: U.$('.axcal-count.pos', root),
      cntNeg: U.$('.axcal-count.neg', root),
      streakCur: U.$('.axcal-foot .cur', root),
      streakBest: U.$('.axcal-foot .best', root),
      streakMon: U.$('.axcal-foot .mon', root),
    };
    grid = U.$('.axcal-grid', root);

    U.$('.axcal-prev', root).addEventListener('click', () => shiftMonth(-1));
    U.$('.axcal-next', root).addEventListener('click', () => shiftMonth(1));
    U.$('.axcal-cur', root).addEventListener('click', () => {
      S().currency = S().currency === 'USD' ? 'SOL' : 'USD';
      Store.commit('calendar');
    });
    U.$('.axcal-share', root).addEventListener('click', () => App.saveImage());

    grid.addEventListener('keydown', (e) => {
      const cell = e.target.closest('.cell[data-key]');
      if (!cell || e.target !== cell || !App.isEditing() || (e.key !== 'Enter' && e.key !== ' ')) return;
      e.preventDefault();
      openEditor(cell.dataset.key);
    });
    grid.addEventListener('click', (e) => {
      const cell = e.target.closest('.cell[data-key]');
      if (!cell || !App.isEditing() || cell.dataset.key === editing) return;
      openEditor(cell.dataset.key);
    });
    return root;
  }

  function shiftMonth(delta) {
    closeEditor(true);
    const { y, m } = U.parseYM(S().ym);
    S().ym = U.ym(y, m + delta);
    Store.commit('calendar');
  }

  function render() {
    const { y, m, n, lead } = monthInfo();
    const st = stats();
    const s = S();

    els.month.textContent = `${U.MON[m]} ${y}`;
    els.cur.textContent = s.currency;
    els.total.innerHTML = money(st.net, true);
    els.total.classList.toggle('is-neg', st.net < 0);
    const tot = st.posSum + -st.negSum;
    els.barPos.style.flexGrow = tot ? st.posSum / tot : 0;
    els.barNeg.style.flexGrow = tot ? -st.negSum / tot : 0;
    root.classList.toggle('is-blank', !tot);
    els.cntPos.innerHTML = `${st.posN} / ${money(st.posSum)}`;
    els.cntNeg.innerHTML = `${st.negN} / ${money(-st.negSum)}`;
    const dayWord = (k) => `${k} day${k === 1 ? '' : 's'}`;
    els.streakCur.textContent = dayWord(st.cur);
    els.streakBest.textContent = dayWord(st.best);
    els.streakMon.textContent = U.MONTHS[m];

    // grid: 6 rows x 7 cols
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 42; i++) {
      const d = i - lead + 1;
      if (d < 1 || d > n) { frag.appendChild(h('div', { class: 'cell is-out' })); continue; }
      const key = U.ymd(y, m, d);
      const v = s.days[key];
      const t = tierOf(v, st);
      const cell = h('div', {
        class: `cell t-${t.tier}${s.showEmpty ? ' show-empty' : ''}${key === editing ? ' is-editing' : ''}`,
        'data-key': key,
        role: 'button',
        tabindex: key === editing ? -1 : 0,
        'aria-label': `${U.MON[m]} ${d}: ${v == null ? 'no PnL' : U.fullMoney(v, true)}`,
        style: t.a != null ? { '--a': t.a.toFixed(3) } : null,
      }, h('span', { class: 'dnum' }, String(d)));
      if (key === editing) {
        cell.appendChild(editorInput);
      } else {
        const val = h('span', { class: 'val' });
        if (v != null) val.innerHTML = money(v, true);
        cell.appendChild(val);
      }
      frag.appendChild(cell);
    }
    grid.replaceChildren(frag);
    if (editing && editorInput && document.activeElement !== editorInput) editorInput.focus();
  }

  /* ---------- in-cell editor ---------- */

  function openEditor(key) {
    const { y, m, n } = monthInfo();
    const d = +key.slice(8);
    if (key.slice(0, 7) !== U.ym(y, m) || d < 1 || d > n) { closeEditor(true); return; }
    if (editing && editing !== key) commitEditor();
    editing = key;
    const input = h('input', { class: 'cell-input', inputmode: 'decimal', spellcheck: 'false', 'aria-label': `PnL for ${U.MON[m]} ${d}` });
    input.value = U.editNum(S().days[key]);
    editorInput = input;

    input.addEventListener('keydown', (e) => {
      const moves = { Enter: 1, Tab: e.shiftKey ? -1 : 1, ArrowUp: -7, ArrowDown: 7 };
      if (e.key === 'Escape') { e.preventDefault(); closeEditor(false); return; }
      if (e.key in moves) {
        e.preventDefault();
        if (!commitEditor()) return;
        const next = d + moves[e.key];
        if (next >= 1 && next <= n) openEditor(U.ymd(y, m, next));
        else closeEditor(false);
      }
    });
    input.addEventListener('blur', () => {
      if (editorInput !== input) return; // replaced by a newer editor
      setTimeout(() => { if (editorInput === input && document.activeElement !== input) closeEditor(true); }, 0);
    });
    Store.commit('calendar');
    input.focus();
    input.select();
  }

  function commitEditor() {
    if (!editing || !editorInput) return true;
    const raw = editorInput.value.trim();
    if (raw === '') { delete S().days[editing]; return true; }
    const v = U.parseNum(raw);
    if (isNaN(v)) {
      editorInput.classList.add('is-invalid');
      setTimeout(() => editorInput && editorInput.classList.remove('is-invalid'), 600);
      App.toast('Type a number like 12.5k, -800 or 1.2m. Leave it empty to clear the day.');
      return false;
    }
    S().days[editing] = v;
    return true;
  }

  function closeEditor(commit) {
    if (!editing) return;
    if (commit && !commitEditor()) {
      // invalid value: drop it rather than trapping focus
    }
    editing = null;
    editorInput = null;
    Store.commit('calendar');
  }

  /* ---------- inspector ---------- */

  function buildInspector() {
    F = Form.create();
    const wrap = h('div', { class: 'ins-view' });

    // Month switcher
    const monthLabel = h('span', { class: 'ins-month-label' });
    const monthRow = h('div', { class: 'ins-month' },
      F.button('‹', () => shiftMonth(-1), 'icon'),
      monthLabel,
      F.button('›', () => shiftMonth(1), 'icon'));

    // Day list
    const list = h('div', { class: 'ins-days' });
    let listKey = null;
    const buildList = () => {
      const { y, m, n } = monthInfo();
      const key = `${y}-${m}`;
      if (key === listKey) return;
      listKey = key;
      list.innerHTML = '';
      for (let d = 1; d <= n; d++) {
        const k = U.ymd(y, m, d);
        const wd = new Date(y, m, d).toLocaleDateString('en-US', { weekday: 'short' });
        const input = h('input', { class: 'ins-input ins-day-input', inputmode: 'decimal', placeholder: '—', spellcheck: 'false', 'data-key': k, 'aria-label': `${U.MON[m]} ${d}` });
        input.addEventListener('input', () => {
          const raw = input.value.trim();
          const v = U.parseNum(raw);
          const bad = raw !== '' && isNaN(v);
          input.classList.toggle('is-bad', bad);
          if (bad) return;
          if (raw === '') delete S().days[k]; else S().days[k] = v;
          Store.commit('calendar');
        });
        input.addEventListener('blur', () => { input.classList.remove('is-bad'); input.value = U.editNum(S().days[k]); });
        input.addEventListener('keydown', (e) => {
          const step = { Enter: 1, ArrowDown: 1, ArrowUp: -1 }[e.key];
          if (!step) return;
          e.preventDefault();
          const all = U.$$('.ins-day-input', list);
          const next = all[all.indexOf(input) + step];
          if (next) { next.focus(); next.select(); } else input.blur();
        });
        list.appendChild(h('label', { class: 'ins-day' },
          h('span', { class: 'ins-day-n' }, String(d)),
          h('span', { class: 'ins-day-w' }, wd),
          input));
      }
    };
    const syncList = () => {
      buildList();
      U.$$('.ins-day-input', list).forEach((input) => {
        if (document.activeElement === input) return;
        input.value = U.editNum(S().days[input.dataset.key]);
      });
    };

    // Quick fill
    const fill = { min: 3000, max: 60000, loss: 10 };
    const fillMin = h('input', { class: 'ins-input', inputmode: 'decimal', value: '3k' });
    const fillMax = h('input', { class: 'ins-input', inputmode: 'decimal', value: '60k' });
    fillMin.addEventListener('input', () => { const v = U.parseNum(fillMin.value); if (!isNaN(v)) fill.min = Math.abs(v); });
    fillMax.addEventListener('input', () => { const v = U.parseNum(fillMax.value); if (!isNaN(v)) fill.max = Math.abs(v); });
    const lossRange = h('input', { type: 'range', class: 'ins-range', min: 0, max: 60, step: 5, value: fill.loss });
    const lossOut = h('output', { class: 'ins-range-out' }, fill.loss + '%');
    lossRange.addEventListener('input', () => { fill.loss = +lossRange.value; lossOut.textContent = fill.loss + '%'; });

    const fillEmpty = () => {
      const { y, m, n } = monthInfo();
      const lo = Math.min(fill.min, fill.max), hi = Math.max(fill.min, fill.max);
      let added = 0;
      for (let d = 1; d <= n; d++) {
        const k = U.ymd(y, m, d);
        if (S().days[k] != null) continue;
        const r = Math.random();
        const mag = lo * Math.pow(hi / Math.max(1, lo), Math.pow(Math.random(), 1.4));
        const v = r < fill.loss / 100 ? -mag * (0.25 + Math.random() * 0.5) : mag;
        S().days[k] = Number(v.toPrecision(3));
        added++;
      }
      Store.commit('calendar');
      App.toast(added ? `Filled ${added} empty day${added === 1 ? '' : 's'}.` : 'Every day already has a value.');
    };
    const clearMonth = () => {
      const { y, m, n } = monthInfo();
      for (let d = 1; d <= n; d++) delete S().days[U.ymd(y, m, d)];
      Store.commit('calendar');
      App.toast(`Cleared ${U.MONTHS[m]}.`);
    };

    const legend = h('div', { class: 'ins-legend' },
      h('span', { class: 'lg lg-green' }, 'High'),
      h('span', { class: 'lg lg-yellow' }, 'Medium'),
      h('span', { class: 'lg lg-red' }, 'Loss'));

    wrap.append(
      F.section(null, monthRow,
        F.note('Click a day on the calendar and type. Enter jumps to the next day, ↑ ↓ move a week. Use k and m for thousands and millions, a minus sign for losses.')),
      F.section('Daily PnL', list),
      F.section('Highlight',
        F.field('Yellow when a day is below', F.range({ min: 5, max: 95, step: 5, get: () => S().mediumCut, set: (v) => { S().mediumCut = v; }, format: (v) => `${v}% of best day` })),
        legend),
      F.section('Display',
        F.field('Currency', F.segment({ options: [['USD', 'USD'], ['SOL', 'SOL']], get: () => S().currency, set: (v) => { S().currency = v; } })),
        F.toggle({ label: 'Show days without PnL', get: () => S().showEmpty, set: (v) => { S().showEmpty = v; } })),
      F.section('Quick fill',
        F.row(F.field('From', fillMin), F.field('To', fillMax)),
        F.field('Loss days', h('div', { class: 'ins-range-wrap' }, lossRange, lossOut)),
        F.row(F.button('Fill empty days', fillEmpty, 'secondary'), F.button('Clear month', clearMonth, 'ghost'))),
      F.section(null, F.button('Restore original calendar', () => { closeEditor(false); Store.reset('calendar'); App.toast('Calendar restored.'); }, 'link')),
    );

    const baseSync = F.sync;
    F.sync = () => {
      const { y, m } = monthInfo();
      monthLabel.textContent = `${U.MONTHS[m]} ${y}`;
      syncList();
      baseSync();
    };
    return wrap;
  }

  App.register('calendar', {
    label: 'PnL calendar',
    size: () => ({ w: W, h: H }),
    build,
    buildInspector,
    render,
    sync: () => F && F.sync(),
    exportNode: () => root,
    filename: () => `pnl-calendar-${S().ym}`,
    beforeExport: () => closeEditor(true),
  });
})();
