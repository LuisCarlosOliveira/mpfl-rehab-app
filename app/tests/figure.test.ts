import { flexion, kneeAngle, type Side } from '../src/lib/angle';
import { boxShapeGap, cameraPlan, figureFor, ILLUSTRATIVE_FLEXION, MIN_LABEL_PX, MIN_RENDER_W, obstaclesOf, planObstacles, unionBox, VIEW, type Box, type Figure, type Point } from '../src/lib/figure';
import { SETUP_CONFIG } from '../src/lib/setupRules';
import { EXERCISE_KINDS } from '../src/lib/protocol/schema';

const SIDES: Side[] = ['left', 'right'];
const FRAMES = ['start', 'end'] as const;
const BANNED = ['correct', 'incorrect', 'good', 'bad', 'perfect', 'wrong', 'mistake', 'safe', 'dangerous', 'score', 'grade', 'pass', 'fail', 'goal', 'milestone'];

const inView = (p: Point, v: Box) => p.x >= v.x && p.x <= v.x + v.w && p.y >= v.y && p.y <= v.y + v.h;
const boxInView = (b: Box, v: Box) => b.x >= v.x - 0.01 && b.y >= v.y - 0.01 && b.x + b.w <= v.x + v.w + 0.01 && b.y + b.h <= v.y + v.h + 0.01;
const GAP = 1.5; // the free space that a label keeps from a shape, in picture units
const overlap = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const drawnFlexion = (f: ReturnType<typeof figureFor>) => flexion(kneeAngle(f.points.hip, f.points.knee, f.points.ankle, 1)) as number;

