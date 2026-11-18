// Fixes of the live test (L2-01, L2-03, L2-07): the engineering count value, the held change and the surgery date.
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { draftOf, type PlanDraft } from '../../src/lib/planView';
import type { Protocol } from '../../src/lib/protocol';
import { loadProtocol } from '../../src/lib/protocol';
import { generateProtocol, RULES, type GeneratorInputs } from '../../src/lib/protocolGen';
import { saveGeneratorInputs, saveProtocol, type StoredInputs } from '../../src/lib/storage';
import { Home } from '../../src/ui/Home';
import { Onboarding } from '../../src/ui/Onboarding';
import { PlanResult } from '../../src/ui/PlanResult';
import { UpdatePlan } from '../../src/ui/UpdatePlan';
import { freshDb, protocolText } from './helpers';

afterEach(cleanup);

const TODAY = '2026-11-08';
const inputs = (over: Partial<GeneratorInputs> = {}): GeneratorInputs => ({
  writtenPlan: 'no', procedure: 'mpflr-only', ageBand: '18-plus', bothKnees: false, firstSurgery: 'yes', specialRules: 'no',
  surgeryDate: '2026-10-15', side: 'left', surgeonLimit: { kind: 'degrees', degrees: 60 }, phaseClearance: 'no', redFlags: {}, pain: 2, swelling: 'none',
  ...over,
});
const generated = (over: Partial<GeneratorInputs> = {}) => {
  const r = generateProtocol(inputs(over), TODAY);
  if (r.kind !== 'protocol') throw new Error('expected a plan');
  return r;
};
const START_TEXT = `The app starts counting a rep at ${RULES.ENG_TARGET.values.targetFlexion} degrees (set by the app, not by a clinician)`;

function renderHome(p: Protocol) {
  const phase = p.phases.find((x) => x.id === p.activePhase);
  return render(<Home protocol={p} phase={phase} activePhase={p.activePhase} db={freshDb()} now={() => new Date('2026-11-08T10:00:00Z')} onStart={vi.fn()} onLoadProtocol={vi.fn()} />);
}

describe('L2-01: the engineering count value is not a target', () => {
  it('Home shows no knee bend chip and no number on the figure for a generated heel slide', () => {
    const { container } = renderHome(generated().protocol);
    expect(screen.getByText('Heel slide')).toBeInTheDocument();
    expect(screen.getByText('Limit 60 degrees')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/target knee bend|knee bend set by your care team/i);
    expect(container.textContent).not.toMatch(new RegExp(`\\b${RULES.ENG_TARGET.values.targetFlexion}( degrees|°)`));
    expect([...container.querySelectorAll('svg text')].map((t) => t.textContent)).not.toContain(`${RULES.ENG_TARGET.values.targetFlexion}°`);
  });

  it('Home shows "Knee bend set by your care team: N degrees" when a clinician wrote the protocol', () => {
    const r = loadProtocol(protocolText(), 'demo');
    if (!r.ok) throw new Error(r.error.message);
    renderHome(r.protocol);
    expect(screen.getAllByText('Knee bend set by your care team: 60 degrees').length).toBeGreaterThan(0);
  });

  const draft = () => {
    const i = inputs();
    const d = draftOf(generateProtocol(i, TODAY), 'create', i) as Extract<PlanDraft, { kind: 'plan' }>;
    return d;
  };

  it('the plan says what the value is and never calls it a target', () => {
    const { container } = render(<PlanResult draft={draft()} onUse={vi.fn()} onBack={vi.fn()} />);
    const list = screen.getByRole('list', { name: 'Exercises in your plan' });
    expect(within(list).getByText(new RegExp(`^${START_TEXT.replace(/[()]/g, '\\$&')}`))).toBeInTheDocument();
    // The plan section holds no "target". The guideline words of a rule of kind none ("passive range targets") are in Why this plan, not here.
    expect(container.querySelector('[aria-labelledby="plan-phase"]')?.textContent).not.toMatch(/target/i);
  });

  it('Why this plan shows the value with the same words, and the return tolerance as an app value', () => {
    render(<PlanResult draft={draft()} onUse={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getAllByText('Values in your plan', { selector: 'dt' }).length).toBeGreaterThan(0);
    expect(screen.getAllByText(new RegExp(START_TEXT.replace(/[()]/g, '\\$&'), 'i')).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/set by the app, not by a clinician/, { selector: '.why-source' })).toHaveLength(2);
    expect(screen.getByText(new RegExp(`within ${RULES.ENG_RETURN.values.returnWithinDeg} degrees of rest \\(set by the app, not by a clinician\\)`))).toBeInTheDocument();
  });
});

