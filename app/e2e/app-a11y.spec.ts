import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { expectScreen, openMyData, saveOneSession, startCamera, toHome, toLoad, toRedFlag, toSession, toSetupCamera, toSetupGuide, toSummary } from './helpers/app';

interface Screen {
  name: string;
  /** The h1 that holds the focus after the screen change. Null for the first screen, which moves no focus. */
  h1: string | null;
  /** False when the last step is an action on the same screen. The focus then stays on that control. */
  entry?: boolean;
  /** Set for a defect that is known and reported. The focus test is then marked test.fail with this text. */
  focusDefect?: string;
  go: (page: Page) => Promise<void>;
}

const answer = async (page: Page, pain: string, swelling: string) => {
  await page.getByLabel(pain, { exact: true }).check();
  await page.getByLabel(swelling).check();
};

export const SCREENS: Screen[] = [
  {
    name: 'Privacy',
    h1: null,
    go: async (page) => {
      await page.goto('/');
      await expect(page.getByRole('heading', { level: 1, name: 'Privacy' })).toBeVisible();
    },
  },
  { name: 'Load protocol', h1: 'Load protocol file', go: toLoad },
  { name: 'Home', h1: 'Today', go: toHome },
  { name: 'RedFlag', h1: 'Check before you exercise', go: toRedFlag },
  {
    name: 'RedFlag, blocked',
    h1: 'Check before you exercise',
    entry: false,
    go: async (page) => {
      await toRedFlag(page);
      await page.getByLabel('Sudden shortness of breath or chest pain.').check();
      await expect(page.getByText('Stop. Do not exercise. Call emergency services now.')).toBeVisible();
    },
  },
  { name: 'Setup, position guide', h1: 'Set up the camera', go: toSetupGuide },
  { name: 'Setup, camera step', h1: 'Set up the camera', entry: false, go: toSetupCamera },
  {
    name: 'Setup, camera running',
    h1: 'Set up the camera',
    entry: false,
    go: async (page) => {
      await toSetupCamera(page);
      await startCamera(page);
    },
  },
  { name: 'Session', h1: 'Heel slide', go: toSession },
  { name: 'Summary', h1: 'Summary', go: toSummary },
  {
    name: 'Summary with the pause message',
    h1: 'Summary',
    entry: false,
    go: async (page) => {
      await toSummary(page);
      await answer(page, '7', 'More than before');
      await expect(page.getByText('Pause and contact your care team.')).toBeVisible();
    },
  },
  {
    name: 'Progress with charts',
    h1: 'Your sessions',
    go: async (page) => {
      await saveOneSession(page);
      await page.getByRole('button', { name: 'Sessions' }).click();
      await expectScreen(page, 'Your sessions');
      await expect(page.locator('.dash-chart-box svg').first()).toBeVisible();
    },
  },
  {
    name: 'My data',
    h1: 'My data',
    go: async (page) => {
      await saveOneSession(page);
      await openMyData(page);
    },
  },
  {
    name: 'Care team view',
    h1: 'Care team view',
    go: async (page) => {
      await toHome(page);
      await openMyData(page);
      await page.getByRole('button', { name: 'Open a session file (care team)' }).click();
      await expectScreen(page, 'Care team view');
    },
  },
];

