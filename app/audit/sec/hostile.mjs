// Hostile-data UI audit for the MPFL rehab app. No dependency is added: it uses the Playwright that the app already has.
// Usage: BASE_URL=http://127.0.0.1:PORT node hostile.mjs   (optional: PW_ROOT, OUT, ONLY=<case id prefix>)
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const PW_ROOT = process.env.PW_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(`${PW_ROOT}/package.json`);
const { chromium } = require('@playwright/test');
const BASE = process.env.BASE_URL;
if (!BASE) { console.error('Set BASE_URL, for example BASE_URL=http://127.0.0.1:4501'); process.exit(2); }
const OWN = new URL(BASE).origin;
const OUT = process.env.OUT || path.join(os.tmpdir(), 'mpfl-audit-sec', 'hostile-result.json');
const ONLY = process.env.ONLY || '';
const EX = JSON.parse(fs.readFileSync(`${PW_ROOT}/src/lib/protocol/example-protocol.json`, 'utf8'));
const MARGIN_SOURCE = (fs.readFileSync(`${PW_ROOT}/src/lib/margin.ts`, 'utf8').match(/MARGIN_SOURCE\s*=\s*'([^']+)'/) || [])[1];

// ---- payloads ----
const FLAG = 'window.__pwn=1';
const P = {
  img: `<img src=x onerror="${FLAG}">`,
  script: `<script>${FLAG}</script>`,
  svg: `"><svg onload=${FLAG}>`,
  js: `javascript:${FLAG}`,
  link: `<a href="javascript:${FLAG}">x</a>`,
  tpl: `{{constructor.constructor('${FLAG}')()}}\${${FLAG}}`,
  amp: '&lt;b&gt;&amp;#x3c;script&amp;#x3e;',
};
const LONG = (n) => 'W'.repeat(n);
const ZW = (n) => ('a\u200b\u200d\u2060\ufeff').repeat(Math.ceil(n / 5)).slice(0, n);
const RTL = (n) => ('\u202eסוף\u202c \u2067مرحبا\u2069 ').repeat(Math.ceil(n / 14)).slice(0, n);
const EMOJI = (n) => ('👨‍👩‍👧‍👦🏳️‍🌈🦵').repeat(Math.ceil(n / 20)).slice(0, n);
const clone = (o) => structuredClone(o);
function plan(fn) { const p = clone(EX); delete p.example; p.id = 'hostile-001'; fn?.(p); return p; }
const buf = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o));
const file = (name, data) => ({ name, mimeType: 'application/json', buffer: Buffer.isBuffer(data) ? data : buf(data) });

const VERDICT = /\b(safe to|cleared for|healed|healing well|good job|well done|excellent|great (job|work)|you are (ready|fine|recovered|healed)|ready to progress|ready for|recovered|on track|congratulations|no problem|passed|diagnos\w*|all clear)\b/gi;
const cleanVerdict = new Set();

const results = [];
const T0 = Date.now();

// ---- browser ----
const browser = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });

