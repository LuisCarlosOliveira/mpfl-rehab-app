// The questionnaire model: the order of the questions, when a question is answered, the early referral, and the inputs.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { answered, earlyReferral, emptyAnswers, fromInputs, limitNumber, limitProblem, stepsFor, toInputs, type Answers } from '../src/lib/onboarding';
import { inputsSchema } from '../src/lib/protocolGen';

// The extended generator items are on by default (VITE_GENERATOR_EXTENDED is off only for false or 0). This file sets the flag on to be exact.
// The value false (off) is tested in protocolGenV2.test.ts, onboardingModel.test.ts and ui/updatePlanV2.test.tsx.
vi.stubEnv('VITE_GENERATOR_EXTENDED', 'true');
beforeEach(() => vi.stubEnv('VITE_GENERATOR_EXTENDED', 'true'));

const TODAY = '2026-11-08';
const full = (over: Partial<Answers> = {}): Answers => ({
  ...emptyAnswers(),
  writtenPlan: 'no',
  procedure: 'mpflr-only',
  ageBand: '18-plus',
  bothKnees: false,
  firstSurgery: 'yes',
  specialRules: 'no',
  surgeryDate: '2026-10-20',
  side: 'left',
  limitKind: 'degrees',
  limitDegrees: '60',
  pain: 2,
  swelling: 'none',
  ...over,
});

describe('the order of the questions', () => {
  it('asks the referral questions first, then the date, the knee, the limit and the checks', () => {
    expect(stepsFor(full(), TODAY)).toEqual([
      'writtenPlan', 'procedure', 'ageBand', 'bothKnees', 'firstSurgery', 'specialRules', 'surgeryDate', 'side', 'limit', 'redFlags', 'today', 'summary',
    ]);
  });

  it('adds the clearance question from week 7 and not before', () => {
    expect(stepsFor(full({ surgeryDate: '2026-09-20' }), TODAY)).toContain('clearance');
    expect(stepsFor(full({ surgeryDate: '2026-09-21' }), TODAY)).not.toContain('clearance');
    expect(stepsFor(full({ surgeryDate: '' }), TODAY)).not.toContain('clearance');
  });

  it('puts the clearance question before the summary', () => {
    const steps = stepsFor(full({ surgeryDate: '2026-09-20' }), TODAY);
    expect(steps.indexOf('clearance')).toBe(steps.indexOf('summary') - 1);
  });
});

describe('the questions of version 2 (mini squat and seated hold)', () => {
  const week8 = { surgeryDate: '2026-09-15' };
  const asked = (over: Partial<Answers> = {}) => full({ ...week8, phaseClearance: 'yes', ...over });

  it('asks the three answers after the clearance answer only when the clearance answer is yes', () => {
    const steps = stepsFor(asked(), TODAY);
    expect(steps.slice(steps.indexOf('clearance'))).toEqual(['clearance', 'walking', 'legRaise', 'seatedHold', 'summary']);
    for (const phaseClearance of ['no', 'unknown', null] as const) {
      expect(stepsFor(asked({ phaseClearance }), TODAY)).not.toContain('walking');
    }
    expect(stepsFor(full({ surgeryDate: '2026-10-20', phaseClearance: 'yes' }), TODAY)).not.toContain('walking');
  });

  it('needs each of the three answers', () => {
    for (const step of ['walking', 'legRaise', 'seatedHold'] as const) expect(answered(step, asked())).toBe(false);
    expect(answered('walking', asked({ walksWithoutCrutches: 'no' }))).toBe(true);
    expect(answered('legRaise', asked({ legRaiseStraight: 'unknown' }))).toBe(true);
    expect(answered('seatedHold', asked({ seatedHoldCleared: 'yes' }))).toBe(true);
  });

  it('gives null when an asked answer is missing, and puts the answers in the inputs', () => {
    expect(toInputs(asked(), TODAY)).toBeNull();
    const i = toInputs(asked({ walksWithoutCrutches: 'yes', legRaiseStraight: 'no', seatedHoldCleared: 'unknown' }), TODAY)!;
    expect(i).toMatchObject({ walksWithoutCrutches: 'yes', legRaiseStraight: 'no', seatedHoldCleared: 'unknown', kneeGaveWay: false });
  });

  it('keeps the answers as unknown when the questions were not asked', () => {
    const i = toInputs(full({ surgeryDate: '2026-10-20', phaseClearance: 'yes', walksWithoutCrutches: 'yes' }), TODAY)!;
    expect(i).toMatchObject({ walksWithoutCrutches: 'unknown', legRaiseStraight: 'unknown', seatedHoldCleared: 'unknown' });
  });

  it('round-trips through fromInputs', () => {
    const i = toInputs(asked({ walksWithoutCrutches: 'yes', legRaiseStraight: 'yes', seatedHoldCleared: 'no' }), TODAY)!;
    expect(toInputs(fromInputs(i, TODAY), TODAY)).toEqual(i);
  });
});

