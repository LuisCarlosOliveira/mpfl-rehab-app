// Camera exit paths in the REAL app (NFR9). The harness specs in camera.spec.ts test the module alone.
// The init script wraps getUserMedia and keeps every stream on window, so the tests read the track states.
import { expect, test, type Page } from '@playwright/test';
import { expectScreen, installProbes, startCamera, stopButton, toSession, toSetupCamera, trackStates } from './helpers/app';

test.beforeEach(async ({ page }) => {
  await installProbes(page);
});

const gumCalls = (page: Page) => page.evaluate(() => window.__probes.gumCalls);

test('the camera does not start before the Start camera press', async ({ page }) => {
  await toSetupCamera(page); // privacy, protocol, red flags, guide and the camera text
  expect(await gumCalls(page)).toBe(0);
  await page.waitForTimeout(500);
  expect(await gumCalls(page)).toBe(0);
  await startCamera(page);
  expect(await gumCalls(page)).toBeGreaterThanOrEqual(1);
});

test('the camera asks for video only', async ({ page }) => {
  await toSetupCamera(page);
  await startCamera(page);
  const kinds = await page.evaluate(() => window.__probes.streams.flatMap((s) => s.getTracks().map((t) => t.kind)));
  expect(kinds.length).toBeGreaterThan(0);
  expect(kinds.every((k) => k === 'video')).toBe(true);
});

test('a track is live in Session, then ended after Stop', async ({ page }) => {
  await toSession(page);
  expect(await trackStates(page)).toContain('video:live');
  await stopButton(page).click();
  await expectScreen(page, 'Summary');
  const states = await trackStates(page);
  expect(states.length).toBeGreaterThan(0);
  expect(states.every((s) => s === 'video:ended')).toBe(true);
});

test('every track is ended after "Knee gave way or hurts"', async ({ page }) => {
  await toSession(page);
  expect(await trackStates(page)).toContain('video:live');
  await page.getByRole('button', { name: 'Knee gave way or hurts' }).click();
  await expectScreen(page, 'Summary');
  expect((await trackStates(page)).every((s) => s === 'video:ended')).toBe(true);
});

test('every track is ended after visibilitychange to hidden', async ({ page }) => {
  await toSession(page);
  expect(await trackStates(page)).toContain('video:live');
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(() => trackStates(page)).toEqual(expect.arrayContaining(['video:ended']));
  expect((await trackStates(page)).every((s) => s === 'video:ended')).toBe(true);
});

test('every track is ended after pagehide', async ({ page }) => {
  await toSession(page);
  expect(await trackStates(page)).toContain('video:live');
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await expect.poll(async () => (await trackStates(page)).every((s) => s === 'video:ended')).toBe(true);
});

test('every track is ended after Cancel (navigating Home) from Setup', async ({ page }) => {
  await toSetupCamera(page);
  await startCamera(page);
  expect(await trackStates(page)).toContain('video:live');
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expectScreen(page, 'Home');
  const states = await trackStates(page);
  expect(states.length).toBeGreaterThan(0);
  expect(states.every((s) => s === 'video:ended')).toBe(true);
});
