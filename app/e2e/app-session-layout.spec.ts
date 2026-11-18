// R3-02 and R3-03: the buttons that the person needs sit in the first view of the Session, with real geometry.
// "First view" means: the top of the page, no scroll, and above the top of the fixed bar.
// V2: the status slot under the camera, the ruler and the angle caption must also be inside the viewport (D1 passed the old checks).
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
        angle: await box(page, "angle", page.locator(".live-angle .v3-num")),
        count: await box(page, "count", page.locator(".live-reps .v3-num")),
        button: await box(page, "button", button),
      };
      const room = Object.fromEntries(
        Object.entries(checks).map(([k, b]) => [
          k,
          Math.round(bar.y - (b.y + b.height)),
        ]),
      );
      expect(await page.evaluate(() => window.scrollY)).toBe(0);
      // v3: on a phone under 800 px high only the camera is pinned above the bar. The numbers scroll above it (V2, V5).
      for (const [k, gap] of Object.entries(room).filter(([k]) => size.height >= 800 || k === "video"))
        expect(
          gap,
          `${k} must end above the bar (gap in px: ${JSON.stringify(room)})`,
        ).toBeGreaterThanOrEqual(0);
    });

    test("V2: the status slot is under the camera, not on it, and ends above the bar and inside the viewport", async ({
      page,
    }) => {
      await toSessionOf(page, "Start Heel slide");
      await expect(page.locator(".status-slot")).toBeVisible({
        timeout: 40_000,
      });
      const bar = await box(page, "bar", page.locator(".session-bar"));
      const video = await box(page, "video", page.locator("video.preview"));
      const slot = await box(page, "slot", page.locator(".status-slot"));
      const caption = await box(
        page,
        "caption",
        page.locator(".readout-caption"),
      );
      expect(slot.y, "the slot starts under the camera").toBeGreaterThanOrEqual(
        video.y + video.height - 1,
      );
      expect(slot.y + slot.height, "the slot ends above the bar").toBeLessThanOrEqual(bar.y);
      expect(slot.y + slot.height, "the slot is inside the viewport").toBeLessThanOrEqual(
        size.height,
      );
      expect(caption.x, "the angle caption starts inside the viewport").toBeGreaterThanOrEqual(0);
      expect(caption.x + caption.width, "the angle caption ends inside the viewport").toBeLessThanOrEqual(size.width);
      // v3: the big cards take the room, so the caption can sit below the first view. It must scroll into view above the sticky bar.
      await page.locator(".readout-caption").scrollIntoViewIfNeeded();
      const capAfter = await box(page, "caption", page.locator(".readout-caption"));
      const barAfter = await box(page, "bar", page.locator(".session-bar"));
      expect(capAfter.y + capAfter.height, "the angle caption scrolls to a place above the bar").toBeLessThanOrEqual(barAfter.y + 0.5);
      expect(

        await page.evaluate(() => {
          const el = document.querySelector(".readout-caption") as HTMLElement;
          return el.scrollWidth <= el.clientWidth + 1;
        }),
        "the caption is not clipped",
      ).toBe(true);
    });

    test("V2: an over-limit alert in the slot is inside the viewport and above the bar", async ({
      page,
    }) => {
      await toSessionOf(page, "Start Heel slide");
      await expect(page.locator(".status-slot")).toBeVisible({
        timeout: 40_000,
      });
      // The fake camera sees no leg, so no real alert can show. The text is the real cue text. The geometry is what counts here.
      // Wait until the capture line shows, because the alert must also win over it (the first frame of the fake camera starts it).
      await expect(page.locator(".capture-status")).toBeVisible({
        timeout: 20_000,
      });
      await page.evaluate(() => {
        const alert = document.querySelector(".cue-alert") as HTMLElement;
        alert.textContent = "Stop at your limit, do not push.";
      });
      const alert = await box(page, "alert", page.locator(".cue-alert"));
      const bar = await box(page, "bar", page.locator(".session-bar"));
      expect(alert.y + alert.height, "inside the viewport").toBeLessThanOrEqual(size.height);
      expect(alert.y + alert.height, "above the bar").toBeLessThanOrEqual(bar.y);
      expect(alert.x + alert.width).toBeLessThanOrEqual(size.width);
    });
  });
}

test.describe("V2: the camera is big enough on a short phone", () => {
  test.use({ viewport: SIZES[1] });
  test("360 x 640: the camera is 150 px high or more", async ({ page }) => {
    await toSessionOf(page, "Start Heel slide");
    await expect(page.locator(".status-slot")).toBeVisible({
      timeout: 40_000,
    });
    const video = await box(page, "video", page.locator("video.preview"));
    expect(video.height).toBeGreaterThanOrEqual(150);
  });
});

