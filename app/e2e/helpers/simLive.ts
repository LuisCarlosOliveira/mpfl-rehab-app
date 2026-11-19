// Shared steps of the simulated-pose specs: Home to the live Session screen, and a log of what the screen shows.
import { expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { EXAMPLE, expectScreen, installProbes } from './app';
import { installSimPose, play, type SimFrame } from './simPose';
import { cat } from './simSeries';

export const NAMES: Record<string, string> = {
  'heel-slide': 'Heel slide',
  'mini-squat': 'Mini squat',
  'seated-extension-hold': 'Seated knee extension hold',
  'straight-leg-raise': 'Straight leg raise',
  'ankle-pump': 'Ankle pump',
  'leg-raise-side': 'Leg raise to the side',
};

type Ex = Record<string, unknown>;

function protocolFile(exercise: Ex) {
  const base = JSON.parse(readFileSync(EXAMPLE, 'utf8'));
  base.phases[0].exercises = [{ source: 'PROPOSAL', ...exercise }];
  return { name: 'p.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(base)) };
}

/** Home to the Session screen. The setup check sees `rest` (a still leg), so it shows its numbers. */
export async function toLive(page: Page, exercise: Ex, rest: SimFrame[]) {
  await installProbes(page);
  await installSimPose(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'I understand' }).click();
  await page.getByLabel('Choose a file from your care team').setInputFiles(protocolFile(exercise));
  await expectScreen(page, 'Today');
  const name = NAMES[exercise.kind as string]!;
  await page.getByRole('button', { name: `Start ${name}` }).click();
  await page.getByRole('button', { name: 'None of these apply. Continue' }).click();
  await page.getByRole('button', { name: 'Next: set up the camera' }).click();
  await page.getByRole('button', { name: 'Start camera' }).click();
  await play(page, rest);
  await expect(page.getByTestId('instruction')).toBeVisible();
  await page.getByRole('button', { name: 'Start exercise' }).click();
  await expectScreen(page, name);
}

export const angleText = (page: Page) => page.locator('.live-angle .v3-num').innerText();

export interface Row {
  t: number;
  angle: string;
  reps: number;
  cue: string;
  alert: string;
  beeps: number;
}
declare global {
  interface Window {
    __log: Row[];
  }
}

/** Write one row of what the screen shows every 100 ms. `t` is the time of the series. */
export const record = (page: Page) =>
  page.evaluate(() => {
    window.__log = [];
    setInterval(() => {
      const text = (sel: string) => (document.querySelector(sel) as HTMLElement | null)?.innerText ?? '';
      window.__log.push({
        t: Math.round(performance.now() - window.__sim.startAt),
        angle: text('.live-angle .v3-num').replace(/\n/g, ' '),
        reps: Number(text('.live-reps .v3-num b')),
        cue: text('p.cue[role="status"]'),
        alert: text('p.cue-alert'),
        beeps: window.__beeps.length,
      });
    }, 100);
  });
export const rowsOf = (page: Page) => page.evaluate(() => window.__log);
export const length = (frames: SimFrame[]) => (frames.at(-1)?.tMs ?? 0) + 33;
/** The start time of each part when the parts are joined with cat(). */
export const starts = (parts: SimFrame[][]) => parts.map((_, i) => parts.slice(0, i).reduce((sum, p) => sum + length(p), 0));

/** Play the parts one after the other and return the log, with the start time of each part and a window filter. */
export async function runParts(page: Page, parts: SimFrame[][], tail = 1500) {
  const at = starts(parts);
  const end = at.at(-1)! + length(parts.at(-1)!);
  await record(page);
  await play(page, cat(...parts));
  await page.waitForTimeout(end + tail);
  const log = await rowsOf(page);
  return { at, end, log, win: (a: number, b: number) => log.filter((r) => r.t >= a && r.t < b) };
}
