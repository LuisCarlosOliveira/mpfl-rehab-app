// ConfirmPlan is the only screen that saves a plan that the app made. Only a real click of a person saves it.
// jsdom never makes a trusted event, so the test stands in for the one read of the isTrusted flag, as protocolAccept.test.ts does.
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { describeChanges, describeNewPlan, draftOf, type PlanDraft } from '../../src/lib/planView';
import type { Protocol } from '../../src/lib/protocol';
import { generateProtocol, type GeneratorInputs } from '../../src/lib/protocolGen';
import { loadGeneratorInputs, loadStoredProtocol, saveProtocol } from '../../src/lib/storage';
import { ConfirmPlan } from '../../src/ui/ConfirmPlan';
import { freshDb } from './helpers';
import { hasVerdictWord } from './verdict';

vi.mock('../../src/lib/protocol/trustedFlag', () => ({ trustedFlag: () => (globalThis as { __trust?: boolean }).__trust === true }));
const trust = (on: boolean) => ((globalThis as { __trust?: boolean }).__trust = on);

beforeEach(() => trust(true));
afterEach(() => {
  cleanup();
  trust(false);
  vi.unstubAllEnvs();
});

const TODAY = '2026-11-08';
const inputs = (over: Partial<GeneratorInputs> = {}): GeneratorInputs => ({
  writtenPlan: 'no', procedure: 'mpflr-only', ageBand: '18-plus', bothKnees: false, firstSurgery: 'yes', specialRules: 'no',
  surgeryDate: '2026-10-15', side: 'left', surgeonLimit: { kind: 'degrees', degrees: 60 }, phaseClearance: 'no', redFlags: {}, pain: 2, swelling: 'none',
  ...over,
});
type PlanOnly = Extract<PlanDraft, { kind: 'plan' }>;
const made = (over: Partial<GeneratorInputs> = {}) => {
  const i = inputs(over);
  const r = generateProtocol(i, TODAY);
  if (r.kind !== 'protocol') throw new Error('expected a plan');
  return { i, r };
};
const createDraft = (over: Partial<GeneratorInputs> = {}): PlanOnly => {
  const { i, r } = made(over);
  return { ...(draftOf(r, 'create', i) as PlanOnly), changes: describeNewPlan(r.protocol) };
};
const updateDraft = (current: Protocol, over: Partial<GeneratorInputs>, hold: string | null = null): PlanOnly => {
  const { i, r } = made(over);
  return { ...(draftOf(r, 'update', i) as PlanOnly), changes: describeChanges(current, r.protocol), hold };
};

async function stored(db: ReturnType<typeof freshDb>, over: Partial<GeneratorInputs> = {}, approved = false): Promise<Protocol> {
  const { r } = made(over);
  const p = approved ? { ...r.protocol, approvedOn: '2026-01-02', generated: undefined } : r.protocol;
  const saved = await saveProtocol(db, JSON.stringify(p), 'demo');
  if (!saved.ok) throw new Error(saved.error.message);
  return saved.protocol;
}

function setup(draft: PlanOnly, current: Protocol | null, db = freshDb()) {
  const onAccepted = vi.fn();
  const onKeep = vi.fn();
  const view = render(<ConfirmPlan db={db} mode="demo" draft={draft} current={current} onAccepted={onAccepted} onKeep={onKeep} />);
  return { db, onAccepted, onKeep, view };
}
const confirm = () => fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

