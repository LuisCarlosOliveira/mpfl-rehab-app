// A machine without a usable GPU. Headless Chromium has software WebGL only (SwiftShader).
// There the GPU delegate needs about 8 s to the first pose result, and the CPU delegate 1 s.
// The project `no-gpu` turns WebGL off. The GPU start fails and the app must use the CPU delegate.
// This test proves only that the model file loads and the session screen shows with no console error.
// It does not prove that poses arrive. Known limit: MediaPipe uploads every image through a WebGL texture,
// so a browser with WebGL blocked most likely gets no pose, with any delegate.
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