async function run(id, desc, fn, { width = 320, allowDownloads = false } = {}) {
  if (ONLY && !id.startsWith(ONLY)) return;
  const ctx = await browser.newContext({ baseURL: BASE, viewport: { width, height: 740 }, permissions: ['camera'], acceptDownloads: true });
  const page = await ctx.newPage();
  const rec = { id, desc, fails: [], notes: [], audits: 0, csp: 0, foreign: [], consoleErrors: 0, pageErrors: [], downloads: 0, popups: 0, writes: [], media: 0 };
  const foreign = [];
  await ctx.route('**/*', (r) => {
    const u = r.request().url();
    if (/^(data|blob):/.test(u) || new URL(u).origin === OWN) return r.continue();
    foreign.push(u); return r.abort();
  });
  ctx.on('page', (p) => { if (p !== page) rec.popups++; });
  page.on('download', () => rec.downloads++);
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().startsWith('INFO: ')) { rec.consoleErrors++; rec.lastConsole = m.text().slice(0, 200); } });
  page.on('pageerror', (e) => rec.pageErrors.push(String(e.message).slice(0, 200)));
  page.on('request', (r) => { if (new URL(r.url()).origin === OWN && !['GET', 'HEAD'].includes(r.method())) rec.writes.push(`${r.method()} ${r.url()}`); });
  page.on('dialog', (d) => { rec.fails.push(`dialog opened: ${d.type()}`); d.dismiss().catch(() => {}); });
  await page.addInitScript(() => {
    window.__pwn = 0; window.__csp = [];
    document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI || 'inline'}`));
    const R = window.RTCPeerConnection;
    window.__rtc = { ctor: 0, setRemote: 0 };
    if (R) window.RTCPeerConnection = class extends R {
      constructor(...a) { super(...a); window.__rtc.ctor++; }
      setRemoteDescription(...a) { window.__rtc.setRemote++; return super.setRemoteDescription(...a); }
    };
  });
  const h = makeHelpers(page, rec);
  try { await fn(page, h, ctx); } catch (e) { rec.fails.push(`script error: ${String(e.message).split('\n')[0].slice(0, 220)}`); }
  try { await h.audit('final'); await h.storage(); } catch (e) { rec.fails.push(`final audit error: ${String(e.message).split('\n')[0].slice(0, 160)}`); }
  rec.foreign = foreign;
  if (foreign.length) rec.fails.push(`foreign requests: ${foreign.length} (${foreign[0]})`);
  if (rec.csp) rec.fails.push(`CSP violations: ${rec.csp}`);
  if (rec.pageErrors.length) rec.fails.push(`page errors: ${rec.pageErrors.length} (${rec.pageErrors[0]})`);
  if (rec.writes.length) rec.fails.push(`non-GET request to own origin: ${rec.writes[0]}`);
  if (rec.downloads && !allowDownloads) rec.fails.push(`unexpected downloads: ${rec.downloads}`);
  if (rec.popups) rec.fails.push(`popup opened: ${rec.popups}`);
  if (rec.media) rec.fails.push(`media stored: ${rec.media}`);
  rec.pass = rec.fails.length === 0;
  results.push(rec);
  console.log(`${rec.pass ? 'PASS' : 'FAIL'}  ${id}  ${desc}  audits=${rec.audits} csp=${rec.csp} consoleErr=${rec.consoleErrors}${rec.fails.length ? '\n        - ' + rec.fails.join('\n        - ') : ''}`);
  await ctx.close();
}

function makeHelpers(page, rec) {
  const h = {
    fail: (m) => { if (!rec.fails.includes(m)) rec.fails.push(m); },
    note: (m) => rec.notes.push(m),
    async h1() { return (await page.locator('h1').first().textContent({ timeout: 4000 }).catch(() => null))?.trim() ?? null; },
    async toLoad() {
      await page.goto('/');
      await page.getByRole('button', { name: 'I understand' }).click();
      await page.getByRole('heading', { level: 1, name: 'Load protocol file' }).waitFor();
    },
    async load(f, expectOk = true) {
      await page.getByLabel('Choose a file from your care team').setInputFiles(f);
      if (expectOk) await page.getByRole('heading', { level: 1, name: 'Today' }).waitFor({ timeout: 8000 });
      else await page.getByRole('alert').first().waitFor({ timeout: 8000 });
    },
    async toHome(p) { await h.toLoad(); await h.load(file('p.json', p)); },
    async openDetails() { await page.evaluate(() => document.querySelectorAll('details').forEach((d) => (d.open = true))); },
    // The full set of checks for the screen that shows now, at 320 and at 1280 pixels wide.
    async audit(label, { expectVerdictFree = true } = {}) {
      rec.audits++;
      await page.locator('h1,[role=alert]').first().waitFor({ timeout: 2500 }).catch(() => {});
      await page.waitForFunction(() => document.querySelector('h1')?.textContent !== 'Loading', null, { timeout: 5000 }).catch(() => {});
      await h.openDetails().catch(() => {});
      const cur = page.viewportSize();
      for (const w of [320, 1280]) {
        await page.setViewportSize({ width: w, height: 740 });
        await page.waitForTimeout(60);
        const r = await page.evaluate(() => {
          const root = document.getElementById('root');
          const vw = document.documentElement.clientWidth;
          const o = { pwn: window.__pwn, csp: (window.__csp || []).length, vw };
          o.rootEmpty = !root || root.children.length === 0 || root.innerText.trim().length === 0;
          o.actions = root ? root.querySelectorAll('button:not([disabled]),a[href],input[type=file],textarea').length : 0;
          o.docOverflow = document.documentElement.scrollWidth - vw;
          o.offenders = [];
          if (root) for (const el of root.querySelectorAll('*')) {
            const r = el.getBoundingClientRect();
            if (r.width === 0 || (r.right <= vw + 1 && r.left >= -1)) continue;
            let p = el.parentElement, clipped = false;
            while (p && p !== document.body) { const s = getComputedStyle(p); if (/(auto|scroll|hidden|clip)/.test(s.overflowX) && p.getBoundingClientRect().right <= vw + 1) { clipped = true; break; } p = p.parentElement; }
            if (!clipped && o.offenders.length < 4) o.offenders.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 30)} right=${Math.round(r.right)}`);
          }
          o.badEls = [];
          if (root) for (const el of root.querySelectorAll('*')) {
            const tag = el.tagName.toLowerCase();
            if (['script', 'iframe', 'object', 'embed', 'link', 'style', 'form', 'base', 'meta'].includes(tag) || (tag === 'img' && !el.closest('svg'))) o.badEls.push(tag);
            for (const a of el.attributes) {
              if (/^on/i.test(a.name)) o.badEls.push(`${tag}[${a.name}]`);
              if (/^(href|src|action|formaction|xlink:href)$/i.test(a.name) && /^\s*(javascript|data|vbscript):/i.test(a.value)) o.badEls.push(`${tag}[${a.name}=${a.value.slice(0, 20)}]`);
            }
            if (tag === 'a' && el.target === '_blank' && !/noopener/.test(el.rel)) o.badEls.push('a[_blank no rel]');
          }
          o.protoDirty = Object.keys(Object.prototype).length > 0 || ({}).polluted !== undefined || ({}).pwn !== undefined || Array.prototype.polluted !== undefined;
          o.text = root ? root.innerText.slice(0, 30000) : '';
          o.htmlLen = root ? root.innerHTML.length : 0;
          return o;
        });
        rec.csp = Math.max(rec.csp, r.csp);
        const at = `${label}@${w}`;
        if (r.pwn) h.fail(`SCRIPT RAN (${at})`);
        if (r.rootEmpty) h.fail(`crash screen: root empty (${at})`);
        else if (r.actions === 0) h.fail(`no way back: no action on screen (${at})`);
        if (r.docOverflow > 1) h.fail(`horizontal page overflow ${r.docOverflow}px (${at})`);
        else if (r.offenders.length) h.fail(`element outside viewport (${at}): ${r.offenders.join('; ')}`);
        if (r.badEls.length) h.fail(`injected markup (${at}): ${[...new Set(r.badEls)].join(', ')}`);
        if (r.protoDirty) h.fail(`prototype pollution (${at})`);
        if (w === 320) {
          for (const m of r.text.matchAll(VERDICT)) {
            const k = m[0].toLowerCase();
            if (rec.cleanRun) cleanVerdict.add(k);
            else if (expectVerdictFree && !cleanVerdict.has(k)) h.fail(`verdict word "${k}" (${at})`);
          }
        }
        h.lastText = r.text;
      }
      await page.setViewportSize(cur ?? { width: 320, height: 740 });
    },
    // Dump the storage. Fails on frame, video, blob or image data, and on a second database.
    async storage() {
      const s = await page.evaluate(async () => {
        const out = { dbs: [], media: [], big: [], ls: {}, cookies: document.cookie, caches: [], sw: 0, stores: {} };
        const scan = (v, path, depth = 0) => {
          if (depth > 6 || v === null) return;
          if (typeof v === 'string') {
            if (/^(data:(image|video|audio)|blob:)/i.test(v)) out.media.push(`${path}: ${v.slice(0, 30)}`);
            if (v.length > 1_000_000) out.big.push(`${path}: ${v.length} chars`);
            return;
          }
          if (typeof v !== 'object') return;
          if (v instanceof Blob || v instanceof ArrayBuffer || ArrayBuffer.isView(v) || (typeof ImageData !== 'undefined' && v instanceof ImageData)) { out.media.push(`${path}: ${v.constructor.name}`); return; }
          for (const k of Object.keys(v)) scan(v[k], `${path}.${k}`, depth + 1);
        };
        for (const d of (await indexedDB.databases?.()) ?? []) {
          out.dbs.push(d.name);
          await new Promise((res) => {
            const q = indexedDB.open(d.name);
            q.onerror = () => res();
            q.onsuccess = () => {
              const db = q.result;
              const names = [...db.objectStoreNames];
              if (!names.length) { db.close(); return res(); }
              const tx = db.transaction(names);
              let left = names.length;
              for (const n of names) {
                const g = tx.objectStore(n).getAll();
                g.onsuccess = () => { out.stores[`${d.name}.${n}`] = g.result.length; g.result.forEach((r, i) => scan(r, `${d.name}.${n}[${i}]`)); if (--left === 0) { db.close(); res(); } };
                g.onerror = () => { if (--left === 0) { db.close(); res(); } };
              }
            };
          });
        }
        for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); const v = localStorage.getItem(k); out.ls[k] = v.length; scan(v, `ls.${k}`); }
        for (let i = 0; i < sessionStorage.length; i++) scan(sessionStorage.getItem(sessionStorage.key(i)), 'ss');
        out.caches = (await caches?.keys?.()) ?? [];
        out.sw = (await navigator.serviceWorker?.getRegistrations?.())?.length ?? 0;
        return out;
      });
      rec.storage = { dbs: s.dbs, stores: s.stores, localStorageKeys: Object.keys(s.ls), caches: s.caches.length, sw: s.sw };
      rec.media += s.media.length;
      if (s.media.length) h.fail(`frame or video data in storage: ${s.media.slice(0, 2).join(' | ')}`);
      if (s.big.length) h.note(`large stored value: ${s.big[0]}`);
      if (s.dbs.some((n) => n !== 'mpfl-rehab')) h.fail(`unexpected database: ${s.dbs.join(',')}`);
      if (s.cookies) h.fail('cookie set');
      if (s.caches.length || s.sw) h.fail('cache or service worker registered');
      const badKeys = Object.keys(s.ls).filter((k) => !k.startsWith('mpfl.'));
      if (badKeys.length) h.fail(`localStorage key outside mpfl.: ${badKeys.join(',')}`);
      return s;
    },
    async idbSeed(store, rows) {
      await page.evaluate(([store, rows]) => new Promise((res, rej) => {
        const q = indexedDB.open('mpfl-rehab');
        q.onsuccess = () => {
          const db = q.result; const tx = db.transaction(store, 'readwrite'); const os = tx.objectStore(store);
          for (const r of rows) os.put(r);
          tx.oncomplete = () => { db.close(); res(); }; tx.onerror = () => rej(tx.error);
        };
        q.onerror = () => rej(q.error);
      }), [store, rows]);
    },
    async storedPhase() {
      return page.evaluate(() => new Promise((res) => {
        const q = indexedDB.open('mpfl-rehab');
        q.onsuccess = () => {
          const db = q.result;
          if (!db.objectStoreNames.contains('protocol')) { db.close(); return res(null); }
          const g = db.transaction('protocol').objectStore('protocol').get('current');
          g.onsuccess = () => { db.close(); try { res(JSON.parse(g.result.raw).activePhase); } catch { res(null); } };
          g.onerror = () => { db.close(); res(null); };
        };
        q.onerror = () => res(null);
      }));
    },
    async homePhase() { return page.evaluate(() => { const dt = [...document.querySelectorAll('dt')].find((d) => d.textContent === 'Active phase'); return dt?.nextElementSibling?.textContent ?? null; }); },
    // The tab "Sessions" must match exactly. Other buttons have "sessions" inside a longer name.
    async nav(name) { await page.getByRole('button', { name, exact: name === 'Sessions' }).first().click(); },
  };
  return h;
}

