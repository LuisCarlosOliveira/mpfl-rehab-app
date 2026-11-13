// The plan flow of the generator on the real built app. generator.spec.ts and progress.spec.ts share it.
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

/** Answers the six referral questions with the answers that allow a plan. */
export async function referralQuestions(page: Page) {
  await h1(page, 'Did your care team give you a written rehab plan?');
  await radio(page, 'No'); await next(page);
  await radio(page, 'MPFL reconstruction only'); await next(page);
  await radio(page, '18 or older'); await next(page);
  await radio(page, 'No'); await next(page);
  await radio(page, 'Yes'); await next(page);
  await radio(page, 'No'); await next(page);
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
  await page.getByLabel('Date of surgery').fill(ago(days)); await next(page);
  await radio(page, 'Left'); await next(page);
  if (limit === null) await radio(page, 'No limit');
  else {
    await radio(page, 'Yes, my limit is');
    await page.getByLabel('Limit in degrees').fill(limit);
  }
  await next(page);
  await next(page); // red flags: none ticked
  await radio(page, '2'); await radio(page, 'No swelling'); await next(page);
  if (days >= 49) {
    await h1(page, /Has your surgeon or physiotherapist said/);
    await radio(page, 'No'); await next(page);
  }
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
  await expectScreen(page, 'Home');
}

export async function toUpdate(page: Page) {
  await press(page, 'Update my plan');
  await expectScreen(page, 'Update my plan');
  await expect(page.getByRole('button', { name: 'Check my plan' })).toBeVisible();
}
