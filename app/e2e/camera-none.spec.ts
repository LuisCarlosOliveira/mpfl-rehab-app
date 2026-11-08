import { expect, test } from '@playwright/test';

test('no camera device returns the no-device error', async ({ page }) => {
  await page.goto('/index.html');
  const r = await page.evaluate(() => (window as any).__camera.start());
  expect(r.ok).toBe(false);
  expect(r.error.kind).toBe('no-device');
  expect(r.error.message).toMatch(/no camera/i);
});
