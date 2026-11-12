// Step D1: the Setup rules come from the definition of the exercise (needs and view).
import type { Landmark } from '../src/lib/angle';
import { createSetupStabilizer, evaluateSetup, SETUP_CONFIG, setupProfileFor, type SetupSample } from '../src/lib/setupRules';
import { legLandmarks } from './helpers/leg';

const steady = (lm: Landmark[]): SetupSample[] => Array.from({ length: 21 }, (_, i) => ({ tMs: i * 100, landmarks: lm }));
const set = (lm: Landmark[], i: number, p: Landmark) => {
  lm[i] = p;
  return lm;
};
/** A leg of the left side with a foot (heel 29, foot index 31). */
const withFoot = (lm: Landmark[]) => {
  set(lm, 29, { x: 0.52, y: 0.72, visibility: 1 });
  return set(lm, 31, { x: 0.58, y: 0.74, visibility: 1 });
};

describe('setupProfileFor', () => {
  it('takes the track and the view from the definition', () => {
    expect(setupProfileFor('heel-slide')).toEqual({ track: 'whole-leg', view: 'side' });
    expect(setupProfileFor('mini-squat')).toEqual({ track: 'whole-leg', view: 'side' });
    expect(setupProfileFor('leg-raise-back')).toEqual({ track: 'whole-leg', view: 'side' });
    expect(setupProfileFor('ankle-pump')).toEqual({ track: 'knee-to-toe', view: 'side' });
    expect(setupProfileFor('leg-raise-side')).toEqual({ track: 'whole-leg', view: 'front' });
  });
  it('gives no profile for the two timers: no leg check', () => {
    expect(setupProfileFor('quad-set')).toBeNull();
    expect(setupProfileFor('gluteal-set')).toBeNull();
  });
});

describe('knee to toe (ankle pump)', () => {
  const profile = { track: 'knee-to-toe', view: 'side' } as const;
  const run = (lm: Landmark[]) => evaluateSetup(lm, 'left', 1, SETUP_CONFIG, steady(lm), 'left', 'lying', profile);

  it('does not need the hip', () => {
    const lm = withFoot(legLandmarks('left', 20));
    lm[23] = { x: 0.5, y: 0.3, visibility: 0 };
    expect(run(lm).id).toBe('ready');
  });
  it('asks to show the leg when the foot is hidden', () => {
    const lm = withFoot(legLandmarks('left', 20));
    lm[31] = { x: 0.58, y: 0.74, visibility: 0.1 };
    expect(run(lm).id).toBe('show-leg');
  });
  it('asks to move back when the foot is at a frame edge, with the text for the foot', () => {
    const lm = withFoot(legLandmarks('left', 20));
    lm[31] = { x: 0.99, y: 0.74, visibility: 1 };
    const r = run(lm);
    expect(r.id).toBe('whole-leg');
    expect(r.text).toBe('Move back. Show your knee to your toes.');
  });
});

describe('front-on camera (leg raise to the side)', () => {
  // The hip line cannot tell the two views apart: a person who lies on the side with the camera in front has both hips one behind
  // the other. So the check has no hip rule for the front view. The text only asks for the camera in front (setupView.ts).
  const profile = { track: 'whole-leg', view: 'front' } as const;
  const run = (lm: Landmark[]) => evaluateSetup(lm, 'left', 1, SETUP_CONFIG, steady(lm), 'left', 'upright', profile);
  const standing = () => set(legLandmarks('left', 0, { length: 0.3, hip: { x: 0.5, y: 0.2 } }), 24, { x: 0.3, y: 0.2, visibility: 1 });

  it('is ready for a standing person with the hips across the picture', () => {
    expect(run(standing()).id).toBe('ready');
  });
  it('invents no side-on or front-on check: hips one above the other are ready too', () => {
    const lm = set(standing(), 24, { x: 0.5, y: 0.22, visibility: 1 });
    expect(run(lm).id).toBe('ready');
    const across = standing();
    expect(run(across).id).toBe('ready');
    expect(evaluateSetup(across, 'left', 1, SETUP_CONFIG, steady(across), 'left').id).toBe('side-on'); // the side profile still asks
  });
  it('never asks to turn the leg: a hidden leg gets the show text', () => {
    const lm = standing();
    lm[27] = { x: 0.5, y: 0.7, visibility: 0.1 };
    [24, 26, 28].forEach((i) => (lm[i] = { x: 0.3, y: 0.5, visibility: 1 }));
    expect(run(lm).id).toBe('show-leg');
  });
});

describe('texts and the stabilizer', () => {
  it('the stabilizer carries the profile and reaches ready for a front-on person', () => {
    const lm = set(legLandmarks('left', 0, { length: 0.3, hip: { x: 0.5, y: 0.2 } }), 24, { x: 0.3, y: 0.2, visibility: 1 });
    const step = createSetupStabilizer();
    let out = step({ landmarks: lm, side: 'left', aspect: 1, profile: { track: 'whole-leg', view: 'front' } }, 0);
    for (let t = 100; t <= 9000; t += 100) out = step({ landmarks: lm, side: 'left', aspect: 1, profile: { track: 'whole-leg', view: 'front' } }, t);
    expect(out.rule).toBe('ready');
    expect(out.ready).toBe(true);
  });
});
