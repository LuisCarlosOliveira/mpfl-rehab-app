import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Protocol } from '../../src/lib/protocol';
import { generateProtocol, type GeneratorInputs } from '../../src/lib/protocolGen';
import { saveGeneratorInputs, saveProtocol, saveSession, type StoredInputs } from '../../src/lib/storage';
import { UpdatePlan } from '../../src/ui/UpdatePlan';
import { freshDb, sessionInput } from './helpers';
import { hasVerdictWord } from './verdict';

afterEach(cleanup);

const TODAY = '2026-11-08';
const stored = (over: Partial<StoredInputs> = {}): StoredInputs => ({
  writtenPlan: 'no', procedure: 'mpflr-only', ageBand: '18-plus', bothKnees: false, firstSurgery: 'yes', specialRules: 'no',
  surgeryDate: '2026-10-15', side: 'left', surgeonLimit: { kind: 'degrees', degrees: 60 }, ...over,
});

/** A database with a stored generated plan, made on the day of the plan, and its stored answers. */
async function seed(over: Partial<StoredInputs> = {}, planDay = '2026-10-31') {
  const db = freshDb();
  const s = stored(over);
  const inputs: GeneratorInputs = { ...s, phaseClearance: 'no', redFlags: {}, pain: 2, swelling: 'none' };
  const r = generateProtocol(inputs, planDay);
  if (r.kind !== 'protocol') throw new Error('expected a plan');
  const saved = await saveProtocol(db, JSON.stringify(r.protocol), 'demo');
  if (!saved.ok) throw new Error(saved.error.message);
  await saveGeneratorInputs(db, s);
  return { db, protocol: saved.protocol as Protocol };
}

async function setup(over: Partial<StoredInputs> = {}, props: { today?: string; selfProgression?: boolean; skipInputs?: boolean; event?: boolean } = {}) {
  const { db, protocol } = await seed(over);
  if (props.event) await saveSession(db, { ...sessionInput(), date: '2026-11-02T10:00:00.000Z', gaveWayPresses: 1 });
  if (props.skipInputs) await db.generatorInputs.clear();
  const onDone = vi.fn();
  const onCancel = vi.fn();
  const onCreate = vi.fn();
  const view = render(
    <UpdatePlan db={db} protocol={protocol} today={props.today ?? TODAY} selfProgression={props.selfProgression ?? false} onDone={onDone} onCancel={onCancel} onCreate={onCreate} />,
  );
  return { db, protocol, onDone, onCancel, onCreate, view };
}
const ready = () => screen.findByRole('button', { name: 'Check my plan' });
const answerToday = () => {
  fireEvent.click(screen.getByRole('radio', { name: '2' }));
  fireEvent.click(screen.getByRole('radio', { name: 'No swelling' }));
};
const check = async () => {
  fireEvent.click(await ready());
};

