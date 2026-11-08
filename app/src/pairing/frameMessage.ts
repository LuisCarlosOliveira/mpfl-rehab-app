// What the phone sends: the three joints of each leg (hip, knee, ankle) with visibility, and nothing else.
// The schema needs 33 entries, so the other 27 landmarks are sent as zero with visibility 0.
// No pixel, no face landmark and no frame leaves the phone (FR6, FR25, NFR1).
import type { Landmark } from '../lib/angle';
import { LANDMARK_COUNT } from '../lib/pairing';
import type { LandmarksMessage } from '../lib/pairing';
import type { View } from '../lib/views';

export const SEND_HZ = 15; // PROPOSAL: the 15 frames each second of NFR4. The phone sends at most this rate.
const LEG_FIRST = 23; // MediaPipe indices 23 to 28: left hip, right hip, left knee, right knee, left ankle, right ankle
const LEG_LAST = 28;

const round4 = (n: number) => Math.round(n * 1e4) / 1e4;
const clamp = (n: number, low: number, high: number) => Math.min(high, Math.max(low, n));
const HIDDEN = { x: 0, y: 0, visibility: 0 };

export function landmarksMessage(landmarks: Landmark[], view: View, timeMs: number, aspect: number): LandmarksMessage {
  if (landmarks.length < LANDMARK_COUNT) throw new Error('A pose has 33 landmarks.');
  return {
    type: 'landmarks',
    tMs: Math.round(timeMs),
    view,
    aspect: clamp(round4(aspect), 0.2, 5),
    landmarks: landmarks.slice(0, LANDMARK_COUNT).map((l, i) =>
      i >= LEG_FIRST && i <= LEG_LAST
        ? { x: clamp(round4(l.x), -1, 2), y: clamp(round4(l.y), -1, 2), visibility: clamp(round4(l.visibility ?? 0), 0, 1) }
        : { ...HIDDEN },
    ),
  };
}

/** Returns a function that says whether a message may go out at this time. It keeps the rate at or below `hz`. */
export function createThrottle(hz: number): (nowMs: number) => boolean {
  const gap = 1000 / hz;
  let last = -Infinity;
  return (nowMs) => {
    if (nowMs >= last && nowMs - last < gap) return false;
    last = nowMs;
    return true;
  };
}
