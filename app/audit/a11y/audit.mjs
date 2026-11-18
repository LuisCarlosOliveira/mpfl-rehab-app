#!/usr/bin/env node
// Accessibility and responsive audit for the MPFL rehab app. Needs no new dependency.
// It loads Playwright and axe-core from the app folder (APP_DIR).
//
// Usage:
//   BASE_URL=http://127.0.0.1:4471 LABEL=baseline node audit.mjs
//   Options: ONLY="Home|Session" (screen names, separated by |), QUICK=1 (1280 and 390 light only),
//            OUT=<folder> (default: a temp folder), APP_DIR=<app folder, default: two folders up>, CONCURRENCY=2
// Output: <OUT>/audit-<LABEL>.json and <OUT>/audit-<LABEL>.md
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP_DIR = resolve(process.env.APP_DIR ?? join(HERE, '../..'));
const req = createRequire(join(APP_DIR, 'package.json'));
const { chromium } = req('playwright');
const AxeBuilder = req('@axe-core/playwright').default ?? req('@axe-core/playwright');

const BASE_URL = (process.env.BASE_URL ?? '').replace(/\/$/, '');
if (!BASE_URL) throw new Error('Set BASE_URL, for example BASE_URL=http://127.0.0.1:4471');
const LABEL = process.env.LABEL ?? 'run';
const OUT = resolve(process.env.OUT ?? join(tmpdir(), 'mpfl-audit-a11y'));
const ONLY = process.env.ONLY ? process.env.ONLY.split('|').map((s) => s.trim()) : null;
const QUICK = process.env.QUICK === '1';
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 2);
const EXAMPLE = join(APP_DIR, 'src/lib/protocol/example-protocol.json');
const BAD_FILE = join(OUT, 'uiaudit-bad-protocol.json');
mkdirSync(OUT, { recursive: true });
writeFileSync(BAD_FILE, '{"not":"a protocol"}');
const ORIGIN = new URL(BASE_URL).origin;

// ---------------------------------------------------------------- navigation helpers
const h1 = (page) => page.getByRole('heading', { level: 1 });
const expectH1 = async (page, name, timeout = 15000) => {
  await h1(page).filter({ hasText: name }).first().waitFor({ state: 'visible', timeout });
};
const press = (page, name) => page.getByRole('button', { name, exact: true }).click();
const radio = (page, name) => page.getByRole('radio', { name, exact: true }).check();
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const ago = (days) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return iso(d);
};

async function toPrivacy(page) {
  await page.goto('/');
  await expectH1(page, 'Privacy');
}
async function toLoad(page) {
  await toPrivacy(page);
  await page.getByRole('button', { name: 'I understand' }).click();
  await expectH1(page, 'Load protocol file');
}
async function toHome(page) {
  await toLoad(page);
  await page.getByLabel('Choose a file from your care team').setInputFiles(EXAMPLE);
  await expectH1(page, 'Home');
}
async function toRedFlag(page) {
  await toHome(page);
  await page.getByRole('button', { name: 'Start Heel slide' }).click();
  await expectH1(page, 'Check before you exercise');
}
async function toSetupGuide(page) {
  await toRedFlag(page);
  await page.getByRole('button', { name: 'None of these apply. Continue' }).click();
  await expectH1(page, 'Set up the camera');
}
async function toSetupCamera(page) {
  await toSetupGuide(page);
  await page.getByRole('button', { name: 'Next: set up the camera' }).click();
  await page.getByRole('button', { name: 'Start camera' }).waitFor({ state: 'visible' });
}
async function startCamera(page) {
  await page.getByRole('button', { name: 'Start camera' }).click();
  await page.getByTestId('instruction').waitFor({ state: 'visible', timeout: 30000 });
}
async function toSession(page) {
  await toSetupCamera(page);
  await startCamera(page);
  await page.getByRole('button', { name: 'Start exercise' }).click();
  await expectH1(page, 'Heel slide');
}
async function toSummary(page) {
  await toSession(page);
  await page.getByRole('button', { name: /^\W*Stop$/ }).click();
  await expectH1(page, 'Summary');
}
async function saveOneSession(page) {
  await toSummary(page);
  await page.getByLabel('3', { exact: true }).check();
  await page.getByLabel('Some swelling').check();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByText('Session saved.').waitFor();
  await page.getByRole('button', { name: 'Done' }).click();
  await expectH1(page, 'Home');
}
async function referralQuestions(page) {
  await expectH1(page, 'Did your care team give you a written rehab plan?');
  for (const a of ['No', 'MPFL reconstruction only', '18 or older', 'No', 'Yes', 'No']) {
    await radio(page, a);
    await press(page, 'Next');
  }
}
async function toQuestionsDate(page) {
  await toLoad(page);
  await press(page, 'Create my plan');
  await referralQuestions(page);
}
async function toCheckAnswers(page) {
  await toQuestionsDate(page);
  await page.getByLabel('Date of surgery').fill(ago(24));
  await press(page, 'Next');
  await radio(page, 'Left');
  await press(page, 'Next');
  await radio(page, 'Yes, my limit is');
  await page.getByLabel('Limit in degrees').fill('60');
  await press(page, 'Next');
  await press(page, 'Next'); // red flags: none ticked
  await radio(page, '2');
  await radio(page, 'No swelling');
  await press(page, 'Next');
  await expectH1(page, 'Check your answers');
}
async function toPlan(page) {
  await toCheckAnswers(page);
  await press(page, 'Make my plan');
  await expectH1(page, 'Your plan');
}
async function toConfirm(page) {
  await toPlan(page);
  await press(page, 'Use this plan');
  await expectH1(page, 'Confirm your plan');
}
async function toHomeWithPlan(page) {
  await toConfirm(page);
  await press(page, 'Confirm');
  await expectH1(page, 'Home');
}

