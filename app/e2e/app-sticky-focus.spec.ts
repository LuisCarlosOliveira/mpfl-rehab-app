// A control that gets keyboard focus must scroll fully above a sticky or fixed bar (WCAG 2.2 focus not obscured).
// The page ties scroll-padding-bottom to the real height of the bar, so it holds at every size and at 200 percent text.
import { expect, test, type Page } from '@playwright/test';
import { toRedFlag, toSession, toSetupGuide, toSummary } from './helpers/app';

const SIZES = [
  { width: 390, height: 844 },
  { width: 360, height: 640 },
  { width: 320, height: 568 },
];

/** Tab through the page. After each stop, the focused control must end above the top of every bar that sticks to the bottom. */
async function tabAllAboveBar(page: Page, max = 60) {
  const bad: string[] = [];
  let stops = 0;
  for (let i = 0; i < max; i += 1) {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(40);
    const r = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const bars = [...document.querySelectorAll('.action-bar, .session-bar, .bottom-nav')].filter((b) => ['sticky', 'fixed'].includes(getComputedStyle(b).position));
      if (bars.some((b) => b.contains(el))) return { inBar: true };
      // A custom control is often a hidden input in a label. The box that the person sees is the label or the row.
      const box = (el.closest('label, .choice, .scale-item, .seg-cell') ?? el).getBoundingClientRect();
      const top = Math.min(...bars.map((b) => b.getBoundingClientRect().top), window.innerHeight);
      return { inBar: false, bottom: Math.round(box.bottom), top: Math.round(top), tooTall: box.height > top - 8, inputTop: Math.round(el.getBoundingClientRect().top), inputBottom: Math.round(el.getBoundingClientRect().bottom), what: `${el.tagName}.${el.className}:${(el.textContent ?? '').slice(0, 24)}` };
    });
    if (r === null) continue;
    stops += 1;
    // A row taller than the free height cannot end above the bar. Then the control itself must be in view.
    if (!r.inBar && r.bottom! > r.top! + 0.5 && !(r.tooTall && r.inputTop! >= -0.5 && r.inputBottom! <= r.top! + 0.5)) bad.push(`${r.what} ends at ${r.bottom}, bar starts at ${r.top}`);
  }
  expect(stops, 'the Tab run reached controls').toBeGreaterThan(2);
  expect(bad, bad.join('\n')).toEqual([]);
}

async function zoom200(page: Page) {
  await page.evaluate(() => document.documentElement.style.setProperty('font-size', '200%', 'important'));
  await page.waitForTimeout(300); // the bar height is measured in the next frame
}

for (const size of SIZES) {
  for (const big of [false, true]) {
    test.describe(`focus above the bar at ${size.width} x ${size.height}, text ${big ? 200 : 100} percent`, () => {
      test.use({ viewport: size });

      test('Red flag: every tick row', async ({ page }) => {
        await toRedFlag(page);
        if (big) await zoom200(page);
        await tabAllAboveBar(page);
      });

      test('Setup guide', async ({ page }) => {
        await toSetupGuide(page);
        if (big) await zoom200(page);
        await tabAllAboveBar(page);
      });

      test('Summary', async ({ page }) => {
        await toSummary(page);
        if (big) await zoom200(page);
        await tabAllAboveBar(page);
      });

      test('Session', async ({ page }) => {
        await toSession(page);
        if (big) await zoom200(page);
        await tabAllAboveBar(page, 20);
      });
    });
  }
}
