// WebKit smoke test (NFR5, NFR9, T12). WebKit is the engine of Safari.
// It runs on the real built app. WebKit has no fake camera flag, so an init script stubs getUserMedia.
// Not covered here: a real camera, real pose, and real Safari on iOS.
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import {
  EXAMPLE,
  expectScreen,
  focused,
  heading,
  installProbes,
  openMyData,
  readStore,
  toHome,
  toRedFlag,
  toSetupCamera,
  toSetupGuide,
  toSummary,
  watch,
} from './helpers/app';

type Stub = 'canvas' | 'NotAllowedError' | 'NotFoundError';

/**
 * Replace getUserMedia on MediaDevices.prototype. 'canvas' returns a moving canvas stream, a named error makes it reject.
 * A stub on the navigator.mediaDevices object is lost in WebKit before the app runs, so the stub sits on the prototype.
 * The stub counts its own calls in window.__gum, because the probe of the shared helper wraps the instance only.
 */
async function stubCamera(page: Page, mode: Stub) {
  await page.addInitScript((m) => {
    const w = window as unknown as { __gum: number };
    w.__gum = 0;
    Object.defineProperty(MediaDevices.prototype, 'getUserMedia', {
      configurable: true,
      writable: true,
      value: async () => {
        w.__gum += 1;
        if (m !== 'canvas') throw new DOMException('stub', m);
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext('2d')!;
        let n = 0;
        setInterval(() => {
          ctx.fillStyle = '#334';
          ctx.fillRect(0, 0, 640, 480);
          ctx.fillStyle = '#ccc';
          ctx.fillRect(20 + (n++ % 200), 100, 60, 60);
        }, 40);
        return canvas.captureStream(25);
      },
    });
  }, mode);
}

async function setup(page: Page, mode: Stub = 'canvas') {
  await stubCamera(page, mode);
  await installProbes(page);
}

const gumCalls = (page: Page) => page.evaluate(() => (window as unknown as { __gum: number }).__gum);

test('the engine is WebKit', ({ browserName }) => {
  expect(browserName).toBe('webkit');
});

test('every screen without a camera has no violation, no console error and no foreign request', async ({ page, baseURL }) => {
  await setup(page);
  const seen = watch(page, new URL(baseURL!).origin);

  await page.goto('/');
  await expectScreen(page, 'Privacy');
  await seen.expectClean('Privacy');

  await page.getByRole('button', { name: 'I understand' }).click();
  await expectScreen(page, 'Load protocol file');
  await seen.expectClean('Load protocol');

  await page.getByLabel('Protocol file (.json)').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{not json') });
  await expect(page.getByRole('alert')).toContainText('File not readable');
  await seen.expectClean('Load protocol with an error');

  await page.getByLabel('Protocol file (.json)').setInputFiles(EXAMPLE);
  await expectScreen(page, 'Home');
  await seen.expectClean('Home');

  await page.getByRole('button', { name: 'Start Heel slide' }).click();
  await expectScreen(page, 'Check before you exercise');
  await seen.expectClean('RedFlag');

  await page.getByLabel('Sudden shortness of breath or chest pain.').check();
  await expect(page.getByText('Stop. Do not exercise. Call emergency services now.')).toBeVisible();
  await seen.expectClean('RedFlag, blocked');
  await page.getByRole('button', { name: 'Back to Home' }).click();
  await expectScreen(page, 'Home');

  await page.getByRole('button', { name: 'Start Heel slide' }).click();
  await page.getByRole('button', { name: 'None of these apply. Continue' }).click();
  await expectScreen(page, 'Set up the camera');
  await expect(page.getByRole('heading', { name: 'Position guide' })).toBeVisible();
  await seen.expectClean('Setup, position guide');
  expect(await gumCalls(page), 'no camera request on these screens').toBe(0);
});

test('Summary, Progress and My data work after one saved session', async ({ page, baseURL }) => {
  await setup(page);
  const seen = watch(page, new URL(baseURL!).origin);
  await toSummary(page);
  await seen.expectClean('Summary');
  await page.getByLabel('3', { exact: true }).check();
  await page.getByLabel('Some swelling').check();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Session saved.')).toBeVisible();
  await page.getByRole('button', { name: 'Done' }).click();
  await expectScreen(page, 'Home');

  await page.getByRole('button', { name: 'Progress' }).click();
  await expectScreen(page, 'Progress');
  await expect(page.locator('main [role="img"]').first()).toBeVisible();
  await seen.expectClean('Progress');
  await page.getByRole('button', { name: 'Back' }).click();

  await openMyData(page);
  await expect(page.getByText('1 session on this device.')).toBeVisible();
  await seen.expectClean('My data');
});

test('the red-flag block is sticky for the visit and Back to Home works', async ({ page }) => {
  await setup(page);
  await toRedFlag(page);
  const box = page.getByLabel('Sudden shortness of breath or chest pain.');
  await box.check();
  const stop = page.getByText('Stop. Do not exercise. Call emergency services now.');
  await expect(stop).toBeVisible();
  // Un-ticking the box does not lift the block.
  await box.uncheck();
  await expect(stop).toBeVisible();
  await expect(page.getByRole('button', { name: 'None of these apply. Continue' })).toBeDisabled();
  await page.getByRole('button', { name: 'Back to Home' }).click();
  await expectScreen(page, 'Home');
});

test('the first screen does not move the focus, and each change moves it to the new h1', async ({ page }) => {
  await setup(page);
  await page.goto('/');
  await expectScreen(page, 'Privacy');
  expect((await focused(page)).tag).toBe('BODY');
  await page.getByRole('button', { name: 'I understand' }).click();
  await expectScreen(page, 'Load protocol file');
  await expect.poll(() => focused(page)).toMatchObject({ tag: 'H1', text: 'Load protocol file' });
  await page.getByLabel('Protocol file (.json)').setInputFiles(EXAMPLE);
  await expectScreen(page, 'Home');
  await expect.poll(() => focused(page)).toMatchObject({ tag: 'H1', text: 'Home' });
  await page.getByRole('button', { name: 'Start Heel slide' }).click();
  await expectScreen(page, 'Check before you exercise');
  await expect.poll(() => focused(page)).toMatchObject({ tag: 'H1', text: 'Check before you exercise' });
  await page.getByRole('button', { name: 'None of these apply. Continue' }).click();
  await expectScreen(page, 'Set up the camera');
  await expect.poll(() => focused(page)).toMatchObject({ tag: 'H1', text: 'Set up the camera' });
});

test('getUserMedia is not called before Start camera, and is called once after it', async ({ page }) => {
  await setup(page);
  await toSetupCamera(page);
  await page.waitForTimeout(500);
  expect(await gumCalls(page)).toBe(0);
  await page.getByRole('button', { name: 'Start camera' }).click();
  await expect(page.getByTestId('instruction')).toBeVisible();
  expect(await gumCalls(page)).toBe(1);
});

for (const name of ['NotAllowedError', 'NotFoundError'] as const) {
  test(`${name} shows a plain text and a way out`, async ({ page }) => {
    await setup(page, name);
    await toSetupCamera(page);
    await page.getByRole('button', { name: 'Start camera' }).click();
    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible();
    expect((await alert.innerText()).trim().length).toBeGreaterThan(20);
    expect(await alert.innerText()).not.toMatch(/DOMException|Error:|undefined|stub/);
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expectScreen(page, 'Home');
  });
}

test('IndexedDB keeps a session after a reload, and localStorage works', async ({ page }) => {
  await setup(page);
  await toSummary(page);
  await page.getByLabel('3', { exact: true }).check();
  await page.getByLabel('No swelling').check();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Session saved.')).toBeVisible();
  expect(await readStore(page, 'sessions')).toHaveLength(1);
  await page.reload();
  await expectScreen(page, 'Home');
  expect(await readStore(page, 'sessions')).toHaveLength(1);
  expect(await readStore(page, 'protocol')).toHaveLength(1);
  expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('mpfl.')))).toContain('mpfl.privacySeen');
});

