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

function setup(exercise: PlanExercise, source: MockSource = mockSource(), cameraSide?: 'left' | 'right') {
  const audio = audioHarness();
  audio.sound.unlock();
  const play = vi.spyOn(audio.sound, 'play');
  const onEnd = vi.fn();
  const view = render(<Session exercise={exercise} side="left" cameraSide={cameraSide} source={source} sound={audio.sound} onEnd={onEnd} />);
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
const readoutLabels = (c: HTMLElement) => Array.from(c.querySelectorAll('.v3-metric-label')).map((e) => e.textContent);
const repNumber = (c: HTMLElement) => c.querySelector('.live-reps .v3-num b')!.textContent!.trim();
const angleNumber = (c: HTMLElement) => c.querySelector('.live-angle .v3-num b')!.textContent!.trim();

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
    expect(Number(repNumber(view.container))).toBe(3);
  });

  it('draws no angle number on the knee arc of the map for a leg raise, and keeps it in the readout', () => {
    // The back lift counts a direction, so it needs the facing: the camera side gives it when the foot does not.
    const { source, view } = setup(BACK, mockSource(), 'left');
    const arc = view.container.querySelector('[data-k="arc-text"]')!;
    let drawn = 0;
    for (let i = 0; i < 40; i++) {
      act(() => {
        source.emit(legLandmarks('left', 20, { thighAngle: Math.PI / 2 + 0.5 }), i * 33);
        vi.advanceTimersByTime(33);
      });
      if (arc.getAttribute('display') !== 'none') drawn += 1;
    }
    act(() => void vi.advanceTimersByTime(300));
    expect(angleNumber(view.container)).toMatch(/^\d+$/);
    expect(drawn).toBe(0);
  });

  it('says what the ankle pump counts, from the definition, and says it for the ankle pump only', () => {
    setup(PUMP);
    expect(screen.getByText('The camera counts pumps of 30 degrees or more.')).toBeInTheDocument();
    cleanup();
    setup(BACK);
    expect(screen.queryByText(/The camera counts pumps/)).toBeNull();
  });

  it.each([
    [PUMP, 'ankle-pump'],
    [BACK, 'leg-raise-back'],
    [SIDE, 'leg-raise-side'],
    [QUAD, 'quad-set'],
  ] as const)('makes no sound for a new mode and shows no limit cue: %j', (exercise, pose) => {
    const { source, play: beep, view } = setup(exercise);
    play(source, pose, 3);
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

  it('drops a press pair shorter than 1 second, and says so in one polite line that clears at the next start', () => {
    setup(QUAD);
    const button = screen.getByRole('button', { name: 'Start hold' });
    fireEvent.click(button);
    act(() => void vi.advanceTimersByTime(400));
    fireEvent.click(button);
    expect(screen.getByText('No holds yet.')).toBeInTheDocument();
    expect(screen.getByText('A hold under 1 second was not saved.').getAttribute('role')).toBe('status');
    fireEvent.click(button);
    expect(screen.queryByText('A hold under 1 second was not saved.')).toBeNull();
  });

  it('gives the holds paragraph a polite live region', () => {
    setup(QUAD);
    expect(screen.getByText('No holds yet.').getAttribute('role')).toBe('status');
    const button = screen.getByRole('button', { name: 'Start hold' });
    fireEvent.click(button);
    act(() => void vi.advanceTimersByTime(5000));
    fireEvent.click(button);
    expect(screen.getByText('Holds: 5 seconds').getAttribute('role')).toBe('status');
    expect(document.querySelector('[data-testid="hold-elapsed"]')!.getAttribute('aria-live')).toBe('off');
  });

  it('shows the rounded seconds, as the record stores them: 5.6 s reads 6', () => {
    const { view } = setup(QUAD);
    const button = screen.getByRole('button', { name: 'Start hold' });
    fireEvent.click(button);
    act(() => void vi.advanceTimersByTime(5600));
    expect(view.container.querySelector('[data-testid="hold-elapsed"]')!.textContent).toContain('6');
    fireEvent.click(button);
    expect(screen.getByText('Holds: 6 seconds')).toBeInTheDocument();
  });

  it('ends an open hold when Stop is pressed, and saves it', () => {
    const { onEnd } = setup(QUAD);
    fireEvent.click(screen.getByRole('button', { name: 'Start hold' }));
    act(() => void vi.advanceTimersByTime(5000));
    fireEvent.click(screen.getByRole('button', { name: /Stop/ }));
    const summary = onEnd.mock.calls[0]![1];
    expect(summary.engine.holdList).toEqual([5]);
    expect(summary.holds).toBe(1);
  });

  it('ends an open hold when "Knee gave way or hurts" is pressed, and saves it', () => {
    const { onEnd } = setup(QUAD);
    fireEvent.click(screen.getByRole('button', { name: 'Start hold' }));
    act(() => void vi.advanceTimersByTime(5000));
    fireEvent.click(screen.getByRole('button', { name: 'Knee gave way or hurts' }));
    expect(onEnd).toHaveBeenCalledWith('gave-way', expect.objectContaining({ engine: expect.objectContaining({ holdList: [5] }) }));
  });

  it.each([[QUAD], [GLUTE]])('%j: no camera starts, no picture, no body map, no camera copy', (exercise) => {
    const { source, view } = setup(exercise);
    expect(source.start).not.toHaveBeenCalled();
    expect(view.container.querySelector('video')).toBeNull();
    expect(view.container.querySelector('svg.body-map')).toBeNull();
    expect(screen.queryByText('Hide body map')).toBeNull();
    expect(screen.queryByText(/Follow me again|whole leg/)).toBeNull();
    expect(screen.queryByText(/Asking for the camera|Try the camera again|No camera image/)).toBeNull();
    expect(screen.getByText('The camera cannot see this effort. The app times your hold.')).toBeInTheDocument();
    // The timer works, and the source stays unused through a hold, a stop and an unmount.
    const button = screen.getByRole('button', { name: 'Start hold' });
    fireEvent.click(button);
    act(() => void vi.advanceTimersByTime(4000));
    fireEvent.click(button);
    expect(screen.getByText('Holds: 4 seconds')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Stop/ }));
    expect(source.start).not.toHaveBeenCalled();
  });

  it.each([[QUAD], [GLUTE]])('%j: Stop and "Knee gave way or hurts" save an open hold with no camera', (exercise) => {
    for (const [name, reason] of [[/Stop/, 'stop'], ['Knee gave way or hurts', 'gave-way']] as const) {
      const { source, onEnd, view } = setup(exercise);
      fireEvent.click(screen.getByRole('button', { name: 'Start hold' }));
      act(() => void vi.advanceTimersByTime(5000));
      fireEvent.click(screen.getByRole('button', { name }));
      expect(onEnd).toHaveBeenCalledWith(reason, expect.objectContaining({ holds: 1, engine: expect.objectContaining({ holdList: [5] }) }));
      expect(source.start).not.toHaveBeenCalled();
      view.unmount();
    }
  });

  it.each([[QUAD], [GLUTE]])('%j: no mute button, because the timer makes no sound, and the timer card is in the solo layout', (exercise) => {
    const { view } = setup(exercise);
    expect(screen.queryByRole('button', { name: /mute sound/i })).toBeNull();
    // v3: a timer has no camera slot, so the panel is the only column of LiveShell.
    expect(view.container.querySelector('.v3-cam')).toBeNull();
    expect(view.container.querySelector('.v3-live > .v3-live-panel .hold-timer')).not.toBeNull();
    // The button is the first control of the card, before the set text and the list.
    const card = view.container.querySelector('.hold-timer')!;
    expect(card.querySelector('.hold-button')).not.toBeNull();
    expect(card.querySelector('.hold-button')!.compareDocumentPosition(card.querySelector('.hold-notes')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('a camera kind keeps its mute button and has no timer layout class', () => {
    const { view } = setup(PUMP);
    expect(screen.getByRole('button', { name: 'Mute sound' })).toBeInTheDocument();
    expect(view.container.querySelector('.session-timer')).toBeNull();
  });

  it.each([[PUMP], [BACK], [SIDE]])('%j: the camera kinds still start the camera and show the picture', (exercise) => {
    const { source, view } = setup(exercise);
    expect(source.start).toHaveBeenCalledTimes(1);
    expect(view.container.querySelector('video')).not.toBeNull();
    expect(screen.getByText('Hide body map')).toBeInTheDocument();
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
