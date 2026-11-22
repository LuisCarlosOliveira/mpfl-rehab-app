import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Protocol } from '../../src/lib/protocol';
import { generateProtocol, type GeneratorInputs } from '../../src/lib/protocolGen';
import { saveGeneratorInputs, saveProtocol, saveSession, type StoredInputs } from '../../src/lib/storage';
import { UpdatePlan } from '../../src/ui/UpdatePlan';
import { freshDb, sessionInput } from './helpers';

afterEach(cleanup);

const TODAY = '2026-11-08';
const PLAN_DAY = '2026-11-01';
const stored: StoredInputs = {
  writtenPlan: 'no', procedure: 'mpflr-only', ageBand: '18-plus', bothKnees: false, firstSurgery: 'yes', specialRules: 'no',
  surgeryDate: '2026-09-12', side: 'left', surgeonLimit: { kind: 'none' },
};
const asked = { phaseClearance: 'yes', walksWithoutCrutches: 'yes', legRaiseStraight: 'yes' } as const;

async function seed(planAnswers: Partial<GeneratorInputs>, props: { event?: string; selfProgression?: boolean; legacy?: boolean } = {}) {
  const db = freshDb();
  const r = generateProtocol({ ...stored, phaseClearance: 'no', redFlags: {}, pain: 2, swelling: 'none', ...planAnswers }, PLAN_DAY);
  if (r.kind !== 'protocol') throw new Error('expected a plan');
  // A legacy plan, as an older version of the app stored it: the five exercises in homeExercises, with no dose.
  const FIVE = ['quad-set', 'gluteal-set', 'ankle-pump', 'leg-raise-side', 'leg-raise-back'];
  const asOld = (p: Protocol) => ({
    ...p,
    phases: p.phases.map((ph) => ({
      ...ph,
      exercises: ph.exercises.filter((e) => !FIVE.includes(e.kind)),
      homeExercises: ph.exercises.filter((e) => FIVE.includes(e.kind)).map((e) => ({ kind: e.kind, source: e.source })),
    })),
  });
  const saved = await saveProtocol(db, JSON.stringify(props.legacy ? asOld(r.protocol) : r.protocol), 'demo');
  if (!saved.ok) throw new Error(saved.error.message);
  await saveGeneratorInputs(db, stored);
  if (props.event) await saveSession(db, { ...sessionInput(), date: props.event, gaveWayPresses: 1 });
  const onDone = vi.fn();
  render(<UpdatePlan db={db} protocol={saved.protocol as Protocol} today={TODAY} selfProgression={props.selfProgression ?? true} onDone={onDone} onCancel={vi.fn()} onCreate={vi.fn()} />);
  return { onDone };
}
const ready = () => screen.findByRole('button', { name: 'Check my plan' });
const answerToday = () => {
  fireEvent.click(screen.getByRole('radio', { name: '2' }));
  fireEvent.click(screen.getByRole('radio', { name: 'No swelling' }));
};
const group = (name: RegExp) => screen.getByRole('group', { name });
const pick = (name: RegExp, choice: string) => fireEvent.click(within(group(name)).getByRole('radio', { name: choice }));
import { within } from '@testing-library/react';

// The extended generator items are on by default (VITE_GENERATOR_EXTENDED is off only for false or 0). This file sets the flag on to be exact.
// The value false (off) is tested in protocolGenV2.test.ts, onboardingModel.test.ts and ui/updatePlanV2.test.tsx.
vi.stubEnv('VITE_GENERATOR_EXTENDED', 'true');
beforeEach(() => vi.stubEnv('VITE_GENERATOR_EXTENDED', 'true'));
const clearance = /Has your surgeon or physiotherapist said that you can start the next stage/;
const walking = /Do you walk without crutches/;
const legRaise = /Can you lift your leg with a straight knee/;
const seated = /knee straightening exercises while you sit/;

describe('UpdatePlan, a stored plan from before the five exercises', () => {
  it('loads the stored plan with homeExercises and adds the dose line for the five', async () => {
    const { onDone } = await seed({}, { legacy: true });
    await ready();
    answerToday();
    pick(clearance, 'No');
    fireEvent.click(screen.getByRole('button', { name: 'Check my plan' }));
    const changes: string[] = onDone.mock.calls[0]![0].changes;
    expect(changes.join(' ')).not.toMatch(/Quadriceps set added/);
    expect(changes.join(' ')).toMatch(/Sets and reps added for Quadriceps set, Gluteal set, Leg raise to the side, Leg raise to the back\./);
  });
});

