// Every run is saved when it ends. The person never presses Save and still finds the run in Your sessions.
import { expect, test, type Page } from '@playwright/test';
import { expectScreen, installProbes, readStore, stopButton, toSession } from './helpers/app';

test.beforeEach(async ({ page }) => {
  await installProbes(page);
});

async function findInYourSessions(page: Page) {
  await page.getByRole('button', { name: 'Your sessions' }).click();
  await expectScreen(page, 'Your sessions');
  await expect(page.getByText(/no sessions/i)).toHaveCount(0);
  await expect(page.getByRole('table').first()).toBeVisible();
  expect((await readStore(page, 'sessions')).length).toBe(1);
}

test('a run that ends with Stop is found after a reload, and the person never pressed Save', async ({ page }) => {
  await toSession(page);
  await stopButton(page).click();
  await expectScreen(page, 'Summary');
  await page.reload(); // the tab closes here: no question was answered
  await expectScreen(page, 'Home');
  await findInYourSessions(page);
  const [record] = await readStore(page, 'sessions');
  expect(record).toMatchObject({ exercise: 'heel-slide', gaveWayPresses: 0 });
  expect(record).not.toHaveProperty('pain');
});

test('Back of the browser from the Session saves the run', async ({ page }) => {
  await toSession(page);
  await page.goBack();
  await expectScreen(page, 'Summary');
  await page.reload();
  await expectScreen(page, 'Home');
  await findInYourSessions(page);
});

test('Save adds the answers to the record that exists and makes no second one', async ({ page }) => {
  await toSession(page);
  await stopButton(page).click();
  await expectScreen(page, 'Summary');
  await page.getByLabel('3', { exact: true }).check();
  await page.getByLabel('Some swelling').check();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Session saved.')).toBeVisible();
  const rows = await readStore(page, 'sessions');
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ pain: 3, swelling: 'some' });
});
