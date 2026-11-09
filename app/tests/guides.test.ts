import { guideFor, type Guide } from '../src/lib/guides';
import { EXERCISE_KINDS } from '../src/lib/protocol/schema';

const FIELDS: (keyof Guide)[] = ['startPosition', 'legFacingCamera', 'handsAndSupport', 'range', 'speed', 'cameraMustSee'];
const BANNED = ['correct', 'incorrect', 'good', 'bad', 'perfect', 'wrong', 'mistake', 'safe', 'dangerous', 'score', 'grade', 'pass', 'fail', 'goal', 'milestone'];

describe('guideFor', () => {
  it.each(EXERCISE_KINDS)('%s has every field with text', (kind) => {
    const guide = guideFor(kind);
    FIELDS.forEach((f) => expect(guide[f].trim().length).toBeGreaterThan(0));
    expect(Object.keys(guide).sort()).toEqual([...FIELDS].sort());
  });

  it.each(EXERCISE_KINDS)('%s has no verdict word', (kind) => {
    const text = Object.values(guideFor(kind)).join(' ').toLowerCase();
    BANNED.forEach((w) => expect(text).not.toMatch(new RegExp(`\\b${w}\\b`)));
  });

  it.each(EXERCISE_KINDS)('%s has sentences of 25 words at most', (kind) => {
    (Object.values(guideFor(kind)) as string[]).forEach((text) =>
      text.split(/(?<=[.!?])\s+/).forEach((s: string) => expect(s.split(/\s+/).length).toBeLessThanOrEqual(25)),
    );
  });

  it.each(EXERCISE_KINDS)('%s sets no number that the protocol sets and leaves the limit to the care team', (kind) => {
    const g = guideFor(kind);
    expect(Object.values(g).join(' ')).not.toMatch(/\d/);
    if (kind !== 'straight-leg-raise') expect(g.range).toMatch(/care team sets/);
  });

  it('the near leg is the operated leg in every guide', () => {
    EXERCISE_KINDS.forEach((k) => expect(guideFor(k).legFacingCamera.toLowerCase()).toMatch(/operated (leg|side)/));
  });

  it('the mini squat is side-on to the camera', () => {
    expect(guideFor('mini-squat').startPosition).toMatch(/side-on/);
  });

  // T1, T2 of docs/design-reconciliation.md. P1 and P2 rec 29 avoid open-chain knee extension to full extension early.
  it('the seated hold range text names the angle that the care team sets and never asks for a straight knee (T1)', () => {
    expect(guideFor('seated-extension-hold').range).toBe(
      'Lift your foot until your knee reaches the angle that your care team sets. Do not straighten your knee past that angle. Hold for the time that your care team sets. Then lower your foot.',
    );
  });

  it('the seated hold speed text starts the hold at the angle that the care team sets (T2)', () => {
    expect(guideFor('seated-extension-hold').speed).toBe(
      'Move slowly up and down. The hold time starts when your knee reaches the angle that your care team sets. It restarts if your knee bends more.',
    );
  });

  it('the seated hold guide has no instruction to straighten the knee and no straight leg start', () => {
    const text = Object.values(guideFor('seated-extension-hold')).join(' ');
    expect(text).not.toMatch(/straighten your knee\./i);
    expect(text).not.toMatch(/Straighten your knee\. Hold/);
    expect(text).not.toMatch(/leg is straight/i);
  });

  it('the straight leg raise tells the person to lower the leg when the knee bends and to ask the care team (T7)', () => {
    expect(guideFor('straight-leg-raise').range).toMatch(
      /If your knee bends when you lift your leg, lower the leg\. Ask your care team how to do this exercise\.$/,
    );
    expect(guideFor('straight-leg-raise').range).not.toMatch(/stop this exercise/i);
  });
});

describe('the leg raise guide gives no lift height', () => {
  it('sends the person to the care team for the height and drops "height of your other knee"', () => {
    const range = guideFor('straight-leg-raise').range;
    expect(range).toMatch(/Ask your care team how high to lift your leg\./);
    expect(range).not.toMatch(/other knee/);
  });
});

describe('the guide names the chosen leg (L1-06)', () => {
  it('keeps "operated" by default', () => {
    EXERCISE_KINDS.forEach((k) => expect(JSON.stringify(guideFor(k))).toBe(JSON.stringify(guideFor(k, 'operated'))));
  });

  it.each(EXERCISE_KINDS)('%s: says "chosen" and never "operated" when the other leg is chosen', (kind) => {
    const text = Object.values(guideFor(kind, 'chosen')).join(' ');
    expect(text).not.toMatch(/operated/i);
    expect(text).toMatch(/chosen (leg|side)/);
  });

  it('says that the chosen leg is the leg nearest the camera', () => {
    expect(guideFor('heel-slide', 'chosen').legFacingCamera).toBe('Your chosen leg is the leg nearest the camera. Put the camera at the side of that leg.');
  });

  it.each(EXERCISE_KINDS)('%s: keeps the 25 word limit and the number rules for the chosen leg', (kind) => {
    const g = guideFor(kind, 'chosen');
    Object.values(g).forEach((t) => t.split(/(?<=[.!?])\s+/).forEach((s: string) => expect(s.split(/\s+/).length).toBeLessThanOrEqual(25)));
    expect(Object.values(g).join(' ')).not.toMatch(/\d/);
  });
});
