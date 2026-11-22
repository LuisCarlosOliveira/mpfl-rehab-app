import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Session } from '../../src/ui/Session';
import { HEEL_SLIDE, audioHarness, mockSource } from './helpers';

vi.mock('../../src/lib/exercises', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../src/lib/exercises')>();
  return {
    ...real,
    createPipeline: (...args: Parameters<typeof real.createPipeline>) => {
      const made = real.createPipeline(...args);
      if (!made.ok) return made;
      return {
        ...made,
        pipeline: {
          ...made.pipeline,
          summary: () => {
            throw new Error('summary broke');
          },
        },
      };
    },
  };
});

afterEach(cleanup);

describe('Session: a pipeline that throws at the end', () => {
  it('Stop still calls onEnd once, with an empty summary', () => {
    const onEnd = vi.fn();
    render(<Session exercise={HEEL_SLIDE} side="left" baselineDeg={0} source={mockSource()} sound={audioHarness().sound} onEnd={onEnd} />);
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(onEnd.mock.calls[0]![0]).toBe('stop');
    expect(onEnd.mock.calls[0]![1]).toMatchObject({ reps: 0 });
  });
});
