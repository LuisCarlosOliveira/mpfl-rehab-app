// The size rule and the side-on rule of the setup check, on every picture shape.
// The size rule compares the leg length with the longest straight line that fits the frame along the leg.
// The numbers of the real clips come from tests/fixtures/clipSeries.ts (numbers only, no frame).
import { evaluateSetup, SETUP_CONFIG, type SetupSample } from '../src/lib/setupRules';
import type { Landmark, Side } from '../src/lib/angle';
import { CLIP_SERIES, type ClipRow } from './fixtures/clipSeries';
import { rowLandmarks } from './helpers/clip';

const ASPECTS = [16 / 9, 4 / 3, 1, 3 / 4, 9 / 16];
const DIRECTIONS_DEG = [0, 90, 35, -60, 180, 125];
const IDS: Record<Side, [number, number, number]> = { left: [23, 25, 27], right: [24, 26, 28] };

const hidden = (): Landmark[] => Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0 }));
// Sizes in pixels, with the frame height as the unit. A point is stored as a fraction of the width and of the height.
const frac = (aspect: number, x: number, y: number): Landmark => ({ x: x / aspect, y, visibility: 1 });

/** The longest straight line that fits a frame along a direction (pixels, frame height is 1). */
const chord = (aspect: number, deg: number) => {
  const ux = Math.abs(Math.cos((deg * Math.PI) / 180));
  const uy = Math.abs(Math.sin((deg * Math.PI) / 180));
  return Math.min(ux > 1e-9 ? aspect / ux : Infinity, uy > 1e-9 ? 1 / uy : Infinity);
};

/** A straight leg in the middle of the frame. Its length is `share` of the frame extent along the leg. Only this leg shows. */
function straightLeg(aspect: number, deg: number, share: number, side: Side = 'left'): Landmark[] {
  const half = (share * chord(aspect, deg)) / 2;
  const ux = Math.cos((deg * Math.PI) / 180);
  const uy = Math.sin((deg * Math.PI) / 180);
  const out = hidden();
  const [h, k, a] = IDS[side];
  out[h] = frac(aspect, aspect / 2 - ux * half, 0.5 - uy * half);
  out[k] = frac(aspect, aspect / 2, 0.5);
  out[a] = frac(aspect, aspect / 2 + ux * half, 0.5 + uy * half);
  return out;
}

const steady = (landmarks: Landmark[]): SetupSample[] => Array.from({ length: 21 }, (_, i) => ({ tMs: i * 100, landmarks }));
const idOf = (landmarks: Landmark[], aspect: number, side: Side = 'left') =>
  evaluateSetup(landmarks, side, aspect, SETUP_CONFIG, steady(landmarks)).id;

describe('size rule: the leg length against the frame extent along the leg', () => {
  for (const aspect of ASPECTS) {
    for (const deg of DIRECTIONS_DEG) {
      it(`aspect ${aspect.toFixed(2)}, direction ${deg} degrees: 27 percent of the extent asks to move closer, 33 percent does not`, () => {
        expect(idOf(straightLeg(aspect, deg, 0.27), aspect)).toBe('closer');
        expect(idOf(straightLeg(aspect, deg, 0.33), aspect)).toBe('ready');
      });
    }
  }

  it('does not ask a person who stands in a wide frame to move closer when the leg fills 40 percent of the frame height', () => {
    // A standing person with the whole body in a 16:9 frame has a leg of about 0.4 of the frame height.
    const aspect = 16 / 9;
    const leg = straightLeg(aspect, 90, 0.4);
    expect(idOf(leg, aspect)).toBe('ready');
  });

  it('does not ask a person who lies in a tall frame to move closer when the leg fills 40 percent of the frame width', () => {
    const aspect = 9 / 16;
    expect(idOf(straightLeg(aspect, 0, 0.4), aspect)).toBe('ready');
  });

  it('takes the direction of the thigh when a deep bend puts the ankle near the hip', () => {
    // Heel slide: the thigh lies along the frame width and the shank folds back. The leg is small against the width.
    const aspect = 16 / 9;
    const out = hidden();
    const [h, k, a] = IDS.left;
    out[h] = frac(aspect, 0.6, 0.5);
    out[k] = frac(aspect, 0.8, 0.5); // thigh 0.2 along the width
    out[a] = frac(aspect, 0.6, 0.53); // ankle 0.03 below the hip, shank about 0.2
    expect(idOf(out, aspect)).toBe('closer');
    // The same leg length along a thigh that points down is larger against the frame height.
    out[k] = frac(aspect, 0.6, 0.7);
    out[a] = frac(aspect, 0.63, 0.5);
    expect(idOf(out, aspect)).toBe('ready');
  });

  it('asks to move closer when hip, knee and ankle sit on one point', () => {
    const aspect = 16 / 9;
    const out = hidden();
    for (const i of IDS.left) out[i] = frac(aspect, aspect / 2, 0.5);
    expect(idOf(out, aspect)).toBe('closer');
  });
});

