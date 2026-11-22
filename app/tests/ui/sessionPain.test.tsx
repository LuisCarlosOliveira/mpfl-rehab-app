import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Exercise } from '../../src/lib/protocol';
import { PAUSE_MESSAGE } from '../../src/lib/safety';
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

const THREE_BY_ONE: Exercise = { ...HEEL_SLIDE, sets: 3, reps: 1 };
const ONE_BY_ONE: Exercise = { ...HEEL_SLIDE, sets: 2, reps: 1 };

function setup(exercise: Exercise, painPauseThreshold?: number, source: MockSource = mockSource()) {
  const audio = audioHarness();
  audio.sound.unlock();
  const onEnd = vi.fn();
  render(
    <Session exercise={exercise} side="left" baselineDeg={0} source={source} sound={audio.sound} onEnd={onEnd} painPauseThreshold={painPauseThreshold} />,
  );
  return { source, onEnd, audio };
}

const press = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const answer = (n: number) => fireEvent.click(screen.getByRole('radio', { name: String(n) }));
const radios = () => screen.queryAllByRole('radio');
const question = /How much pain do you have now\?/;

/** Counts one rep. A set holds one rep. Returns the next frame time. */
const oneRep = (source: MockSource, t = 0) => playRep(source, 'left', 60, t);

describe('pain question between sets', () => {
  it('asks the 0 to 10 question when a set is complete, with 11 answers and the same legend as the summary', () => {
    const { source } = setup(THREE_BY_ONE);
    expect(radios()).toHaveLength(0);
    oneRep(source);
    expect(screen.getByText('Set 1 done. Rest when you are ready.')).toBeInTheDocument();
    expect(screen.getByText(question)).toBeInTheDocument();
    expect(radios()).toHaveLength(11);
    expect(screen.getByRole('group', { name: question })).toBeInTheDocument();
  });

  it('does not ask while a set runs, and not after the last set', () => {
    const { source } = setup(ONE_BY_ONE);
    expect(radios()).toHaveLength(0);
    const t = oneRep(source);
    expect(radios()).toHaveLength(11);
    press('Start next set');
    expect(radios()).toHaveLength(0);
    oneRep(source, t);
    expect(screen.getByText(SET_TEXT.allComplete)).toBeInTheDocument();
    expect(radios()).toHaveLength(0);
  });

  it('lets the person skip: Start next set works with no answer, and nothing is pre-selected', () => {
    const { source } = setup(THREE_BY_ONE);
    oneRep(source);
    expect(radios().every((r) => !(r as HTMLInputElement).checked)).toBe(true);
    press('Start next set');
    expect(screen.getByText('Set 2 of 3')).toBeInTheDocument();
  });

  it('keeps the set-complete notice neutral: status role, no sound, no alert', () => {
    const { source, audio } = setup(THREE_BY_ONE, 5);
    oneRep(source);
    answer(2);
    expect(document.querySelector('[role="alert"]')).toBeEmptyDOMElement();
    expect(audio.oscillators).toHaveLength(0);
  });
});