describe('ConfirmPlan, a new plan', () => {
  it('shows the reason, the new plan and the two buttons, and saves nothing before a click', async () => {
    const { db } = setup(createDraft(), null);
    expect(screen.getByRole('heading', { level: 1, name: 'Confirm your plan' })).toBeInTheDocument();
    expect(screen.getByText(/You asked the app to make a plan from your answers/)).toBeInTheDocument();
    expect(screen.getByText('Phase 1 Protection.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Do not save this plan' })).toBeInTheDocument();
    expect(await loadStoredProtocol(db, 'demo')).toBeNull();
  });

  it('lists the dose once with the names of the exercises, and shows the source note once for the group (A3-09)', () => {
    const { container } = setup(createDraft(), null).view;
    const items = [...container.querySelectorAll('.change-list li')].map((li) => li.textContent ?? '');
    const dose = items.filter((t) => t.includes('2 sets of 10 to 15, then 3 sets as tolerated'));
    expect(dose).toHaveLength(1);
    expect(dose[0]).toMatch(/^Sets and reps: straight leg raise, quadriceps set, gluteal set, leg raise to the side, leg raise to the back: 2 sets/);
    expect(items.filter((t) => t.startsWith('How many: ask your care team'))).toHaveLength(1);
    const notes = screen.getAllByLabelText('Source of: Sets and reps');
    expect(notes).toHaveLength(1);
    const lines = [...notes[0]!.querySelectorAll('li')].map((li) => li.textContent ?? '');
    expect(lines[0]).toMatch(/^Source: Cincinnati Children's Hospital Medical Center, 2015/);
    expect(lines[1]).toBe('Evidence: OPINION (level 5)');
    expect(lines[2]).toMatch(/^Population: Ages 8 to 25/);
    expect(lines[3]).toBe('Not approved by a clinician. No clinician has reviewed this value.');
    expect(container.textContent).not.toMatch(/undefined|NaN|sets of 10 reps/);
  });

  it('shows the same source note once on the Confirm of a change that adds the dose to an older plan (A3-09)', async () => {
    const { i, r } = made({});
    const next = r.protocol;
    const strip = <T extends { sets?: number; reps?: number }>(x: T): T => {
      const copy = { ...x };
      delete copy.sets;
      delete copy.reps;
      return copy;
    };
    const older: Protocol = { ...next, phases: next.phases.map((ph) => ({ ...ph, exercises: ph.exercises.map(strip), homeExercises: ph.homeExercises?.map(strip) })) };
    const draft = { ...(draftOf(r, 'update', i) as PlanOnly), changes: describeChanges(older, next), hold: null };
    setup(draft, older);
    expect(screen.getAllByLabelText('Source of: Sets and reps')).toHaveLength(1);
  });

  it('saves the plan and the answers after a click of a person, and gives the saved plan to the app', async () => {
    const { db, onAccepted } = setup(createDraft(), null);
    confirm();
    await waitFor(() => expect(onAccepted).toHaveBeenCalledTimes(1));
    const result = await loadStoredProtocol(db, 'demo');
    expect(result?.ok && result.protocol.generated?.on).toBe(TODAY);
    expect(result?.ok && result.protocol.approvedOn).toBeUndefined();
    expect(onAccepted.mock.calls[0]![0].id).toBe('generated-week-3');
    const answers = await loadGeneratorInputs(db);
    expect(answers).toMatchObject({ surgeryDate: '2026-10-15', side: 'left', surgeonLimit: { kind: 'degrees', degrees: 60 } });
    expect(answers).not.toHaveProperty('pain');
    expect(answers).not.toHaveProperty('redFlags');
  });

  it('refuses a click that is not a click of a person, saves nothing and says so', async () => {
    trust(false);
    const { db, onAccepted } = setup(createDraft(), null);
    confirm();
    expect(await screen.findByRole('alert')).toHaveTextContent(/did not read this as a click of a person/i);
    expect(onAccepted).not.toHaveBeenCalled();
    expect(await loadStoredProtocol(db, 'demo')).toBeNull();
    expect(await loadGeneratorInputs(db)).toBeNull();
  });

  it('keeps nothing and calls onKeep when the person does not save the plan', async () => {
    const { db, onKeep, onAccepted } = setup(createDraft(), null);
    fireEvent.click(screen.getByRole('button', { name: 'Do not save this plan' }));
    expect(onKeep).toHaveBeenCalledTimes(1);
    expect(onAccepted).not.toHaveBeenCalled();
    expect(await loadStoredProtocol(db, 'demo')).toBeNull();
  });

  it('saves once, also after two quick clicks', async () => {
    const { db, onAccepted } = setup(createDraft(), null);
    confirm();
    confirm();
    await waitFor(() => expect(onAccepted).toHaveBeenCalled());
    expect(onAccepted).toHaveBeenCalledTimes(1);
    expect(await db.generatorInputs.count()).toBe(1);
  });
});

