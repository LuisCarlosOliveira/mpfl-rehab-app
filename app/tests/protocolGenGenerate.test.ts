import { protocolSchema } from '../src/lib/protocol/schema';
import { MESSAGES } from '../src/lib/redflags';
import { PAUSE_MESSAGE } from '../src/lib/safety';
import { MARGIN_DEG } from '../src/lib/margin';
import { GENERATED_BY, generateProtocol, type GeneratorInputs } from '../src/lib/protocolGen';

// The extended generator items are behind VITE_GENERATOR_EXTENDED (off by default). This file tests them with the flag on.
// The default (off) is tested in protocolGenV2.test.ts, onboardingModel.test.ts and ui/updatePlanV2.test.tsx.
vi.stubEnv('VITE_GENERATOR_EXTENDED', 'true');
beforeEach(() => vi.stubEnv('VITE_GENERATOR_EXTENDED', 'true'));

const TODAY = '2026-11-08';
const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

// Week w starts on day 7w. Three days in is the middle of the week.
const at = (week: number, over: Partial<GeneratorInputs> = {}): GeneratorInputs => ({
  writtenPlan: 'no',
  procedure: 'mpflr-only',
  ageBand: '18-plus',
  bothKnees: false,
  firstSurgery: 'yes',
  specialRules: 'no',
  surgeryDate: addDays(TODAY, -(7 * week + 3)),
  side: 'left',
  surgeonLimit: { kind: 'unknown' },
  phaseClearance: 'no',
  redFlags: {},
  pain: 2,
  swelling: 'none',
  ...over,
});

const plan = (i: GeneratorInputs) => {
  const r = generateProtocol(i, TODAY);
  if (r.kind !== 'protocol') throw new Error(`expected a protocol, got ${r.reason}`);
  return r;
};
const kinds = (p: ReturnType<typeof plan>['protocol'], phaseId: number) =>
  p.phases.find((x) => x.id === phaseId)?.exercises.map((e) => e.kind) ?? [];
const exercise = (p: ReturnType<typeof plan>['protocol'], phaseId: number, kind: string) =>
  p.phases.find((x) => x.id === phaseId)?.exercises.find((e) => e.kind === kind);

describe('referral cases', () => {
  const cases: [string, Partial<GeneratorInputs>, string][] = [
    ['R1 a written plan', { writtenPlan: 'yes' }, 'R1'],
    ['R1 written plan unknown', { writtenPlan: 'unknown' }, 'R1'],
    ['R2 combined procedure', { procedure: 'combined' }, 'R2'],
    ['R2 unknown procedure', { procedure: 'unknown' }, 'R2'],
    ['R3 under 18', { ageBand: 'under-18' }, 'R3'],
    ['R4 both knees', { bothKnees: true }, 'R4'],
    ['R5 repeat surgery', { firstSurgery: 'no' }, 'R5'],
    ['R5 unknown surgery history', { firstSurgery: 'unknown' }, 'R5'],
    ['R6 special rules', { specialRules: 'yes' }, 'R6'],
    ['R6 special rules unknown', { specialRules: 'unknown' }, 'R6'],
    ['R7 no date', { surgeryDate: null }, 'R7'],
    ['R7 date in the future', { surgeryDate: addDays(TODAY, 1) }, 'R7'],
    ['R7 impossible date', { surgeryDate: '2026-02-31' }, 'R7'],
    ['R8 a care-team red flag', { redFlags: { calf: true } }, 'R8'],
    ['R8 an emergency red flag', { redFlags: { 'breathless-chest': true } }, 'R8'],
    ['R9 pain at the floor', { pain: 7 }, 'R9'],
    ['R9 swelling more than before', { swelling: 'more' }, 'R9'],
    ['R9 pain value not valid', { pain: 11 }, 'R9'],
    ['R10 week 12', { surgeryDate: addDays(TODAY, -84) }, 'R10'],
  ];

  it.each(cases)('gives a referral for %s', (_name, over, id) => {
    const r = generateProtocol(at(3, over), TODAY);
    expect(r.kind).toBe('referral');
    if (r.kind === 'referral') {
      expect(r.reason).toBe(id);
      expect(r.text.startsWith('The app cannot make a plan for you.')).toBe(true);
    }
  });

  it('uses the red-flag message of its group', () => {
    const emergency = generateProtocol(at(3, { redFlags: { 'breathless-chest': true, calf: true } }), TODAY);
    const care = generateProtocol(at(3, { redFlags: { calf: true } }), TODAY);
    expect(emergency.kind === 'referral' && emergency.text).toContain(MESSAGES.emergency);
    expect(care.kind === 'referral' && care.text).toContain(MESSAGES['care-team']);
  });

  it('uses the pause message of FR12', () => {
    const r = generateProtocol(at(3, { pain: 8 }), TODAY);
    expect(r.kind === 'referral' && r.text).toContain(PAUSE_MESSAGE);
  });

  it('checks a red flag before the pause rule and the pause rule before the other cases', () => {
    expect(generateProtocol(at(3, { redFlags: { calf: true }, pain: 9, writtenPlan: 'yes' }), TODAY)).toMatchObject({ reason: 'R8' });
    expect(generateProtocol(at(3, { pain: 9, writtenPlan: 'yes' }), TODAY)).toMatchObject({ reason: 'R9' });
    expect(generateProtocol(at(13, { procedure: 'combined' }), TODAY)).toMatchObject({ reason: 'R2' });
    expect(generateProtocol(at(13), TODAY)).toMatchObject({ reason: 'R10' });
  });

  it('refers at the exact boundary of week 12 and not before', () => {
    expect(generateProtocol(at(0, { surgeryDate: addDays(TODAY, -83) }), TODAY).kind).toBe('protocol');
    expect(generateProtocol(at(0, { surgeryDate: addDays(TODAY, -84) }), TODAY)).toMatchObject({ kind: 'referral', reason: 'R10' });
    expect(generateProtocol(at(0, { surgeryDate: TODAY }), TODAY).kind).toBe('protocol');
  });
});

