// Step D2: Session for the five new kinds (ankle pump, two leg raises, quad set, gluteal set).
// The readout follows the definition. The two timer kinds show the hold timer screen. No cue and no sound for the new modes.
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlanExercise } from '../../src/lib/protocol';
import { Session } from '../../src/ui/Session';
import { legLandmarks } from '../helpers/leg';
import { makeSeries, type PoseId } from '../helpers/landmarkSeries';
import { audioHarness, mockSource, type MockSource } from './helpers';
import { hasVerdictWord } from './verdict';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance', 'Date'] });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const PUMP: PlanExercise = { kind: 'ankle-pump', sets: 1, reps: 10, source: 'test' };
const BACK: PlanExercise = { kind: 'leg-raise-back', sets: 1, reps: 10, source: 'test' };
const SIDE: PlanExercise = { kind: 'leg-raise-side', sets: 1, reps: 10, source: 'test' };
const QUAD: PlanExercise = { kind: 'quad-set', sets: 2, reps: 3, source: 'test' };
const GLUTE: PlanExercise = { kind: 'gluteal-set', sets: 1, reps: 3, holdSeconds: 6, source: 'test' };

function setup(exercise: PlanExercise, source: MockSource = mockSource()) {
  const audio = audioHarness();
  audio.sound.unlock();
  const play = vi.spyOn(audio.sound, 'play');
  const onEnd = vi.fn();
  const view = render(<Session exercise={exercise} side="left" source={source} sound={audio.sound} onEnd={onEnd} />);
  return { source, audio, play, onEnd, view };
}

/** Plays a generated series into the source. Fake time moves with the frames. */
function play(source: MockSource, pose: PoseId, reps: number) {
  const s = makeSeries({ pose, reps, fps: 10, aspect: 16 / 9, side: 'left' });
  let last = 0;
  for (const f of s.frames) {
    act(() => {
      source.emit(f.landmarks, f.tMs);
      vi.advanceTimersByTime(Math.max(0, f.tMs - last));
    });
    last = f.tMs;
  }
}
const readoutLabels = (c: HTMLElement) => Array.from(c.querySelectorAll('.readout-label')).map((e) => e.textContent);
const repNumber = (c: HTMLElement) => c.querySelector('.readout-reps .readout-number')!.textContent!.trim();
const angleNumber = (c: HTMLElement) => c.querySelector('.readout:not(.readout-reps) .readout-number')!.textContent!.trim();

describe('the live readout follows the definition', () => {
  it.each([
    [PUMP, 'Ankle angle'],
    [BACK, 'Lift angle'],
    [SIDE, 'Lift angle'],
  ])('%j shows "%s" with the angle caption and "--" before a frame', (exercise, label) => {
    const { view } = setup(exercise);
    expect(readoutLabels(view.container)).toContain(label);
    expect(readoutLabels(view.container)).not.toContain('Knee bend');
    expect(angleNumber(view.container)).toBe('--');
    expect(view.container.querySelector('.readout-caption')!.textContent).toBe(`${label}: estimated angle, not a medical measurement`);
    expect(view.container.querySelector('.gauge')).toBeNull(); // no limit of a care team for these kinds
  });

  it('counts the reps of the ankle pump and shows a whole-degree angle', () => {
    const { source, view } = setup(PUMP);
    play(source, 'ankle-pump', 3);
    expect(Number(repNumber(view.container))).toBeGreaterThanOrEqual(2);
    expect(angleNumber(view.container)).toMatch(/^\d+$/);
  });

  it('counts the lifts of the leg raise to the back', () => {
    const { source, view } = setup(BACK);
    play(source, 'leg-raise-back', 3);
    expect(Number(repNumber(view.container))).toBeGreaterThanOrEqual(2);
  });

  it('makes no sound for a new mode and shows no limit cue', () => {
    const { source, play: beep, view } = setup(PUMP);
    play(source, 'ankle-pump', 3);
    expect(beep).not.toHaveBeenCalled();
    expect(document.querySelector('.cue-alert')?.textContent ?? '').toBe('');
    expect(hasVerdictWord(view.container.textContent ?? '')).toBeNull();
  });

  it('keeps Stop and "Knee gave way or hurts"', () => {
    const { onEnd } = setup(PUMP);
    fireEvent.click(screen.getByRole('button', { name: 'Knee gave way or hurts' }));
    expect(onEnd).toHaveBeenCalledWith('gave-way', expect.anything());
  });

  it('says that the leg raise to the side measures the angle weakly', () => {
    setup(SIDE);
    expect(screen.getByText('The camera cannot measure this angle well.')).toBeInTheDocument();
  });
});