// ---- auditnew: plan made by the app at week 8, seeded session, fixed clock (as app/e2e/progress.spec.ts does) ----
import { readFileSync } from 'node:fs';
const MARGIN_SOURCE = (readFileSync(join(APP_DIR, 'src/lib/margin.ts'), 'utf8').match(/MARGIN_SOURCE\s*=\s*'([^']+)'/) || [])[1];
const WEEK8_SHIFT_DAYS = 32; // plan starts in week 3 (24 days); 24 + 32 = 56 days is week 8
async function seedSessionNew(page, extra = {}) {
  const raw = await page.evaluate(() => new Promise((res, rej) => { const o = indexedDB.open('mpfl-rehab'); o.onerror = () => rej(o.error); o.onsuccess = () => { const db = o.result; const g = db.transaction('protocol').objectStore('protocol').getAll(); g.onsuccess = () => { db.close(); res(g.result[0].raw); }; }; }));
  const protocolId = JSON.parse(raw).id;
  const row = { date: new Date().toISOString(), exercise: 'heel-slide', side: 'left', reps: 8, peakFlexion: 84, holdSeconds: null, topFlexion: null, marginDeg: 9, marginSource: MARGIN_SOURCE, view: 'side', nearLimit: 0, overLimit: 0, tooFast: 0, gaveWayPresses: 0, redFlagBlocks: 0, pain: 2, swelling: 'none', protocolId, phase: 1, schemaVersion: 1, ...extra };
  await page.evaluate((r) => new Promise((res, rej) => { const o = indexedDB.open('mpfl-rehab'); o.onerror = () => rej(o.error); o.onsuccess = () => { const db = o.result; const tx = db.transaction('sessions', 'readwrite'); tx.objectStore('sessions').add(r); tx.oncomplete = () => { db.close(); res(); }; tx.onerror = () => rej(tx.error); }; }), row);
}
async function toWeek8Home(page, extra = {}) {
  await toHomeWithPlan(page);
  await seedSessionNew(page, extra);
  await page.clock.setFixedTime(new Date(Date.now() + WEEK8_SHIFT_DAYS * 86_400_000));
  await page.reload();
  await expectH1(page, 'Home');
  await page.getByText(/^Last session: /).first().waitFor({ state: 'visible', timeout: 8000 });
}
async function toCheckNew(page, extra = {}) {
  await toWeek8Home(page, extra);
  await page.getByRole('button', { name: 'Check my progress' }).first().click();
  await expectH1(page, 'Check my progress');
  await page.getByRole('heading', { level: 2 }).first().waitFor({ state: 'visible' });
}

/** Each screen: name, go(page). `expectFail` marks a screen that fails a request on purpose. */
export const SCREENS = [
  { name: 'NEW Home, plan by the app, week 8, phase 1', go: toWeek8Home },
  { name: 'NEW Check my progress, no event', go: (p) => toCheckNew(p) },
  { name: 'NEW Check my progress, safety event', go: async (p) => { await toCheckNew(p, { gaveWayPresses: 1 }); await p.getByText('Safety events since your plan date').waitFor({ state: 'visible' }); } },
  { name: 'Privacy', go: toPrivacy },
  { name: 'Load protocol', go: toLoad },
  {
    name: 'Load error (file refused)',
    go: async (p) => {
      await toLoad(p);
      await p.getByLabel('Choose a file from your care team').setInputFiles(BAD_FILE);
      await p.getByRole('alert').first().waitFor({ state: 'visible' });
    },
  },
  { name: 'Home', go: toHome },
  { name: 'Red flag', go: toRedFlag },
  {
    name: 'Red flag, blocked',
    go: async (p) => {
      await toRedFlag(p);
      await p.getByLabel('Sudden shortness of breath or chest pain.').check();
      await p.getByText('Stop. Do not exercise. Call emergency services now.').waitFor();
    },
  },
  { name: 'Setup, position guide', go: toSetupGuide },
  { name: 'Setup, camera step', go: toSetupCamera },
  {
    name: 'Setup, camera running',
    go: async (p) => {
      await toSetupCamera(p);
      await startCamera(p);
    },
  },
  { name: 'Session', go: toSession },
  { name: 'Summary', go: toSummary },
  {
    name: 'Summary, pause message',
    go: async (p) => {
      await toSummary(p);
      await p.getByLabel('7', { exact: true }).check();
      await p.getByLabel('More than before').check();
      await p.getByText('Pause and contact your care team.').waitFor();
    },
  },
  {
    name: 'Your sessions',
    go: async (p) => {
      await saveOneSession(p);
      await p.getByRole('button', { name: 'Your sessions' }).click();
      await expectH1(p, 'Your sessions');
      await p.locator('.dash-chart-box svg').first().waitFor({ state: 'visible' });
    },
  },
  {
    name: 'My data',
    go: async (p) => {
      await saveOneSession(p);
      await p.getByRole('button', { name: 'My data' }).click();
      await expectH1(p, 'My data');
    },
  },
  {
    name: 'Care team view',
    go: async (p) => {
      await toHome(p);
      await p.getByRole('button', { name: 'My data' }).click();
      await expectH1(p, 'My data');
      await p.getByRole('button', { name: 'Open a session file (care team)' }).click();
      await expectH1(p, 'Care team view');
    },
  },
  {
    name: 'Second camera (phone)',
    go: async (p) => {
      await toHome(p);
      await p.getByRole('button', { name: 'Use this phone as the second camera' }).click();
      await p.locator('main h1').first().waitFor({ state: 'visible' });
    },
  },
  {
    name: 'Generator, question 1',
    go: async (p) => {
      await toLoad(p);
      await press(p, 'Create my plan');
      await expectH1(p, 'Did your care team give you a written rehab plan?');
    },
  },
  {
    name: 'Generator, referral (no plan)',
    go: async (p) => {
      await toLoad(p);
      await press(p, 'Create my plan');
      await radio(p, 'Yes');
      await press(p, 'Next');
      await expectH1(p, 'No plan from the app');
    },
  },
  { name: 'Generator, date question', go: async (p) => { await toQuestionsDate(p); await expectH1(p, 'What was the date of your surgery?'); } },
  {
    name: 'Generator, limit question',
    go: async (p) => {
      await toQuestionsDate(p);
      await p.getByLabel('Date of surgery').fill(ago(24));
      await press(p, 'Next');
      await radio(p, 'Left');
      await press(p, 'Next');
      await radio(p, 'Yes, my limit is');
    },
  },
  { name: 'Generator, check answers', go: toCheckAnswers },
  { name: 'Generator, your plan', go: toPlan },
  { name: 'Generator, confirm plan', go: toConfirm },
  {
    name: 'Update my plan',
    go: async (p) => {
      await toHomeWithPlan(p);
      await press(p, 'Update my plan');
      await expectH1(p, 'Update my plan');
    },
  },
  {
    name: 'Error screen (chunk fails)',
    expectFail: true,
    go: async (p) => {
      await p.route(/\/assets\/Dashboard-[^/]*\.js/, (r) => r.abort());
      await toHome(p);
      await p.getByRole('button', { name: 'Your sessions' }).click();
      await expectH1(p, 'Screen not loaded');
    },
  },
];

