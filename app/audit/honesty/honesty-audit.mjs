#!/usr/bin/env node
// Data-honesty and standing-rule audit of the MPFL rehab app on a rendered build.
// Self test: node honesty-audit.mjs --selftest   (a page with known faults must give FAIL on each check; proves the checks can fail)
// Usage: node honesty-audit.mjs <BASE_URL> [--out <dir>] [--theme light|dark|both] [--clip <file.mjpeg>] [--src <app src dir>] [--only a,b] [--no-shots]
// Example: node honesty-audit.mjs http://127.0.0.1:4417
// Needs: Playwright with a Chromium build. It uses the copy in the app folder (APP_ROOT, default below). No dependency is added.
// The script only reads the app. It writes a JSON file and screenshots into --out. It never writes into the app.
// Status words: PASS (evidence shown), FAIL (a rule is broken), REVIEW (a person must judge), N/A (the feature is not in this build),
// SKIP (the screen could not be reached, the reason is shown), INFO (a number for the report).
// Exit code: 1 when any FAIL, 2 when the script itself broke, else 0. A SKIP is not a PASS. Read the SKIP lines.
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = process.env.APP_ROOT || path.resolve(HERE, '../..');
const require = createRequire(path.join(APP_ROOT, 'package.json'));
const { chromium } = require('@playwright/test');

const argv = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : dflt;
};
const SELFTEST = argv.includes('--selftest');
const BASE = argv.find((a) => /^https?:\/\//.test(a)) || (SELFTEST ? 'http://127.0.0.1' : undefined);
if (!BASE) {
  console.error('Usage: node honesty-audit.mjs <BASE_URL> [--out dir] [--theme light|dark|both] [--clip file.mjpeg] [--src dir] [--only a,b] [--no-shots]');
  process.exit(2);
}
const OUT = path.resolve(opt('--out', path.join(os.tmpdir(), 'mpfl-audit-honesty')));
const THEMES = opt('--theme', 'both') === 'both' ? ['light', 'dark'] : [opt('--theme', 'both')];
const CLIP = opt('--clip', '');
const SRC = opt('--src', '');
const ONLY = opt('--only', '') ? opt('--only', '').split(',') : null;
const SHOTS = !argv.includes('--no-shots');
mkdirSync(OUT, { recursive: true });

const T = {
  understand: 'I understand',
  fileLabel: 'Choose a file from your care team',
  startHeel: 'Start Heel slide',
  cont: 'None of these apply. Continue',
  backHome: 'Back to Home',
  next: 'Next: set up the camera',
  startCamera: 'Start camera',
  startExercise: 'Start exercise',
  save: 'Save',
  done: 'Done',
  sessions: 'Sessions', // the tab. The screen it opens has the heading "Your sessions" (T.h1.sessions)
  data: 'My data',
  careTeam: 'Open a session file (care team)',
  createPlan: 'Create my plan',
  companion: 'Use this phone as the second camera',
  h1: { redflag: 'Check before you exercise', setup: 'Set up the camera', summary: 'Summary', home: 'Today', privacy: 'Privacy', load: 'Load protocol file', sessions: 'Your sessions', data: 'My data' },
  pauseMessage: 'Pause and contact your care team.',
  angleLabel: 'estimated angle, not a medical measurement',
  prototype: 'Prototype. Not for patient use.',
  example: 'EXAMPLE, NOT APPROVED',
  navNames: ['Today', 'Progress', 'Sessions', 'My data'],
};
const EXAMPLE_FILE = path.join(APP_ROOT, 'src/lib/protocol/example-protocol.json');
const MARGIN_SOURCE = 'lite-start-v1';
const FLOW_SCREENS = ['redflag', 'redflag-blocked', 'setup-guide', 'setup-camera-before', 'setup-camera-nopose', 'session-nopose', 'summary', 'summary-pain6', 'summary-pain7', 'offline-setup-camera'];
const MEASURED_SCREENS = ['new-home-360', 'new-home-1280', 'new-check-none-360', 'new-check-none-1280', 'new-check-event-360', 'new-check-event-1280', 'session-nopose', 'session-clip', 'summary', 'summary-pain6', 'summary-pain7', 'dashboard-1', 'dashboard-100', 'dashboard-missing', 'clinician', 'setup-camera-nopose'];

const claims = readFileSync(path.join(APP_ROOT, 'scripts/claims-check.sh'), 'utf8');
const grab = (name) => {
  const m = new RegExp(`^${name}='([^']*)'`, 'm').exec(claims);
  if (!m) throw new Error(`claims-check.sh has no list named ${name}`);
  return m[1];
};
const VERDICT_RE = new RegExp(`\\b(${grab('words')})\\b`, 'gi');
const PRAISE_RE = new RegExp(`\\b(${grab('praise')})\\b`, 'gi');
const PHRASE_RE = new RegExp(`(${grab('phrases')}|risk of injury)`, 'gi');
// Not in claims-check.sh: gamification and score words (this audit adds them from the plan rules).
const GAME_RE = /\b(streaks?|badges?|trophy|trophies|achievements?|confetti|level[ -]?up|congrat\w*|leaderboard|medals?|rewards?|unlock(ed)?|points|ranking|rank)\b/gi;
const SCORE_RE = /(\b\d+(\.\d+)?\s*%|\b\d+\s*\/\s*100\b|\bscore\b|\bgrade\b)/gi;
const BROKEN_RE = /\b(NaN|undefined|null|Infinity|\[object \w+\])\b/g;
// Context that is allowed. Each line says why. The audit still prints the count of allowed hits.
const ALLOW = [
  { re: /body points/i, why: 'the second camera sends body landmark points (privacy text)' },
];

const results = [];
const add = (screen, theme, check, status, detail, data) => {
  results.push({ screen, theme, check, status, detail, ...(data === undefined ? {} : { data }) });
};
const want = (name) => !ONLY || ONLY.includes(name);

const lin = (v) => {
  v /= 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
function oklch([r, g, b]) {
  const R = lin(r), G = lin(g), B = lin(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.hypot(a, bb);
  let h = (Math.atan2(bb, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { L, C, h };
}
const hex = ([r, g, b]) => '#' + [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, '0')).join('');
const CHROMA_MIN = 0.04; // below this a colour is a neutral (the repo test uses the same value)
function band(h) {
  if (h < 40 || h > 340) return 'red';
  if (h <= 100) return 'amber/yellow/orange'; // the repo test lets this band pass. A person reads it as caution.
  if (h < 175) return 'green';
  return null;
}

const INPAGE = readFileSync(path.join(HERE, 'audit-inpage.js'), 'utf8');
const PROBE = `(() => {
  const p = { osc: 0, audioContexts: 0, gum: 0, csp: [] };
  window.__p = p;
  document.addEventListener('securitypolicyviolation', (e) => p.csp.push(e.violatedDirective + ' ' + (e.blockedURI || 'inline')));
  const AC = window.AudioContext || window.webkitAudioContext;
  if (AC) {
    const co = AC.prototype.createOscillator;
    AC.prototype.createOscillator = function () { p.osc++; return co.apply(this, arguments); };
    const Real = AC;
    window.AudioContext = class extends Real { constructor(o) { super(o); p.audioContexts++; } };
  }
  const md = navigator.mediaDevices;
  if (md && md.getUserMedia) {
    const real = md.getUserMedia.bind(md);
    md.getUserMedia = (c) => { p.gum++; return real(c); };
  }
})();`;

async function launch({ fakeDevice = true, fakeUi = true, clip = '' } = {}) {
  const args = [];
  if (fakeDevice) args.push('--use-fake-device-for-media-stream');
  if (fakeUi) args.push('--use-fake-ui-for-media-stream');
  if (clip) args.push(`--use-file-for-fake-video-capture=${clip}`);
  return chromium.launch({ args });
}
async function context(browser, theme, viewport = { width: 390, height: 844 }) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, hasTouch: true, colorScheme: theme });
  await ctx.addInitScript(PROBE);
  await ctx.addInitScript(INPAGE);
  const page = await ctx.newPage();
  const errors = [];
  const foreign = [];
  page.on('console', (m) => m.type() === 'error' && !m.text().startsWith('INFO: ') && errors.push(m.text().slice(0, 200)));
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 200)));
  const origin = new URL(BASE).origin;
  page.on('request', (r) => {
    const u = r.url();
    if (!u.startsWith('data:') && !u.startsWith('blob:') && new URL(u).origin !== origin) foreign.push(u);
  });
  return { ctx, page, errors, foreign };
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function step(label, fn) {
  try {
    await fn();
    return null;
  } catch (e) {
    return `${label}: ${String(e.message || e).split('\n')[0].slice(0, 160)}`;
  }
}
const h1 = (page) => page.locator('h1').first().innerText({ timeout: 3000 }).catch(() => '');
async function clickNav(page, name) {
  for (const role of ['button', 'link', 'tab']) {
    const loc = page.getByRole(role, { name, exact: true });
    if ((await loc.count()) > 0) {
      await loc.first().click({ timeout: 5000 });
      return role;
    }
  }
  throw new Error(`no button, link or tab named "${name}"`);
}
async function expectH1(page, text, ms = 20000) {
  const t0 = Date.now();
  let got = '';
  while (Date.now() - t0 < ms) {
    got = await h1(page);
    if (got.trim() === text) return;
    await sleep(150);
  }
  throw new Error(`h1 is "${got}", wanted "${text}"`);
}