// CASES

// 1. Clean baseline. The first run collects the words that the app uses by itself, so that they are not flagged later.
function EX_PATH() { return `${PW_ROOT}/src/lib/protocol/example-protocol.json`; }
await run('c0a-clean-vocab', 'collect verdict-like words of the clean app (allowed list)', async (page, h) => {
  await h.toLoad(); await h.load(EX_PATH());
  const t1 = await page.evaluate(() => document.getElementById('root').innerText);
  await h.nav('Sessions'); await page.getByRole('heading', { level: 1, name: 'Your sessions' }).waitFor();
  const t2 = await page.evaluate(() => document.getElementById('root').innerText);
  for (const t of [t1, t2]) for (const m of t.matchAll(VERDICT)) cleanVerdict.add(m[0].toLowerCase());
  h.note(`allowed words: ${[...cleanVerdict].join(',') || 'none'}`);
});
await run('c0b-clean', 'clean example plan, main screens', async (page, h) => {
  await h.toLoad(); await h.audit('load');
  await h.load(EX_PATH());
  await h.audit('home');
  await h.nav('My data'); await page.getByRole('heading', { level: 1, name: 'My data' }).waitFor(); await h.audit('my-data');
  await h.nav('Open a session file (care team)'); await h.audit('care-team');
});

// 2. Hostile plan text fields.
const fieldSets = {
  xss: (n) => [P.img, P.script, P.svg, P.js, P.link, P.tpl, P.amp][n % 7],
  long: () => LONG(400),
  zw: (n) => ZW(n),
  rtl: (n) => RTL(n),
  emoji: (n) => EMOJI(n),
};
function textPlan(kind) {
  return plan((p) => {
    const f = fieldSets[kind]; let i = 0;
    const cut = (s, max) => (kind === 'long' ? LONG(max) : [...s].slice(0, max).join(''));
    p.authoredBy = cut(f(i++, 100), 100);
    p.phases.forEach((ph) => {
      ph.name = cut(f(i++, 60), 60);
      ph.exercises.forEach((e) => { e.source = cut(f(i++, 200), 200); });
    });
    for (const k of ['brace', 'weightBearing', 'depthLimit', 'phaseClearance', 'concurrentProcedures']) p.surgeon[k] = cut(f(i++, 200), 200);
  });
}
for (const kind of Object.keys(fieldSets)) {
  await run(`c1-text-${kind}`, `plan text fields: ${kind}`, async (page, h) => {
    const p = textPlan(kind);
    await h.toHome(p); await h.audit('home');
    { const shown = (h.lastText || '').includes([...p.authoredBy].slice(0, 20).join('')); h.note(`authoredBy shown as text: ${shown}`); if (!shown) h.fail('hostile text not rendered on Home (test is blind)'); }
    const before = await h.storedPhase();
    if (await h.homePhase() === null || !(await h.homePhase()).startsWith(`${p.activePhase},`)) h.fail(`Home phase text differs from file activePhase ${p.activePhase}: ${await h.homePhase()}`);
    await h.nav(/^Start Heel slide/); await page.getByRole('heading', { level: 1, name: 'Check before you exercise' }).waitFor(); await h.audit('red-flag');
    await page.getByRole('button', { name: 'None of these apply. Continue' }).click();
    await page.getByRole('heading', { level: 1, name: 'Set up the camera' }).waitFor(); await h.audit('setup');
    await page.getByRole('button', { name: 'Next: set up the camera' }).click(); await page.waitForTimeout(400); await h.audit('setup-camera');
    await page.goBack().catch(() => {}); await page.waitForTimeout(200);
    if ((await h.storedPhase()) !== before) h.fail('stored activePhase changed');
    // care team view with the same plan
    await page.goto('/'); await page.waitForTimeout(300);
    if ((await h.h1()) === 'Privacy') await page.getByRole('button', { name: 'I understand' }).click();
    await page.getByRole('heading', { level: 1, name: 'Today' }).waitFor();
    await h.nav('My data'); await h.nav('Open a session file (care team)');
    await page.locator('#clinician-session-file').setInputFiles(file('s.json', { schemaVersion: 1, appVersion: '0.1.0', angleMethod: '2D webcam estimate, not a goniometer measurement', pseudonymId: '123e4567-e89b-42d3-a456-426614174000', protocolId: null, exportedAt: new Date().toISOString(), sessions: [] }));
    await page.locator('#clinician-protocol-file').setInputFiles(file('p.json', p)).catch(() => h.note('clinician protocol input not shown for an empty file'));
    await page.waitForTimeout(300); await h.audit('care-team-with-plan');
  });
}

