// "Check my progress" on the real built app, with the progression flag at its default (on).
// The phase never changes without Confirm, a saved session survives a reload, a safety event holds the next stage,
// and the screen passes axe, the target size and the word check at two sizes in light and dark.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { expectScreen, installProbes, PROTOTYPE_BANNER, readStore } from './helpers/app';
import { press, radio, toHomeWithPlan } from './helpers/plan';
import { hasVerdictWord } from '../tests/ui/verdict';

// The fixed text of the app for the margin source. The schema accepts only the listed values.
const MARGIN_SOURCE = 'start value, UNVERIFIED for the lite model (Okuno 2026, highest-complexity model, tablet, healthy adults)';
const HOLD_EVENT = 'Contact your care team before the next stage. The app recorded a safety event after the date of your plan.';
const WEEK8_SHIFT_DAYS = 32; // the plan starts in week 3 (24 days), so 24 + 32 = 56 days is week 8

test.beforeEach(async ({ page }) => {
  await installProbes(page);
});

const planRaw = async (page: Page) => ((await readStore(page, 'protocol')) as { raw: string }[])[0]!.raw;
const goCheck = async (page: Page) => {
  await page.getByRole('button', { name: 'Check my progress' }).first().click();
  await expectScreen(page, 'Check my progress');
};

/** Adds one valid session row straight to IndexedDB, then reloads so the app reads it. Only numbers are stored, never a frame. */
async function seedSession(page: Page, extra: Record<string, unknown> = {}) {
  const protocolId = (JSON.parse(await planRaw(page)) as { id: string }).id;
  const row = {
    date: new Date().toISOString(), exercise: 'heel-slide', side: 'left', reps: 8, peakFlexion: 84, holdSeconds: null, topFlexion: null,
    marginDeg: 9, marginSource: MARGIN_SOURCE, view: 'side', nearLimit: 0, overLimit: 0, tooFast: 0, gaveWayPresses: 0, redFlagBlocks: 0,
    pain: 2, swelling: 'none', protocolId, phase: 1, schemaVersion: 1, ...extra,
  };
  await page.evaluate(
    (r) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('mpfl-rehab');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('sessions', 'readwrite');
          tx.objectStore('sessions').add(r);
          tx.oncomplete = () => { db.close(); resolve(); };
          tx.onerror = () => reject(tx.error);
        };
      }),
    row,
  );
  await page.reload();
  await expectScreen(page, 'Home');
}

/** Answers the clearance question with yes and the three extended questions, then presses Check my plan. */
async function answerNextStage(page: Page) {
  await radio(page, '2'); await radio(page, 'No swelling');
  await radio(page, 'Yes');
  for (const legend of ['Do you walk without crutches?', 'Can you lift your leg with a straight knee, with no bend in the knee while the leg is up?', 'Did your surgeon say that you can do knee straightening exercises while you sit?']) {
    await page.getByRole('group', { name: legend }).getByRole('radio', { name: 'Yes', exact: true }).check();
  }
  await press(page, 'Check my plan');
  await expectScreen(page, 'Confirm the change');
}

async function toUpdateFromCheck(page: Page) {
  await goCheck(page);
  await press(page, 'Update my plan');
  await expectScreen(page, 'Update my plan');
  await answerNextStage(page);
}

test('the phase never changes without Confirm, the flag at its default', async ({ page }) => {
  await toHomeWithPlan(page);
  const before = await planRaw(page);
  await page.clock.setFixedTime(new Date(Date.now() + WEEK8_SHIFT_DAYS * 86_400_000));
  await page.reload();
  await expectScreen(page, 'Home');
  await toUpdateFromCheck(page);
  expect(JSON.parse(await planRaw(page)).activePhase).toBe(1); // Check my plan saves nothing
  await press(page, 'Keep my plan');
  await expectScreen(page, 'Home');
  expect(await planRaw(page)).toBe(before);

  await toUpdateFromCheck(page);
  await press(page, 'Confirm');
  await expectScreen(page, 'Home');
  expect(JSON.parse(await planRaw(page)).activePhase).toBe(2);
});