// A number of degrees is not a camera estimate when its own sentence names a published source (S1, P2, N3 ...)
// or says the number comes from the surgeon or the plan. Only camera estimates need the angle label.
// Every other angle number needs the label. The self-test pins both sides of this rule.
const ANGLE_RE = /(^|\s)(-?\d+(\.\d+)?|--)\s*(°|degrees?\b)/i;
const SOURCE_ID_RE = /\b[SPN]\d{1,2}\b/;
const PLAN_OWNER_RE = /surgeon limit|limit in your plan|your care team/i;
function angleSentence(full) {
  const parts = String(full).split(/(?<=[.!?])\s+/);
  return parts.find((x) => ANGLE_RE.test(' ' + x)) || String(full);
}
function angleExemptByWording(full) {
  const s = angleSentence(full);
  return SOURCE_ID_RE.test(s) || PLAN_OWNER_RE.test(s);
}

async function audit(page, screen, theme, { example = true, only = null } = {}) {
  const on = (c) => !only || only.includes(c);
  const A = (fn, ...a) => page.evaluate(([f, args]) => window.__audit[f](...args), [fn, a]);
  if (SHOTS && theme === 'light') await page.screenshot({ path: path.join(OUT, `${screen}.png`) }).catch(() => {});

  if (on('banner')) {
    const proto = await A('findText', T.prototype);
    const ex = await A('findText', T.example);
    const protoShown = proto.length > 0;
    const protoFirst = proto.some((p) => p.inViewport);
    add(screen, theme, 'prototype banner visible', protoShown ? 'PASS' : 'FAIL', protoShown ? `found ${proto.length}x, in first view: ${protoFirst}` : `text "${T.prototype}" is not visible`, proto);
    if (example) add(screen, theme, 'example banner visible', ex.length ? 'PASS' : 'FAIL', ex.length ? `found ${ex.length}x` : `text "${T.example}" is not visible`);
  }

  if (on('words')) {
    const { body, attrs } = await A('texts');
    const all = [body, ...attrs].join('\n');
    const hit = (re, kind) => {
      const found = [];
      for (const m of all.matchAll(re)) {
        const s = Math.max(0, m.index - 35);
        const ctx = all.slice(s, m.index + m[0].length + 35).replace(/\s+/g, ' ');
        const allowed = ALLOW.find((a) => a.re.test(ctx));
        found.push({ kind, word: m[0], ctx, allowed: allowed ? allowed.why : null });
      }
      return found;
    };
    const hits = [...hit(VERDICT_RE, 'verdict'), ...hit(PRAISE_RE, 'praise'), ...hit(PHRASE_RE, 'phrase')];
    const bad = hits.filter((h) => !h.allowed);
    add(screen, theme, 'no verdict word (claims-check lists)', bad.length ? 'FAIL' : 'PASS', bad.length ? `${bad.length} hit(s): ` + bad.slice(0, 4).map((h) => `"${h.word}" in "${h.ctx}"`).join(' | ') : `0 hits in ${all.length} characters of text, labels and titles` + (hits.length ? ` (${hits.length} allowed)` : ''), bad);
    const game = [...hit(GAME_RE, 'gamify'), ...hit(SCORE_RE, 'score')].filter((h) => !h.allowed);
    const gel = await A('gamify');
    const gbad = game.length + gel.length;
    add(screen, theme, 'no score, grade, streak, goal, milestone or badge', gbad ? 'FAIL' : 'PASS', gbad ? [...game.slice(0, 3).map((h) => `text "${h.word}" in "${h.ctx}"`), ...gel.slice(0, 3).map((g) => `element ${g.sel} "${g.text}"`)].join(' | ') : '0 text hits and 0 elements with badge, streak, trophy, goal, milestone, score or grade classes', [...game, ...gel]);
    const prog = await A('progress');
    if (prog.length) add(screen, theme, 'progress bar or meter present', 'REVIEW', `${prog.length} element(s): ` + prog.map((p) => `${p.sel}${p.label ? ' "' + p.label + '"' : ''}${p.hidden ? ' (aria-hidden)' : ''}`).join(', ') + '. A person must confirm each one shows a process or a clinician value and never a score.', prog);
    const broken = [...all.matchAll(BROKEN_RE)].map((m) => all.slice(Math.max(0, m.index - 25), m.index + m[0].length + 25).replace(/\s+/g, ' '));
    add(screen, theme, 'no NaN, undefined, null or Infinity text', broken.length ? 'FAIL' : 'PASS', broken.length ? broken.slice(0, 3).join(' | ') : '0 hits', broken);
  }

  if (on('colour')) {
    const { visibleElements, rows } = await A('colours');
    const flagged = [];
    for (const r of rows) {
      const [R, G, B, a] = r.rgba;
      if (a < 0.05) continue;
      const k = oklch([R, G, B]);
      const b = band(k.h);
      if (k.C >= CHROMA_MIN && b) flagged.push({ band: b, hex: hex([R, G, B]), alpha: +a.toFixed(2), chroma: +k.C.toFixed(3), hue: Math.round(k.h), L: +k.L.toFixed(2), count: r.count, props: r.props, samples: r.samples });
    }
    const worst = flagged.sort((x, y) => y.count - x.count);
    const by = (n) => worst.filter((w) => w.band === n).length;
    add(screen, theme, 'no green, red or amber state colour', worst.length ? 'FAIL' : 'PASS', worst.length ? `${worst.length} colour(s) (red ${by('red')}, green ${by('green')}, amber ${by('amber/yellow/orange')}): ` + worst.slice(0, 4).map((w) => `${w.hex} hue ${w.hue} chroma ${w.chroma} x${w.count} (${Object.keys(w.props).join('/')}) ${w.samples[0].sel}`).join(' | ') : `0 of ${rows.length} distinct colours on ${visibleElements} visible elements have chroma >= ${CHROMA_MIN} in the red (hue <40 or >340), amber (40 to 100) or green (100 to 175) range`, worst);
  }

  if (on('targets')) {
    const t = await A('targets');
    const small = t.filter((x) => (x.w < 47.5 || x.h < 47.5) && !x.inline);
    const inline = t.filter((x) => (x.w < 47.5 || x.h < 47.5) && x.inline);
    add(screen, theme, 'targets 48 px or more', small.length ? 'FAIL' : 'PASS', small.length ? `${small.length} of ${t.length} under 48 px: ` + small.slice(0, 5).map((x) => `${x.sel} "${x.name}" ${x.w}x${x.h}`).join(' | ') : `0 of ${t.length} targets under 48 px` + (inline.length ? ` (${inline.length} inline link(s) exempt under WCAG 2.2: ${inline.map((x) => x.name).join(', ')})` : ''), small);
  }

  if (on('angle')) {
    const label = T.angleLabel;
    const rows = await A('angles', label, 500);
    const measured = MEASURED_SCREENS.includes(screen);
    const own = rows.filter((r) => !(r.protocolValue && !measured));
    const exempt = rows.filter((r) => r.protocolValue && measured && /limit|target/i.test(r.text + ' '));
    const miss = own.filter((r) => !r.found && !r.protocolValue && !angleExemptByWording(r.full));
    const named = own.filter((r) => !r.found && !r.protocolValue && angleExemptByWording(r.full));
    if (rows.length === 0) add(screen, theme, 'angle label next to every angle', 'N/A', 'no angle number on this screen');
    else if (!measured) add(screen, theme, 'angle label next to every angle', 'INFO', `${rows.length} angle number(s), all on a screen of protocol values (not estimates): ` + rows.slice(0, 3).map((r) => r.text).join(', '));
    else add(screen, theme, 'angle label next to every angle', miss.length ? 'FAIL' : 'PASS', miss.length ? `${miss.length} of ${rows.length} without the text within 500 characters: ` + miss.slice(0, 4).map((r) => `${r.sel} "${r.text}"`).join(' | ') : `${rows.length} angle number(s), each with "${label}" in the same block (heuristic: nearest ancestor of up to 500 characters)` + (exempt.length ? `; ${exempt.length} protocol value(s) skipped` : '') + (named.length ? `; ${named.length} number(s) with a named source, surgeon or plan, not camera estimates: ` + named.map((r) => r.text).join(' | ') : ''), miss);
  }

  if (on('overflow')) {
    const o = await A('overflow');
    add(screen, theme, 'no sideways scroll', o.scrollW <= o.innerW + 1 ? 'PASS' : 'FAIL', `scrollWidth ${o.scrollW}, viewport ${o.innerW}`);
  }

  if (on('bar')) {
    const bars = (await A('bottomBar')).filter((b) => b.atBottom);
    const flow = FLOW_SCREENS.includes(screen) || screen.startsWith('offline-setup');
    if (bars.length === 0) add(screen, theme, 'bottom bar', flow ? 'PASS' : 'N/A', flow ? 'no bottom bar on a flow screen' : 'no bottom bar in this build');
    else {
      const names = bars[0].items.map((i) => i.text);
      const wrong = names.filter((n) => !T.navNames.includes(n));
      const smallItems = bars[0].items.filter((i) => i.h < 47.5 || i.w < 47.5);
      const sticky = ['fixed', 'sticky'].includes(bars[0].position);
      const bad = flow || wrong.length || names.length !== 3 || smallItems.length || !sticky;
      add(screen, theme, 'bottom bar', bad ? 'FAIL' : 'PASS', `${bars.length} bar(s), items [${names.join(', ')}], height ${bars[0].h}, position ${bars[0].position}` + (flow ? ' | a bar shows on a flow screen' : '') + (wrong.length ? ` | names not in ${JSON.stringify(T.navNames)}: ${wrong.join(', ')}` : '') + (smallItems.length ? ` | ${smallItems.length} item(s) under 48 px` : ''), bars);
    }
  }
}

