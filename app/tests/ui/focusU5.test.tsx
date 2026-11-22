import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { legLandmarks } from '../helpers/leg';
import type { Exercise } from '../../src/lib/protocol';
import { Session } from '../../src/ui/Session';
import { Setup } from '../../src/ui/Setup';
import { LoadingScreen } from '../../src/ui/Shell';
import { audioHarness, mockSource, playRep } from './helpers';

beforeEach(() => vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance', 'Date'] }));
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const TWO_BY_TWO: Exercise = { kind: 'heel-slide', sets: 2, reps: 2, targetFlexion: 60, maxFlexion: 90, returnWithinDeg: 18, source: 'test' };

describe('U5: focus', () => {
  it('the Loading screen focuses its heading', () => {
    render(<LoadingScreen />);
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1, name: 'Loading' }));
  });

  it('Start next set moves the focus to the angle readout, with the page at the top', () => {
    const source = mockSource();
    render(<Session exercise={TWO_BY_TWO} side="left" baselineDeg={0} source={source} sound={audioHarness().sound} onEnd={vi.fn()} />);
    const t = playRep(source, 'left', 60);
    playRep(source, 'left', 60, t);
    act(() => void vi.advanceTimersByTime(300));
    document.documentElement.scrollTop = 92;
    const button = screen.getByRole('button', { name: 'Start next set' });
    button.focus();
    fireEvent.click(button);
    const active = document.activeElement as HTMLElement;
    expect(active).not.toBe(document.body);
    expect(active.classList.contains('v3-num')).toBe(true);
    expect(active.getAttribute('tabindex')).toBe('-1');
    expect(document.documentElement.scrollTop).toBe(0);
  });

  it('a pain answer in the rest panel keeps the focus on the control that the person used', () => {
    const source = mockSource();
    render(<Session exercise={TWO_BY_TWO} side="left" baselineDeg={0} source={source} sound={audioHarness().sound} onEnd={vi.fn()} />);
    const t = playRep(source, 'left', 60);
    playRep(source, 'left', 60, t);
    act(() => void vi.advanceTimersByTime(300));
    const radio = screen.getByRole('radio', { name: '2' });
    radio.focus();
    fireEvent.click(radio);
    expect(document.activeElement).toBe(radio);
  });

  it('Start camera moves the focus to the camera status, and it stays inside the page when the camera runs', async () => {
    const source = mockSource();
    render(<Setup kind="heel-slide" side="left" exerciseName="Heel slide" source={source} sound={audioHarness().sound} onReady={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next: set up the camera' }));
    const start = screen.getByRole('button', { name: 'Start camera' });
    start.focus();
    fireEvent.click(start);
    await act(async () => void (await Promise.resolve()));
    expect(document.activeElement).not.toBe(document.body);
    await screen.findByRole('button', { name: 'Start exercise' });
    await act(async () => void (await Promise.resolve()));
    expect(document.activeElement).not.toBe(document.body);
    expect(document.activeElement?.getAttribute('tabindex')).toBe('-1');
    void legLandmarks;
  });
});
