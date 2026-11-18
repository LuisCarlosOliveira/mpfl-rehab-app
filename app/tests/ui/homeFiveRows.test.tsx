// Exercise monitoring, step A and D1: the five exercises are normal rows on Home, with a Start button like the other four.
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadProtocol, type Protocol } from '../../src/lib/protocol';
import { generateProtocol, type GeneratorInputs } from '../../src/lib/protocolGen';
import { Home } from '../../src/ui/Home';
import { freshDb, protocolText } from './helpers';
import { hasVerdictWord } from './verdict';

beforeEach(() => localStorage.clear());
afterEach(cleanup);

const inputs: GeneratorInputs = {
  writtenPlan: 'no', procedure: 'mpflr-only', ageBand: '18-plus', bothKnees: false, firstSurgery: 'yes', specialRules: 'no',
  surgeryDate: '2026-10-15', side: 'left', surgeonLimit: { kind: 'degrees', degrees: 60 }, phaseClearance: 'no', redFlags: {}, pain: 2, swelling: 'none',
};
const generated = (): Protocol => {
  const r = generateProtocol(inputs, '2026-11-08');
  if (r.kind !== 'protocol') throw new Error('expected a plan');
  return r.protocol;
};
function show(p: Protocol) {
  const phase = p.phases.find((x) => x.id === p.activePhase);
  const onStart = vi.fn();
  render(<Home protocol={p} phase={phase} activePhase={p.activePhase} db={freshDb()} now={() => new Date('2026-11-10T10:00:00')} onStart={onStart} onLoadProtocol={vi.fn()} />);
  return onStart;
}
// v3: the exercises are rows of the plan list. The name is a span in the row.
const row = (name: string) => screen.getByText(name, { selector: '.v3-plan-name' }).closest('li') as HTMLElement;

const LINES: Record<string, string> = {
  'Leg raise to the back': 'The camera counts your lifts and measures the angle. The app does not judge how you do it.',
  'Leg raise to the side': 'The camera counts your lifts. It cannot measure the angle well.',
  'Ankle pump': 'The camera counts your pumps. It does not check how far you move.',
  'Quadriceps set': 'The camera cannot see this effort. The app times your hold.',
  'Gluteal set': 'The camera cannot see this effort. The app times your hold.',
};

describe('Home, the five exercises', () => {
  it('shows each one as an exercise row with its own honest line, and no group "At home"', () => {
    show(generated());
    for (const [name, line] of Object.entries(LINES)) expect(within(row(name)).getByText(line)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'At home' })).toBeNull();
    expect(screen.queryByText('The app does not check these exercises.')).toBeNull();
    expect(screen.queryByText('The app does not check this exercise.')).toBeNull();
  });

  it('shows the dose line, and for the ankle pump the line that no dose is held', () => {
    show(generated());
    expect(within(row('Quadriceps set')).getByText('2 sets of 10 to 15, then 3 sets as tolerated')).toBeInTheDocument();
    expect(within(row('Ankle pump')).getByText('How many: ask your care team')).toBeInTheDocument();
  });

  it('shows a Start button for each of the five and calls onStart with the kind', () => {
    const onStart = show(generated());
    const KINDS: Record<string, string> = { 'Quadriceps set': 'quad-set', 'Gluteal set': 'gluteal-set', 'Ankle pump': 'ankle-pump', 'Leg raise to the side': 'leg-raise-side', 'Leg raise to the back': 'leg-raise-back' };
    for (const [name, kind] of Object.entries(KINDS)) {
      const button = within(row(name)).getByRole('button', { name: `Start ${name}` });
      expect(button).toBeEnabled();
      fireEvent.click(button);
      expect(onStart).toHaveBeenLastCalledWith(kind);
    }
    expect(screen.getByRole('button', { name: 'Start Straight leg raise' })).toBeEnabled();
  });

  it('gives the first row the large Start button and the other rows the quiet one', () => {
    show(generated());
    const buttons = screen.getAllByRole('button', { name: /^Start / });
    expect(buttons.length).toBeGreaterThanOrEqual(6);
    expect(buttons.filter((b) => b.className.includes('btn-lg'))).toHaveLength(1);
    expect(buttons[0]!.className).toContain('btn-lg');
  });

  it('shows the five from an older file with homeExercises, loaded and converted', () => {
    const text = protocolText({ phases: [{ id: 1, name: 'Protection', exercises: [{ kind: 'straight-leg-raise', source: 'x' }], homeExercises: [{ kind: 'quad-set', sets: 2, reps: 10, source: 'x' }] }], activePhase: 1 });
    const r = loadProtocol(text, 'demo');
    if (!r.ok) throw new Error(r.error.message);
    show(r.protocol);
    expect(within(row('Quadriceps set')).getByText(LINES['Quadriceps set']!)).toBeInTheDocument();
    expect(within(row('Quadriceps set')).getByRole('button', { name: 'Start Quadriceps set' })).toBeEnabled();
  });

  it('holds no verdict word', () => {
    show(generated());
    expect(hasVerdictWord(document.body.textContent ?? '')).toBeNull();
  });
});