const baseRec = (i, over = {}) => ({
  date: new Date(Date.UTC(2026, 6, 1) + i * 86400000 + 36000000).toISOString(),
  exercise: 'heel-slide', side: 'left', reps: 10 + (i % 5), peakFlexion: 50 + (i % 40), holdSeconds: null, topFlexion: null,
  marginDeg: 9, marginSource: MARGIN_SOURCE, view: 'side', nearLimit: 0, overLimit: 0, tooFast: 0, gaveWayPresses: 0, redFlagBlocks: 0,
  pain: i % 6, swelling: 'none', protocolId: 'example-protocol', phase: 1, schemaVersion: 1, ...over,
});
async function seed(page, records) {
  await page.evaluate(
    (recs) =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open('mpfl-rehab');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('sessions', 'readwrite');
          const st = tx.objectStore('sessions');
          st.clear();
          for (const r of recs) st.add(r);
          tx.oncomplete = () => { db.close(); resolve(); };
          tx.onerror = () => reject(tx.error);
        };
      }),
    records,
  );
}
async function openSessions(page) {
  await page.reload();
  await expectH1(page, T.h1.home);
  await clickNav(page, T.sessions);
  await expectH1(page, T.h1.sessions);
  await sleep(700);
}

async function toHome(page) {
  await page.goto(BASE + '/');
  await expectH1(page, T.h1.privacy);
  await page.getByRole('button', { name: T.understand }).click();
  await expectH1(page, T.h1.load);
}
async function loadExample(page) {
  await page.getByLabel(T.fileLabel).setInputFiles(EXAMPLE_FILE);
  await expectH1(page, T.h1.home);
}

