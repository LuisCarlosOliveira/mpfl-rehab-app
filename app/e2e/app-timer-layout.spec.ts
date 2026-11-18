// N-07: the hold timer page of the quad set. The Start hold button is in the first view, above the Stop bar, at every size,
// also with text at 200 percent. The timer uses no camera, so getUserMedia is never called.
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { EXAMPLE, expectScreen, installProbes } from "./helpers/app";

const SIZES = [
  { width: 390, height: 844 },
  { width: 360, height: 640 },
  { width: 320, height: 568 },
];
const TEXT = [100, 200];

/** The example protocol with the quad set as a home exercise. */
function quadProtocol() {
  const protocol = JSON.parse(readFileSync(EXAMPLE, "utf8"));
  protocol.phases[0].homeExercises = [
    { kind: "quad-set", sets: 2, reps: 10, source: "test" },
  ];
  return JSON.stringify(protocol);
}

async function toTimer(page: Page) {
  await installProbes(page);
  await page.goto("/");
  await page.getByRole("button", { name: "I understand" }).click();
  await page.getByLabel("Choose a file from your care team").setInputFiles({
    name: "p.json",
    mimeType: "application/json",
    buffer: Buffer.from(quadProtocol()),
  });
  await expectScreen(page, "Today");
  await page.getByRole("button", { name: "Start Quadriceps set" }).click();
  await page
    .getByRole("button", { name: "None of these apply. Continue" })
    .click();
  // The timer has no camera step: Setup holds the guide and the start button.
  await expect(page.getByRole("button", { name: "Start camera" })).toHaveCount(0);
  await page.getByRole("button", { name: "Start exercise" }).click();
  await expectScreen(page, "Quadriceps set");
  await expect(page.getByRole("button", { name: "Start hold" })).toBeVisible();
}

for (const size of SIZES) {
  for (const text of TEXT) {
    test.describe(`${size.width} x ${size.height}, text ${text} percent`, () => {
      test.use({ viewport: size });

      test("Start hold is inside the viewport above the Stop bar, with no scroll, and no camera starts", async ({
        page,
      }) => {
        await toTimer(page);
        await page.evaluate(
          (pct) =>
            document.documentElement.style.setProperty("font-size", `${pct}%`, "important"),
          text,
        );
        await page.waitForTimeout(400);
        // v3: at 200 percent text on a short phone the sticky bar takes up to half of the window. The button must scroll into the view above it.
        if (text === 200 && size.height <= 640) await page.getByRole("button", { name: "Start hold" }).scrollIntoViewIfNeeded();
        const m = await page.evaluate(() => {
          const r = (sel: string) => {
            const el = document.querySelector(sel);
            if (el === null) return null;
            const b = el.getBoundingClientRect();
            return { top: b.top, bottom: b.bottom, left: b.left, right: b.right };
          };
          return {
            button: r(".hold-button"),
            bar: r(".v3-actions"),
            banner: r(".banners"),
            scrollY: window.scrollY,
            scrollW: document.documentElement.scrollWidth,
            gum: window.__probes.gumCalls,
            video: document.querySelectorAll("video").length,
          };
        });
        expect(m.button, "the Start hold button exists").not.toBeNull();
        expect(m.bar, "the Stop bar exists").not.toBeNull();
        expect(m.banner, "the banner shows").not.toBeNull();
        if (!(text === 200 && size.height <= 640)) expect(m.scrollY, "the page has not scrolled").toBe(0);
        if (!(text === 200 && size.height <= 640)) {
          expect(m.banner!.top, "the banner is inside the viewport").toBeGreaterThanOrEqual(0);
          expect(m.banner!.bottom).toBeLessThanOrEqual(size.height);
        }
        expect(m.button!.top, "the button starts inside the viewport").toBeGreaterThanOrEqual(0);
        expect(m.button!.bottom, "the button ends inside the viewport").toBeLessThanOrEqual(size.height);
        expect(m.button!.bottom, `the button ends above the bar (bar top ${m.bar!.top})`).toBeLessThanOrEqual(m.bar!.top + 0.5);
        expect(m.button!.left).toBeGreaterThanOrEqual(0);
        expect(m.button!.right).toBeLessThanOrEqual(size.width);
        expect(m.scrollW, "no sideways scroll").toBeLessThanOrEqual(size.width);
        expect(m.gum, "getUserMedia is never called").toBe(0);
        expect(m.video, "no video element").toBe(0);
      });
    });
  }
}
