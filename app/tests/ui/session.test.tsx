import { Profiler } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { legLandmarks } from '../helpers/leg';
import type { Exercise } from '../../src/lib/protocol';
import { Session } from '../../src/ui/Session';
import { HEEL_SLIDE, audioHarness, mockSource, playRep, type MockSource } from './helpers';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance', 'Date'] });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const tick = (ms = 250) => act(() => void vi.advanceTimersByTime(ms));

function setup(exercise: Exercise = HEEL_SLIDE, source: MockSource = mockSource(), audio = audioHarness()) {
  const onEnd = vi.fn();
  const view = render(<Session exercise={exercise} side="left" source={source} sound={audio.sound} onEnd={onEnd} />);
  return { source, onEnd, audio, ...view };
}

const polite = () => document.querySelector('[role="status"][aria-live="polite"]')!;
const alertRegion = () => document.querySelector('[role="alert"]')!;

describe('Session screen', () => {
  it('shows the angle label and the unit next to the number', () => {
    setup();
    expect(screen.getByText(/estimated angle, not a medical measurement/)).toBeInTheDocument();
    expect(screen.getByText('degrees')).toBeInTheDocument();
    expect(screen.getByText('reps')).toBeInTheDocument();
  });

  it('starts the source once with a frame handler', () => {
    const { source } = setup();
    expect(source.start).toHaveBeenCalledTimes(1);
    expect(source.start.mock.calls[0]![0]).toBeTypeOf('function');
  });

  it('always shows a large Stop button and the "knee gave way or hurts" button', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Stop' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Knee gave way or hurts' })).toBeVisible();
  });

  it('Stop ends the session with the reason "stop" and stops the source', () => {
    const { source, onEnd } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(source.stop).toHaveBeenCalled();
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(onEnd.mock.calls[0]![0]).toBe('stop');
    expect(onEnd.mock.calls[0]![1]).toMatchObject({ reps: 0 });
  });

  it('"Knee gave way or hurts" ends the session with its own reason', () => {
    const { source, onEnd } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Knee gave way or hurts' }));
    expect(source.stop).toHaveBeenCalled();
    expect(onEnd.mock.calls[0]![0]).toBe('gave-way');
  });

  it('a second press does not end the session twice', () => {
    const { onEnd } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    fireEvent.click(screen.getByRole('button', { name: 'Knee gave way or hurts' }));
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('calls stop on the source when the screen unmounts', () => {
    const { source, unmount } = setup();
    expect(source.stop).not.toHaveBeenCalled();
    unmount();
    expect(source.stop).toHaveBeenCalled();
  });

  it('shows the live angle and the rep count from the frames', () => {
    const { source } = setup();
    playRep(source, 'left', 60);
    tick();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('reps')).toBeInTheDocument();
  });

  it('an in-range rep shows no message', () => {
    const { source } = setup();
    playRep(source, 'left', 60);
    tick();
    expect(polite()).toBeEmptyDOMElement();
    expect(alertRegion()).toBeEmptyDOMElement();
  });

  it('a rep near the limit shows the cue in the polite live region', () => {
    const { source } = setup();
    playRep(source, 'left', 85);
    tick();
    expect(polite()).toHaveTextContent('Close to your limit, stop.');
    expect(alertRegion()).toBeEmptyDOMElement();
  });

  it('a rep above the limit shows its cue in the alert region', () => {
    const { source } = setup();
    playRep(source, 'left', 120);
    tick();
    expect(alertRegion()).toHaveTextContent('Stop at your limit, do not push.');
  });

  it('the cue text goes away after a few seconds', () => {
    const { source } = setup();
    playRep(source, 'left', 85);
    tick();
    expect(polite()).not.toBeEmptyDOMElement();
    tick(5000);
    expect(polite()).toBeEmptyDOMElement();
  });

  it('a missing leg shows "Show your whole leg." and shows it no more when the leg returns', () => {
    const { source } = setup();
    act(() => source.emit(legLandmarks('left', 20), 0));
    act(() => source.emit(null, 30));
    tick();
    expect(polite()).toHaveTextContent('Show your whole leg.');
    expect(screen.getByText('--')).toBeInTheDocument();
    act(() => source.emit(legLandmarks('left', 20), 60));
    tick();
    expect(polite()).toBeEmptyDOMElement();
  });

  it('updates React state at most 4 times each second', () => {
    const source = mockSource();
    let commits = 0;
    render(
      <Profiler id="session" onRender={() => (commits += 1)}>
        <Session exercise={HEEL_SLIDE} side="left" source={source} sound={audioHarness().sound} onEnd={vi.fn()} />
      </Profiler>,
    );
    tick(); // the first frame state
    const before = commits;
    for (let i = 0; i < 100; i++) {
      act(() => source.emit(legLandmarks('left', 10 + i), i * 10)); // 100 frames in 1 second of frame time
      act(() => void vi.advanceTimersByTime(10));
    }
    expect(commits - before).toBeLessThanOrEqual(4);
  });

  it('shows a notice when the frames stop', () => {
    const { source } = setup();
    act(() => source.emit(legLandmarks('left', 20), 0));
    tick();
    expect(screen.queryByText(/no camera image/i)).toBeNull();
    tick(3000);
    expect(screen.getByText(/no camera image for 2 seconds/i)).toBeInTheDocument();
    expect(screen.getByText('--')).toBeInTheDocument();
  });

  it('shows the camera error text when the source cannot start, with the buttons still there', async () => {
    const source = mockSource();
    source.nextStart = { ok: false, error: { kind: 'other', message: 'The camera could not start. Test text.' } };
    setup(HEEL_SLIDE, source);
    await act(async () => void (await Promise.resolve()));
    expect(screen.getByText('The camera could not start. Test text.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Stop' })).toBeVisible();
  });

  it('shows "Ask your surgeon" and does not start the source when the target is missing', () => {
    const noTarget: Exercise = { kind: 'heel-slide', source: 'test' };
    const { source, onEnd } = setup(noTarget);
    expect(screen.getByText(/ask your surgeon/i)).toBeInTheDocument();
    expect(source.start).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(onEnd.mock.calls[0]![0]).toBe('stop');
  });

  it('shows the estimated angle at the top for a straight leg raise, with the label', () => {
    const slr: Exercise = { kind: 'straight-leg-raise', source: 'test' };
    const { source } = setup(slr);
    // The ankle is above the hip: the leg is raised. The knee stays nearly straight.
    const lift = () => legLandmarks('left', 8, { thighAngle: -Math.PI / 2 + 0.15, hip: { x: 0.5, y: 0.6 } });
    for (let t = 0; t < 1500; t += 30) act(() => source.emit(lift(), t));
    tick();
    expect(screen.getByText(/Estimated angle at the top: \d+ degrees \(estimated angle, not a medical measurement\)\./)).toBeInTheDocument();
  });
});

