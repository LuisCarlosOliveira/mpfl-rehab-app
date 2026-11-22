import { kneeAngle, type Landmark } from '../src/lib/angle';
import { seeded } from './pairing/helpers';

const lm = (x: number, y: number): Landmark => ({ x, y, visibility: 1 });

describe('kneeAngle on 200 seeded random triples', () => {
  const next = seeded(2026);
  const point = () => lm(next(), next());
  const triples = Array.from({ length: 200 }, () => ({ hip: point(), knee: point(), ankle: point(), aspect: 0.5 + next() * 1.5 }));

  it('is in 0 to 180 degrees', () => {
    for (const { hip, knee, ankle, aspect } of triples) {
      const a = kneeAngle(hip, knee, ankle, aspect)!;
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThanOrEqual(180);
    }
  });

  it('does not change when the two outer points swap', () => {
    for (const { hip, knee, ankle, aspect } of triples) {
      expect(kneeAngle(ankle, knee, hip, aspect)).toBeCloseTo(kneeAngle(hip, knee, ankle, aspect)!, 9);
    }
  });

  it('does not change under rotation and translation of the picture plane', () => {
    for (const { hip, knee, ankle, aspect } of triples) {
      const turn = next() * 2 * Math.PI;
      const dx = next() * 3 - 1.5;
      const dy = next() * 3 - 1.5;
      // The angle is measured in square pixels: x is scaled by the aspect. Rotate there, then scale back.
      const move = (p: Landmark) => {
        const x = p.x * aspect;
        return lm((x * Math.cos(turn) - p.y * Math.sin(turn) + dx) / aspect, x * Math.sin(turn) + p.y * Math.cos(turn) + dy);
      };
      expect(kneeAngle(move(hip), move(knee), move(ankle), aspect)).toBeCloseTo(kneeAngle(hip, knee, ankle, aspect)!, 6);
    }
  });
});