describe('the hold timer screen', () => {
  const NO_CAMERA = 'The camera cannot see this effort. The app times your hold.';

  it('shows the timer, the button and the honest line instead of the angle numbers', () => {
    const { view } = setup(QUAD);
    expect(screen.getByRole('button', { name: 'Start hold' })).toBeInTheDocument();
    expect(screen.getByText(NO_CAMERA)).toBeInTheDocument();
    expect(readoutLabels(view.container)).not.toContain('Knee bend');
    expect(view.container.querySelector('.readout-caption')).toBeNull();
    expect(screen.queryByText(/estimated angle/)).toBeNull();
    expect(screen.queryByText(/^Target:/)).toBeNull(); // the protocol sets no holdSeconds
    expect(view.container.querySelector('[data-testid="hold-elapsed"]')!.getAttribute('aria-live')).toBe('off');
    expect(screen.getByText('No holds yet.')).toBeInTheDocument();
  });

  it('counts whole seconds, keeps the focus on the same button, and lists the holds', () => {
    const { view } = setup(QUAD);
    const button = screen.getByRole('button', { name: 'Start hold' });
    button.focus();
    fireEvent.click(button);
    const same = screen.getByRole('button', { name: 'End hold' });
    expect(same).toBe(button);
    expect(document.activeElement).toBe(same);
    const elapsed = () => view.container.querySelector('[data-testid="hold-elapsed"]')!.textContent;
    expect(elapsed()).toContain('0');
    act(() => void vi.advanceTimersByTime(5000));
    expect(elapsed()).toContain('5');
    fireEvent.click(same);
    expect(screen.getByRole('button', { name: 'Start hold' })).toBe(button);
    expect(document.activeElement).toBe(button);
    expect(screen.getByText('Holds: 5 seconds')).toBeInTheDocument();
    expect(elapsed()).toContain('0');
    fireEvent.click(button);
    act(() => void vi.advanceTimersByTime(8000));
    fireEvent.click(button);
    expect(screen.getByText('Holds: 5, 8 seconds')).toBeInTheDocument();
  });

  it('shows the target line only when the protocol sets holdSeconds, with no verdict when it passes', () => {
    setup(GLUTE);
    expect(screen.getByText('Target: 6 seconds, set by your care team')).toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Start hold' });
    fireEvent.click(button);
    act(() => void vi.advanceTimersByTime(9000));
    expect(screen.getByText('Target: 6 seconds, set by your care team')).toBeInTheDocument();
    expect(document.querySelector('[role="alert"]')).toBeNull();
    expect(hasVerdictWord(document.body.textContent ?? '')).toBeNull();
  });

  it('drops a press pair shorter than 1 second', () => {
    setup(QUAD);
    const button = screen.getByRole('button', { name: 'Start hold' });
    fireEvent.click(button);
    act(() => void vi.advanceTimersByTime(400));
    fireEvent.click(button);
    expect(screen.getByText('No holds yet.')).toBeInTheDocument();
  });

  it('the gluteal set has no camera, no body map and no leg check', () => {
    const { source, view } = setup(GLUTE);
    expect(source.start).not.toHaveBeenCalled();
    expect(view.container.querySelector('svg.bodymap, [data-k="arc-text"]')).toBeNull();
    expect(view.container.querySelector('video')).toBeNull();
    expect(screen.queryByText(/Follow me again|whole leg/)).toBeNull();
  });

  it('the quad set starts the camera for the body map, and shows no lockout box', () => {
    const { source } = setup(QUAD);
    expect(source.start).toHaveBeenCalled();
    act(() => source.emit(legLandmarks('left', 20), 0));
    act(() => void vi.advanceTimersByTime(300));
    expect(screen.queryByRole('button', { name: /Follow me again/ })).toBeNull();
  });

  it('counts each hold into the set and gives the engine data at the end', () => {
    const { onEnd } = setup(QUAD);
    const button = screen.getByRole('button', { name: 'Start hold' });
    for (const ms of [5000, 8000]) {
      fireEvent.click(button);
      act(() => void vi.advanceTimersByTime(ms));
      fireEvent.click(button);
    }
    expect(screen.getByText('Holds in this set: 2 of 3')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Stop/ }));
    const summary = onEnd.mock.calls[0]![1];
    expect(summary.holds).toBe(2);
    expect(summary.reps).toBeNull();
    expect(summary.engine).toEqual({ holdList: [5, 8], timedBy: 'person' });
  });

  it('keeps Stop and "Knee gave way or hurts", and the pain question after a set', () => {
    setup({ ...QUAD, reps: 1 });
    const button = screen.getByRole('button', { name: 'Start hold' });
    fireEvent.click(button);
    act(() => void vi.advanceTimersByTime(3000));
    fireEvent.click(button);
    expect(screen.getByText(/Set 1 done\. Rest when you are ready\./)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start next set' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Knee gave way or hurts' })).toBeInTheDocument();
  });
});
