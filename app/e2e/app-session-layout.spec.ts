// R3-02 and R3-03: the buttons that the person needs sit in the first view of the Session, with real geometry.
// "First view" means: the top of the page, no scroll, and above the top of the fixed bar.
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { EXAMPLE, expectScreen, startCamera } from "./helpers/app";

const SIZES = [
  { width: 390, height: 844 },
  { width: 360, height: 640 },
];

/** The box of one element, or a failure that names it. */
async function box(
  page: Page,
  what: string,
  locator: ReturnType<Page["locator"]>,
) {
  const b = await locator.boundingBox();
  if (b === null) throw new Error(`${what} has no box`);
  return b;
}

async function toSessionOf(page: Page, startName: string, protocol?: string) {
  await page.goto("/");
  await page.getByRole("button", { name: "I understand" }).click();
  if (protocol === undefined)
    await page.getByLabel("Choose a file from your care team").setInputFiles(EXAMPLE);
  else
    await page.getByLabel("Choose a file from your care team").setInputFiles({
      name: "p.json",
      mimeType: "application/json",
      buffer: Buffer.from(protocol),
    });
  await expectScreen(page, "Home");
  await page.getByRole("button", { name: startName }).click();
  await page
    .getByRole("button", { name: "None of these apply. Continue" })
    .click();
  await page.getByRole("button", { name: "Next: set up the camera" }).click();
  await startCamera(page);
  await page.getByRole("button", { name: "Start exercise" }).click();
}

for (const size of SIZES) {
  test.describe(`${size.width} x ${size.height}`, () => {
    test.use({ viewport: size });

    test("R3-02: the lowest-angle button, the camera, the count and the angle are above the bar", async ({
      page,
    }) => {
      await toSessionOf(page, "Start Heel slide");
      // With the fake camera no leg is seen, so the button stays off. It still shows, and its box is real.
      const button = page.getByRole("button", {
        name: "Use my lowest steady angle as the start",
      });
      await expect(button).toBeVisible({ timeout: 40_000 });
      const bar = await box(page, "bar", page.locator(".session-bar"));
      const checks = {
        video: await box(page, "video", page.locator("video.preview")),
        angle: await box(page, "angle", page.locator(".readout-line").first()),
        count: await box(page, "count", page.locator(".readout-line").nth(1)),
        button: await box(page, "button", button),
      };
      const room = Object.fromEntries(
        Object.entries(checks).map(([k, b]) => [
          k,
          Math.round(bar.y - (b.y + b.height)),
        ]),
      );
      expect(await page.evaluate(() => window.scrollY)).toBe(0);
      for (const [k, gap] of Object.entries(room))
        expect(
          gap,
          `${k} must end above the bar (gap in px: ${JSON.stringify(room)})`,
        ).toBeGreaterThanOrEqual(0);
    });
  });
}

// R3-03 is measured at the phone size of the report. At 360 x 640 the banners and the three-row bar leave too little room (see TASKS.md).
test.describe("390 x 844", () => {
  test.use({ viewport: SIZES[0] });

  test("R3-03: the pause message and Finish are above the bar", async ({
    page,
  }) => {
    const protocol = JSON.parse(readFileSync(EXAMPLE, "utf8"));
    for (const e of protocol.phases[0].exercises) e.reps = 1;
    await toSessionOf(
      page,
      "Start Straight leg raise",
      JSON.stringify(protocol),
    );
    await expectScreen(page, "Straight leg raise");
    await page.getByRole("button", { name: "Count this rep" }).click();
    await expect(page.getByText(/Set 1 done/)).toBeVisible();
    await page.getByLabel("7", { exact: true }).click(); // a real press: the scale must be in reach. The scale goes away after the press, so no check()
    const pause = page
      .getByRole("alert")
      .filter({ hasText: "You reported pain 7" });
    await expect(pause).toBeVisible();
    const finish = page.getByRole("button", { name: "Finish" });
    const bar = await box(page, "bar", page.locator(".session-bar"));
    const room = {
      pause: Math.round(
        bar.y - (await box(page, "pause", pause).then((b) => b.y + b.height)),
      ),
      finish: Math.round(
        bar.y - (await box(page, "finish", finish).then((b) => b.y + b.height)),
      ),
    };
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    for (const [k, gap] of Object.entries(room))
      expect(
        gap,
        `${k} must end above the bar (gap in px: ${JSON.stringify(room)})`,
      ).toBeGreaterThanOrEqual(0);
  });
});

// No sideways scroll on the narrow screens, and the button is inside the width.
for (const width of [320, 195]) {
  test(`R3-02 at ${width} px wide: no sideways scroll and the button is inside the width`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 640 });
    await toSessionOf(page, "Start Heel slide");
    const button = page.getByRole("button", {
      name: "Use my lowest steady angle as the start",
    });
    await expect(button).toBeVisible({ timeout: 40_000 });
    const b = await box(page, "button", button);
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(width);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
}
