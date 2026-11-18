// Finding S-03: the CSP test must run on the real app, not on a test page.
// Each screen is visited in the real build under the headers of public/_headers.
// Zero CSP violations, zero console errors and zero requests to another origin are allowed.
import { expect, test } from '@playwright/test';
import { EXAMPLE, expectScreen, installProbes, openMyData, saveOneSession, startCamera, stopButton, watch } from './helpers/app';

test('the page response carries the CSP of the policy', async ({ page }) => {
  const res = await page.goto('/');
  const csp = res!.headers()['content-security-policy'];
  expect(csp).toContain("script-src 'self' 'wasm-unsafe-eval'");
  expect(csp).toContain("connect-src 'self'");
});

test('every screen of the real app has no violation, no console error and no foreign request', async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  await installProbes(page);
  const seen = watch(page, origin);

  await page.goto('/');
  await expectScreen(page, 'Privacy');
  await seen.expectClean('Privacy');

  await page.getByRole('button', { name: 'I understand' }).click();
  await expectScreen(page, 'Load protocol file');
  await seen.expectClean('Load protocol');

  // The error state of the Load screen.
  await page.getByLabel('Choose a file from your care team').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{not json') });
  await expect(page.getByRole('alert')).toContainText('File not readable');
  await seen.expectClean('Load protocol with an error');

  await page.getByLabel('Choose a file from your care team').setInputFiles(EXAMPLE);
  await expectScreen(page, 'Today');
  await seen.expectClean('Home');

  await page.getByRole('button', { name: 'Start Heel slide' }).click();
  await expectScreen(page, 'Check before you exercise');
  await seen.expectClean('RedFlag');

  await page.getByLabel('Sudden shortness of breath or chest pain.').check();
  await expect(page.getByText('Stop. Do not exercise. Call emergency services now.')).toBeVisible();
  await seen.expectClean('RedFlag, blocked');

  // The block is sticky for the visit. Only a fresh visit from Home continues.
  await page.getByRole('button', { name: 'Back to Home' }).click();
  await expectScreen(page, 'Today');
  await page.getByRole('button', { name: 'Start Heel slide' }).click();
  await expectScreen(page, 'Check before you exercise');
  await page.getByRole('button', { name: 'None of these apply. Continue' }).click();
  await expectScreen(page, 'Set up the camera');
  await expect(page.getByRole('heading', { name: /^Step 1 of 6/ })).toBeVisible();
  await seen.expectClean('Setup, position guide');

  await page.getByRole('button', { name: 'Next: set up the camera' }).click();
  await seen.expectClean('Setup, camera step before the camera starts');

  await startCamera(page);
  await seen.expectClean('Setup, camera step with the camera running');

  await page.getByRole('button', { name: 'Start exercise' }).click();
  await expectScreen(page, 'Heel slide');
  // Let the pose loop run on the fake camera, so late violations and requests show up.
  await expect(page.getByText('degrees', { exact: true })).toBeVisible();
  await page.waitForTimeout(500);
  await seen.expectClean('Session');

  // The pose code (the worker file, or the landmarker chunk when the worker is off), the model and the WASM files all come from the own origin.
  const own = seen.requests.filter((u) => new URL(u).origin === origin);
  expect(own.some((u) => /\/assets\/(poseWorker|landmarker)-.*\.js$/.test(u)), 'pose code requested').toBe(true);
  expect(own.some((u) => u.endsWith('/models/pose_landmarker_lite.task')), 'model requested').toBe(true);
  expect(own.some((u) => u.endsWith('.wasm')), 'wasm requested').toBe(true);

  await stopButton(page).click();
  await expectScreen(page, 'Summary');
  await seen.expectClean('Summary');
});

test('Progress, My data, the erase dialog and the care team view have no violation, no console error and no foreign request', async ({ page, baseURL }) => {
  await installProbes(page);
  const seen = watch(page, new URL(baseURL!).origin);
  await saveOneSession(page);

  await page.getByRole('button', { name: 'Sessions' }).click();
  await expectScreen(page, 'Your sessions');
  await expect(page.locator('.dash-chart-box svg').first()).toBeVisible(); // Recharts drew under the CSP
  await seen.expectClean('Progress with charts');
  await page.getByRole('button', { name: 'Back' }).click();

  await openMyData(page);
  await seen.expectClean('My data');
  await page.getByRole('button', { name: 'Erase all my data' }).click();
  await expect(page.locator('dialog.erase-dialog')).toBeVisible();
  await seen.expectClean('My data with the erase dialog');
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Open a session file (care team)' }).click();
  await expectScreen(page, 'Care team view');
  await seen.expectClean('Care team view');
});
