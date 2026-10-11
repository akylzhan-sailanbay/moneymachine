/* App state (localStorage) + media blobs (IndexedDB). */
(function () {
  const KEY = 'manifest-studio.v1';

  function defaults() {
    const aug = [23700, 12900, 26000, 6960, 19700, 14400, 22800, 39700, 59100, 13600,
      13200, 33900, 30400, 26000, 32100, 11200, 60500, 15900, 2750];
    const days = {};
    aug.forEach((v, i) => { days[U.ymd(2026, 7, i + 1)] = v; });

    return {
      view: 'calendar',
      mode: 'edit',
      calendar: {
        ym: '2026-08',
        currency: 'USD',
        mediumCut: 30, // % of the month's best day; positive days below this are yellow
        showEmpty: false,
        days,
      },
      pnl: {
        ticker: 'SOLCAT',
        auto: true,
        invested: 1831.57,
        position: 40961.57,
        pnl: 39130,
        pct: 2136.42,
        lblPnl: 'PNL',
        lblInvested: 'Invested',
        lblPosition: 'Position',
        handle: '@drinking',
        promo: 'Save 10% on fees',
        site: 'axiom.trade',
        gem: true,
        arrows: true,
        dim: 0,
        bg: 'preset:0', // "preset:N" or a media id
        media: [], // [{id, kind, name, zoom, x, y}]
        avatar: null, // {id, kind}
      },
      trade: {
        tab: 'position',
        username: 'tjr',
        status: 'Open',
        date: 'Sep 30, 2026',
        tag: '23',
        avatar: null,
        token: 'Super Inu',
        tokenIcon: null,
        auto: false,
        pnl: -1992.97,
        pct: -9.49,
        invested: 11900,
        entry: 3600000,
        current: 3200000,
        brand: 'fomo',
        promo: '10% off fees with code',
        code: 'orangie',
        thesis: 'Strong community, clean chart after the launch spike. Holding the range and adding on dips.',
        link: 'https://fomo.family/tjr/super-inu',
        seed: 7,
        chart: 'candle',
        xLabels: ['12:00', '23'],
        show: { pnl: true, buysell: true, ref: true, thesis: true },
        speed: 1,
        progress: 0.22,
      },
    };
  }

  function merge(base, saved) {
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return base;
    const out = {};
    for (const k in base) {
      const b = base[k], s = saved[k];
      if (s === undefined) out[k] = b;
      else if (b && typeof b === 'object' && !Array.isArray(b) && k !== 'days') out[k] = merge(b, s);
      else out[k] = s;
    }
    return out;
  }

  let state;
  try {
    const raw = localStorage.getItem(KEY);
    state = merge(defaults(), raw ? JSON.parse(raw) : null);
  } catch (e) {
    state = defaults();
  }

  const listeners = new Set();
  const persist = U.debounce(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage full or blocked */ }
  }, 200);

  const Store = {
    get state() { return state; },
    defaults,
    commit(scope) {
      persist();
      listeners.forEach((fn) => fn(scope));
    },
    on(fn) { listeners.add(fn); },
    reset(view) {
      state[view] = defaults()[view];
      Store.commit(view);
    },
  };

  /* ---------- media in IndexedDB ---------- */

  const memory = new Map();
  const urls = new Map();
  let dbp = null;

  function db() {
    if (!dbp) {
      dbp = new Promise((resolve, reject) => {
        try {
          const req = indexedDB.open('manifest-studio', 1);
          req.onupgradeneeded = () => req.result.createObjectStore('media');
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        } catch (e) { reject(e); }
      }).catch(() => null);
    }
    return dbp;
  }

  function tx(mode, fn) {
    return db().then((d) => {
      if (!d) return null;
      return new Promise((resolve, reject) => {
        const t = d.transaction('media', mode);
        const req = fn(t.objectStore('media'));
        t.oncomplete = () => resolve(req && req.result);
        t.onerror = () => reject(t.error);
      });
    }).catch(() => null);
  }

  Store.media = {
    async put(file) {
      const kind = U.mediaKind(file);
      if (!kind) throw new Error('Use an image, GIF or video file.');
      const id = 'm_' + U.uid();
      memory.set(id, file);
      await tx('readwrite', (s) => s.put(file, id));
      return { id, kind, name: file.name || kind };
    },
    async url(id) {
      if (!id) return null;
      if (urls.has(id)) return urls.get(id);
      let blob = memory.get(id);
      if (!blob) blob = await tx('readonly', (s) => s.get(id));
      if (!blob) return null;
      const u = URL.createObjectURL(blob);
      urls.set(id, u);
      return u;
    },
    async remove(id) {
      memory.delete(id);
      if (urls.has(id)) { URL.revokeObjectURL(urls.get(id)); urls.delete(id); }
      await tx('readwrite', (s) => s.delete(id));
    },
  };

  window.Store = Store;
})();