// ---------------------------------------------------------------- measurement code that runs in the page
function inPageMarkControls() {
  const all = [...document.querySelectorAll('button, a[href], input, select, textarea, summary, [role="button"], [tabindex="0"]')];
  const controls = all.filter((el) => {
    if (el.disabled || el.getAttribute('tabindex') === '-1') return false;
    const box = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || (box.width === 0 && box.height === 0)) return false;
    // Inside a closed details only its own summary takes focus. Nested closed details hide the inner summaries too.
    for (let a = el.parentElement; a; a = a.parentElement) {
      if (a.tagName === 'DETAILS' && !a.open && !(el.tagName === 'SUMMARY' && el.parentElement === a)) return false;
    }
    if (el instanceof HTMLInputElement && el.type === 'radio') {
      const group = [...document.querySelectorAll(`input[type="radio"][name="${CSS.escape(el.name)}"]`)];
      return el === (group.find((r) => r.checked) ?? group[0]);
    }
    return true;
  });
  document.querySelectorAll('[data-uiaudit]').forEach((e) => e.removeAttribute('data-uiaudit'));
  controls.forEach((el, i) => el.setAttribute('data-uiaudit', String(i)));
  return controls.length;
}

function inPageStop() {
  const el = document.activeElement;
  if (!el || el === document.body) return { index: -1, tag: 'body' };
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  const name = (el.getAttribute('aria-label') || el.labels?.[0]?.textContent || el.textContent || el.value || el.id || '').replace(/\s+/g, ' ').trim().slice(0, 50);
  const outlineOn = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0 && !/rgba?\(\s*0,\s*0,\s*0,\s*0\s*\)|transparent/.test(cs.outlineColor);
  const shadowOn = cs.boxShadow !== 'none';
  return {
    index: Number(el.getAttribute('data-uiaudit') ?? -1),
    tag: el.tagName.toLowerCase(),
    type: el.type || '',
    name,
    outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor} offset ${cs.outlineOffset}`,
    ring: outlineOn ? 'outline' : shadowOn ? 'box-shadow' : 'none',
    focusVisible: el.matches(':focus-visible'),
    inView: r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth,
  };
}

function inPageContrast() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 1;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  const parse = (c) => {
    const m = /^rgba?\(([^)]+)\)$/.exec(c.trim());
    if (m) {
      const p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat);
      return [p[0], p[1], p[2], p[3] === undefined ? 1 : p[3]];
    }
    cx.clearRect(0, 0, 1, 1);
    cx.fillStyle = '#000';
    cx.fillStyle = c;
    cx.fillRect(0, 0, 1, 1);
    const d = cx.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2], d[3] / 255];
  };
  const lum = ([r, g, b]) => {
    const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const sel = (el) => {
    let s = el.tagName.toLowerCase();
    if (el.id) s += `#${el.id}`;
    else if (el.classList.length) s += `.${[...el.classList].slice(0, 2).join('.')}`;
    return s;
  };
  const pairs = new Map();
  let checked = 0;
  let unknown = 0;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const text = node.textContent.trim();
    const el = node.parentElement;
    if (!text || !el || /^(SCRIPT|STYLE|NOSCRIPT)$/.test(el.tagName)) continue;
    const box = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (box.width === 0 || box.height === 0 || cs.visibility === 'hidden' || cs.display === 'none') continue;
    let op = 1;
    const layers = [];
    let hasImage = false;
    for (let e = el; e; e = e.parentElement) {
      const s = getComputedStyle(e);
      op *= parseFloat(s.opacity);
      if (s.backgroundImage !== 'none') {
        hasImage = true;
        break;
      }
      const bg = parse(s.backgroundColor);
      if (bg[3] > 0) {
        layers.push(bg);
        if (bg[3] >= 1) break;
      }
    }
    checked += 1;
    if (hasImage) {
      unknown += 1;
      continue;
    }
    let base = [255, 255, 255];
    for (const l of layers.reverse()) base = base.map((v, i) => v * (1 - l[3]) + l[i] * l[3]);
    const fg = parse(cs.color);
    const a = fg[3] * op;
    const fgc = [0, 1, 2].map((i) => fg[i] * a + base[i] * (1 - a));
    const L1 = lum(fgc);
    const L2 = lum(base);
    const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const px = parseFloat(cs.fontSize);
    const large = px >= 24 || (px >= 18.66 && parseInt(cs.fontWeight, 10) >= 700);
    const need = large ? 3 : 4.5;
    const disabled = !!el.closest('[disabled], [aria-disabled="true"]');
    const key = `${fgc.map(Math.round)}|${base.map(Math.round)}|${large}|${disabled}`;
    const hit = pairs.get(key) ?? { fg: `rgb(${fgc.map(Math.round)})`, bg: `rgb(${base.map(Math.round)})`, ratio: Math.round(ratio * 100) / 100, need, large, disabled, count: 0, samples: [] };
    hit.count += 1;
    if (hit.samples.length < 3) hit.samples.push(`${sel(el)}: ${text.slice(0, 40)}`);
    pairs.set(key, hit);
  }
  const all = [...pairs.values()];
  const fails = all.filter((p) => p.ratio < p.need && !p.disabled);
  return { textNodes: checked, unknownBackground: unknown, pairs: all.length, minRatio: all.length ? Math.min(...all.map((p) => p.ratio)) : null, fails, pairsList: all.sort((a, b) => a.ratio - b.ratio).slice(0, 8) };
}

