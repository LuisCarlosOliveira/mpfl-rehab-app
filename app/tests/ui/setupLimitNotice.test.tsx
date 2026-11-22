import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MARGIN_DEG } from '../../src/lib/margin';
import { Setup } from '../../src/ui/Setup';
import { LIMIT_NOTICE } from '../../src/ui/setupView';
import { audioHarness, mockSource } from './helpers';
import { hasVerdictWord } from './verdict';

beforeEach(() => localStorage.clear());
afterEach(cleanup);

function renderSetup() {
  render(
    <Setup kind="heel-slide" side="left" exerciseName="Heel slide" targetFlexion={60} returnWithinDeg={20} source={mockSource()} sound={audioHarness().sound} onReady={vi.fn()} onCancel={vi.fn()} />,
  );
}
function toCameraStep() {
  renderSetup();
  fireEvent.click(screen.getByRole('button', { name: 'Next: set up the camera' }));
}

describe('Setup camera step: limit notice', () => {
  it('shows the notice with the margin from the constant, and Start camera stays enabled', () => {
    toCameraStep();
    const notice = screen.getByText(LIMIT_NOTICE).closest('.notice')!;
    expect(notice).toBeInTheDocument();
    expect(notice).toHaveTextContent(`off by ${MARGIN_DEG} degrees or more`);
    expect(screen.getByRole('button', { name: 'Start camera' })).toBeEnabled();
  });

  it('names the surgeon or physiotherapist and the word limit', () => {
    toCameraStep();
    expect(screen.getByText(LIMIT_NOTICE)).toHaveTextContent(/surgeon or physiotherapist/);
    expect(LIMIT_NOTICE).toMatch(/\blimit\b/);
  });

  it('has 2 sentences and no verdict word', () => {
    expect(LIMIT_NOTICE.split(/(?<=\.)\s+/)).toHaveLength(2);
    expect(hasVerdictWord(LIMIT_NOTICE)).toBeNull();
  });

  it('does not show on the guide step', () => {
    renderSetup();
    expect(screen.queryByText(LIMIT_NOTICE)).toBeNull();
  });
});