async function mainStory(theme) {
  const browser = await launch();
  const { ctx, page, errors, foreign } = await context(browser, theme);
  const dark = theme === 'dark';
  const only = dark ? ['colour', 'banner', 'targets'] : null; // dark: colour, banner and targets only
  const skip = (screen, why) => add(screen, theme, 'screen reached', 'SKIP', why);
  try {
    // privacy
    await page.goto(BASE + '/');
    await expectH1(page, T.h1.privacy).catch(() => {});
    await audit(page, 'privacy', theme, { example: false, only });
    await page.getByRole('button', { name: T.understand }).click();
    await expectH1(page, T.h1.load);
    await audit(page, 'load', theme, { example: false, only });

    // load error: a bad file shows a named error and no data
    const e1 = await step('bad file', async () => {
      await page.getByLabel(T.fileLabel).setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{not json') });
      await page.getByRole('alert').first().waitFor({ timeout: 4000 });
    });
    if (e1) skip('load-error', e1);
    else await audit(page, 'load-error', theme, { example: false, only });

    // home with no session
    await loadExample(page);
    await sleep(500);
    await audit(page, 'home-no-sessions', theme, { only });

    // red flag gate is the first screen after Start. Browser Back never skips it.
    if (!dark && want('gate')) {
      const e = await step('gate', async () => {
        await page.getByRole('button', { name: T.startHeel }).click();
        await expectH1(page, T.h1.redflag);
      });
      add('redflag', theme, 'red-flag gate is the first screen after Start', e ? 'FAIL' : 'PASS', e || `after "${T.startHeel}" the h1 is "${T.h1.redflag}"; the Continue button is the only way on`);
      await audit(page, 'redflag', theme, { only });
      const cont = page.getByRole('button', { name: T.cont });
      add('redflag', theme, 'nothing is pre-ticked', (await page.locator('input[type=checkbox]:checked').count()) === 0 ? 'PASS' : 'FAIL', `${await page.locator('input[type=checkbox]:checked').count()} ticked box(es) at the start`);
      // direct reach: browser back and forward and reload must never land on Setup or Session
      await page.goBack().catch(() => {});
      await sleep(400);
      const afterBack = await h1(page);
      add('redflag', theme, 'browser Back does not open Setup or Session', /Set up the camera|Heel slide|Straight leg|Mini squat|Seated/.test(afterBack) ? 'FAIL' : 'PASS', `h1 after Back: "${afterBack}"`);
      // Back left the gate. Go through Start again, as a person does.
      if ((await h1(page)) !== T.h1.redflag) {
        await page.getByRole('button', { name: T.startHeel }).click().catch(() => {});
        await expectH1(page, T.h1.redflag).catch(() => {});
      }
      // tick one emergency item: blocked
      const tick = page.locator('input[type=checkbox]').first();
      if ((await page.locator('input[type=checkbox]').count()) > 0 && (await h1(page)) === T.h1.redflag) {
        await tick.check();
        await sleep(300);
        const disabled = await cont.isDisabled().catch(() => false);
        add('redflag', theme, 'a tick blocks Continue', disabled ? 'PASS' : 'FAIL', `Continue disabled after one tick: ${disabled}`);
        await audit(page, 'redflag-blocked', theme, { only });
        await page.getByRole('button', { name: T.backHome }).click();
        await expectH1(page, T.h1.home);
      } else skip('redflag-blocked', 'the gate screen was not on show after Back');
    }

    // to Setup, camera, no pose (fake camera shows no person)
    const e2 = await step('to setup', async () => {
      await page.getByRole('button', { name: T.startHeel }).click();
      await expectH1(page, T.h1.redflag);
      await page.getByRole('button', { name: T.cont }).click();
      await expectH1(page, T.h1.setup);
    });
    if (e2) skip('setup-guide', e2);
    else {
      await audit(page, 'setup-guide', theme, { only });
      await page.getByRole('button', { name: T.next }).click();
      await page.getByRole('button', { name: T.startCamera }).waitFor({ timeout: 6000 });
      await audit(page, 'setup-camera-before', theme, { only });
      await page.getByRole('button', { name: T.startCamera }).click();
      await page.getByTestId('instruction').waitFor({ timeout: 40000 }).catch(() => {});
      await sleep(2500);
      await audit(page, 'setup-camera-nopose', theme, { only });
      if (!dark && want('nopose')) {
        const txt = await page.locator('main').innerText().catch(() => '');
        const nopose = /not seen|person|in the view|no body|cannot see/i.test(txt);
        add('setup-camera-nopose', theme, 'no pose: the app says what it does not see', nopose ? 'PASS' : 'REVIEW', nopose ? 'text names the missing person or leg' : 'no text about a missing person was found; read the screenshot', txt.slice(0, 300));
        const g = await page.evaluate(() => window.__p.gum);
        add('setup-camera-nopose', theme, 'camera asked after a press only', 'INFO', `getUserMedia calls so far: ${g}`);
      }
      const e3 = await step('start exercise', async () => {
        await page.getByRole('button', { name: T.startExercise }).click({ timeout: 8000 });
        await expectH1(page, 'Heel slide');
      });
      if (e3) skip('session-nopose', e3);
      else {
        await sleep(2500);
        await audit(page, 'session-nopose', theme, { only });
        if (!dark) await sessionChecks(page, theme);
        // stop
        await page.getByRole('button', { name: /^\W*Stop$/ }).click();
        await expectH1(page, T.h1.summary);
        await sleep(500);
        await audit(page, 'summary', theme, { only });
        if (!dark) await painChecks(page, theme, browser);
        else {
          await page.getByLabel('7', { exact: true }).check().catch(() => {});
          await sleep(300);
          await audit(page, 'summary-pain7', theme, { only });
        }
        // save, then Home with one session
        const e4 = await step('save', async () => {
          await page.getByLabel('3', { exact: true }).check();
          await page.getByLabel('Some swelling').check();
          await page.getByRole('button', { name: T.save, exact: true }).click();
          await page.getByText('Session saved.').waitFor({ timeout: 4000 });
          await page.getByRole('button', { name: T.done }).click();
          await expectH1(page, T.h1.home);
        });
        if (e4) skip('home-one-session', e4);
        else {
          await sleep(500);
          await audit(page, 'home-one-session', theme, { only });
          await clickNav(page, T.sessions);
          await expectH1(page, T.h1.sessions);
          await sleep(800);
          await audit(page, 'dashboard-1', theme, { only });
          if (!dark) await chartChecks(page, 'dashboard-1', theme, 1);
        }
      }
    }

    // stale-data set on the sessions screen: none, 100, missing fields
    const sets = [
      ['dashboard-empty', []],
      ['dashboard-100', Array.from({ length: 100 }, (_, i) => baseRec(i, { exercise: i % 3 === 0 ? 'straight-leg-raise' : 'heel-slide' }))],
      ['dashboard-missing', [
        baseRec(0, { reps: null, peakFlexion: null, pain: undefined, swelling: undefined }),
        baseRec(1, { reps: null, peakFlexion: 165, exercise: 'straight-leg-raise', topFlexion: null }),
        baseRec(2, { repsPerSet: undefined, marginDeg: 9, pain: undefined }),
        baseRec(3, { peakFlexion: 70, pain: 4 }),
      ]],
    ];
    for (const [name, recs] of sets) {
      if (!want('states')) break;
      const e = await step(name, async () => {
        await page.goto(BASE + '/');
        await expectH1(page, T.h1.home).catch(async () => { throw new Error('home not reached after reload, h1 "' + (await h1(page)) + '"'); });
        await seed(page, recs);
        await openSessions(page);
      });
      if (e) { skip(name, e); continue; }
      const t0 = Date.now();
      await audit(page, name, theme, { only });
      if (!dark) await chartChecks(page, name, theme, recs.length, recs);
      if (!dark && name === 'dashboard-100') add(name, theme, 'audit time for 100 sessions', 'INFO', `${Date.now() - t0} ms for the whole check battery`);
    }

    // data and care team screens (with the 100 or missing sessions still stored)
    if (want('data')) {
      const e = await step('data', async () => {
        await page.goto(BASE + '/');
        await expectH1(page, T.h1.home);
        await clickNav(page, T.data);
        await expectH1(page, T.h1.data);
      });
      if (e) skip('data', e);
      else {
        await sleep(500);
        await audit(page, 'data', theme, { only });
        const e5 = await step('care team', async () => {
          await page.getByRole('button', { name: T.careTeam }).click();
          await sleep(1200);
        });
        if (e5) skip('clinician', e5);
        else await audit(page, 'clinician', theme, { only });
      }
    }
    const fo = foreign.length;
    if (!dark) add('(all screens)', theme, 'no request to another origin', fo ? 'FAIL' : 'PASS', fo ? foreign.slice(0, 3).join(', ') : '0 foreign requests during the main story');
    if (!dark) add('(all screens)', theme, 'no console error', errors.length ? 'REVIEW' : 'PASS', errors.length ? errors.slice(0, 3).join(' | ') : '0 console errors');
    const csp = await page.evaluate(() => window.__p.csp).catch(() => []);
    if (!dark) add('(all screens)', theme, 'no CSP violation', csp.length ? 'FAIL' : 'PASS', csp.length ? csp.slice(0, 2).join(' | ') : '0 violations');
  } catch (e) {
    add('(main story)', theme, 'story completed', 'FAIL', 'script error: ' + String(e.stack || e).split('\n').slice(0, 3).join(' / '));
  } finally {
    await ctx.close();
    await browser.close();
  }
}

async function sessionChecks(page, theme) {
  if (!want('session')) return;
  const A = (fn, ...a) => page.evaluate(([f, args]) => window.__audit[f](...args), [fn, a]);
  const osc0 = await page.evaluate(() => window.__p.osc);
  const seen = new Map();
  for (let i = 0; i < 6; i++) {
    const live = await page.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll('[role=alert], [role=status], [aria-live]')) {
        if (!window.__audit.deepVis(el)) continue;
        const t = (el.innerText || '').trim();
        if (t) out.push({ sel: window.__audit.sel(el), t: t.slice(0, 120) });
      }
      return out;
    });
    for (const l of live) seen.set(l.sel + ' | ' + l.t, (seen.get(l.sel + ' | ' + l.t) || 0) + 1);
    await sleep(1000);
  }
  const osc = (await page.evaluate(() => window.__p.osc)) - osc0;
  const texts = [...seen.keys()];
  const verdictish = texts.filter((t) => /in range|within range|\bgood\b|correct|well done|nice|great|perfect/i.test(t));
  add('session-nopose', theme, 'no sound without a limit event', osc === 0 ? 'PASS' : 'FAIL', `${osc} oscillator call(s) in 6 s with no pose and no rep`);
  add('session-nopose', theme, 'no praise or in-range text in live regions', verdictish.length ? 'FAIL' : 'PASS', verdictish.length ? verdictish.join(' | ') : `${texts.length} live text(s) seen, none praises or says in range: ` + texts.slice(0, 5).join(' | '), texts);
  const nums = await A('fontSizes');
  add('session-nopose', theme, 'live numbers 72 px or more (brief)', nums.length === 0 ? 'REVIEW' : nums.every((n) => n.px >= 72) ? 'PASS' : 'FAIL', nums.length ? nums.map((n) => `${n.sel} "${n.text}" ${n.px}px`).join(', ') : 'no live number element found by class name; read the screenshot', nums);
  const g = await A('gauges');
  if (!g.length) add('session-nopose', theme, 'ruler gauge and limit tick', 'N/A', 'no gauge in this build or no limit set');
  else {
    const bad = g.filter((x) => !x.hasLimit || /target|goal|reach/i.test(x.caption));
    add('session-nopose', theme, 'ruler gauge and limit tick', bad.length ? 'FAIL' : 'PASS', g.map((x) => `${x.sel}: limit tick ${x.hasLimit}, numeric labels [${x.numericLabels.join(', ')}], caption "${x.caption.replace(/\s+/g, ' ')}"`).join(' | '), g);
    const many = g.filter((x) => x.numericLabels.length > 3);
    if (many.length) add('session-nopose', theme, 'ruler has few numbers', 'REVIEW', many.map((x) => `${x.sel} has ${x.numericLabels.length} numeric labels`).join(', '));
  }
  // angle with no pose must show a placeholder, never a stale or invented number
  const ang = await page.evaluate(() => {
    const el = document.querySelector('.live-angle .v3-num b');
    return el ? el.innerText.trim() : null;
  });
  add('session-nopose', theme, 'no pose shows no angle number', ang === null ? 'REVIEW' : ang === '--' ? 'PASS' : 'FAIL', ang === null ? 'live angle element not found by class name' : `live angle text with no pose: "${ang}"`);
}

