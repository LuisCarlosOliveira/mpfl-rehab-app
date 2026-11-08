import { flexion, kneeAngle, type Side } from '../src/lib/angle';
import { cameraPlan, figureFor, ILLUSTRATIVE_FLEXION, LABEL_PX, VIEW, viewHeight, type Box, type Point } from '../src/lib/figure';
import { SETUP_CONFIG } from '../src/lib/setupRules';
import { EXERCISE_KINDS } from '../src/lib/protocol/schema';

const SIDES: Side[] = ['left', 'right'];
const FRAMES = ['start', 'end'] as const;
const BANNED = ['correct', 'incorrect', 'good', 'bad', 'perfect', 'wrong', 'mistake', 'safe', 'dangerous', 'score', 'grade', 'pass', 'fail', 'goal', 'milestone'];

const inside = (p: Point, w: number = VIEW.w, h = 160) => p.x >= 0 && p.x <= w && p.y >= 0 && p.y <= h;
const overlap = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const drawnFlexion = (f: ReturnType<typeof figureFor>) => flexion(kneeAngle(f.points.hip, f.points.knee, f.points.ankle, 1)) as number;

describe('figureFor knee angle', () => {
  it.each(EXERCISE_KINDS)('%s: the drawn knee angle at the end frame matches the documented value', (kind) => {
    SIDES.forEach((side) => {
      const fig = figureFor(kind, 'end', side);
      expect(Math.abs(drawnFlexion(fig) - ILLUSTRATIVE_FLEXION[kind])).toBeLessThan(1);
      expect(fig.kneeArc.flexionDeg).toBe(ILLUSTRATIVE_FLEXION[kind]);
    });
  });

  it.each(['heel-slide', 'mini-squat'] as const)('%s: the knee arc spans the bend of the knee', (kind) => {
    const { kneeArc } = figureFor(kind, 'end', 'left');
    const span = Math.abs(((kneeArc.toDeg - kneeArc.fromDeg + 540) % 360) - 180);
    expect(Math.abs(span - kneeArc.flexionDeg)).toBeLessThan(1);
  });

  it.each(['heel-slide', 'mini-squat'] as const)('%s: a number from the exercise data sets the drawn angle and the label', (kind) => {
    const fig = figureFor(kind, 'end', 'right', 45);
    expect(Math.abs(drawnFlexion(fig) - 45)).toBeLessThan(1);
    expect(fig.kneeArc.flexionDeg).toBe(45);
    expect(fig.kneeArc.label?.text).toBe('45°');
  });

  it('a protocol number is limited to a range that the drawing can show', () => {
    expect(figureFor('heel-slide', 'end', 'right', 400).kneeArc.flexionDeg).toBe(VIEW.maxFlexionDeg);
    expect(figureFor('heel-slide', 'end', 'right', -20).kneeArc.flexionDeg).toBe(0);
  });

  it('the straight leg raise keeps a straight knee whatever number is given', () => {
    expect(drawnFlexion(figureFor('straight-leg-raise', 'end', 'left', 70))).toBeCloseTo(0, 3);
  });

  it('no number is shown when the exercise data has none', () => {
    EXERCISE_KINDS.forEach((k) => FRAMES.forEach((f) => expect(figureFor(k, f, 'left').kneeArc.label).toBeNull()));
  });

  it('start frames show no number even when one is given', () => {
    expect(figureFor('heel-slide', 'start', 'left', 60).kneeArc.label).toBeNull();
  });

  it('a straight end knee shows the number 0 when the data says 0', () => {
    expect(figureFor('seated-extension-hold', 'end', 'left', 0).kneeArc.label?.text).toBe('0°');
  });
});