function inPageTaps() {
  const small = [];
  let total = 0;
  const sel = (el) => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : el.classList.length ? '.' + [...el.classList].slice(0, 2).join('.') : ''}`;
  const seen = new Set();
  const els = document.querySelectorAll('button, a[href], input, select, textarea, summary, [role="button"]');
  for (const el of els) {
    const cs = getComputedStyle(el);
    let box = el.getBoundingClientRect();
    let target = el;
    if (el instanceof HTMLInputElement && (el.type === 'radio' || el.type === 'checkbox' || el.type === 'file')) {
      const label = el.labels?.[0];
      const lb = label?.getBoundingClientRect();
      // The tap area is the larger of the control and its label. A hidden native control counts through its label.
      if (lb && lb.width * lb.height >= box.width * box.height) {
        box = lb;
        target = label;
      }
    }
    if (el.disabled || (box.width === 0 && box.height === 0) || cs.visibility === 'hidden' || cs.display === 'none') continue;
    if (seen.has(target)) continue;
    seen.add(target);
    total += 1;
    if (box.width < 47.5 || box.height < 47.5) {
      small.push({ el: sel(el), name: (el.getAttribute('aria-label') || el.textContent || el.value || '').replace(/\s+/g, ' ').trim().slice(0, 40), w: Math.round(box.width), h: Math.round(box.height) });
    }
  }
  return { total, small };
}

function inPageLayout() {
  const vw = window.innerWidth;
  const de = document.documentElement;
  const sel = (el) => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : el.classList.length ? '.' + [...el.classList].slice(0, 2).join('.') : ''}`;
  const clippedByAncestor = (el) => {
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const s = getComputedStyle(a);
      if (s.overflowX !== 'visible') return true;
    }
    return false;
  };
  const offenders = [];
  const clipped = [];
  for (const el of document.body.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (r.width === 0 || r.height === 0 || cs.visibility === 'hidden' || cs.display === 'none') continue;
    if ((r.right > vw + 1 || r.left < -1) && !clippedByAncestor(el) && cs.position !== 'fixed') {
      if (offenders.length < 12) offenders.push({ el: sel(el), left: Math.round(r.left), right: Math.round(r.right) });
    }
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (hasText) {
      const hiddenX = cs.overflowX === 'hidden' || cs.overflowX === 'clip';
      const hiddenY = cs.overflowY === 'hidden' || cs.overflowY === 'clip';
      if (el.clientWidth <= 1 && el.clientHeight <= 1) continue; // visually-hidden text, hidden on purpose
      if ((hiddenX && el.scrollWidth > el.clientWidth + 1) || (hiddenY && el.scrollHeight > el.clientHeight + 1)) {
        if (clipped.length < 12) clipped.push({ el: sel(el), text: el.textContent.trim().slice(0, 40), scroll: `${el.scrollWidth}x${el.scrollHeight}`, client: `${el.clientWidth}x${el.clientHeight}`, ellipsis: cs.textOverflow === 'ellipsis' });
      }
    }
  }
  return { viewport: vw, docScrollWidth: de.scrollWidth, bodyScrollWidth: document.body.scrollWidth, horizontalScroll: Math.max(de.scrollWidth, document.body.scrollWidth) > vw + 1, offenders, clipped };
}