describe('L2-03: a higher limit is held with the reason', () => {
  const stored = (): StoredInputs => ({
    writtenPlan: 'no', procedure: 'mpflr-only', ageBand: '18-plus', bothKnees: false, firstSurgery: 'yes', specialRules: 'no',
    surgeryDate: '2026-10-15', side: 'left', surgeonLimit: { kind: 'degrees', degrees: 60 },
  });
  async function open() {
    const db = freshDb();
    const s = stored();
    const r = generateProtocol({ ...s, phaseClearance: 'no', redFlags: {}, pain: 2, swelling: 'none' }, '2026-10-31');
    if (r.kind !== 'protocol') throw new Error('plan');
    const saved = await saveProtocol(db, JSON.stringify(r.protocol), 'demo');
    if (!saved.ok) throw new Error(saved.error.message);
    await saveGeneratorInputs(db, s);
    const onDone = vi.fn();
    render(<UpdatePlan db={db} protocol={saved.protocol as Protocol} today={TODAY} selfProgression={false} onDone={onDone} onCancel={vi.fn()} onCreate={vi.fn()} />);
    fireEvent.click(await screen.findByRole('radio', { name: '2' }));
    fireEvent.click(screen.getByRole('radio', { name: 'No swelling' }));
    return onDone;
  }

  it('says that the app keeps the current limit and that the care team decides', async () => {
    const onDone = await open();
    fireEvent.change(screen.getByLabelText('Limit in degrees'), { target: { value: '95' } });
    fireEvent.click(screen.getByRole('button', { name: 'Check my plan' }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(onDone.mock.calls[0]![0].hold).toBe('A higher limit needs your care team. The app keeps your current limit.');
  });

  it('keeps the next-stage text when only the phase moves', async () => {
    const onDone = await open();
    fireEvent.click(screen.getByRole('button', { name: 'Check my plan' }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(onDone.mock.calls[0]![0].hold).toBeNull();
  });
});

describe('L2-07: the date question refuses a date in the future', () => {
  const GO = 'Continue to today';
  function toDate() {
    render(<Onboarding today={TODAY} onDone={vi.fn()} onCancel={vi.fn()} />);
    const about: [string | RegExp, string][] = [
      ['Did your care team give you a written rehab plan?', 'No'], ['Which operation did you have?', 'MPFL reconstruction only'], ['How old are you?', '18 or older'],
      ['Did you have surgery on both knees?', 'No'], ['Is this your first MPFL surgery on this knee?', 'Yes'], [/Did your surgeon give special rules/, 'No'],
    ];
    for (const [q, a] of about) fireEvent.click(within(screen.getByRole('group', { name: q })).getByRole('radio', { name: a }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue to your surgeon' }));
    // The other questions of the group are answered, so only the date decides if Continue opens.
    fireEvent.click(within(screen.getByRole('group', { name: 'Which knee did you have surgery on?' })).getByRole('radio', { name: 'Left' }));
    fireEvent.click(within(screen.getByRole('group', { name: /Did your surgeon give a limit/ })).getByRole('radio', { name: 'No limit' }));
  }
  const type = (d: string, m: string, y: string) => {
    fireEvent.change(screen.getByLabelText('Day'), { target: { value: d } });
    fireEvent.change(screen.getByLabelText('Month'), { target: { value: m } });
    fireEvent.change(screen.getByLabelText('Year'), { target: { value: y } });
  };

  it('keeps Continue closed and says why for a future date', () => {
    toDate();
    type('1', '12', '2026');
    expect(screen.getByRole('button', { name: GO })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('The date cannot be in the future');
    expect(screen.getByLabelText('Day')).toHaveAttribute('aria-invalid', 'true');
  });

  it('opens Continue for today and for a past date, with no message', () => {
    toDate();
    type('8', '11', '2026'); // TODAY
    expect(screen.getByRole('button', { name: GO })).toBeEnabled();
    expect(screen.queryByRole('alert')).toBeNull();
    type('15', '10', '2026');
    expect(screen.getByRole('button', { name: GO })).toBeEnabled();
  });
});
