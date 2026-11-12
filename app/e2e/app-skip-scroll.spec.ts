// AC6-01: after Skip in the second camera step, the "Set up the camera" screen opens at the top of the page. The banner is in view and
// the focus is on the heading. A keyboard and screen reader user keeps their place.
import { expect, test } from "@playwright/test";
import { toSetupGuide } from "./helpers/app";

for (const size of [
  { width: 390, height: 844 },
  { width: 360, height: 640 },
]) {
  test(`Skip opens the camera step at the top, ${size.width} x ${size.height}`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize(size);
    await toSetupGuide(page);
    await page.getByRole("button", { name: "Add a second camera (optional)" }).click();
    await page.getByRole("button", { name: "Start pairing" }).click();
    await page.waitForTimeout(1500); // the scan step opens and its camera starts
    await page.getByRole("button", { name: "Skip, use one camera" }).click(); // the click scrolls the button into view
    await expect(page.getByRole("heading", { level: 1, name: "Set up the camera" })).toBeVisible();
    await page.waitForTimeout(500);
    const m = await page.evaluate(() => ({
      scrollY: window.scrollY,
      bannerTop: Math.round(document.querySelector(".banners")!.getBoundingClientRect().top),
      h1Top: Math.round(document.querySelector("main h1")!.getBoundingClientRect().top),
      active: document.activeElement?.tagName,
      activeText: document.activeElement?.textContent?.trim().slice(0, 30),
    }));
    expect(m.scrollY, JSON.stringify(m)).toBe(0);
    expect(m.bannerTop, JSON.stringify(m)).toBeGreaterThanOrEqual(0);
    expect(m.h1Top, JSON.stringify(m)).toBeGreaterThanOrEqual(0);
    expect(m.active, JSON.stringify(m)).toBe("H1");
    expect(m.activeText).toBe("Set up the camera");
  });
}
