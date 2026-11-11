// Text at 200 percent (root font size 200 percent) at 390 x 844. On each screen:
// no sideways scroll, no word broken inside, no clipped box, no button whose text leaves the button,
// and a sticky bar takes at most 40 percent of the height (a taller bar sits at the end of the content).
import { expect, test, type Page } from '@playwright/test';
import { expectScreen, toHome, toLoad, toSummary } from './helpers/app';

test.use({ viewport: { width: 390, height: 844 } });

const press = (page: Page, name: string) => page.getByRole('button', { name, exact: true }).click();
const radio = (page: Page, name: string) => page.getByRole('radio', { name, exact: true }).check();
const dateAgo = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

async function toUpdatePlan(page: Page) {
  await toLoad(page);
  await press(page, 'Create my plan');
  for (const a of ['No', 'MPFL reconstruction only', '18 or older', 'No', 'Yes', 'No']) {
    await radio(page, a);
    await press(page, 'Next');
  }
  await page.getByLabel('Date of surgery').fill(dateAgo(24));
  await press(page, 'Next');
  await radio(page, 'Left');
  await press(page, 'Next');
  await radio(page, 'Yes, my limit is');
  await page.getByLabel('Limit in degrees').fill('60');
  await press(page, 'Next');
  await press(page, 'Next');
  await radio(page, '2');
  await radio(page, 'No swelling');
  await press(page, 'Next');
  await press(page, 'Make my plan');
  await press(page, 'Use this plan');
  await press(page, 'Confirm');
  await expectScreen(page, 'Home');
  await press(page, 'Update my plan');
  await expectScreen(page, 'Update my plan');
}

async function checkZoom(page: Page) {
  await page.evaluate(() => document.documentElement.style.setProperty('font-size', '200%', 'important'));
  await page.waitForTimeout(500);
  const r = await page.evaluate(() => {
    const out = { scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth, broken: [] as string[], clipped: [] as string[], buttons: [] as string[], bars: [] as string[] };
    // A word that spans more than one line box is a word that broke inside.
    const walker = document.createTreeWalker(document.querySelector('main') ?? document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const parent = n.parentElement;
      if (!parent || getComputedStyle(parent).visibility === 'hidden' || parent.closest('.visually-hidden, [aria-hidden="true"]')) continue;
      const text = n.textContent ?? '';
      for (const m of text.matchAll(/\S{4,}/g)) {
        const range = document.createRange();
        range.setStart(n, m.index!);
        range.setEnd(n, m.index! + m[0].length);
        const tops = new Set([...range.getClientRects()].filter((q) => q.width > 0).map((q) => Math.round(q.top)));
        if (tops.size > 1) out.broken.push(m[0]);
      }
    }
    for (const el of document.querySelectorAll<HTMLElement>('body *')) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || el.clientWidth <= 1) continue;
      const clips = ['hidden', 'clip'].includes(cs.overflowX) || ['hidden', 'clip'].includes(cs.overflowY);
      if (clips && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1) && !el.matches('video, canvas, svg, .frame, .figure, .fig')) out.clipped.push(`${el.tagName}.${el.className} ${el.scrollWidth}x${el.scrollHeight} in ${el.clientWidth}x${el.clientHeight}`);
    }
    for (const b of document.querySelectorAll<HTMLElement>('button, a.btn')) {
      if (b.scrollWidth > b.clientWidth + 1) out.buttons.push(`${b.textContent?.trim().slice(0, 30)} ${b.scrollWidth} > ${b.clientWidth}`);
      // A button label of more than 3 lines means the button is too narrow.
      const fs = parseFloat(getComputedStyle(b).fontSize);
      if (b.getBoundingClientRect().height > fs * 1.25 * 3 + 40) out.buttons.push(`${b.textContent?.trim().slice(0, 30)} is ${Math.round(b.getBoundingClientRect().height)} px high`);
    }
    for (const bar of document.querySelectorAll<HTMLElement>('.action-bar, .session-bar, .bottom-nav')) {
      const pos = getComputedStyle(bar).position;
      const h = bar.getBoundingClientRect().height;
      if (['sticky', 'fixed'].includes(pos) && h > window.innerHeight * 0.4 + 1 && !bar.hasAttribute('data-blocked')) out.bars.push(`${bar.className} ${Math.round(h)} px`);
    }
    return out;
  });
  expect(r.scrollW, 'no sideways scroll').toBeLessThanOrEqual(r.innerW);
  expect(r.broken, `words broken inside: ${r.broken.join(', ')}`).toEqual([]);
  expect(r.clipped, `clipped boxes: ${r.clipped.join(' | ')}`).toEqual([]);
  expect(r.buttons, `button text leaves the button: ${r.buttons.join(' | ')}`).toEqual([]);
  expect(r.bars, `sticky bars over 40 percent: ${r.bars.join(' | ')}`).toEqual([]);
}

test('Summary at 200 percent text', async ({ page }) => {
  await toSummary(page);
  await checkZoom(page);
});

test('Update my plan at 200 percent text', async ({ page }) => {
  await toUpdatePlan(page);
  await checkZoom(page);
});

test('Referral (no plan from the app) at 200 percent text', async ({ page }) => {
  await toLoad(page);
  await press(page, 'Create my plan');
  await radio(page, 'Yes');
  await press(page, 'Next');
  await expectScreen(page, 'No plan from the app');
  await checkZoom(page);
});

test('the phone as second camera at 200 percent text', async ({ page }) => {
  await toHome(page);
  await page.getByRole('button', { name: 'Use this phone as the second camera' }).click();
  await page.locator('main h1').first().waitFor({ state: 'visible' });
  await checkZoom(page);
});
