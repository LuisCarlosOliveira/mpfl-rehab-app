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
const SLR: Exercise = { kind: 'straight-leg-raise', sets: 2, reps: 2, source: 'test' };

function setup(exercise: Exercise, source: MockSource = mockSource()) {
  const onEnd = vi.fn();
  const audio = audioHarness();
  audio.sound.unlock();
  render(<Session exercise={exercise} side="left" baselineDeg={0} source={source} sound={audio.sound} onEnd={onEnd} />);
  return { source, onEnd, audio };
}
const press = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

describe('repsBy in the run summary (M3)', () => {
  it('says hand when the person counted the reps with the button', () => {
    const { onEnd } = setup(SLR);
    press('Count this rep');
    press('Stop');
    expect(onEnd.mock.calls[0]![1].repsBy).toBe('hand');
  });

  it('says camera when the pipeline counted the reps', () => {
    const { source, onEnd } = setup(HEEL_SLIDE);
    playRep(source, 'left', 60);
    press('Stop');
    expect(onEnd.mock.calls[0]![1].reps).toBe(1);
    expect(onEnd.mock.calls[0]![1].repsBy).toBe('camera');
  });

  it('leaves the field out when nothing was counted', () => {
    const { onEnd } = setup(SLR);
    press('Stop');
    expect('repsBy' in onEnd.mock.calls[0]![1]).toBe(false);
  });

  it('shows no new text on the screen for it', () => {
    setup(SLR);
    press('Count this rep');
    // The fixed leg raise line says "The camera counts leg raises". The marker would say "camera count" with no "s leg".
    expect(document.body.textContent ?? '').not.toMatch(/by hand|counted by|camera count(?!s leg raises)/i);
  });
});

// ENGINEERING: the repeat time of the over-limit beep is 5 s. See OVER_LIMIT_REPEAT_MS in Session.tsx.
const LEG_RAISE_LINE = 'The camera counts leg raises as an estimate. If a lift is missed, press Count this rep.';

/** A person who lies on the side: rest, then `lifts` lifts of the straight leg that each hold 1.5 s. */
function liftLeg(source: MockSource, lifts: number): void {
  const hip = { x: 0.3, y: 0.7 };
  let t = 0;
  const frame = (height: number) => {
    const thighAngle = -Math.asin(height / 0.4);
    act(() => source.emit(legLandmarks('left', 0, { hip, thighAngle }), t));
    t += 100;
  };
  for (let i = 0; i < 10; i++) frame(0);
  for (let n = 0; n < lifts; n++) {
    for (let i = 0; i < 20; i++) frame(0.25);
    for (let i = 0; i < 15; i++) frame(0);
  }
}

describe('the leg raise camera count', () => {
  it('tells the person that the camera counts leg raises as an estimate and that the button is the fallback', () => {
    setup(SLR);
    expect(screen.getByText(LEG_RAISE_LINE)).toBeInTheDocument();
    expect(screen.queryByText(/does not count leg raises/)).toBeNull();
  });

  it('shows no such line for the heel slide, which has its own count', () => {
    setup(HEEL_SLIDE);
    expect(screen.queryByText(LEG_RAISE_LINE)).toBeNull();
  });

  it('counts a lifted leg with the camera and says camera in the run summary', () => {
    const { source, onEnd } = setup(SLR);
    liftLeg(source, 1);
    tick();
    expect(screen.getByText('Reps in this set: 1 of 2')).toBeInTheDocument();
    press('Stop');
    expect(onEnd.mock.calls[0]![1].reps).toBe(1);
    expect(onEnd.mock.calls[0]![1].repsBy).toBe('camera');
  });

  it('says hand when the camera and the button both added reps', () => {
    const { source, onEnd } = setup(SLR);
    liftLeg(source, 1);
    press('Count this rep');
    press('Stop');
    expect(onEnd.mock.calls[0]![1].reps).toBe(2);
    expect(onEnd.mock.calls[0]![1].repsBy).toBe('hand');
  });

  it('counts no rep for a leg that stays down', () => {
    const { source, onEnd } = setup(SLR);
    liftLeg(source, 0);
    press('Stop');
    expect(onEnd.mock.calls[0]![1].reps).toBeNull();
  });

  it('claims no accuracy in the count text', () => {
    setup(SLR);
    expect(document.body.textContent ?? '').not.toMatch(/accurate|exact|precise/i);
  });
});

describe('the over-limit beep repeats (M5)', () => {
  /** Rest, then a slow rise above the limit of 90 degrees plus the margin. Returns the next time. */
  function riseAboveLimit(source: MockSource): number {
    let t = 0;
    for (let i = 0; i < 10; i++, t += 100) act(() => source.emit(legLandmarks('left', 0), t));
    for (let i = 1; i <= 12; i++, t += 100) act(() => source.emit(legLandmarks('left', 10 * i), t));
    return t;
  }
  /** Hold the knee at `deg` for `frames` frames of 100 ms. The fake clock moves with the frames. */
  function hold(source: MockSource, t: number, deg: number, frames: number): number {
    for (let i = 0; i < frames; i++, t += 100) {
      act(() => source.emit(legLandmarks('left', deg), t));
      tick(100);
    }
    return t;
  }

  it('beeps again every 5 seconds while the knee stays over the limit', () => {
    const { source, audio } = setup(HEEL_SLIDE);
    let t = riseAboveLimit(source);
    const first = audio.oscillators.length;
    expect(first).toBeGreaterThan(0);
    t = hold(source, t, 120, 40); // 4 s
    expect(audio.oscillators.length).toBe(first);
    t = hold(source, t, 120, 20); // 6 s in total
    expect(audio.oscillators.length).toBe(first + 1);
    hold(source, t, 120, 50); // 11 s in total
    expect(audio.oscillators.length).toBe(first + 2);
  });

  it('stops at once when the knee returns below the limit', () => {
    const { source, audio } = setup(HEEL_SLIDE);
    let t = riseAboveLimit(source);
    t = hold(source, t, 120, 20);
    t = hold(source, t, 20, 5); // the knee is back
    const after = audio.oscillators.length;
    hold(source, t, 20, 150); // 15 s
    expect(audio.oscillators.length).toBe(after);
  });

  it('is muted by the mute button', () => {
    const { source, audio } = setup(HEEL_SLIDE);
    const t = riseAboveLimit(source);
    press('Mute sound');
    const after = audio.oscillators.length;
    hold(source, t, 120, 120);
    expect(audio.oscillators.length).toBe(after);
  });

  it('makes no sound for an in-range rep', () => {
    const { source, audio } = setup(HEEL_SLIDE);
    const t = playRep(source, 'left', 60);
    hold(source, t, 20, 150);
    expect(audio.oscillators).toHaveLength(0);
  });
});
