// B6-03: the special buttons of the Session keep a readable label in hover, active and keyboard focus, in light and dark.
// The label against its background must have a contrast of at least 4.5:1. The test reads the computed colours.
import { expect, test, type Page } from "@playwright/test";
import { startCamera, toSetupCamera } from "./helpers/app";

const SIZES = [
  { width: 390, height: 844 },
  { width: 1280, height: 800 },
];

async function toSession(page: Page) {
  await toSetupCamera(page);
  await startCamera(page);
  await page.getByRole("button", { name: "Start exercise" }).click();
  await expect(page.locator(".status-slot")).toBeVisible({ timeout: 40_000 });
  // The "Follow me again" button only shows after a lockout. A copy in the same place has the same classes.
  await page.evaluate(() => {
    const box = document.createElement("div");
    box.className = "lock-box";
    box.innerHTML = '<button type="button" class="btn" id="probe-follow">Follow me again</button>';
    document.querySelector(".v2-session")!.appendChild(box);
  });
}

/** The contrast of the label of the element against the first background that is not clear. */
const contrast = (page: Page, selector: string) =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel) as HTMLElement;
    const parse = (c: string) => (c.match(/[\d.]+/g) ?? []).map(Number) as number[];
    const lum = ([r, g, b]: number[]) => {
      const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
      return 0.2126 * f(r!) + 0.7152 * f(g!) + 0.0722 * f(b!);
    };
    let bg = [255, 255, 255];
    for (let n: HTMLElement | null = el; n; n = n.parentElement) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c.length >= 3 && (c[3] ?? 1) > 0.5) {
        bg = c;
        break;
      }
    }
    const fg = parse(getComputedStyle(el).color);
    const [a, b] = [lum(fg), lum(bg)];
    return { ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05), fg: getComputedStyle(el).color, bg: getComputedStyle(el).backgroundColor };
  }, selector);

const BUTTONS = [
  { name: "Stop", selector: ".btn-stop" },
  { name: "Knee gave way or hurts", selector: ".btn-gave-way" },
  { name: "Mute sound", selector: ".session-swap" },
  { name: "Follow me again", selector: "#probe-follow" },
];

for (const size of SIZES) {
  for (const scheme of ["light", "dark"] as const) {
    test(`B6-03 at ${size.width} x ${size.height}, ${scheme}: hover, active and focus keep a readable label`, async ({ page }) => {
      await page.setViewportSize(size);
      await page.emulateMedia({ colorScheme: scheme });
      await toSession(page);
      const failures: string[] = [];
      for (const b of BUTTONS) {
        const el = page.locator(b.selector).first();
        await el.scrollIntoViewIfNeeded();
        await page.mouse.move(0, 0);
        await el.hover();
        await page.waitForTimeout(350);
        const hover = await contrast(page, b.selector);
        await page.mouse.down();
        await page.waitForTimeout(350);
        const active = await contrast(page, b.selector);
        await page.mouse.move(0, 0); // leave the button before the release, so the press is not a click
        await page.mouse.up();
        await el.focus();
        await page.keyboard.press("Shift+Tab");
        await page.keyboard.press("Tab"); // a keyboard move makes the focus ring show
        await page.waitForTimeout(350);
        const focus = await contrast(page, b.selector);
        for (const [state, c] of [["hover", hover], ["active", active], ["focus", focus]] as const)
          if (c.ratio < 4.5) failures.push(`${b.name} ${state}: ${c.ratio.toFixed(2)} (label ${c.fg} on ${c.bg})`);
      }
      expect(failures, failures.join("\n")).toEqual([]);
    });
  }
}
