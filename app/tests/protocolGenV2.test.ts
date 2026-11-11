// Generator version 2 (docs/generator-v2-design.md). Steps A, B (seated hold, D4) and C (mini squat, D1).
import { protocolSchema, type Protocol } from '../src/lib/protocol/schema';
import { MARGIN_DEG } from '../src/lib/margin';
import { generateProtocol, RULES, type GeneratorInputs } from '../src/lib/protocolGen';

const TODAY = '2026-11-08';
const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

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
const cleared: Partial<GeneratorInputs> = { phaseClearance: 'yes' };
const gates: Partial<GeneratorInputs> = { ...cleared, walksWithoutCrutches: 'yes', legRaiseStraight: 'yes' };

const plan = (i: GeneratorInputs) => {
  const r = generateProtocol(i, TODAY);
  if (r.kind !== 'protocol') throw new Error(`expected a protocol, got ${r.reason}`);
  return r;
};
const phase = (p: Protocol, id: number) => p.phases.find((x) => x.id === id);
const home = (p: Protocol, id: number) => phase(p, id)?.homeExercises ?? [];
const homeKinds = (p: Protocol, id: number) => home(p, id).map((e) => e.kind);
const kinds = (p: Protocol, id: number) => phase(p, id)?.exercises.map((e) => e.kind) ?? [];
const ex = (p: Protocol, id: number, kind: string) => phase(p, id)?.exercises.find((e) => e.kind === kind);

// The extended items (mini squat, seated hold, phase 2 heel slide for an unknown limit) are behind VITE_GENERATOR_EXTENDED.
// This file tests them with the flag ON. The describe "flag OFF" at the end tests the default.
beforeEach(() => vi.stubEnv('VITE_GENERATOR_EXTENDED', 'true'));
afterEach(() => vi.unstubAllEnvs());

describe('step A: home exercises (HOME, ANKLE, DOSE)', () => {
  it.each([0, 3, 6])('adds the four home exercises with 2 sets of 10 and ankle pumps with no dose at week %i', (w) => {
    const { protocol } = plan(at(w));
    expect(homeKinds(protocol, 1)).toEqual(['quad-set', 'gluteal-set', 'ankle-pump', 'leg-raise-side', 'leg-raise-back']);
    for (const e of home(protocol, 1)) {
      if (e.kind === 'ankle-pump') expect(e).not.toHaveProperty('sets');
      else expect(e).toMatchObject({ sets: 2, reps: 10 });
      expect(e.source).toMatch(/Not approved by a clinician/);
    }
    for (const e of home(protocol, 1).filter((x) => x.kind !== 'ankle-pump')) expect(e.source).toMatch(/2 sets of 10 to 15, then 3 sets as tolerated/);
    expect(protocolSchema.safeParse(protocol).success).toBe(true);
  });

  it('drops ankle pumps in phase 2 and keeps the other home exercises', () => {
    const { protocol } = plan(at(8, cleared));
    expect(homeKinds(protocol, 1)).toContain('ankle-pump');
    expect(homeKinds(protocol, 2)).toEqual(['quad-set', 'gluteal-set', 'leg-raise-side', 'leg-raise-back']);
  });

  it('records HOME, ANKLE and DOSE in the why list and the generated rule ids', () => {
    const r = plan(at(3));
    for (const id of ['HOME', 'ANKLE', 'DOSE'] as const) expect(r.why.find((w) => w.ruleId === id)).toMatchObject({ outcome: 'generated' });
    expect(r.protocol.generated?.rules).toEqual(expect.arrayContaining(['HOME', 'ANKLE', 'DOSE']));
    const dose = r.why.find((w) => w.ruleId === 'DOSE')!;
    expect(dose.applied.map((a) => a.path)).toEqual(
      expect.arrayContaining(['phase1.straight-leg-raise.sets', 'phase1.quad-set.sets', 'phase1.gluteal-set.reps', 'phase1.leg-raise-side.reps', 'phase1.leg-raise-back.sets']),
    );
    expect(dose.applied.map((a) => a.path)).not.toContain('phase1.ankle-pump.sets');
  });

  it('keeps the dose of the heel slide and the ankle pump as NONE', () => {
    expect(RULES.DOSE_NONE.kind).toBe('none');
    expect(RULES.DOSE_NONE.text).toMatch(/heel slide/);
    expect(RULES.DOSE_NONE.text).toMatch(/ankle pump/);
    expect(plan(at(3)).why.find((w) => w.ruleId === 'DOSE_NONE')?.outcome).toBe('refused');
  });

  it('keeps the ages 8 to 25 visible in the dose text', () => {
    expect(RULES.DOSE.text).toMatch(/ages 8 to 25/);
    expect(RULES.DOSE.population).toMatch(/8 to 25/);
  });
});

