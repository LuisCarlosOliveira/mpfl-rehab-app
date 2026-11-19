// The other exercises with a simulated pose: one good rep or hold and one that misses, with the limits of the example plan.
// The count must move for the good one only. No verdict word shows, and no sound plays when no limit is near.
import { expect, test } from '@playwright/test';
import { watch } from './helpers/app';
import { runParts, toLive } from './helpers/simLive';
import { gone, reps, still } from './helpers/simSeries';
import type { SimFrame } from './helpers/simPose';
import type { PoseId } from '../tests/helpers/landmarkSeries';

test.setTimeout(120_000);

const VERDICT = /\b(good|great|well done|perfect|correct|wrong|bad|excellent|pass|fail|score)\b/i;
const slow = { upMs: 1500, holdMs: 1200, downMs: 1500, gapMs: 1500, leadMs: 0, reps: 1 };

interface Case {
  title: string;
  exercise: Record<string, unknown>;
  pose: PoseId;
  rest: number;
  /** The parts after a still lead: the series that must count, then the one that must not. */
  good: SimFrame[];
  bad: SimFrame[];
}

const cases: Case[] = [
  {
    title: 'mini squat',
    exercise: { kind: 'mini-squat', sets: 2, reps: 5, targetFlexion: 30, maxFlexion: 50, returnWithinDeg: 15, minRepSeconds: 2 },
    pose: 'mini-squat',
    rest: 0,
    good: reps('mini-squat', { ...slow, restValue: 0, peakValue: 35 }),
    bad: reps('mini-squat', { ...slow, restValue: 0, peakValue: 18 }),
  },
  {
    title: 'straight leg raise',
    exercise: { kind: 'straight-leg-raise', sets: 2, reps: 5 },
    pose: 'straight-leg-raise',
    rest: 0,
    good: reps('straight-leg-raise', { ...slow, restValue: 0, peakValue: 0.25 }),
    bad: reps('straight-leg-raise', { ...slow, restValue: 0, peakValue: 0.02 }),
  },
];

for (const c of cases) {
  test(`${c.title}: a good movement counts, a small one does not, no verdict, no sound`, async ({ page, baseURL }) => {
    const seen = watch(page, new URL(baseURL!).origin);
    await toLive(page, c.exercise, still(c.pose, c.rest, 60_000));
    const parts = [still(c.pose, c.rest, 3500), c.bad, still(c.pose, c.rest, 2000), c.good, still(c.pose, c.rest, 2000), gone(2300), still(c.pose, c.rest, 1500)];
    const { at, log, win } = await runParts(page, parts, 1500);
    const [, mBad, , mGood, , mLost] = at as [number, number, number, number, number, number];
    console.log(c.title, 'marks', at.join(','));
    console.log(log.filter((_, i) => i % 6 === 0).map((r) => `${r.t}|${r.angle}|reps ${r.reps}|cue:${r.cue}|b${r.beeps}`).join('\n'));
    expect(win(mBad, mGood).at(-1)!.reps, 'a small movement counts nothing').toBe(0);
    expect(win(mGood, mLost).at(-1)!.reps, 'a good movement counts').toBeGreaterThan(0);
    // The count does not rise during a lost pose.
    const before = win(mGood, mLost).at(-1)!.reps;
    expect(win(mLost, at.at(-1)! + 1500).every((r) => r.reps <= before + 0)).toBe(true);
    expect(win(mLost + 1000, at[6]!).every((r) => r.angle === '--')).toBe(true);
    expect(log.some((r) => VERDICT.test(r.cue) || VERDICT.test(r.alert))).toBe(false);
    expect(log.at(-1)!.beeps).toBe(0);
    await seen.expectClean(c.title);
  });
}
