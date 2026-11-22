import { expect, test } from '@playwright/test';
import { installProbes, toSession, watch } from './helpers/app';

test('a browser with no Worker and no GPU loads the model on the main thread without a console error', async ({ page, baseURL }) => {
  await installProbes(page);
  await page.addInitScript(() => {
    // @ts-expect-error a browser with no Worker
    window.Worker = undefined;
  });
  const seen = watch(page, new URL(baseURL!).origin);
  await toSession(page);
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => window.Worker)).toBeUndefined();
  expect(seen.requests.some((u) => u.endsWith('/models/pose_landmarker_lite.task'))).toBe(true);
  await seen.expectClean('Session on the main thread, no GPU');
});