describe('UpdatePlan, the questions of version 2', () => {
  it('AC4-03: shows each of the three questions as visible text, not only in a hidden legend', async () => {
    await seed({});
    await ready();
    pick(clearance, 'Yes');
    for (const q of [walking, legRaise, seated]) {
      const legend = within(group(q)).getByText(q);
      expect(legend.tagName).toBe('LEGEND');
      expect(legend.closest('.visually-hidden')).toBeNull();
      expect(legend).not.toHaveClass('visually-hidden');
      expect(getComputedStyle(legend).display).not.toBe('none');
      expect(screen.getAllByText(q)).toHaveLength(1); // no second copy: a screen reader reads it once
    }
  });

  it('asks the three questions only after the answer yes to the clearance question', async () => {
    await seed({});
    await ready();
    expect(screen.queryByRole('group', { name: walking })).toBeNull();
    pick(clearance, 'No');
    expect(screen.queryByRole('group', { name: walking })).toBeNull();
    pick(clearance, 'Yes');
    for (const q of [walking, legRaise, seated]) expect(group(q)).toBeInTheDocument();
  });

  it('keeps Check my plan closed until the three answers are given', async () => {
    await seed({});
    await ready();
    answerToday();
    pick(clearance, 'Yes');
    expect(screen.getByRole('button', { name: 'Check my plan' })).toBeDisabled();
    pick(walking, 'Yes');
    pick(legRaise, 'Yes');
    expect(screen.getByRole('button', { name: 'Check my plan' })).toBeDisabled();
    pick(seated, 'No');
    expect(screen.getByRole('button', { name: 'Check my plan' })).toBeEnabled();
  });

  it('proposes the mini squat with its reason when both answers are yes', async () => {
    const { onDone } = await seed({ phaseClearance: 'yes' });
    await ready();
    answerToday();
    pick(clearance, 'Yes');
    pick(walking, 'Yes');
    pick(legRaise, 'Yes');
    pick(seated, 'No');
    fireEvent.click(screen.getByRole('button', { name: 'Check my plan' }));
    const draft = onDone.mock.calls[0]![0];
    expect(draft.changes.join(' ')).toContain('Mini squat added');
    expect(draft.changes.join(' ')).toContain('SQUAT_P2');
    expect(draft.inputs).toMatchObject({ walksWithoutCrutches: 'yes', legRaiseStraight: 'yes', seatedHoldCleared: 'no', kneeGaveWay: false });
  });

  it('holds the added mini squat and seated hold with the next stage text, not the higher limit text (A3-03)', async () => {
    const { onDone } = await seed({ phaseClearance: 'yes' }, { selfProgression: false });
    await ready();
    answerToday();
    pick(clearance, 'Yes');
    pick(walking, 'Yes');
    pick(legRaise, 'Yes');
    pick(seated, 'Yes');
    fireEvent.click(screen.getByRole('button', { name: 'Check my plan' }));
    const draft = onDone.mock.calls[0]![0];
    expect(draft.changes.join(' ')).toContain('Mini squat added');
    expect(draft.hold).toBe('Ask your care team about the next stage.');
    expect(String(draft.hold)).not.toMatch(/higher limit/);
  });

  it('removes the mini squat after a knee gave way press since the plan, and needs no hold', async () => {
    const { onDone } = await seed(asked, { event: '2026-11-04T10:00:00.000Z' });
    await ready();
    answerToday();
    pick(clearance, 'Yes');
    pick(walking, 'Yes');
    pick(legRaise, 'Yes');
    pick(seated, 'No');
    fireEvent.click(screen.getByRole('button', { name: 'Check my plan' }));
    const draft = onDone.mock.calls[0]![0];
    expect(draft.inputs.kneeGaveWay).toBe(true);
    expect(draft.changes.join(' ')).toContain('Mini squat removed');
    expect(draft.changes.join(' ')).toContain('SQUAT_GATE');
    expect(draft.hold).toBeNull();
  });

  it('ignores a knee gave way press from before the plan', async () => {
    const { onDone } = await seed(asked, { event: '2026-10-20T10:00:00.000Z' });
    await ready();
    answerToday();
    pick(clearance, 'Yes');
    pick(walking, 'Yes');
    pick(legRaise, 'Yes');
    pick(seated, 'No');
    fireEvent.click(screen.getByRole('button', { name: 'Check my plan' }));
    expect(onDone.mock.calls[0]![0].inputs.kneeGaveWay).toBe(false);
    expect(onDone.mock.calls[0]![0].changes).toEqual([]);
  });

  it('removes the mini squat when an answer changes to no', async () => {
    const { onDone } = await seed(asked);
    await ready();
    answerToday();
    pick(clearance, 'Yes');
    pick(walking, 'No');
    pick(legRaise, 'Yes');
    pick(seated, 'No');
    fireEvent.click(screen.getByRole('button', { name: 'Check my plan' }));
    expect(onDone.mock.calls[0]![0].changes.join(' ')).toContain('Mini squat removed');
    expect(onDone.mock.calls[0]![0].hold).toBeNull();
  });
});

describe('UpdatePlan with the flag off (VITE_GENERATOR_EXTENDED=false)', () => {
  it('does not ask the three questions and keeps Check my plan open after the clearance answer', async () => {
    vi.stubEnv('VITE_GENERATOR_EXTENDED', 'false');
    await seed({});
    await ready();
    answerToday();
    pick(clearance, 'Yes');
    expect(screen.queryByRole('group', { name: walking })).toBeNull();
    expect(screen.getByRole('button', { name: 'Check my plan' })).toBeEnabled();
  });
});

describe('AC4-03: one wording for the three questions', () => {
  it('the onboarding takes the three question texts from GATE_QUESTIONS, so the Update form and the onboarding cannot differ', async () => {
    const onboarding = (await import('node:fs')).readFileSync('src/ui/Onboarding.tsx', 'utf8');
    for (const key of ['walking', 'legRaise', 'seatedHold']) expect(onboarding).toContain(`GATE_QUESTIONS.${key}`);
    const { GATE_QUESTIONS } = await import('../../src/ui/answerControls');
    // No second copy of a question text is left in the onboarding file.
    for (const q of Object.values(GATE_QUESTIONS)) expect(onboarding).not.toContain(q);
  });
});
