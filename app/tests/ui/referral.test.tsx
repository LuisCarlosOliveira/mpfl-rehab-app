import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { draftOf, type PlanDraft } from '../../src/lib/planView';
import { generateProtocol, RULES, type GeneratorInputs } from '../../src/lib/protocolGen';
import { GENERAL_GUIDANCE_NOTE, MESSAGES } from '../../src/lib/redflags';
import { Referral } from '../../src/ui/Referral';
import { hasVerdictWord } from './verdict';

afterEach(cleanup);

const TODAY = '2026-11-08';
const base: GeneratorInputs = {
  writtenPlan: 'no', procedure: 'mpflr-only', ageBand: '18-plus', bothKnees: false, firstSurgery: 'yes', specialRules: 'no',
  surgeryDate: '2026-10-15', side: 'left', surgeonLimit: { kind: 'degrees', degrees: 60 }, phaseClearance: 'no', redFlags: {}, pain: 2, swelling: 'none',
};
const referral = (over: Partial<GeneratorInputs>) => {
  const d = draftOf(generateProtocol({ ...base, ...over }, TODAY), 'create', { ...base, ...over });
  if (d.kind !== 'referral') throw new Error('expected a referral');
  return d as Extract<PlanDraft, { kind: 'referral' }>;
};

function setup(over: Partial<GeneratorInputs>) {
  const onLoadFile = vi.fn();
  const onBack = vi.fn();
  const view = render(<Referral draft={referral(over)} onLoadFile={onLoadFile} onBack={onBack} />);
  return { onLoadFile, onBack, view };
}

describe('Referral', () => {
  it('has the title of the design and the text of the case, and no plan', () => {
    setup({ procedure: 'combined' });
    expect(screen.getByRole('heading', { level: 1, name: 'No plan from the app' })).toBeInTheDocument();
    expect(screen.getByText(RULES.R2.referralText as string)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Use this plan' })).toBeNull();
    expect(screen.queryByText(/Straight leg raise/)).toBeNull();
  });

  it.each([
    ['R1', { writtenPlan: 'yes' as const }],
    ['R3', { ageBand: 'under-18' as const }],
    ['R10', { surgeryDate: '2026-08-01' }],
    ['R7', { surgeryDate: null }],
  ])('shows the text of %s as the generator gives it', (id, over) => {
    setup(over);
    expect(screen.getByText(RULES[id as 'R1'].referralText as string)).toBeInTheDocument();
  });

  it('shows the red-flag message of its group and tells the person to contact the care team', () => {
    setup({ redFlags: { calf: true } });
    expect(screen.getByRole('alert')).toHaveTextContent('Stop. Do not exercise. Contact your care team.');
  });

  it('goes to the plan file and back to the start', () => {
    const { onLoadFile, onBack } = setup({ writtenPlan: 'yes' });
    fireEvent.click(screen.getByRole('button', { name: 'Load protocol file' }));
    expect(onLoadFile).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Back to the start' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('has no inline style, hides every icon, and holds no verdict word', () => {
    const { view } = setup({ writtenPlan: 'yes' });
    expect(view.container.querySelector('[style]')).toBeNull();
    for (const svg of view.container.querySelectorAll('svg')) expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(hasVerdictWord(view.container.textContent ?? '')).toBeNull();
  });
});

// A3-02: the emergency screen tells the person to call emergency services. It offers no file load as the main action.
describe('Referral, a red flag', () => {
  it('shows the general guidance note under the text for an emergency flag and for a care team flag', () => {
    for (const flag of ['breathless-chest', 'calf']) {
      const { view } = setup({ redFlags: { [flag]: true } });
      expect(screen.getByText(GENERAL_GUIDANCE_NOTE), flag).toBeInTheDocument();
      view.unmount();
    }
  });

  it('has no Load protocol file button in the emergency case, and a quiet Back to Home as the only action', () => {
    const { onBack } = setup({ redFlags: { 'breathless-chest': true } });
    expect(screen.getByRole('alert')).toHaveTextContent(MESSAGES.emergency);
    expect(screen.queryByRole('button', { name: 'Load protocol file' })).toBeNull();
    const home = screen.getByRole('button', { name: 'Back to Home' });
    expect(home).not.toHaveClass('btn-primary');
    fireEvent.click(home);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('keeps the care team case as it is: Load protocol file stays and Back to the start stays', () => {
    setup({ redFlags: { calf: true } });
    expect(screen.getByRole('button', { name: 'Load protocol file' })).toHaveClass('btn-primary');
    expect(screen.getByRole('button', { name: 'Back to the start' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Back to Home' })).toBeNull();
  });
});
