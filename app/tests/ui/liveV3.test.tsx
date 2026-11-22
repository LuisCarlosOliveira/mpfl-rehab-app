import { readFileSync } from 'node:fs';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlanExercise } from '../../src/lib/protocol';
import type { RunSummary } from '../../src/ui/appState';
import { RunStats } from '../../src/ui/RunStats';
import { Session } from '../../src/ui/Session';
import { Setup } from '../../src/ui/Setup';
import { legLandmarks } from '../helpers/leg';
import { HEEL_SLIDE, audioHarness, mockSource } from './helpers';
import { hasVerdictWord } from './verdict';

beforeEach(() => vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance', 'Date'] }));
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const QUAD: PlanExercise = { kind: 'quad-set', sets: 2, reps: 3, source: 'test' };
const PROTOTYPE = 'Prototype. Not for patient use.';

function openSession(exercise: PlanExercise = HEEL_SLIDE, extra: Record<string, unknown> = {}) {
  const source = mockSource();
  const view = render(<Session exercise={exercise} side="left" baselineDeg={0} source={source} sound={audioHarness().sound} onEnd={vi.fn()} {...extra} />);
  return { source, view };
}
const before = (a: Node, b: Node) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

describe('Session on LiveShell, with the camera', () => {
  it('shows the prototype banner and no navigation, in a LiveShell', () => {
    openSession();
    expect(screen.getByRole('complementary', { name: 'Notice' })).toHaveTextContent(PROTOTYPE);
    expect(screen.queryByRole('navigation')).toBeNull();
    expect(document.querySelector('.v3-live')).not.toBeNull();
  });

  it('puts the exercise name first, then the camera, then the numbers and the controls', () => {
    openSession();
    const name = screen.getByRole('heading', { level: 1, name: 'Heel slide' });
    const camera = screen.getByRole('region', { name: 'Live camera' });
    const angle = screen.getByRole('group', { name: 'Knee bend' });
    const stop = screen.getByRole('button', { name: /^\W*Stop$/ });
    expect(before(name, camera)).toBe(true);
    expect(before(camera, angle)).toBe(true);
    expect(before(angle, stop)).toBe(true);
    expect(camera).toContainElement(document.querySelector('video')!);
  });

  it('shows the angle and the reps as two BigNumber groups, with the unit next to the number', () => {
    openSession();
    const angle = screen.getByRole('group', { name: 'Knee bend' });
    expect(angle.querySelector('.v3-num b')).toHaveTextContent('--');
    const reps = screen.getByRole('group', { name: 'Reps' });
    expect(reps.querySelector('.v3-num b')).toHaveTextContent('0');
    expect(reps.querySelector('.v3-num span')).toHaveTextContent('reps');
  });

  it('keeps Stop and "Knee gave way or hurts" in one action bar', () => {
    openSession();
    const bar = screen.getByRole('region', { name: 'Session actions' });
    expect(within(bar).getByRole('button', { name: /^\W*Stop$/ })).toBeInTheDocument();
    expect(within(bar).getByRole('button', { name: /Knee gave way or hurts/ })).toBeInTheDocument();
  });

  it('shows the place in the session with SessionProgress, "Exercise n of N, set s of S"', () => {
    openSession(HEEL_SLIDE, { plan: { index: 2, total: 6 } });
    const bar = screen.getByRole('progressbar', { name: 'Session progress' });
    expect(bar).toHaveAttribute('aria-valuetext', 'Exercise 3 of 6, set 1 of 3');
  });

  it('shows the angle number that the camera reads, and no verdict word anywhere', () => {
    const { source, view } = openSession();
    for (let i = 0; i < 5; i++) act(() => source.emit(legLandmarks('left', 40), i * 33));
    act(() => void vi.advanceTimersByTime(300));
    expect(screen.getByRole('group', { name: 'Knee bend' }).querySelector('.v3-num b')).not.toHaveTextContent('--');
    expect(hasVerdictWord(view.container.textContent ?? '')).toBeNull();
  });
});

describe('Session on LiveShell, the timer', () => {
  it('has no camera region and no video, and the name comes before the hold button and Stop', () => {
    openSession(QUAD);
    expect(screen.queryByRole('region', { name: 'Live camera' })).toBeNull();
    expect(document.querySelector('video')).toBeNull();
    const name = screen.getByRole('heading', { level: 1, name: 'Quadriceps set' });
    const hold = screen.getByRole('button', { name: 'Start hold' });
    const stop = screen.getByRole('button', { name: /^\W*Stop$/ });
    expect(before(name, hold)).toBe(true);
    expect(before(name, stop)).toBe(true);
    expect(screen.getByRole('complementary', { name: 'Notice' })).toHaveTextContent(PROTOTYPE);
  });

  it('shows the hold time as a BigNumber, with the seconds that run', () => {
    openSession(QUAD);
    fireEvent.click(screen.getByRole('button', { name: 'Start hold' }));
    act(() => void vi.advanceTimersByTime(3200));
    const group = screen.getByRole('group', { name: 'Hold time' });
    expect(group.querySelector('.v3-num b')).toHaveTextContent('3');
    expect(screen.getByTestId('hold-elapsed')).toBe(group.querySelector('.v3-num'));
  });
});

describe('RunStats with BigNumber', () => {
  const summary = (over: Partial<RunSummary> = {}): RunSummary =>
    ({
      reps: 10,
      holds: null,
      peakFlexion: 87.4,
      topFlexion: null,
      topState: null,
      eventCounts: { nearLimit: 0, overLimit: 0, tooFast: 0 },
      ...over,
    }) as RunSummary;

  it('shows each measured number as a group with its unit', () => {
    render(<RunStats kind="heel-slide" summary={summary()} />);
    const reps = screen.getByRole('group', { name: 'Reps counted' });
    expect(reps.querySelector('.v3-num b')).toHaveTextContent('10');
    expect(reps.querySelector('.v3-num span')).toHaveTextContent('reps');
    expect(screen.getByRole('group', { name: 'Highest knee bend' }).querySelector('.v3-num b')).toHaveTextContent('87');
  });
});

describe('Setup on LiveShell', () => {
  const open = (extra: Record<string, unknown> = {}) =>
    render(<Setup kind="heel-slide" side="left" exerciseName="Heel slide" source={mockSource()} sound={audioHarness().sound} onReady={vi.fn()} onCancel={vi.fn()} {...extra} />);

  it('shows the banner, the exercise name as the first heading and no navigation', () => {
    open();
    expect(screen.getByRole('complementary', { name: 'Notice' })).toHaveTextContent(PROTOTYPE);
    expect(screen.queryByRole('navigation')).toBeNull();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Set up the camera');
    expect(screen.getByText('Exercise: Heel slide')).toBeInTheDocument();
  });

  it('shows the place in today\'s session with SessionProgress', () => {
    open({ plan: { index: 1, total: 4, detail: '3 sets' } });
    expect(screen.getByRole('progressbar', { name: 'Session progress' })).toHaveAttribute('aria-valuetext', 'Exercise 2 of 4');
  });

  it('puts the camera in the camera slot on the camera step', () => {
    open({ compact: true });
    const camera = screen.getByRole('region', { name: 'Camera preview' });
    expect(camera).toContainElement(document.querySelector('video')!);
    expect(before(screen.getByRole('heading', { level: 1 }), camera)).toBe(true);
  });
});

describe('LiveShell width (design doc: the camera is at least 55 percent of the window at 1440 px)', () => {
  const css = readFileSync('src/ui/v3/parts.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const rem = (name: string) => Number(new RegExp(`${name}:\\s*([\\d.]+)rem`).exec(css)?.[1]);

  it('gives the live frame a width variable that is wider than the 1200 px of the other screens', () => {
    expect(rem('--v3-live-width')).toBeGreaterThan(75);
  });

  it('puts at least 55 percent of the window into the camera column at 1280, 1440 and 1910 px', () => {
    for (const width of [1280, 1440, 1910]) {
      const live = Math.min(rem('--v3-live-width') * 16, width);
      const inner = live - 2 * 24; // the side padding of .v3-main
      const gap = 24;
      const camera = ((inner - gap) * 3) / 5;
      expect(camera / width, `at ${width} px`).toBeGreaterThanOrEqual(0.55);
    }
    expect(css).toMatch(/\.v3-live\s*\{\s*grid-template-columns:\s*minmax\(0, 3fr\) minmax\(0, 2fr\)/);
  });
});
