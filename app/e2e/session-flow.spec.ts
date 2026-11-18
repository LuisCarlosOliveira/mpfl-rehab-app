// Today's session on the real built app with the fake camera: one check, the next exercise opens by itself, one summary.
// The spec counts the presses that it makes and the screens (h1 changes) that it sees. The numbers go to the report.
import { readFileSync } from 'node:fs';
import { mkdirSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { EXAMPLE, expectBanners, expectScreen, installProbes, readStore, stopButton, trackStates } from './helpers/app';

test.setTimeout(300_000);

const PLAN = [
  { kind: 'heel-slide', name: 'Heel slide', cam: true },
  { kind: 'straight-leg-raise', name: 'Straight leg raise', cam: true },
  { kind: 'quad-set', name: 'Quadriceps set', cam: false },
  { kind: 'gluteal-set', name: 'Gluteal set', cam: false },
  { kind: 'ankle-pump', name: 'Ankle pump', cam: true },
  { kind: 'leg-raise-side', name: 'Leg raise to the side', cam: true },
] as const;

/** The example protocol with six exercises in phase 1. */
function sixFile() {
  const base = JSON.parse(readFileSync(EXAMPLE, 'utf8'));
  const heel = base.phases[0].exercises[0];
  const slr = base.phases[0].exercises[1];
  const extra = (kind: string) => ({ kind, sets: 2, reps: 10, source: 'PROPOSAL' });
  base.phases[0].exercises = [heel, slr, extra('quad-set'), extra('gluteal-set'), extra('ankle-pump'), extra('leg-raise-side')];
  return { name: 'six.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(base)) };
}

declare global {
  interface Window {
    __screens: string[];
  }
}

test.beforeEach(async ({ page }) => {
  await installProbes(page);
  // The screens that the person sees, one entry for each change of the h1. The load screen of a lazy chunk does not count.
  await page.addInitScript(() => {
    window.__screens = [];
    let last = '';
    const record = () => {
      const h = document.querySelector('main h1')?.textContent?.trim() ?? '';
      if (h && h !== last && h !== 'Loading') {
        last = h;
        window.__screens.push(h);
      }
    };
    new MutationObserver(record).observe(document, { subtree: true, childList: true, characterData: true });
  });
});

async function toHomeSix(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'I understand' }).click();
  await page.getByLabel('Choose a file from your care team').setInputFiles(sixFile());
  await expectScreen(page, 'Today');
}

const gum = (page: Page) => page.evaluate(() => window.__probes.gumCalls);
const screens = (page: Page) => page.evaluate(() => window.__screens);
const press = (page: Page, name: string | RegExp, exact = true) => page.getByRole('button', { name, exact });

interface Count {
  taps: number;
}
const tapper = (count: Count) => async (target: Locator) => {
  count.taps += 1;
  await target.click();
};

/** One whole session. `first` is true when the guides were never seen. Answers: skip the questions (the shortest way). */
async function runSession(page: Page, count: Count, first: boolean, shots?: (name: string) => Promise<void>) {
  const tap = tapper(count);
  await tap(press(page, "Start today's session"));
  await expectScreen(page, 'Check before you exercise');
  await tap(press(page, 'None of these apply. Continue'));
  for (const [i, ex] of PLAN.entries()) {
    const prev = PLAN[i - 1];
    if (i > 0) {
      await expectScreen(page, `Next: ${ex.name}`);
      await expect(page.getByText(`Exercise ${i + 1} of ${PLAN.length}`)).toBeVisible();
      if (shots) await shots(`next-${i}`);
      await tap(press(page, 'Start now'));
    }
    if (ex.cam) {
      await expectScreen(page, 'Set up the camera');
      if (first) await tap(press(page, 'Next: set up the camera'));
      // The camera of the exercise before is still on: no press. Otherwise the person presses Start camera (the browser asks after a press).
      if (first || !prev?.cam) await tap(press(page, 'Start camera'));
      await expect(page.getByTestId('instruction')).toBeVisible({ timeout: 60_000 });
      if (shots && i === 1) await shots('setup-camera');
      await tap(press(page, 'Start exercise'));
    } else {
      await expectScreen(page, 'Get ready');
      if (shots && i === 2) await shots('get-ready-timer');
      await tap(press(page, 'Start exercise'));
    }
    await expectScreen(page, ex.name);
    await expect(page.getByText(`Exercise ${i + 1} of ${PLAN.length}`)).toBeVisible();
    if (shots && (i === 1 || i === 2)) await shots(`session-${i}`);
    await tap(stopButton(page));
    await expectScreen(page, 'Done');
    if (shots && i === 1) await shots('done');
    await tap(press(page, 'Skip the questions'));
  }
  await expectScreen(page, "Today's session");
  if (shots) await shots('overview');
  await tap(press(page, 'Done'));
  await expectScreen(page, 'Today');
}

