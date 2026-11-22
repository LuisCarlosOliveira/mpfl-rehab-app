// Simulated-pose live tests for the ankle pump, the leg raise to the side and the seated knee extension hold.
// The stub replaces the pose model only (helpers/simPose.ts). Each test checks the screen against the numbers of the series.
// The limits come from src/lib/monitor/modes.ts and exercises.ts: pump 30 degrees, side lift gate 3 degrees for 500 ms,
// hold band = targetFlexion + 9 degrees for holdSeconds, arc end = minFlexion - 9 degrees.
import { expect, test } from '@playwright/test';
import { watch } from './helpers/app';
import { runParts, toLive, type Row } from './helpers/simLive';
import { gone, reps, still } from './helpers/simSeries';

test.setTimeout(150_000);

const VERDICT = /\b(good|great|well done|perfect|correct|wrong|bad|excellent|pass|fail|score)\b/i;
const dump = (title: string, log: Row[]) => {
  console.log(title);
  console.log(log.filter((_, i) => i % 6 === 0).map((r) => `${r.t}|${r.angle}|reps ${r.reps}|cue:${r.cue}|alert:${r.alert}|b${r.beeps}`).join('\n'));
};

test('ankle pump: a 10 degree movement counts nothing, real pumps count, no pose holds the count', async ({ page, baseURL }) => {
  const seen = watch(page, new URL(baseURL!).origin);
  const exercise = { kind: 'ankle-pump', sets: 2, reps: 10 };
  await toLive(page, exercise, still('ankle-pump', 100, 60_000));
  const parts = [
    still('ankle-pump', 100, 3500),
    reps('ankle-pump', { cycles: 4, lowDeg: 100, highDeg: 110, periodS: 2 }), // a 10 degree movement, below the 30 degree rule
    still('ankle-pump', 100, 2000),
    still('ankle-pump', 75, 2000),
    reps('ankle-pump', { cycles: 3, lowDeg: 75, highDeg: 125, periodS: 2 }), // a 50 degree pump
    still('ankle-pump', 75, 2000),
    gone(2500),
    still('ankle-pump', 75, 2500),
  ];
  const { at, log, win } = await runParts(page, parts, 1500);
  const [, mSmall, , , mPump, mAfter, mLost, mBack] = at as [number, number, number, number, number, number, number, number];
  dump('ankle pump', log);
  expect(win(mSmall, mPump).at(-1)!.reps, 'a 10 degree movement counts nothing').toBe(0);
  const counted = win(mPump, mAfter + 1500).at(-1)!.reps;
  expect(counted, 'three real pumps count').toBe(3);
  expect(win(mLost + 1000, mBack).every((r) => r.angle === '--')).toBe(true);
  expect(win(mLost, log.at(-1)!.t + 1).every((r) => r.reps === counted), 'no pose holds the count').toBe(true);
  expect(log.some((r) => VERDICT.test(r.cue) || VERDICT.test(r.alert))).toBe(false);
  expect(log.at(-1)!.beeps).toBe(0);
  await seen.expectClean('ankle pump');
});