describe('ConfirmPlan, a stored plan', () => {
  it('warns that a plan approved by a clinician would be replaced, and names the date', async () => {
    const db = freshDb();
    const current = await stored(db, {}, true);
    setup(createDraft(), current, db);
    const warning = screen.getByText(/approved by a clinician on/);
    expect(warning).toHaveTextContent('2026-01-02');
    expect(warning).toHaveTextContent('replaces it with a plan that no clinician approved');
    expect(screen.getByRole('button', { name: 'Keep my plan' })).toBeInTheDocument();
  });

  it('does not show that warning for a plan that no clinician approved', async () => {
    const db = freshDb();
    const current = await stored(db);
    setup(createDraft(), current, db);
    expect(screen.queryByText(/approved by a clinician on/)).toBeNull();
  });

  it('replaces the approved plan only after a click, and the new plan has no approval', async () => {
    const db = freshDb();
    const current = await stored(db, {}, true);
    const { onAccepted } = setup(createDraft(), current, db);
    const before = await loadStoredProtocol(db, 'demo');
    expect(before?.ok && before.protocol.approvedOn).toBe('2026-01-02');
    confirm();
    await waitFor(() => expect(onAccepted).toHaveBeenCalled());
    const r = await loadStoredProtocol(db, 'demo');
    expect(r?.ok && r.protocol.approvedOn).toBeUndefined();
    expect(r?.ok && r.protocol.generated).toBeDefined();
  });

  it('Keep my plan leaves the stored bytes as they were', async () => {
    const db = freshDb();
    const current = await stored(db);
    const before = (await db.protocol.get('current'))!.raw;
    const { onKeep } = setup(updateDraft(current, { surgeonLimit: { kind: 'degrees', degrees: 50 } }), current, db);
    fireEvent.click(screen.getByRole('button', { name: 'Keep my plan' }));
    expect(onKeep).toHaveBeenCalledTimes(1);
    expect((await db.protocol.get('current'))!.raw).toBe(before);
  });
});

