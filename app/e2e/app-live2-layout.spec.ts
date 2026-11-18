// B3-04: the unit next to the count is never cut, at four widths. B3-05: at 200 percent text the Session bar does not cover the live numbers.
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { EXAMPLE, expectScreen, startCamera } from "./helpers/app";

async function toSession(page: Page, startName: string) {
  const protocol = JSON.parse(readFileSync(EXAMPLE, "utf8"));
  protocol.activePhase = 2; // phase 2 holds the mini squat and the seated hold
  await page.goto("/");
  await page.getByRole("button", { name: "I understand" }).click();
  await page.getByLabel("Choose a file from your care team").setInputFiles({
    name: "p.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(protocol)),
  });
  await expectScreen(page, "Home");
  await page.getByRole("button", { name: startName }).click();
  await page.getByRole("button", { name: "None of these apply. Continue" }).click();
  await page.getByRole("button", { name: "Next: set up the camera" }).click();
  await startCamera(page);
  await page.getByRole("button", { name: "Start exercise" }).click();
  await expect(page.locator(".status-slot")).toBeVisible({ timeout: 40_000 });
}

for (const size of [
  { width: 390, height: 844 },
  { width: 360, height: 640 },
  { width: 320, height: 640 },
  { width: 1280, height: 800 },
]) {
  test.describe(`B3-04 at ${size.width} x ${size.height}`, () => {
    test.use({ viewport: size });
    test("the unit of the count shows whole, inside every box that clips", async ({ page }) => {
      await toSession(page, "Start Seated knee extension hold");
      const r = await page.evaluate(() => {
        const unit = document.querySelector(".live-reps .v3-num span") as HTMLElement;
        const box = unit.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(unit);
        const text = range.getBoundingClientRect();
        const clippers: string[] = [];
        for (let el = unit.parentElement; el && el !== document.documentElement; el = el.parentElement) {
          const o = getComputedStyle(el).overflowX;
          if (o !== "visible" && text.right > el.getBoundingClientRect().right + 0.5) clippers.push(el.className);
        }
        return { word: unit.textContent, outside: text.right > window.innerWidth + 0.5, clippers, scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth, own: unit.scrollWidth - unit.clientWidth, boxRight: box.right };
      });
      expect(r.word).toBe("holds");
      expect(r.outside).toBe(false);
      expect(r.clippers).toEqual([]);
      expect(r.own).toBeLessThanOrEqual(1);
      expect(r.scrollW).toBeLessThanOrEqual(r.innerW);
    });
  });
}

// B3-05: at 200 percent text the Session bar takes about a third of the screen. The bar stays fixed, because the guardrail says that a session
// always has a visible Stop button. A static bar would put Stop at the end of the page. So the test pins what must hold: the bar stays under
// 35 percent, the page starts at the top, the live numbers sit above Stop in the page, and each number scrolls fully above the bar.
test.describe("B3-05: 200 percent text, 390 x 844", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test("the bar stays fixed under 35 percent and the numbers scroll above it", async ({ page }) => {
    await toSession(page, "Start Mini squat");
    await page.evaluate(() => document.documentElement.style.setProperty("font-size", "200%", "important"));
    await page.waitForTimeout(600);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    for (const sel of [".live-angle .v3-num b", ".live-reps .v3-num b"]) {
      await page.locator(sel).scrollIntoViewIfNeeded();
      const m = await page.evaluate((s) => {
        // v3: the sticky v3-actions section holds the bar, so its box and its position are the ones to read.
        const bar = document.querySelector(".v3-actions") as HTMLElement;
        const b = bar.getBoundingClientRect();
        return { position: getComputedStyle(bar).position, share: b.height / window.innerHeight, barTop: b.top, numBottom: document.querySelector(s)!.getBoundingClientRect().bottom };
      }, sel);
      expect(m.position).toBe("sticky");
      expect(m.share).toBeLessThan(0.35);
      expect(m.numBottom).toBeLessThanOrEqual(m.barTop + 0.5);
    }
  });
});
