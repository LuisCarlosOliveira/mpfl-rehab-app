// The camera picture is the main thing on the Setup camera step and on the Session screen: as large as the window allows, and nothing covers it.
// The test measures the real boxes at five sizes in light and dark. With CAMERA_SIZES_OUT=<file> it also writes the numbers to that file.
import { expect, test, type Page } from "@playwright/test";
import { appendFileSync } from "node:fs";
import { startCamera, toSetupCamera } from "./helpers/app";

const SIZES = [
  { width: 1910, height: 915 },
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
  { width: 360, height: 640 },
  { width: 320, height: 568 },
];

interface Boxes {
  frame: { x: number; y: number; w: number; h: number };
  video: { w: number; h: number };
  barTop: number | null;
  barLeft: number | null;
  scrollY: number;
  bannerTop: number;
  mapInside: boolean;
}

const measure = (page: Page): Promise<Boxes> =>
  page.evaluate(() => {
    const r = (el: Element) => el.getBoundingClientRect();
    const frame = r(document.querySelector(".frame")!);
    const video = document.querySelector("video.preview") as HTMLVideoElement;
    const vb = r(video);
    // The picture inside the video box (object-fit contain) for the real video size.
    const ar = video.videoWidth > 0 ? video.videoWidth / video.videoHeight : 4 / 3;
    const w = Math.min(vb.width, vb.height * ar);
    const bar = document.querySelector(".session-bar");
    const banners = document.querySelector(".banners");
    const map = document.querySelector("svg.body-map");
    const m = map ? r(map) : null;
    return {
      frame: { x: Math.round(frame.x), y: Math.round(frame.y), w: Math.round(frame.width), h: Math.round(frame.height) },
      video: { w: Math.round(w), h: Math.round(w / ar) },
      barTop: bar ? Math.round(r(bar).top) : null,
      barLeft: bar ? Math.round(r(bar).left) : null,
      scrollY: window.scrollY,
      bannerTop: banners ? Math.round(r(banners).top) : 0,
      mapInside: m === null || (m.left >= frame.left - 1 && m.right <= frame.right + 1 && m.top >= frame.top - 1 && m.bottom <= frame.bottom + 1),
    };
  });

for (const size of SIZES) {
  for (const scheme of ["light", "dark"] as const) {
    test(`camera size at ${size.width} x ${size.height}, ${scheme}`, async ({ page }) => {
      test.setTimeout(90_000);
      await page.setViewportSize(size);
      await page.emulateMedia({ colorScheme: scheme });
      await toSetupCamera(page);
      await startCamera(page);
      await page.waitForTimeout(800);
      const setup = await measure(page);
      await page.getByRole("button", { name: "Start exercise" }).click();
      await expect(page.locator(".status-slot")).toBeVisible({ timeout: 40_000 });
      await page.waitForTimeout(800);
      const session = await measure(page);
      const line = JSON.stringify({ size: `${size.width}x${size.height}`, scheme, setup, session });
      if (process.env.CAMERA_SIZES_OUT) appendFileSync(process.env.CAMERA_SIZES_OUT, line + "\n");
      // The camera is never covered by the fixed bar, and the page starts at the top with the banner in view.
      if (session.barTop !== null && session.barLeft !== null && session.barLeft <= session.frame.x + session.frame.w - 1) {
        expect(session.frame.y + session.frame.h, "the bar does not cover the camera").toBeLessThanOrEqual(session.barTop + 1);
      }
      // The camera is the main thing. On a wide screen it takes about two thirds of the width and the free height, inside the window.
      const wide = size.width >= 900;
      if (wide) {
        expect(session.frame.w, "session camera width").toBeGreaterThanOrEqual(size.width * 0.55);
        expect(session.frame.h, "session camera height").toBeGreaterThanOrEqual((size.height - session.frame.y) * 0.8);
        expect(session.frame.y + session.frame.h, "the camera ends inside the window").toBeLessThanOrEqual(size.height);
        expect(setup.frame.w, "setup camera width").toBeGreaterThanOrEqual(size.width * 0.55);
        expect(setup.frame.y + setup.frame.h, "the setup camera ends inside the window").toBeLessThanOrEqual(size.height);
      } else {
        // v3: the camera card fills the content width. LiveShell keeps 16 px of padding at each side of a phone.
        expect(session.frame.w, "the phone camera fills the content width (the card has a 1 px border)").toBe(size.width - 34);
        if (size.height >= 800) expect(session.frame.h, "the tall phone camera is a full 4:3 picture").toBeGreaterThanOrEqual(Math.floor((size.width - 34) * 0.75) - 2);
      }
      expect(session.scrollY).toBe(0);
      expect(session.bannerTop).toBeGreaterThanOrEqual(0);
      expect(session.mapInside, "the body map stays inside the camera frame").toBe(true);
    });
  }
}