function inPageMotion() {
  const sel = (el) => (el ? `${el.tagName.toLowerCase()}${el.classList.length ? '.' + [...el.classList].slice(0, 2).join('.') : ''}` : '?');
  const anims = document.getAnimations().map((a) => {
    const kf = a.effect?.getKeyframes?.() ?? [];
    const props = new Set();
    kf.forEach((k) => Object.keys(k).forEach((p) => !['offset', 'easing', 'composite', 'computedOffset'].includes(p) && props.add(p)));
    return { el: sel(a.effect?.target), kind: a.constructor.name, name: a.animationName ?? a.transitionProperty ?? '', state: a.playState, props: [...props] };
  });
  const transform = anims.filter((a) => a.props.some((p) => /transform|translate|scale|rotate/i.test(p)));
  let transformTransitions = 0;
  let animatedElements = 0;
  for (const el of document.body.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    if (cs.animationName !== 'none' && parseFloat(cs.animationDuration) > 0) animatedElements += 1;
    if (/transform|all/.test(cs.transitionProperty) && parseFloat(cs.transitionDuration) > 0 && !/transform:\s*none/.test('')) transformTransitions += 1;
  }
  let mediaRule = false;
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) if (rule.media && /prefers-reduced-motion/.test(rule.media.mediaText)) mediaRule = true;
    } catch {
      /* cross-origin sheet */
    }
  }
  return { running: anims.length, transformAnimations: transform.length, transform: transform.slice(0, 6), cssAnimatedElements: animatedElements, elementsWithTransformTransition: transformTransitions, hasReducedMotionRule: mediaRule, smoothScroll: getComputedStyle(document.documentElement).scrollBehavior === 'smooth' };
}

// ---------------------------------------------------------------- one run on one screen
const SCHEMES = ['light', 'dark'];
const VPS = [
  { w: 1280, h: 800 },
  { w: 390, h: 844 },
  { w: 360, h: 640 },
];
const argsFake = ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'];

async function newPage(browser, vp, scheme, reducedMotion, sink, tag, expectFail) {
  const ctx = await browser.newContext({ baseURL: BASE_URL, viewport: { width: vp.w, height: vp.h }, colorScheme: scheme, reducedMotion, permissions: ['camera'] });
  const page = await ctx.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().startsWith('INFO: ')) sink.console.push({ tag, text: m.text().slice(0, 200), intentional: !!expectFail });
  });
  page.on('pageerror', (e) => sink.console.push({ tag, text: `pageerror: ${e.message.slice(0, 200)}`, intentional: !!expectFail }));
  page.on('requestfailed', (r) => sink.failed.push({ tag, url: r.url(), reason: r.failure()?.errorText, intentional: !!expectFail }));
  page.on('response', (r) => {
    if (r.status() >= 400) sink.failed.push({ tag, url: r.url(), reason: `HTTP ${r.status()}`, intentional: !!expectFail });
  });
  page.on('request', (r) => {
    const u = r.url();
    if (/^(data|blob):/.test(u)) return;
    if (new URL(u).origin !== ORIGIN) sink.foreign.push({ tag, url: u });
  });
  return { ctx, page };
}

async function tabAudit(page) {
  const count = await page.evaluate(inPageMarkControls);
  await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
  const reached = new Set();
  const stops = [];
  const noRing = [];
  const notVisible = [];
  const dateOnly = [];
  let run = 0;
  let last = null;
  let trap = false;
  for (let i = 0; i < count * 7 + 3 && reached.size < count; i++) {
    await page.keyboard.press('Tab');
    const s = await page.evaluate(inPageStop);
    stops.push(`${s.index}:${s.tag}${s.type ? '/' + s.type : ''}:${s.name}`.slice(0, 50));
    if (s.index >= 0) {
      reached.add(s.index);
      if (s.ring === 'none' && /^(date|time|datetime-local|month|week)$/.test(s.type)) dateOnly.push(s.name);
      else if (s.ring === 'none') noRing.push(`${s.tag} ${s.name}`);
      else if (!s.inView) notVisible.push(`${s.tag} ${s.name}`);
    }
    run = s.index === last && s.index >= 0 ? run + 1 : 0;
    last = s.index;
    // A date input has up to 6 inner fields (day, month, year, picker). Tab moves between them on purpose.
    const limit = /^(date|time|datetime-local|month|week)$/.test(s.type) ? 7 : 2;
    if (run >= limit && count > 1) {
      trap = true;
      break;
    }
  }
  const missed = [...Array(count).keys()].filter((i) => !reached.has(i));
  // Backwards
  const backReached = new Set();
  for (let i = 0; i < count * 7 + 3 && backReached.size < count; i++) {
    await page.keyboard.press('Shift+Tab');
    const s = await page.evaluate(inPageStop);
    if (s.index >= 0) backReached.add(s.index);
  }
  const backMissed = [...Array(count).keys()].filter((i) => !backReached.has(i));
  // Escape: record only whether the screen changes. No rule says what it must do on every screen.
  const before = await page.locator('main h1').first().textContent().catch(() => null);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  const after = await page.locator('main h1').first().textContent().catch(() => null);
  return { stops: stops.slice(0, 40), controls: count, tabReached: reached.size, missed, backMissed, trap, noRing: [...new Set(noRing)], notInView: [...new Set(notVisible)], dateInputsWithBrowserFieldFocusOnly: [...new Set(dateOnly)], escapeChangedScreen: before !== after };
}

