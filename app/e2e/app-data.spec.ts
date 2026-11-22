import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { expectScreen, focused, installProbes, openMyData, readStore, saveOneSession, toHome } from './helpers/app';

test.beforeEach(async ({ page }) => {
  await installProbes(page);
});

async function downloadOf(page: Page, buttonName: string | RegExp) {
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: buttonName }).click()]);
  const path = await download.path();
  return { name: download.suggestedFilename(), text: readFileSync(path, 'utf8') };
}

test('Home links to Progress and My data', async ({ page }) => {
  await toHome(page);
  await expect(page.getByRole('button', { name: 'Sessions' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'My data' })).toBeVisible();
});

test('Progress with no session shows the empty text', async ({ page }) => {
  await toHome(page);
  await page.getByRole('button', { name: 'Sessions' }).click();
  await expectScreen(page, 'Your sessions');
  await expect(page.getByText('No sessions yet.')).toBeVisible();
});

test('Progress shows a chart with a data table for each series that has values, and "No values." for the others', async ({ page }) => {
  // The fake camera sees no person, so the saved session has a rep count and a pain answer but no knee angle.
  await saveOneSession(page);
  await page.getByRole('button', { name: 'Sessions' }).click();
  await expectScreen(page, 'Your sessions');
  await expect(page.locator('main [role="img"].dash-chart-box')).toHaveCount(2);
  await expect(page.locator('main table.data-table')).toHaveCount(2);
  await expect(page.getByRole('region', { name: /^Data table:/ })).toHaveCount(2);
  // The peak knee bend series has no value: only its title and one line, no empty frame (final review C2-05).
  await expect(page.getByRole('heading', { name: /^Peak knee bend, Heel slide/ })).toBeVisible();
  await expect(page.getByText('No values.')).toHaveCount(1);
  await page.getByRole('button', { name: 'Back' }).click();
  await expectScreen(page, 'Today');
});

test('My data exports JSON with the method of the angle, and CSV', async ({ page }) => {
  await saveOneSession(page);
  await openMyData(page);
  await expect(page.getByText('1 session on this device.')).toBeVisible();

  const json = await downloadOf(page, /^Export .*as JSON$/);
  expect(json.name).toMatch(/^mpfl-sessions-\d{4}-\d{2}-\d{2}\.json$/);
  const parsed = JSON.parse(json.text);
  expect(parsed.angleMethod).toEqual(expect.any(String));
  expect(parsed.angleMethod.length).toBeGreaterThan(0);
  expect(parsed.schemaVersion).toBe(1);
  expect(parsed.sessions).toHaveLength(1);
  expect(JSON.stringify(parsed)).not.toMatch(/data:image|blob:/);
  await expect(page.getByRole('status')).toContainText(/File saved: mpfl-sessions-\d{4}-\d{2}-\d{2}\.json\./);

  const csv = await downloadOf(page, /^Export .*as CSV$/);
  expect(csv.name).toMatch(/^mpfl-sessions-\d{4}-\d{2}-\d{2}\.csv$/);
  const lines = csv.text.trim().split(/\r?\n/);
  expect(lines.length).toBeGreaterThanOrEqual(2);
  expect(csv.text).toContain('heel-slide');
});

test('AC5-04: the focus stays on the export button after Enter, and never goes to the body', async ({ page }) => {
  await saveOneSession(page);
  await openMyData(page);
  const json = page.getByRole('button', { name: /^Export .*as JSON$/ });
  await json.focus();
  const download = page.waitForEvent('download');
  await page.keyboard.press('Enter');
  await download;
  await expect(page.getByRole('status').filter({ hasText: 'File saved' })).toBeVisible();
  expect((await focused(page)).tag).toBe('BUTTON');
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(false);
  await expect(page.getByRole('button', { name: 'Done' })).toBeFocused();
});

test('the erase dialog is a real dialog: focus moves in, Escape closes it, focus returns', async ({ page }) => {
  await toHome(page);
  await openMyData(page);
  const eraseButton = page.getByRole('button', { name: 'Erase all my data' });
  await eraseButton.focus();
  await eraseButton.click();

  const dialog = page.locator('dialog.erase-dialog');
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((d: HTMLDialogElement) => d.open && d.matches(':modal'))).toBe(true);
  expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
  expect(await focused(page)).toMatchObject({ tag: 'BUTTON', text: 'Keep my data' });

  // The page behind the dialog is inert: Tab never lands on a control outside the dialog.
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab');
    const outside = await dialog.evaluate((d) => {
      const el = document.activeElement;
      return el !== null && el !== document.body && !d.contains(el) ? el.outerHTML.slice(0, 80) : null;
    });
    expect(outside).toBeNull();
  }

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  expect(await focused(page)).toMatchObject({ tag: 'BUTTON', text: 'Erase all my data' });
});

