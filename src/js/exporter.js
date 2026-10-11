/* PNG / video export, clipboard, downloads. Uses html-to-image (global `htmlToImage`). */
(function () {
  const Exporter = {};
  let fontCSS = null;

  function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  }

  // Inline only the latin subsets of the web fonts the replicas use, so exports keep their typography.
  async function getFontCSS() {
    if (fontCSS !== null) return fontCSS;
    let out = '';
    const cache = new Map();
    try {
      for (const link of U.$$('link[data-embed-fonts]')) {
        const css = await (await fetch(link.href)).text();
        const blocks = css.match(/@font-face\s*{[^}]*}/g) || [];
        for (const block of blocks) {
          if (!/unicode-range:[^;]*U\+0000-00FF/i.test(block)) continue;
          const m = block.match(/url\(([^)]+)\)/);
          if (!m) continue;
          const url = m[1].replace(/['"]/g, '');
          if (!cache.has(url)) cache.set(url, fetch(url).then((r) => r.blob()).then(blobToDataURL));
          out += block.replace(m[0], `url(${await cache.get(url)})`) + '\n';
        }
      }
    } catch (e) {
      console.warn('Font embedding skipped:', e);
    }
    fontCSS = out;
    return out;
  }

  Exporter.warmFonts = () => getFontCSS();

  // Render a DOM node to a canvas at `pixelRatio`. `hideClass` is added to the node while capturing.
  Exporter.capture = async function (node, opts = {}) {
    if (!window.htmlToImage) throw new Error('The image exporter could not load. Check your internet connection and reload.');
    document.body.classList.add('is-capturing');
    if (opts.nodeClass) node.classList.add(opts.nodeClass);
    try {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      const fontEmbedCSS = await getFontCSS();
      const w = node.offsetWidth, h = node.offsetHeight;
      return await htmlToImage.toCanvas(node, {
        pixelRatio: opts.pixelRatio || 3,
        width: w,
        height: h,
        fontEmbedCSS,
        // the node may be absolutely positioned inside its screen; pin it to the image origin
        style: { transform: 'none', margin: '0', left: '0', top: '0', right: 'auto', bottom: 'auto' },
        filter: (n) => !(n.classList && n.classList.contains('no-export')),
      });
    } finally {
      document.body.classList.remove('is-capturing');
      if (opts.nodeClass) node.classList.remove(opts.nodeClass);
    }
  };

  Exporter.toBlob = (canvas, type) => new Promise((resolve) => canvas.toBlob(resolve, type || 'image/png'));

  Exporter.download = function (blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };

  Exporter.copy = async function (canvas) {
    if (!navigator.clipboard || !window.ClipboardItem) throw new Error('This browser can’t copy images. Use Save image instead.');
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': Exporter.toBlob(canvas) })]);
  };

  Exporter.stamp = function () {
    const d = new Date();
    return `${d.getFullYear()}${U.pad2(d.getMonth() + 1)}${U.pad2(d.getDate())}-${U.pad2(d.getHours())}${U.pad2(d.getMinutes())}${U.pad2(d.getSeconds())}`;
  };

  /* ---------- video ---------- */

  function pickMime() {
    if (!window.MediaRecorder) return null;
    const list = ['video/mp4;codecs=avc1.640028', 'video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
    return list.find((t) => MediaRecorder.isTypeSupported(t)) || null;
  }

  Exporter.canRecord = () => !!pickMime() && !!HTMLCanvasElement.prototype.captureStream;

  // drawFrame(ctx, seconds) paints one frame; returns { blob, ext }.
  Exporter.record = async function ({ width, height, duration, drawFrame, fps = 30, onProgress }) {
    const mime = pickMime();
    if (!mime) throw new Error('This browser can’t record video. Try Chrome, Edge or Safari.');
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    drawFrame(ctx, 0);
    const stream = canvas.captureStream(fps);
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 16e6 });
    const chunks = [];
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    const stopped = new Promise((r) => { rec.onstop = r; });
    rec.start(250);
    const t0 = performance.now();
    await new Promise((resolve) => {
      (function tick() {
        const t = (performance.now() - t0) / 1000;
        drawFrame(ctx, t);
        if (onProgress) onProgress(Math.min(1, t / duration));
        if (t < duration) requestAnimationFrame(tick); else resolve();
      })();
    });
    rec.stop();
    await stopped;
    stream.getTracks().forEach((t) => t.stop());
    const type = mime.split(';')[0];
    return { blob: new Blob(chunks, { type }), ext: type === 'video/mp4' ? 'mp4' : 'webm' };
  };

  // Total play time of an animated GIF in seconds (sums frame delays), or null.
  Exporter.gifDuration = async function (url) {
    try {
      const buf = new Uint8Array(await (await fetch(url)).arrayBuffer());
      let cs = 0, frames = 0;
      for (let i = 0; i < buf.length - 6; i++) {
        if (buf[i] === 0x21 && buf[i + 1] === 0xf9 && buf[i + 2] === 0x04 && buf[i + 7] === 0x00) {
          const d = buf[i + 4] | (buf[i + 5] << 8);
          cs += d < 2 ? 10 : d; // browsers treat 0-1 as 100ms
          frames++;
          i += 7;
        }
      }
      return frames > 1 ? cs / 100 : null;
    } catch (e) {
      return null;
    }
  };

  window.Exporter = Exporter;
})();