describe('Session sound (FR10, FR23)', () => {
  it('plays a low double beep for a rep near the limit', () => {
    const { source, audio } = setup();
    audio.sound.unlock();
    playRep(source, 'left', 85);
    expect(audio.oscillators).toHaveLength(2);
  });

  it('plays one longer beep for a rep above the limit', () => {
    const { source, audio } = setup();
    audio.sound.unlock();
    playRep(source, 'left', 120);
    // The rep passes the near-limit line first (two short beeps), then the over-limit line (one long beep).
    const seconds = (o: (typeof audio.oscillators)[number]) => o.stop.mock.calls[0]![0] - o.start.mock.calls[0]![0];
    const long = audio.oscillators.filter((o) => seconds(o) > 0.3);
    expect(long).toHaveLength(1);
    expect(audio.oscillators.filter((o) => seconds(o) <= 0.3)).toHaveLength(2);
  });

  it('makes no sound for an in-range rep', () => {
    const { source, audio } = setup();
    audio.sound.unlock();
    playRep(source, 'left', 60);
    expect(audio.oscillators).toHaveLength(0);
  });

  it('makes no sound for the paused cue', () => {
    const { source, audio } = setup();
    audio.sound.unlock();
    act(() => source.emit(legLandmarks('left', 20), 0));
    act(() => source.emit(null, 30));
    tick();
    expect(polite()).toHaveTextContent('Show your whole leg.');
    expect(audio.oscillators).toHaveLength(0);
  });

  it('makes no sound before a press has unlocked it', () => {
    const { source, audio } = setup();
    playRep(source, 'left', 120);
    expect(audio.factory).not.toHaveBeenCalled();
    expect(audio.oscillators).toHaveLength(0);
  });

  it('has a mute button that stops the sound and can start it again', () => {
    const { source, audio } = setup();
    audio.sound.unlock();
    fireEvent.click(screen.getByRole('button', { name: 'Mute sound' }));
    expect(screen.getByRole('button', { name: 'Unmute sound' })).toBeInTheDocument();
    const t = playRep(source, 'left', 85);
    expect(audio.oscillators).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Unmute sound' }));
    playRep(source, 'left', 85, t);
    expect(audio.oscillators).toHaveLength(2);
  });

  it('keeps the mute state when the screen opens again, and writes it to no storage', () => {
    localStorage.clear();
    const first = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Mute sound' }));
    first.unmount();
    setup(HEEL_SLIDE, mockSource(), first.audio);
    expect(screen.getByRole('button', { name: 'Unmute sound' })).toBeInTheDocument();
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });
});

describe('Session camera loss', () => {
  it('shows a start error as an alert with a retry button that starts the source again', async () => {
    const source = mockSource();
    source.nextStart = { ok: false, error: { kind: 'other', message: 'The camera was stopped.' } };
    setup(HEEL_SLIDE, source);
    await act(async () => undefined);
    expect(document.querySelector('.attention[role="alert"]')).toHaveTextContent('The camera was stopped.');
    source.nextStart = { ok: true };
    fireEvent.click(screen.getByRole('button', { name: 'Try the camera again' }));
    await act(async () => undefined);
    expect(source.start).toHaveBeenCalledTimes(2);
    expect(document.querySelector('.attention[role="alert"]')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Try the camera again' })).toBeNull();
  });

  it('shows the dead-stream notice as an alert with the same retry button', () => {
    const { source } = setup();
    act(() => source.emit(legLandmarks('left', 20), 0));
    tick(3000);
    const notice = document.querySelector('.attention[role="alert"]')!;
    expect(notice).toHaveTextContent(/no camera image for 2 seconds/i);
    expect(screen.getByRole('button', { name: 'Try the camera again' })).toBeInTheDocument();
  });

  it('keeps the plain waiting text as a status, with no retry button', () => {
    setup();
    expect(document.querySelector('.attention[role="status"]')).toHaveTextContent('Waiting for the camera.');
    expect(screen.queryByRole('button', { name: 'Try the camera again' })).toBeNull();
  });
});
