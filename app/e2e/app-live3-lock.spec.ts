// B4-03 and B4-06 with a real clip: the patient shifts in the picture, so the lock box shows. It needs a clip file.
// Run: LIVE_TRAP_CLIP=/path/to/t1-heel-shift-left.mjpeg npx playwright test e2e/app-live3-lock.spec.ts
// Without the variable the spec is skipped. The clip is a webcam clip of 33 MB and is not in the repo.
import { expect, test, type Page } from "@playwright/test";
import { expectScreen } from "./helpers/app";
import { EXAMPLE } from "./helpers/app";

const CLIP = process.env.LIVE_TRAP_CLIP;
test.skip(CLIP === undefined, "set LIVE_TRAP_CLIP to run this spec");
test.use({
  launchOptions: { args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", `--use-file-for-fake-video-capture=${CLIP ?? ""}`] },
  permissions: ["camera"],
});

async function toLock(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "I understand" }).click();
  await page.getByLabel("Choose a file from your care team").setInputFiles(EXAMPLE);
  await expectScreen(page, "Home");
  await page.getByRole("button", { name: "Start Heel slide" }).click();
  await page.getByRole("button", { name: "None of these apply. Continue" }).click();
  await page.getByRole("button", { name: "Next: set up the camera" }).click();
  await page.getByRole("button", { name: "Start camera" }).click();
  await page.getByRole("button", { name: "Start exercise" }).click({ timeout: 60_000 });
  await expect(page.getByRole("button", { name: "Follow me again" })).toBeVisible({ timeout: 90_000 });
}

for (const size of [
  { width: 320, height: 568 },
  { width: 360, height: 640 },
  { width: 390, height: 844 },
  { width: 1280, height: 800 },
]) {
  test(`B4-03 at ${size.width} x ${size.height}: the Follow me again button is fully above the bar`, async ({ page }) => {
    test.setTimeout(150_000);
    await page.setViewportSize(size);
    await toLock(page);
    const m = await page.evaluate(() => {
      const b = [...document.querySelectorAll("button")].find((x) => x.textContent?.trim() === "Follow me again")!.getBoundingClientRect();
      const bar = document.querySelector(".session-bar")!.getBoundingClientRect();
      return { top: b.top, bottom: b.bottom, height: b.height, barTop: bar.top, vh: innerHeight };
    });
    expect(m.height).toBeGreaterThanOrEqual(47.5);
    expect(m.top).toBeGreaterThanOrEqual(0);
    expect(m.bottom, `button ${Math.round(m.top)} to ${Math.round(m.bottom)}, bar starts at ${Math.round(m.barTop)}`).toBeLessThanOrEqual(m.barTop + 0.5);
  });
}

test("B4-06: Enter on the button keeps the focus inside the page content", async ({ page }) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await toLock(page);
  await page.getByRole("button", { name: "Follow me again" }).focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1500);
  const a = await page.evaluate(() => ({ tag: document.activeElement?.tagName, role: document.activeElement?.getAttribute("role"), cls: document.activeElement?.className }));
  expect(a.tag, JSON.stringify(a)).not.toBe("BODY");
});
