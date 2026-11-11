// P-LIVE: the angle text on the body map and the readout show one value (B-05).
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { legLandmarks } from '../helpers/leg';
import type { Exercise } from '../../src/lib/protocol';
import { BodyMap, resetBodyMapHidden, type BodyMapHandle } from '../../src/ui/BodyMap';
import { Session } from '../../src/ui/Session';
import { CAPTURE_TEXT, LEG_TEXT } from '../../src/ui/setupView';
import { HEEL_SLIDE, audioHarness, mockSource, twoLegs } from './helpers';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance', 'Date'] });
});
afterEach(() => {
  cleanup();
  resetBodyMapHidden();
  vi.useRealTimers();
});

const SLR: Exercise = { kind: 'straight-leg-raise', sets: 2, reps: 2, source: 'test' };

describe('B-05: one angle on the screen', () => {
  it('the map angle text equals the readout number while the knee moves', () => {
    const source = mockSource();
    const audio = audioHarness();
    const view = render(<Session exercise={SLR} side="left" baselineDeg={0} source={source} sound={audio.sound} onEnd={vi.fn()} />);
    for (let i = 0; i < 5; i++) act(() => source.emit(legLandmarks('left', 5), i * 33));
    // A fast jump: the filtered value lags behind the raw value.
    act(() => source.emit(legLandmarks('left', 70), 200));
    act(() => void vi.advanceTimersByTime(300));
    const readout = view.container.querySelector('.readout:not(.readout-reps) .readout-number')!.textContent!.trim();
    const mapText = view.container.querySelector('[data-k="arc-text"] tspan')!.textContent!.trim();
    expect(readout).not.toBe('--');
    expect(mapText.replace('°', '').trim()).toBe(readout);
  });

  // B2-01: the map redraws at frame rate and the readout every 250 ms. After EVERY frame the two must read the same.
  it('the map text equals the readout after every frame, also between two ticks', () => {
    const source = mockSource();
    const audio = audioHarness();
    const view = render(<Session exercise={SLR} side="left" baselineDeg={0} source={source} sound={audio.sound} onEnd={vi.fn()} />);
    const readout = () => view.container.querySelector('.readout:not(.readout-reps) .readout-number')!.textContent!.trim();
    const mapText = () => {
      const el = view.container.querySelector('[data-k="arc-text"]') as SVGElement;
      if (el.getAttribute('display') === 'none') return '--';
      return el.querySelector('tspan')!.textContent!.replace('°', '').trim();
    };
    let t = 0;
    for (let i = 0; i < 60; i++) {
      t += 33;
      act(() => source.emit(legLandmarks('left', 10 + ((i * 7) % 50)), t));
      act(() => void vi.advanceTimersByTime(33));
      expect(mapText(), `frame ${i}`).toBe(readout());
    }
    // no pose: both show nothing
    act(() => source.emit(null, t + 33));
    act(() => void vi.advanceTimersByTime(300));
    expect(readout()).toBe('--');
    expect(mapText()).toBe('--');
  });

  it('the map shows no angle text when the shown angle is null', () => {
    const handle = createRef<BodyMapHandle>();
    const v = render(<BodyMap ref={handle} leg="left" />);
    const arc = () => v.container.querySelector('[data-k="arc-text"]') as SVGElement;
    act(() => handle.current!.update(legLandmarks('left', 60), 0, 16 / 9, null));
    expect(arc().getAttribute('display')).toBe('none');
    act(() => handle.current!.update(legLandmarks('left', 60), 33, 16 / 9, 55));
    expect(arc().getAttribute('display')).not.toBe('none');
    expect(arc().textContent).toContain('55');
  });
});

describe('B-06: "Show your whole leg." does not flicker', () => {
  it('shows no cue for 3 null frames that are shorter than 500 ms', () => {
    const source = mockSource();
    const audio = audioHarness();
    const view = render(<Session exercise={SLR} side="left" baselineDeg={0} source={source} sound={audio.sound} onEnd={vi.fn()} />);
    act(() => source.emit(legLandmarks('left', 5), 0));
    for (const t of [30, 63, 96]) {
      act(() => source.emit(null, t));
      act(() => void vi.advanceTimersByTime(100));
      expect(view.container.textContent).not.toContain('Show your whole leg.');
    }
    act(() => source.emit(legLandmarks('left', 5), 130));
    act(() => void vi.advanceTimersByTime(300));
    expect(view.container.textContent).not.toContain('Show your whole leg.');
  });
});

describe('B-07: the moving-leg note for the seated hold', () => {
  const HOLD: Exercise = { kind: 'seated-extension-hold', sets: 1, reps: 1, holdSeconds: 5, minFlexion: 0, targetFlexion: 70, source: 'test' };
  const swing = (i: number) => 30 * (1 - Math.cos((2 * Math.PI * i) / 40));

  it('shows the note when the other leg moves more over two windows and the chosen leg stays still', () => {
    const source = mockSource();
    const audio = audioHarness();
    const view = render(<Session exercise={HOLD} side="right" baselineDeg={null} source={source} sound={audio.sound} onEnd={vi.fn()} />);
    let i = 0;
    for (let t = 0; t <= 13_000; t += 100, i++) act(() => source.emit(twoLegs(swing(i), 62), t));
    act(() => void vi.advanceTimersByTime(300));
    expect(view.container.textContent).toContain(LEG_TEXT.identity);
  });
});