describe('step A: heel slide in phase 2 for an unknown limit (HEEL_P2_UNKNOWN)', () => {
  it('adds the heel slide in phase 2 for an unknown limit with no ceiling', () => {
    const r = plan(at(8, { ...cleared, surgeonLimit: { kind: 'unknown' } }));
    expect(ex(r.protocol, 2, 'heel-slide')).toMatchObject({ targetFlexion: 2 * MARGIN_DEG, returnWithinDeg: MARGIN_DEG });
    expect(ex(r.protocol, 2, 'heel-slide')?.maxFlexion).toBeUndefined();
    expect(r.why.find((w) => w.ruleId === 'HEEL_P2_UNKNOWN')).toMatchObject({ outcome: 'generated' });
    expect(r.protocol.generated?.rules).toContain('HEEL_P2_UNKNOWN');
  });

  it('never adds the heel slide in phase 1 for an unknown limit or for no limit (refusal V2-14)', () => {
    for (const w of [0, 3, 6, 8]) {
      for (const kind of ['unknown', 'none'] as const) {
        expect(kinds(plan(at(w, { ...cleared, surgeonLimit: { kind } })).protocol, 1), `week ${w} ${kind}`).not.toContain('heel-slide');
      }
    }
  });

  it('does not use the rule when the person gave a number or no limit', () => {
    for (const surgeonLimit of [{ kind: 'none' }, { kind: 'degrees', degrees: 100 }] as const) {
      expect(plan(at(8, { ...cleared, surgeonLimit })).why.some((w) => w.ruleId === 'HEEL_P2_UNKNOWN')).toBe(false);
    }
  });
});

describe('step A: the two text lines (ROM_CHECK, PT_VISITS)', () => {
  it('records the physiotherapy line in every plan', () => {
    for (const w of [0, 4, 6, 8, 11]) {
      expect(plan(at(w, cleared)).why.find((x) => x.ruleId === 'PT_VISITS'), `week ${w}`).toMatchObject({ outcome: 'generated' });
    }
    expect(RULES.PT_VISITS.sourceIds).toContain('P2');
    expect(RULES.PT_VISITS.text).toMatch(/2 to 3 times each week/);
  });

  it('records the week-4 range check line in weeks 0 to 6', () => {
    for (const w of [0, 3, 4, 6]) expect(plan(at(w)).why.find((x) => x.ruleId === 'ROM_CHECK'), `week ${w}`).toMatchObject({ outcome: 'generated' });
    for (const w of [7, 11]) expect(plan(at(w, cleared)).why.some((x) => x.ruleId === 'ROM_CHECK'), `week ${w}`).toBe(false);
    expect(RULES.ROM_CHECK.sourceIds).toContain('P1');
    expect(RULES.ROM_CHECK.text).toMatch(/about 4 weeks after surgery/);
  });
});

