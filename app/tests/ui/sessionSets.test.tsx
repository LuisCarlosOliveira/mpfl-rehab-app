// Session set logic (plan FR9). The set code is in src/lib/sets.ts. These tests check the wiring on the screen.
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Exercise } from '../../src/lib/protocol';
import { SET_TEXT } from '../../src/lib/sets';
import { Session } from '../../src/ui/Session';
import { HEEL_SLIDE, audioHarness, mockSource, playRep, type MockSource } from './helpers';
import { hasVerdictWord } from './verdict';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance', 'Date'] });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const TWO_BY_TWO: Exercise = { ...HEEL_SLIDE, sets: 2, reps: 2 };
const NO_REPS: Exercise = { kind: 'heel-slide', targetFlexion: 60, maxFlexion: 90, returnWithinDeg: 18, source: 'test' };
const SLR: Exercise = { kind: 'straight-leg-raise', sets: 2, reps: 2, source: 'test' };
const HOLD: Exercise = { kind: 'seated-extension-hold', sets: 2, reps: 2, holdSeconds: 5, minFlexion: 40, targetFlexion: 60, source: 'test' };

function setup(exercise: Exercise, source: MockSource = mockSource()) {
  const onEnd = vi.fn();
  const audio = audioHarness();
  audio.sound.unlock();
  render(<Session exercise={exercise} side="left" baselineDeg={0} source={source} sound={audio.sound} onEnd={onEnd} />);
  return { source, onEnd, audio };
}

const press = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const noButton = (name: string) => expect(screen.queryByRole('button', { name })).toBeNull();

describe('Session sets: display', () => {
  it('shows the set label and the reps in this set', () => {
    const { source } = setup(TWO_BY_TWO);
    expect(screen.getByText('Set 1 of 2')).toBeInTheDocument();
    expect(screen.getByText('Reps in this set: 0 of 2')).toBeInTheDocument();
    playRep(source, 'left', 60);
    expect(screen.getByText('Reps in this set: 1 of 2')).toBeInTheDocument();
  });

  it('shows no set text and the plain rep count without a prescription', () => {
    const { source } = setup(NO_REPS);
    playRep(source, 'left', 60);
    expect(screen.queryByText(/^Set \d/)).toBeNull();
    expect(screen.queryByText(/Reps in this set/)).toBeNull();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText(/^reps?$/)).toBeInTheDocument();
  });
});

