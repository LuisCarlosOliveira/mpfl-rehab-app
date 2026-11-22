import { readFileSync } from 'node:fs';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { legLandmarks } from '../helpers/leg';
import type { Exercise } from '../../src/lib/protocol';
import { Session } from '../../src/ui/Session';
import { StatusLine } from '../../src/ui/StatusLine';
import { HEEL_SLIDE, audioHarness, mockSource, playRep } from './helpers';
import { hasVerdictWord } from './verdict';

beforeEach(() => vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance', 'Date'] }));
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const css = readFileSync('src/ui/sessionV2.css', 'utf8');
const rules = css.replace(/\/\*[\s\S]*?\*\//g, '');
const SLR: Exercise = { kind: 'straight-leg-raise', sets: 1, reps: 10, maxFlexion: 30, source: 'test' };

function open(exercise: Exercise = HEEL_SLIDE) {
  const source = mockSource();
  render(<Session exercise={exercise} side="left" baselineDeg={0} source={source} sound={audioHarness().sound} onEnd={vi.fn()} />);
  return { source };
}

describe('A1: the status slot sits directly under the camera, never on it', () => {
  // v3: the camera slot of LiveShell holds the frame. The status slot is the first part of the panel, so it is right under the camera on a phone.
  it('has a camera slot with the frame, and the status slot as the first part of the panel', () => {
    open();
    const camera = document.querySelector('.v3-live > .v3-cam')!;
    expect([...camera.children].map((c) => c.className.split(' ')[0])).toEqual(['frame']);
    const panel = document.querySelector('.v3-live > .v3-live-panel')!;
    expect(panel.firstElementChild).toHaveClass('status-slot');
    expect(camera.nextElementSibling).toBe(panel);
  });

  it('puts the cue, the alert and the start step in the slot, and none of them in the frame or the stack', () => {
    open();
    const slot = document.querySelector('.status-slot')!;
    for (const sel of ['.cue', '.cue-alert', '.session-start']) {
      expect(slot.querySelector(sel), sel).not.toBeNull();
      expect(document.querySelector('.frame')!.querySelector(sel), `${sel} must not sit on the picture`).toBeNull();
      expect(document.querySelector('.counters')!.querySelector(sel), `${sel} must not sit in the numbers`).toBeNull();
    }
    expect(document.querySelector('.cue-area')).toBeNull();
  });

  it('keeps the live regions in the page from the start, so a screen reader hears the first text', () => {
    open();
    const slot = document.querySelector('.status-slot')!;
    expect(slot.querySelector('.cue:not(.cue-alert)')).toHaveAttribute('role', 'status');
    expect(slot.querySelector('.cue-alert')).toHaveAttribute('role', 'alert');
    expect(slot.querySelector('.session-start')).toHaveAttribute('role', 'status');
  });

  it('puts the camera and the slot before the numbers in the page', () => {
    open();
    const viewfinder = document.querySelector('.v3-cam')!;
    expect(viewfinder.compareDocumentPosition(document.querySelector('.counters')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('puts the hand-count button of the leg raise in the bar, as before', () => {
    open(SLR);
    expect(document.querySelector('.session-bar')!).toContainElement(screen.getByRole('button', { name: 'Count this rep' }));
  });

  // v3: one sticky action bar of LiveShell holds the buttons in one group.
  it('puts the bar buttons in one group inside the action bar', () => {
    open();
    const group = document.querySelector('.v3-actions > .session-bar')!;
    expect(group.querySelectorAll('button').length).toBeGreaterThanOrEqual(2);
  });
});

describe('A1: the CSS file keeps its own scope', () => {
  it('scopes every rule under .v2-session or .v2-setup, or a body :has() rule, and uses no !important', () => {
    expect(rules).not.toMatch(/!important/);
    const selectors = [...rules.matchAll(/(^|\})\s*([^{}@]+)\{/g)].map((m) => m[2]!.trim()).filter((s) => !/^(from|to|\d+%)/.test(s));
    for (const list of selectors)
      for (const sel of list.split(',').map((s) => s.trim()))
        expect(/^(\.v2-session|\.v2-setup|body:has\(\.v2-session\))/.test(sel), `unscoped selector: ${sel}`).toBe(true);
  });

  it('lets the alert win over the capture line: the rule that hides the cue must not match the alert', () => {
    expect(rules).toMatch(/:has\(\.capture-status\) > \.cue:not\(\.cue-alert\)\s*\{[^}]*display:\s*none/);
    expect(rules).toMatch(/:has\(\.cue-alert:not\(:empty\)\) > :not\(\.cue-alert\)/);
  });

  it('gives the camera a height of at most min(75vw, 420px) (a full 4:3 picture on a phone) and at least 150 px on a short phone', () => {
    expect(rules).toMatch(/\.viewfinder \.preview\s*\{[^}]*max-height:\s*max\(9\.4rem,/);
    expect(rules).toMatch(/min\(75vw, 420px, 100svh - 33rem\)/);
  });

  it('keeps the numbers at 72 px, and at 56 px (3.5 rem, never smaller) only on a short phone under 32 rem wide', () => {
    expect(rules).toMatch(/@media \(max-width: 31\.99rem\) and \(max-height: 41rem\)\s*\{[^@]*?\.v2-session \.readout-number\s*\{\s*font-size:\s*3\.5rem/);
    expect(rules.match(/\.readout-number\s*\{[^}]*font-size/g)).toHaveLength(1);
  });

  it('puts the camera on the left and the readings on the right on a wide screen (7fr, 5fr)', () => {
    expect(rules).toMatch(/minmax\(0, 7fr\)\s+minmax\(18rem, 5fr\)/);
  });

  it('makes the bar buttons 56 px high on a short screen', () => {
    expect(rules).toMatch(/@media \(max-height: 41rem\)[\s\S]*?\.session-bar \.btn\s*\{[^}]*min-height:\s*3\.5rem/);
  });

  it('swaps a status word with opacity and a 2 px blur, and with opacity only for reduced motion', () => {
    expect(rules).toMatch(/--t-swap:\s*180ms/);
    expect(rules).toMatch(/@keyframes status-swap\s*\{[^@]*blur\(2px\)/);
    const fade = /@keyframes status-fade\s*\{([^@]*?\}\s*\})/.exec(rules)![1]!;
    expect(fade).toMatch(/opacity/);
    expect(fade).not.toMatch(/transform|filter|translate|scale/);
    const reduced = rules.slice(rules.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(reduced).toMatch(/animation-name:\s*status-fade/);
    expect(rules).not.toMatch(/@keyframes[^{]*\{[^@]*(bounce|overshoot)/);
  });

  it('draws no verdict colour: no green or red hex in the file', () => {
    const colours = rules.match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g) ?? [];
    for (const c of colours) {
      const full = c.length === 4 ? [...c.slice(1)].map((x) => x + x).join('') : c.slice(1);
      const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
      const redish = r! > g! + 60 && r! > b! + 60;
      const greenish = g! > r! + 40 && g! > b! + 40;
      expect(redish || greenish, `${c} looks red or green`).toBe(false);
    }
  });
});

describe('A2: the number and its unit share one line and one baseline', () => {
  it('labels the angle "Knee bend", and keeps the estimate text in the same block as the number', () => {
    open();
    const angle = document.querySelector('.live-angle')!;
    expect(angle.querySelector('.v3-metric-label')).toHaveTextContent('Knee bend');
    expect(angle.querySelector('.v3-num b')).not.toBeNull();
    expect(document.querySelector('.counters .readout-caption')).toHaveTextContent('estimated angle, not a medical measurement');
  });

  it('writes the singular for one rep and the plural for two', () => {
    const source = mockSource();
    render(<Session exercise={{ ...HEEL_SLIDE, sets: 1, reps: 3 }} side="left" baselineDeg={0} source={source} sound={audioHarness().sound} onEnd={vi.fn()} />);
    const reps = () => `${document.querySelector('.live-reps .v3-num b')!.textContent} ${document.querySelector('.live-reps .v3-num span')!.textContent}`;
    expect(reps()).toBe('0 reps');
    playRep(source, 'left', 60);
    act(() => void vi.advanceTimersByTime(300));
    expect(reps()).toBe('1 rep');
  });

  it('never shows NaN or undefined before the first frame', () => {
    open();
    expect(document.body.textContent).not.toMatch(/NaN|undefined/);
    expect(document.querySelector('.live-angle .v3-num b')).toHaveTextContent('--');
  });

  it('uses a baseline-aligned line for the number and the unit', () => {
    expect(rules).toMatch(/\.readout-line\s*\{[^}]*align-items:\s*baseline/);
  });
});

describe('A4: the status chip', () => {
  it('shows a shape and one word, and leaves the live region empty when there is no text', () => {
    const { rerender } = render(<StatusLine icon="camera" text="" className="session-start" />);
    const line = document.querySelector('.status-line')!;
    expect(line).toHaveAttribute('role', 'status');
    expect(line).toBeEmptyDOMElement();
    rerender(<StatusLine icon="camera" text="Ready. Step into the view." className="session-start" />);
    expect(line.querySelector('svg')).not.toBeNull();
    expect(line.querySelector('.status-word')).toHaveTextContent('Ready. Step into the view.');
  });

  it('plays no sound and sets no inline style when the word changes', () => {
    const { rerender } = render(<StatusLine icon="camera" text="One" />);
    rerender(<StatusLine icon="camera" text="Two" />);
    expect(document.querySelector('.status-line')!.outerHTML).not.toMatch(/style=/);
  });

  it('starts the swap again for each new word: the word element is new', () => {
    const { rerender } = render(<StatusLine icon="camera" text="One" />);
    const first = document.querySelector('.status-word');
    rerender(<StatusLine icon="camera" text="Two" />);
    expect(document.querySelector('.status-word')).not.toBe(first);
  });

  it('shows the start step in the slot with the old words', () => {
    open();
    expect(document.querySelector('.status-slot .session-start')).toHaveTextContent('Asking for the camera and loading the pose model.');
  });
});

describe('A6: a camera problem shows in the frame, with one retry button', () => {
  it('puts the dead-stream notice in the frame, split into a title and one sentence', () => {
    const { source } = open();
    act(() => source.emit(legLandmarks('left', 20), 0));
    act(() => void vi.advanceTimersByTime(3000));
    const notice = document.querySelector('.notice[role="alert"]')!;
    expect(document.querySelector('.frame')!).toContainElement(notice as HTMLElement);
    expect(notice.querySelector('.notice-title')).toHaveTextContent('No camera image for 2 seconds.');
    expect(notice).toHaveTextContent('Check that the camera is on.');
    expect(screen.getAllByRole('button', { name: 'Try the camera again' })).toHaveLength(1);
  });
});

describe('limits', () => {
  it('shows no verdict word and no score on the live screen', () => {
    open();
    expect(hasVerdictWord(document.body.textContent ?? '')).toBeNull();
  });
});
