import { expect, test } from '@playwright/test';
import { expectBanners, expectScreen, installProbes, stopButton, trackStates } from './helpers/app';

test.setTimeout(150_000);

declare global {
  interface Window {
    __maxLive: number;
  }
}

test('two camera exercises in one session reuse one live track, and none is live at the end', async ({ page }) => {
  await installProbes(page);
  await page.addInitScript(() => {
    window.__maxLive = 0;
    setInterval(() => {
      const live = window.__probes.streams.flatMap((s) => s.getTracks()).filter((t) => t.readyState === 'live').length;
      window.__maxLive = Math.max(window.__maxLive, live);
    }, 20);
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'I understand' }).click();
  await page.getByLabel('Choose a file from your care team').setInputFiles('src/lib/protocol/example-protocol.json');
  await expectScreen(page, 'Today');
  await expectBanners(page, { example: true });

  const press = (name: string) => page.getByRole('button', { name, exact: true });
  const gum = () => page.evaluate(() => window.__probes.gumCalls);

  await press("Start today's session").click();
  await press('None of these apply. Continue').click();
  await press('Next: set up the camera').click();
  await press('Start camera').click();
  await expect(page.getByTestId('instruction')).toBeVisible({ timeout: 60_000 });
  await press('Start exercise').click();
  await expectScreen(page, 'Heel slide');
  expect(await trackStates(page)).toEqual(['video:live']);
  expect(await gum()).toBe(1);

  await stopButton(page).click();
  await press('Skip the questions').click();
  await expectScreen(page, 'Next: Straight leg raise');
  expect(await trackStates(page), 'the camera stays on between two camera exercises, on purpose').toEqual(['video:live']);

  await expect(page.getByRole('heading', { level: 1, name: 'Set up the camera' })).toBeVisible({ timeout: 10_000 });
  expect(await trackStates(page), 'still live while the second setup shows').toEqual(['video:live']);
  await press('Next: set up the camera').click();
  await press('Start camera').click();
  await expect(page.getByTestId('instruction')).toBeVisible({ timeout: 60_000 });
  await press('Start exercise').click();
  await expectScreen(page, 'Straight leg raise');
  expect(await trackStates(page), 'the same track, no second stream').toEqual(['video:live']);
  expect(await gum()).toBe(1);

  await stopButton(page).click();
  await press('Skip the questions').click();
  await expectScreen(page, "Today's session");
  await expect.poll(() => trackStates(page)).toEqual(['video:ended']);
  expect(await page.evaluate(() => window.__maxLive), 'never two live tracks at once').toBe(1);
});
