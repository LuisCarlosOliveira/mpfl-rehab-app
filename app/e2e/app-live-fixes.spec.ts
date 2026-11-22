import { expect, test, type Page } from "@playwright/test";
import { startCamera, toSetupCamera, toSetupGuide } from "./helpers/app";

async function toSessionChoose(page: Page) {
  await toSetupCamera(page);
  await startCamera(page);
  await page.getByRole("button", { name: "Start exercise" }).click();
}

const intersects = (a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

test.describe("B-02: the alert and the lowest-angle button", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test("the button stays visible while the alert has text in the choose phase", async ({ page }) => {
    await toSessionChoose(page);
    const button = page.getByRole("button", { name: "Use my lowest steady angle as the start" });
    await expect(button).toBeVisible({ timeout: 40_000 });
    await page.evaluate(() => {
      (document.querySelector(".cue-alert") as HTMLElement).textContent = "Stop at your limit, do not push.";
    });
    const state = await page.evaluate(() => {
      const alert = document.querySelector(".cue-alert") as HTMLElement;
      const btn = document.querySelector(".status-slot > button.btn") as HTMLElement;
      return { alertShown: alert.offsetParent !== null, buttonShown: btn.offsetParent !== null };
    });
    expect(state.alertShown, "the alert is visible").toBe(true);
    expect(state.buttonShown, "the button is visible").toBe(true);
    // The alert comes first in the slot.
    const order = await page.evaluate(() => {
      const slot = document.querySelector(".status-slot") as HTMLElement;
      const a = (document.querySelector(".cue-alert") as HTMLElement).getBoundingClientRect();
      const b = (slot.querySelector("button.btn") as HTMLElement).getBoundingClientRect();
      return { alertTop: a.top, buttonTop: b.top };
    });
    expect(order.alertTop).toBeLessThan(order.buttonTop);
  });
});

for (const size of [
  { width: 390, height: 844 },
  { width: 1280, height: 800 },
]) {
  test(`B-04: the Setup status chip does not lie on the body map at ${size.width} x ${size.height}`, async ({ page }) => {
    await page.setViewportSize(size);
    await toSetupCamera(page);
    await startCamera(page);
    const boxes = await page.evaluate(() => {
      const r = (el: Element | null) => {
        if (el === null) return null;
        const b = el.getBoundingClientRect();
        return { x: b.x, y: b.y, width: b.width, height: b.height };
      };
      return { chip: r(document.querySelector(".v3-live-panel .status-line")), map: r(document.querySelector(".v2-setup .frame > svg.body-map")), frame: r(document.querySelector(".v2-setup .frame")) };
    });
    expect(boxes.chip, "status chip").not.toBeNull();
    expect(boxes.map, "body map").not.toBeNull();
    expect(intersects(boxes.chip!, boxes.map!), "the status chip and the body map share no area").toBe(false);
    // v3: the chip sits in the panel, beside or under the camera, and never on the picture.
    expect(intersects(boxes.chip!, boxes.frame!), "the status chip and the camera frame share no area").toBe(false);
  });
}

test.describe("C-11: the swelling control at 320 x 568", () => {
  test.use({ viewport: { width: 320, height: 568 } });
  test("no empty area of the track has the colour of a checked cell", async ({ page }) => {
    await toSetupGuide(page); // the stylesheet of the segmented control is loaded here
    const result = await page.evaluate(() => {
      const host = document.createElement("div");
      host.innerHTML = `<fieldset class="v2-seg"><legend>Is your knee swollen?</legend><div class="seg-track" data-count="3">
        <label class="seg-cell"><input type="radio" name="sw-test" checked /><span>No swelling</span></label>
        <label class="seg-cell"><input type="radio" name="sw-test" /><span>Some swelling</span></label>
        <label class="seg-cell"><input type="radio" name="sw-test" /><span>More than before</span></label></div></fieldset>`;
      document.querySelector("main")!.prepend(host);
      const track = host.querySelector(".seg-track") as HTMLElement;
      const checked = host.querySelector(".seg-cell:has(input:checked)") as HTMLElement;
      track.scrollIntoView();
      const box = track.getBoundingClientRect();
      const empty: [number, number][] = [];
      const hitsTrack = (x: number, y: number) => document.elementFromPoint(x, y) === track;
      for (let y = box.top + 3; y < box.bottom - 3; y += 2) for (let x = box.left + 3; x < box.right - 3; x += 2) if (hitsTrack(x, y) && hitsTrack(x + 6, y) && hitsTrack(x, y + 6)) empty.push([x, y]);
      return { emptyPoints: empty.length, trackBg: getComputedStyle(track).backgroundColor, checkedBg: getComputedStyle(checked).backgroundColor };
    });
    if (result.emptyPoints > 0) expect(result.trackBg, "the empty area is not the checked colour").not.toBe(result.checkedBg);
    expect(result.checkedBg).not.toBe("rgba(0, 0, 0, 0)");
  });
});
