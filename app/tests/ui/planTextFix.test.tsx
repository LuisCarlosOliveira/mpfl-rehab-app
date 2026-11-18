// Text defects D1 to D6 of the plan audit. Each test failed before the change.
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { describeChanges, draftOf, type PlanDraft } from '../../src/lib/planView';
import { generateProtocol, RULES, type GeneratorInputs } from '../../src/lib/protocolGen';
import { PlanResult } from '../../src/ui/PlanResult';

afterEach(cleanup);
vi.stubEnv('VITE_GENERATOR_EXTENDED', 'true');

const base = (over: Partial<GeneratorInputs> = {}): GeneratorInputs => ({
  writtenPlan: 'no', procedure: 'mpflr-only', ageBand: '18-plus', bothKnees: false, firstSurgery: 'yes', specialRules: 'no',
  surgeryDate: '2026-11-08', side: 'left', surgeonLimit: { kind: 'unknown' }, phaseClearance: 'no', redFlags: {}, pain: 2, swelling: 'none',
  ...over,
});
/** Surgery date so that `today` is in week `w` and `extra` days. */
const dateFor = (today: string, w: number) => new Date(Date.parse(`${today}T00:00:00Z`) - w * 7 * 86_400_000).toISOString().slice(0, 10);
const TODAY = '2026-11-18';
const plan = (w: number, over: Partial<GeneratorInputs> = {}) => {
  const i = base({ surgeryDate: dateFor(TODAY, w), ...over });
  const r = generateProtocol(i, TODAY);
  if (r.kind !== 'protocol') throw new Error('expected a plan');
  const d = draftOf(r, 'create', i) as Extract<PlanDraft, { kind: 'plan' }>;
  return { r, d };
};
const romText = (w: number) => plan(w).r.why.find((e) => e.ruleId === 'ROM_CHECK')!.text;

describe('D1 heel slide note near the plan list', () => {
  it('says that the heel slide is not added, the sources, and how to add it', () => {
    render(<PlanResult draft={plan(2).d} onUse={vi.fn()} onBack={vi.fn()} />);
    const note = screen.getByText(/^Heel slide: not added\./);
    expect(note).toHaveTextContent(
      'Heel slide: not added. S1 and P3 start it in phase 1. P1 starts it later. The app adds it when you give the knee-bend limit of your surgeon (Update my plan).',
    );
    expect(note.closest('[role="note"]')).not.toBeNull();
  });
  it('lists the heel slide as not in the plan in Why this plan, with the exact audit row V36', () => {
    expect(plan(2).r.why.find((e) => e.ruleId === 'HEEL')).toMatchObject({ outcome: 'refused' });
    expect(RULES.HEEL.auditRows).toEqual(['V36']);
  });
});

describe('D2 the week-4 check uses the week of the person', () => {
  it('before week 4 it says how many weeks from now', () => {
    expect(romText(0)).toMatch(/about 4 weeks from now/);
    expect(romText(2)).toMatch(/about 2 weeks from now/);
    expect(romText(3)).toMatch(/about 1 week from now/);
  });
  it('in week 4 it says now', () => {
    expect(romText(4)).toMatch(/The check is now\./);
  });
  it('after week 4 it says the check is due now or past', () => {
    for (const w of [5, 6]) expect(romText(w)).toMatch(/The check is due now or past\. If you did not have it, contact your care team\./);
  });
  it('shows the text of the week on the plan screen, with no new degree number', () => {
    render(<PlanResult draft={plan(2).d} onUse={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getAllByText(romText(2)).length).toBeGreaterThan(0);
    for (const w of [0, 4, 6]) expect(romText(w)).not.toMatch(/degree|90|120/);
  });
});

describe('D3 P2 population', () => {
  const SENTENCE = 'P2 is for ages 8 to 25. No study gives a dose for adults after MPFL reconstruction.';
  it('no text says that P2 is not for adults', () => {
    expect(RULES.DOSE.text).toContain(SENTENCE);
    expect(RULES.DOSE.conservative).toContain(SENTENCE);
    expect(`${RULES.DOSE.text} ${RULES.DOSE.conservative}`).not.toMatch(/not for adults/);
  });
  it('the change line for a new dose does not say not for adults', () => {
    const next = plan(2).r.protocol;
    const old = structuredClone(next);
    for (const e of old.phases[0]!.exercises) {
      delete e.sets;
      delete e.reps;
    }
    const lines = describeChanges(old, next).join(' ');
    expect(lines).toContain('Sets and reps added');
    expect(lines).not.toMatch(/not for adults/);
  });
});

describe('D4 source note of the two leg raises', () => {
  it('names P3 and P2 only', () => {
    const ex = plan(2).r.protocol.phases[0]!.exercises;
    for (const kind of ['leg-raise-side', 'leg-raise-back']) {
      const src = ex.find((e) => e.kind === kind)!.source;
      expect(src).toMatch(/: P3 P2 \(HOME\)/);
      expect(src).not.toMatch(/S1|P1/);
    }
    expect(ex.find((e) => e.kind === 'straight-leg-raise')!.source).toMatch(/Name: S1 \(SLR\)/);
  });
});

describe('D6 phase 1 stays after the review date', () => {
  const LINE = (w: number) => `Your plan is still phase 1. You are in week ${w}. Phase 2 needs the report that your care team cleared you. Contact your care team.`;
  it('the generator text and the plan screen show the line from week 7 with no clearance', () => {
    for (const w of [7, 8, 10]) {
      const { r, d } = plan(w);
      expect(r.protocol.activePhase).toBe(1);
      expect(r.why.find((e) => e.ruleId === 'PH2')!.text).toBe(LINE(w));
      render(<PlanResult draft={d} onUse={vi.fn()} onBack={vi.fn()} />);
      expect(screen.getAllByText(LINE(w)).length).toBeGreaterThan(0);
      cleanup();
    }
  });
  it('shows no such line in phase 2 or before week 7', () => {
    expect(plan(8, { phaseClearance: 'yes' }).r.why.find((e) => e.ruleId === 'PH2')!.outcome).toBe('generated');
    expect(plan(3).r.why.some((e) => e.ruleId === 'PH2')).toBe(false);
  });
});
