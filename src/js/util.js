/* Shared helpers: number parsing/formatting, DOM, misc. */
(function () {
  const U = {};

  /* ---------- numbers ---------- */

  // Accepts things like "39.1k", "+$39,100", "-1.2M", "(500)", "▼9.49%", "2.5 SOL".
  U.parseNum = function (raw) {
    if (raw == null) return NaN;
    if (typeof raw === 'number') return raw;
    let s = String(raw).trim().toLowerCase()
      .replace(/[−–—]/g, '-')
      .replace(/[\s,$_'’]/g, '')
      .replace(/(usd|sol|◎)$/g, '');
    let neg = false;
    if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
    if (s.startsWith('▼')) { neg = !neg; s = s.slice(1); }
    if (s.startsWith('▲')) s = s.slice(1);
    s = s.replace(/^\+/, '');
    if (s.startsWith('-')) { neg = !neg; s = s.slice(1); }
    s = s.replace(/^\+/, '').replace(/^\$/, '').replace(/%$/, '');
    const m = s.match(/^(\d*\.?\d+)([kmbt]?)$/);
    if (!m) return NaN;
    const mult = { '': 1, k: 1e3, m: 1e6, b: 1e9, t: 1e12 }[m[2]];
    const v = parseFloat(m[1]) * mult;
    return neg ? -v : v;
  };

  const trim = (str) => (str.indexOf('.') >= 0 ? str.replace(/\.?0+$/, '') : str);
  const UNITS = [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']];

  // 3 significant digits, e.g. 23700 -> "23.7K", 6960 -> "6.96K", 474000 -> "474K" (Axiom style)
  U.sig3 = function (v) {
    const a = Math.abs(v);
    for (const [d, s] of UNITS) {
      if (a >= d * 0.9995) {
        const n = a / d;
        const str = n >= 99.95 ? n.toFixed(0) : n >= 9.995 ? n.toFixed(1) : n.toFixed(2);
        return trim(str) + s;
      }
    }
    if (a >= 99.95) return a.toFixed(0);
    if (a >= 9.995) return trim(a.toFixed(1));
    return trim(a.toFixed(2));
  };

  // 1 decimal, e.g. 11900 -> "11.9K", 3600000 -> "3.6M" (fomo style)
  U.dec1 = function (v) {
    const a = Math.abs(v);
    for (const [d, s] of UNITS) {
      if (a >= d * 0.9995) return trim((a / d).toFixed(1)) + s;
    }
    return a >= 100 ? a.toFixed(0) : trim(a.toFixed(2));
  };

  U.signOf = (v, plus) => (v < 0 ? '-' : plus && v > 0 ? '+' : '');

  // "-$1,992.97"
  U.fullMoney = function (v, plus) {
    const a = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return U.signOf(v, plus) + '$' + a;
  };

  U.pct2 = (v, plus) => U.signOf(v, plus) + Math.abs(v).toFixed(2) + '%';

  // Exact but short text for an input box: 23700 -> "23.7k", 1234567 -> "1234567"
  U.editNum = function (v) {
    if (v == null || isNaN(v)) return '';
    const sign = v < 0 ? '-' : '';
    const a = Math.abs(v);
    const tidy = (n) => trim(String(+n.toFixed(6)));
    if (a >= 1e6 && Number.isInteger(+(a / 1e6 * 1e3).toFixed(6))) return sign + tidy(a / 1e6) + 'm';
    if (a >= 1e3 && Number.isInteger(+(a / 1e3 * 1e2).toFixed(6))) return sign + tidy(a / 1e3) + 'k';
    return sign + tidy(a);
  };

  U.clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  /* ---------- dates ---------- */

  U.MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  U.MON = U.MONTHS.map((m) => m.slice(0, 3));
  U.pad2 = (n) => String(n).padStart(2, '0');
  U.ymd = (y, m, d) => `${y}-${U.pad2(m + 1)}-${U.pad2(d)}`;
  U.daysIn = (y, m) => new Date(y, m + 1, 0).getDate();
  U.parseYM = (ym) => { const [y, m] = ym.split('-').map(Number); return { y, m: m - 1 }; };
  U.ym = (y, m) => { const d = new Date(y, m, 1); return `${d.getFullYear()}-${U.pad2(d.getMonth() + 1)}`; };

  /* ---------- DOM ---------- */

  U.h = function (tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'text') el.textContent = v;
        else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
        else if (k === 'style' && typeof v === 'object') {
          for (const p in v) {
            if (p.startsWith('--')) el.style.setProperty(p, v[p]); else el.style[p] = v[p];
          }
        }
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      el.appendChild(typeof kid === 'string' ? document.createTextNode(kid) : kid);
    }
    return el;
  };

  U.$ = (sel, root) => (root || document).querySelector(sel);
  U.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  U.debounce = function (fn, ms) {
    let t;
    return function (...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), ms); };
  };

  U.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  // Small seeded PRNG (mulberry32)
  U.rng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  U.mediaKind = function (file) {
    const t = (file.type || '').toLowerCase();
    if (t === 'image/gif' || /\.gif$/i.test(file.name || '')) return 'gif';
    if (t.startsWith('video/') || /\.(mp4|webm|mov|m4v|ogv)$/i.test(file.name || '')) return 'video';
    if (t.startsWith('image/') || /\.(png|jpe?g|webp|avif|bmp|svg)$/i.test(file.name || '')) return 'image';
    return null;
  };

  window.U = U;
})();