async function saveSessionAndOpenData(page: Page) {
  await toSummary(page);
  await page.getByLabel('3', { exact: true }).check();
  await page.getByLabel('Some swelling').check();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Session saved.')).toBeVisible();
  await page.getByRole('button', { name: 'Done' }).click();
  await openMyData(page);
}

test('the erase dialog is a real dialog, Escape closes it, and erase clears the data', async ({ page }) => {
  await setup(page);
  await saveSessionAndOpenData(page);
  await page.getByRole('button', { name: 'Erase all my data' }).click();
  const dialog = page.locator('dialog');
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((d: HTMLDialogElement) => d.open && d.matches(':modal'))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  expect(await readStore(page, 'sessions')).toHaveLength(1);

  await page.getByRole('button', { name: 'Erase all my data' }).click();
  await dialog.getByRole('button', { name: 'Erase my data' }).click();
  await expectScreen(page, 'Privacy');
  expect(await readStore(page, 'sessions')).toEqual([]);
  expect(await readStore(page, 'protocol')).toEqual([]);
  expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('mpfl.')))).toEqual([]);
});

test('the JSON export is a real download and the content parses', async ({ page }) => {
  await setup(page);
  await saveSessionAndOpenData(page);
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export JSON file' }).click()]);
  expect(download.suggestedFilename()).toMatch(/^mpfl-sessions-\d{4}-\d{2}-\d{2}\.json$/);
  const parsed = JSON.parse(readFileSync(await download.path(), 'utf8'));
  expect(parsed.schemaVersion).toBe(1);
  expect(parsed.angleMethod).toEqual(expect.any(String));
  expect(parsed.sessions).toHaveLength(1);
});

for (const [w, h] of [
  [390, 844],
  [1280, 800],
] as const) {
  test(`no horizontal overflow at ${w} x ${h}, and the Figtree font loads`, async ({ page }) => {
    await setup(page);
    await page.setViewportSize({ width: w, height: h });
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    await toHome(page);
    expect(await overflow(), 'Home').toBeLessThanOrEqual(0);
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.fonts.check("16px 'Figtree'")), 'Figtree check').toBe(true);
    expect(await page.evaluate(() => [...document.fonts].some((f) => f.family.includes('Figtree') && f.status === 'loaded')), 'Figtree loaded').toBe(true);
    await page.getByRole('button', { name: 'Start Heel slide' }).click();
    await page.getByRole('button', { name: 'None of these apply. Continue' }).click();
    await expectScreen(page, 'Set up the camera');
    expect(await overflow(), 'Setup guide').toBeLessThanOrEqual(0);
  });
}

test('pairing screens: skipped while no second camera button exists', async ({ page }) => {
  await setup(page);
  await toSetupGuide(page);
  const button = page.getByRole('button', { name: /second camera/i });
  test.skip((await button.count()) === 0, 'Pairing is not wired into Setup yet. No button with the text "second camera".');
  await button.first().click();
  await expect(heading(page)).toBeVisible();
});
