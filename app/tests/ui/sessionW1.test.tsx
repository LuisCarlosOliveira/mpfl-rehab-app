import { readFileSync } from 'node:fs';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { legLandmarks } from '../helpers/leg';
import type { Exercise } from '../../src/lib/protocol';
import type { FrameHandler, LandmarkSource, StartResult } from '../../src/pose/source';
import { Session, type SecondView } from '../../src/ui/Session';
import { HEEL_SLIDE, audioHarness, mockSource, playRep, type MockSource } from './helpers';
import { hasVerdictWord } from './verdict';

beforeEach(() =>
  vi.useFakeTimers({
    toFake: ['setInterval', 'clearInterval', 'performance', 'Date'],
  }),
);
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const TWO_BY_ONE: Exercise = { ...HEEL_SLIDE, sets: 2, reps: 1 };
const HOLD: Exercise = {
  kind: 'seated-extension-hold',
  sets: 1,
  reps: 2,
  holdSeconds: 5,
  minFlexion: 40,
  targetFlexion: 60,
  source: 'test',
};

function setup(exercise: Exercise = HEEL_SLIDE, second?: SecondView) {
  const source = mockSource();
  const audio = audioHarness();
  audio.sound.unlock();
  const onEnd = vi.fn();
  const view = (s?: SecondView) => <Session exercise={exercise} side="left" baselineDeg={0} source={source} second={s} sound={audio.sound} onEnd={onEnd} />;
  const rendered = render(view(second));
  return {
    source,
    audio,
    onEnd,
    again: (s?: SecondView) => rendered.rerender(view(s)),
  };
}

/** Frames of one flexion every 33 ms. The input 40 reads about 56 degrees, which is inside the hold band of HOLD (at most 69). The input 80 reads about 84, outside it. */
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