describe('ConfirmPlan, a new plan over a stored plan that it would move forward (A-02)', () => {
  it('case A: a phase 2 plan over a stored phase 1 plan shows the hold at once and offers no Confirm', async () => {
    const db = freshDb();
    const current = await stored(db, { surgeryDate: '2026-10-15' });
    setup(createDraft({ surgeryDate: '2026-09-15', phaseClearance: 'yes' }), current, db);
    expect(screen.getByText(/Ask your care team about the next stage/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirm' })).toBeNull();
    expect(screen.queryByText(/replaces it with a plan that no clinician approved/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Keep my plan' })).toBeInTheDocument();
  });

  it('case C: a stored clinician pain limit that the new plan drops gives the pain limit reason and no Confirm', async () => {
    const db = freshDb();
    const base = await stored(db, { surgeonLimit: { kind: 'degrees', degrees: 80 } });
    const current = { ...base, approvedOn: '2026-01-02', generated: undefined, painPauseThreshold: 3 } as Protocol;
    setup(createDraft({ surgeonLimit: { kind: 'degrees', degrees: 60 } }), current, db);
    expect(screen.getByText(/pain limit from your clinician/i)).toBeInTheDocument();
    expect(screen.queryByText(/Ask your care team about the next stage/)).toBeNull();
    expect(screen.queryByText(/replaces it with a plan that no clinician approved/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Confirm' })).toBeNull();
  });

  it('a lower limit over a stored plan still offers Confirm', async () => {
    const db = freshDb();
    const current = await stored(db);
    setup(createDraft({ surgeonLimit: { kind: 'degrees', degrees: 50 } }), current, db);
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
  });

  it('with the flag on, Confirm stays open for a move forward', async () => {
    vi.stubEnv('VITE_SELF_PROGRESSION', 'true');
    const db = freshDb();
    const current = await stored(db, { surgeryDate: '2026-10-15' });
    setup(createDraft({ surgeryDate: '2026-09-15', phaseClearance: 'yes' }), current, db);
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
  });
});

describe('ConfirmPlan, an update', () => {
  it('lists each change with Before, After and its reason, and shows no internal rule code (D5)', async () => {
    const db = freshDb();
    const current = await stored(db);
    setup(updateDraft(current, { surgeonLimit: { kind: 'degrees', degrees: 50 } }), current, db);
    expect(screen.getByRole('heading', { level: 1, name: 'Confirm the change' })).toBeInTheDocument();
    const line = screen.getByText(/Knee-bend limit in your plan/).closest('li')!;
    expect(line.querySelector('.before')).toHaveTextContent('60 degrees');
    expect(line.querySelector('.after')).toHaveTextContent('50 degrees');
    expect(line).toHaveTextContent('the limit from your surgeon');
    expect(line.textContent).not.toMatch(/[A-Z]{3,}_[A-Z]{3,}/);
  });

  it('saves a lower limit after a click and keeps the other bytes of the plan', async () => {
    const db = freshDb();
    const current = await stored(db);
    const { onAccepted } = setup(updateDraft(current, { surgeonLimit: { kind: 'degrees', degrees: 50 } }), current, db);
    confirm();
    await waitFor(() => expect(onAccepted).toHaveBeenCalled());
    const r = await loadStoredProtocol(db, 'demo');
    const heel = r?.ok && r.protocol.phases[0]!.exercises.find((e) => e.kind === 'heel-slide');
    expect(heel && heel.maxFlexion).toBe(50);
  });

  it('says no change and offers no Confirm when nothing changes', async () => {
    const db = freshDb();
    const current = await stored(db);
    setup(updateDraft(current, {}), current, db);
    expect(screen.getByText('No change to your plan today.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirm' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Keep my plan' })).toBeInTheDocument();
  });

  it('shows the hold text and offers no Confirm when the draft has a hold', async () => {
    const db = freshDb();
    const current = await stored(db, { surgeryDate: '2026-09-15' });
    setup(updateDraft(current, { surgeryDate: '2026-09-15', phaseClearance: 'yes' }, 'Ask your care team about the next stage.'), current, db);
    expect(screen.getByText('Ask your care team about the next stage.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirm' })).toBeNull();
  });

  it('refuses a change that moves forward when the flag is off, even with a click, and keeps the plan', async () => {
    const db = freshDb();
    const current = await stored(db, { surgeryDate: '2026-09-15' });
    const before = (await db.protocol.get('current'))!.raw;
    const { onAccepted } = setup(updateDraft(current, { surgeryDate: '2026-09-15', phaseClearance: 'yes' }), current, db);
    confirm();
    expect(await screen.findByRole('alert')).toHaveTextContent('Ask your care team about the next stage.');
    expect(onAccepted).not.toHaveBeenCalled();
    expect((await db.protocol.get('current'))!.raw).toBe(before);
  });

  it('accepts a change that moves forward only when the flag is on', async () => {
    vi.stubEnv('VITE_SELF_PROGRESSION', 'true');
    const db = freshDb();
    const current = await stored(db, { surgeryDate: '2026-09-15' });
    const { onAccepted } = setup(updateDraft(current, { surgeryDate: '2026-09-15', phaseClearance: 'yes' }), current, db);
    confirm();
    await waitFor(() => expect(onAccepted).toHaveBeenCalled());
    const r = await loadStoredProtocol(db, 'demo');
    expect(r?.ok && r.protocol.activePhase).toBe(2);
  });
});

describe('ConfirmPlan, markup and words', () => {
  it('has no inline style, hides every icon, and holds no verdict word', async () => {
    const db = freshDb();
    const current = await stored(db, {}, true);
    const { view } = setup(updateDraft(current, { surgeonLimit: { kind: 'degrees', degrees: 50 } }), current, db);
    expect(view.container.querySelector('[style]')).toBeNull();
    for (const svg of view.container.querySelectorAll('svg')) expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(hasVerdictWord(view.container.textContent ?? '')).toBeNull();
  });
});

describe('ConfirmPlan, AC4-04 and AC4-05', () => {
  it('AC4-05: the list of a new plan with the answer No limit shows the no-limit line of the plan and Home', () => {
    setup(createDraft({ surgeonLimit: { kind: 'none' }, surgeryDate: '2026-09-12', phaseClearance: 'yes' }), null);
    expect(screen.getByText('No knee-bend limit was given by your surgeon.')).toBeInTheDocument();
  });

  it('AC4-04: a held change has the heading "Change held" and no Confirm button; a change that can be confirmed keeps "Confirm the change"', async () => {
    const db = freshDb();
    const current = await stored(db);
    const held = 'Contact your care team before the next stage.';
    const first = setup(updateDraft(current, { surgeonLimit: { kind: 'degrees', degrees: 50 } }, held), current, db);
    expect(screen.getByRole('heading', { level: 1, name: 'Change held' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirm' })).toBeNull();
    first.view.unmount();
    setup(updateDraft(current, { surgeonLimit: { kind: 'degrees', degrees: 50 } }), current, db);
    expect(screen.getByRole('heading', { level: 1, name: 'Confirm the change' })).toBeInTheDocument();
  });
});
