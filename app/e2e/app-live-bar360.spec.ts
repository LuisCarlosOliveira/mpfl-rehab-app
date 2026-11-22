import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { EXAMPLE, expectScreen, startCamera } from "./helpers/app";

async function toSession(page: Page, startName: string) {
  const protocol = JSON.parse(readFileSync(EXAMPLE, "utf8"));
  protocol.activePhase = 2;
  await page.goto("/");
  await page.getByRole("button", { name: "I understand" }).click();
  await page.getByLabel("Choose a file from your care team").setInputFiles({
    name: "p.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(protocol)),
  });
  await expectScreen(page, "Today");
  await page.getByRole("button", { name: startName }).click();
  await page.getByRole("button", { name: "None of these apply. Continue" }).click();
  await page.getByRole("button", { name: "Next: set up the camera" }).click();
  await startCamera(page);
  await page.getByRole("button", { name: "Start exercise" }).click();
  await expect(page.locator(".status-slot")).toBeVisible({ timeout: 40_000 });
}

const cases = [
  { width: 360, height: 740, exercise: "Mini squat", reached: 141 },
  { width: 360, height: 740, exercise: "Seated knee extension hold", reached: 97 },
  { width: 320, height: 568, exercise: "Mini squat", reached: 0 },
  { width: 320, height: 568, exercise: "Seated knee extension hold", reached: 0 },
];

for (const phone of cases) {
  const exercise = phone.exercise;
  const minCamera = Math.max(0, phone.reached - 10);
  test(`${exercise}: 200 percent text, ${phone.width} x ${phone.height}: both safety buttons in view, ${phone.reached} px of camera in the first view (assert ${minCamera}), camera reachable by scroll`, async ({ page }) => {
    await page.setViewportSize({ width: phone.width, height: phone.height });
    await toSession(page, `Start ${exercise}`);
    await page.evaluate(() => document.documentElement.style.setProperty("font-size", "200%", "important"));
    await page.waitForTimeout(600);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    const m = await page.evaluate(() => {
      const vh = window.innerHeight;
      const box = (sel: string) => document.querySelector(sel)!.getBoundingClientRect();
      const cam = box(".v3-cam");
      const bar = box(".v3-actions");
      const stop = box(".session-bar .btn-stop");
      const gave = box(".session-bar .btn-gave-way");
      return {
        vh,
        camVisible: Math.max(0, Math.min(cam.bottom, bar.top, vh) - Math.max(cam.top, 0)),
        stopTop: stop.top,
        stopBottom: stop.bottom,
        gaveTop: gave.top,
        gaveBottom: gave.bottom,
      };
    });
    for (const [top, bottom] of [[m.stopTop, m.stopBottom], [m.gaveTop, m.gaveBottom]]) {
      expect(top).toBeGreaterThanOrEqual(0);
      expect(bottom).toBeLessThanOrEqual(m.vh);
    }
    expect(m.camVisible).toBeGreaterThanOrEqual(minCamera);
    await page.locator(".v3-cam").evaluate((el) => el.scrollIntoView({ block: "start" }));
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => {
      const cam = document.querySelector(".v3-cam")!.getBoundingClientRect();
      const bar = document.querySelector(".v3-actions")!.getBoundingClientRect();
      return { height: cam.height, visible: Math.min(cam.bottom, bar.top, window.innerHeight) - Math.max(cam.top, 0) };
    });
    expect(after.visible, "camera after scrolling").toBeGreaterThanOrEqual(Math.min(after.height, 100));
  });
}