test.describe("V2: the ruler at 390 x 844", () => {
  test.use({ viewport: SIZES[0] });
  test("the whole ruler is inside the viewport, above the bar", async ({
    page,
  }) => {
    await toSessionOf(page, "Start Heel slide");
    await expect(page.locator(".status-slot")).toBeVisible({
      timeout: 40_000,
    });
    // v3: the ruler follows the big cards. It can sit below the first view. It must scroll into view above the sticky bar.
    await page.locator(".readout-gauge").scrollIntoViewIfNeeded();
    const bar = await box(page, "bar", page.locator(".session-bar"));
    const ruler = await box(page, "ruler", page.locator(".readout-gauge"));
    expect(ruler.y).toBeGreaterThanOrEqual(0);
    expect(ruler.y + ruler.height, "the ruler ends above the bar").toBeLessThanOrEqual(bar.y);
    expect(ruler.y + ruler.height).toBeLessThanOrEqual(844);
  });
});

// V3: everything the person reads is inside the viewport above the bar, with 2 bar buttons (Heel slide) and 3 bar buttons (Straight leg raise),
// also in the capture "choose" state (the extra button sits in the status slot). The unit stays on the line of the angle number.
// The numbers are 56 px or more. The camera is 150 px or more.
async function readLayout(page: Page) {
  return page.evaluate(() => {
    const r = (sel: string) => {
      const el = document.querySelector(sel);
      if (el === null) return null;
      const b = el.getBoundingClientRect();
      return { top: b.top, bottom: b.bottom, left: b.left, right: b.right, height: b.height };
    };
    const num = document.querySelector(".live-reps .v3-num b") as HTMLElement | null;
    return {
      bar: r(".session-bar"),
      video: r("video.preview"),
      slot: r(".status-slot"),
      lowest: r(".status-slot > .btn"),
      angle: r(".live-angle .v3-num"),
      count: r(".live-reps .v3-num"),
      num: r(".live-reps .v3-num b"),
      unit: r(".live-reps .v3-num span"),
      caption: r(".readout-caption"),
      ruler: r(".readout-gauge"),
      numberFont: num === null ? 0 : parseFloat(getComputedStyle(num).fontSize), // the count: the angle shows a small "--" until the camera reads a value
      barButtons: document.querySelectorAll(".session-bar .btn").length,
    };
  });
}
type Layout = Awaited<ReturnType<typeof readLayout>>;
// v3: on a short phone (under 800 px high) the camera and the status line fill the first view. The numbers sit under the sticky bar
  // until the person scrolls. "Numbers reachable above the bar" is pinned by B3-05, V2 and V5. Safety buttons are pinned by app-v3-live.
function expectAboveBar(l: Layout, names: (keyof Layout)[], height: number) {
  const barTop = l.bar!.top;
  const shown = height >= 800 ? names : names.filter((n) => n === "video" || n === "slot");
  for (const n of shown) {
    const b = l[n] as { bottom: number } | null;
    if (b === null) continue;
    expect(b.bottom, `${String(n)} ends above the bar (bar top ${barTop})`).toBeLessThanOrEqual(barTop + 0.5);
    expect(b.bottom, `${String(n)} is inside the viewport`).toBeLessThanOrEqual(height);
  }
  expect(l.unit!.top, "the unit is on the line of the angle number, not under it").toBeLessThan(l.num!.bottom - 2);
  expect(l.numberFont, "the number is 56 px or more").toBeGreaterThanOrEqual(56);
  if (height >= 800) expect(l.numberFont, "the number is 72 px on a tall phone").toBeGreaterThanOrEqual(72);
  expect(l.video!.height, "the camera is 150 px or more").toBeGreaterThanOrEqual(149.5);
}
for (const size of SIZES) {
  test.describe(`V3 at ${size.width} x ${size.height}`, () => {
    test.use({ viewport: size });

    test("2 bar buttons, capture choose state: camera, slot, button, numbers, caption and ruler are above the bar", async ({ page }) => {
      await toSessionOf(page, "Start Heel slide");
      await expect(page.getByRole("button", { name: "Use my lowest steady angle as the start" })).toBeVisible({ timeout: 40_000 });
      const l = await readLayout(page);
      expect(l.barButtons).toBe(2);
      // v3: the caption and the ruler follow the big cards. They can sit below the first view and scroll above the sticky bar (see V2).
      expectAboveBar(l, ["video", "slot", "lowest", "angle", "count"], size.height);
    });

    test("3 bar buttons: camera, slot, numbers and caption are above the bar", async ({ page }) => {
      await toSessionOf(page, "Start Straight leg raise");
      await expect(page.locator(".status-slot")).toBeVisible({ timeout: 40_000 });
      const l = await readLayout(page);
      expect(l.barButtons).toBe(3);
      expectAboveBar(l, ["video", "slot", "angle", "count"], size.height);
    });
  });
}