// 3. Files that the loader must refuse. Each must show an alert, store nothing, keep the screen usable.
const nest = (n) => '['.repeat(n) + ']'.repeat(n);
const base = JSON.stringify(plan());
const bad = {
  'size-10mb': buf(`{"authoredBy":"${'A'.repeat(10 * 1024 * 1024)}"}`),
  'size-4.9mb-valid-json': buf(JSON.stringify({ ...plan(), authoredBy: 'A'.repeat(4.9 * 1024 * 1024) })),
  'multibyte-5mb': buf(`{"authoredBy":"${'€'.repeat(1_800_000)}"}`),
  'proto-top': buf(base.replace('{', '{"__proto__":{"polluted":"yes","pwn":1},')),
  'proto-constructor': buf(base.replace('{', '{"constructor":{"prototype":{"polluted":"yes"}},')),
  'proto-nested': buf(base.replace('"surgeon":{}', '"surgeon":{"__proto__":{"polluted":"yes"}}')),
  'proto-exercise': buf(base.replace('"kind":"heel-slide"', '"kind":"heel-slide","__proto__":{"polluted":1}')),
  'wrong-types': buf({ ...plan(), activePhase: '1', phases: {}, side: ['left'], surgeon: null }),
  'array-root': buf('[1,2,3]'),
  'null-root': buf('null'),
  'string-root': buf('"<script>window.__pwn=1</script>"'),
  'empty': buf(''),
  'nul-bytes': buf(base.replace('hostile-001', 'host\u0000ile')),
  'payload-key': buf({ ...plan(), [P.img]: 1, [LONG(5000)]: 2 }),
  'neg-numbers': buf(plan((p) => { p.activePhase = -1; p.phases[0].exercises[0].reps = -5; p.phases[0].exercises[0].targetFlexion = -90; })),
  'huge-numbers': buf(base.replace('"reps":10', '"reps":1e308').replace('"activePhase":1', '"activePhase":9007199254740993')),
  'infinity-literal': buf(base.replace('"reps":10', '"reps":1e999')),
  'nan-literal': buf(base.replace('"reps":10', '"reps":NaN')),
  'float-where-int': buf(base.replace('"reps":10', '"reps":10.5')),
  'neg-zero': buf(base.replace('"reps":10', '"reps":-0')),
  'deep-nesting': buf(nest(200000)),
  'huge-array': buf('{"phases":[' + '{},'.repeat(1_500_000) + '{}]}'),
  'bad-id': buf({ ...plan(), id: '../../etc/passwd<script>' }),
  'bad-date': buf({ ...plan(), approvedOn: `2026-13-45${P.img}` }),
  'text-too-long': buf(plan((p) => { p.authoredBy = P.script + 'X'.repeat(500); })),
  'unknown-key-xss': buf({ ...plan(), surgeon: { [P.svg]: 'x' } }),
};
for (const [name, data] of Object.entries(bad)) {
  await run(`c2-bad-${name}`, `refused plan file: ${name}`, async (page, h) => {
    await h.toLoad();
    const t = Date.now();
    await page.getByLabel('Choose a file from your care team').setInputFiles({ name: 'p.json', mimeType: 'application/json', buffer: data });
    const alert = page.getByRole('alert').first();
    const shown = await alert.waitFor({ timeout: 15000 }).then(() => true, () => false);
    const ms = Date.now() - t;
    if (ms > 5000) h.fail(`slow: ${ms} ms to refuse`);
    if (!shown) h.fail('no refusal notice');
    else { const txt = await alert.innerText(); if (txt.length > 700) h.fail(`error text too long: ${txt.length}`); h.note(`${ms} ms: ${txt.replace(/\s+/g, ' ').slice(0, 90)}`); }
    if ((await h.h1()) !== 'Load protocol file') h.fail(`left the Load screen: ${await h.h1()}`);
    await h.audit('refused');
    const raw = await page.evaluate(() => new Promise((res) => { const q = indexedDB.open('mpfl-rehab'); q.onsuccess = () => { const d = q.result; if (!d.objectStoreNames.contains('protocol')) { d.close(); return res(0); } const c = d.transaction('protocol').objectStore('protocol').count(); c.onsuccess = () => { d.close(); res(c.result); }; }; }));
    if (raw) h.fail(`refused file was stored (${raw})`);
  });
}

// Files that the loader accepts although they look odd. Recorded as notes, not as failures.
for (const [name, data, hint] of [['bom', buf('\ufeff' + base), 'BOM is removed by File.text()'], ['dup-keys-last-wins', buf(base.replace('"side":"left"', '"side":"left","side":"right"')), 'JSON.parse keeps the last duplicate key; the pairing code rejects it, the plan loader does not']]) {
  await run(`c2-odd-${name}`, `accepted plan file: ${name}`, async (page, h) => {
    await h.toLoad(); await h.load({ name: 'p.json', mimeType: 'application/json', buffer: data });
    h.note(hint); await h.audit('home');
  });
}

// 4. Edge but valid plans.
await run('c3-valid-edge', 'valid plan with 10 phases, activePhase 10, zero limits', async (page, h) => {
  const p = plan((q) => {
    q.activePhase = 10; q.painPauseThreshold = 0;
    q.phases = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, name: EMOJI(60), exercises: i % 2 ? [{ kind: 'straight-leg-raise', sets: 20, reps: 100, maxTopFlexion: 45, source: LONG(200) }] : [{ kind: 'heel-slide', sets: 1, reps: 1, targetFlexion: 0, maxFlexion: 180, returnWithinDeg: 90, minRepSeconds: 30, source: 'x' }], reviewCriteria: [{ kind: 'numeric', measure: 'sessionsDone', op: 'atLeast', limit: 100000, lastSessions: 10, evidence: 'unvalidated' }] }));
  });
  await h.toHome(p); await h.audit('home');
  const hp = await h.homePhase(); if (!hp?.startsWith('10,')) h.fail(`Home phase "${hp}" is not 10`);
  await h.nav(/^Start /); await h.audit('red-flag');
});

