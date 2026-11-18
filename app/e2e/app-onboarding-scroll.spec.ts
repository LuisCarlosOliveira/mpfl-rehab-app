// AC5-01: each onboarding question opens at the top of the page. The prototype banner stays in view.
// The page is scrolled down before each Next, so a step that keeps the old scroll fails.
import { expect, test, type Page } from '@playwright/test';
import { expectScreen, installProbes, PROTOTYPE_BANNER, toLoad } from './helpers/app';
import { fillDate, pick, QUESTION } from './helpers/plan';

const ago = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const radio = (page: Page, name: string) => page.getByRole('radio', { name, exact: true }).check();

let steps = 0;
/** Scrolls down, presses the button that goes on, then asserts that the new step is at the top with the banner in view. */
async function next(page: Page, name: string) {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.getByRole('button', { name, exact: true }).click();
  steps += 1;
  await expect.poll(() => page.evaluate(() => document.activeElement?.tagName)).toBe('H1');
  const where = await page.evaluate(() => ({ y: window.scrollY, vh: window.innerHeight }));
  const banner = await page.getByText(PROTOTYPE_BANNER).first().evaluate((el) => el.getBoundingClientRect().top);
  const title = await page.getByRole('heading', { level: 1 }).innerText();
  expect(where.y, `page scroll after step ${steps} "${title}"`).toBe(0);
  expect(banner, `banner top after step ${steps} "${title}"`).toBeGreaterThanOrEqual(-1);
}

for (const size of [
  { width: 360, height: 640 },
  { width: 390, height: 844 },
]) {
  test.describe(`onboarding at ${size.width} px`, () => {
    test.use({ viewport: size });
    test.beforeEach(async ({ page }) => {
      await installProbes(page);
    });

    test('every question group opens at the top', async ({ page }) => {
      steps = 0;
      await toLoad(page);
      await page.getByRole('button', { name: 'Create my plan' }).click();
      await expectScreen(page, 'You and your surgery');
      await pick(page, QUESTION.written, 'No');
      await pick(page, QUESTION.procedure, 'MPFL reconstruction only');
      await pick(page, QUESTION.age, '18 or older');
      await pick(page, QUESTION.both, 'No');
      await pick(page, QUESTION.first, 'Yes');
      await pick(page, QUESTION.rules, 'No');
      await next(page, 'Continue to your surgeon');
      await fillDate(page, ago(60));
      await pick(page, QUESTION.side, 'Left');
      await pick(page, QUESTION.limit, 'Yes, my limit is');
      await page.getByLabel('Limit in degrees').fill('60');
      await next(page, 'Continue to today');
      await radio(page, '2'); await radio(page, 'No swelling');
      await pick(page, QUESTION.clearance, 'No');
      await next(page, 'Check my answers');
      await expectScreen(page, 'Check your answers');
    });
  });
}
