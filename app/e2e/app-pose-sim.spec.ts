import { expect, test, type Page } from '@playwright/test';
import { expectScreen, stopButton, trackStates, watch } from './helpers/app';
import { play, type SimFrame } from './helpers/simPose';
import { ASPECT, cat, gone, reps, still } from './helpers/simSeries';
import { angleText, length, record, rowsOf, starts, toLive } from './helpers/simLive';

test.setTimeout(120_000);


/** The place of a joint circle of the body map in picture fractions, or null when it is hidden. */
const joint = (page: Page, side: 'left' | 'right', j: 0 | 1 | 2) =>
  page.evaluate(
    ([s, i, aspect]) => {
      const el = document.querySelector(`svg [data-k="${s}-j${i}"]`);
      if (!el || el.getAttribute('display') === 'none') return null;
      return { x: Number(el.getAttribute('cx')) / (aspect * 1000), y: Number(el.getAttribute('cy')) / 1000 };
    },
    [side, j, ASPECT] as const,
  );

const HEEL = { kind: 'heel-slide', sets: 2, reps: 3, targetFlexion: 60, maxFlexion: 90, returnWithinDeg: 20, minRepSeconds: 2 };

test('heel slide: skeleton follows, angle, reps from movement, cues, set done, stop', async ({ page, baseURL }) => {
  const seen = watch(page, new URL(baseURL!).origin);
  await toLive(page, HEEL, still('heel-slide', 5, 60_000));

  // No pose: the number is "--" and nothing is drawn.
  await play(page, gone(60_000));
  await expect.poll(() => angleText(page)).toBe('--');
  expect(await joint(page, 'left', 1)).toBeNull();

  // A still leg gives the starting angle. The skeleton sits on the landmarks and follows when the leg moves.
  const lm = (frames: SimFrame[]) => frames[0]!.landmarks!;
  for (const flex of [5, 45]) {
    const frames = still('heel-slide', flex, 60_000);
    await play(page, frames);
    const want = lm(frames)[25]!;
    const miss = async () => {
      const k = await joint(page, 'left', 1);
      return k === null ? 1 : Math.hypot(k.x - want.x, k.y - want.y);
    };
    await expect.poll(miss, { timeout: 5000, message: `knee at flexion ${flex}` }).toBeLessThan(0.01);
  }

  // The measured number shows with its limit.
  await play(page, still('heel-slide', 45, 60_000));
  await expect.poll(async () => Number((await angleText(page)).replace(/\D/g, '')), { timeout: 5000 }).toBeGreaterThan(40);
  expect(Math.abs(Number((await angleText(page)).replace(/\D/g, '')) - 45)).toBeLessThanOrEqual(3);
  await expect(page.locator('.gauge-caption')).toHaveText('Your limit 90 degrees');
  console.log('angle text:', await angleText(page), '| caption:', await page.locator('.readout-caption').innerText());

  await seen.expectClean('heel slide');
  await stopButton(page).click();
  await expectScreen(page, 'Summary');
  expect(await trackStates(page)).toEqual(['video:ended']);
});

test('heel slide: good rep, shallow rep, fast rep, no pose, pose back, set done', async ({ page, baseURL }) => {
  const seen = watch(page, new URL(baseURL!).origin);
  await toLive(page, HEEL, still('heel-slide', 5, 60_000));
  const slow = { upMs: 1500, holdMs: 500, downMs: 1500, gapMs: 1500, restValue: 5, leadMs: 0, reps: 1 };
  const parts = [
    still('heel-slide', 5, 3500),
    reps('heel-slide', { ...slow, peakValue: 70 }),
    reps('heel-slide', { ...slow, peakValue: 50 }),
    still('heel-slide', 5, 2500), // the cue gate lets one cue pass in 3 s (CUE_MIN_GAP_MS)
    reps('heel-slide', { ...slow, peakValue: 70, upMs: 400, holdMs: 100, downMs: 400 }),
    gone(2300),
    still('heel-slide', 5, 1500),
    reps('heel-slide', { ...slow, peakValue: 70 }),
  ];
  const [mLead, mGood, mShallow, , mFast, mLost, mBack, mGood2] = starts(parts) as number[] as [number, number, number, number, number, number, number, number];
  const mEnd = mGood2 + length(parts[7]!);
  await record(page);
  await play(page, cat(...parts));
  await page.waitForTimeout(mEnd + 1000);
  const log = await rowsOf(page);
  const win = (a: number, b: number) => log.filter((r) => r.t >= a && r.t < b);
  console.log('marks', [mLead, mGood, mShallow, mFast, mLost, mBack, mGood2, mEnd].join(','));
  console.log(log.filter((_, i) => i % 5 === 0).map((r) => `${r.t}|${r.angle}|reps ${r.reps}|cue:${r.cue}|alert:${r.alert}|b${r.beeps}`).join('\n'));

  // Good rep: counts once, no cue, no sound.
  expect(win(mGood, mShallow).at(-1)!.reps).toBe(1);
  expect(win(mLead, mShallow).filter((r) => r.cue !== '' || r.alert !== '')).toEqual([]);
  // Shallow rep: no count, a cue that names the target.
  expect(win(mShallow, mFast).at(-1)!.reps).toBe(1);
  expect(win(mShallow, mFast).some((r) => r.cue === 'Depth below your target.')).toBe(true);
  // Fast rep: counts, and the cue names the measured time and the set time.
  expect(win(mFast, mLost).at(-1)!.reps).toBe(2);
  expect(win(mFast, mLost).some((r) => /^Slow down\. Rep time \d\.\d s\. Your care team set at least 2\.0 s\.$/.test(r.cue))).toBe(true);
  // No pose for 2 seconds: "--" and the cue about the leg.
  expect(win(mLost + 1000, mBack).every((r) => r.angle === '--')).toBe(true);
  expect(win(mLost, mBack + 600).some((r) => r.cue === 'Show your whole leg.')).toBe(true);
  // Pose found again: the number returns and the count did not move.
  expect(win(mBack + 800, mGood2).some((r) => /^\d+ degrees?$/.test(r.angle))).toBe(true);
  expect(win(mBack, mGood2).at(-1)!.reps).toBe(2);
  // Third rep ends the set. No sound for any of this (no rep was near the limit).
  await expect(page.getByText('Set 1 done. Rest when you are ready.')).toBeVisible();
  expect(log.at(-1)!.beeps).toBe(0);
  await seen.expectClean('heel slide reps');
});