describe('figureFor body', () => {
  it.each(EXERCISE_KINDS)('%s: the operated leg is the near leg for left and right', (kind) => {
    SIDES.forEach((side) => {
      const fig = figureFor(kind, 'start', side);
      expect(fig.nearLeg).toBe(side);
      expect(fig.facing).toBe(side === 'right' ? 1 : -1);
      const near = fig.limbs.filter((l) => l.leg === 'near').map((l) => l.part);
      const far = fig.limbs.filter((l) => l.leg === 'far').map((l) => l.part);
      expect(near).toEqual(['thigh', 'shank', 'foot']);
      expect(far).toEqual(['thigh', 'shank', 'foot']);
    });
  });

  it.each(EXERCISE_KINDS)('%s: the near leg is thicker than the far leg and is drawn after it', (kind) => {
    const { limbs } = figureFor(kind, 'end', 'left');
    const width = (leg: string, part: string) => limbs.find((l) => l.leg === leg && l.part === part)!.width;
    (['thigh', 'shank', 'foot'] as const).forEach((part) => expect(width('near', part)).toBeGreaterThan(width('far', part)));
    const lastFar = Math.max(...limbs.map((l, i) => (l.leg === 'far' ? i : -1)));
    const firstNear = limbs.findIndex((l) => l.leg === 'near');
    expect(firstNear).toBeGreaterThan(lastFar);
  });

  it.each(EXERCISE_KINDS)('%s: the person has a head, a torso and limbs with real thickness', (kind) => {
    const fig = figureFor(kind, 'start', 'right');
    expect(fig.head.r).toBeGreaterThanOrEqual(6);
    const torso = fig.limbs.find((l) => l.part === 'torso')!;
    expect(torso.width).toBeGreaterThanOrEqual(14);
    fig.limbs.filter((l) => l.leg !== 'body').forEach((l) => expect(l.width).toBeGreaterThanOrEqual(6));
    // The thigh is thicker than the shank, and the shank is thicker than the foot, like a real leg.
    const near = (p: string) => fig.limbs.find((l) => l.leg === 'near' && l.part === p)!.width;
    expect(near('thigh')).toBeGreaterThan(near('shank'));
    expect(near('shank')).toBeGreaterThan(near('foot'));
  });

  it('left and right drawings mirror each other', () => {
    const l = figureFor('mini-squat', 'end', 'left');
    const r = figureFor('mini-squat', 'end', 'right');
    expect(l.points.knee.x).toBeCloseTo(VIEW.w - r.points.knee.x, 6);
    expect(l.points.knee.y).toBeCloseTo(r.points.knee.y, 6);
    expect(Math.sign(r.points.knee.x - r.points.ankle.x)).toBe(1);
    expect(Math.sign(l.points.knee.x - l.points.ankle.x)).toBe(-1);
  });

  it('the heel stays on the surface in the heel slide', () => {
    const start = figureFor('heel-slide', 'start', 'right').points.ankle.y;
    expect(figureFor('heel-slide', 'end', 'right').points.ankle.y).toBeCloseTo(start, 6);
  });

  it('start and end frames differ for each exercise', () => {
    EXERCISE_KINDS.forEach((k) => expect(figureFor(k, 'start', 'left').points).not.toEqual(figureFor(k, 'end', 'left').points));
  });

  it.each(EXERCISE_KINDS)('%s: every point and every surface is inside the picture', (kind) => {
    SIDES.forEach((side) =>
      FRAMES.forEach((frame) => {
        const fig = figureFor(kind, frame, side, 60);
        expect(fig.height).toBe(viewHeight(kind));
        [...Object.values(fig.points), fig.camera.at, fig.kneeArc.center, fig.arrow.from, fig.arrow.to, ...fig.arrow.head].forEach((p) =>
          expect(inside(p, VIEW.w, fig.height)).toBe(true),
        );
        fig.surface.rects.forEach((r) => expect(inside({ x: r.x, y: r.y }, VIEW.w, fig.height) && inside({ x: r.x + r.w, y: r.y + r.h }, VIEW.w, fig.height)).toBe(true));
        expect(fig.head.center.y - fig.head.r).toBeGreaterThanOrEqual(0);
      }),
    );
  });
});