test('Keep my data closes the dialog and keeps the data', async ({ page }) => {
  await saveOneSession(page);
  await openMyData(page);
  await page.getByRole('button', { name: 'Erase all my data' }).click();
  await page.getByRole('button', { name: 'Keep my data' }).click();
  await expect(page.locator('dialog.erase-dialog')).toBeHidden();
  expect(await readStore(page, 'sessions')).toHaveLength(1);
});

test('erase clears IndexedDB, mpfl. keys, Cache storage and service workers, and Privacy shows again', async ({ page }) => {
  await saveOneSession(page);
  // Other keys of the origin stay. Cache storage holds an entry. These make the erase visible.
  await page.evaluate(async () => {
    localStorage.setItem('other.key', 'stays');
    await caches.open('e2e-cache').then((c) => c.put('/e2e', new Response('x')));
  });
  const before = await page.evaluate(async () => ({
    mpfl: Object.keys(localStorage).filter((k) => k.startsWith('mpfl.')),
    caches: await caches.keys(),
  }));
  expect(before.mpfl).toContain('mpfl.privacySeen');
  expect(before.caches).toEqual(['e2e-cache']);
  expect(await readStore(page, 'sessions')).toHaveLength(1);
  expect(await readStore(page, 'protocol')).toHaveLength(1);

  await openMyData(page);
  await page.getByRole('button', { name: 'Erase all my data' }).click();
  await page.locator('dialog.erase-dialog').getByRole('button', { name: 'Erase my data' }).click();
  await expectScreen(page, 'Privacy');

  const after = await page.evaluate(async () => ({
    mpfl: Object.keys(localStorage).filter((k) => k.startsWith('mpfl.')),
    other: localStorage.getItem('other.key'),
    caches: await caches.keys(),
    workers: (await navigator.serviceWorker.getRegistrations()).length,
  }));
  expect(after.mpfl).toEqual([]);
  expect(after.other).toBe('stays'); // only the keys of this app go
  expect(after.caches).toEqual([]);
  expect(after.workers).toBe(0);
  expect(await readStore(page, 'sessions')).toEqual([]);
  expect(await readStore(page, 'protocol')).toEqual([]);

  // A reload shows Privacy, then the Load screen: no protocol is left.
  await page.reload();
  await expectScreen(page, 'Privacy');
  await page.getByRole('button', { name: 'I understand' }).click();
  await expectScreen(page, 'Load protocol file');
});

test('the care team view reads an exported file in memory only', async ({ page }) => {
  await saveOneSession(page, '4', 'No swelling');
  await openMyData(page);
  const json = await downloadOf(page, /^Export .*as JSON$/);
  const sessionsBefore = await readStore(page, 'sessions');

  await page.getByRole('button', { name: 'Open a session file (care team)' }).click();
  await expectScreen(page, 'Care team view');
  await page.getByLabel('Session file (.json)').setInputFiles({ name: json.name, mimeType: 'application/json', buffer: Buffer.from(json.text) });
  const list = page.getByRole('table', { name: 'Session list' });
  await expect(list).toBeVisible();
  await expect(list.locator('tbody tr')).toHaveCount(1);
  await expect(list).toContainText('Heel slide');

  // Nothing was written: the stored sessions are equal.
  expect(await readStore(page, 'sessions')).toEqual(sessionsBefore);

  // A reload drops the file from memory.
  await page.reload();
  await expectScreen(page, 'Today');
  expect(await readStore(page, 'sessions')).toEqual(sessionsBefore);
});

test('the care team view refuses a file that is not an export', async ({ page }) => {
  await toHome(page);
  await openMyData(page);
  await page.getByRole('button', { name: 'Open a session file (care team)' }).click();
  await expectScreen(page, 'Care team view');
  await page.getByLabel('Session file (.json)').setInputFiles({ name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{"a":1}') });
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('table', { name: 'Session list' })).toHaveCount(0);
});
