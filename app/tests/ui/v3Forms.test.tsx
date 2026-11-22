import { readFileSync } from 'node:fs';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { draftOf, type PlanDraft } from '../../src/lib/planView';
import { generateProtocol, type GeneratorInputs } from '../../src/lib/protocolGen';
import { saveGeneratorInputs, saveSession, type StoredInputs } from '../../src/lib/storage';
import { CheckProgress } from '../../src/ui/CheckProgress';
import { Onboarding } from '../../src/ui/Onboarding';
import { PlanResult } from '../../src/ui/PlanResult';
import { ChoiceGroup, LimitChoice, SwellingChoice } from '../../src/ui/answerControls';
import { freshDb, sessionInput } from './helpers';
import { hasVerdictWord } from './verdict';

afterEach(cleanup);

const TODAY = '2026-11-08';
const inputs: GeneratorInputs = {
  writtenPlan: 'no', procedure: 'mpflr-only', ageBand: '18-plus', bothKnees: false, firstSurgery: 'yes', specialRules: 'no',
  surgeryDate: '2026-10-15', side: 'left', surgeonLimit: { kind: 'degrees', degrees: 60 }, phaseClearance: 'no', redFlags: {}, pain: 2, swelling: 'none',
};

describe('answer controls on the v3 parts', () => {
  it('shows two or three answers as a segmented choice and more answers as a radio list, each with a visible legend', () => {
    const { container } = render(
      <>
        <ChoiceGroup name="a" legend="Two answers" row value={null} choices={[{ value: 'x', label: 'X' }, { value: 'y', label: 'Y' }]} onChange={() => {}} />
        <ChoiceGroup name="b" legend="Stack" value="x" choices={[{ value: 'x', label: 'X' }, { value: 'y', label: 'Y' }]} onChange={() => {}} />
        <SwellingChoice name="s" value={null} onChange={() => {}} />
      </>,
    );
    expect(container.querySelectorAll('.v3-seg')).toHaveLength(2);
    expect(container.querySelectorAll('.v3-radios')).toHaveLength(1);
    expect(screen.getByRole('group', { name: 'Is your knee swollen?' })).toBeInTheDocument();
    for (const l of container.querySelectorAll('legend')) expect(l).not.toHaveClass('visually-hidden');
  });

  it('keeps the limit field under the radio list, only after the degrees answer', () => {
    const onKind = vi.fn();
    const { rerender } = render(<LimitChoice name="limit" legend="Limit?" kind={null} degrees="" onKind={onKind} onDegrees={() => {}} />);
    expect(screen.queryByLabelText('Limit in degrees')).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: 'Yes, my limit is' }));
    expect(onKind).toHaveBeenCalledWith('degrees');
    rerender(<LimitChoice name="limit" legend="Limit?" kind="degrees" degrees="60" onKind={onKind} onDegrees={() => {}} />);
    const group = screen.getByRole('group', { name: 'Limit?' });
    expect(group.querySelector('.v3-radios')).not.toBeNull();
    expect(within(group).getByLabelText('Limit in degrees')).toHaveValue(60);
  });
});

