import { mkdirSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { EXAMPLE, expectBanners, expectScreen, installProbes, stopButton } from './helpers/app';

test.setTimeout(240_000);

const SIZES = [
  { name: '1440x900', width: 1440, height: 900 },
  { name: '390x844', width: 390, height: 844 },
  { name: '320x568', width: 320, height: 568 },
  { name: 'zoom200', width: 720, height: 450 },
] as const;
const SCHEMES = ['light', 'dark'] as const;
const OUT = 'test-results/v3home';

function sixFile() {
  const base = JSON.parse(readFileSync(EXAMPLE, 'utf8'));
  const extra = (kind: string) => ({ kind, sets: 2, reps: 10, source: 'PROPOSAL' });
  base.phases[0].exercises = [...base.phases[0].exercises.slice(0, 2), extra('quad-set'), extra('gluteal-set'), extra('ankle-pump'), extra('leg-raise-side')];
  return { name: 'six.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(base)) };
}

async function toToday(page: Page) {
  await installProbes(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'I understand' }).click();
  await page.getByLabel('Choose a file from your care team').setInputFiles(sixFile());
  await expectScreen(page, 'Today');
}

/** The checks of one view. `where` names it in a failure. */
async function checkView(page: Page, where: string, opts: { columns?: boolean } = {}) {
  await page.waitForTimeout(300);
  const r = await page.evaluate(() => {
    const small: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>('button, a[href], input:not([type="hidden"]), summary')) {
      const box = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || box.width === 0) continue;
      // A radio or a check box is a small drawing inside a label. The label is the target.
      const target = el instanceof HTMLInputElement ? (el.closest('label') ?? el) : el;
      const tb = target.getBoundingClientRect();
      if (tb.height < 43.5 && !el.closest('.v3-skip, .visually-hidden')) small.push(`${el.tagName} ${(el.textContent ?? '').trim().slice(0, 30)} ${Math.round(tb.height)}px`);
    }
    const cols = document.querySelector('.v3-cols');
    const kids = cols ? [...cols.children].map((c) => Math.round(c.getBoundingClientRect().left)) : [];
    return { scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth, small, kids };
  });
  expect(r.scrollW, `${where}: sideways scroll`).toBeLessThanOrEqual(r.innerW);
  expect(r.small, `${where}: targets under 44 px`).toEqual([]);
  if (opts.columns !== undefined && r.kids.length === 2) {
    if (opts.columns) expect(r.kids[1]!, `${where}: two columns`).toBeGreaterThan(r.kids[0]! + 100);
    else expect(r.kids[1]!, `${where}: one column`).toBe(r.kids[0]);
  }
}

for (const scheme of SCHEMES) {
  for (const size of SIZES) {
    test(`tab screens, ${size.name}, ${scheme}`, async ({ page }) => {
      mkdirSync(OUT, { recursive: true });
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize({ width: size.width, height: size.height });
      await toToday(page);
      const shot = (n: string) => page.screenshot({ path: `${OUT}/${n}-${size.name}-${scheme}.png`, fullPage: true });
      const wide = size.width >= 900;

      await expectBanners(page, { example: true });
      await expect(page.getByRole('complementary', { name: 'Notice' }).first()).toBeVisible();
      await checkView(page, `today ${size.name} ${scheme}`, { columns: wide });
      // The plan list: six rows, the first is next, and the big Start button is in view without a scroll.
      await expect(page.getByRole('list', { name: "Today's plan" }).getByRole('listitem')).toHaveCount(6);
      await expect(page.getByRole('list', { name: "Today's plan" }).getByRole('listitem').first()).toHaveAttribute('aria-current', 'step');
      await expect(page.getByRole('button', { name: "Start today's session" })).toBeInViewport();
      await shot('today');

      for (const [tab, h1] of [['Sessions', 'Your sessions'], ['My data', 'My data'], ['Progress', 'Check my progress']] as const) {
        await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: tab }).click();
        await expectScreen(page, h1);
        await expectBanners(page, { example: true });
        await checkView(page, `${tab} ${size.name} ${scheme}`);
        await shot(tab.toLowerCase().replace(' ', '-'));
      }
    });

    test(`Done step and Next card, ${size.name}, ${scheme}`, async ({ page }) => {
      mkdirSync(OUT, { recursive: true });
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize({ width: size.width, height: size.height });
      await toToday(page);
      const shot = (n: string) => page.screenshot({ path: `${OUT}/${n}-${size.name}-${scheme}.png`, fullPage: true });
      await page.getByRole('button', { name: "Start today's session" }).click();
      await page.getByRole('button', { name: 'None of these apply. Continue' }).click();
      await page.getByRole('button', { name: 'Next: set up the camera' }).click();
      await page.getByRole('button', { name: 'Start camera' }).click();
      await expect(page.getByTestId('instruction')).toBeVisible({ timeout: 60_000 });
      await page.getByRole('button', { name: 'Start exercise' }).click();
      await expectScreen(page, 'Heel slide');
      await stopButton(page).click();
      await expectScreen(page, 'Done');
      await expectBanners(page, { example: true });
      await expect(page.getByRole('progressbar', { name: 'Session progress' })).toHaveAttribute('aria-valuetext', 'Exercise 1 of 6');
      await expect(page.getByText('Next: Straight leg raise')).toBeVisible();
      await checkView(page, `done ${size.name} ${scheme}`, { columns: size.width >= 900 });
      await shot('done');
      await page.getByRole('button', { name: 'Skip the questions' }).click();
      await expectScreen(page, 'Next: Straight leg raise');
      await page.getByRole('region', { name: 'Actions' }).getByRole('button', { name: 'Stop session' }).focus(); // a focus stops the 5 s timer only with a key or pointer
      await page.keyboard.press('Shift');
      await expectBanners(page, { example: true });
      await checkView(page, `next ${size.name} ${scheme}`);
      await shot('next');
    });
  }
}