describe('figureFor knee angle', () => {
  // The seated hold has its own tests below: without an angle from the protocol it draws no end angle (T3).
  it.each(EXERCISE_KINDS.filter((k) => k !== 'seated-extension-hold'))('%s: the drawn knee angle at the end frame matches the documented value', (kind) => {
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
    expect(l.points.knee.x).toBeCloseTo(150 - r.points.knee.x, 6); // the drawing mirrors about x = 75
    expect(l.points.knee.y).toBeCloseTo(r.points.knee.y, 6);
    expect(Math.sign(r.points.knee.x - r.points.ankle.x)).toBe(1);
    expect(Math.sign(l.points.knee.x - l.points.ankle.x)).toBe(-1);
  });

  it('the heel stays on the surface in the heel slide', () => {
    const start = figureFor('heel-slide', 'start', 'right').points.ankle.y;
    expect(figureFor('heel-slide', 'end', 'right').points.ankle.y).toBeCloseTo(start, 6);
  });

  it('start and end frames differ for each exercise, when the protocol gives an angle', () => {
    EXERCISE_KINDS.forEach((k) => expect(figureFor(k, 'start', 'left', 60).points).not.toEqual(figureFor(k, 'end', 'left', 60).points));
  });

  it.each(EXERCISE_KINDS)('%s: every point, every surface and the arrow are inside the view box', (kind) => {
    SIDES.forEach((side) =>
      FRAMES.forEach((frame) => {
        const fig = figureFor(kind, frame, side, 60);
        [...Object.values(fig.points), fig.kneeArc.center, fig.arrow.from, fig.arrow.to, ...fig.arrow.head].forEach((p) => expect(inView(p, fig.view)).toBe(true));
        fig.surface.rects.forEach((r) => expect(boxInView(r, fig.view)).toBe(true));
        expect(fig.head.center.y - fig.head.r).toBeGreaterThanOrEqual(fig.view.y);
      }),
    );
  });

  it.each(EXERCISE_KINDS)('%s: the view box is cropped to the content and the person fills it', (kind) => {
    SIDES.forEach((side) =>
      FRAMES.forEach((frame) => {
        const fig = figureFor(kind, frame, side, 60);
        const xs = Object.values(fig.points).map((p) => p.x);
        const ys = Object.values(fig.points).map((p) => p.y);
        const spreadW = Math.max(...xs) - Math.min(...xs);
        const spreadH = Math.max(...ys) - Math.min(...ys);
        // The old drawing had a fixed 150 by 160 box. The new box is at most the person plus a margin and a label band.
        expect(fig.view.w).toBeLessThanOrEqual(spreadW + 80);
        expect(fig.view.h).toBeLessThanOrEqual(spreadH + 90);
        expect(fig.view.w).toBeLessThan(150);
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
  it.each(EXERCISE_KINDS)('%s: has the labels operated leg and the frame name', (kind) => {
    FRAMES.forEach((frame) => {
      const labels = figureFor(kind, frame, 'left').labels;
      expect(labels.find((l) => l.key === 'operatedLeg')?.text).toBe('Operated leg');
      expect(labels.find((l) => l.key === 'frame')?.text).toBe(frame === 'start' ? 'Start' : 'End');
    });
  });

  it('a label is at least 14 pixels high at the smallest rendered width', () => {
    EXERCISE_KINDS.forEach((kind) =>
      SIDES.forEach((side) =>
        FRAMES.forEach((frame) => {
          const fig = figureFor(kind, frame, side, 45);
          expect((fig.labelSize * MIN_RENDER_W) / fig.view.w).toBeGreaterThanOrEqual(MIN_LABEL_PX);
        }),
      ),
    );
  });

  it('a label is small next to the body: at most 60 percent of the thigh width', () => {
    EXERCISE_KINDS.forEach((kind) => {
      const fig = figureFor(kind, 'end', 'left', 45);
      const thigh = fig.limbs.find((l) => l.leg === 'near' && l.part === 'thigh')!.width;
      expect(fig.labelSize).toBeLessThanOrEqual(0.6 * thigh);
    });
  });

  it.each(EXERCISE_KINDS)('%s: labels stay inside the view box and do not overlap each other', (kind) => {
    SIDES.forEach((side) =>
      FRAMES.forEach((frame) => {
        const fig = figureFor(kind, frame, side, 60);
        const boxes = [...fig.labels.map((l) => l.box), ...(fig.kneeArc.label ? [fig.kneeArc.label.box] : [])];
        boxes.forEach((b) => expect(boxInView(b, fig.view)).toBe(true));
        boxes.forEach((a, i) => boxes.slice(i + 1).forEach((b) => expect(overlap(a, b)).toBe(false)));
      }),
    );
  });

  const freeGap = (fig: Figure, key: string) => {
    const label = [...fig.labels, ...(fig.kneeArc.label ? [fig.kneeArc.label] : [])].find((l) => l.key === key)!;
    return Math.min(...obstaclesOf(fig).filter((s) => !(key === 'surface' && s.k === 'rect')).map((s) => boxShapeGap(label.box, s)));
  };

  it.each(EXERCISE_KINDS)('%s: no label touches the body, the ghost, the arrow, the arc or the surface', (kind) => {
    SIDES.forEach((side) =>
      FRAMES.forEach((frame) =>
        [30, 60, 90].forEach((deg) => {
          const fig = figureFor(kind, frame, side, deg);
          ['frame', 'operatedLeg', 'angle'].forEach((key) => {
            if (key === 'angle' && !fig.kneeArc.label) return;
            // The frame word and the legend sit in empty space. The number must keep clear of every shape.
            const gap = key === 'angle' ? freeGap(fig, key) : Math.min(freeGap(fig, key), ...fig.surface.rects.map((r) => boxShapeGap(fig.labels.find((l) => l.key === key)!.box, { k: 'rect', box: r })));
            expect(gap, `${kind} ${side} ${frame} ${deg} ${key}`).toBeGreaterThanOrEqual(GAP);
          });
        }),
      ),
    );
  });

  it.each(EXERCISE_KINDS)('%s: the surface name sits inside the surface and keeps clear of the body and the arrow', (kind) => {
    SIDES.forEach((side) =>
      FRAMES.forEach((frame) => {
        const fig = figureFor(kind, frame, side, 60);
        const label = fig.labels.find((l) => l.key === 'surface')!;
        expect(boxInView(label.box, unionBox(fig.surface.rects))).toBe(true); // the chair name sits between the legs of the chair
        expect(freeGap(fig, 'surface'), `${kind} ${side} ${frame}`).toBeGreaterThanOrEqual(GAP);
      }),
    );
  });

  it('the bed or mat name does not touch the arrow', () => {
    const fig = figureFor('heel-slide', 'start', 'right');
    const label = fig.labels.find((l) => l.key === 'surface')!;
    expect(boxShapeGap(label.box, { k: 'seg', a: fig.arrow.from, b: fig.arrow.to, r: 1.5 })).toBeGreaterThan(8);
  });

  it('a label that touches a shape is found by the gap function', () => {
    expect(boxShapeGap({ x: 0, y: 0, w: 10, h: 10 }, { k: 'circle', c: { x: 12, y: 5 }, r: 4 })).toBeLessThan(0);
    expect(boxShapeGap({ x: 0, y: 0, w: 10, h: 10 }, { k: 'seg', a: { x: -5, y: 5 }, b: { x: 15, y: 5 }, r: 1 })).toBeLessThan(0);
    expect(boxShapeGap({ x: 0, y: 0, w: 10, h: 10 }, { k: 'rect', box: { x: 20, y: 0, w: 5, h: 5 } })).toBeCloseTo(10, 6);
  });

  it('no label has a verdict word', () => {
    const text = EXERCISE_KINDS.flatMap((k) => figureFor(k, 'end', 'left', 30).labels.map((l) => l.text)).join(' ').toLowerCase();
    BANNED.forEach((w) => expect(text).not.toMatch(new RegExp(`\\b${w}\\b`)));
  });
});

describe('cameraPlan', () => {
  const views = ['side', 'front'] as const;
  const bodyBounds = (p: ReturnType<typeof cameraPlan>) => unionBox(p.figure.limbs.map((l) => ({ x: Math.min(p.figure.points[l.from].x, p.figure.points[l.to].x) - l.width / 2, y: Math.min(p.figure.points[l.from].y, p.figure.points[l.to].y) - l.width / 2, w: Math.abs(p.figure.points[l.from].x - p.figure.points[l.to].x) + l.width, h: Math.abs(p.figure.points[l.from].y - p.figure.points[l.to].y) + l.width })));

  it.each(views)('%s view: names the camera, the operated leg, the knee height and the distance from the setup rules', (view) => {
    const plan = cameraPlan(view, 'mini-squat');
    expect(plan.labels.map((l) => l.text)).toEqual(expect.arrayContaining(['Camera', 'Operated leg', 'At knee height', view === 'side' ? 'Side view' : 'Front view']));
    const { min, max } = SETUP_CONFIG.distanceAdviceM;
    expect(plan.distance.text).toBe(`${min} to ${max} m`);
    expect(plan.labels.find((l) => l.key === 'distance')?.text).toBe(`${min} to ${max} m`);
  });

  it.each(views)('%s view: the lens of the phone is at the height of the operated knee and the phone stands on the floor', (view) => {
    EXERCISE_KINDS.forEach((kind) => {
      const plan = cameraPlan(view, kind);
      expect(plan.phone.lens.y).toBeCloseTo(plan.figure.points.knee.y, 1);
      expect(plan.level.to).toEqual(plan.phone.lens);
      expect(plan.phone.stem.to.y).toBeGreaterThan(plan.phone.body.y + plan.phone.body.h);
    });
  });

  it.each(views)('%s view: the phone stands to the right of the person with room for the distance line', (view) => {
    EXERCISE_KINDS.forEach((kind) => {
      const plan = cameraPlan(view, kind);
      const body = bodyBounds(plan);
      expect(plan.phone.body.x).toBeGreaterThan(body.x + body.w + 20);
      expect(plan.distance.from.x).toBeLessThan(plan.distance.to.x);
      expect(plan.distance.head[0]).toEqual(plan.distance.to);
      expect(plan.distance.tail[0]).toEqual(plan.distance.from);
    });
  });

  it('the side view faces left and the front view faces the phone', () => {
    EXERCISE_KINDS.forEach((kind) => {
      expect(cameraPlan('side', kind).facing).toBe(-1);
      expect(cameraPlan('front', kind).facing).toBe(1);
      // The leg runs away from the head (lying) or the foot points forward (standing and seated).
      [-1, 1].forEach((f) => {
        const plan = cameraPlan(f === -1 ? 'side' : 'front', kind);
        const p = plan.figure.points;
        const forward = plan.posture === 'lying' ? p.ankle.x - p.head.x : p.toe.x - p.ankle.x;
        expect(Math.sign(forward)).toBe(f);
      });
    });
  });

  it('a lying exercise lies along the picture and a standing one stands', () => {
    expect(cameraPlan('side', 'heel-slide').posture).toBe('lying');
    expect(cameraPlan('side', 'mini-squat').posture).toBe('upright');
    const lying = bodyBounds(cameraPlan('side', 'heel-slide'));
    const upright = bodyBounds(cameraPlan('side', 'mini-squat'));
    expect(lying.w).toBeGreaterThan(lying.h);
    expect(upright.h).toBeGreaterThan(upright.w);
  });

  it.each(views)('%s view: the view cone starts at the lens and covers the whole operated leg', (view) => {
    EXERCISE_KINDS.forEach((kind) => {
      const plan = cameraPlan(view, kind);
      const [apex, a, b] = plan.cone;
      expect(apex).toEqual(plan.phone.lens);
      expect(a.x).toBe(b.x);
      const body = bodyBounds(plan);
      expect(a.x).toBeLessThan(body.x);
      const near = plan.figure.limbs.filter((l) => l.leg === 'near').flatMap((l) => [plan.figure.points[l.from], plan.figure.points[l.to]]);
      near.forEach((p) => {
        expect(p.y).toBeGreaterThan(Math.min(a.y, b.y));
        expect(p.y).toBeLessThan(Math.max(a.y, b.y));
      });
    });
  });

  it.each(views)('%s view: labels stay inside the view box, do not overlap each other and do not touch a shape', (view) => {
    EXERCISE_KINDS.forEach((kind) => {
      const plan = cameraPlan(view, kind);
      const boxes = plan.labels.map((l) => l.box);
      boxes.forEach((b) => expect(boxInView(b, plan.box)).toBe(true));
      boxes.forEach((a, i) => boxes.slice(i + 1).forEach((b) => expect(overlap(a, b), `${kind} ${a.x},${a.y}`).toBe(false)));
      const shapes = planObstacles(plan);
      plan.labels.forEach((l) => {
        // The cone lines run through the picture on purpose. The labels of the legend and the title stay outside them.
        shapes.filter((s) => !(l.key === 'camera' && s.k === 'seg' && s.r === 0.75)).forEach((s) => expect(boxShapeGap(l.box, s), `${kind} ${l.key}`).toBeGreaterThanOrEqual(GAP));
      });
    });
  });

  it('the label size keeps 14 pixels at the smallest rendered width', () => {
    EXERCISE_KINDS.forEach((kind) => views.forEach((view) => {
      const plan = cameraPlan(view, kind);
      expect((plan.labelSize * MIN_RENDER_W) / plan.box.w).toBeGreaterThanOrEqual(MIN_LABEL_PX);
    }));
  });
});

// T3 of docs/design-reconciliation.md: the seated hold drawing never shows a straight knee unless the protocol angle says so.
describe('figureFor seated hold (T3)', () => {
  const kind = 'seated-extension-hold';
  const ANGLES = [0, 30, 40, 45, 60, 75, 90, 120];

  it.each([30, 40, 60, 75, 90])('draws the end pose at the protocol hold angle %s and the start with the knee bent more', (deg) => {
    SIDES.forEach((side) => {
      const end = figureFor(kind, 'end', side, deg);
      const start = figureFor(kind, 'start', side, deg);
      expect(Math.abs(drawnFlexion(end) - deg)).toBeLessThan(1);
      expect(end.kneeArc.flexionDeg).toBe(deg);
      expect(end.kneeArc.label?.text).toBe(`${deg}°`);
      expect(drawnFlexion(start)).toBeGreaterThan(drawnFlexion(end) + 5);
      expect(start.kneeArc.label).toBeNull();
    });
  });

  it('draws a straight end knee only when the protocol angle is 0', () => {
    expect(drawnFlexion(figureFor(kind, 'end', 'left', 0))).toBeCloseTo(0, 3);
  });

  it('without an angle draws no end pose: both frames show the start, with no arc and no number', () => {
    SIDES.forEach((side) => {
      const start = figureFor(kind, 'start', side);
      const end = figureFor(kind, 'end', side);
      expect(end.points).toEqual(start.points);
      expect(end.kneeArc.flexionDeg).toBe(0);
      expect(end.kneeArc.label).toBeNull();
      // The knee is bent in both frames. It is never straight.
      expect(drawnFlexion(start)).toBeGreaterThanOrEqual(60);
      expect(drawnFlexion(end)).toBeGreaterThanOrEqual(60);
    });
  });

  it('keeps every label clear of the body, the ghost, the arrow, the arc and the chair at each angle', () => {
    SIDES.forEach((side) =>
      FRAMES.forEach((frame) =>
        ANGLES.concat([undefined as unknown as number]).forEach((deg) => {
          const fig = figureFor(kind, frame, side, deg);
          const boxes = [...fig.labels.map((l) => l.box), ...(fig.kneeArc.label ? [fig.kneeArc.label.box] : [])];
          boxes.forEach((b) => expect(boxInView(b, fig.view), `${side} ${frame} ${deg} view`).toBe(true));
          boxes.forEach((a, i) => boxes.slice(i + 1).forEach((b) => expect(overlap(a, b), `${side} ${frame} ${deg} overlap`).toBe(false)));
          if (fig.kneeArc.label) {
            const gap = Math.min(...obstaclesOf(fig).map((sh) => boxShapeGap(fig.kneeArc.label!.box, sh)));
            expect(gap, `${side} ${frame} ${deg} number`).toBeGreaterThanOrEqual(GAP);
          }
          ['frame', 'operatedLeg'].forEach((key) => {
            const box = fig.labels.find((l) => l.key === key)!.box;
            const gap = Math.min(...obstaclesOf(fig).map((sh) => boxShapeGap(box, sh)));
            expect(gap, `${side} ${frame} ${deg} ${key}`).toBeGreaterThanOrEqual(GAP);
          });
        }),
      ),
    );
  });

  it('keeps every point and the arrow inside the view box at each angle', () => {
    SIDES.forEach((side) =>
      FRAMES.forEach((frame) =>
        ANGLES.forEach((deg) => {
          const fig = figureFor(kind, frame, side, deg);
          [...Object.values(fig.points), fig.arrow.from, fig.arrow.to].forEach((p) => expect(inView(p, fig.view), `${side} ${frame} ${deg}`).toBe(true));
        }),
      ),
    );
  });
});