async function painChecks(page, theme, browser) {
  if (!want('pain')) return;
  const radios = page.locator('input[type=radio][name=pain]');
  const n = await radios.count();
  add('summary', theme, 'pain has 11 radios', n === 11 ? 'PASS' : 'FAIL', `${n} radio(s) named pain`);
  const checked = await page.locator('input[type=radio][name=pain]:checked').count();
  add('summary', theme, 'no pain value pre-selected', checked === 0 ? 'PASS' : 'FAIL', `${checked} checked at the start`);
  const measure = async (label) => {
    const rows = await page.evaluate(() => window.__audit.targets().filter((t) => t.group === 'pain'));
    const small = rows.filter((r) => r.w < 47.5 || r.h < 47.5);
    add('summary', theme, `pain targets 48 px (${label})`, rows.length === 0 ? 'FAIL' : small.length ? 'FAIL' : 'PASS', rows.length === 0 ? 'no pain targets found' : small.length ? `${small.length} of ${rows.length} under 48 px: ` + small.slice(0, 4).map((r) => `${r.name} ${r.w}x${r.h}`).join(', ') : `${rows.length} targets, smallest ${Math.min(...rows.map((r) => r.w))} x ${Math.min(...rows.map((r) => r.h))}`, rows);
  };
  await measure('390 x 844');
  await page.setViewportSize({ width: 360, height: 640 });
  await sleep(300);
  await measure('360 x 640');
  await page.setViewportSize({ width: 320, height: 640 });
  await sleep(300);
  await measure('320 x 640');
  await page.setViewportSize({ width: 390, height: 844 });
  await sleep(300);
  const pauseCount = () => page.getByText(T.pauseMessage).count();
  await page.getByLabel('6', { exact: true }).check();
  await sleep(300);
  const p6 = await pauseCount();
  await audit(page, 'summary-pain6', theme, { only: ['words', 'angle', 'colour'] });
  add('summary-pain6', theme, 'pain 6 shows no pause message', p6 === 0 ? 'PASS' : 'FAIL', `"${T.pauseMessage}" count: ${p6}`);
  await page.getByLabel('7', { exact: true }).check();
  await sleep(300);
  const p7 = await pauseCount();
  const alertOk = await page.getByRole('alert').filter({ hasText: T.pauseMessage }).count();
  add('summary-pain7', theme, 'pain 7 shows the pause message', p7 > 0 && alertOk > 0 ? 'PASS' : 'FAIL', `message count ${p7}, role=alert count ${alertOk}`);
  const where = await page.evaluate((m) => {
    const el = [...document.querySelectorAll('*')].find((e) => [...e.childNodes].some((c) => c.nodeType === 3 && c.textContent.includes(m)));
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: Math.round(r.top), bottom: Math.round(r.bottom), vh: innerHeight };
  }, T.pauseMessage);
  add('summary-pain7', theme, 'pause message is inside the first view', where && where.bottom <= where.vh ? 'PASS' : 'REVIEW', where ? `top ${where.top}, bottom ${where.bottom}, viewport ${where.vh}` : 'message not found');
  const shown = await page.evaluate(() => document.body.innerText.includes('This is a rule of the app. It is not a diagnosis.'));
  add('summary-pain7', theme, 'pause message says it is a rule, not a diagnosis', shown ? 'PASS' : 'FAIL', `text present: ${shown}`);
  await audit(page, 'summary-pain7', theme, {});
  await page.getByLabel('0', { exact: true }).check();
  await sleep(250);
  const p0 = await pauseCount();
  add('summary-pain7', theme, 'pause message follows the live answer (back to 0)', p0 === 0 ? 'PASS' : 'FAIL', `count after choosing 0: ${p0}`);
  void browser;
}

