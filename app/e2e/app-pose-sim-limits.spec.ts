// Limit cues, sound and a swapped leg with a simulated pose (helpers/simPose.ts). Heel slide with a limit of 90 degrees.
import { expect, test } from '@playwright/test';
import { watch } from './helpers/app';
import { runParts, toLive } from './helpers/simLive';
import { reps, still } from './helpers/simSeries';

test.setTimeout(120_000);

const HEEL = { kind: 'heel-slide', sets: 2, reps: 5, targetFlexion: 60, maxFlexion: 90, returnWithinDeg: 20, minRepSeconds: 2 };
const slow = { upMs: 1500, holdMs: 800, downMs: 1500, gapMs: 1500, restValue: 5, leadMs: 0, reps: 1 };

test('heel slide: near-limit and over-limit make the cue and the beep, an in-range rep makes none', async ({ page, baseURL }) => {
  const seen = watch(page, new URL(baseURL!).origin);
  await toLive(page, HEEL, still('heel-slide', 5, 60_000));
  // The limit is 90 and the margin is 9 degrees: near from 81, over above 99.
  const parts = [
    still('heel-slide', 5, 3500),
    reps('heel-slide', { ...slow, peakValue: 70 }),
    still('heel-slide', 5, 3500),
    reps('heel-slide', { ...slow, peakValue: 85 }),
    still('heel-slide', 5, 3500),
    reps('heel-slide', { ...slow, peakValue: 105 }),
  ];
  const { at, log, win } = await runParts(page, parts, 2500);
  const [, mIn, , mNear, , mOver] = at as [number, number, number, number, number, number];
  console.log(log.filter((_, i) => i % 6 === 0).map((r) => `${r.t}|${r.angle}|reps ${r.reps}|cue:${r.cue}|alert:${r.alert}|b${r.beeps}`).join('\n'));
  expect(win(mIn, mNear - 3000).filter((r) => r.cue !== '' || r.alert !== '' || r.beeps > 0)).toEqual([]);
  const near = win(mNear, mOver - 3000);
  expect(near.some((r) => r.cue === 'Close to your limit, stop.')).toBe(true);
  expect(near.at(-1)!.beeps).toBe(2); // the near-limit sound is two beeps
  expect(near.at(-1)!.reps).toBe(2); // a near-limit rep still counts
  const over = win(mOver, mOver + 9000);
  expect(over.some((r) => r.alert === 'Stop at your limit, do not push.')).toBe(true);
  expect(over.at(-1)!.beeps).toBeGreaterThan(near.at(-1)!.beeps);
  expect(over.at(-1)!.reps).toBe(2); // an over-limit rep does not count
  await seen.expectClean('heel slide limits');
});

test('heel slide: the left leg named right gives no angle and no rep', async ({ page, baseURL }) => {
  const seen = watch(page, new URL(baseURL!).origin);
  await toLive(page, HEEL, still('heel-slide', 5, 60_000));
  await page.evaluate(() => {
    window.__sim.swap = true;
  });
  const { win, end } = await runParts(page, [still('heel-slide', 5, 3000), reps('heel-slide', { ...slow, peakValue: 70 })]);
  console.log(win(0, end).filter((_, i) => i % 8 === 0).map((r) => `${r.t}|${r.angle}|reps ${r.reps}|cue:${r.cue}`).join('\n'));
  expect(win(0, end).at(-1)!.reps).toBe(0);
  expect(win(2000, end).every((r) => r.angle === '--')).toBe(true);
  await seen.expectClean('swapped legs');
});