describe('the questions of version 2 with the flag off (VITE_GENERATOR_EXTENDED=false)', () => {
  it('asks no walking, leg raise or seated hold question, and gives the answers as unknown', () => {
    vi.stubEnv('VITE_GENERATOR_EXTENDED', 'false');
    const a = full({ surgeryDate: '2026-09-15', phaseClearance: 'yes' });
    expect(stepsFor(a, TODAY)).not.toContain('walking');
    expect(toInputs(a, TODAY)).toMatchObject({ walksWithoutCrutches: 'unknown', legRaiseStraight: 'unknown', seatedHoldCleared: 'unknown' });
  });
});

describe('answered', () => {
  it('is false for an empty questionnaire at every step but the lists with a default', () => {
    const a = emptyAnswers();
    for (const step of ['writtenPlan', 'procedure', 'ageBand', 'bothKnees', 'firstSurgery', 'specialRules', 'surgeryDate', 'side', 'limit', 'today', 'clearance'] as const) {
      expect(answered(step, a)).toBe(false);
    }
    expect(answered('redFlags', a)).toBe(true);
  });

  it('needs a real date for the surgery date', () => {
    expect(answered('surgeryDate', full({ surgeryDate: '2026-02-31' }))).toBe(false);
    expect(answered('surgeryDate', full({ surgeryDate: '2026-10-20' }))).toBe(true);
  });

  it('needs a number from 0 to 180 when the person gives a limit', () => {
    expect(answered('limit', full({ limitKind: 'degrees', limitDegrees: '' }))).toBe(false);
    expect(answered('limit', full({ limitKind: 'degrees', limitDegrees: '181' }))).toBe(false);
    expect(answered('limit', full({ limitKind: 'degrees', limitDegrees: '-1' }))).toBe(false);
    expect(answered('limit', full({ limitKind: 'degrees', limitDegrees: 'abc' }))).toBe(false);
    expect(answered('limit', full({ limitKind: 'degrees', limitDegrees: '0' }))).toBe(true);
    expect(answered('limit', full({ limitKind: 'none', limitDegrees: '' }))).toBe(true);
    expect(answered('limit', full({ limitKind: 'unknown' }))).toBe(true);
  });

  it('needs both a pain value and a swelling answer on the knee screen', () => {
    expect(answered('today', full({ pain: null }))).toBe(false);
    expect(answered('today', full({ swelling: null }))).toBe(false);
    expect(answered('today', full({ pain: 0 }))).toBe(true);
  });
});

describe('the limit field (A-06)', () => {
  it('takes only whole degrees from 0 to 180', () => {
    for (const ok of ['0', '45', '180', ' 60 ']) expect(limitNumber(ok), ok).not.toBeNull();
    for (const bad of ['', '181', '200', '-5', '90.5', 'abc', '1e1']) expect(limitNumber(bad), bad).toBeNull();
  });

  it('gives a message for a value outside the rule, and none for an empty or good value', () => {
    expect(limitProblem('')).toBeNull();
    expect(limitProblem('60')).toBeNull();
    for (const bad of ['200', '-5', '90.5', 'abc']) expect(limitProblem(bad), bad).toBe('Enter a whole number of degrees from 0 to 180.');
  });
});

describe('toInputs and fromInputs', () => {
  it('builds inputs that the strict schema accepts', () => {
    const inputs = toInputs(full(), TODAY);
    expect(inputs && inputsSchema.safeParse(inputs).success).toBe(true);
    expect(inputs?.surgeonLimit).toEqual({ kind: 'degrees', degrees: 60 });
    expect(inputs?.phaseClearance).toBe('no');
  });

  it('gives null when an answer is missing', () => {
    expect(toInputs(full({ side: null }), TODAY)).toBeNull();
    expect(toInputs(full({ pain: null }), TODAY)).toBeNull();
  });

  it('keeps the clearance answer only when the question was asked', () => {
    const gates = { walksWithoutCrutches: 'no', legRaiseStraight: 'no', seatedHoldCleared: 'no' } as const; // the three questions of version 2 follow the answer yes
    expect(toInputs(full({ surgeryDate: '2026-09-20', phaseClearance: 'yes', ...gates }), TODAY)?.phaseClearance).toBe('yes');
    expect(toInputs(full({ surgeryDate: '2026-10-20', phaseClearance: 'yes' }), TODAY)?.phaseClearance).toBe('no');
  });

  it('keeps only the ticked red flags', () => {
    expect(toInputs(full({ redFlags: { calf: true, swelling: false } }), TODAY)?.redFlags).toEqual({ calf: true });
  });

  it('round-trips through fromInputs', () => {
    const inputs = toInputs(full({ limitKind: 'none', limitDegrees: '' }), TODAY)!;
    expect(toInputs(fromInputs(inputs, TODAY), TODAY)).toEqual(inputs);
  });
});