async function chartChecks(page, screen, theme, count, recs) {
  if (!want('charts')) return;
  const charts = await page.evaluate(() => window.__audit.charts());
  if (recs && recs.length === 0) {
    add(screen, theme, 'empty state: no chart, no invented number', charts.some((c) => c.hasChart) ? 'FAIL' : 'PASS', `${charts.filter((c) => c.hasChart).length} chart(s) drawn with no session`);
    const txt = await page.locator('main').innerText().catch(() => '');
    add(screen, theme, 'empty state tells what to do', /no sessions yet/i.test(txt) ? 'PASS' : 'REVIEW', txt.replace(/\s+/g, ' ').slice(0, 160));
    return;
  }
  if (charts.length === 0) return add(screen, theme, 'charts found', 'FAIL', `0 chart sections on a screen with ${count} session(s)`);
  add(screen, theme, 'charts found', 'INFO', charts.map((c) => `"${c.title.slice(0, 40)}" lines ${c.lines} bars ${c.bars} dots ${c.dots} rows ${c.tableRows}`).join(' | '));
  for (const c of charts) {
    const id = `"${c.title.slice(0, 38)}"`;
    add(screen, theme, `chart ${id}: one y axis (no dual axis)`, c.yAxes <= 1 && c.yAxesRight === 0 ? 'PASS' : 'FAIL', `y axes ${c.yAxes}, right-hand ${c.yAxesRight}`);
    // series colour: distinct stroke or fill of the data marks
    const colour = (m) => (m.cls.includes('area') ? null : m.cls.includes('line-curve') || m.cls.includes('dots') ? m.stroke : m.fill);
    const used = [...new Set(c.marks.map(colour).filter((x) => x && x !== 'none'))];
    const sCount = c.lines + c.bars > 0 ? 1 : 0;
    add(screen, theme, `chart ${id}: one series colour`, used.length <= 1 ? 'PASS' : 'REVIEW', `${used.length} distinct mark colour(s): ${used.join(' ; ') || 'none'} (${sCount} series expected)`);
    add(screen, theme, `chart ${id}: table view exists`, c.hasTable ? 'PASS' : 'FAIL', c.hasTable ? `table with columns [${c.tableHead.join(', ')}] and ${c.tableRows} row(s)` : 'no table');
    const hasX = c.labels.length >= 1 && c.xAxes >= 1;
    add(screen, theme, `chart ${id}: axis labels`, c.labels.length >= 2 ? 'PASS' : 'FAIL', `axis labels: [${c.labels.join(', ')}], x axes ${c.xAxes}`);
    void hasX;
    add(screen, theme, `chart ${id}: no number on every point`, c.dataLabels === 0 ? 'PASS' : c.dots > 0 && c.dataLabels >= c.dots ? 'FAIL' : 'REVIEW', `${c.dataLabels} data label(s) for ${c.dots + c.bars} mark(s)`);
    add(screen, theme, `chart ${id}: no goal or target line`, c.refLines === 0 ? 'PASS' : 'FAIL', `${c.refLines} reference element(s)`);
    add(screen, theme, `chart ${id}: legend only when 2 or more series`, c.legend && sCount < 2 ? 'REVIEW' : 'PASS', `legend present: ${c.legend}, series: ${sCount}`);
    const plotted = c.dots + c.bars; // a one-point line has no curve path, only a dot
    const valuedRows = c.tableValues.filter((v) => v && v !== 'no value' && !/could not read/i.test(v));
    const zeroRows = valuedRows.filter((v) => /^0 reps/.test(v)).length; // a zero-height bar draws nothing
    const ok = plotted <= valuedRows.length && plotted >= valuedRows.length - zeroRows;
    add(screen, theme, `chart ${id}: chart and table hold the same points`, ok ? 'PASS' : 'FAIL', `${plotted} plotted mark(s), ${valuedRows.length} table row(s) with a value (${zeroRows} of them zero), ${c.tableRows} row(s) in all`);
    if (/degrees/.test(c.title)) {
      add(screen, theme, `chart ${id}: camera error band with its caption`, c.areas > 0 || /Camera error/.test(c.note) ? 'PASS' : 'FAIL', `band areas ${c.areas}; caption "${c.note}"`);
      add(screen, theme, `chart ${id}: title holds the angle label`, c.title.includes(T.angleLabel) ? 'PASS' : 'FAIL', c.title);
    }
  }
}

async function offlineStory(theme) {
  if (!want('offline')) return;
  const browser = await launch();
  const { ctx, page } = await context(browser, theme);
  try {
    await toHome(page);
    await loadExample(page);
    await sleep(500);
    await ctx.setOffline(true);
    await clickNav(page, T.sessions).catch(() => {});
    await sleep(2500);
    const t = await page.locator('main, body').first().innerText().catch(() => '');
    const h = await h1(page);
    add('offline-dashboard', theme, 'offline: the screen shows content or a named error', t.trim().length > 20 ? 'INFO' : 'FAIL', `h1 "${h}", text: ${t.replace(/\s+/g, ' ').slice(0, 200)}`);
    await audit(page, 'offline-dashboard', theme, {});
    await ctx.setOffline(false);
    await page.reload().catch(() => {});
    await expectH1(page, T.h1.home).catch(() => {});
    await page.getByRole('button', { name: T.startHeel }).click().catch(() => {});
    await expectH1(page, T.h1.redflag).catch(() => {});
    await page.getByRole('button', { name: T.cont }).click().catch(() => {});
    await expectH1(page, T.h1.setup).catch(() => {});
    await page.getByRole('button', { name: T.next }).click().catch(() => {});
    await page.getByRole('button', { name: T.startCamera }).waitFor({ timeout: 6000 }).catch(() => {});
    await ctx.setOffline(true);
    await page.getByRole('button', { name: T.startCamera }).click().catch(() => {});
    let msg = '';
    for (let i = 0; i < 40 && !msg; i++) {
      await sleep(500);
      msg = await page.evaluate(() => [...document.querySelectorAll('[role=alert]')].map((e) => e.innerText.trim()).filter(Boolean).join(' | '));
    }
    const body = await page.locator('main').innerText().catch(() => '');
    add('offline-setup-camera', theme, 'offline model load: a visible message within 20 s', msg ? 'PASS' : /could not|failed|try again|offline|error|longer than usual/i.test(body) ? 'PASS' : 'REVIEW', msg ? msg.slice(0, 200) : 'no alert; page text: ' + body.replace(/\s+/g, ' ').slice(0, 220));
    await audit(page, 'offline-setup-camera', theme, {});
  } catch (e) {
    add('(offline story)', theme, 'story completed', 'SKIP', String(e.message || e).slice(0, 160));
  } finally {
    await ctx.close();
    await browser.close();
  }
}

