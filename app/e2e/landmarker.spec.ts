import { expect, test } from '@playwright/test';

test('landmarker starts under the CSP, with 0 violations and only own-origin requests', async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const requests: string[] = [];
  const cspConsole: string[] = [];
  page.on('request', (r) => requests.push(r.url()));
  page.on('console', (m) => {
    if (/content security policy|csp/i.test(m.text())) cspConsole.push(m.text());
  });

  const res = await page.goto('/index.html');
  expect(res!.headers()['content-security-policy']).toContain("'wasm-unsafe-eval'");

  const result = await page.evaluate(() => (window as any).__landmarker.init());
  expect(result.initialised).toBe(true); // WASM instantiated and the model loaded
  // A blank frame has no person. This test does not claim that landmarks arrive.
  expect(result.landmarks).toBeNull();
  await page.waitForTimeout(500); // let any late telemetry request fire

  const foreign = requests.filter((u) => !u.startsWith(origin) && !u.startsWith('data:') && !u.startsWith('blob:'));
  expect(foreign).toEqual([]);
  expect(requests.some((u) => u.endsWith('/models/pose_landmarker_lite.task'))).toBe(true);
  expect(requests.some((u) => u.endsWith('.wasm'))).toBe(true);
  expect(await page.evaluate(() => (window as any).__violations)).toEqual([]);
  expect(cspConsole).toEqual([]);
});
