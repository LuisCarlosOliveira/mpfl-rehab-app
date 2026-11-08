import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
});

const start = (page: Page) => page.evaluate(() => (window as any).__camera.start());
const states = (page: Page) => page.evaluate(() => (window as any).__camera.states() as string[]);

test('camera starts with one live video track and no audio track', async ({ page }) => {
  expect(await start(page)).toEqual({ ok: true });
  expect(await states(page)).toEqual(['live']);
});

test('explicit stop ends all tracks', async ({ page }) => {
  await start(page);
  await page.evaluate(() => (window as any).__camera.stop());
  expect(await states(page)).toEqual(['ended']);
});

test('route change (stopOnLeave) ends all tracks', async ({ page }) => {
  await start(page);
  await page.evaluate(() => (window as any).__camera.leave());
  expect(await states(page)).toEqual(['ended']);
});

test('visibilitychange to hidden ends all tracks', async ({ page }) => {
  await start(page);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(await states(page)).toEqual(['ended']);
});

test('pagehide ends all tracks', async ({ page }) => {
  await start(page);
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  expect(await states(page)).toEqual(['ended']);
});