async function runScreen(browser, screen, sink, progress) {
  const res = { name: screen.name, axe: {}, contrast: {}, taps: null, layout: {}, zoom: {}, keyboard: null, motion: {}, errors: [] };
  const vps = QUICK ? VPS.slice(0, 2) : VPS;
  const schemes = QUICK ? ['light'] : SCHEMES;
  // Pass 1: axe, contrast, layout, taps, zoom (and the Tab run on 1280 light)
  for (const vp of vps) {
    for (const scheme of schemes) {
      const key = `${vp.w}x${vp.h}-${scheme}`;
      const tag = `${screen.name} @${key}`;
      const { ctx, page } = await newPage(browser, vp, scheme, 'no-preference', sink, tag, screen.expectFail);
      try {
        await screen.go(page);
        await page.waitForTimeout(400);
        const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']).analyze();
        res.axe[key] = axe.violations.map((v) => ({ id: v.id, impact: v.impact, tags: v.tags.filter((t) => /wcag\d|best/.test(t)), nodes: v.nodes.map((n) => n.target.join(' ')) }));
        res.contrast[key] = await page.evaluate(inPageContrast);
        if (scheme === 'light') {
          res.layout[vp.w] = await page.evaluate(inPageLayout);
          if (vp.w === 390) res.taps = await page.evaluate(inPageTaps);
          if (vp.w === 1280) res.keyboard = await tabAudit(page);
          if (vp.w === 390 || vp.w === 1280) {
            await page.evaluate(() => document.documentElement.style.setProperty('font-size', '200%', 'important'));
            await page.waitForTimeout(200);
            res.zoom[vp.w] = await page.evaluate(inPageLayout);
          }
        }
      } catch (e) {
        res.errors.push(`${key}: ${String(e.message).split('\n')[0]}`);
      } finally {
        await ctx.close();
      }
    }
  }
  // Pass 2: extra widths 320 and 768 (light) with zoom at 320
  if (!QUICK) {
    for (const w of [320, 768]) {
      const tag = `${screen.name} @${w}-light`;
      const { ctx, page } = await newPage(browser, { w, h: w === 768 ? 1024 : 640 }, 'light', 'no-preference', sink, tag, screen.expectFail);
      try {
        await screen.go(page);
        await page.waitForTimeout(300);
        res.layout[w] = await page.evaluate(inPageLayout);
        if (w === 320) {
          await page.evaluate(() => document.documentElement.style.setProperty('font-size', '200%', 'important'));
          await page.waitForTimeout(200);
          res.zoom[w] = await page.evaluate(inPageLayout);
        }
      } catch (e) {
        res.errors.push(`${w}: ${String(e.message).split('\n')[0]}`);
      } finally {
        await ctx.close();
      }
    }
  }
  // Pass 3: motion, reduced and normal, at 390
  for (const rm of ['reduce', 'no-preference']) {
    const tag = `${screen.name} @motion-${rm}`;
    const { ctx, page } = await newPage(browser, VPS[1], 'light', rm, sink, tag, screen.expectFail);
    try {
      await screen.go(page);
      // Sample right after the screen change, then once more, so a running transition shows.
      const a = await page.evaluate(inPageMotion);
      await page.waitForTimeout(120);
      const b = await page.evaluate(inPageMotion);
      res.motion[rm] = { first: a, second: b };
    } catch (e) {
      res.errors.push(`motion ${rm}: ${String(e.message).split('\n')[0]}`);
    } finally {
      await ctx.close();
    }
  }
  progress(screen.name);
  return res;
}