describe('fail closed', () => {
  it('gives a referral when reading the inputs throws', () => {
    const bomb = new Proxy({}, { get: () => { throw new Error('boom'); } }) as GeneratorInputs;
    expect(generateProtocol(bomb, TODAY)).toMatchObject({ kind: 'referral', reason: 'RX' });
  });

  it('gives a referral for an unknown key, a wrong type and a bad value of today', () => {
    expect(generateProtocol({ ...at(3), extra: 1 } as unknown as GeneratorInputs, TODAY)).toMatchObject({ reason: 'RX' });
    expect(generateProtocol({ ...at(3), side: 'up' } as unknown as GeneratorInputs, TODAY)).toMatchObject({ reason: 'RX' });
    expect(generateProtocol(at(3), 'yesterday')).toMatchObject({ reason: 'RX' });
  });
});

describe('week 0 to 6, phase 1', () => {
  it.each([0, 3, 6])('makes phase 1 with the straight leg raise at week %i', (w) => {
    const { protocol } = plan(at(w));
    expect(protocol.activePhase).toBe(1);
    expect(protocol.phases.map((p) => p.id)).toEqual([1]);
    expect(kinds(protocol, 1)).toEqual(['straight-leg-raise']);
  });

  it('generates the conservative dose of the guideline for the straight leg raise', () => {
    const slr = exercise(plan(at(3)).protocol, 1, 'straight-leg-raise');
    expect(slr).toMatchObject({ sets: 2, reps: 10 });
    expect(slr?.source).toMatch(/OPINION/);
    expect(slr?.source).toMatch(/Not approved by a clinician/);
  });

  it('never fills a hold time, a tempo, a top angle or a pain threshold', () => {
    const { protocol } = plan(at(3, { surgeonLimit: { kind: 'degrees', degrees: 60 } }));
    expect(protocol.painPauseThreshold).toBeUndefined();
    for (const e of protocol.phases.flatMap((p) => p.exercises)) {
      expect(e.holdSeconds).toBeUndefined();
      expect(e.minRepSeconds).toBeUndefined();
      expect(e.maxTopFlexion).toBeUndefined();
    }
  });

  it('leaves out the heel slide in phase 1 without a number from the surgeon', () => {
    for (const limit of [{ kind: 'unknown' }, { kind: 'none' }] as const) {
      expect(kinds(plan(at(3, { surgeonLimit: limit })).protocol, 1)).not.toContain('heel-slide');
    }
  });

  it('adds the heel slide in phase 1 with the surgeon limit as its ceiling and the engineering values', () => {
    const heel = exercise(plan(at(3, { surgeonLimit: { kind: 'degrees', degrees: 60 } })).protocol, 1, 'heel-slide');
    expect(heel).toMatchObject({ maxFlexion: 60, targetFlexion: 2 * MARGIN_DEG, returnWithinDeg: MARGIN_DEG });
    expect(heel?.sets).toBeUndefined();
    expect(heel?.reps).toBeUndefined();
    expect(heel?.source).toMatch(/ENGINEERING/);
  });

  it('leaves out the heel slide when the limit is too low for the camera margin', () => {
    const lowest = 3 * MARGIN_DEG + 1;
    expect(kinds(plan(at(3, { surgeonLimit: { kind: 'degrees', degrees: lowest - 1 } })).protocol, 1)).not.toContain('heel-slide');
    expect(kinds(plan(at(3, { surgeonLimit: { kind: 'degrees', degrees: lowest } })).protocol, 1)).toContain('heel-slide');
  });

  it('never makes a mini squat or a seated hold', () => {
    for (let w = 0; w <= 11; w++) {
      const { protocol } = plan(at(w, { surgeonLimit: { kind: 'degrees', degrees: 90 }, phaseClearance: 'yes' }));
      const all = protocol.phases.flatMap((p) => p.exercises.map((e) => e.kind));
      expect(all).not.toContain('mini-squat');
      expect(all).not.toContain('seated-extension-hold');
    }
  });

  it('sets the review date of phase 1 six weeks after surgery with checks that hold no number', () => {
    const i = at(3);
    const phase = plan(i).protocol.phases[0]!;
    expect(phase.reviewDate).toBe(addDays(i.surgeryDate as string, 42));
    expect(phase.reviewCriteria?.map((c) => c.kind)).toEqual(['clinicianCheck', 'clinicianCheck', 'clinicianCheck']);
  });
});