describe('figureFor ghost, arrow and surface', () => {
  it.each(EXERCISE_KINDS)('%s: the end frame carries a faint copy of the start position, the start frame none', (kind) => {
    SIDES.forEach((side) => {
      const start = figureFor(kind, 'start', side);
      const end = figureFor(kind, 'end', side);
      expect(start.ghost).toBeNull();
      expect(end.ghost).not.toBeNull();
      expect(end.ghost!.points).toEqual(start.points);
      expect(end.ghost!.limbs.length).toBe(start.limbs.length);
    });
  });

  it.each(EXERCISE_KINDS)('%s: an arrow shows the movement from the start toward the end', (kind) => {
    FRAMES.forEach((frame) => {
      const { arrow } = figureFor(kind, frame, 'right');
      expect(Math.hypot(arrow.to.x - arrow.from.x, arrow.to.y - arrow.from.y)).toBeGreaterThanOrEqual(18);
      expect(arrow.head).toHaveLength(3);
      expect(arrow.head[0]).toEqual(arrow.to);
    });
  });

  it('the arrow of a heel slide points toward the buttock, and the arrow of a squat points down', () => {
    const slide = figureFor('heel-slide', 'start', 'right').arrow;
    expect(slide.to.x).toBeLessThan(slide.from.x);
    const squat = figureFor('mini-squat', 'start', 'right').arrow;
    expect(squat.to.y).toBeGreaterThan(squat.from.y);
  });

  it('each exercise has the surface it needs, with a label', () => {
    const want = { 'heel-slide': 'mat', 'straight-leg-raise': 'mat', 'mini-squat': 'counter', 'seated-extension-hold': 'chair' } as const;
    EXERCISE_KINDS.forEach((k) => {
      const fig = figureFor(k, 'start', 'left');
      expect(fig.surface.key).toBe(want[k]);
      expect(fig.surface.rects.length).toBeGreaterThan(0);
      expect(fig.labels.find((l) => l.key === 'surface')?.text).toBe({ mat: 'Bed or mat', counter: 'Counter', chair: 'Chair' }[want[k]]);
    });
  });
});

describe('figureFor labels', () => {
  it.each(EXERCISE_KINDS)('%s: has the labels operated leg, camera and the frame name', (kind) => {
    FRAMES.forEach((frame) => {
      const labels = figureFor(kind, frame, 'left').labels;
      expect(labels.find((l) => l.key === 'operatedLeg')?.text).toBe('Operated leg');
      expect(labels.find((l) => l.key === 'camera')?.text).toBe('Camera');
      expect(labels.find((l) => l.key === 'frame')?.text).toBe(frame === 'start' ? 'Start' : 'End');
    });
  });

  it('the label size is at least 14 pixels', () => {
    expect(LABEL_PX).toBeGreaterThanOrEqual(14);
  });

  it.each(EXERCISE_KINDS)('%s: labels stay inside the picture and do not overlap each other', (kind) => {
    SIDES.forEach((side) =>
      FRAMES.forEach((frame) => {
        const fig = figureFor(kind, frame, side, 60);
        const boxes = [...fig.labels.map((l) => l.box), ...(fig.kneeArc.label ? [fig.kneeArc.label.box] : [])];
        boxes.forEach((b) => {
          expect(b.x).toBeGreaterThanOrEqual(0);
          expect(b.y).toBeGreaterThanOrEqual(0);
          expect(b.x + b.w).toBeLessThanOrEqual(VIEW.w);
          expect(b.y + b.h).toBeLessThanOrEqual(fig.height);
        });
        boxes.forEach((a, i) => boxes.slice(i + 1).forEach((b) => expect(overlap(a, b)).toBe(false)));
      }),
    );
  });

  it('no label has a verdict word', () => {
    const text = EXERCISE_KINDS.flatMap((k) => figureFor(k, 'end', 'left', 30).labels.map((l) => l.text)).join(' ').toLowerCase();
    BANNED.forEach((w) => expect(text).not.toMatch(new RegExp(`\\b${w}\\b`)));
  });
});

