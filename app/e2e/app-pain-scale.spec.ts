// Safety pin for the pain scale on Summary: 11 radios, none pre-selected, each box 48 px or more in width and height,
// at 390, 360 and 320 px wide and with the text at 200 percent (the scale wraps onto more rows, it never shrinks).
// Pain 7 still shows the pause message. The page does not scroll sideways.
import { expect, test } from '@playwright/test';
import { toSummary } from './helpers/app';

const SIZES = [
  { width: 390, height: 844 },
  { width: 360, height: 640 },
  { width: 320, height: 568 },
];

for (const size of SIZES) {
  for (const zoom of [100, 200]) {
    test(`pain scale at ${size.width} px wide, text ${zoom} percent`, async ({ page }) => {
      await page.setViewportSize(size);
      await toSummary(page);
      if (zoom === 200) await page.evaluate(() => document.documentElement.style.setProperty('font-size', '200%', 'important'));
      const radios = page.locator('.v2-pain input[type="radio"]');
      await expect(radios).toHaveCount(11);
      for (let i = 0; i < 11; i += 1) await expect(radios.nth(i)).not.toBeChecked();
      const boxes = await page.locator('.v2-pain .scale-item').evaluateAll((els) => els.map((el) => el.getBoundingClientRect()).map((r) => ({ w: r.width, h: r.height, right: r.right, left: r.left })));
      expect(boxes).toHaveLength(11);
      for (const b of boxes) {
        expect(b.w, 'each box is 48 px wide or more').toBeGreaterThanOrEqual(47.5);
        expect(b.h, 'each box is 48 px high or more').toBeGreaterThanOrEqual(47.5);
        expect(b.left).toBeGreaterThanOrEqual(0);
        expect(b.right).toBeLessThanOrEqual(size.width + 0.5);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.getByLabel('7', { exact: true }).click();
      await expect(page.getByText(/You reported pain 7/)).toBeVisible();
    });
  }
}