// B3-01 (c, d), B3-03: after 4 s of far hips with the whole leg visible, the screen names both causes and offers one press.
describe('B3-01: Follow me again', () => {
  const TEXT = 'The camera can follow another person, or you moved. Press Follow me again, or stop and start again from Setup.';
  const open = (baselineDeg: number | null) => {
    const source = mockSource();
    const view = render(<Session exercise={HEEL_SLIDE} side="left" baselineDeg={baselineDeg} source={source} sound={audioHarness().sound} onEnd={vi.fn()} />);
    return { source, view };
  };
  const at = (x: number, deg = 20) => legLandmarks('left', deg, { hip: { x, y: 0.3 } });
  const feedAt = (source: ReturnType<typeof mockSource>, x: number, from: number, ms: number) => {
    let t = from;
    for (; t < from + ms; t += 100) act(() => source.emit(at(x, 20 + (t % 800) / 20), t));
    act(() => void vi.advanceTimersByTime(300));
    return t;
  };
  const readout = (view: ReturnType<typeof render>) => view.container.querySelector('.readout:not(.readout-reps) .readout-number')!.textContent!.trim();

  const OTHER = 'The camera is following someone else. Make sure that only you are in the camera view, then stop and start again from Setup.';
  const cue = (view: ReturnType<typeof render>) => view.container.querySelector('.status-slot .cue')!.textContent!.trim();

  it('shows nothing for a short lost time, then the button first and the text, and no "Show your whole leg." cue (B4-03, B4-04)', () => {
    const { source, view } = open(5);
    let t = feedAt(source, 0.7, 0, 1000);
    t = feedAt(source, 0.4, t, 3000);
    expect(view.container.textContent).not.toContain(TEXT);
    feedAt(source, 0.4, t, 2000);
    expect(readout(view)).toBe('--');
    expect(view.container.textContent).toContain(TEXT);
    expect(cue(view)).not.toContain('Show your whole leg.'); // B4-04: the lockout text replaces it
    const button = screen.getByRole('button', { name: 'Follow me again' });
    const text = screen.getByText(TEXT);
    expect(button.compareDocumentPosition(text) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy(); // B4-03: the button is above the text
    expect(button.closest('[role="status"]')).not.toBeNull();
    expect(view.container.querySelector('[role="alert"]')?.textContent ?? '').not.toContain('Follow me again');
  });

  it('B4-01: a press far from the start hip shows the other-person text and no numbers, and no button', () => {
    const { source, view } = open(5);
    let t = feedAt(source, 0.7, 0, 1000);
    t = feedAt(source, 0.4, t, 5000);
    fireEvent.click(screen.getByRole('button', { name: 'Follow me again' }));
    feedAt(source, 0.4, t, 1000);
    expect(readout(view)).toBe('--');
    expect(view.container.textContent).toContain(OTHER);
    expect(screen.queryByRole('button', { name: 'Follow me again' })).toBeNull();
    expect(cue(view)).not.toContain('Show your whole leg.');
  });

  it('B4-06: after the press the focus stays in the status text, not on the page body', () => {
    const { source } = open(5);
    let t = feedAt(source, 0.7, 0, 1000);
    t = feedAt(source, 0.4, t, 5000);
    fireEvent.click(screen.getByRole('button', { name: 'Follow me again' }));
    feedAt(source, 0.4, t, 1000);
    const active = document.activeElement as HTMLElement;
    expect(active).not.toBe(document.body);
    expect(active.getAttribute('role')).toBe('status');
    expect(active.getAttribute('tabindex')).toBe('-1');
  });

  it('B4-05: the text stays 500 ms after the lock ends, so a short blip never flashes it, and then it goes', () => {
    const { source, view } = open(5);
    let t = feedAt(source, 0.7, 0, 1000);
    t = feedAt(source, 0.4, t, 5000);
    expect(view.container.textContent).toContain(TEXT);
    // the hip comes back to the anchor place for 300 ms
    for (let u = t + 300; t < u; t += 100) act(() => source.emit(at(0.7), t));
    act(() => void vi.advanceTimersByTime(250));
    expect(view.container.textContent).toContain(TEXT);
    for (let u = t + 1000; t < u; t += 100) act(() => source.emit(at(0.7), t));
    act(() => void vi.advanceTimersByTime(300));
    expect(view.container.textContent).not.toContain(TEXT);
  });

  it('d: the lowest-angle button is not offered while the person is locked out', () => {
    const { source, view } = open(null);
    const t = feedAt(source, 0.7, 0, 2000);
    feedAt(source, 0.4, t, 16000);
    expect(view.container.textContent).toContain(TEXT);
    const b = screen.queryByRole('button', { name: CAPTURE_TEXT.lowestButton });
    expect(b === null || (b as HTMLButtonElement).disabled).toBe(true);
  });
});