describe('cameraPlan', () => {
  const views = ['side', 'front'] as const;

  it.each(views)('%s view: names the camera, the operated leg and the distance from the setup rules', (view) => {
    const plan = cameraPlan(view, 'mini-squat', 'left');
    const text = plan.labels.map((l) => l.text);
    expect(text).toEqual(expect.arrayContaining(['Camera', 'Operated leg']));
    const { min, max } = SETUP_CONFIG.distanceAdviceM;
    expect(plan.distance.text).toBe(`${min} to ${max} m`);
    expect(plan.labels.find((l) => l.key === 'height')?.text).toBe('At knee height');
  });

  it('the side view puts the camera next to the operated leg for left and right', () => {
    SIDES.forEach((side) =>
      EXERCISE_KINDS.forEach((kind) => {
        const plan = cameraPlan('side', kind, side);
        const near = plan.legs.find((l) => l.leg === 'near')!;
        const far = plan.legs.find((l) => l.leg === 'far')!;
        // The camera is at the bottom, so the leg that faces it has the larger y.
        expect(near.from.y).toBeGreaterThan(far.from.y);
        expect(plan.camera.at.y).toBeGreaterThan(near.from.y);
        expect(plan.facing).toBe(side === 'right' ? 1 : -1);
      }),
    );
  });

  it('the front view shows the operated leg on the camera left for the right leg and on the right for the left leg', () => {
    const right = cameraPlan('front', 'mini-squat', 'right');
    const left = cameraPlan('front', 'mini-squat', 'left');
    expect(right.legs.find((l) => l.leg === 'near')!.from.x).toBeLessThan(right.legs.find((l) => l.leg === 'far')!.from.x);
    expect(left.legs.find((l) => l.leg === 'near')!.from.x).toBeGreaterThan(left.legs.find((l) => l.leg === 'far')!.from.x);
  });

  it('a lying exercise lies along the picture and a standing one stands', () => {
    const lying = cameraPlan('side', 'heel-slide', 'right');
    const upright = cameraPlan('side', 'mini-squat', 'right');
    expect(lying.posture).toBe('lying');
    expect(upright.posture).toBe('upright');
  });

  it.each(views)('%s view: the view cone covers the person and the picture is tall enough', (view) => {
    EXERCISE_KINDS.forEach((kind) =>
      SIDES.forEach((side) => {
        const plan = cameraPlan(view, kind, side);
        const [apex, a, b] = plan.cone;
        expect(apex).toEqual(plan.camera.at);
        const row = plan.legs.map((l) => l.from).concat(plan.head.center);
        row.forEach((p) => {
          // At the height of the person the cone spans the x range [a.x, b.x] when a and b share one y.
          expect(p.x).toBeGreaterThan(Math.min(a.x, b.x));
          expect(p.x).toBeLessThan(Math.max(a.x, b.x));
        });
        [apex, a, b, plan.camera.at, plan.head.center].forEach((p) => expect(inside(p, plan.size.w, plan.size.h)).toBe(true));
      }),
    );
  });

  it.each(views)('%s view: labels stay inside the picture and do not overlap each other', (view) => {
    EXERCISE_KINDS.forEach((kind) =>
      SIDES.forEach((side) => {
        const plan = cameraPlan(view, kind, side);
        const boxes = plan.labels.map((l) => l.box);
        boxes.forEach((b) => {
          expect(b.x).toBeGreaterThanOrEqual(0);
          expect(b.x + b.w).toBeLessThanOrEqual(plan.size.w);
          expect(b.y + b.h).toBeLessThanOrEqual(plan.size.h);
        });
        boxes.forEach((a, i) => boxes.slice(i + 1).forEach((b) => expect(overlap(a, b)).toBe(false)));
      }),
    );
  });
});
