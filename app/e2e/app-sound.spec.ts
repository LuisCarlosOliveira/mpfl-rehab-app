import { expect, test, type Page } from '@playwright/test';
import { installProbes, startCamera, toSession, toSetupCamera, toSetupGuide, toHome } from './helpers/app';

test.beforeEach(async ({ page }) => {
  await installProbes(page);
});

const contexts = (page: Page) => page.evaluate(() => window.__probes.audioContexts);

test('no AudioContext exists before the Start camera press', async ({ page }) => {
  await page.goto('/');
  expect(await contexts(page)).toBe(0);
  await toHome(page);
  expect(await contexts(page)).toBe(0);
  await page.getByRole('button', { name: 'Start Heel slide' }).click();
  await page.getByRole('button', { name: 'None of these apply. Continue' }).click();
  expect(await contexts(page)).toBe(0);
  await page.getByRole('button', { name: 'Next: set up the camera' }).click();
  await page.waitForTimeout(500);
  expect(await contexts(page)).toBe(0);
});

test('one AudioContext exists after the Start camera press', async ({ page }) => {
  await toSetupCamera(page);
  expect(await contexts(page)).toBe(0);
  await startCamera(page);
  expect(await contexts(page)).toBe(1);
});

test('one AudioContext serves Setup and Session', async ({ page }) => {
  await toSession(page);
  expect(await contexts(page)).toBe(1);
});

test('Session has a mute button and its label toggles', async ({ page }) => {
  await toSession(page);
  const mute = page.getByRole('button', { name: 'Mute sound', exact: true });
  await expect(mute).toBeVisible();
  await mute.click();
  await expect(page.getByRole('button', { name: 'Unmute sound', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mute sound', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Unmute sound', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Mute sound', exact: true })).toBeVisible();
});

test('the Setup guide step makes no audio context', async ({ page }) => {
  await toSetupGuide(page);
  expect(await contexts(page)).toBe(0);
});
