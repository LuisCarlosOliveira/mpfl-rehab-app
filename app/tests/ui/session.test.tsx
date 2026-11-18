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
  const view = render(<Session exercise={exercise} side="left" baselineDeg={0} source={source} sound={audio.sound} onEnd={onEnd} />);
  return { source, onEnd, audio, ...view };
}

/** Rest, then a slow rise above the limit of 90 degrees plus the margin. Returns the next time. */
function riseAboveLimit(source: MockSource): number {
  let t = 0;
  for (let i = 0; i < 10; i++, t += 100) act(() => source.emit(legLandmarks('left', 0), t));
  for (let i = 1; i <= 12; i++, t += 100) act(() => source.emit(legLandmarks('left', 10 * i), t));
  return t;
}

const polite = () => document.querySelector('[role="status"][aria-live="polite"]')!;
const alertRegion = () => document.querySelector('.cue-alert')!;

describe('Session screen', () => {
  it('shows the angle label and the unit next to the number', () => {
    const { source } = setup();
    expect(screen.getByText(/estimated angle, not a medical measurement/)).toBeInTheDocument();
    // v3: a number that is not read yet shows "--" and no unit, so a blank is not read as zero. The unit shows with the first angle.
    expect(screen.queryByText('degrees')).toBeNull();
    expect(screen.getByText(/^reps?$/)).toBeInTheDocument();
    for (let i = 0; i < 5; i++) act(() => source.emit(legLandmarks('left', 30), i * 33));
    act(() => void vi.advanceTimersByTime(300));
    expect(screen.getByText(/^degrees?$/)).toBeInTheDocument();
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
    expect(screen.getByText(/^reps?$/)).toBeInTheDocument();
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

  it('keeps the over-limit text while the knee stays above the limit, then follows the timeout', () => {
    const { source } = setup();
    let t = riseAboveLimit(source);
    // The knee stays above the limit plus the margin for 8 seconds. This is longer than the cue timeout.
    for (let i = 0; i < 80; i++) {
      act(() => source.emit(legLandmarks('left', 120), t));
      t += 100;
      tick(100);
    }
    expect(alertRegion()).toHaveTextContent('Stop at your limit, do not push.');
    // The knee returns below the limit. The text follows the normal timeout.
    for (let i = 0; i < 10; i++) {
      act(() => source.emit(legLandmarks('left', 20), t));
      t += 100;
    }
    tick(1000);
    expect(alertRegion()).toHaveTextContent('Stop at your limit, do not push.');
    tick(5000);
    expect(alertRegion()).toBeEmptyDOMElement();
  });

  it('makes the over-limit sound again once after 5 seconds while the knee stays above the limit (M5)', () => {
    const { source, audio } = setup();
    audio.sound.unlock();
    let t = riseAboveLimit(source);
    const after = audio.oscillators.length;
    for (let i = 0; i < 80; i++) {
      act(() => source.emit(legLandmarks('left', 120), t));
      t += 100;
      tick(100);
    }
    expect(audio.oscillators.length).toBe(after + 1); // 8 s: the first beep, then one repeat at 5 s
  });

  it('a missing leg shows "Show your whole leg." and shows it no more after the leg was seen for 500 ms (B2-04)', () => {
    const { source } = setup();
    act(() => source.emit(legLandmarks('left', 20), 0));
    act(() => source.emit(null, 30));
    tick(600); // the cue waits 500 ms (B-06)
    act(() => source.emit(null, 630));
    tick();
    expect(polite()).toHaveTextContent('Show your whole leg.');
    expect(screen.getByText('--')).toBeInTheDocument();
    act(() => source.emit(legLandmarks('left', 20), 700));
    tick();
    expect(polite()).toHaveTextContent('Show your whole leg.'); // seen for less than 500 ms: the cue stays
    for (let t = 733; t < 1500; t += 33) act(() => source.emit(legLandmarks('left', 20), t));
    tick(600);
    act(() => source.emit(legLandmarks('left', 20), 1600));
    tick();
    expect(polite()).toBeEmptyDOMElement();
  });

  it('updates React state at most 4 times each second', () => {
    const source = mockSource();
    let commits = 0;
    render(
      <Profiler id="session" onRender={() => (commits += 1)}>
        <Session exercise={HEEL_SLIDE} side="left" baselineDeg={0} source={source} sound={audioHarness().sound} onEnd={vi.fn()} />
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
    expect(document.querySelector('.notice[role="alert"]')).toHaveTextContent('The camera could not start. Test text.'); // a title and one sentence since V2 (A6)
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

  // C-prime: a neutral fact after a lift, only when the angle is more than the camera error. No colour, no verdict word.
  const liftWith = (flexion: number) => {
    const { source } = setup({ kind: 'straight-leg-raise', source: 'test' });
    const lift = () => legLandmarks('left', flexion, { thighAngle: -Math.PI / 2 + 0.15, hip: { x: 0.5, y: 0.6 } });
    for (let t = 0; t < 1500; t += 30) act(() => source.emit(lift(), t));
    tick();
  };

  // U2: the live screen shows the angle at the top and its label only. The longer text reads as a comparison after every rep.
  it('shows only the angle at the top and its label, with no sentence about the sources or the camera error', () => {
    liftWith(20);
    expect(screen.getByText(/Estimated angle at the top: \d+ degrees? \(estimated angle, not a medical measurement\)/)).toBeInTheDocument();
    expect(screen.queryByText(/The sources describe a straight knee/)).toBeNull();
    expect(screen.queryByText(/The camera error is about/)).toBeNull();
  });

  it('adds nothing under the top angle when the angle is inside the camera error', () => {
    liftWith(4);
    expect(screen.getByText(/Estimated angle at the top: \d+ degrees?/)).toBeInTheDocument();
    expect(screen.queryByText(/The sources describe a straight knee/)).toBeNull();
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
    tick(600); // the cue waits 500 ms (B-06)
    act(() => source.emit(null, 630));
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
    expect(document.querySelector('.notice[role="alert"]')).toHaveTextContent('The camera was stopped.');
    source.nextStart = { ok: true };
    fireEvent.click(screen.getByRole('button', { name: 'Try the camera again' }));
    await act(async () => undefined);
    expect(source.start).toHaveBeenCalledTimes(2);
    expect(document.querySelector('.notice[role="alert"]')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Try the camera again' })).toBeNull();
  });

  it('shows the dead-stream notice as an alert with the same retry button', () => {
    const { source } = setup();
    act(() => source.emit(legLandmarks('left', 20), 0));
    tick(3000);
    const notice = document.querySelector('.notice[role="alert"]')!;
    expect(notice).toHaveTextContent(/no camera image for 2 seconds/i);
    expect(screen.getByRole('button', { name: 'Try the camera again' })).toBeInTheDocument();
  });

  it('keeps the plain waiting text as a status, with no retry button', () => {
    setup();
    expect(document.querySelector('.session-start')).toHaveTextContent('Asking for the camera and loading the pose model.');
    expect(screen.queryByRole('button', { name: 'Try the camera again' })).toBeNull();
  });
});