describe('week 7 to 11, phase 2', () => {
  it.each([7, 9, 11])('keeps phase 1 at week %i without the clearance answer', (w) => {
    for (const phaseClearance of ['no', 'unknown'] as const) {
      const { protocol, why } = plan(at(w, { phaseClearance }));
      expect(protocol.activePhase).toBe(1);
      expect(protocol.phases.map((p) => p.id)).toEqual([1]);
      expect(why.some((x) => x.ruleId === 'PH2' && x.outcome === 'refused')).toBe(true);
    }
  });

  it.each([7, 9, 11])('makes phase 2 active at week %i with the clearance answer', (w) => {
    const { protocol } = plan(at(w, { phaseClearance: 'yes' }));
    expect(protocol.activePhase).toBe(2);
    expect(protocol.phases.map((p) => p.id)).toEqual([1, 2]);
    expect(protocol.surgeon.phaseClearance).toMatch(/Reported by you/);
  });

  it('ignores the clearance answer before week 7', () => {
    for (const w of [0, 3, 6]) expect(plan(at(w, { phaseClearance: 'yes' })).protocol.activePhase).toBe(1);
  });

  it('adds the heel slide in phase 2 for no limit, for a number and for an unknown limit, with no ceiling when no number is known', () => {
    const none = plan(at(8, { phaseClearance: 'yes', surgeonLimit: { kind: 'none' } })).protocol;
    expect(exercise(none, 2, 'heel-slide')).toMatchObject({ targetFlexion: 2 * MARGIN_DEG, returnWithinDeg: MARGIN_DEG });
    expect(exercise(none, 2, 'heel-slide')?.maxFlexion).toBeUndefined();
    expect(kinds(none, 1)).not.toContain('heel-slide');
    const num = plan(at(8, { phaseClearance: 'yes', surgeonLimit: { kind: 'degrees', degrees: 100 } })).protocol;
    expect(exercise(num, 2, 'heel-slide')?.maxFlexion).toBe(100);
    const unknown = plan(at(8, { phaseClearance: 'yes', surgeonLimit: { kind: 'unknown' } })).protocol;
    expect(kinds(unknown, 2)).toEqual(['straight-leg-raise', 'heel-slide']);
    expect(exercise(unknown, 2, 'heel-slide')?.maxFlexion).toBeUndefined();
    expect(kinds(unknown, 1)).toEqual(['straight-leg-raise']);
  });

  it('sets the review date of phase 2 twelve weeks after surgery', () => {
    const i = at(8, { phaseClearance: 'yes' });
    expect(plan(i).protocol.phases[1]?.reviewDate).toBe(addDays(i.surgeryDate as string, 84));
  });
});

