// F1: Session finds the starting angle in place when Setup gave none. No "stop and start again".
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { legLandmarks } from '../helpers/leg';
import type { Exercise } from '../../src/lib/protocol';
import { Session } from '../../src/ui/Session';
import { flexion, kneeAngle, selectLeg } from '../../src/lib/angle';
import { CAPTURE_TEXT, LEG_TEXT } from '../../src/ui/setupView';
import { HEEL_SLIDE, audioHarness, mockSource, playRep, type MockSource } from './helpers';

beforeEach(() => vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance', 'Date'] }));
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const tick = (ms = 250) => act(() => void vi.advanceTimersByTime(ms));

function open(over: { baselineDeg?: number | null; exercise?: Exercise } = {}) {
  const source = mockSource();
  const onEnd = vi.fn();
  render(
    <Session
      exercise={over.exercise ?? HEEL_SLIDE}
      side="left"
      baselineDeg={'baselineDeg' in over ? over.baselineDeg : null}
      source={source}
      sound={audioHarness().sound}
      onEnd={onEnd}
    />,
  );
  return { source, onEnd };
}

/** The leg at one angle, 100 ms steps. A tiny jitter of the hip, like a still person. Returns the next time. */
function holdStill(source: MockSource, flexion: number, from: number, ms: number): number {
  let t = from;
  for (let i = 0; t < from + ms; t += 100, i++) {
    act(() => source.emit(legLandmarks('left', flexion, { hip: { x: 0.5 + (i % 2) * 0.001, y: 0.3 } }), t));
  }
  tick();
  return t;
}

/** The leg moves all the time, a slow heel slide cycle of 4 seconds. Returns the next time. */
function moveAll(source: MockSource, from: number, ms: number): number {
  let t = from;
  for (let i = 0; t < from + ms; t += 100, i++) {
    const f = 5 + 35 * (1 - Math.cos((2 * Math.PI * i) / 40));
    act(() => source.emit(legLandmarks('left', f), t));
  }
  tick();
  return t;
}

// The angle that the app reads from the synthetic leg at the aspect of the mock source (16:9).
const rest = (f: number) => Math.round(flexion(kneeAngle(...selectLeg(legLandmarks('left', f, { hip: { x: 0.5, y: 0.3 } }), 'left'), 16 / 9)) as number);
const reps = () => screen.getByText(/^reps?$/).previousElementSibling as HTMLElement;
const lowestButton = () => screen.queryByRole('button', { name: CAPTURE_TEXT.lowestButton });

describe('Session with no baseline: the finding state', () => {
  it('starts with a one-line hold-still text and a progress bar on the camera picture, and no verdict', () => {
    const { source } = open();
    moveAll(source, 0, 300);
    expect(screen.getByText(CAPTURE_TEXT.hold)).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: CAPTURE_TEXT.progress })).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/stop, then start again/i);
    expect(lowestButton()).toBeNull();
  });

  // R2-04: the card took room above the numbers, so a phone showed the angle and the count under the bar.
  // V2 (spec section 5): the line and the progress sit in the status slot right under the camera. The slot has a reserved height, so nothing moves.
  it('takes no room between the camera and the numbers: the text sits in the status slot under the camera, and no card shows yet', () => {
    const { source } = open();
    moveAll(source, 0, 300);
    const slot = document.querySelector('.status-slot')!;
    expect(slot).toContainElement(screen.getByText(CAPTURE_TEXT.hold));
    expect(slot).toContainElement(screen.getByRole('progressbar'));
    expect(document.querySelector('.frame')!).not.toContainElement(screen.getByRole('progressbar'));
    expect(screen.queryByText(CAPTURE_TEXT.title)).toBeNull();
    expect(document.querySelector('.capture')).toBeNull();
  });

  it('puts the choice card after the numbers in the page, so the numbers stay above the fixed bar', () => {
    const { source } = open();
    moveAll(source, 0, 16000);
    const card = document.querySelector('.capture')!;
    expect(card).toHaveTextContent(CAPTURE_TEXT.title);
    expect(document.querySelector('.counters')!.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText(CAPTURE_TEXT.chooseShort)).toBeInTheDocument();
  });

  // R3-02: under the numbers the button was 310 px below the bar on a phone. Before the numbers it stays in the first view.
  it('puts the lowest-angle button before the numbers in the page, and not inside the card', () => {
    const { source } = open();
    moveAll(source, 0, 16000);
    const button = lowestButton()!;
    expect(button.compareDocumentPosition(document.querySelector('.counters')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(document.querySelector('.capture')!).not.toContainElement(button);
  });

  it('shows the progress while the leg holds still', () => {
    const { source } = open();
    holdStill(source, 12, 0, 1000);
    const v = Number(screen.getByRole('progressbar').getAttribute('value'));
    expect(v).toBeGreaterThan(30);
    expect(v).toBeLessThan(70);
  });

  it('sets a still baseline, says so, and counts reps from that moment', () => {
    const { source, onEnd } = open();
    const t = holdStill(source, 12, 0, 2500);
    expect(screen.getByText(LEG_TEXT.resting(rest(12)))).toBeInTheDocument();
    expect(screen.queryByText(CAPTURE_TEXT.hold)).toBeNull();
    playRep(source, 'left', 70, t);
    tick();
    expect(reps()).toHaveTextContent('1');
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(onEnd.mock.calls[0]![1]).toMatchObject({ reps: 1, baselineSource: 'still' });
  });

  it('counts no rep before the baseline exists', () => {
    const { source } = open();
    moveAll(source, 0, 6000);
    expect(reps()).toHaveTextContent('0');
  });

  it('starts the capture window again when the leg is lost', () => {
    const { source } = open();
    let t = holdStill(source, 12, 0, 1500);
    act(() => source.emit(null, t));
    t += 100;
    tick();
    expect(Number(screen.getByRole('progressbar').getAttribute('value'))).toBe(0);
    t = holdStill(source, 12, t, 1500);
    expect(screen.queryByText(LEG_TEXT.resting(rest(12)))).toBeNull();
    holdStill(source, 12, t, 1000);
    expect(screen.getByText(LEG_TEXT.resting(rest(12)))).toBeInTheDocument();
  });
});

