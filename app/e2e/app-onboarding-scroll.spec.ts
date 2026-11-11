// AC5-01: each onboarding question opens at the top of the page. The prototype banner stays in view.
// The page is scrolled down before each Next, so a step that keeps the old scroll fails.
import { expect, test, type Page } from '@playwright/test';
import { expectScreen, installProbes, PROTOTYPE_BANNER, toLoad } from './helpers/app';

const ago = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const radio = (page: Page, name: string) => page.getByRole('radio', { name, exact: true }).check();

let steps = 0;
/** Scrolls down, presses Next, then asserts that the new step is at the top with the banner in view. */
async function next(page: Page) {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.getByRole('button', { name: /^(Next|Make my plan)$/ }).click();
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

    test('every question step opens at the top', async ({ page }) => {
      steps = 0;
      await toLoad(page);
      await page.getByRole('button', { name: 'Create my plan' }).click();
      await expectScreen(page, 'Did your care team give you a written rehab plan?');
      await radio(page, 'No'); await next(page);
      await radio(page, 'MPFL reconstruction only'); await next(page);
      await radio(page, '18 or older'); await next(page);
      await radio(page, 'No'); await next(page);
      await radio(page, 'Yes'); await next(page);
      await radio(page, 'No'); await next(page);
      await page.getByLabel('Date of surgery').fill(ago(60)); await next(page);
      await radio(page, 'Left'); await next(page);
      await radio(page, 'Yes, my limit is');
      await page.getByLabel('Limit in degrees').fill('60');
      await next(page);
      await next(page); // red flags: none ticked
      await radio(page, '2'); await radio(page, 'No swelling'); await next(page);
      await expect(page.getByRole('heading', { level: 1, name: /Has your surgeon or physiotherapist said/ })).toBeVisible();
      await radio(page, 'No'); await next(page);
      await expectScreen(page, 'Check your answers');
    });
  });
}