describe('what stays refused (design section 4)', () => {
  it('keeps the knee-bend ceiling of phase 1 as NONE and never invents a ceiling', () => {
    expect(RULES.RANGE_NONE.kind).toBe('none');
    for (const w of [0, 3, 6]) for (const e of plan(at(w)).protocol.phases[0]!.exercises) expect(e.maxFlexion).toBeUndefined();
  });

  it('never adds a mini squat in weeks 0 to 6, also with every gate answer yes', () => {
    for (const w of [0, 3, 6]) {
      const r = plan(at(w, { ...gates, seatedHoldCleared: 'yes' }));
      expect(kinds(r.protocol, 1)).not.toContain('mini-squat');
      expect(kinds(r.protocol, 1)).not.toContain('seated-extension-hold');
      expect(r.why.find((x) => x.ruleId === 'SQUAT')?.outcome).toBe('refused');
    }
  });

  it('never fills a hold time, a tempo or a session count', () => {
    for (const w of [3, 9]) {
      const r = plan(at(w, { ...gates, seatedHoldCleared: 'yes' }));
      for (const e of r.protocol.phases.flatMap((p) => p.exercises)) {
        expect(e.holdSeconds).toBeUndefined();
        expect(e.minRepSeconds).toBeUndefined();
      }
    }
  });

  it('keeps every referral at week 12 also when the answers would add a squat', () => {
    expect(generateProtocol(at(12, { ...gates, seatedHoldCleared: 'yes' }), TODAY)).toMatchObject({ kind: 'referral', reason: 'R10' });
  });
});

describe('step C: the mini squat from week 7 (SQUAT_P2, SQUAT_GATE)', () => {
  it('adds the mini squat from week 7 only with clearance and both gate answers yes, with the dose and no depth', () => {
    for (const w of [7, 9, 11]) {
      const r = plan(at(w, gates));
      const squat = ex(r.protocol, 2, 'mini-squat');
      expect(squat, `week ${w}`).toMatchObject({ targetFlexion: 2 * MARGIN_DEG, returnWithinDeg: MARGIN_DEG });
      expect(squat).toMatchObject({ sets: 2, reps: 10 });
      expect(squat?.maxFlexion).toBeUndefined();
      expect(kinds(r.protocol, 1)).not.toContain('mini-squat');
      for (const id of ['SQUAT_P2', 'SQUAT_GATE'] as const) expect(r.why.find((x) => x.ruleId === id), id).toMatchObject({ outcome: 'generated' });
      expect(r.why.some((x) => (x.ruleId as string) === 'SQUAT_DEPTH')).toBe(false);
      expect(protocolSchema.safeParse(r.protocol).success).toBe(true);
    }
  });

  it('refuses the mini squat for each gate answer no or unknown, and without the clearance', () => {
    const answers = ['no', 'unknown'] as const;
    for (const a of answers) {
      for (const over of [{ walksWithoutCrutches: a }, { legRaiseStraight: a }] as const) {
        const r = plan(at(8, { ...gates, ...over }));
        expect(kinds(r.protocol, 2), JSON.stringify(over)).not.toContain('mini-squat');
        expect(r.why.find((x) => x.ruleId === 'SQUAT_P2')?.outcome).toBe('refused');
      }
      expect(kinds(plan(at(8, { ...gates, phaseClearance: a })).protocol, 1)).not.toContain('mini-squat');
    }
    expect(kinds(plan(at(8, { phaseClearance: 'yes' })).protocol, 2)).not.toContain('mini-squat');
  });

  it('removes the mini squat after a knee gave way event', () => {
    const r = plan(at(8, { ...gates, kneeGaveWay: true }));
    expect(kinds(r.protocol, 2)).not.toContain('mini-squat');
    expect(r.why.find((x) => x.ruleId === 'SQUAT_GATE')?.outcome).toBe('refused');
  });

  // Guardrail: the depth of the squat is a surgeon number. No number from a published source.
  it('sets no squat ceiling without a surgeon number, and uses the surgeon number as the ceiling', () => {
    const squat = (surgeonLimit: GeneratorInputs['surgeonLimit']) => ex(plan(at(8, { ...gates, surgeonLimit })).protocol, 2, 'mini-squat');
    expect(squat({ kind: 'unknown' })?.maxFlexion).toBeUndefined();
    expect(squat({ kind: 'none' })?.maxFlexion).toBeUndefined();
    for (const degrees of [40, 50, 90, 120]) expect(squat({ kind: 'degrees', degrees })?.maxFlexion, `${degrees}`).toBe(degrees);
    const r = plan(at(8, { ...gates, surgeonLimit: { kind: 'degrees', degrees: 90 } }));
    expect(r.why.find((x) => x.ruleId === 'RANGE_SURGEON')?.applied.map((a) => a.path)).toContain('phase2.mini-squat.maxFlexion');
  });

  it('leaves out the mini squat when the surgeon limit is below the camera minimum', () => {
    const lowest = 3 * MARGIN_DEG + 1;
    const squat = (degrees: number) => kinds(plan(at(8, { ...gates, surgeonLimit: { kind: 'degrees', degrees } })).protocol, 2).includes('mini-squat');
    expect(squat(lowest - 1)).toBe(false);
    expect(squat(lowest)).toBe(true);
  });

  it('shows the source that disagrees, says that the app sets no depth, and keeps the gate text', () => {
    expect(RULES.SQUAT_P2.conservative).toMatch(/P1/);
    expect(RULES.SQUAT_P2.conservative).toMatch(/week 12/);
    expect(RULES.SQUAT_P2.conservative).toMatch(/disagree/);
    expect(RULES.SQUAT_P2.text).toMatch(/no depth limit/);
    expect(RULES.SQUAT_GATE.text).toMatch(/not checked/i);
  });
});

