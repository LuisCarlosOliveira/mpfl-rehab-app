// Generator version 2 in the plan helpers: home exercises, the new lines of change and the forward check.
import { generateProtocol, type GeneratorInputs } from '../src/lib/protocolGen';
import { describeChanges, describeNewPlan, HOME_NAMES, movesForward, whyView } from '../src/lib/planView';
import type { Protocol } from '../src/lib/protocol';

// The extended generator items are behind VITE_GENERATOR_EXTENDED (off by default). This file tests them with the flag on.
// The default (off) is tested in protocolGenV2.test.ts, onboardingModel.test.ts and ui/updatePlanV2.test.tsx.
vi.stubEnv('VITE_GENERATOR_EXTENDED', 'true');
beforeEach(() => vi.stubEnv('VITE_GENERATOR_EXTENDED', 'true'));

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
  surgeonLimit: { kind: 'degrees', degrees: 100 },
  phaseClearance: 'yes',
  redFlags: {},
  pain: 2,
  swelling: 'none',
  ...over,
});
const plan = (week: number, over: Partial<GeneratorInputs> = {}) => {
  const r = generateProtocol(at(week, over), TODAY);
  if (r.kind !== 'protocol') throw new Error(`expected a plan, got ${r.reason}`);
  return r;
};
const gates = { walksWithoutCrutches: 'yes', legRaiseStraight: 'yes' } as const;

/** A plan from before version 2: the same plan with no home exercises. */
const old = (p: Protocol): Protocol => ({ ...p, phases: p.phases.map((ph) => ({ ...ph, homeExercises: undefined })) });

describe('describeNewPlan with home exercises', () => {
  it('A-07: one dose rule for the camera and the home exercises, and each sentence once', () => {
    const lines = describeNewPlan(plan(3).protocol);
    for (const kind of ['quad-set', 'gluteal-set', 'ankle-pump', 'leg-raise-side', 'leg-raise-back'] as const) {
      expect(lines).toContain(`${HOME_NAMES[kind]} (at home).`);
    }
    expect(lines.filter((l) => l.includes('How many'))).toEqual(['How many: ask your care team.']);
    expect(lines.filter((l) => l.includes('does not check'))).toEqual(['The app does not check the exercises at home.']);
    expect(lines.join(' ')).not.toMatch(/undefined|NaN/);
  });

  it('shows the dose once, as the whole range of the guideline, with the population and the label', () => {
    const lines = describeNewPlan(plan(3).protocol);
    const dose = lines.filter((l) => l.includes('2 sets of 10 to 15, then 3 sets as tolerated'));
    expect(dose).toHaveLength(1);
    expect(dose[0]).toContain('ages 8 to 25, not for adults');
    expect(dose[0]).toContain('Not approved by a clinician');
  });
});

describe('describeChanges with version 2 items', () => {
  it('names home exercises that a stored plan from before version 2 does not have', () => {
    const lines = describeChanges(old(plan(3).protocol), plan(3).protocol);
    expect(lines.join(' ')).toContain(`${HOME_NAMES['quad-set']} added`);
    expect(lines.join(' ')).toContain('HOME');
  });

  it('names the mini squat that is added and the rule', () => {
    const lines = describeChanges(plan(8).protocol, plan(8, gates).protocol);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('Mini squat added');
    expect(lines[0]).toContain('SQUAT_P2');
  });

  it('names the mini squat that is removed after a knee gave way event', () => {
    const lines = describeChanges(plan(8, gates).protocol, plan(8, { ...gates, kneeGaveWay: true }).protocol);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('Mini squat removed');
    expect(lines[0]).toContain('SQUAT_GATE');
  });

  it('names the heel slide for an unknown limit with its own rule', () => {
    const lines = describeChanges(plan(8, { surgeonLimit: { kind: 'none' } }).protocol, plan(8, { surgeonLimit: { kind: 'unknown' } }).protocol);
    expect(lines.join(' ')).not.toContain('HEEL)');
  });

  it('names the seated hold that is added, and the one that is removed', () => {
    const lines = describeChanges(plan(8).protocol, plan(8, { seatedHoldCleared: 'yes' }).protocol);
    expect(lines[0]).toContain('Seated knee extension hold added');
    expect(lines[0]).toContain('HOLD_P2');
    const back = describeChanges(plan(8, { seatedHoldCleared: 'yes' }).protocol, plan(8).protocol);
    expect(back[0]).toContain('Seated knee extension hold removed');
    expect(back[0]).toContain('HOLD_P2');
  });
});

describe('the forward check', () => {
  it('counts a new mini squat or a new seated hold as a move forward, and a removal as no move', () => {
    const base = plan(8).protocol;
    expect(movesForward(base, plan(8, gates).protocol)).toBe(true);
    expect(movesForward(base, plan(8, { seatedHoldCleared: 'yes' }).protocol)).toBe(true);
    expect(movesForward(plan(8, gates).protocol, base)).toBe(false);
    expect(movesForward(base, plan(8).protocol)).toBe(false);
  });
});

describe('whyView for the new values', () => {
  it('shows the dose as the start of the range, the depth of the mini squat and the hold values with their own words', () => {
    const r = plan(8, { ...gates, seatedHoldCleared: 'yes' });
    const lines = r.why.filter((w) => ['DOSE', 'HOLD_P2', 'ENG_HOLD', 'SQUAT_DEPTH'].includes(w.ruleId)).flatMap((w) => whyView(w).applied).join('\n');
    expect(lines).toContain('Phase 2, Quadriceps set, sets, start of the range: 2');
    expect(lines).toContain('Phase 2, Quadriceps set, reps, start of the range 10 to 15: 10');
    expect(lines).toContain('Phase 2, Mini squat, knee-bend limit: 50 degrees');
    expect(lines).toContain('Phase 2, Seated knee extension hold, straightest knee angle: 40 degrees');
    expect(lines).toMatch(/Phase 2, Seated knee extension hold, the app counts the hold at 58 degrees/);
    expect(lines).not.toMatch(/starts counting a rep at 58/);
    const lower = plan(8, { ...gates, surgeonLimit: { kind: 'degrees', degrees: 40 } }).why.flatMap((w) => whyView(w).applied).join('\n');
    expect(lower).toContain('Phase 2, Mini squat, knee-bend limit: 40 degrees (as entered by you)');
  });
});