describe('fromInputs and the questions that are not asked (A-01)', () => {
  it('gives null for the clearance and the gate answers when the date is before week 7', () => {
    const inputs = toInputs(full(), TODAY)!;
    expect(inputs.phaseClearance).toBe('no');
    const a = fromInputs(inputs, TODAY);
    expect(a.phaseClearance).toBeNull();
    expect(a.walksWithoutCrutches).toBeNull();
    expect(a.legRaiseStraight).toBeNull();
    expect(a.seatedHoldCleared).toBeNull();
  });

  it('keeps the clearance answer when the question is asked', () => {
    const gates = { walksWithoutCrutches: 'no', legRaiseStraight: 'no', seatedHoldCleared: 'no' } as const;
    const inputs = toInputs(full({ surgeryDate: '2026-09-15', phaseClearance: 'yes', ...gates }), TODAY)!;
    expect(fromInputs(inputs, TODAY)).toMatchObject({ phaseClearance: 'yes', ...gates });
  });
});

describe('earlyReferral and the surgery date (A-12)', () => {
  it('refers with R10 from week 12, and with no date or a date that is not usable it does not refer', () => {
    expect(earlyReferral(full({ surgeryDate: '2026-08-01' }), TODAY)).toMatchObject({ reason: 'R10' });
    expect(earlyReferral(full({ surgeryDate: '2026-08-23' }), TODAY)).toBeNull();
    expect(earlyReferral(full({ surgeryDate: '' }), TODAY)).toBeNull();
    expect(earlyReferral(full({ surgeryDate: '2026-02-31' }), TODAY)).toBeNull();
    expect(earlyReferral(full({ surgeryDate: '2027-01-01' }), TODAY)).toBeNull();
  });
});

describe('earlyReferral', () => {
  it('is null while the answers of the referral questions allow a plan', () => {
    expect(earlyReferral(emptyAnswers(), TODAY)).toBeNull();
    expect(earlyReferral(full(), TODAY)).toBeNull();
  });

  it.each([
    ['a written plan', { writtenPlan: 'yes' as const }, 'R1'],
    ['an unknown written plan', { writtenPlan: 'unknown' as const }, 'R1'],
    ['a combined surgery', { procedure: 'combined' as const }, 'R2'],
    ['an unknown surgery', { procedure: 'unknown' as const }, 'R2'],
    ['under 18', { ageBand: 'under-18' as const }, 'R3'],
    ['both knees', { bothKnees: true }, 'R4'],
    ['a repeat surgery', { firstSurgery: 'no' as const }, 'R5'],
    ['special rules', { specialRules: 'yes' as const }, 'R6'],
  ])('gives the referral for %s before the other questions are answered', (_name, over, id) => {
    const r = earlyReferral({ ...emptyAnswers(), ...over }, TODAY);
    expect(r).toMatchObject({ kind: 'referral', reason: id });
  });

  it('uses the text of the generator for the case', () => {
    expect(earlyReferral(full({ procedure: 'combined' }), TODAY)?.text).toContain('MPFL reconstruction with no other procedure');
  });

  it('does not treat a missing date or a red flag as an early referral', () => {
    expect(earlyReferral(full({ surgeryDate: '' }), TODAY)).toBeNull();
    expect(earlyReferral(full({ redFlags: { calf: true } }), TODAY)).toBeNull();
  });
});

describe('the surgery date question with a date of today (L2-07)', () => {
  it('is not answered for a future date and is answered for today and the past', () => {
    expect(answered('surgeryDate', full({ surgeryDate: '2026-12-01' }), TODAY)).toBe(false);
    expect(answered('surgeryDate', full({ surgeryDate: TODAY }), TODAY)).toBe(true);
    expect(answered('surgeryDate', full({ surgeryDate: '2025-01-01' }), TODAY)).toBe(true);
    expect(answered('surgeryDate', full({ surgeryDate: '2026-02-31' }), TODAY)).toBe(false);
  });

  it('keeps the final guard: toInputs still passes a future date to the generator, which refers', () => {
    const i = toInputs(full({ surgeryDate: '2026-12-01' }), TODAY);
    expect(i?.surgeryDate).toBe('2026-12-01');
  });
});