describe('UpdatePlan, the form', () => {
  it('has the heading and the questions, with the stored limit preselected', async () => {
    await setup();
    expect(await screen.findByRole('heading', { level: 1, name: 'Update my plan' })).toBeInTheDocument();
    await ready();
    expect(screen.getByRole('heading', { level: 2, name: 'Do any of these apply today?' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'How is your knee today?' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Your surgeon limit for the knee bend' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Yes, my limit is' })).toBeChecked();
    expect((screen.getByLabelText('Limit in degrees') as HTMLInputElement).value).toBe('60');
    expect(screen.getByText(/The app changes nothing until you press Confirm/)).toBeInTheDocument();
  });

  it('keeps Check my plan closed until the pain and the swelling are answered', async () => {
    await setup();
    expect(await ready()).toBeDisabled();
    fireEvent.click(screen.getByRole('radio', { name: '2' }));
    expect(screen.getByRole('button', { name: 'Check my plan' })).toBeDisabled();
    fireEvent.click(screen.getByRole('radio', { name: 'No swelling' }));
    expect(screen.getByRole('button', { name: 'Check my plan' })).toBeEnabled();
  });

  it('shows a notice and a way to create the plan again when the answers are not stored', async () => {
    const { onCreate } = await setup({}, { skipInputs: true });
    expect(await screen.findByText(/does not have your answers/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Check my plan' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Create my plan' }));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it('goes back with the Back button', async () => {
    const { onCancel } = await setup();
    await ready();
    fireEvent.click(screen.getByRole('button', { name: 'Back to Home' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe('UpdatePlan, the proposal', () => {
  it('proposes no change when the answers are the same, and saves nothing', async () => {
    const { db, onDone } = await setup();
    const before = (await db.protocol.get('current'))!.raw;
    await ready();
    answerToday();
    await check();
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onDone.mock.calls[0]![0]).toMatchObject({ kind: 'plan', origin: 'update', changes: [], hold: null });
    expect((await db.protocol.get('current'))!.raw).toBe(before);
  });

  it('proposes a lower limit with the reason, and no hold', async () => {
    const { onDone } = await setup();
    await ready();
    answerToday();
    fireEvent.change(screen.getByLabelText('Limit in degrees'), { target: { value: '50' } });
    await check();
    const draft = onDone.mock.calls[0]![0];
    expect(draft.changes).toHaveLength(1);
    expect(draft.changes[0]).toContain('from 60 degrees to 50 degrees');
    expect(draft.hold).toBeNull();
    expect(draft.inputs.surgeonLimit).toEqual({ kind: 'degrees', degrees: 50 });
  });

  it('removes the heel slide when the person does not know the limit', async () => {
    const { onDone } = await setup();
    await ready();
    answerToday();
    fireEvent.click(screen.getByRole('radio', { name: 'I do not know' }));
    await check();
    expect(onDone.mock.calls[0]![0].changes.join(' ')).toContain('Heel slide removed');
  });

  it('makes a referral from a red flag, with the message of its group', async () => {
    const { onDone } = await setup();
    await ready();
    answerToday();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Pain, swelling, warmth or redness in your calf.' }));
    await check();
    const draft = onDone.mock.calls[0]![0];
    expect(draft).toMatchObject({ kind: 'referral', origin: 'update', reason: 'R8' });
    expect(draft.text).toContain('Stop. Do not exercise. Contact your care team.');
  });

  it('makes a referral from the pain rule', async () => {
    const { onDone } = await setup();
    await ready();
    fireEvent.click(screen.getByRole('radio', { name: '8' }));
    fireEvent.click(screen.getByRole('radio', { name: 'No swelling' }));
    await check();
    expect(onDone.mock.calls[0]![0]).toMatchObject({ kind: 'referral', reason: 'R9' });
  });

  it('uses the date that the app gives, so the weeks follow the clock: week 12 gives a referral', async () => {
    const { onDone } = await setup({}, { today: '2027-01-20' });
    await ready();
    answerToday();
    fireEvent.click(screen.getByRole('radio', { name: 'No' }));
    await check();
    expect(onDone.mock.calls[0]![0]).toMatchObject({ kind: 'referral', reason: 'R10' });
  });
});

describe('UpdatePlan, the next stage', () => {
  const week7 = { surgeryDate: '2026-09-15' };

  it('does not ask the clearance question before week 7', async () => {
    await setup();
    await ready();
    expect(screen.queryByRole('heading', { name: 'The next stage' })).toBeNull();
  });

  it('asks it from week 7, and keeps Check my plan closed until it is answered', async () => {
    await setup(week7);
    await ready();
    expect(screen.getByRole('heading', { level: 2, name: 'The next stage' })).toBeInTheDocument();
    answerToday();
    expect(screen.getByRole('button', { name: 'Check my plan' })).toBeDisabled();
    fireEvent.click(screen.getByRole('radio', { name: 'No' }));
    expect(screen.getByRole('button', { name: 'Check my plan' })).toBeEnabled();
  });

  it('puts a hold on the next stage when the flag is off', async () => {
    const { onDone } = await setup(week7, { selfProgression: false });
    await ready();
    answerToday();
    fireEvent.click(screen.getByRole('radio', { name: 'Yes' }));
    await check();
    expect(onDone.mock.calls[0]![0]).toMatchObject({ kind: 'plan', hold: 'Ask your care team about the next stage.' });
  });

  it('opens the next stage for a confirmation when the flag is on and no event is recorded', async () => {
    const { onDone } = await setup(week7, { selfProgression: true });
    await ready();
    answerToday();
    fireEvent.click(screen.getByRole('radio', { name: 'Yes' }));
    await check();
    const draft = onDone.mock.calls[0]![0];
    expect(draft.hold).toBeNull();
    expect(draft.protocol.activePhase).toBe(2);
    expect(draft.changes[0]).toContain('Phase 2');
  });

  it('holds the next stage after a safety event since the plan, even with the flag on', async () => {
    const { onDone } = await setup(week7, { selfProgression: true, event: true });
    await ready();
    answerToday();
    fireEvent.click(screen.getByRole('radio', { name: 'Yes' }));
    await check();
    expect(onDone.mock.calls[0]![0].hold).toMatch(/^Contact your care team/);
  });

  it('does not hold a change that moves back, even after a safety event', async () => {
    const { onDone } = await setup(week7, { selfProgression: false, event: true });
    await ready();
    answerToday();
    fireEvent.change(screen.getByLabelText('Limit in degrees'), { target: { value: '50' } });
    fireEvent.click(screen.getByRole('radio', { name: 'No' }));
    await check();
    expect(onDone.mock.calls[0]![0].hold).toBeNull();
  });
});

describe('UpdatePlan, markup and words', () => {
  it('has no inline style, hides every icon and holds no verdict word', async () => {
    const { view } = await setup({ surgeryDate: '2026-09-15' });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Check my plan' })).toBeInTheDocument());
    expect(view.container.querySelector('[style]')).toBeNull();
    for (const svg of view.container.querySelectorAll('svg')) expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(hasVerdictWord(view.container.textContent ?? '')).toBeNull();
  });
});
