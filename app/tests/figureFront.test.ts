// Step D1: the front camera plan of the leg raise to the side. The camera is in front of the person at hip height.
import { boxShapeGap, cameraPlan, planObstacles, unionBox, type Box } from '../src/lib/figure';

const boxInView = (b: Box, v: Box) => b.x >= v.x - 0.01 && b.y >= v.y - 0.01 && b.x + b.w <= v.x + v.w + 0.01 && b.y + b.h <= v.y + v.h + 0.01;
const overlap = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe('cameraPlan front view for the leg raise to the side', () => {
  const plan = cameraPlan('front', 'leg-raise-side');

  it('draws a person who stands and faces the phone, with the lens at hip height and the label "At hip height"', () => {
    expect(plan.posture).toBe('upright');
    expect(plan.facing).toBe(1);
    expect(plan.phone.lens.y).toBeCloseTo(plan.figure.points.hip.y, 1);
    expect(plan.labels.find((l) => l.key === 'height')?.text).toBe('At hip height');
    expect(plan.labels.map((l) => l.text)).toContain('Front view');
  });

  it('keeps the phone in front of the person: right of the body with room, on the floor', () => {
    const f = plan.figure;
    const body = unionBox(f.limbs.map((l) => ({ x: Math.min(f.points[l.from].x, f.points[l.to].x), y: Math.min(f.points[l.from].y, f.points[l.to].y), w: Math.abs(f.points[l.from].x - f.points[l.to].x), h: Math.abs(f.points[l.from].y - f.points[l.to].y) })));
    expect(plan.phone.body.x).toBeGreaterThan(body.x + body.w + 20);
    expect(plan.phone.stem.to.y).toBeGreaterThan(plan.phone.body.y + plan.phone.body.h);
  });

  it('keeps labels in the view box, apart from each other and from every shape', () => {
    const boxes = plan.labels.map((l) => l.box);
    boxes.forEach((b) => expect(boxInView(b, plan.box)).toBe(true));
    boxes.forEach((a, i) => boxes.slice(i + 1).forEach((b) => expect(overlap(a, b)).toBe(false)));
    const shapes = planObstacles(plan);
    plan.labels.forEach((l) => shapes.filter((s) => !(l.key === 'camera' && s.k === 'seg' && s.r === 0.75)).forEach((s) => expect(boxShapeGap(l.box, s), l.key).toBeGreaterThanOrEqual(1.5)));
  });

  it('the side view of the same exercise and the front view of the other kinds keep their knee height', () => {
    expect(cameraPlan('side', 'leg-raise-side').labels.find((l) => l.key === 'height')?.text).toBe('At knee height');
    expect(cameraPlan('front', 'mini-squat').labels.find((l) => l.key === 'height')?.text).toBe('At knee height');
  });
});