describe('side-on rule: the hip gap against the leg length, in pixels', () => {
  for (const aspect of ASPECTS) {
    it(`aspect ${aspect.toFixed(2)}: a gap of 20 percent of the leg length passes, a gap of 30 percent asks to turn side-on`, () => {
      const leg = (gap: number) => {
        const lm = straightLeg(aspect, 90, 0.5);
        const near = lm[23] as Landmark;
        const L = 0.5 * chord(aspect, 90);
        lm[24] = frac(aspect, near.x * aspect + gap * L, near.y);
        return lm;
      };
      expect(idOf(leg(0.2), aspect)).toBe('ready');
      expect(idOf(leg(0.3), aspect)).toBe('side-on');
    });
  }
});

// Real clips. The near leg shows. The other leg is hidden, so only the size and the edge rules can fail.
const mirrored = (lm: Landmark[]): Landmark[] => lm.map((p) => ({ ...p, x: 1 - p.x }));
const turned = (lm: Landmark[]): Landmark[] => lm.map((p) => ({ ...p, x: p.y, y: 1 - p.x }));
function legOnly(row: NonNullable<ClipRow>, side: Side): Landmark[] {
  const all = rowLandmarks(row);
  const out = hidden();
  for (const i of IDS[side]) out[i] = all[i] as Landmark;
  return out;
}
const framesOf = (clip: string, side: Side) =>
  (CLIP_SERIES[clip]!.rows.filter((r) => r !== null) as NonNullable<ClipRow>[]).map((r) => legOnly(r, side)).filter((lm) => IDS[side].every((i) => (lm[i]?.visibility ?? 0) >= 0.5));
const share = (clip: string, side: Side, id: string) => {
  const aspect = CLIP_SERIES[clip]!.aspect;
  const frames = framesOf(clip, side);
  return frames.filter((lm) => idOf(lm, aspect, side) === id).length / frames.length;
};

describe('size rule on the saved landmarks of the real clips', () => {
  it('lets a standing person with the whole body in the frame pass the size rule (clips 05 and 07)', () => {
    expect(share('05', 'left', 'closer')).toBeLessThan(0.2);
    expect(share('07', 'left', 'closer')).toBeLessThan(0.2);
    expect(share('07', 'right', 'closer')).toBeLessThan(0.2);
  });

  it('keeps the text "Move closer." for a person who lies far from the camera (clips 01 and 02)', () => {
    expect(share('01', 'left', 'closer')).toBeGreaterThan(0.95);
    expect(share('01', 'right', 'closer')).toBeGreaterThan(0.95);
    expect(share('02', 'left', 'closer')).toBeGreaterThan(0.7);
    expect(share('02', 'right', 'closer')).toBeGreaterThan(0.7);
  });

  it.each([['01'], ['02'], ['05'], ['06'], ['07']])('clip %s: a mirrored picture or a picture turned by 90 degrees gives the same text in every frame', (clip) => {
    const aspect = CLIP_SERIES[clip]!.aspect;
    let checked = 0;
    for (const side of ['left', 'right'] as const) {
      for (const lm of framesOf(clip, side)) {
        const id = idOf(lm, aspect, side);
        expect(idOf(mirrored(lm), aspect, side)).toBe(id);
        expect(idOf(turned(lm), 1 / aspect, side)).toBe(id);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(100);
  });
});