describe('what every generated plan carries', () => {
  it('passes the existing protocol schema and has the same shape as a loaded file', () => {
    const { protocol } = plan(at(4, { surgeonLimit: { kind: 'degrees', degrees: 60 } }));
    expect(protocolSchema.safeParse(protocol).success).toBe(true);
    expect(protocol.schemaVersion).toBe(1);
    expect(protocol.side).toBe('left');
  });

  it('leaves the approval empty and carries the generated marker', () => {
    const { protocol } = plan(at(4));
    expect(protocol.approvedOn).toBeUndefined();
    expect(protocol.example).toBeUndefined();
    expect(protocol.authoredBy).toBe(GENERATED_BY);
    expect(GENERATED_BY).toMatch(/Generated by the app/);
    expect(protocol.generated?.on).toBe(TODAY);
  });

  it('lists the ids of the rules that made the plan, once each, and never a refused rule', () => {
    const r = generateProtocol(at(4, { surgeonLimit: { kind: 'degrees', degrees: 60 } }), TODAY);
    if (r.kind !== 'protocol') throw new Error('expected a plan');
    const ids = r.protocol.generated?.rules ?? [];
    const made = r.why.filter((w) => w.outcome === 'generated').map((w) => w.ruleId);
    expect(ids).toEqual([...new Set(made)]);
    expect(ids).toEqual(expect.arrayContaining(['W1', 'PH1', 'SLR', 'DOSE', 'REVIEW', 'RANGE_SURGEON', 'HEEL', 'ENG_TARGET', 'ENG_RETURN']));
    for (const w of r.why.filter((x) => x.outcome === 'refused')) expect(ids).not.toContain(w.ruleId);
    expect(ids.length).toBeLessThanOrEqual(40);
  });

  it('leaves out the heel slide rules from the list when the heel slide is not made', () => {
    const r = generateProtocol(at(4, { surgeonLimit: { kind: 'unknown' } }), TODAY);
    if (r.kind !== 'protocol') throw new Error('expected a plan');
    expect(r.protocol.generated?.rules).not.toContain('HEEL');
    expect(r.protocol.generated?.rules).not.toContain('RANGE_SURGEON');
  });

  it('keeps the surgeon fields as ask your surgeon except the answer of the person', () => {
    const { surgeon } = plan(at(4)).protocol;
    expect(surgeon.brace).toBeUndefined();
    expect(surgeon.weightBearing).toBeUndefined();
    expect(surgeon.depthLimit).toBeUndefined();
    expect(surgeon.concurrentProcedures).toMatch(/as entered by you/);
  });

  it('copies the operated side', () => {
    expect(plan(at(4, { side: 'right' })).protocol.side).toBe('right');
  });

  it('lists each rule with its source ids, grade, caveat and the clinician label', () => {
    const { why } = plan(at(4, { surgeonLimit: { kind: 'degrees', degrees: 60 } }));
    expect(why.length).toBeGreaterThan(5);
    for (const w of why) {
      expect(w.sourceIds.length).toBeGreaterThan(0);
      expect(w.grade).toBeTruthy();
      expect(w.population.length).toBeGreaterThan(0);
      expect(w.label).toBe('Not approved by a clinician');
    }
    const dose = why.find((w) => w.ruleId === 'DOSE');
    expect(dose).toMatchObject({ grade: 'OPINION', outcome: 'generated' });
    expect(dose?.sourceIds).toContain('P2');
  });

  it('says what it does not generate and asks for the surgeon or the care team', () => {
    const { why } = plan(at(4));
    const refused = why.filter((w) => w.outcome === 'refused').map((w) => w.ruleId);
    for (const id of ['HOLD', 'SQUAT', 'RANGE_NONE', 'DOSE_NONE', 'NONE_WB_BRACE']) expect(refused).toContain(id);
    expect(why.find((w) => w.ruleId === 'RANGE_NONE')?.text).toMatch(/Ask your surgeon/);
  });

  it('flags the pain floor and records the engineering values for review', () => {
    const { why } = plan(at(4, { surgeonLimit: { kind: 'degrees', degrees: 60 } }));
    expect(why.find((w) => w.ruleId === 'PAIN')?.flag).toBe('clinical-review-needed');
    expect(why.find((w) => w.ruleId === 'ENG_TARGET')?.flag).toBe('clinical-review-needed');
  });

  it('does not change the inputs and gives the same output for the same inputs', () => {
    const i = at(5, { surgeonLimit: { kind: 'degrees', degrees: 70 } });
    const copy = JSON.parse(JSON.stringify(i));
    const a = generateProtocol(i, TODAY);
    const b = generateProtocol(i, TODAY);
    expect(i).toEqual(copy);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('reads the date from the argument and not from a clock', () => {
    const i = at(3);
    const later = generateProtocol(i, addDays(TODAY, 70));
    expect(later).toMatchObject({ kind: 'referral', reason: 'R10' });
  });
});

describe('table over weeks 0 to 13, every procedure and age band', () => {
  const procedures = ['mpflr-only', 'combined', 'unknown'] as const;
  const ages = ['18-plus', 'under-18'] as const;
  const rows = procedures.flatMap((procedure) => ages.flatMap((ageBand) => Array.from({ length: 14 }, (_, w) => ({ procedure, ageBand, w }))));

  it.each(rows)('week $w, $procedure, $ageBand', ({ procedure, ageBand, w }) => {
    const r = generateProtocol(at(w, { procedure, ageBand }), TODAY);
    if (ageBand === 'under-18' && procedure === 'mpflr-only') {
      expect(r).toMatchObject({ kind: 'referral', reason: 'R3' });
    } else if (procedure !== 'mpflr-only') {
      expect(r).toMatchObject({ kind: 'referral', reason: 'R2' });
    } else if (w >= 12) {
      expect(r).toMatchObject({ kind: 'referral', reason: 'R10' });
    } else {
      expect(r.kind).toBe('protocol');
    }
  });
});
