// B5-04: the lock box and its button sit fully above the fixed bar, and a press does not scroll the page or hide the banner.
// Real webcam clips are needed and they are not in the repo. The spec is skipped without these variables. Run it twice:
//   LIVE_CASE=heel320 LIVE_CLIP=/path/t1-heel-shift-left.mjpeg      (heel slide, 320 x 568)
//   LIVE_CASE=slr1280 LIVE_CLIP=/path/08-straight-leg-raise-oblique.mjpeg  (straight leg raise with "Count this rep" in the bar, 1280 x 800)
import { expect, test, type Page } from "@playwright/test";
import { EXAMPLE, expectScreen } from "./helpers/app";

const CLIP = process.env.LIVE_CLIP;
const CASE = process.env.LIVE_CASE;
const args = (clip: string | undefined) => ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", `--use-file-for-fake-video-capture=${clip ?? ""}`];

async function toLock(page: Page, exercise: string, leg: "left" | "right") {
  await page.goto("/");
  await page.getByRole("button", { name: "I understand" }).click();
  await page.getByLabel("Choose a file from your care team").setInputFiles(EXAMPLE);
  await expectScreen(page, "Today");
  await page.getByRole("button", { name: `Start ${exercise}` }).click();
  await page.getByRole("button", { name: "None of these apply. Continue" }).click();
  const radio = page.locator(`input[name=exercise-leg][value=${leg}]`);
  if (!(await radio.isChecked())) {
    await radio.check({ force: true });
    const c = page.getByRole("button", { name: "Continue with this leg" });
    if (await c.count()) await c.click();
  }
  await page.getByRole("button", { name: "Next: set up the camera" }).click();
  await page.getByRole("button", { name: "Start camera" }).click();
  await page.getByRole("button", { name: "Start exercise" }).click({ timeout: 60_000 });
  await expect(page.getByRole("button", { name: "Follow me again" })).toBeVisible({ timeout: 90_000 });
}

async function geometry(page: Page) {
  return page.evaluate(() => {
    const box = document.querySelector(".lock-box")!.getBoundingClientRect();
    const bar = document.querySelector(".session-bar")!.getBoundingClientRect();
    const banners = document.querySelector(".banners")?.getBoundingClientRect();
    return { boxBottom: box.bottom, barTop: bar.top, scrollY: window.scrollY, bannerTop: banners ? banners.top : 0 };
  });
}

async function checkPress(page: Page) {
  const before = await geometry(page);
  expect(before.boxBottom, `the lock box ends at ${Math.round(before.boxBottom)}, the bar starts at ${Math.round(before.barTop)}`).toBeLessThanOrEqual(before.barTop + 0.5);
  expect(before.scrollY).toBe(0);
  await page.getByRole("button", { name: "Follow me again" }).focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1500);
  const after = await geometry(page);
  expect(after.scrollY, "the page does not scroll after the press").toBe(0);
  expect(after.bannerTop, "the banner stays in view").toBeGreaterThanOrEqual(0);
}

test.skip(CLIP === undefined || CASE === undefined, "manual: needs the webcam clip, see app/audit/README.md");
test.use({ permissions: ["camera"], launchOptions: { args: args(CLIP) } });

test("B5-04 at 320 x 568, heel slide: the box is above the bar and the press does not scroll", async ({ page }) => {
  test.skip(CASE !== "heel320", "case heel320 only");
  test.setTimeout(150_000);
  await page.setViewportSize({ width: 320, height: 568 });
  await toLock(page, "Heel slide", "left");
  await checkPress(page);
});

test("B5-04 at 1280 x 800, straight leg raise: the box is above the bar that holds Count this rep, and the press does not scroll", async ({ page }) => {
  test.skip(CASE !== "slr1280", "case slr1280 only");
  test.setTimeout(150_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await toLock(page, "Straight leg raise", "right");
  await expect(page.getByRole("button", { name: "Count this rep" })).toBeVisible();
  await checkPress(page);
});