// Guardrail: the arc of the seated hold is a clinical number. The generator never adds the hold, with any answers and in any phase.
describe('the seated hold is never generated', () => {
  const all = { ...gates, seatedHoldCleared: 'yes' } as const;

  it('adds no seated hold in any phase, for any answer, limit or week', () => {
    for (const w of [0, 3, 6, 7, 8, 9, 11]) {
      for (const surgeonLimit of [{ kind: 'unknown' }, { kind: 'none' }, { kind: 'degrees', degrees: 100 }] as const) {
        const r = plan(at(w, { ...all, surgeonLimit }));
        for (const id of [1, 2]) expect(kinds(r.protocol, id), `week ${w}`).not.toContain('seated-extension-hold');
        expect(r.why.find((x) => x.ruleId === 'HOLD')?.outcome, `week ${w}`).toBe('refused');
        for (const id of ['HOLD_P2', 'ENG_HOLD']) expect(r.why.some((x) => (x.ruleId as string) === id), id).toBe(false);
      }
    }
  });

  it('says in the plan that the app adds no seated hold and to ask the surgeon', () => {
    expect(RULES.HOLD.text).toMatch(/adds no seated knee hold/);
    expect(RULES.HOLD.text).toMatch(/Ask your surgeon/);
    expect(RULES.HOLD.conservative).toMatch(/clinical number/);
  });
});

describe('version 2 keeps the core rules', () => {
  it('keeps the plan generated, not approved and never writes the active phase', () => {
    const { protocol } = plan(at(9, { ...gates, seatedHoldCleared: 'yes' }));
    expect(protocol.approvedOn).toBeUndefined();
    expect(protocol.generated).toMatchObject({ on: TODAY });
    expect(protocol.activePhase).toBe(2);
    expect(plan(at(9, { ...gates, phaseClearance: 'no' })).protocol.activePhase).toBe(1);
  });

  it('gives a referral for a gate answer that is not valid', () => {
    expect(generateProtocol({ ...at(8, cleared), walksWithoutCrutches: 'maybe' } as unknown as GeneratorInputs, TODAY)).toMatchObject({ reason: 'RX' });
  });
});