describe('the chosen segment keeps its name', () => {
  // jsdom does not run CSS, so this reads the source. The e2e spec generator.spec.ts checks the real name after a click.
  it('hides the check mark from the accessible name with the alt text of content', () => {
    const css = readFileSync('src/ui/formsV3.css', 'utf8');
    expect(css).toMatch(/\.v3-seg-cell input:checked \+ span::before\s*\{\s*content:[^;]*\/ ''/);
  });
});

describe('screens use the v3 frame', () => {
  it('Onboarding: a v3 root, a head column and a question column, the step bar of v3 and no narrow column', () => {
    const { container } = render(<Onboarding today={TODAY} onDone={() => {}} onCancel={() => {}} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveClass('v3');
    expect(root).not.toHaveClass('narrow');
    expect(root.querySelector('.v3-cols')?.children).toHaveLength(2);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuetext', 'Step 1 of 3');
    expect(container.querySelector('.v3-actions')).not.toBeNull();
    expect(container.querySelectorAll('.v3-seg').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('.v3-radios')).toHaveLength(1);
  });

  it('gives each landmark its own name (the action bar must not repeat the name of the screen)', () => {
    const d = draftOf(generateProtocol(inputs, TODAY), 'create', inputs) as Extract<PlanDraft, { kind: 'plan' }>;
    for (const ui of [<Onboarding key="o" today={TODAY} onDone={() => {}} onCancel={() => {}} />, <PlanResult key="p" draft={d} onUse={() => {}} onBack={() => {}} />]) {
      const { unmount } = render(ui);
      const names = screen.getAllByRole('region').map((r) => r.getAttribute('aria-label') ?? r.getAttribute('aria-labelledby'));
      const labelled = screen.getAllByRole('region').map((r) => (r.getAttribute('aria-labelledby') ? document.getElementById(r.getAttribute('aria-labelledby')!)?.textContent : r.getAttribute('aria-label')));
      expect(new Set(labelled).size, names.join()).toBe(labelled.length);
      unmount();
    }
  });

  it('PlanResult: a v3 root and two columns', () => {
    const d = draftOf(generateProtocol(inputs, TODAY), 'create', inputs) as Extract<PlanDraft, { kind: 'plan' }>;
    const { container } = render(<PlanResult draft={d} onUse={() => {}} onBack={() => {}} />);
    expect(container.firstElementChild).toHaveClass('v3');
    expect(container.querySelector('.v3-cols')?.children).toHaveLength(2);
    expect(container.querySelector('.v3-actions')).not.toBeNull();
  });
});

describe('Check my progress on the v3 parts', () => {
  async function open(rows: Partial<ReturnType<typeof sessionInput>>[]) {
    const db = freshDb();
    await saveGeneratorInputs(db, { ...inputs, side: 'left' } as unknown as StoredInputs);
    for (const r of rows) await saveSession(db, { ...sessionInput(), date: '2026-11-20T10:00:00.000Z', ...r });
    const r = generateProtocol(inputs, '2026-11-08');
    if (r.kind !== 'protocol') throw new Error('expected a plan');
    const view = render(<CheckProgress db={db} protocol={r.protocol} today="2026-12-10" onUpdate={() => {}} onBack={() => {}} />);
    await screen.findByText('Not approved by a clinician.');
    return view;
  }

  it('shows the measured numbers as big numbers: last peak, limit, camera error and the S1 value, in two columns', async () => {
    const { container } = await open([{ peakFlexion: 84 }]);
    const block = screen.getByRole('region', { name: 'Your last measured numbers' });
    const expected: [string, string][] = [['Last peak knee bend, heel slide', '84'], ['Limit in your plan', '60'], ['Camera error, plus or minus', '9'], ['S1 lists knee flexion greater than', '110']];
    for (const [label, value] of expected) expect(within(block).getByRole('group', { name: label })).toHaveTextContent(value);
    expect(container.querySelectorAll('.v3-metric')).toHaveLength(4);
    expect(container.querySelector('.v3-cols')?.children).toHaveLength(2);
  });

  it('shows "--" and the reason when no angle is saved, and no sentence that sorts a value', async () => {
    const { container } = await open([]);
    const block = screen.getByRole('region', { name: 'Your last measured numbers' });
    expect(within(block).getByText('--')).toBeInTheDocument();
    expect(within(block).getByText('No knee angle is saved yet.')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/by more than the margin|Cannot tell/);
  });

  it('keeps the source and the audit row text, and has no verdict word', async () => {
    const { container } = await open([{ peakFlexion: 84 }]);
    expect(container.textContent).toContain('S1, audit row V100 (EXACT)');
    expect(container.textContent).toContain('Camera error: plus or minus 9 degrees.');
    expect(hasVerdictWord(container.textContent ?? '')).toBeNull();
  });
});