// ---------------------------------------------------------------- the keyboard-only journey
async function keyboardJourney(browser, sink) {
  const steps = [];
  const { ctx, page } = await newPage(browser, VPS[0], 'light', 'no-preference', sink, 'keyboard-journey');
  const nameRe = (src, flags = '') => ({ src, flags });
  const tabTo = async (m, max = 90) => {
    for (let i = 1; i <= max; i++) {
      await page.keyboard.press('Tab');
      const ok = await page.evaluate(({ src, flags }) => {
        const el = document.activeElement;
        if (!el) return false;
        const name = (el.getAttribute('aria-label') || el.labels?.[0]?.textContent || el.textContent || el.value || '').replace(/\s+/g, ' ').trim();
        return new RegExp(src, flags).test(name);
      }, m);
      if (ok) return i;
    }
    return -1;
  };
  const tabToRadio = async (m, group = 14) => {
    // Tab into the radio group, then move with the arrow keys to the wanted radio.
    for (let i = 1; i <= 90; i++) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => ({ radio: document.activeElement instanceof HTMLInputElement && document.activeElement.type === 'radio' }));
      if (info.radio) break;
      if (i === 90) return -1;
    }
    for (let j = 0; j < group; j++) {
      const ok = await page.evaluate(({ src, flags }) => {
        const el = document.activeElement;
        const name = (el.labels?.[0]?.textContent || '').replace(/\s+/g, ' ').trim();
        return new RegExp(src, flags).test(name);
      }, m);
      if (ok) return j;
      await page.keyboard.press('ArrowDown');
    }
    return -1;
  };
  const step = async (name, fn) => {
    try {
      const detail = await fn();
      steps.push({ step: name, ok: true, detail: detail ?? '' });
    } catch (e) {
      steps.push({ step: name, ok: false, detail: String(e.message).split('\n')[0] });
    }
  };
  const reach = async (label, m, key, then) => {
    await step(label, async () => {
      const n = await tabTo(m);
      if (n < 0) throw new Error('Tab did not reach the control');
      await page.keyboard.press(key);
      if (then) await then();
      return `${n} Tab presses, then ${key}`;
    });
  };
  const radioStep = async (label, m) => {
    await step(label, async () => {
      const n = await tabToRadio(m);
      if (n < 0) throw new Error('Tab and arrow keys did not reach the radio');
      await page.keyboard.press('Space');
      const checked = await page.evaluate(() => document.activeElement.checked);
      if (!checked) throw new Error('radio not checked after Space');
      return `${n} arrow presses`;
    });
  };
  try {
    await page.goto('/');
    await reach('Privacy: I understand with Enter', nameRe('^I understand$'), 'Enter', () => expectH1(page, 'Load protocol file', 8000));
    await step('Load: Tab reaches the file input or its label', async () => {
      const n = await tabTo(nameRe('Protocol file|\\.json', 'i'), 20);
      if (n < 0) throw new Error('file control not reached');
      return `${n} Tab presses (the file dialog itself cannot run headless: the file is set by Playwright)`;
    });
    await step('Load: set the example file (not by keyboard)', async () => {
      await page.getByLabel('Choose a file from your care team').setInputFiles(EXAMPLE);
      await expectH1(page, 'Home', 8000);
    });
    await reach('Home: Start Heel slide with Enter', nameRe('^Start Heel slide'), 'Enter', () => expectH1(page, 'Check before you exercise', 8000));
    await reach('Red flag: first checkbox with Space', nameRe('Sudden shortness of breath'), 'Space', async () => {
      await page.getByText('Stop. Do not exercise. Call emergency services now.').waitFor({ timeout: 4000 });
    });
    await step('Red flag: Escape does not trap or break the screen', async () => {
      await page.keyboard.press('Escape');
      await expectH1(page, 'Check before you exercise', 3000);
      return 'screen stays (Escape has no action here)';
    });
    // The block lasts for the whole visit by design, so leave and come back for a clean visit.
    await reach('Red flag: Back to Home with Enter', nameRe('^Back to Home'), 'Enter', () => expectH1(page, 'Home', 8000));
    await reach('Home: Start Heel slide again with Enter', nameRe('^Start Heel slide'), 'Enter', () => expectH1(page, 'Check before you exercise', 8000));
    await reach('Red flag: Continue with Enter', nameRe('^None of these apply'), 'Enter', () => expectH1(page, 'Set up the camera', 8000));
    await reach('Setup: Next with Enter', nameRe('^Next: set up the camera'), 'Enter', () => page.getByRole('button', { name: 'Start camera' }).waitFor({ timeout: 8000 }));
    await reach('Setup: Start camera with Enter', nameRe('^Start camera'), 'Enter', () => page.getByTestId('instruction').waitFor({ timeout: 30000 }));
    await reach('Setup: Start exercise with Enter', nameRe('^Start exercise'), 'Enter', () => expectH1(page, 'Heel slide', 10000));
    await step('Session: Escape does not stop or trap', async () => {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
      return `h1 after Escape: ${await page.locator('main h1').first().textContent()}`;
    });
    await reach('Session: Stop with Enter', nameRe('^\\W*Stop$'), 'Enter', () => expectH1(page, 'Summary', 8000));
    await radioStep('Summary: pain 3 by arrow keys and Space', nameRe('^3$'));
    await radioStep('Summary: swelling by arrow keys and Space', nameRe('Some swelling'));
    await reach('Summary: Save with Enter', nameRe('^Save$'), 'Enter', () => page.getByText('Session saved.').waitFor({ timeout: 8000 }));
    await reach('Summary: Done with Enter', nameRe('^Done$'), 'Enter', () => expectH1(page, 'Home', 8000));
    await reach('Home: My data with Enter', nameRe('My data'), 'Enter', () => expectH1(page, 'My data', 8000));
    await step('My data: Back button with Enter', async () => {
      const n = await tabTo(nameRe('^\\W*Back'), 40);
      if (n < 0) throw new Error('Back not reached');
      await page.keyboard.press('Enter');
      await expectH1(page, 'Home', 8000);
    });
    await reach('Home: Your sessions with Enter', nameRe('Your sessions'), 'Enter', () => expectH1(page, 'Your sessions', 10000));
    await step('Your sessions: browser Back returns Home', async () => {
      await page.goBack();
      await expectH1(page, 'Home', 5000);
    });
    await reach('Home: Your sessions again', nameRe('Your sessions'), 'Enter', () => expectH1(page, 'Your sessions', 10000));
    await step('Your sessions: Back button with Enter', async () => {
      const n = await tabTo(nameRe('^\\W*Back'), 40);
      if (n < 0) throw new Error('Back not reached');
      await page.keyboard.press('Enter');
      await expectH1(page, 'Home', 8000);
    });
    await step('Home: browser Back from a deep screen (Red flag) returns Home', async () => {
      const n = await tabTo(nameRe('^Start Heel slide'), 90);
      if (n < 0) throw new Error('Start not reached');
      await page.keyboard.press('Enter');
      await expectH1(page, 'Check before you exercise', 8000);
      await page.goBack();
      await expectH1(page, 'Home', 5000);
    });
  } catch (e) {
    steps.push({ step: 'journey aborted', ok: false, detail: String(e.message).split('\n')[0] });
  } finally {
    await ctx.close();
  }
  return steps;
}

