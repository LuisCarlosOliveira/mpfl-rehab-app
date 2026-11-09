import { Profiler } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Setup } from '../../src/ui/Setup';
import { audioHarness, mockSource, readyLeg } from './helpers';

afterEach(cleanup);

describe('Setup frame loop', () => {
  it('commits to React only when the screen changes, not for each frame', async () => {
    const source = mockSource();
    let commits = 0;
    render(
      <Profiler id="setup" onRender={() => (commits += 1)}>
        <Setup
          kind="heel-slide"
          side="left"
          exerciseName="Heel slide"
          source={source}
          sound={audioHarness().sound}
          onReady={vi.fn()}
          onCancel={vi.fn()}
        />
      </Profiler>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Next: set up the camera' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start camera' }));
    await screen.findByRole('button', { name: 'Start exercise' });
    act(() => source.emit(readyLeg(), 0)); // the first frame sets the first text
    const before = commits;
    for (let i = 1; i <= 100; i++) act(() => source.emit(readyLeg(), i)); // 100 frames in 100 ms of frame time
    expect(commits - before).toBeLessThanOrEqual(5);
  });
});
