// Step D1: the front camera plan of the leg raise to the side. The person lies on the side. The camera is in front, at hip height near the floor.
import { boxShapeGap, cameraPlan, planObstacles, unionBox, type Box } from '../src/lib/figure';

const boxInView = (b: Box, v: Box) => b.x >= v.x - 0.01 && b.y >= v.y - 0.01 && b.x + b.w <= v.x + v.w + 0.01 && b.y + b.h <= v.y + v.h + 0.01;
const overlap = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe('cameraPlan front view for the leg raise to the side', () => {
  const plan = cameraPlan('front', 'leg-raise-side');

  it('draws a person who lies on the side, with the lens at hip height near the floor and the label "At hip height"', () => {
    expect(plan.posture).toBe('lying');
    expect(plan.figure.surface.key).toBe('mat');
    const f = plan.figure;
    expect(Math.abs(f.head.center.y - f.points.hip.y), 'the head is level with the hip: the body lies across the picture').toBeLessThan(12);
    expect(Math.abs(f.points.ankle.y - f.points.hip.y), 'the top leg lies along the body').toBeLessThan(1);
    expect(plan.phone.lens.y).toBeCloseTo(f.points.hip.y, 1);
    expect(plan.phone.body.y + plan.phone.body.h, 'the phone stands on the floor').toBeLessThanOrEqual((f.floor?.y ?? 1e9) + 0.01);
    expect(plan.labels.find((l) => l.key === 'height')?.text).toBe('At hip height');
    expect(plan.labels.map((l) => l.text)).toContain('Front view');
  });

  it('the view cone holds the whole leg: hip to toe', () => {
    const f = plan.figure;
    const top = Math.min(...[f.points.hip, f.points.knee, f.points.ankle, f.points.toe].map((p) => p.y));
    expect(plan.cone[1].y).toBeLessThanOrEqual(top);
    expect(plan.cone[1].x).toBeLessThanOrEqual(Math.min(f.points.hip.x, f.points.toe.x));
  });

  it('keeps the phone beside the person: right of the body with room, on the floor', () => {
    const f = plan.figure;
    const body = unionBox(f.limbs.map((l) => ({ x: Math.min(f.points[l.from].x, f.points[l.to].x), y: Math.min(f.points[l.from].y, f.points[l.to].y), w: Math.abs(f.points[l.from].x - f.points[l.to].x), h: Math.abs(f.points[l.from].y - f.points[l.to].y) })));
    expect(plan.phone.body.x).toBeGreaterThan(body.x + body.w + 20);
  });

  it('keeps labels in the view box, apart from each other and from every shape', () => {
    const boxes = plan.labels.map((l) => l.box);
    boxes.forEach((b) => expect(boxInView(b, plan.box)).toBe(true));
    boxes.forEach((a, i) => boxes.slice(i + 1).forEach((b) => expect(overlap(a, b)).toBe(false)));
    const shapes = planObstacles(plan);
    plan.labels.forEach((l) => shapes.filter((s) => !(l.key === 'camera' && s.k === 'seg' && s.r === 0.75)).forEach((s) => expect(boxShapeGap(l.box, s), l.key).toBeGreaterThanOrEqual(1.5)));
  });

  it('the side plan of the same exercise draws the side-lying person: the legs lie across the picture, the lower leg on the mat', () => {
    const side = cameraPlan('side', 'leg-raise-side');
    expect(side.posture).toBe('lying');
    expect(side.figure.surface.key).toBe('mat');
    const f = side.figure;
    expect(f.points.farHip.y - f.points.hip.y, 'the top leg lies above the lower leg').toBeGreaterThanOrEqual(5);
    expect(Math.abs(f.points.ankle.y - f.points.hip.y), 'the top leg is level with the body at the start').toBeLessThan(1);
  });

  it('the side view of the same exercise and the front view of the other kinds keep their knee height', () => {
    expect(cameraPlan('side', 'leg-raise-side').labels.find((l) => l.key === 'height')?.text).toBe('At knee height');
    expect(cameraPlan('front', 'mini-squat').labels.find((l) => l.key === 'height')?.text).toBe('At knee height');
  });
});