// ---------------------------------------------------------------- main
async function main() {
  const t0 = Date.now();
  const browser = await chromium.launch({ args: argsFake });
  const sink = { console: [], failed: [], foreign: [] };
  const list = SCREENS.filter((s) => !ONLY || ONLY.includes(s.name));
  const results = [];
  const queue = [...list];
  let done = 0;
  const worker = async () => {
    while (queue.length) {
      const s = queue.shift();
      results.push(await runScreen(browser, s, sink, (n) => console.error(`[${++done}/${list.length}] ${n}`)));
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  const journey = ONLY ? [] : await keyboardJourney(browser, sink);
  await browser.close();
  results.sort((a, b) => list.findIndex((s) => s.name === a.name) - list.findIndex((s) => s.name === b.name));

  // Totals
  const uniq = (arr) => [...new Set(arr)];
  const totals = { screens: results.length, axeViolationNodes: 0, axeRules: [], axeWcagNodes: 0, contrastFailPairs: 0, contrastFailTextNodes: 0, smallTaps: 0, tapsChecked: 0, screensWithHorizontalScroll: 0, clippedItems: 0, zoomHorizontalScroll: 0, zoomClipped: 0, keyboardMissed: 0, keyboardNoRing: 0, keyboardTraps: 0, transformAnimsReduced: 0, transformAnimsNormal: 0, consoleErrors: sink.console.filter((c) => !c.intentional).length, intentionalConsoleErrors: sink.console.filter((c) => c.intentional).length, failedRequests: sink.failed.filter((f) => !f.intentional).length, intentionalFailedRequests: sink.failed.filter((f) => f.intentional).length, foreignRequests: sink.foreign.length, journeyFailed: journey.filter((s) => !s.ok).length, journeySteps: journey.length, runErrors: results.reduce((n, r) => n + r.errors.length, 0) };
  const rules = [];
  for (const r of results) {
    for (const v of Object.values(r.axe)) for (const x of v) {
      totals.axeViolationNodes += x.nodes.length;
      if (x.tags.some((t) => /^wcag/.test(t))) totals.axeWcagNodes += x.nodes.length;
      rules.push(x.id);
    }
    for (const c of Object.values(r.contrast)) {
      totals.contrastFailPairs += c.fails.length;
      totals.contrastFailTextNodes += c.fails.reduce((n, p) => n + p.count, 0);
    }
    if (r.taps) {
      totals.smallTaps += r.taps.small.length;
      totals.tapsChecked += r.taps.total;
    }
    if (Object.values(r.layout).some((l) => l.horizontalScroll)) totals.screensWithHorizontalScroll += 1;
    totals.clippedItems += Object.values(r.layout).reduce((n, l) => n + l.clipped.length, 0);
    if (Object.values(r.zoom).some((l) => l.horizontalScroll)) totals.zoomHorizontalScroll += 1;
    totals.zoomClipped += Object.values(r.zoom).reduce((n, l) => n + l.clipped.length, 0);
    if (r.keyboard) {
      totals.keyboardMissed += r.keyboard.missed.length + r.keyboard.backMissed.length;
      totals.keyboardNoRing += r.keyboard.noRing.length;
      if (r.keyboard.trap) totals.keyboardTraps += 1;
    }
    const m = r.motion;
    if (m.reduce) totals.transformAnimsReduced += Math.max(m.reduce.first.transformAnimations, m.reduce.second.transformAnimations);
    if (m['no-preference']) totals.transformAnimsNormal += Math.max(m['no-preference'].first.transformAnimations, m['no-preference'].second.transformAnimations);
  }
  totals.axeRules = Object.fromEntries(uniq(rules).map((id) => [id, rules.filter((x) => x === id).length]));

  const out = { label: LABEL, baseUrl: BASE_URL, date: new Date().toISOString(), seconds: Math.round((Date.now() - t0) / 1000), totals, journey, screens: results, console: sink.console.slice(0, 80), failedRequests: sink.failed.slice(0, 80), foreignRequests: sink.foreign.slice(0, 80) };
  writeFileSync(join(OUT, `audit-${LABEL}.json`), JSON.stringify(out, null, 1));

  // Markdown table
  const L = [];
  L.push(`# Audit ${LABEL}`, '', `URL ${BASE_URL}, ${out.date}, ${out.seconds} s.`, '');
  L.push('| Screen | axe nodes | axe rules | contrast fails | taps < 48 (390) | h-scroll widths | clipped | h-scroll at 200% | Tab missed | no ring | motion reduced / normal |', '|---|---|---|---|---|---|---|---|---|---|---|');
  for (const r of results) {
    const axeNodes = Object.values(r.axe).reduce((n, v) => n + v.reduce((m, x) => m + x.nodes.length, 0), 0);
    const axeRules = uniq(Object.values(r.axe).flatMap((v) => v.map((x) => x.id))).join(', ') || '-';
    const cf = Object.values(r.contrast).reduce((n, c) => n + c.fails.length, 0);
    const hs = Object.entries(r.layout).filter(([, l]) => l.horizontalScroll).map(([w]) => w).join(' ') || '-';
    const clip = Object.values(r.layout).reduce((n, l) => n + l.clipped.length, 0);
    const zs = Object.entries(r.zoom).filter(([, l]) => l.horizontalScroll).map(([w]) => w).join(' ') || '-';
    const k = r.keyboard;
    const mo = r.motion.reduce ? Math.max(r.motion.reduce.first.transformAnimations, r.motion.reduce.second.transformAnimations) : '?';
    const mn = r.motion['no-preference'] ? Math.max(r.motion['no-preference'].first.transformAnimations, r.motion['no-preference'].second.transformAnimations) : '?';
    L.push(`| ${r.name}${r.errors.length ? ' (RUN ERRORS)' : ''} | ${axeNodes} | ${axeRules} | ${cf} | ${r.taps ? r.taps.small.length + '/' + r.taps.total : '?'} | ${hs} | ${clip} | ${zs} | ${k ? k.missed.length + k.backMissed.length : '?'} | ${k ? k.noRing.length : '?'} | ${mo} / ${mn} |`);
  }
  L.push('', '## Totals', '', '```json', JSON.stringify(totals, null, 1), '```', '');
  L.push('## Keyboard journey', '', '| Step | Result | Detail |', '|---|---|---|');
  for (const s of journey) L.push(`| ${s.step} | ${s.ok ? 'ok' : 'FAIL'} | ${s.detail} |`);
  L.push('', '## Run errors', '');
  for (const r of results) for (const e of r.errors) L.push(`- ${r.name}: ${e}`);
  writeFileSync(join(OUT, `audit-${LABEL}.md`), L.join('\n'));
  console.log(JSON.stringify(totals, null, 1));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