test('the whole plan session: one check, no Home in between, one summary, one row for each exercise', async ({ page }) => {
  await toHomeSix(page);
  await expectBanners(page, { example: true });
  const count: Count = { taps: 0 };
  await runSession(page, count, true);
  const seen = await screens(page);
  // The check shows once. Home shows at the start and at the end only.
  expect(seen.filter((h) => h === 'Check before you exercise')).toHaveLength(1);
  expect(seen.filter((h) => h === 'Today')).toHaveLength(2);
  expect(seen.filter((h) => h === "Today's session")).toHaveLength(1);
  // Every exercise saved its own row, as before.
  const rows = await readStore(page, 'sessions');
  expect(rows.map((r) => r.exercise)).toEqual(PLAN.map((p) => p.kind));
  // Every banner stays on the new screens, and the stored rows hold no frame.
  await expectBanners(page, { example: true });
  expect(JSON.stringify(rows)).not.toMatch(/data:image|blob:/);
  console.log(`FIRST SESSION (guides never seen): ${count.taps} presses, ${seen.length} screens`);
  console.log(`SCREENS: ${seen.join(' > ')}`);
});

test('second session: compact Get ready, remembered leg, fewer presses. The camera stream stays between camera exercises', async ({ page }) => {
  await toHomeSix(page);
  const first: Count = { taps: 0 };
  await runSession(page, first, true);
  await expectScreen(page, 'Today');
  const screensBefore = (await screens(page)).length;
  const second: Count = { taps: 0 };
  const gumBefore = await gum(page);
  await runSession(page, second, false);
  const seen = (await screens(page)).slice(screensBefore);
  // The check comes back for a new session.
  expect(seen.filter((h) => h === 'Check before you exercise')).toHaveLength(1);
  // The full guide never shows again: no "Next: set up the camera" step.
  expect(await page.getByRole('button', { name: 'Next: set up the camera' }).count()).toBe(0);
  // getUserMedia ran for the three camera blocks only: (heel, slr) (ankle, side) and no restart inside a block.
  // Block 1 starts with a press. After the two timers the camera starts again with a press. That is two calls in all.
  expect(await gum(page)).toBe(gumBefore + 2);
  expect(second.taps).toBeLessThan(first.taps);
  console.log(`SECOND SESSION (compact): ${second.taps} presses, ${seen.length} screens`);
  console.log(`SCREENS: ${seen.join(' > ')}`);
  // The camera is off at the end.
  await expect.poll(async () => (await trackStates(page)).every((s) => s.endsWith('ended'))).toBe(true);
});

test('the red-flag check returns when the person leaves the session', async ({ page }) => {
  await toHomeSix(page);
  await press(page, "Start today's session").click();
  await press(page, 'None of these apply. Continue').click();
  await expectScreen(page, 'Set up the camera');
  await press(page, 'Cancel').click();
  await expectScreen(page, 'Today');
  await press(page, "Start today's session").click();
  await expectScreen(page, 'Check before you exercise');
});