const css = readFileSync('src/ui/styles.css', 'utf8');
const w1 = css.slice(css.indexOf('===== W1: Session screen'), css.indexOf('===== end of W1 ====='));
const w1Rules = w1.replace(/\/\*[\s\S]*?\*\//g, '');

describe('U4: live numbers and units', () => {
  it('writes 1 rep and 2 reps, and 1 hold and 2 holds, so the unit agrees with the number', () => {
    const { source } = setup({ ...HEEL_SLIDE, sets: 1, reps: 5 });
    const unit = () => document.querySelector('.live-reps .v3-num span')!.textContent;
    expect(unit()).toBe('reps'); // 0 reps
    const t = playRep(source, 'left', 60);
    act(() => void vi.advanceTimersByTime(300));
    expect(unit()).toBe('rep');
    playRep(source, 'left', 60, t);
    act(() => void vi.advanceTimersByTime(300));
    expect(unit()).toBe('reps');
  });

  it('keeps the unit in its own element, after a number element', () => {
    setup();
    // The angle shows "--" and no unit until the first frame. The count always has its unit.
    const number = document.querySelector('.counters .live-reps .v3-num b')!;
    expect(number.nextElementSibling?.tagName).toBe('SPAN');
  });

  it('gives the live number tabular figures and a fixed width of 3 characters', () => {
    expect(w1Rules).toMatch(/\.readout-number\s*\{[^}]*min-width:\s*3ch/);
    expect(w1Rules).toMatch(/\.readout-number\s*\{[^}]*font-variant-numeric:\s*tabular-nums/);
    expect(w1Rules).toMatch(/\.readout-number\s*\{[^}]*text-align:\s*end/);
  });
});

describe('U3: the camera is first on a phone, the angle is left of the count', () => {
  it('has a phone rule that moves the frame first, and keeps the angle before the count (redesign)', () => {
    expect(w1Rules).toMatch(/\.session-grid \.frame\s*\{[^}]*order:\s*-1/);
    expect(w1Rules).not.toMatch(/\.counters > \.readout-reps\s*\{[^}]*order:\s*-1/);
    expect(w1Rules).toMatch(/\.counters > \.readout-gauge\s*\{[^}]*grid-column:\s*1 \/ -1/);
    expect(w1Rules).toMatch(/\.session-grid \.preview\s*\{[^}]*max-height:\s*min\(42svh,/);
  });

  it('labels each number: Knee bend with the estimate text under it, and Reps (A2)', () => {
    setup();
    const labels = [...document.querySelectorAll('.v3-metric-label')].map((n) => n.textContent);
    expect(labels).toEqual(['Knee bend', 'Reps']);
    expect(screen.getByText(/estimated angle, not a medical measurement/)).toBeInTheDocument();
  });
});

describe('U8: the rest panel between sets', () => {
  it('replaces the live card with one calm sentence, the pain question and Start next set', () => {
    const { source } = setup(TWO_BY_ONE);
    expect(document.querySelector('.counters')).not.toBeNull();
    playRep(source, 'left', 60);
    const title = screen.getByRole('heading', {
      level: 2,
      name: 'Set 1 done. Rest when you are ready.',
    });
    expect(title.closest('.notice')).not.toHaveClass('notice-strong');
    expect(document.querySelector('.counters')).toBeNull();
    expect(screen.getAllByRole('radio')).toHaveLength(11);
    expect(screen.getByRole('button', { name: 'Start next set' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Start next set' }));
    expect(document.querySelector('.counters')).not.toBeNull();
  });

  it('moves the focus to the rest title', () => {
    const { source } = setup(TWO_BY_ONE);
    playRep(source, 'left', 60);
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: /Set 1 done/ }));
  });

  it('shows no timer and no countdown, and plays no sound, however long the person rests', () => {
    const { source, audio } = setup(TWO_BY_ONE);
    playRep(source, 'left', 60);
    const before = document.querySelector('.rest-panel')!.textContent;
    act(() => void vi.advanceTimersByTime(180_000));
    const panel = document.querySelector('.rest-panel')!;
    expect(panel.textContent).toBe(before);
    expect(panel.textContent).not.toMatch(/\d+:\d+|second|minute|countdown|timer/i);
    expect(audio.oscillators).toHaveLength(0);
    expect(hasVerdictWord(panel.textContent ?? "")).toBeNull();
  });

  it('fades with opacity only, and reduced motion keeps opacity only', () => {
    expect(w1Rules).toMatch(/\.rest-panel\s*\{[^}]*transition:\s*opacity var\(--dur-swap\)/);
    const reduced = /@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/.exec(w1Rules)![1]!;
    expect(reduced).toMatch(/transition:\s*opacity/);
    expect(reduced).not.toMatch(/transform|translate|scale/);
  });
});

describe('U6: the hold timer', () => {
  it('shows the seconds of the current hold against the clinician hold time, and resets when the knee leaves the band', () => {
    const { source } = setup(HOLD);
    const text = () => document.querySelector('.hold-text')!.textContent;
    const bar = () => document.querySelector('progress.hold-bar') as HTMLProgressElement;
    expect(text()).toBe('0 of 5 seconds');
    expect(bar().max).toBe(5);
    let t = feed(source, 40, 3300, 0);
    expect(text()).toBe('3 of 5 seconds');
    expect(bar().value).toBe(3);
    t = feed(source, 80, 600, t); // the knee leaves the band
    expect(text()).toBe('0 of 5 seconds');
    expect(bar().value).toBe(0);
    feed(source, 40, 1300, t);
    expect(text()).toBe('1 of 5 seconds');
  });

  it('never passes the hold time, and shows no goal word and no change after the end', () => {
    const { source } = setup(HOLD);
    const t = feed(source, 40, 4900, 0);
    const bar = document.querySelector('.hold-bar') as HTMLProgressElement;
    const classBefore = bar.className;
    feed(source, 40, 4000, t);
    expect(document.querySelector('.hold-text')!.textContent).toBe('5 of 5 seconds');
    expect(bar.className).toBe(classBefore);
    expect(document.querySelector('.hold-meter')!.textContent).not.toMatch(/goal|target|reached|success|done|complete/i);
    expect(hasVerdictWord(document.querySelector('.hold-meter')!.textContent ?? '')).toBeNull();
    expect(document.querySelector('.live-reps .v3-num span')!.textContent).toBe('hold');
  });

  it('takes the 5 from the protocol, so another hold time gives another number', () => {
    setup({ ...HOLD, holdSeconds: 8 });
    expect(document.querySelector('.hold-text')!.textContent).toBe('0 of 8 seconds');
  });

  it('shows no hold timer for a heel slide', () => {
    setup();
    expect(document.querySelector('.hold-meter')).toBeNull();
  });
});

describe('U10: the start status and the button width', () => {
  it('names the start step, then Ready, then clears when the first frame arrives', async () => {
    const source = mockSource();
    let release: (r: StartResult) => void = () => undefined;
    let handler: FrameHandler = () => undefined;
    source.start.mockImplementation(
      (h) =>
        new Promise<StartResult>((resolve) => {
          handler = h;
          release = resolve;
        }),
    );
    render(<Session exercise={HEEL_SLIDE} side="left" baselineDeg={0} source={source} sound={audioHarness().sound} onEnd={vi.fn()} />);
    const status = () => document.querySelector('.session-start')!;
    expect(status()).toHaveAttribute('role', 'status');
    expect(status().textContent).toBe('Asking for the camera and loading the pose model.');
    await act(async () => release({ ok: true }));
    expect(status().textContent).toBe('Ready. Step into the view.');
    act(() => handler(legLandmarks('left', 20), 0));
    act(() => void vi.advanceTimersByTime(300));
    expect(status().textContent).toBe('');
  });

  it('gives the mute button a fixed minimum width for both of its labels', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Mute sound' })).toHaveClass('session-swap');
    expect(w1Rules).toMatch(/\.session-swap\s*\{[^}]*min-width:\s*[\d.]+rem/);
  });
});

describe('L3-06: notices sit above the camera and the fixed bar', () => {
  it('puts the second camera stop notice before the grid, in the flow', () => {
    const second: MockSource = mockSource();
    const link = (status: SecondView['status']): SecondView => ({
      source: second as unknown as LandmarkSource,
      status,
      message: null,
    });
    const { again } = setup(HEEL_SLIDE, link('connected'));
    again(link('closed'));
    const notice = screen.getByText('The second camera stopped. The session continues with one camera.').closest('.notice')!;
    const grid = document.querySelector('.v3-cam')!;
    expect(notice.closest('.session-notices')).not.toBeNull();
    expect(Boolean(notice.compareDocumentPosition(grid) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    expect(document.querySelector('.session-bar')!.contains(notice)).toBe(false);
  });

  it('leaves room under the page for a bar of two rows', () => {
    expect(w1Rules).toMatch(/\.session\s*\{[^}]*padding-bottom:\s*(1[1-9]|[2-9]\d)rem/);
  });
});

describe('L3-07: the page goes to the background', () => {
  function hide(state: 'hidden' | 'visible') {
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(state);
    act(() => void document.dispatchEvent(new Event('visibilitychange')));
  }

  it('says that the camera stopped, with one retry button, and starts nothing alone', () => {
    const { source } = setup();
    feed(source, 20, 300, 0);
    hide('hidden');
    hide('visible');
    const notice = document.querySelector('.notice[role="alert"]')!;
    expect(notice).toHaveTextContent('The camera stopped when this page went to the background. Press the button to start it again.');
    expect(screen.getAllByRole('button', { name: 'Try the camera again' })).toHaveLength(1);
    expect(source.start).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.session-start')!.textContent).toBe('');
  });

  // U6: after the camera stops, the old cue and the old angle must not stay on the screen.
  it('clears the cue, the live angle and the top angle when the camera stops', () => {
    const { source } = setup({ kind: 'straight-leg-raise', source: 'test' });
    let t = 0;
    for (; t < 1500; t += 30) act(() => void (source.emit(legLandmarks('left', 20, { thighAngle: -Math.PI / 2 + 0.15, hip: { x: 0.5, y: 0.6 } }), t), vi.advanceTimersByTime(30)));
    for (; t < 2500; t += 30) act(() => void (source.emit(null, t), vi.advanceTimersByTime(30))); // no leg: the cue "Show your whole leg." shows
    act(() => void vi.advanceTimersByTime(300));
    expect(document.body.textContent).toContain('Show your whole leg.');
    expect(document.body.textContent).toMatch(/Estimated angle at the top: \d+ degrees?/);
    hide('hidden');
    hide('visible');
    act(() => void vi.advanceTimersByTime(300));
    expect(document.body.textContent).not.toContain('Show your whole leg.');
    expect(document.body.textContent).not.toMatch(/Estimated angle at the top/);
    expect(document.querySelector('.live-angle .v3-num b')!.textContent).toBe('--');
  });

  it('starts the camera again after the press and removes the notice', () => {
    const { source } = setup();
    feed(source, 20, 300, 0);
    hide('hidden');
    hide('visible');
    fireEvent.click(screen.getByRole('button', { name: 'Try the camera again' }));
    expect(source.start).toHaveBeenCalledTimes(2);
    expect(document.querySelector('.notice[role="alert"]')).toBeNull();
  });
});

describe('U17: motion tokens', () => {
  it('defines one set of durations and one easing, with no bounce and nothing over 300 ms', () => {
    for (const token of ['--dur-press', '--dur-swap', '--dur-dialog', '--ease-out']) expect(w1Rules).toContain(`${token}:`);
    for (const m of w1Rules.matchAll(/(\d+)ms/g)) expect(Number(m[1])).toBeLessThanOrEqual(300);
    expect(w1Rules).not.toMatch(/@keyframes|bounce|spring|cubic-bezier\([^)]*-\d/);
  });
});
