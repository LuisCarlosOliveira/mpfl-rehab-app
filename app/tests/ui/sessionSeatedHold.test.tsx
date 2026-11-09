// Seated hold on the Session screen (build C): the angle notice, the arc-end stop and the near-limit cue.
// The cue order and the rate limit (ENGINEERING values) are tested here on the screen and in tests/cueGate.test.ts.
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { legLandmarks } from '../helpers/leg';
import type { Exercise } from '../../src/lib/protocol';
import { Session } from '../../src/ui/Session';
import { ASK_HOLD_ANGLE_TEXT } from '../../src/ui/askSurgeon';
import { audioHarness, mockSource, type MockSource } from './helpers';
import { hasVerdictWord } from './verdict';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance', 'Date'] });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const HOLD: Exercise = { kind: 'seated-extension-hold', sets: 2, reps: 2, holdSeconds: 5, minFlexion: 40, targetFlexion: 60, source: 'test' };

function setup(exercise: Exercise, source: MockSource = mockSource()) {
  const audio = audioHarness();
  audio.sound.unlock();
  const onEnd = vi.fn();
  render(<Session exercise={exercise} side="left" baselineDeg={0} source={source} sound={audio.sound} onEnd={onEnd} />);
  return { source, audio, onEnd };
}

/** The filter and the 16:9 frame change the drawn angle: input 10 reads about 17 degrees, 20 reads 33, 40 reads 56, 80 reads 84. */
/** Frames of one flexion every 33 ms. Fake time moves with the frames. Returns the next frame time. */
function feed(source: MockSource, flexion: number, ms: number, t0: number): number {
  let t = t0;
  for (; t < t0 + ms; t += 33) {
    act(() => {
      source.emit(legLandmarks('left', flexion), t);
      vi.advanceTimersByTime(33);
    });
  }
  return t;
}

const alertText = () => document.querySelector('[role="alert"]')?.textContent ?? '';
const politeText = () => document.querySelector('p[role="status"][aria-live="polite"].cue')?.textContent ?? '';

describe('hold with no angle', () => {
  it.each([
    ['minFlexion', { ...HOLD, minFlexion: undefined }],
    ['targetFlexion', { ...HOLD, targetFlexion: undefined }],
  ])('shows the hold angle notice when %s is missing, and starts no source', (_name, exercise) => {
    const { source } = setup(exercise as Exercise);
    expect(screen.getByText(new RegExp(ASK_HOLD_ANGLE_TEXT.replace('.', '\\.')))).toBeInTheDocument();
    expect(screen.queryByText(/The target for this exercise is missing/)).toBeNull();
    expect(source.start).not.toHaveBeenCalled();
  });

  it('keeps the generic notice for a missing hold time and for a heel slide with no target', () => {
    setup({ ...HOLD, holdSeconds: undefined });
    expect(screen.getByText(/The target for this exercise is missing\. Ask your surgeon\./)).toBeInTheDocument();
    cleanup();
    setup({ kind: 'heel-slide', source: 'test' });
    expect(screen.getByText(/The target for this exercise is missing\. Ask your surgeon\./)).toBeInTheDocument();
  });
});

describe('arc end of the seated hold', () => {
  it('shows the stop cue as an alert, with one beep, when the knee is straighter than minFlexion minus the margin', () => {
    const { source, audio } = setup(HOLD);
    feed(source, 10, 1000, 0);
    expect(alertText()).toBe('Stop at your limit, do not push.');
    expect(politeText()).toBe('');
    expect(audio.oscillators).toHaveLength(1);
  });

  it('keeps the alert while the knee stays past the arc end, longer than the 4 s display time', () => {
    const { source, audio } = setup(HOLD);
    const t = feed(source, 10, 1000, 0);
    feed(source, 10, 8000, t);
    expect(alertText()).toBe('Stop at your limit, do not push.');
    expect(audio.oscillators).toHaveLength(2); // the first beep, then one repeat after 5 s (M5)
  });

  it('removes the alert 4 s after the knee is back inside the arc', () => {
    const { source } = setup(HOLD);
    let t = feed(source, 10, 1000, 0);
    t = feed(source, 50, 2000, t);
    expect(alertText()).not.toBe('');
    feed(source, 50, 3000, t);
    expect(alertText()).toBe('');
  });

  it('shows the near-limit cue as a polite status, with the two-tone beep', () => {
    const { source, audio } = setup(HOLD);
    feed(source, 20, 500, 0);
    expect(politeText()).toBe('Close to your limit, stop.');
    expect(alertText()).toBe('');
    expect(audio.oscillators).toHaveLength(2);
  });

  it('shows no cue and no beep for a hold inside the arc', () => {
    const { source, audio } = setup(HOLD);
    feed(source, 40, 3000, 0);
    expect(politeText()).toBe('');
    expect(alertText()).toBe('');
    expect(audio.oscillators).toHaveLength(0);
  });

  it('shows no arc end alert when minFlexion is 0', () => {
    const { source } = setup({ ...HOLD, minFlexion: 0 });
    feed(source, 5, 1500, 0);
    expect(alertText()).toBe('');
  });
});

describe('cue order and rate limit', () => {
  it('shows the stop alert at once after a hold cue, with no delay', () => {
    const { source } = setup(HOLD);
    let t = feed(source, 50, 600, 0);
    t = feed(source, 80, 200, t); // the knee leaves the hold angle: the restart cue
    expect(politeText()).toBe('The knee left the hold angle. The hold timer starts again.');
    feed(source, 10, 200, t); // past the arc end
    expect(alertText()).toBe('Stop at your limit, do not push.');
  });

  it('does not repeat the same cue text within 10 s, so a restart storm shows one text', () => {
    const { source } = setup(HOLD);
    let t = feed(source, 50, 600, 0);
    t = feed(source, 80, 200, t);
    expect(politeText()).not.toBe('');
    t = feed(source, 80, 4500, t); // the text leaves the screen after 4 s
    expect(politeText()).toBe('');
    t = feed(source, 50, 1500, t);
    feed(source, 80, 300, t); // the same event again, about 6 s after the first
    expect(politeText()).toBe('');
  });

  it('shows the same cue text again after 10 s', () => {
    const { source } = setup(HOLD);
    let t = feed(source, 50, 600, 0);
    t = feed(source, 80, 200, t);
    t = feed(source, 80, 10500, t);
    t = feed(source, 50, 1500, t);
    feed(source, 80, 300, t);
    expect(politeText()).toBe('The knee left the hold angle. The hold timer starts again.');
  });

  it('holds no verdict word on screen with an alert, a near-limit cue or the notice', () => {
    const { source } = setup(HOLD);
    feed(source, 10, 1000, 0);
    expect(hasVerdictWord(document.body.textContent ?? '')).toBeNull();
    cleanup();
    setup({ ...HOLD, minFlexion: undefined });
    expect(hasVerdictWord(document.body.textContent ?? '')).toBeNull();
  });

  it('keeps the Stop and the gave-way buttons while the alert shows', () => {
    const { source, onEnd } = setup(HOLD);
    feed(source, 10, 1000, 0);
    fireEvent.click(screen.getByRole('button', { name: 'Knee gave way or hurts' }));
    expect(onEnd.mock.calls[0]![0]).toBe('gave-way');
  });
});