// 5. Import on My data.
const sess = (i, o = {}) => ({ date: new Date(Date.UTC(2026, 0, 1) + i * 3600e3).toISOString(), exercise: 'heel-slide', side: 'left', reps: 1000, peakFlexion: 180, holdSeconds: null, topFlexion: null, marginDeg: 45, marginSource: MARGIN_SOURCE, view: 'side', nearLimit: 100000, overLimit: 100000, tooFast: 100000, gaveWayPresses: 100000, redFlagBlocks: 100000, protocolId: 'example-001', phase: 10, schemaVersion: 1, ...o });
const exp = (sessions, o = {}) => ({ schemaVersion: 1, appVersion: '0.1.0', angleMethod: '2D webcam estimate, not a goniometer measurement', pseudonymId: '123e4567-e89b-42d3-a456-426614174000', protocolId: 'example-001', exportedAt: new Date().toISOString(), sessions, ...o });
const importCases = {
  'edge-valid-1200': { f: file('good.json', exp(Array.from({ length: 1200 }, (_, i) => sess(i, i % 3 ? { pain: 0, swelling: 'none', reps: 0, peakFlexion: 0 } : { pain: 10, swelling: 'more' })))), ok: true },
  'filename-xss': { f: file(`${P.img}.json`, exp([sess(0)])), ok: true },
  'filename-long': { f: file(`${LONG(250)}.json`, exp([sess(0)])), ok: true },
  'filename-rtl': { f: file(`${RTL(60)}.json`, exp([sess(0)])), ok: true },
  'payload-values': { f: file('x.json', exp([sess(0, { exercise: P.img, swelling: P.script, marginSource: P.svg, protocolId: P.js })])), ok: false },
  'proto-pollution': { f: file('x.json', Buffer.from(JSON.stringify(exp([sess(0)])).replace('{', '{"__proto__":{"polluted":"yes"},'))), ok: false },
  'wrong-types': { f: file('x.json', exp([sess(0, { reps: '1000', peakFlexion: NaN, nearLimit: -1, date: 5 })])), ok: false },
  'nan-null': { f: file('x.json', exp([sess(0, { peakFlexion: null, reps: null, marginDeg: 0 })])), ok: true },
  'too-large-6mb': { f: file('big.json', Buffer.alloc(6 * 1024 * 1024, 32)), ok: false },
  'not-json-ext': { f: { name: 'x.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('MZ\u0000') }, ok: false },
  'sessions-5001': { f: file('x.json', exp(Array.from({ length: 5001 }, (_, i) => sess(i)))), ok: false },
};
for (const [name, c] of Object.entries(importCases)) {
  await run(`c4-import-${name}`, `session import: ${name}`, async (page, h) => {
    await h.toHome(plan());
    await h.nav('My data'); await page.getByRole('heading', { level: 1, name: 'My data' }).waitFor();
    const t = Date.now();
    await page.locator('#import-file').setInputFiles(c.f);
    await page.locator('.drop-line[role]').waitFor({ timeout: 20000 }).catch(() => h.fail('no import result line'));
    h.note(`${Date.now() - t} ms: ${(await page.locator('.drop-line').first().innerText().catch(() => '')).slice(0, 100)}`);
    const role = await page.locator('.drop-line[role]').first().getAttribute('role').catch(() => null);
    if (c.ok && role !== 'status') h.fail(`expected import ok, got ${role}`);
    if (!c.ok && role === 'status') h.fail('hostile file was imported');
    await h.audit('my-data-after-import');
    await page.getByRole('button', { name: 'Back' }).click(); await page.getByRole('heading', { level: 1, name: 'Today' }).waitFor();
    if (c.ok) {
      const t2 = Date.now();
      await h.nav('Sessions'); await page.getByRole('heading', { level: 1, name: 'Your sessions' }).waitFor({ timeout: 15000 }).catch(() => h.fail('Progress screen did not open'));
      await page.waitForTimeout(500); await h.audit('progress');
      h.note(`progress ${Date.now() - t2} ms`);
      await page.getByRole('button', { name: 'Back' }).click().catch(() => {});
      await h.nav('My data'); await h.nav('Open a session file (care team)');
      await page.locator('#clinician-session-file').setInputFiles(c.f); await page.waitForTimeout(800); await h.audit('care-team-file');
    }
  });
}

// 6. IndexedDB and localStorage with hostile records.
const hostileRow = (i) => ({ date: i % 2 ? 'not a date' : new Date(1.7e12 + i * 1e6).toISOString(), exercise: [P.img, '__proto__', 'constructor', LONG(5000), RTL(200)][i % 5], side: P.script, reps: ['abc', NaN, Infinity, -1e308, 1e308, null, {}, []][i % 8], peakFlexion: [NaN, Infinity, -Infinity, 1e999, -1, 'x'][i % 6], holdSeconds: -5, topFlexion: 1e20, marginDeg: NaN, marginSource: P.svg, view: P.js, nearLimit: -1, overLimit: 'x', tooFast: NaN, gaveWayPresses: null, redFlagBlocks: [], pain: [11, -3, NaN, '9', P.img][i % 5], swelling: [P.script, 'none', 'more', 5, null][i % 5], protocolId: P.link, phase: 1e9, setsPrescribed: 0, repsPerSet: ['a', NaN, -1], setPain: 'bad', secondView: 'front', frontReps: NaN, frontChangeDeg: Infinity, repsBy: P.img, schemaVersion: 99, ['__proto__']: { polluted: 'yes' }, extra: LONG(100000) });
await run('c5-idb-hostile-sessions', 'IndexedDB sessions with hostile fields', async (page, h) => {
  await h.toHome(plan());
  await h.idbSeed('sessions', Array.from({ length: 25 }, (_, i) => hostileRow(i)));
  await page.reload(); await page.waitForTimeout(500);
  if ((await h.h1()) === 'Privacy') await page.getByRole('button', { name: 'I understand' }).click();
  await page.getByRole('heading', { level: 1, name: 'Today' }).waitFor();
  await h.audit('home');
  for (const [btn, heading] of [['Sessions', 'Your sessions'], ['My data', 'My data']]) {
    await h.nav(btn);
    const ok = await page.getByRole('heading', { level: 1, name: heading }).waitFor({ timeout: 6000 }).then(() => true, () => false);
    if (!ok) h.fail(`${btn}: screen did not open (h1=${await h.h1()})`);
    await page.waitForTimeout(400); await h.audit(btn);
    const back = page.getByRole('button', { name: 'Back' }); if (await back.count()) await back.first().click();
  }
  // export with the hostile rows: CSV and JSON must not carry a formula start or throw
  await page.getByRole('button', { name: 'My data' }).click().catch(() => {});
  await page.waitForTimeout(300);
  for (const b of ['Export JSON', 'Export CSV']) { const loc = page.getByRole('button', { name: new RegExp(b.replace('Export ', ''), 'i') }).first(); if (await loc.count()) { const d = page.waitForEvent('download', { timeout: 3000 }).catch(() => null); await loc.click().catch(() => {}); const dl = await d; if (dl) { const p = await dl.path(); const txt = fs.readFileSync(p, 'utf8'); h.note(`${b}: ${txt.length} bytes`); if (/^[=+@-]/m.test(txt.split('\n').slice(2).join('\n').replace(/^"/gm, ''))) h.note('a CSV line starts with a formula sign'); } } }
}, { allowDownloads: true });

await run('c5b-idb-hostile-protocol', 'stored protocol text that is changed in place', async (page, h) => {
  await h.toHome(plan());
  for (const [label, raw] of [['not-json', '<script>window.__pwn=1</script>'], ['proto', '{"__proto__":{"polluted":"yes"}}'], ['huge', 'A'.repeat(8 * 1024 * 1024)], ['payload-valid', JSON.stringify(plan((p) => { p.authoredBy = P.img; p.phases[0].name = P.script; p.activePhase = 2; }))], ['example-flag', JSON.stringify({ ...EX, approvedOn: '2026-01-01' })]]) {
    await h.idbSeed('protocol', [{ key: 'current', raw, savedAt: P.img }]);
    await page.reload(); await page.waitForTimeout(500);
    if ((await h.h1()) === 'Privacy') await page.getByRole('button', { name: 'I understand' }).click();
    await page.waitForTimeout(300);
    const t = await h.h1(); h.note(`${label}: screen ${t}`);
    await h.audit(`stored-${label}`);
    if (label === 'payload-valid') { const hp = await h.homePhase(); if (!hp?.startsWith('2,')) h.fail(`phase shown "${hp}" differs from the stored file`); }
  }
}, {});
await run('c5c-localstorage-hostile', 'hostile mpfl.* localStorage values and fake gate keys', async (page, h) => {
  await page.goto('/');
  await page.evaluate((P) => {
    for (const k of ['pseudoId', 'lastExport', 'persistAsked', 'privacySeen', 'contactDismissed']) localStorage.setItem(`mpfl.${k}`, P.img + P.script);
    for (const k of ['redFlagCleared', 'cleared', 'skipRedFlag', 'activePhase', 'phase', 'mode', 'screen', 'debug']) localStorage.setItem(`mpfl.${k}`, k === 'activePhase' || k === 'phase' ? '9' : 'true');
    localStorage.setItem('mpfl.lastExport', '9'.repeat(5000));
  }, P);
  await page.reload(); await page.waitForTimeout(400);
  await h.audit('first-screen');
  if ((await h.h1()) !== 'Privacy') h.note(`first screen with fake privacySeen: ${await h.h1()} (the key only tells that the notice was shown)`);
  if ((await h.h1()) === 'Privacy') await page.getByRole('button', { name: 'I understand' }).click();
  await page.waitForTimeout(300);
  if ((await h.h1()) === 'Load protocol file') { await h.load(file('p.json', plan())); }
  await h.audit('home'); await h.nav(/^Start Heel slide/);
  const t = await h.h1(); if (t !== 'Check before you exercise') h.fail(`gate skipped, screen: ${t}`);
  await h.audit('gate');
  const hp = null; void hp;
  await h.nav('Back to Home'); await h.nav('My data'); await h.audit('my-data');
}, {});

// 7. Pairing: the phone and the laptop paste boxes.
function offerBytes({ ip = [192, 168, 1, 5], port = 5000, role = 0 } = {}) {
  const u = 'abcd', pw = 'a'.repeat(24); const out = [role | (1 << 1), u.length, ...Buffer.from(u), pw.length, ...Buffer.from(pw), ...Array(32).fill(7), ...Array(16).fill(9), 0, ...ip, port >> 8, port & 255];
  return 'MPFL1.' + Buffer.from(out).toString('base64url');
}
const hostileOffers = {
  empty: '   ', prefix: 'MPFL1.', 'too-long-100k': 'MPFL1.' + 'A'.repeat(100000), 'ten-mb': 'A'.repeat(10 * 1024 * 1024), script: P.script, img: P.img,
  'json-offer': JSON.stringify({ type: 'offer', sdp: 'v=0\r\nm=application 9\r\na=candidate:1 1 udp 1 8.8.8.8 9 typ host' }), 'proto-json': '{"__proto__":{"polluted":"yes"},"type":"offer"}',
  rtl: RTL(300), emoji: EMOJI(300), nul: 'MPFL1.\u0000\u0000', 'bad-b64': 'MPFL1.!!!!', 'noncanonical': 'MPFL1.' + offerBytes().slice(6) + 'B',
  'public-ip': offerBytes({ ip: [8, 8, 8, 8] }), loopback: offerBytes({ ip: [127, 0, 0, 1] }), 'port-0': offerBytes({ port: 0 }), 'wrong-role-answer': offerBytes({ role: 1 }),
  'sdp-text': 'v=0\r\no=- 1 2 IN IP4 127.0.0.1\r\na=candidate:1 1 udp 1 8.8.8.8 9 typ host\r\n',
};
await run('c6-pair-phone-paste', 'phone screen: hostile laptop codes pasted', async (page, h) => {
  await h.toLoad();
  await h.nav(/Use this phone as the second camera/);
  await page.getByRole('button', { name: 'Scan the laptop code' }).click();
  await page.locator('#pair-paste-offer').waitFor({ timeout: 8000 });
  for (const [k, v] of Object.entries(hostileOffers)) {
    await page.locator('#pair-paste-offer').fill(v);
    const btn = page.getByRole('button', { name: 'Use this code' });
    if (await btn.isEnabled()) await btn.click();
    await page.waitForTimeout(150);
    const err = await page.getByRole('alert').first().innerText().catch(() => '');
    h.note(`${k}: ${err.replace(/\s+/g, ' ').slice(0, 60) || '(no alert)'}`);
    const rtc = await page.evaluate(() => window.__rtc.ctor);
    if (rtc > 0) { h.fail(`RTCPeerConnection created for "${k}"`); break; }
    if (v.trim() && !/^\s*$/.test(v) && !err && k !== 'empty') h.fail(`no refusal text for "${k}"`);
  }
  await h.audit('after-hostile-codes');
  // a valid private-network offer is accepted by design: only record what happens
  await page.locator('#pair-paste-offer').fill(offerBytes());
  await page.getByRole('button', { name: 'Use this code' }).click(); await page.waitForTimeout(800);
  h.note(`valid private offer: rtc ctor=${await page.evaluate(() => window.__rtc.ctor)}, h1=${await h.h1()}`);
  await h.audit('after-valid-offer');
}, {});
await run('c6b-pair-laptop-paste', 'laptop screen: hostile phone answers pasted', async (page, h) => {
  await h.toHome(plan());
  await h.nav(/^Start Heel slide/); await page.getByRole('button', { name: 'None of these apply. Continue' }).click();
  await page.getByRole('heading', { level: 1, name: 'Set up the camera' }).waitFor();
  await page.getByRole('button', { name: 'Add a second camera (optional)' }).click(); await page.waitForTimeout(500);
  const ensureOffer = async () => {
    if (await page.locator('#pair-paste-answer').count()) return true;
    const retry = page.locator('main button.btn-primary').first();
    if (await retry.count() && !(await page.getByRole('button', { name: 'Start pairing' }).count())) await retry.click().catch(() => {});
    const st = page.getByRole('button', { name: 'Start pairing' });
    if (await st.count()) await st.click();
    return page.locator('#pair-paste-answer').waitFor({ timeout: 8000 }).then(() => true, () => false);
  };
  if (await ensureOffer()) await h.audit('pair-host-before-any-input');
  let tried = 0;
  const answers = { ...hostileOffers, 'valid-private-answer': offerBytes({ role: 1 }) };
  for (const [k, v] of Object.entries(answers)) {
    if (!(await ensureOffer())) { h.note(`GAP: offer step not reachable before "${k}"`); break; }
    const before = await page.evaluate(() => window.__rtc.setRemote);
    await page.locator('#pair-paste-answer').fill(v);
    const sub = page.getByRole('button', { name: 'Use this code' });
    if (await sub.isEnabled().catch(() => false)) { await sub.click(); tried++; }
    await page.waitForTimeout(250);
    const n = await page.evaluate(() => window.__rtc.setRemote);
    const msg = (await page.getByRole('alert').first().innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 70);
    h.note(`${k}: setRemote +${n - before}${msg ? `, ${msg}` : ''}`);
    if (n > before && k !== 'valid-private-answer') h.fail(`setRemoteDescription called for hostile "${k}"`);
  }
  h.note(`answers submitted: ${tried}`);
  await h.audit('after-hostile-answers');
}, {});

// 8. URL hash and query, and the history, against the red-flag gate.
const urls = ['/?screen=session&redFlagCleared=true&phase=9&exercise=heel-slide&mode=patient&debug=1', `/?q=${encodeURIComponent(P.img)}&x=${encodeURIComponent(P.script)}`, '/#session', '/#setup', '/#redflag', '/#/summary', '/#clinician', '/#data', `/#${encodeURIComponent(P.img)}`, `/#${P.svg}`, '/#__proto__=1&constructor[prototype][polluted]=1', '/session', '/setup/../../x', `/?${'a=b&'.repeat(2500)}`, `/#${'A'.repeat(200000)}`];
for (const [i, u] of urls.entries()) {
  await run(`c7-url-${i}`, `URL ${u.slice(0, 60)}`, async (page, h) => {
    const p = plan((q) => { q.activePhase = 2; });
    await h.toHome(p);                       // a protocol is stored, phase 2
    await page.goto(u); await page.waitForTimeout(500);
    let t = await h.h1();
    if ((await h.h1()) === 'Privacy') { await page.getByRole('button', { name: 'I understand' }).click(); await page.waitForTimeout(200); t = await h.h1(); }
    if (!['Today', 'Privacy', 'Load protocol file'].includes(t)) h.fail(`URL opened screen "${t}"`);
    await h.audit('after-url');
    const hp = await h.homePhase(); if (t === 'Today' && !hp?.startsWith('2,')) h.fail(`phase shown "${hp}" is not the stored phase 2`);
    if ((await h.storedPhase()) !== 2) h.fail('stored phase changed');
    await h.nav(/^Start /); const g = await h.h1(); if (g !== 'Check before you exercise') h.fail(`gate skipped by URL, screen: ${g}`);
  }, {});
}
await run('c7z-history-gate', 'browser history and fake history state cannot pass the red-flag gate', async (page, h) => {
  const gateHeading = 'Check before you exercise';
  await h.toHome(plan());
  const notPast = async (label) => { const t = await h.h1(); if (['Set up the camera', 'Heel slide', 'Summary'].includes(t)) h.fail(`${label}: reached "${t}" without a passed gate`); return t; };
  await h.nav(/^Start Heel slide/);
  await page.getByLabel('Sudden shortness of breath or chest pain.').check();   // a block
  for (const step of ['back', 'forward', 'back', 'forward']) { await (step === 'back' ? page.goBack() : page.goForward()).catch(() => {}); await page.waitForTimeout(150); await notPast(`blocked then ${step}`); }
  const cont = page.getByRole('button', { name: 'None of these apply. Continue' });
  if (await cont.count() && await cont.isEnabled()) h.fail('Continue enabled after a ticked red flag and history moves');
  // fake entries
  for (const st of ['setup', 'session', 'summary', { screen: 'session' }, '__proto__']) {
    await page.evaluate((s) => { history.pushState(s, ''); dispatchEvent(new PopStateEvent('popstate', { state: s })); }, st);
    await page.waitForTimeout(150); await notPast(`fake history ${JSON.stringify(st)}`);
  }
  await h.audit('after-fake-history');
  // the block from a visit is lost on purpose: a fresh start must show the gate again
  await page.goto('/'); await page.waitForTimeout(300);
  if ((await h.h1()) === 'Privacy') await page.getByRole('button', { name: 'I understand' }).click();
  await h.nav(/^Start Heel slide/); if ((await h.h1()) !== gateHeading) h.fail('gate missing after reload');
  // pass the gate legally, then go back and forward
  await page.getByRole('button', { name: 'None of these apply. Continue' }).click();
  await page.getByRole('heading', { level: 1, name: 'Set up the camera' }).waitFor();
  await page.goBack().catch(() => {}); await page.waitForTimeout(200);
  await page.goForward().catch(() => {}); await page.waitForTimeout(200);
  h.note(`after pass, back, forward: ${await h.h1()}`);
  await page.reload(); await page.waitForTimeout(400);
  if ((await h.h1()) === 'Privacy') await page.getByRole('button', { name: 'I understand' }).click();
  await notPast('reload after pass');
  await h.nav(/^Start Heel slide/); if ((await h.h1()) !== gateHeading) h.fail('gate skipped after history use');
}, {});

// ---- auditnew: Home and Check my progress for a plan made by the app, week 8, phase 1 active ----
{
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const btn = (page, name) => page.getByRole('button', { name, exact: true });
  async function toGeneratedHome(page) {
    await page.goto('/');
    await btn(page, 'I understand').click();
    await page.getByRole('heading', { level: 1, name: 'Load protocol file' }).waitFor();
    await btn(page, 'Create my plan').click();
    // The questions run in 3 groups. A legend names the radio group of one question, so "No" is found once in its group.
    const pick = (q, a) => page.getByRole('group', { name: q }).getByRole('radio', { name: a, exact: true }).check();
    await pick('Did your care team give you a written rehab plan?', 'No');
    await pick('Which operation did you have?', 'MPFL reconstruction only');
    await pick('How old are you?', '18 or older');
    await pick('Did you have surgery on both knees?', 'No');
    await pick('Is this your first MPFL surgery on this knee?', 'Yes');
    await pick('Did your surgeon give special rules, for example about the graft, the fixation or the shape of your knee?', 'No');
    await btn(page, 'Continue to your surgeon').click();
    const [y, m, d] = iso(new Date(Date.now() - 24 * 86400000)).split('-');
    await page.getByLabel('Day', { exact: true }).fill(String(Number(d)));
    await page.getByLabel('Month', { exact: true }).fill(String(Number(m)));
    await page.getByLabel('Year', { exact: true }).fill(y);
    await pick('Which knee did you have surgery on?', 'Left');
    await pick('Did your surgeon give a limit for how far you can bend your knee, also with a brace?', 'Yes, my limit is');
    await page.getByLabel('Limit in degrees').fill('60');
    await btn(page, 'Continue to today').click();
    await page.getByRole('radio', { name: '2', exact: true }).check(); await page.getByRole('radio', { name: 'No swelling', exact: true }).check();
    await btn(page, 'Check my answers').click();
    await btn(page, 'Make my plan').click(); await btn(page, 'Use this plan').click(); await btn(page, 'Confirm').click();
    await page.getByRole('heading', { level: 1, name: 'Today' }).waitFor();
  }
  const protocolId = async (page) => page.evaluate(() => new Promise((res) => { const o = indexedDB.open('mpfl-rehab'); o.onsuccess = () => { const db = o.result; const g = db.transaction('protocol').objectStore('protocol').getAll(); g.onsuccess = () => { db.close(); res(JSON.parse(g.result[0].raw).id); }; }; }));
  const row = (pid, extra = {}) => ({ date: new Date().toISOString(), exercise: 'heel-slide', side: 'left', reps: 8, peakFlexion: 84, holdSeconds: null, topFlexion: null, marginDeg: 9, marginSource: MARGIN_SOURCE, view: 'side', nearLimit: 0, overLimit: 0, tooFast: 0, gaveWayPresses: 0, redFlagBlocks: 0, pain: 2, swelling: 'none', protocolId: pid, phase: 1, schemaVersion: 1, ...extra });
  const week8 = async (page) => { await page.clock.setFixedTime(new Date(Date.now() + 32 * 86400000)); await page.reload(); await page.getByRole('heading', { level: 1, name: 'Today' }).waitFor(); };
  const openCheck = async (page) => { await page.getByRole('button', { name: 'Check my progress' }).first().click(); await page.getByRole('heading', { level: 1, name: 'Check my progress' }).waitFor(); await page.getByRole('heading', { level: 2 }).first().waitFor(); };
  for (const [id, desc, extra, goCheck] of [
    ['c10a-home-week8', 'generated plan, week 8, phase 1: Home card and last-session line', {}, false],
    ['c10b-check-none', 'Check my progress, no safety event', {}, true],
    ['c10c-check-event', 'Check my progress, Knee gave way or hurts since the plan date', { gaveWayPresses: 1 }, true],
  ]) {
    await run(id, desc, async (page, h) => {
      await toGeneratedHome(page);
      await h.idbSeed('sessions', [row(await protocolId(page), extra)]);
      await week8(page);
      await page.getByText(/^Last session: /).first().waitFor({ timeout: 6000 });
      if (!goCheck) { await h.audit('home-week8'); await h.storage(); return; }
      await openCheck(page);
      await h.audit('check');
      if (extra.gaveWayPresses) { const t = await page.locator('main, #root').first().innerText(); if (!t.includes('Contact your care team before the next stage')) h.fail('hold text missing'); }
      const before = await h.storedPhase();
      await btn(page, 'Update my plan').click(); await page.getByRole('heading', { level: 1, name: 'Update my plan' }).waitFor(); await h.audit('update-from-check');
      if ((await h.storedPhase()) !== before) h.fail('phase changed by opening Update my plan');
    });
  }
  await run('c10d-hostile-rows-week8', 'generated plan, week 8, 25 hostile session rows: Home and Check my progress', async (page, h) => {
    await toGeneratedHome(page);
    await h.idbSeed('sessions', [row(await protocolId(page)), ...Array.from({ length: 25 }, (_, i) => hostileRow(i))]);
    await week8(page);
    await h.audit('home-hostile');
    await openCheck(page);
    await h.audit('check-hostile');
  });
}

// Positive control (CONTROL=1): the harness must FAIL here. It injects markup by hand and widens the page.
if (process.env.CONTROL === '1') await run('c9-control', 'CONTROL: injected markup, overflow, empty root must be caught', async (page, h) => {
  await h.toHome(plan());
  await page.evaluate((x) => { const r = document.getElementById('root'); r.insertAdjacentHTML('beforeend', x); r.insertAdjacentHTML('beforeend', '<div style="width:900px;height:5px"></div>'); }, P.img);
  await h.audit('control');
  await page.evaluate(() => { document.getElementById('root').replaceChildren(); });
  await h.audit('control-empty');
});

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ base: BASE, seconds: Math.round((Date.now() - T0) / 1000), results }, null, 1));
const failed = results.filter((r) => !r.pass);
// A case whose script broke did not run to the end. This is a gap, and the exit code must show it.
const notRun = results.filter((r) => r.fails.some((f) => f.startsWith('script error') || f.startsWith('final audit error')));
console.log(`\nSUMMARY base=${BASE} cases=${results.length} pass=${results.length - failed.length} fail=${failed.length} audits=${results.reduce((a, r) => a + r.audits, 0)} cspViolations=${results.reduce((a, r) => a + r.csp, 0)} foreignRequests=${results.reduce((a, r) => a + r.foreign.length, 0)} notRun=${notRun.length} scriptRuns=${results.reduce((a, r) => a + r.fails.filter((f) => f.startsWith('SCRIPT RAN')).length, 0)} result=${OUT}`);
await browser.close();
process.exit(failed.length || notRun.length ? 1 : 0);
