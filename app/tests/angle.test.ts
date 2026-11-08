import { flexion, kneeAngle, selectLeg, type Landmark } from '../src/lib/angle';

const lm = (x: number, y: number, visibility = 1): Landmark => ({ x, y, visibility });

// Seeded generator so the test is repeatable.
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe('kneeAngle', () => {
  it('gives 180 for a straight leg', () => {
    expect(kneeAngle(lm(0.5, 0.2), lm(0.5, 0.5), lm(0.5, 0.8), 1)).toBeCloseTo(180, 5);
  });

  it('gives 90 for a right angle', () => {
    expect(kneeAngle(lm(0.5, 0.2), lm(0.5, 0.5), lm(0.8, 0.5), 1)).toBeCloseTo(90, 5);
  });

  it('scales x by the aspect ratio of a non-square video', () => {
    // Thigh points up. Shank is diagonal: dx 0.15, dy 0.15 (down).
    // Square video: 135 degrees. Video twice as wide as high: dx counts double.
    const hip = lm(0.5, 0.2);
    const knee = lm(0.5, 0.5);
    const ankle = lm(0.65, 0.65);
    expect(kneeAngle(hip, knee, ankle, 1)).toBeCloseTo(135, 5);
    expect(kneeAngle(hip, knee, ankle, 2)).toBeCloseTo(116.565, 2);
  });

  it('returns null for a zero-length vector', () => {
    expect(kneeAngle(lm(0.5, 0.5), lm(0.5, 0.5), lm(0.5, 0.8), 1)).toBeNull();
  });

  it('returns null when a landmark has visibility below 0.5', () => {
    expect(kneeAngle(lm(0.5, 0.2), lm(0.5, 0.5, 0.49), lm(0.5, 0.8), 1)).toBeNull();
    expect(kneeAngle(lm(0.5, 0.2, 0.3), lm(0.5, 0.5), lm(0.5, 0.8), 1)).toBeNull();
  });

  it('accepts visibility of exactly 0.5', () => {
    expect(kneeAngle(lm(0.5, 0.2), lm(0.5, 0.5, 0.5), lm(0.5, 0.8), 1)).not.toBeNull();
  });
});

describe('flexion', () => {
  it('is 180 minus the knee angle', () => {
    expect(flexion(180)).toBe(0);
    expect(flexion(90)).toBe(90);
  });

  it('keeps null as null', () => {
    expect(flexion(null)).toBeNull();
  });

  it('recovers known flexion within 0.5 degrees on 20 synthetic poses', () => {
    const next = rng(7);
    for (let i = 0; i < 20; i++) {
      const knee = { x: 0.3 + next() * 0.4, y: 0.4 + next() * 0.2 };
      const thighLen = 0.2 + next() * 0.1;
      const shankLen = 0.2 + next() * 0.1;
      const hipAngle = next() * 2 * Math.PI; // direction from knee to hip
      const trueFlexion = next() * 130;
      const interior = ((180 - trueFlexion) * Math.PI) / 180;
      const hip = { x: knee.x + Math.cos(hipAngle) * thighLen, y: knee.y + Math.sin(hipAngle) * thighLen };
      const ankle = {
        x: knee.x + Math.cos(hipAngle + interior) * shankLen,
        y: knee.y + Math.sin(hipAngle + interior) * shankLen,
      };
      const got = flexion(kneeAngle({ ...hip, visibility: 1 }, { ...knee, visibility: 1 }, { ...ankle, visibility: 1 }, 1));
      expect(got).not.toBeNull();
      expect(Math.abs((got as number) - trueFlexion)).toBeLessThan(0.5);
    }
  });
});

describe('selectLeg', () => {
  const landmarks = Array.from({ length: 33 }, (_, i) => lm(i / 100, i / 100));

  it('picks 23, 25, 27 for the left side', () => {
    const [hip, knee, ankle] = selectLeg(landmarks, 'left');
    expect([hip.x, knee.x, ankle.x]).toEqual([0.23, 0.25, 0.27]);
  });

  it('picks 24, 26, 28 for the right side', () => {
    const [hip, knee, ankle] = selectLeg(landmarks, 'right');
    expect([hip.x, knee.x, ankle.x]).toEqual([0.24, 0.26, 0.28]);
  });
});
