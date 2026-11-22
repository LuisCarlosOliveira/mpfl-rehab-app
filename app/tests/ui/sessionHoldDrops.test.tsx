import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlanExercise } from '../../src/lib/protocol';
import { Session } from '../../src/ui/Session';
import { audioHarness, mockSource } from './helpers';

let answer: unknown = undefined;
vi.mock('../../src/lib/exercises', async (orig) => {
  const real = await orig<typeof import('../../src/lib/exercises')>();
  return {
    ...real,
    createPipeline: (...args: Parameters<typeof real.createPipeline>) => {
      const made = real.createPipeline(...args);
      if (!made.ok) return made;
      const p = made.pipeline;
      return { ok: true as const, pipeline: { ...p, endHold: (t: number) => (answer === undefined ? p.endHold?.(t) : answer) } };
    },
  };
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance', 'Date'] });
  answer = undefined;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const QUAD: PlanExercise = { kind: 'quad-set', sets: 1, reps: 100, source: 'test' };
function press(ms: number) {
  render(<Session exercise={QUAD} side="left" source={mockSource()} sound={audioHarness().sound} onEnd={vi.fn()} />);
  const button = screen.getByRole('button', { name: 'Start hold' });
  fireEvent.click(button);
  act(() => void vi.advanceTimersByTime(ms));
  fireEvent.click(button);
  return button;
}

describe('a hold that the timer does not save', () => {
  it.each([
    ['too-short', 'A hold under 1 second was not saved.'],
    ['too-long', 'A hold over 1 hour was not saved.'],
    ['list-full', 'This session holds 50 holds. This hold was not saved.'],
  ])('shows one polite line for %s, and no hold in the list', (reason, text) => {
    answer = { saved: false, reason };
    const button = press(3000);
    expect(screen.getByText(text).getAttribute('role')).toBe('status');
    expect(screen.getByText('No holds yet.')).toBeInTheDocument();
    fireEvent.click(button);
    expect(screen.queryByText(text)).toBeNull();
  });

  it('shows no line for a saved hold', () => {
    answer = { saved: true, reason: 'ok' };
    press(3000);
    expect(screen.queryByText(/was not saved/)).toBeNull();
  });

  it('keeps the old shape working: a press under 1 s is explained with no return value', () => {
    press(400);
    expect(screen.getByText('A hold under 1 second was not saved.')).toBeInTheDocument();
  });
});