/** Marks each control in the page that a keyboard user must reach, one radio for each group. Returns how many. */
async function markControls(page: Page) {
  return page.evaluate(() => {
    const all = [...document.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex="0"]')];
    const controls = all.filter((el) => {
      if ((el as HTMLButtonElement).disabled) return false;
      const box = el.getBoundingClientRect();
      if (getComputedStyle(el).visibility === 'hidden' || (box.width === 0 && box.height === 0)) return false;
      if (el instanceof HTMLInputElement && el.type === 'radio') {
        // A radio group is one tab stop: the checked radio, or the first one when none is checked.
        const group = [...document.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${el.name}"]`)];
        const stop = group.find((r) => r.checked) ?? group[0];
        return el === stop;
      }
      return true;
    });
    controls.forEach((el, i) => el.setAttribute('data-e2e-control', String(i)));
    return controls.length;
  });
}

for (const screen of SCREENS) {
  test.describe(screen.name, () => {
    test('axe finds no violation (wcag2a, wcag2aa, wcag21aa, wcag22aa)', async ({ page }) => {
      await screen.go(page);
      // The status word fades in for 180 ms each time it changes. Axe must not read its colour in the middle of a fade,
      // so wait until no finite animation runs in two checks that are 300 ms apart.
      const fading = () => page.evaluate(() => document.getAnimations().some((a) => a.playState === 'running' && a.effect?.getComputedTiming().iterations !== Infinity));
      for (let i = 0; i < 20; i += 1) {
        if (!(await fading())) {
          await page.waitForTimeout(300);
          if (!(await fading())) break;
        } else await page.waitForTimeout(100);
      }
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      const report = violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        url: v.helpUrl,
        nodes: v.nodes.map((n) => n.target.join(' ')),
      }));
      expect(report).toEqual([]);
    });

    if (screen.h1 !== null && screen.entry !== false) {
      test('the focus is on the new h1', async ({ page }) => {
        test.fail(screen.focusDefect !== undefined, screen.focusDefect);
        await screen.go(page);
        const active = await page.evaluate(() => ({ tag: document.activeElement?.tagName, text: document.activeElement?.textContent?.trim() }));
        expect(active).toEqual({ tag: 'H1', text: screen.h1 });
      });
    } else if (screen.h1 === null) {
      test('the first screen does not move the focus', async ({ page }) => {
        await screen.go(page);
        expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('BODY');
      });
    }

    test('Tab reaches every control, and each stop has a visible focus outline', async ({ page }) => {
      await screen.go(page);
      const count = await markControls(page);
      expect(count).toBeGreaterThan(0);
      const reached = new Set<number>();
      const noOutline: string[] = [];
      for (let i = 0; i < count + 2; i++) {
        await page.keyboard.press('Tab');
        const stop = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement | null;
          if (!el) return null;
          const css = getComputedStyle(el);
          const own = css;
          return {
            index: Number(el.getAttribute('data-e2e-control') ?? -1),
            name: `${el.tagName.toLowerCase()} ${(el.textContent || el.getAttribute('aria-label') || el.id).trim().slice(0, 40)}`,
            outlineStyle: own.outlineStyle,
            outlineWidth: parseFloat(css.outlineWidth),
          };
        });
        if (!stop || stop.index < 0) continue;
        reached.add(stop.index);
        if (stop.outlineStyle === 'none' || stop.outlineWidth === 0) noOutline.push(stop.name);
      }
      const missed = [...Array(count).keys()].filter((i) => !reached.has(i));
      expect(missed, 'controls that Tab did not reach').toEqual([]);
      expect(noOutline, 'focused controls with no outline').toEqual([]);
    });

    test('every button, and every label of a checkbox or radio, is at least 48 px', async ({ page }) => {
      await screen.go(page);
      const small = await page.evaluate(() => {
        const out: string[] = [];
        const visible = (el: Element) => {
          const b = el.getBoundingClientRect();
          return b.width > 0 && b.height > 0;
        };
        const check = (el: Element, name: string) => {
          if (!visible(el)) return;
          const b = el.getBoundingClientRect();
          if (b.width < 47.5 || b.height < 47.5) out.push(`${name} ${Math.round(b.width)}x${Math.round(b.height)}`);
        };
        document.querySelectorAll('button').forEach((el) => check(el, `button "${el.textContent?.trim()}"`));
        document.querySelectorAll('label').forEach((label) => {
          if (label.querySelector('input[type="checkbox"], input[type="radio"]')) check(label, `label "${label.textContent?.trim()}"`);
        });
        return out;
      });
      expect(small).toEqual([]);
    });
  });
}
