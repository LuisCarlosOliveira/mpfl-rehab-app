import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { EXAMPLE, PROTOTYPE_BANNER, expectScreen, installProbes, startCamera } from "./helpers/app";

function quadProtocol() {
  const protocol = JSON.parse(readFileSync(EXAMPLE, "utf8"));
  protocol.phases[0].homeExercises = [{ kind: "quad-set", sets: 2, reps: 10, source: "test" }];
  return JSON.stringify(protocol);
}

async function load(page: Page, protocol?: string) {
  await installProbes(page);
  await page.goto("/");
  await page.getByRole("button", { name: "I understand" }).click();
  const input = page.getByLabel("Choose a file from your care team");
  if (protocol === undefined) await input.setInputFiles(EXAMPLE);
  else await input.setInputFiles({ name: "p.json", mimeType: "application/json", buffer: Buffer.from(protocol) });
  await expectScreen(page, "Today");
}

async function toCameraSession(page: Page) {
  await load(page);
  await page.getByRole("button", { name: "Start Heel slide" }).click();
  await page.getByRole("button", { name: "None of these apply. Continue" }).click();
  await page.getByRole("button", { name: "Next: set up the camera" }).click();
  await startCamera(page);
  await page.getByRole("button", { name: "Start exercise" }).click();
  await expectScreen(page, "Heel slide");
}

async function toTimerSession(page: Page) {
  await load(page, quadProtocol());
  await page.getByRole("button", { name: "Start Quadriceps set" }).click();
  await page.getByRole("button", { name: "None of these apply. Continue" }).click();
  await page.getByRole("button", { name: "Start exercise" }).click();
  await expectScreen(page, "Quadriceps set");
}

const rect = (page: Page, selector: string) =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (el === null) return null;
    const b = el.getBoundingClientRect();
    return { top: b.top, bottom: b.bottom, left: b.left, right: b.right, width: b.width, height: b.height };
  }, selector);

test.describe("1440 x 900, the camera exercise", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("the camera is at least 55 percent of the window and sits left of the numbers", async ({ page }) => {
    await toCameraSession(page);
    const cam = await rect(page, ".v3-cam");
    const angle = await rect(page, ".live-angle");
    expect(cam, "the camera slot exists").not.toBeNull();
    expect(angle, "the angle number exists").not.toBeNull();
    expect(cam!.width / 1440, `camera width ${cam!.width}`).toBeGreaterThanOrEqual(0.55);
    expect(cam!.right, "the camera is left of the numbers").toBeLessThanOrEqual(angle!.left);
    expect(cam!.height / cam!.width, "4:3 shape").toBeCloseTo(0.75, 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1440);
  });

  test("the banner shows once, and Stop is in view without a scroll", async ({ page }) => {
    await toCameraSession(page);
    await expect(page.getByText(PROTOTYPE_BANNER, { exact: false }).locator("visible=true")).toHaveCount(1);
    const stop = page.getByRole("button", { name: /^\W*Stop$/ });
    const b = await stop.boundingBox();
    expect(b!.bottom ?? b!.y + b!.height).toBeLessThanOrEqual(900);
  });
});

for (const size of [
  { width: 390, height: 844 },
  { width: 320, height: 568 },
]) {
  for (const scheme of ["dark", "light"] as const) {
    test.describe(`${size.width} x ${size.height}, ${scheme}`, () => {
      test.use({ viewport: size, colorScheme: scheme });

      test("camera session: the name comes first, the safety buttons are in view and 56 px high, no sideways scroll", async ({ page }) => {
        await toCameraSession(page);
        for (const pct of [100, 200]) {
          await page.evaluate((p) => document.documentElement.style.setProperty("font-size", `${p}%`, "important"), pct);
          await page.waitForTimeout(300);
          const m = await page.evaluate(() => {
            const r = (sel: string) => {
              const el = document.querySelector(sel);
              if (el === null) return null;
              const b = el.getBoundingClientRect();
              return { top: b.top, bottom: b.bottom, left: b.left, right: b.right, height: b.height };
            };
            const buttons = [...document.querySelectorAll<HTMLElement>(".session-bar .btn")].map((b) => b.getBoundingClientRect().height);
            return { h1: r("h1"), cam: r(".v3-cam"), bar: r(".v3-actions"), buttons, scrollW: document.documentElement.scrollWidth };
          });
          expect(m.h1!.top, `name above the camera at ${pct}%`).toBeLessThan(m.cam!.top);
          expect(m.bar!.bottom, `bar inside the window at ${pct}%`).toBeLessThanOrEqual(size.height + 0.5);
          expect(m.scrollW, `no sideways scroll at ${pct}%`).toBeLessThanOrEqual(size.width);
          for (const h of m.buttons) expect(h, `live button height at ${pct}%`).toBeGreaterThanOrEqual(55.5);
        }
        await expect(page.getByRole("button", { name: /Knee gave way or hurts/ })).toBeInViewport();
        await expect(page.getByRole("button", { name: /^\W*Stop$/ })).toBeInViewport();
      });

      test("timer session: the name is above Start hold and Stop, and the page does not scroll sideways", async ({ page }) => {
        await toTimerSession(page);
        const h1 = await rect(page, "h1");
        const hold = await rect(page, ".hold-button");
        const bar = await rect(page, ".v3-actions");
        expect(h1!.bottom).toBeLessThanOrEqual(hold!.top);
        expect(h1!.bottom).toBeLessThanOrEqual(bar!.top);
        expect(hold!.height).toBeGreaterThanOrEqual(55.5);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(size.width);
        await expect(page.getByRole("button", { name: /^\W*Stop$/ })).toBeInViewport();
      });
    });
  }
}

test.describe("reduced motion", () => {
  test.use({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });

  test("a pressed live button does not scale", async ({ page }) => {
    await toTimerSession(page);
    const hold = page.getByRole("button", { name: "Start hold" });
    const box = (await hold.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    const transform = await hold.evaluate((el) => getComputedStyle(el).transform);
    await page.mouse.up();
    expect(["none", "matrix(1, 0, 0, 1, 0, 0)"]).toContain(transform);
  });
});