describe('Session sets: labels in the counter header', () => {
  it('puts both labels in the counter card, above the rep number', () => {
    setup(TWO_BY_TWO);
    const card = document.querySelector('.counters')!;
    const setLabel = screen.getByText('Set 1 of 2');
    const repsLabel = screen.getByText('Reps in this set: 0 of 2');
    const repNumber = screen.getByText(/^reps?$/).previousElementSibling!;
    for (const label of [setLabel, repsLabel]) {
      expect(card.contains(label)).toBe(true);
      expect(Boolean(label.compareDocumentPosition(repNumber) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    }
  });

  it('shows no header without a prescription', () => {
    setup(NO_REPS);
    expect(document.querySelector('.counters-head')).toBeNull();
  });
});

describe('Session header', () => {
  it('keeps the title and the mute button in one header row for the straight leg raise', () => {
    setup(SLR);
    const head = screen.getByRole('heading', { level: 1, name: 'Straight leg raise' }).closest('.page-head')!;
    expect(head).toHaveClass('session-head');
    expect(head.contains(screen.getByRole('button', { name: /sound/ }))).toBe(true);
  });
});

describe('Session sets: pause between sets', () => {
  it('pauses with a neutral notice, no sound and no alert when a set is complete', () => {
    const { source, audio } = setup(TWO_BY_TWO);
    const t = playRep(source, 'left', 60);
    playRep(source, 'left', 60, t);
    const notice = screen.getByText('Set 1 done. Rest when you are ready.').closest('.notice')!;
    expect(notice).not.toHaveClass('notice-strong');
    expect(notice).toHaveAttribute('role', 'status');
    expect(document.querySelector('[role="alert"]')).toBeEmptyDOMElement();
    expect(audio.oscillators).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Start next set' })).toBeVisible();
    noButton('Finish');
  });

  it('does not count a rep while the set is complete', () => {
    const { source, onEnd } = setup(TWO_BY_TWO);
    let t = playRep(source, 'left', 60);
    t = playRep(source, 'left', 60, t);
    playRep(source, 'left', 60, t); // a third rep during the pause
    press('Stop');
    expect(onEnd.mock.calls[0]![1].sets.repsPerSet).toEqual([2]);
    expect(onEnd.mock.calls[0]![1].reps).toBe(2);
  });

  it('Start next set opens set 2 with zero reps and removes the pause', () => {
    const { source } = setup(TWO_BY_TWO);
    const t = playRep(source, 'left', 60);
    playRep(source, 'left', 60, t);
    press('Start next set');
    expect(screen.getByText('Set 2 of 2')).toBeInTheDocument();
    expect(screen.getByText('Reps in this set: 0 of 2')).toBeInTheDocument();
    expect(screen.queryByText('Set 1 done. Rest when you are ready.')).toBeNull();
    noButton('Start next set');
  });

  it('counts again after Start next set', () => {
    const { source } = setup(TWO_BY_TWO);
    let t = playRep(source, 'left', 60);
    t = playRep(source, 'left', 60, t);
    press('Start next set');
    playRep(source, 'left', 60, t);
    expect(screen.getByText('Reps in this set: 1 of 2')).toBeInTheDocument();
  });

  it('shows the all-sets notice and Finish after the last set, with no Start next set', () => {
    const { source, onEnd, audio } = setup(TWO_BY_TWO);
    let t = playRep(source, 'left', 60);
    t = playRep(source, 'left', 60, t);
    press('Start next set');
    t = playRep(source, 'left', 60, t);
    playRep(source, 'left', 60, t);
    expect(screen.getByText(SET_TEXT.allComplete)).toBeInTheDocument();
    noButton('Start next set');
    expect(audio.oscillators).toHaveLength(0);
    press('Finish');
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(onEnd.mock.calls[0]![0]).toBe('stop');
    const sets = onEnd.mock.calls[0]![1].sets;
    expect(sets.repsPerSet).toEqual([2, 2]);
    expect(sets.ended).toBe(true);
    expect(onEnd.mock.calls[0]![1].reps).toBe(4);
  });

  it('keeps Stop and "Knee gave way or hurts" during the pause', () => {
    const { source, onEnd } = setup(TWO_BY_TWO);
    const t = playRep(source, 'left', 60);
    playRep(source, 'left', 60, t);
    expect(screen.getByRole('button', { name: 'Stop' })).toBeVisible();
    press('Knee gave way or hurts');
    expect(onEnd.mock.calls[0]![0]).toBe('gave-way');
    expect(onEnd.mock.calls[0]![1].sets.ended).toBe(true);
  });

  it('shows no verdict word on the pause screens', () => {
    const { source } = setup(TWO_BY_TWO);
    let t = playRep(source, 'left', 60);
    t = playRep(source, 'left', 60, t);
    expect(hasVerdictWord(document.body.textContent ?? '')).toBeNull();
    press('Start next set');
    t = playRep(source, 'left', 60, t);
    playRep(source, 'left', 60, t);
    expect(hasVerdictWord(document.body.textContent ?? '')).toBeNull();
  });

  it('still shows the over-limit alert during a pause (safety is not paused)', () => {
    const { source } = setup(TWO_BY_TWO);
    let t = playRep(source, 'left', 60);
    t = playRep(source, 'left', 60, t);
    playRep(source, 'left', 120, t);
    act(() => void vi.advanceTimersByTime(250));
    expect(document.querySelector('[role="alert"]')).toHaveTextContent('Stop at your limit, do not push.');
  });
});

describe('Session: the Count this rep button (PROPOSAL)', () => {
  it('shows for the straight leg raise only', () => {
    setup(SLR);
    expect(screen.getByRole('button', { name: 'Count this rep' })).toBeVisible();
    cleanup();
    setup(HEEL_SLIDE);
    noButton('Count this rep');
    cleanup();
    setup(HOLD);
    noButton('Count this rep');
  });

  it('counts a rep for the straight leg raise and fills the set', () => {
    const { onEnd } = setup(SLR);
    press('Count this rep');
    expect(screen.getByText('Reps in this set: 1 of 2')).toBeInTheDocument();
    press('Count this rep');
    expect(screen.getByText('Set 1 done. Rest when you are ready.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Count this rep' })).toBeDisabled();
    press('Start next set');
    press('Count this rep');
    press('Stop');
    expect(onEnd.mock.calls[0]![1].sets.repsPerSet).toEqual([2, 1]);
    expect(onEnd.mock.calls[0]![1].reps).toBe(3);
  });

  it('keeps the old null rep count for a straight leg raise when nothing was counted', () => {
    const { onEnd } = setup(SLR);
    press('Stop');
    expect(onEnd.mock.calls[0]![1].reps).toBeNull();
  });
});

describe('Session sets: hold exercise', () => {
  it('shows the holds unit and reports holds', () => {
    const { onEnd } = setup(HOLD);
    expect(screen.getByText('holds')).toBeInTheDocument();
    expect(screen.getByText('Holds in this set: 0 of 2')).toBeInTheDocument();
    expect(screen.queryByText(/Reps in this set/)).toBeNull();
    press('Stop');
    expect(onEnd.mock.calls[0]![1]).toMatchObject({ reps: null, holds: 0 });
  });
});

// F5a: a check mark reads as an achievement. The rest panel and the set notice use a neutral icon.
// The check icon path of Lucide is the text that the test looks for in the svg of each notice.
const CHECK_PATH = 'M20 6 9 17l-5-5';
const hasCheck = (el: Element) => [...el.querySelectorAll('path')].some((p) => p.getAttribute('d') === CHECK_PATH);

describe('Session sets: no check icon in a set notice (F5a)', () => {
  it('shows no check icon in the rest panel after a set', () => {
    const { source } = setup(TWO_BY_TWO);
    const t = playRep(source, 'left', 60);
    playRep(source, 'left', 60, t);
    const notice = screen.getByText('Set 1 done. Rest when you are ready.').closest('.notice')!;
    expect(notice.querySelector('svg')).not.toBeNull();
    expect(hasCheck(notice)).toBe(false);
    expect(hasCheck(notice.closest('.rest-panel')!)).toBe(false);
  });

  it('shows no check icon in the notice after the last set', () => {
    const { source } = setup({ ...TWO_BY_TWO, sets: 1 });
    const t = playRep(source, 'left', 60);
    playRep(source, 'left', 60, t);
    const notice = screen.getByText(SET_TEXT.allComplete).closest('.notice')!;
    expect(notice.querySelector('svg')).not.toBeNull();
    expect(hasCheck(notice)).toBe(false);
  });

  it('can tell a check icon from a clock icon (the test can fail)', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', CHECK_PATH);
    svg.appendChild(path);
    expect(hasCheck(svg)).toBe(true);
  });
});
