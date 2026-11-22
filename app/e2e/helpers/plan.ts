import { expect, type Page } from '@playwright/test';
import { expectScreen } from './app';

export const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const ago = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return iso(d);
};
export const WEEK3 = 24;

export const radio = (page: Page, name: string) => page.getByRole('radio', { name, exact: true }).check();
export const press = (page: Page, name: string) => page.getByRole('button', { name, exact: true }).click();
export const next = (page: Page) => press(page, 'Next');
export const h1 = (page: Page, name: string | RegExp) => expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
export const readInputs = (page: Page) => readAny(page, 'generatorInputs');

/** Every record of an IndexedDB store. It also works for the table of the generator answers. */
export const readAny = (page: Page, store: string) =>
  page.evaluate(
    (name) =>
      new Promise<unknown[]>((resolve, reject) => {
        const open = indexedDB.open('mpfl-rehab');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          if (!db.objectStoreNames.contains(name)) {
            db.close();
            resolve([]);
            return;
          }
          const all = db.transaction(name).objectStore(name).getAll();
          all.onsuccess = () => {
            db.close();
            resolve(all.result);
          };
          all.onerror = () => reject(all.error);
        };
      }),
    store,
  );

/** The legend of each question of the 3 groups. A legend names its group of radio buttons. */
export const QUESTION = {
  written: 'Did your care team give you a written rehab plan?',
  procedure: 'Which operation did you have?',
  age: 'How old are you?',
  both: 'Did you have surgery on both knees?',
  first: 'Is this your first MPFL surgery on this knee?',
  rules: 'Did your surgeon give special rules',
  side: 'Which knee did you have surgery on?',
  limit: 'Did your surgeon give a limit for how far you can bend your knee',
  clearance: 'Has your surgeon or physiotherapist said that you can start the next stage?',
} as const;

/** Answers one question of a group screen. Several questions share the answer names, so the legend picks the group. */
export const pick = (page: Page, question: string, answer: string) =>
  page.getByRole('group', { name: question }).getByRole('radio', { name: answer, exact: true }).check();

/** Types a date as day, month and year, the three number fields of the date question. */
export async function fillDate(page: Page, iso: string) {
  const [y, m, d] = iso.split('-') as [string, string, string];
  await page.getByLabel('Day', { exact: true }).fill(String(Number(d)));
  await page.getByLabel('Month', { exact: true }).fill(String(Number(m)));
  await page.getByLabel('Year', { exact: true }).fill(y);
}

/** Answers the 6 questions of group 1. The default answers allow a plan. One answer can change to cause a referral. */
export async function answerAbout(page: Page, procedure = 'MPFL reconstruction only', written = 'No') {
  await pick(page, QUESTION.written, written);
  await pick(page, QUESTION.procedure, procedure);
  await pick(page, QUESTION.age, '18 or older');
  await pick(page, QUESTION.both, 'No');
  await pick(page, QUESTION.first, 'Yes');
  await pick(page, QUESTION.rules, 'No');
}

/** Answers group 1 with the answers that allow a plan, and goes on to group 2. */
export async function referralQuestions(page: Page) {
  await h1(page, 'You and your surgery');
  await answerAbout(page);
  await press(page, 'Continue to your surgeon');
}

/** The Load screen. The first launch shows Privacy first. A later visit goes straight to Load. */
export async function toLoadAny(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: /^(Privacy|Load protocol file)$/ })).toBeVisible();
  const understand = page.getByRole('button', { name: 'I understand' });
  if (await understand.isVisible()) await understand.click();
  await expectScreen(page, 'Load protocol file');
}

/** From the first launch to the summary. `days` is the age of the surgery in days. */
export async function toSummary(page: Page, days = WEEK3, limit: string | null = '60') {
  await toLoadAny(page);
  await press(page, 'Create my plan');
  await referralQuestions(page);
  await h1(page, 'Your surgeon');
  await fillDate(page, ago(days));
  await pick(page, QUESTION.side, 'Left');
  if (limit === null) await pick(page, QUESTION.limit, 'No limit');
  else {
    await pick(page, QUESTION.limit, 'Yes, my limit is');
    await page.getByLabel('Limit in degrees').fill(limit);
  }
  await press(page, 'Continue to today');
  await h1(page, 'How are you today?');
  await radio(page, '2'); await radio(page, 'No swelling'); // red flags: none ticked
  if (days >= 49) await pick(page, QUESTION.clearance, 'No');
  await press(page, 'Check my answers');
  await expectScreen(page, 'Check your answers');
}

export async function toPlan(page: Page) {
  await toSummary(page);
  await press(page, 'Make my plan');
  await expectScreen(page, 'Your plan');
}

export async function toConfirm(page: Page) {
  await toPlan(page);
  await press(page, 'Use this plan');
  await expectScreen(page, 'Confirm your plan');
}

export async function toHomeWithPlan(page: Page) {
  await toConfirm(page);
  await press(page, 'Confirm');
  await expectScreen(page, 'Today');
}

export async function toUpdate(page: Page) {
  await press(page, 'Update my plan');
  await expectScreen(page, 'Update my plan');
  await expect(page.getByRole('button', { name: 'Check my plan' })).toBeVisible();
}
