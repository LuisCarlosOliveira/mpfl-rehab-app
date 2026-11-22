import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import {
  EXAMPLE,
  expectBanners,
  expectScreen,
  focused,
  installProbes,
  readStore,
  startCamera,
  stopButton,
  toHome,
  toLoad,
  toRedFlag,
  toSession,
  toSetupGuide,
  toSummary,
} from './helpers/app';

const PAUSE = 'Pause and contact your care team.';
const BLOCK_EMERGENCY = 'Stop. Do not exercise. Call emergency services now.';
const NOTE = 'General guidance, not verified for MPFL surgery.';

test.beforeEach(async ({ page }) => {
  await installProbes(page);
});

test('first launch shows Privacy and does not move the focus', async ({ page }) => {
  await page.goto('/');
  await expectScreen(page, 'Privacy');
  await expectBanners(page, { example: false });
  await expect(page.getByText('No video leaves your device.')).toBeVisible();
  // The first screen is not a screen change. The focus stays on the page body.
  expect((await focused(page)).tag).toBe('BODY');
  await page.getByRole('button', { name: 'I understand' }).click();
  await expectScreen(page, 'Load protocol file');
  expect(await focused(page)).toMatchObject({ tag: 'H1', text: 'Load protocol file' });
});

test('Privacy shows once: a reload goes to the Load screen', async ({ page }) => {
  await toLoad(page);
  await page.reload();
  await expectScreen(page, 'Load protocol file');
});

