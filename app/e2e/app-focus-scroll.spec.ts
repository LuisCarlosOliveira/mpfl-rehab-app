// When the focus moves to the heading of a new screen, that heading must be in the viewport (WCAG 2.4.7, 2.4.11).
// A return to Home must not keep the old scroll position of Home.
import { expect, test, type Page } from '@playwright/test';
import { expectScreen, focused, heading, toHome } from './helpers/app';

const SIZES = [
  { width: 360, height: 640 },
  { width: 390, height: 844 },
  { width: 1280, height: 800 },
];

async function scrollHomeDown(page: Page) {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  expect(await page.evaluate(() => window.scrollY), 'Home is long enough to scroll').toBeGreaterThan(100);
}

async function expectHeadingInView(page: Page, text: string) {
  await expectScreen(page, text);
  const f = await focused(page);
  expect(f.tag).toBe('H1');
  const box = await heading(page).evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, vh: window.innerHeight };
  });
  expect(box.top, "heading top is in the viewport").toBeGreaterThanOrEqual(-1);
  expect(box.bottom, 'heading bottom is in the viewport').toBeLessThanOrEqual(box.vh + 1);
  // A new screen opens at the top of the page (final review C3-01).
  expect(await page.evaluate(() => window.scrollY), 'the page scroll is at the top').toBe(0);
  // The prototype banner stays visible after a screen change (final review C3-01).
  const banner = await page.getByText('Prototype. Not for patient use.').first().evaluate((el) => el.getBoundingClientRect().top);
  expect(banner, 'the prototype banner is in the viewport').toBeGreaterThanOrEqual(-1);
}

for (const size of SIZES) {
  test.describe(`focused heading in view at ${size.width} px`, () => {
    test.use({ viewport: size });

    test('Home to Privacy and back', async ({ page }) => {
      await toHome(page);
      await scrollHomeDown(page);
      await page.getByRole('button', { name: 'Privacy' }).click();
      await expectHeadingInView(page, 'Privacy');
      await page.getByRole('button', { name: 'I understand' }).click();
      await expectHeadingInView(page, 'Today');
    });

    test('Home to Load protocol and back', async ({ page }) => {
      await toHome(page);
      await scrollHomeDown(page);
      await page.getByRole('button', { name: 'Load a new protocol file' }).click();
      await expectHeadingInView(page, 'Load protocol file');
      await page.getByRole('button', { name: 'Back to Home' }).click();
      await expectHeadingInView(page, 'Today');
    });
  });
}