describe('flag OFF (the default): the held back items', () => {
  beforeEach(() => vi.unstubAllEnvs());
  const all = { ...gates, seatedHoldCleared: 'yes' } as const;

  it('A-04: the heel slide text says it is left out for an unknown limit, and does not say it is in the plan', () => {
    const r = plan(at(8, { ...cleared, surgeonLimit: { kind: 'unknown' } }));
    expect(kinds(r.protocol, 2)).not.toContain('heel-slide');
    const heel = r.why.find((w) => w.ruleId === 'HEEL')!;
    expect(heel.text).not.toMatch(/do not know/);
    expect(heel.text).toMatch(/unknown/);
  });

  it('A-04: with the flag on, the heel slide text keeps the unknown limit case', () => {
    vi.stubEnv('VITE_GENERATOR_EXTENDED', 'true');
    const r = plan(at(8, { ...cleared, surgeonLimit: { kind: 'unknown' } }));
    expect(r.why.find((w) => w.ruleId === 'HEEL')!.text).toMatch(/do not know a limit/);
  });

  it('reads only the exact text true', () => {
    for (const v of ['1', 'TRUE', 'yes', '']) {
      vi.stubEnv('VITE_GENERATOR_EXTENDED', v);
      expect(kinds(plan(at(8, { ...cleared, ...all })).protocol, 2)).not.toContain('mini-squat');
    }
  });

  it('makes no mini squat and no seated hold, whatever the answers are', () => {
    for (const w of [7, 9, 11]) {
      const r = plan(at(w, { ...cleared, ...all }));
      expect(kinds(r.protocol, 2), `week ${w}`).not.toContain('mini-squat');
      expect(kinds(r.protocol, 2), `week ${w}`).not.toContain('seated-extension-hold');
      for (const id of ['SQUAT_P2', 'SQUAT_GATE'] as const) {
        expect(r.protocol.generated?.rules, id).not.toContain(id);
      }
    }
  });

  it('makes no phase 2 heel slide for an unknown limit, and keeps it for a number and for no limit', () => {
    expect(kinds(plan(at(8, { ...cleared, surgeonLimit: { kind: 'unknown' } })).protocol, 2)).toEqual(['straight-leg-raise']);
    expect(kinds(plan(at(8, { ...cleared, surgeonLimit: { kind: 'none' } })).protocol, 2)).toContain('heel-slide');
    expect(kinds(plan(at(8, { ...cleared, surgeonLimit: { kind: 'degrees', degrees: 100 } })).protocol, 2)).toContain('heel-slide');
  });

  it('keeps the home exercises and the two text lines', () => {
    const r = plan(at(8, cleared));
    expect(homeKinds(r.protocol, 2)).toEqual(['quad-set', 'gluteal-set', 'leg-raise-side', 'leg-raise-back']);
    expect(r.why.some((x) => x.ruleId === 'PT_VISITS')).toBe(true);
  });

  it('says plainly in the plan that the held back items are for the care team', () => {
    const r = plan(at(8, { ...cleared, ...all }));
    const held = r.why.find((x) => x.ruleId === 'EXTENDED_OFF');
    expect(held).toMatchObject({ outcome: 'refused' });
    expect(held?.text).toMatch(/Ask your care team/);
    for (const w of [0, 3, 6]) expect(plan(at(w)).why.some((x) => x.ruleId === 'EXTENDED_OFF'), `week ${w}`).toBe(false);
    vi.stubEnv('VITE_GENERATOR_EXTENDED', 'true');
    expect(plan(at(8, { ...cleared, ...all })).why.some((x) => x.ruleId === 'EXTENDED_OFF')).toBe(false);
  });
});

describe('audit defects D3, D4, D5 and D2 (flag ON)', () => {
  it('D4: a knee gave way event removes the mini squat', () => {
    expect(ex(plan(at(8, { ...gates, seatedHoldCleared: 'yes', kneeGaveWay: true })).protocol, 2, 'mini-squat')).toBeUndefined();
    expect(ex(plan(at(8, { ...gates, seatedHoldCleared: 'yes', kneeGaveWay: false })).protocol, 2, 'mini-squat')).toBeDefined();
  });

  it('D3: the heel slide for an unknown limit carries the P1 line about 120 degrees and the care team', () => {
    expect(RULES.HEEL_P2_UNKNOWN.text).toMatch(/120 degrees/);
    expect(RULES.HEEL_P2_UNKNOWN.text).toMatch(/Ask your care team/);
  });

  it('D2: the squat entry says that the sources disagree on a depth, so the app sets none', () => {
    expect(RULES.SQUAT_P2.conservative).toMatch(/disagree/);
    expect(RULES.SQUAT_P2.conservative).toMatch(/sets none/);
  });

  it('D5: the ankle pump rule says what P1 and P3 say and no more', () => {
    expect(RULES.ANKLE.conservative).toMatch(/acute care/);
    expect(RULES.ANKLE.conservative).not.toMatch(/first stage only/);
  });
});