test('a saved session is still there after a reload: Home, Your sessions and Check my progress show it', async ({ page }) => {
  await toHomeWithPlan(page);
  await seedSession(page);
  await expect(page.getByText(/^Last session: .*peak knee bend 84 degrees/)).toBeVisible();
  await page.getByRole('button', { name: 'Your sessions' }).click();
  await expectScreen(page, 'Your sessions');
  await expect(page.getByText('0 sessions')).toHaveCount(0);
  await expect(page.getByRole('table').first()).toBeVisible();
  expect(await readStore(page, 'sessions')).toHaveLength(1);
  await page.getByRole('button', { name: 'Back' }).click();
  await goCheck(page);
  await expect(page.getByText(/Peak knee bend, heel slide, last session: 84 degrees/).first()).toBeVisible();
});

test('a safety event since the plan date shows HOLD_EVENT, and Update my plan shows the hold with no way forward', async ({ page }) => {
  await toHomeWithPlan(page);
  await seedSession(page, { gaveWayPresses: 1 });
  await page.clock.setFixedTime(new Date(Date.now() + WEEK8_SHIFT_DAYS * 86_400_000));
  await page.reload();
  await expectScreen(page, 'Home');
  await goCheck(page);
  await expect(page.getByRole('heading', { name: 'Safety events since your plan date' })).toBeVisible();
  await expect(page.getByText(HOLD_EVENT)).toBeVisible();
  await press(page, 'Update my plan');
  await expectScreen(page, 'Update my plan');
  await radio(page, '2'); await radio(page, 'No swelling');
  await radio(page, 'Yes');
  for (const legend of ['Do you walk without crutches?', 'Can you lift your leg with a straight knee, with no bend in the knee while the leg is up?', 'Did your surgeon say that you can do knee straightening exercises while you sit?']) {
    await page.getByRole('group', { name: legend }).getByRole('radio', { name: 'Yes', exact: true }).check();
  }
  const before = await planRaw(page);
  await press(page, 'Check my plan');
  await expect(page.getByText(HOLD_EVENT)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirm', exact: true })).toHaveCount(0);
  expect(await planRaw(page)).toBe(before);
});

for (const size of [{ width: 360, height: 640 }, { width: 1280, height: 800 }]) {
  for (const scheme of ['light', 'dark'] as const) {
    test.describe(`Check my progress at ${size.width} x ${size.height}, ${scheme}`, () => {
      test.use({ viewport: size, colorScheme: scheme });
      test('axe finds no violation, targets are 44 px, no horizontal scroll, the banner shows, no verdict word', async ({ page }) => {
        await toHomeWithPlan(page);
        await seedSession(page, { gaveWayPresses: 1 });
        await page.clock.setFixedTime(new Date(Date.now() + WEEK8_SHIFT_DAYS * 86_400_000));
        await page.reload();
        await goCheck(page);
        const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
        expect(violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target.join(' ')) }))).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        await expect(page.getByRole('note').filter({ hasText: PROTOTYPE_BANNER })).toBeVisible();
        const small = await page.evaluate(() =>
          [...document.querySelectorAll('button')]
            .map((el) => ({ name: el.textContent?.trim(), b: el.getBoundingClientRect() }))
            .filter(({ b }) => b.width > 0 && b.height > 0 && (b.width < 43.5 || b.height < 43.5))
            .map(({ name, b }) => `button "${name}" ${Math.round(b.width)}x${Math.round(b.height)}`),
        );
        expect(small).toEqual([]);
        const main = (await page.locator('main, #root').first().innerText()).replace(PROTOTYPE_BANNER, '');
        expect(hasVerdictWord(main)).toBeNull();
      });
    });
  }
}