test('a bad file shows its named error as plain text', async ({ page }) => {
  await toLoad(page);
  const input = page.getByLabel('Choose a file from your care team');
  await expectBanners(page, { example: false });

  await input.setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{not json') });
  await expect(page.getByRole('alert')).toContainText('File not readable');

  await input.setInputFiles({ name: 'schema.json', mimeType: 'application/json', buffer: Buffer.from('{"schemaVersion":1}') });
  await expect(page.getByRole('alert')).toContainText('Protocol not valid');

  await input.setInputFiles({ name: 'big.json', mimeType: 'application/json', buffer: Buffer.alloc(5 * 1024 * 1024 + 1, 32) });
  await expect(page.getByRole('alert')).toContainText('File too large');

  // A file with an unknown key is refused. No markup from the file turns into an element.
  const evil = { ...JSON.parse(readFileSync(EXAMPLE, 'utf8')), '<img src=x onerror="window.__pwned=1">': 1 };
  await input.setInputFiles({ name: 'evil.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(evil)) });
  await expect(page.getByRole('alert')).toContainText('Protocol not valid');
  expect(await page.locator('main img').count()).toBe(0);
  expect(await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned)).toBeUndefined();
  await expectScreen(page, 'Load protocol file');
});

test('text from the protocol file shows as plain text', async ({ page }) => {
  await toLoad(page);
  const raw = { ...JSON.parse(readFileSync(EXAMPLE, 'utf8')), authoredBy: '<img src=x onerror="window.__pwned=1">' };
  await page.getByLabel('Choose a file from your care team').setInputFiles({ name: 'p.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(raw)) });
  await expectScreen(page, 'Today');
  await expect(page.getByText('<img src=x onerror="window.__pwned=1">')).toBeVisible();
  expect(await page.locator('main img').count()).toBe(0);
  expect(await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned)).toBeUndefined();
});

test('Home shows the protocol, and a reload keeps it (FR26)', async ({ page }) => {
  await toHome(page);
  await expectBanners(page, { example: true });
  const facts = page.locator('dl.facts').first();
  await expect(facts).toContainText('Operated side');
  await expect(facts).toContainText('Left');
  await expect(facts).toContainText('Active phase');
  await expect(facts).toContainText('1, Protection');
  await expect(page.getByRole('button', { name: 'Start Heel slide' })).toBeEnabled();

  await page.reload();
  await expectScreen(page, 'Today'); // no Privacy and no Load screen
  await expectBanners(page, { example: true });
  await expect(page.locator('dl.facts').first()).toContainText('1, Protection');
  expect(await readStore(page, 'protocol')).toHaveLength(1);
});

test('a ticked emergency item blocks for the visit, and only a fresh visit continues', async ({ page }) => {
  await toRedFlag(page);
  await expectBanners(page, { example: true });
  const carry = page.getByRole('button', { name: 'None of these apply. Continue' });

  await page.getByLabel('Sudden shortness of breath or chest pain.').check();
  const alert = page.getByRole('alert').filter({ hasText: BLOCK_EMERGENCY });
  await expect(alert).toBeVisible();
  await expect(alert).toContainText(NOTE);
  await expect(carry).toBeDisabled();

  // A care-team item gives the care-team message. The emergency message wins while both are ticked.
  await page.getByLabel('Your knee catches or locks.').check();
  await expect(page.getByRole('alert').filter({ hasText: BLOCK_EMERGENCY })).toBeVisible();
  await page.getByLabel('Sudden shortness of breath or chest pain.').uncheck();
  await expect(page.getByRole('alert')).toContainText(BLOCK_EMERGENCY);
  await expect(carry).toBeDisabled();

  // Unticking does not lift the block. Back to Home and a fresh visit start with an empty list.
  await page.getByLabel('Your knee catches or locks.').uncheck();
  await expect(carry).toBeDisabled();
  await page.getByRole('button', { name: 'Back to Home' }).click();
  await page.getByRole('button', { name: 'Start Heel slide' }).click();
  await expectScreen(page, 'Check before you exercise');
  await expect(carry).toBeEnabled();
  await carry.click();
  await expectScreen(page, 'Set up the camera');
});

test('there is no way to Setup or Session without the red-flag step', async ({ page }) => {
  await toHome(page);
  // The app has no URL router. A direct address loads the app, and the app opens Home.
  for (const path of ['/setup', '/session', '/#setup', '/#session', '/summary']) {
    await page.goto(path);
    await expectScreen(page, 'Today');
  }

  // A cleared check does not survive a Cancel: the next start asks again.
  await page.getByRole('button', { name: 'Start Heel slide' }).click();
  await page.getByRole('button', { name: 'None of these apply. Continue' }).click();
  await expectScreen(page, 'Set up the camera');
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expectScreen(page, 'Today');
  await page.getByRole('button', { name: 'Start Heel slide' }).click();
  await expectScreen(page, 'Check before you exercise');

  // The same after a full session: Stop, Summary, Done, and a new start.
  await page.getByRole('button', { name: 'None of these apply. Continue' }).click();
  await page.getByRole('button', { name: 'Next: set up the camera' }).click();
  await startCamera(page);
  await page.getByRole('button', { name: 'Start exercise' }).click();
  await expectScreen(page, 'Heel slide');
  await stopButton(page).click();
  await expectScreen(page, 'Summary');
  await page.getByLabel('2', { exact: true }).check();
  await page.getByLabel('No swelling').check();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('button', { name: 'Done' }).click();
  await expectScreen(page, 'Today');
  await page.getByRole('button', { name: 'Start Heel slide' }).click();
  await expectScreen(page, 'Check before you exercise');

  // The browser history cannot skip the check. A Back press stays inside the app and goes Home (F3).
  // Forward does nothing. Home never leads into Setup without the check.
  await page.goto('about:blank');
  await page.goto('/');
  await expectScreen(page, 'Today');
  await page.getByRole('button', { name: 'Start Heel slide' }).click();
  await page.getByRole('button', { name: 'None of these apply. Continue' }).click();
  await expectScreen(page, 'Set up the camera');
  await page.goBack(); // Back stays in the app: it goes Home, not to about:blank
  await expectScreen(page, 'Today');
  expect(page.url()).not.toBe('about:blank');
  await page.goForward(); // Forward is undone at once
  await expectScreen(page, 'Today');
  await page.getByRole('button', { name: 'Start Heel slide' }).click();
  await expectScreen(page, 'Check before you exercise'); // the check is asked again: no way around it
  await page.getByRole('button', { name: 'None of these apply. Continue' }).click();
  await expectScreen(page, 'Set up the camera');
  // The same with history.back() called from the page.
  await page.evaluate(() => history.back());
  await expectScreen(page, 'Today');
  await page.evaluate(() => history.forward());
  await expectScreen(page, 'Today');
  // After a reload the first start still goes through the check.
  await page.reload();
  await expectScreen(page, 'Today');
  await page.getByRole('button', { name: 'Start Heel slide' }).click();
  await expectScreen(page, 'Check before you exercise');
});

test('the guide step, the camera step and the setup rules', async ({ page }) => {
  await toSetupGuide(page);
  await expectBanners(page, { example: true });
  // B3: one step at a time. The title names the step. "Show all steps" lists the six notes.
  await expect(page.getByRole('heading', { name: /^Step 1 of 6/ })).toBeVisible();
  await page.getByRole('button', { name: 'Show all steps' }).click();
  for (const label of ['Start position', 'Leg and camera', 'Hands and support', 'Range', 'Speed', 'What the camera must see']) {
    await expect(page.locator('dt', { hasText: label })).toBeVisible();
  }
  // One drawing at a time (start, end or the camera guide), each an image with a text alternative.
  const drawings = page.getByRole('img');
  await expect(drawings).toHaveCount(1);
  for (const n of [4, 6]) {
    await page.getByRole('button', { name: new RegExp(`^Step ${n},`) }).click();
    await expect(page.getByRole('heading', { name: new RegExp(`^Step ${n} of 6`) })).toBeFocused();
    await expect(drawings).toHaveCount(1);
  }
  for (const svg of await drawings.all()) expect(((await svg.getAttribute('aria-label')) ?? '').length).toBeGreaterThan(20);
  await expect(page.getByText('Your limit is 90 degrees. Your care team sets it.')).toBeVisible();

  await page.getByRole('button', { name: 'Next: set up the camera' }).click();
  await expect(page.getByText('It does not record or send video.')).toBeVisible();
  await startCamera(page);
  await expect(page.getByTestId('instruction')).not.toBeEmpty();
  const rules = page.getByRole('list', { name: 'Camera check' }).getByRole('listitem');
  await expect(rules).toHaveCount(6);
  for (const text of await rules.allTextContents()) expect(text).toMatch(/: (seen|not seen)$/);
});

test('Stop in Session lands on Summary', async ({ page }) => {
  await toSession(page);
  await expectBanners(page, { example: true });
  await expect(page.getByText('estimated angle, not a medical measurement')).toBeVisible();
  await stopButton(page).click();
  await expectScreen(page, 'Summary');
  await expect(page.getByText('You pressed "Knee gave way or hurts".')).toHaveCount(0);
  await expectBanners(page, { example: true });
});

test('the gave-way button ends the session and shows the care-team message', async ({ page }) => {
  await toSession(page);
  await page.getByRole('button', { name: 'Knee gave way or hurts' }).click();
  await expectScreen(page, 'Summary');
  await expect(page.getByRole('alert')).toContainText('Stop. Do not exercise. Contact your care team.');
});

async function answer(page: Page, pain: string, swelling: string) {
  await page.getByLabel(pain, { exact: true }).check();
  await page.getByLabel(swelling).check();
}

test('the pause message shows from the answers, without Save (S-01)', async ({ page }) => {
  await toSummary(page);
  const pause = page.getByText(PAUSE);
  await expect(pause).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();

  await answer(page, '2', 'No swelling');
  await expect(pause).toHaveCount(0);

  await answer(page, '7', 'No swelling');
  await expect(pause).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeEnabled(); // Save was not pressed

  await answer(page, '2', 'No swelling');
  await expect(pause).toHaveCount(0);

  await answer(page, '2', 'More than before');
  await expect(pause).toBeVisible();
  await answer(page, '2', 'Some swelling');
  await expect(pause).toHaveCount(0);
});

test('Save writes one session with the fixed fields and no image data (FR6)', async ({ page }) => {
  await toSummary(page);
  await answer(page, '3', 'Some swelling');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Session saved.')).toBeVisible();

  const sessions = await readStore(page, 'sessions');
  expect(sessions).toHaveLength(1);
  const fields = [
    'date', 'exercise', 'side', 'reps', 'peakFlexion', 'holdSeconds', 'topFlexion', 'marginDeg', 'marginSource', 'view',
    'nearLimit', 'overLimit', 'tooFast', 'gaveWayPresses', 'redFlagBlocks', 'pain', 'swelling', 'protocolId', 'phase', 'schemaVersion',
    // Optional fields of the set logic and the leg choice. The heel slide of the example protocol sets them all.
    'setsPrescribed', 'repsPrescribed', 'repsPerSet', 'legTracked', 'cameraSide',
  ];
  expect(Object.keys(sessions[0]!).sort()).toEqual([...fields, 'id'].sort());
  expect(sessions[0]).toMatchObject({ exercise: 'heel-slide', side: 'left', pain: 3, swelling: 'some', protocolId: 'example-001', schemaVersion: 1 });

  // No value is a Blob, a typed array or a data URL, in IndexedDB and in localStorage.
  const stores = [...sessions, ...(await readStore(page, 'protocol'))];
  const bad = (v: unknown): boolean => typeof v === 'string' ? v.startsWith('data:') : v !== null && typeof v === 'object' && !Array.isArray(v) ? true : false;
  for (const record of stores) for (const value of Object.values(record)) expect(bad(value), JSON.stringify(value).slice(0, 80)).toBe(false);
  const local = await page.evaluate(() => Object.entries(localStorage).map(([k, v]) => [k, v]));
  for (const [key, value] of local) {
    expect(String(value).startsWith('data:'), key).toBe(false);
  }
});

test('a double press on Save keeps one record', async ({ page }) => {
  await toSummary(page);
  await answer(page, '1', 'No swelling');
  await page.getByRole('button', { name: 'Save', exact: true }).dblclick();
  await expect(page.getByText('Session saved.')).toBeVisible();
  expect(await readStore(page, 'sessions')).toHaveLength(1);
});

// D6: the block is in the sticky bar. After one tick it is inside the window at any scroll position and on small screens.
for (const [width, height] of [[390, 844], [320, 568]] as const) {
  test(`red flag: the block is inside the window after one tick at ${width} x ${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await toRedFlag(page);
    await page.evaluate(() => window.scrollTo(0, 0)); // the list is far above the old place of the block
    await page.getByRole('checkbox').nth(1).check();
    const alert = page.getByRole('alert').filter({ hasText: BLOCK_EMERGENCY });
    await expect(alert).toBeVisible();
    const box = (await alert.boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(height);
    await expect(page.getByRole('button', { name: 'Back to Home' })).toBeInViewport();
    await expect(page.getByRole('button', { name: /None of these apply/ })).toBeDisabled();
  });
}