test('the Next card opens the next exercise after 5 seconds, and starts no movement', async ({ page }) => {
  await toHomeSix(page);
  await press(page, "Start today's session").click();
  await press(page, 'None of these apply. Continue').click();
  await press(page, 'Next: set up the camera').click();
  await press(page, 'Start camera').click();
  await expect(page.getByTestId('instruction')).toBeVisible({ timeout: 60_000 });
  await press(page, 'Start exercise').click();
  await expectScreen(page, 'Heel slide');
  await stopButton(page).click();
  await press(page, 'Skip the questions').click();
  await expectScreen(page, 'Next: Straight leg raise');
  const t0 = Date.now();
  await expect(page.getByRole('heading', { level: 1, name: 'Set up the camera' })).toBeVisible({ timeout: 10_000 }); // by itself, no press
  expect(Date.now() - t0).toBeGreaterThan(3500);
  // It is the Get ready screen: no Stop button, no count. The person still presses Start.
  await expect(stopButton(page)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Start exercise' }).or(page.getByRole('button', { name: 'Next: set up the camera' }))).toBeVisible();
});

test('Skip and Stop session on the Next card', async ({ page }) => {
  await toHomeSix(page);
  await press(page, "Start today's session").click();
  await press(page, 'None of these apply. Continue').click();
  await press(page, 'Next: set up the camera').click();
  await press(page, 'Start camera').click();
  await expect(page.getByTestId('instruction')).toBeVisible({ timeout: 60_000 });
  await press(page, 'Start exercise').click();
  await stopButton(page).click();
  await press(page, 'Skip the questions').click();
  await expectScreen(page, 'Next: Straight leg raise');
  await press(page, 'Skip').click();
  await expectScreen(page, 'Next: Quadriceps set');
  await press(page, 'Stop session').click();
  await expectScreen(page, "Today's session");
  const items = page.locator('.overview-item');
  await expect(items).toHaveCount(2);
  await expect(items.nth(1)).toContainText('Skipped');
  await expect.poll(async () => (await trackStates(page)).every((s) => s.endsWith('ended'))).toBe(true);
  expect((await readStore(page, 'sessions')).map((r) => r.exercise)).toEqual(['heel-slide']);
});

test('answers on the Done step are saved with the row, and a high pain answer ends the session', async ({ page }) => {
  await toHomeSix(page);
  await press(page, "Start today's session").click();
  await press(page, 'None of these apply. Continue').click();
  await press(page, 'Next: set up the camera').click();
  await press(page, 'Start camera').click();
  await expect(page.getByTestId('instruction')).toBeVisible({ timeout: 60_000 });
  await press(page, 'Start exercise').click();
  await stopButton(page).click();
  await expectScreen(page, 'Done');
  await page.getByLabel('9', { exact: true }).check();
  await page.getByLabel('No swelling').check();
  await press(page, 'Save and continue').click();
  await expect(page.getByText('Pause and contact your care team.').first()).toBeVisible();
  await expect(press(page, 'End session')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: /^Next:/ })).toHaveCount(0);
  await press(page, 'End session').click();
  await expectScreen(page, "Today's session");
  const rows = await readStore(page, 'sessions');
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ pain: 9, swelling: 'none' });
});

test('"Knee gave way or hurts" ends the whole session after the Done step', async ({ page }) => {
  await toHomeSix(page);
  await press(page, "Start today's session").click();
  await press(page, 'None of these apply. Continue').click();
  await press(page, 'Next: set up the camera').click();
  await press(page, 'Start camera').click();
  await expect(page.getByTestId('instruction')).toBeVisible({ timeout: 60_000 });
  await press(page, 'Start exercise').click();
  await page.getByRole('button', { name: /Knee gave way or hurts/ }).click();
  await expectScreen(page, 'Done');
  await press(page, 'Skip the questions').click();
  await expectScreen(page, "Today's session");
  await expect(page.getByText('Stop. Do not exercise. Contact your care team.')).toBeVisible();
  await expect.poll(async () => (await trackStates(page)).every((s) => s.endsWith('ended'))).toBe(true);
});

// Screenshots for the report. They run only when SFLOW_SHOTS names a folder.
const SHOTS = process.env.SFLOW_SHOTS;
for (const size of [
  { width: 360, height: 640 },
  { width: 1280, height: 800 },
]) {
  for (const scheme of ['dark', 'light'] as const) {
    test(`screenshots ${size.width}x${size.height} ${scheme}`, async ({ page }) => {
      test.skip(!SHOTS, 'set SFLOW_SHOTS to a folder');
      mkdirSync(SHOTS!, { recursive: true });
      await page.setViewportSize(size);
      await page.emulateMedia({ colorScheme: scheme });
      await toHomeSix(page);
      const tag = `${size.width}x${size.height}-${scheme}`;
      await page.screenshot({ path: `${SHOTS}/home-${tag}.png` });
      const shots = async (name: string) => {
        await page.screenshot({ path: `${SHOTS}/${name}-${tag}.png` });
      };
      // First session with the full guides, then a second one for the compact card.
      await runSession(page, { taps: 0 }, true, undefined);
      await runSession(page, { taps: 0 }, false, shots);
    });
  }
}
