import { expect, test } from '@playwright/test';

test('permission denied returns a typed error, and retry works after a grant', async ({ page, context }) => {
  await page.goto('/index.html');
  // The prompt is not accepted in this project, so the browser denies the camera.
  const first = await page.evaluate(() => (window as any).__camera.start());
  expect(first.ok).toBe(false);
  expect(first.error.kind).toBe('permission-denied');
  expect(first.error.message).toMatch(/blocked/i);

  // Retry while the block stays: same typed error, no live track.
  const again = await page.evaluate(() => (window as any).__camera.start());
  expect(again.error.kind).toBe('permission-denied');
  expect(await page.evaluate(() => (window as any).__camera.states())).toEqual([]);

  // The user allows the camera in the browser settings, then retries.
  await context.grantPermissions(['camera'], { origin: 'http://127.0.0.1:4173' });
  const retry = await page.evaluate(() => (window as any).__camera.start());
  expect(retry).toEqual({ ok: true });
  expect(await page.evaluate(() => (window as any).__camera.states())).toEqual(['live']);
});