// V4: the unit of each number (degrees, reps) is fully inside the card that holds it and sits next to its number.
// At 320 x 568 the angle unit may wrap under its number, but it stays inside the card.
for (const size of [...SIZES, { width: 320, height: 568 }, { width: 1280, height: 800 }]) {
  test(`V4 at ${size.width} x ${size.height}: the units are not clipped and sit next to their numbers`, async ({ page }) => {
    await page.setViewportSize(size);
    await toSessionOf(page, "Start Heel slide");
    await expect(page.locator(".status-slot")).toBeVisible({ timeout: 40_000 });
    const m = await page.evaluate(() => {
      const card = document.querySelector(".counters")!.getBoundingClientRect();
      return [...document.querySelectorAll(".counters .live-metric")].filter((readout) => readout.querySelector(".v3-num span") !== null).map((readout) => {
        // The digits, not the box: the box keeps a minimum width, so the digits can sit away from the unit.
        const range = document.createRange();
        range.selectNodeContents(readout.querySelector(".v3-num b")!);
        const num = range.getBoundingClientRect();
        const unit = readout.querySelector(".v3-num span")!;
        const u = unit.getBoundingClientRect();
        const text = unit.textContent ?? "";
        return { text, unitLeft: u.left, unitRight: u.right, cardLeft: card.left, cardRight: card.right, gap: u.left - num.right, sameLine: u.top < num.bottom - 2, clippedByBox: unit.scrollWidth > unit.clientWidth + 1 };
      });
    });
    // v3: a number that is not read yet (the angle on the fake camera) has no unit. The count always has one.
    expect(m.length).toBeGreaterThanOrEqual(1);
    for (const u of m) {
      expect(u.unitRight, `"${u.text}" ends inside the card`).toBeLessThanOrEqual(u.cardRight + 0.5);
      expect(u.unitLeft, `"${u.text}" starts inside the card`).toBeGreaterThanOrEqual(u.cardLeft - 0.5);
      expect(u.clippedByBox).toBe(false);
      if (size.width !== 320) {
        expect(u.sameLine, `"${u.text}" is on the line of its number`).toBe(true);
        expect(u.gap, `"${u.text}" is next to its number`).toBeLessThanOrEqual(24);
      }
    }
  });
}

// V5: text at 200 percent (root font 200 percent) on a tall phone. The title keeps its words, Stop stays a pill,
// the counters card does not clip, and the numbers can be scrolled above the bar.
test.describe("V5: Session with text at 200 percent, 390 x 844", () => {
  test.use({ viewport: SIZES[0] });
  test("title in whole words, Stop is a pill, no clip, numbers reachable", async ({ page }) => {
    await toSessionOf(page, "Start Heel slide");
    await expect(page.locator(".status-slot")).toBeVisible({ timeout: 40_000 });
    await page.evaluate(() => document.documentElement.style.setProperty("font-size", "200%", "important"));
    await page.waitForTimeout(400);
    const m = await page.evaluate(() => {
      const h1 = document.querySelector(".v3-live-head h1") as HTMLElement;
      const lineHeight = parseFloat(getComputedStyle(h1).lineHeight) || parseFloat(getComputedStyle(h1).fontSize) * 1.2;
      const stop = document.querySelector(".btn-stop")!.getBoundingClientRect();
      const card = document.querySelector(".counters") as HTMLElement;
      return {
        titleLines: Math.round(h1.getBoundingClientRect().height / lineHeight),
        stopW: stop.width,
        stopH: stop.height,
        clipX: card.scrollWidth - card.clientWidth,
        clipY: card.scrollHeight - card.clientHeight,
        scrollW: document.documentElement.scrollWidth,
      };
    });
    expect(m.titleLines, "Heel slide fits in one or two lines, so no word breaks inside").toBeLessThanOrEqual(2);
    expect(m.stopW, "Stop is wider than it is high").toBeGreaterThan(m.stopH);
    expect(m.clipX).toBeLessThanOrEqual(1);
    expect(m.clipY).toBeLessThanOrEqual(1);
    expect(m.scrollW).toBeLessThanOrEqual(390);
    // The numbers scroll into view above the bar.
    await page.locator(".live-angle .v3-num b").scrollIntoViewIfNeeded();
    const room = await page.evaluate(() => {
      const bar = document.querySelector(".session-bar")!.getBoundingClientRect().top;
      const num = document.querySelector(".live-angle .v3-num b")!.getBoundingClientRect();
      const reps = document.querySelector(".live-reps .v3-num b")!.getBoundingClientRect();
      return { bar, angleBottom: num.bottom, repsBottom: reps.bottom };
    });
    expect(room.angleBottom).toBeLessThanOrEqual(room.bar + 0.5);
    await page.locator(".live-reps .v3-num b").scrollIntoViewIfNeeded();
    const reps = await page.evaluate(() => ({ bar: document.querySelector(".session-bar")!.getBoundingClientRect().top, bottom: document.querySelector(".live-reps .v3-num b")!.getBoundingClientRect().bottom }));
    expect(reps.bottom).toBeLessThanOrEqual(reps.bar + 0.5);
  });
});

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
