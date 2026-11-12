import { describe, expect, it } from 'vitest';
import { validateSpec, type ExerciseSpec } from '../../src/lib/monitor/spec';

// A small valid record. Each test breaks one rule and checks that the validator names the problem.
const base = (): ExerciseSpec => ({
  id: 'test-exercise',
  label: 'Test exercise',
  sourceIds: ['S1'],
  phases: [1],
  posture: ['supine'],
  view: { angle: 'side', cameraSide: 'operated-leg-near', legs: 'chosen' },
  measure: { kind: 'joint-angle', joint: 'hip-knee-ankle' },
  report: ['peak'],
  mode: 'reps-peak',
  thresholds: [
    { name: 'target-flexion', value: null, unit: 'deg', origin: 'clinician:targetFlexion' },
    { name: 'enter-fraction', value: 0.8, unit: 'fraction', origin: 'engineering' },
  ],
  cues: [{ event: 'shallow', threshold: 'target-flexion' }],
  needs: ['whole-leg'],
  guide: {
    startPosition: 'Lie on your back.',
    legFacingCamera: 'Put the camera at the side of your leg.',
    handsAndSupport: 'Keep your hands at your sides.',
    range: 'Bend your knee to the limit that your care team sets.',
    speed: 'Move slowly.',
    cameraMustSee: 'The camera must see your whole leg.',
    bodyMapPoints: [23, 25, 27],
    basis: { kind: 'existing', sourceIds: [] },
  },
  summary: ['reps', 'peak'],
});

const has = (problems: string[], word: string) => problems.some((p) => p.includes(word));

describe('validateSpec', () => {
  it('accepts a valid record', () => {
    expect(validateSpec(base())).toEqual([]);
  });

  it('rule 1: a cue cannot point at a threshold with origin engineering', () => {
    const s = base();
    s.cues = [{ event: 'shallow', threshold: 'enter-fraction' }];
    expect(has(validateSpec(s), 'engineering')).toBe(true);
  });

  it('rule 1: a cue cannot point at a threshold that does not exist', () => {
    const s = base();
    s.cues = [{ event: 'shallow', threshold: 'nothing' }];
    expect(has(validateSpec(s), 'nothing')).toBe(true);
  });

  it('rule 2: every threshold has an origin', () => {
    const s = base();
    (s.thresholds[0] as { origin?: string }).origin = undefined;
    expect(has(validateSpec(s), 'origin')).toBe(true);
    const t = base();
    (t.thresholds[1] as { origin: string }).origin = 'guess';
    expect(has(validateSpec(t), 'origin')).toBe(true);
  });

  it('rule 2: threshold names are unique', () => {
    const s = base();
    s.thresholds.push({ name: 'enter-fraction', value: 0.5, unit: 'fraction', origin: 'engineering' });
    expect(has(validateSpec(s), 'twice')).toBe(true);
  });

  it('rule 3: person-timer has measure none or a report-only measure, and no cue', () => {
    const s = base();
    s.mode = 'person-timer';
    s.cues = [];
    expect(has(validateSpec(s), 'person-timer')).toBe(true); // joint-angle is not report-only
    s.measure = { kind: 'none' };
    expect(validateSpec(s)).toEqual([]);
    s.measure = { kind: 'joint-angle', joint: 'hip-knee-ankle', reportOnly: true };
    expect(validateSpec(s)).toEqual([]);
    s.cues = [{ event: 'shallow', threshold: 'target-flexion' }];
    expect(has(validateSpec(s), 'person-timer')).toBe(true);
  });

  it('rejects an id with a bad character', () => {
    const s = base();
    s.id = 'Bad Id';
    expect(has(validateSpec(s), 'id')).toBe(true);
  });
});
