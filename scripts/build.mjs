// Builds dist/index.html: the whole app inlined into one page, encrypted with AES-GCM.
// Visitors see a sign-in screen; only the right username + password can decrypt the app.
//
//   AUTH_USER=... AUTH_PASS=... node scripts/build.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { webcrypto as crypto, createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'dist');
const ITERATIONS = 600000;

const user = process.env.AUTH_USER;
const pass = process.env.AUTH_PASS;
if (!user || !pass) {
  console.error('Set AUTH_USER and AUTH_PASS to build.');
  process.exit(1);
}

async function replaceAsync(str, re, fn) {
  const parts = [];
  let last = 0;
  for (const m of str.matchAll(re)) {
    parts.push(str.slice(last, m.index), await fn(...m));
    last = m.index + m[0].length;
  }
  parts.push(str.slice(last));
  return parts.join('');
}

const read = (p) => readFile(path.join(ROOT, p), 'utf8');

// 1. Inline local stylesheets and scripts.
let app = await read('index.html');
app = await replaceAsync(app, /<link rel="stylesheet" href="(src\/[^"]+)">/g,
  async (_, p) => `<style>\n${await read(p)}\n</style>`);
app = await replaceAsync(app, /<script src="(src\/[^"]+)"><\/script>/g,
  async (_, p) => `<script>\n${(await read(p)).replace(/<\/script/gi, '<\\/script')}\n</script>`);

// Inline the image exporter too (pinned by hash): Chrome may block CDN scripts written via document.write.
const H2I_URL = 'https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.js';
const H2I_SHA384 = 'UbfRVKN3/elS1r7JcK2FhmPP+KlJ4CvYwbyYD7tH+uTkbT9bNJr9eJeQ0FoFbAgz';
const h2i = await (await fetch(H2I_URL)).text();
const digest = createHash('sha384').update(h2i).digest('base64');
if (digest !== H2I_SHA384) {
  console.error(`html-to-image checksum mismatch (${digest}); refusing to build.`);
  process.exit(1);
}
app = app.replace(`<script src="${H2I_URL}"></script>`, () => `<script>\n${h2i.replace(/<\/script/gi, '<\\/script')}\n</script>`);

// 2. Add a sign-out button to the toolbar of the hosted build.
app = app.replace('</body>', `<script>
document.addEventListener('DOMContentLoaded', function () {
  var b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn btn-ghost';
  b.textContent = 'Sign out';
  b.addEventListener('click', function () {
    try { localStorage.removeItem('mm-auth'); sessionStorage.removeItem('mm-auth'); } catch (e) {}
    location.reload();
  });
  var actions = document.querySelector('.actions');
  if (actions) actions.insertBefore(b, actions.firstChild);
});
</script>
</body>`);

// 3. Encrypt.
const enc = new TextEncoder();
const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const base = await crypto.subtle.importKey('raw', enc.encode(`${user}\n${pass}`), 'PBKDF2', false, ['deriveBits']);
const raw = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' }, base, 256);
const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt']);
const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(app)));
const b64 = (u8) => Buffer.from(u8).toString('base64');

// 4. Write the sign-in page with the encrypted app embedded.
const gate = (await read('scripts/gate.html'))
  .replace('__PAYLOAD__', () => JSON.stringify({ v: 1, iterations: ITERATIONS, salt: b64(salt), iv: b64(iv), data: b64(cipher) }));
await mkdir(OUT, { recursive: true });
await writeFile(path.join(OUT, 'index.html'), gate);
await writeFile(path.join(OUT, '.nojekyll'), '');
console.log(`dist/index.html written (${Math.round(gate.length / 1024)} KB, app ${Math.round(app.length / 1024)} KB encrypted)`);