describe('Session with no baseline: the person never holds still', () => {
  it('shows a plain instruction and the button after the time limit, and not before', () => {
    const { source } = open();
    const t = moveAll(source, 0, 10000);
    expect(lowestButton()).toBeNull();
    moveAll(source, t, 6000);
    expect(screen.getByText(CAPTURE_TEXT.stuck)).toBeInTheDocument();
    expect(lowestButton()).toBeEnabled();
  });

  it('takes no angle before the press: no starting angle text, no count', () => {
    const { source } = open();
    const t = moveAll(source, 0, 20000);
    expect(screen.queryByText(/Starting angle:/)).toBeNull();
    expect(reps()).toHaveTextContent('0');
    playRep(source, 'left', 70, t);
    tick();
    expect(reps()).toHaveTextContent('0');
  });

  it('B5-07: after the press the focus moves to the angle readout and not to the page body', () => {
    const { source } = open();
    moveAll(source, 0, 20000);
    fireEvent.click(lowestButton()!);
    tick();
    const active = document.activeElement as HTMLElement;
    expect(active).not.toBe(document.body);
    expect(active.classList.contains('readout-line')).toBe(true);
    expect(active.getAttribute('tabindex')).toBe('-1');
  });

  it('after the press shows the angle as an estimate, records the source and counts reps', () => {
    const { source, onEnd } = open();
    const t = moveAll(source, 0, 20000);
    fireEvent.click(lowestButton()!);
    const text = screen.getByText(/^Starting angle: \d+ degrees \(estimated\)$/);
    expect(text).toBeInTheDocument();
    expect(lowestButton()).toBeNull();
    playRep(source, 'left', 70, t);
    tick();
    expect(reps()).toHaveTextContent('1');
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(onEnd.mock.calls[0]![1]).toMatchObject({ baselineSource: 'lowest' });
  });

  it('keeps the button disabled with a reason when too few angles were seen', () => {
    const { source } = open();
    act(() => source.emit(legLandmarks('left', 10), 0));
    act(() => source.emit(legLandmarks('left', 40), 16000));
    tick();
    expect(lowestButton()).toBeDisabled();
    expect(screen.getByText(CAPTURE_TEXT.lowestNeedsLeg)).toBeInTheDocument();
  });

  it('still takes a still baseline when the person holds still after the limit', () => {
    const { source, onEnd } = open();
    const t = moveAll(source, 0, 17000);
    holdStill(source, 9, t, 2600);
    expect(screen.getByText(LEG_TEXT.resting(rest(9)))).toBeInTheDocument();
    expect(lowestButton()).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(onEnd.mock.calls[0]![1]).toMatchObject({ baselineSource: 'still' });
  });
});

describe('Session with no baseline: a hold at the bottom of a rep', () => {
  it('does not take a hold at 70 degrees as the starting angle, and asks to straighten in place', () => {
    const { source } = open();
    holdStill(source, 70, 0, 3000);
    expect(screen.queryByText(/Resting angle:/)).toBeNull();
    expect(screen.getByText(CAPTURE_TEXT.bent)).toBeInTheDocument();
    expect(screen.getByText(CAPTURE_TEXT.bentShort)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/stop, then start again/i);
  });
});

describe('Session with no baseline: the lowest angle is a bent knee', () => {
  it('takes nothing after the press and asks to straighten in place', () => {
    const { source } = open();
    let t = 0;
    for (let i = 0; i < 200; i++, t += 100) act(() => source.emit(legLandmarks('left', 60 + 10 * (1 - Math.cos((2 * Math.PI * i) / 40))), t));
    tick();
    fireEvent.click(lowestButton()!);
    act(() => source.emit(legLandmarks('left', 65), t));
    tick();
    expect(screen.queryByText(/Starting angle:/)).toBeNull();
    expect(screen.getByText(CAPTURE_TEXT.bent)).toBeInTheDocument();
  });
});

describe('Session when no capture is needed', () => {
  it('shows no capture state when Setup measured a baseline, and records the source as still', () => {
    const { source, onEnd } = open({ baselineDeg: 5 });
    expect(screen.queryByText(CAPTURE_TEXT.hold)).toBeNull();
    expect(screen.queryByRole('progressbar')).toBeNull();
    playRep(source, 'left', 70);
    tick();
    expect(reps()).toHaveTextContent('1');
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(onEnd.mock.calls[0]![1]).toMatchObject({ baselineSource: 'still' });
  });

  it('shows no capture state when the protocol has no return value, and no source is recorded', () => {
    const { onEnd } = open({ exercise: { ...HEEL_SLIDE, returnWithinDeg: undefined } });
    expect(screen.queryByText(CAPTURE_TEXT.title)).toBeNull();
    expect(screen.getByText(LEG_TEXT.noReturnValue)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(onEnd.mock.calls[0]![1]).not.toHaveProperty('baselineSource');
  });

  it('shows no capture state for the seated hold and records no source', () => {
    const hold: Exercise = { kind: 'seated-extension-hold', sets: 1, reps: 3, holdSeconds: 5, minFlexion: 0, targetFlexion: 60, source: 'test' } as Exercise;
    const { onEnd } = open({ exercise: hold });
    expect(screen.queryByText(CAPTURE_TEXT.title)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(onEnd.mock.calls[0]![1]).not.toHaveProperty('baselineSource');
  });
});