test('leg raise to the side: a lift counts, a small raise and a quick flick do not, no pose holds the count', async ({ page, baseURL }) => {
  const seen = watch(page, new URL(baseURL!).origin);
  const exercise = { kind: 'leg-raise-side', sets: 2, reps: 10 };
  await toLive(page, exercise, still('leg-raise-side', -10, 60_000));
  const lift = { restValue: -10, leadMs: 0, reps: 1, gapMs: 1500 };
  const parts = [
    still('leg-raise-side', -10, 3500),
    reps('leg-raise-side', { ...lift, peakValue: -2, upMs: 1500, holdMs: 1500, downMs: 1500 }), // under the 3 degree gate
    still('leg-raise-side', -10, 1500),
    reps('leg-raise-side', { ...lift, peakValue: 35, upMs: 150, holdMs: 1, downMs: 150 }), // above the gate for less than 500 ms
    still('leg-raise-side', -10, 1500),
    reps('leg-raise-side', { ...lift, peakValue: 35, upMs: 1500, holdMs: 1200, downMs: 1500 }),
    still('leg-raise-side', -10, 1500),
    gone(2500),
    still('leg-raise-side', -10, 2000),
  ];
  const { at, log, win } = await runParts(page, parts, 1500);
  const [, mSmall, , mFlick, , mGood, , mLost, mBack] = at as [number, number, number, number, number, number, number, number, number];
  dump('leg raise to the side', log);
  expect(win(mSmall, mFlick).at(-1)!.reps, 'a small raise counts nothing').toBe(0);
  expect(win(mFlick, mGood).at(-1)!.reps, 'a quick flick counts nothing').toBe(0);
  expect(win(mGood, mLost).at(-1)!.reps, 'a real lift counts once').toBe(1);
  expect(win(mLost + 1000, mBack).every((r) => r.angle === '--')).toBe(true);
  expect(win(mLost, log.at(-1)!.t + 1).every((r) => r.reps === 1), 'no pose holds the count').toBe(true);
  await expect(page.getByText('The camera cannot measure this angle well.')).toBeVisible();
  expect(log.some((r) => r.alert !== '')).toBe(false);
  expect(log.some((r) => VERDICT.test(r.cue))).toBe(false);
  expect(log.at(-1)!.beeps).toBe(0);
  await seen.expectClean('leg raise to the side');
});

test('seated knee extension hold: a full hold counts, a short one gives the restart cue, a knee too straight gives the stop cue', async ({ page, baseURL }) => {
  const seen = watch(page, new URL(baseURL!).origin);
  // Band: flexion up to 60 + 9 = 69 degrees for 3 s. Arc end: below 30 - 9 = 21 degrees is over the limit.
  const exercise = { kind: 'seated-extension-hold', sets: 2, reps: 3, holdSeconds: 3, minFlexion: 30, targetFlexion: 60 };
  await toLive(page, exercise, still('seated-extension-hold', 90, 60_000));
  const hold = (peak: number, holdMs: number) =>
    reps('seated-extension-hold', { restValue: 90, peakValue: peak, upMs: 800, holdMs, downMs: 800, gapMs: 0, leadMs: 0, reps: 1 });
  const parts = [
    still('seated-extension-hold', 90, 3500),
    hold(80, 5000), // never inside the band (80 is above 69)
    still('seated-extension-hold', 90, 3500),
    hold(50, 1500), // inside the band for 1.5 s: shorter than 3 s
    still('seated-extension-hold', 90, 3500),
    hold(50, 5000), // inside the band for 5 s
    still('seated-extension-hold', 90, 3500),
    hold(15, 3000), // 15 is under the arc end of 21
    still('seated-extension-hold', 90, 2500),
  ];
  const { at, log, win } = await runParts(page, parts, 1500);
  const [, mMiss, , mShort, , mFull, , mStraight] = at as [number, number, number, number, number, number, number, number];
  dump('seated hold', log);
  expect(win(mMiss, mShort).at(-1)!.reps, 'a knee outside the band counts nothing').toBe(0);
  expect(win(mMiss, mShort).filter((r) => r.cue !== '' || r.alert !== '')).toEqual([]);
  expect(win(mShort, mFull).at(-1)!.reps, 'a short hold counts nothing').toBe(0);
  expect(win(mShort, mFull).some((r) => r.cue === 'The knee left the hold angle. The hold timer starts again.')).toBe(true);
  expect(win(mFull, mStraight).at(-1)!.reps, 'a full hold counts once').toBe(1);
  const beepsBefore = win(mShort, mFull).at(-1)!.beeps;
  expect(win(mFull, mStraight).filter((r) => r.alert !== '' || r.beeps > beepsBefore)).toEqual([]);
  const straight = win(mStraight, log.at(-1)!.t + 1);
  expect(straight.some((r) => r.alert === 'Stop at your limit, do not push.')).toBe(true);
  expect(straight.at(-1)!.beeps).toBeGreaterThan(beepsBefore);
  expect(straight.at(-1)!.reps, 'a knee too straight counts nothing').toBe(1);
  expect(log.some((r) => VERDICT.test(r.cue) || VERDICT.test(r.alert))).toBe(false);
  await seen.expectClean('seated hold');
});