async function cameraStory(kind, theme) {
  const name = kind === 'denied' ? 'camera-denied' : 'camera-none';
  if (!want(name)) return;
  const browser = await launch(kind === 'denied' ? { fakeDevice: true, fakeUi: false } : { fakeDevice: false, fakeUi: true });
  const { ctx, page } = await context(browser, theme);
  // A real denial needs a person to press Block. The stub gives the exact error that the browser gives then.
  if (kind === 'denied') await ctx.addInitScript(() => { navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError')); });
  try {
    await toHome(page);
    await loadExample(page);
    await page.getByRole('button', { name: T.startHeel }).click();
    await expectH1(page, T.h1.redflag);
    await page.getByRole('button', { name: T.cont }).click();
    await expectH1(page, T.h1.setup);
    await page.getByRole('button', { name: T.next }).click();
    await page.getByRole('button', { name: T.startCamera }).click({ timeout: 6000 });
    let msg = '';
    for (let i = 0; i < 30 && !msg; i++) {
      await sleep(500);
      msg = await page.evaluate(() => [...document.querySelectorAll('[role=alert], [role=status]')].map((e) => e.innerText.trim()).filter(Boolean).join(' | '));
      if (/camera|blocked|allow|permission|found/i.test(msg) === false) msg = '';
    }
    const retry = await page.getByRole('button', { name: /try again/i }).count();
    add(name, theme, `${kind === 'denied' ? 'camera denied' : 'no camera'}: a plain message and a retry button`, msg && retry > 0 ? 'PASS' : msg ? 'REVIEW' : 'FAIL', msg ? `message "${msg.slice(0, 200)}", retry buttons ${retry}` : 'no message about the camera after 15 s');
    await audit(page, name, theme, {});
  } catch (e) {
    add(name, theme, 'story completed', 'SKIP', String(e.message || e).slice(0, 160));
  } finally {
    await ctx.close();
    await browser.close();
  }
}

async function onboardingStory(theme) {
  if (!want('onboarding')) return;
  const browser = await launch();
  const { ctx, page } = await context(browser, theme);
  try {
    await toHome(page);
    await page.getByRole('button', { name: T.createPlan }).click();
    await sleep(1000);
    await audit(page, 'onboarding', theme, { example: false });
    await page.goto(BASE + '/');
  } catch (e) {
    add('onboarding', theme, 'screen reached', 'SKIP', String(e.message || e).slice(0, 160));
  } finally {
    await ctx.close();
    await browser.close();
  }
}

async function clipStory(theme) {
  if (!CLIP) return;
  if (!existsSync(CLIP)) return add('session-clip', theme, 'clip file', 'SKIP', `file not found: ${CLIP}`);
  const browser = await launch({ clip: CLIP });
  const { ctx, page } = await context(browser, theme);
  try {
    await toHome(page);
    await loadExample(page);
    await page.getByRole('button', { name: T.startHeel }).click();
    await expectH1(page, T.h1.redflag);
    await page.getByRole('button', { name: T.cont }).click();
    await expectH1(page, T.h1.setup);
    await page.getByRole('button', { name: T.next }).click();
    await page.getByRole('button', { name: T.startCamera }).click({ timeout: 6000 });
    await page.getByTestId('instruction').waitFor({ timeout: 40000 }).catch(() => {});
    await sleep(3000);
    await page.getByRole('button', { name: T.startExercise }).click({ timeout: 10000 });
    await expectH1(page, 'Heel slide');
    const log = [];
    for (let i = 0; i < 40; i++) {
      const row = await page.evaluate(() => {
        const live = [...document.querySelectorAll('[role=alert], [role=status]')].filter((e) => window.__audit.deepVis(e)).map((e) => e.innerText.trim()).filter(Boolean);
        const reps = document.querySelector('.live-reps .v3-num b');
        const ang = document.querySelector('.live-angle .v3-num b');
        return { osc: window.__p.osc, reps: reps ? reps.innerText.trim() : null, angle: ang ? ang.innerText.trim() : null, live };
      });
      log.push({ t: i, ...row });
      await sleep(750);
    }
    const repSteps = log.filter((r, i) => i > 0 && r.reps !== null && log[i - 1].reps !== r.reps);
    const quietReps = repSteps.filter((r) => {
      const i = log.indexOf(r);
      const win = log.slice(Math.max(0, i - 1), i + 2);
      return win.every((w) => w.osc === win[0].osc) && win.every((w) => w.live.filter((x) => !/^\d+$/.test(x)).length === 0);
    });
    add('session-clip', theme, 'clip run: reps counted, cues and sound per rep', 'INFO', `${repSteps.length} rep step(s); ${quietReps.length} with no new cue text and no new sound; total oscillator calls ${log[log.length - 1].osc}`, log);
    const allLive = [...new Set(log.flatMap((l) => l.live))];
    const praise = allLive.filter((t) => /in range|within range|good|correct|well done|great|nice|perfect/i.test(t));
    add('session-clip', theme, 'clip run: no praise or in-range text', praise.length ? 'FAIL' : 'PASS', praise.length ? praise.join(' | ') : `live texts seen: ${allLive.slice(0, 6).join(' | ') || 'none'}`);
    await audit(page, 'session-clip', theme, {});
  } catch (e) {
    add('session-clip', theme, 'story completed', 'SKIP', String(e.message || e).slice(0, 160));
  } finally {
    await ctx.close();
    await browser.close();
  }
}

function staticPass(src) {
  const res = (c, s, d) => add('(source)', '-', c, s, d);
  try {
    const out = execFileSync('bash', [path.join(APP_ROOT, 'scripts/claims-check.sh'), src], { encoding: 'utf8' });
    res('claims-check.sh on source', out.includes('claims-check: ok') ? 'PASS' : 'FAIL', out.trim().split('\n').slice(-2).join(' / '));
  } catch (e) {
    res('claims-check.sh on source', 'FAIL', String(e.stdout || e.message).trim().split('\n').slice(-4).join(' / ').slice(0, 300));
  }
  try {
    const out = execFileSync('grep', ['-rnoiE', '--include=*.tsx', '--include=*.ts', '--include=*.svg', "name=[\"'{](award|trophy|medal|flame|star|party-popper|crown|thumbs-up|thumbs-down|smile|frown|sparkles|rocket|target|crosshair|flag-triangle|badge-check)[\"'}]", src], { encoding: 'utf8' });
    res('no reward or verdict icon in source', 'FAIL', out.trim().split('\n').slice(0, 5).join(' | '));
  } catch (e) {
    res('no reward or verdict icon in source', e.status === 1 ? 'PASS' : 'SKIP', e.status === 1 ? '0 icon names from the banned list' : String(e.message).slice(0, 120));
  }
  try {
    const out = execFileSync('grep', ['-rnE', '--include=*.tsx', '--include=*.ts', 'range-slider|type=.range.|<input[^>]*type="range"', src], { encoding: 'utf8' });
    res('no range input (pain stays 11 radios)', 'REVIEW', out.trim().split('\n').slice(0, 3).join(' | '));
  } catch (e) {
    res('no range input (pain stays 11 radios)', e.status === 1 ? 'PASS' : 'SKIP', e.status === 1 ? '0 range inputs' : String(e.message).slice(0, 120));
  }
}


async function selftest() {
  const browser = await launch();
  const { ctx, page } = await context(browser, 'light');
  const html = `<!doctype html><title>t</title><body>
  <p style="color:#1a9a3a">Good job. Goal reached. 3 day streak. Score 90%. NaN</p>
  <p style="background:#d93025;color:#fff">red box</p><p style="color:#f5a623">amber text</p>
  <button style="width:30px;height:30px">x</button>
  <p>Angle 45 degrees</p>
  <nav style="position:fixed;left:0;right:0;bottom:0;height:56px"><a href="#">Home</a><a href="#">Progress</a><a href="#">My data</a><a href="#">Extra</a></nav>
  <section aria-labelledby="c"><h2 id="c">Chart without table</h2><div class="recharts-wrapper"><svg><g class="recharts-yAxis"></g><g class="recharts-yAxis"></g><g class="recharts-reference-line"></g></svg></div></section>
  <div class="badge">Gold badge</div></body>`;
  await page.goto('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  await audit(page, 'session-nopose', 'light', { example: true });
  await chartChecks(page, 'selftest-chart', 'light', 3, undefined);
  // Rule self-test: the angle rule must still FAIL a bare camera angle, and PASS a sourced number or a surgeon number.
  const ruleCases = [
    ['bare camera angle, no label', 'Peak knee bend: 84 degrees.', true],
    ['camera angle in a sentence with no source word', 'Your knee reached 84 degrees. Keep going.', true],
    ['source id S1', 'S1 lists knee flexion greater than 110 degrees. Source: S1.', false],
    ['source id P2 in a quote', 'P2 lists, for its phase: "less than or equal to 10 degrees of extensor lag".', false],
    ['surgeon limit', 'Your surgeon limit is 60 degrees. This is lower than 110 degrees.', false],
    ['limit in your plan', 'Limit in your plan: 90 degrees.', false],
    ['your care team', 'Your care team sets 60 degrees.', false],
    ['source id in ANOTHER sentence must not exempt', 'Peak knee bend: 84 degrees. S1 is a guideline.', true],
  ];
  let ruleBad = 0;
  for (const [name, text, mustFail] of ruleCases) {
    const fails = !angleExemptByWording(text);
    const ok = fails === mustFail;
    console.log(`${ok ? 'ok    ' : 'WRONG '} rule case (${mustFail ? 'must FAIL' : 'must PASS'}): ${name}`);
    if (!ok) ruleBad++;
  }
  // The same cases through the page check, on a measured screen.
  for (const [name, text, mustFail] of ruleCases.slice(0, 5)) {
    const n0 = results.length;
    await page.goto('data:text/html;charset=utf-8,' + encodeURIComponent(`<!doctype html><title>t</title><body><main><p>${text}</p></main></body>`));
    await audit(page, 'session-nopose', 'light', { example: true, only: ['angle'] });
    const r = results.slice(n0).find((x) => x.check === 'angle label next to every angle');
    const ok = r && (r.status === 'FAIL') === mustFail;
    console.log(`${ok ? 'ok    ' : 'WRONG '} page rule case (${mustFail ? 'must FAIL' : 'must PASS'}): ${name} -> ${r && r.status}`);
    if (!ok) ruleBad++;
  }
  const expectFail = ['prototype banner visible', 'example banner visible', 'no verdict word', 'no score, grade, streak', 'no NaN', 'no green, red or amber', 'targets 48 px', 'angle label next to every angle', 'bottom bar', 'one y axis', 'table view exists', 'no goal or target line'];
  let missed = 0;
  for (const e of expectFail) {
    const hit = results.find((r) => r.check.includes(e) && r.status === 'FAIL');
    console.log(`${hit ? 'ok    ' : 'MISSED'} must FAIL: ${e}${hit ? ' | ' + hit.detail.slice(0, 110) : ''}`);
    if (!hit) missed++;
  }
  await ctx.close();
  await browser.close();
  console.log(missed || ruleBad ? `SELFTEST BROKEN: ${missed} fault(s) not caught, ${ruleBad} angle rule case(s) wrong` : `SELFTEST OK: all ${expectFail.length} known faults caught, all ${ruleCases.length + 5} angle rule cases right`);
  process.exit(missed || ruleBad ? 1 : 0);
}

async function newScreensStory(theme) {
  const MS = (readFileSync(path.join(APP_ROOT, 'src/lib/margin.ts'), 'utf8').match(/MARGIN_SOURCE(?::\s*\w+)?\s*=\s*'([^']+)'/) || [])[1];
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const press = (page, name) => page.getByRole('button', { name, exact: true }).click();
  const radio = (page, name) => page.getByRole('radio', { name, exact: true }).check();
  const VPS = [{ width: 360, height: 640 }, { width: 1280, height: 800 }];
  for (const [kind, extra] of [['home', null], ['check-none', {}], ['check-event', { gaveWayPresses: 1 }]]) {
    const browser = await launch();
    const { ctx, page, errors, foreign } = await context(browser, theme, VPS[0]);
    try {
      await page.goto(BASE + '/');
      await expectH1(page, T.h1.privacy);
      await page.getByRole('button', { name: T.understand }).click();
      await expectH1(page, T.h1.load);
      await press(page, 'Create my plan');
      await expectH1(page, 'You and your surgery');
      const pick = (q, a) => page.getByRole('group', { name: q }).getByRole('radio', { name: a, exact: true }).check();
      await pick('Did your care team give you a written rehab plan?', 'No');
      await pick('Which operation did you have?', 'MPFL reconstruction only');
      await pick('How old are you?', '18 or older');
      await pick('Did you have surgery on both knees?', 'No');
      await pick('Is this your first MPFL surgery on this knee?', 'Yes');
      await pick('Did your surgeon give special rules, for example about the graft, the fixation or the shape of your knee?', 'No');
      await press(page, 'Continue to your surgeon');
      const [yy, mm, dd] = iso(new Date(Date.now() - 24 * 86400000)).split('-');
      await page.getByLabel('Day', { exact: true }).fill(String(Number(dd)));
      await page.getByLabel('Month', { exact: true }).fill(String(Number(mm)));
      await page.getByLabel('Year', { exact: true }).fill(yy);
      await pick('Which knee did you have surgery on?', 'Left');
      await pick('Did your surgeon give a limit for how far you can bend your knee, also with a brace?', 'Yes, my limit is');
      await page.getByLabel('Limit in degrees').fill('60');
      await press(page, 'Continue to today');
      await radio(page, '2'); await radio(page, 'No swelling'); await press(page, 'Check my answers');
      await expectH1(page, 'Check your answers');
      await press(page, 'Make my plan'); await expectH1(page, 'Your plan');
      await press(page, 'Use this plan'); await expectH1(page, 'Confirm your plan');
      await press(page, 'Confirm'); await expectH1(page, T.h1.home);
      const raw = await page.evaluate(() => new Promise((res, rej) => { const o = indexedDB.open('mpfl-rehab'); o.onerror = () => rej(o.error); o.onsuccess = () => { const db = o.result; const g = db.transaction('protocol').objectStore('protocol').getAll(); g.onsuccess = () => { db.close(); res(g.result[0].raw); }; }; }));
      const protocolId = JSON.parse(raw).id;
      const row = { date: new Date().toISOString(), exercise: 'heel-slide', side: 'left', reps: 8, peakFlexion: 84, holdSeconds: null, topFlexion: null, marginDeg: 9, marginSource: MS, view: 'side', nearLimit: 0, overLimit: 0, tooFast: 0, gaveWayPresses: 0, redFlagBlocks: 0, pain: 2, swelling: 'none', protocolId, phase: 1, schemaVersion: 1, ...(extra || {}) };
      await page.evaluate((r) => new Promise((res, rej) => { const o = indexedDB.open('mpfl-rehab'); o.onerror = () => rej(o.error); o.onsuccess = () => { const db = o.result; const tx = db.transaction('sessions', 'readwrite'); tx.objectStore('sessions').add(r); tx.oncomplete = () => { db.close(); res(); }; tx.onerror = () => rej(tx.error); }; }), row);
      await page.clock.setFixedTime(new Date(Date.now() + 32 * 86400000));
      await page.reload();
      await expectH1(page, T.h1.home);
      await page.getByText(/^Last session: /).first().waitFor({ timeout: 8000 });
      if (kind !== 'home') {
        await page.getByRole('button', { name: 'Check my progress' }).first().click();
        await expectH1(page, 'Check my progress');
        await page.getByRole('heading', { level: 2 }).first().waitFor();
        if (kind === 'check-event') await page.getByText('Safety events since your plan date').waitFor({ timeout: 4000 });
      }
      await sleep(500);
      for (const vp of VPS) {
        await page.setViewportSize(vp);
        await sleep(300);
        const name = `new-${kind}-${vp.width}`;
        await audit(page, name, theme, { example: false });
        await page.screenshot({ path: path.join(OUT, `${name}-${theme}.png`), fullPage: true }).catch(() => {});
        add(name, theme, 'text of the screen (for the report)', 'INFO', (await page.locator('main, #root').first().innerText()).replace(/\s+/g, ' ').slice(0, 1500));
      }
      add(`new-${kind}`, theme, 'no console error, foreign request', errors.length || foreign.length ? 'REVIEW' : 'PASS', errors.length || foreign.length ? [...errors, ...foreign].slice(0, 3).join(' | ') : '0 console errors, 0 foreign requests');
    } catch (e) {
      add(`new-${kind}`, theme, 'story completed', 'FAIL', 'script error: ' + String(e.stack || e).split('\n').slice(0, 3).join(' / '));
    } finally {
      await ctx.close();
      await browser.close();
    }
  }
}

(async () => {
  if (SELFTEST) return selftest();
  const t0 = Date.now();
  try {
    const head = await fetch(BASE + '/').catch((e) => ({ ok: false, status: String(e.message) }));
    if (!head.ok) throw new Error(`BASE_URL ${BASE} does not answer (${head.status})`);
    for (const theme of THEMES) await mainStory(theme);
    for (const theme of THEMES) await newScreensStory(theme);
    const th = THEMES.includes('light') ? 'light' : THEMES[0];
    await offlineStory(th);
    await cameraStory('denied', th);
    await cameraStory('none', th);
    await onboardingStory(th);
    await clipStory(th);
    if (SRC) staticPass(path.resolve(SRC));
  } catch (e) {
    console.error('audit broke:', e.message);
    writeFileSync(path.join(OUT, 'honesty-audit.json'), JSON.stringify({ base: BASE, error: String(e.message), results }, null, 1));
    process.exit(2);
  }
  writeFileSync(path.join(OUT, 'honesty-audit.json'), JSON.stringify({ base: BASE, date: new Date().toISOString(), seconds: Math.round((Date.now() - t0) / 1000), results }, null, 1));
  const order = { FAIL: 0, REVIEW: 1, SKIP: 2, INFO: 3, 'N/A': 4, PASS: 5 };
  const counts = {};
  for (const r of results) counts[r.status] = (counts[r.status] || 0) + 1;
  const line = (r) => `${r.status.padEnd(6)} ${r.theme.padEnd(5)} ${r.screen} | ${r.check} | ${r.detail}`;
  console.log(`\nHONESTY AUDIT ${BASE}   ${Math.round((Date.now() - t0) / 1000)} s   ${results.length} results`);
  console.log(Object.entries(counts).map(([k, v]) => `${k} ${v}`).join('   '));
  for (const r of [...results].sort((a, b) => order[a.status] - order[b.status])) if (r.status !== 'PASS' && r.status !== 'N/A') console.log(line(r));
  console.log(`\n(${counts.PASS || 0} PASS and ${counts['N/A'] || 0} N/A lines are in the JSON file: ${path.join(OUT, 'honesty-audit.json')})`);
  process.exit(counts.FAIL ? 1 : 0);
})();