describe('stop at the safety floor or at a lower clinician threshold', () => {
  it('does not stop below the floor 7 when the protocol has no threshold', () => {
    const { source } = setup(THREE_BY_ONE, undefined);
    oneRep(source);
    answer(6);
    expect(screen.queryByText(PAUSE_MESSAGE)).toBeNull();
    expect(screen.getByRole('button', { name: 'Start next set' })).toBeInTheDocument();
  });

  it('stops at the floor 7 when the protocol has no threshold, with the Summary reason text and a Finish button', () => {
    const { source, onEnd } = setup(THREE_BY_ONE, undefined);
    oneRep(source);
    answer(7);
    const notice = screen.getByText(PAUSE_MESSAGE).closest('.notice')!;
    expect(notice).toHaveClass('notice-strong');
    expect(notice).toHaveAttribute('role', 'alert');
    expect(notice).toHaveTextContent('You reported pain 7 out of 10.');
    expect(notice).toHaveTextContent('This is a rule of the app. It is not a diagnosis.');
    expect(screen.queryByRole('button', { name: 'Start next set' })).toBeNull();
    press('Finish');
    expect(onEnd.mock.calls[0]![0]).toBe('stop');
    expect(onEnd.mock.calls[0]![1].setPain).toEqual([7]);
  });

  it('stops for pain 10 when the protocol has no threshold', () => {
    const { source } = setup(THREE_BY_ONE, undefined);
    oneRep(source);
    answer(10);
    expect(screen.getByText(PAUSE_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start next set' })).toBeNull();
  });

  it('does not let a protocol threshold above 7 lift the floor', () => {
    const { source } = setup(THREE_BY_ONE, 9);
    oneRep(source);
    answer(7);
    expect(screen.getByText(PAUSE_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start next set' })).toBeNull();
  });

  it('stops earlier when the protocol threshold is lower than 7', () => {
    const { source } = setup(THREE_BY_ONE, 4);
    oneRep(source);
    answer(4);
    expect(screen.getByText(PAUSE_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start next set' })).toBeNull();
  });

  it('does not stop below the threshold', () => {
    const { source } = setup(THREE_BY_ONE, 5);
    oneRep(source);
    answer(4);
    expect(screen.queryByText(PAUSE_MESSAGE)).toBeNull();
    expect(screen.getByRole('button', { name: 'Start next set' })).toBeInTheDocument();
  });

  it('stops at the threshold with the care team message, a strong alert and a Finish button', () => {
    const { source, onEnd } = setup(THREE_BY_ONE, 5);
    oneRep(source);
    answer(5);
    const notice = screen.getByText(PAUSE_MESSAGE).closest('.notice')!;
    expect(notice).toHaveClass('notice-strong');
    expect(notice).toHaveAttribute('role', 'alert');
    expect(screen.queryByRole('button', { name: 'Start next set' })).toBeNull();
    expect(onEnd).not.toHaveBeenCalled();
    press('Finish');
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(onEnd.mock.calls[0]![0]).toBe('stop');
    expect(onEnd.mock.calls[0]![1].setPain).toEqual([5]);
  });

  it('stays stopped when the person changes the answer afterwards', () => {
    const { source } = setup(THREE_BY_ONE, 5);
    oneRep(source);
    answer(8);
    expect(screen.getByText(PAUSE_MESSAGE)).toBeInTheDocument();
    expect(radios()).toHaveLength(0);
    expect(screen.queryByRole('button', { name: 'Start next set' })).toBeNull();
  });

  it('holds no verdict word on the question and on the stop', () => {
    const { source } = setup(THREE_BY_ONE, 5);
    oneRep(source);
    expect(hasVerdictWord(document.body.textContent ?? '')).toBeNull();
    answer(9);
    expect(hasVerdictWord(document.body.textContent ?? '')).toBeNull();
  });
});

describe('the answers go into the summary of the run', () => {
  it('lists one entry for each completed set that asked, with null for a skipped one', () => {
    const { source, onEnd } = setup(THREE_BY_ONE);
    let t = oneRep(source);
    answer(3);
    press('Start next set');
    t = oneRep(source, t);
    press('Start next set'); // skipped
    oneRep(source, t);
    press('Stop');
    expect(onEnd.mock.calls[0]![1].setPain).toEqual([3, null]);
  });

  it('leaves the field out when no set was complete', () => {
    const { onEnd } = setup(THREE_BY_ONE);
    press('Stop');
    expect('setPain' in onEnd.mock.calls[0]![1]).toBe(false);
  });

  it('keeps the entry of a set that was open when the person pressed Stop in the pause', () => {
    const { source, onEnd } = setup(THREE_BY_ONE);
    oneRep(source);
    answer(6);
    press('Stop');
    expect(onEnd.mock.calls[0]![1].setPain).toEqual([6]);
  });
});
