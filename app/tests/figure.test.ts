import { flexion, kneeAngle, type Side } from '../src/lib/angle';
import { figureFor, ILLUSTRATIVE_FLEXION } from '../src/lib/figure';
import { EXERCISE_KINDS } from '../src/lib/protocol/schema';

const SIDES: Side[] = ['left', 'right'];
const FRAMES = ['start', 'end'] as const;

describe('figureFor', () => {
  it.each(EXERCISE_KINDS)('%s: the drawn knee angle at the end frame matches the documented value', (kind) => {
    SIDES.forEach((side) => {
      const { points, kneeArc } = figureFor(kind, 'end', side);
      const drawn = flexion(kneeAngle(points.hip, points.knee, points.ankle, 1));
      expect(Math.abs((drawn as number) - ILLUSTRATIVE_FLEXION[kind])).toBeLessThan(1);
      expect(kneeArc.flexionDeg).toBe(ILLUSTRATIVE_FLEXION[kind]);
    });
  });

  it.each(EXERCISE_KINDS)('%s: the knee arc spans the drawn angle', (kind) => {
    const { kneeArc } = figureFor(kind, 'end', 'left');
    const span = Math.abs(((kneeArc.toDeg - kneeArc.fromDeg + 540) % 360) - 180);
    expect(Math.abs(span - (180 - kneeArc.flexionDeg))).toBeLessThan(1);
  });

  it.each(EXERCISE_KINDS)('%s: the operated leg is the near leg for left and right', (kind) => {
    SIDES.forEach((side) => {
      const fig = figureFor(kind, 'start', side);
      expect(fig.nearLeg).toBe(side);
      expect(fig.facing).toBe(side === 'right' ? 1 : -1);
      // The toe points ahead of the figure in the standing and seated frames, up in the lying ones.
      const nearLines = fig.lines.filter((l) => l.limb === 'near').map((l) => `${l.from}-${l.to}`);
      expect(nearLines).toEqual(['hip-knee', 'knee-ankle', 'ankle-toe']);
      expect(fig.lines.filter((l) => l.limb === 'far').length).toBeGreaterThan(0);
    });
  });

  it('left and right drawings mirror each other', () => {
    const l = figureFor('mini-squat', 'end', 'left');
    const r = figureFor('mini-squat', 'end', 'right');
    expect(l.points.knee.x).toBeCloseTo(100 - r.points.knee.x, 6);
    expect(l.points.knee.y).toBeCloseTo(r.points.knee.y, 6);
    // The knee moves ahead of the ankle, in the facing direction.
    expect(Math.sign(r.points.knee.x - r.points.ankle.x)).toBe(1);
    expect(Math.sign(l.points.knee.x - l.points.ankle.x)).toBe(-1);
  });

  it.each(EXERCISE_KINDS)('%s: every point, the camera, the labels and the support are inside 0 to 100', (kind) => {
    const inside = (v: number) => v >= 0 && v <= 100;
    SIDES.forEach((side) =>
      FRAMES.forEach((frame) => {
        const fig = figureFor(kind, frame, side);
        const pts = [...Object.values(fig.points), fig.camera, fig.kneeArc.center, ...fig.labels.map((l) => l.at)];
        pts.forEach((p) => expect(inside(p.x) && inside(p.y)).toBe(true));
        if (fig.support) {
          const s = fig.support;
          expect([s.x, s.y, s.x + s.w, s.y + s.h].every(inside)).toBe(true);
        }
        expect(inside(fig.floorY)).toBe(true);
      }),
    );
  });

  it.each(EXERCISE_KINDS)('%s: has the labels operated leg, camera and the frame name', (kind) => {
    FRAMES.forEach((frame) => {
      const keys = figureFor(kind, frame, 'left').labels.map((l) => l.key);
      expect(keys).toEqual(expect.arrayContaining(['operatedLeg', 'camera', frame]));
    });
  });

  it('the heel stays on the surface in the heel slide', () => {
    const start = figureFor('heel-slide', 'start', 'right').points.ankle.y;
    expect(figureFor('heel-slide', 'end', 'right').points.ankle.y).toBeCloseTo(start, 6);
  });

  it('start and end frames differ for each exercise', () => {
    EXERCISE_KINDS.forEach((k) => expect(figureFor(k, 'start', 'left').points).not.toEqual(figureFor(k, 'end', 'left').points));
  });
});
