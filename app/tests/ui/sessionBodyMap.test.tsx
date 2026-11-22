import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { legLandmarks } from '../helpers/leg';
import type { Exercise } from '../../src/lib/protocol';
import { resetBodyMapHidden } from '../../src/ui/BodyMap';
import { Session } from '../../src/ui/Session';
import { HEEL_SLIDE, audioHarness, mockSource, type MockSource } from './helpers';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance', 'Date'] });
});
afterEach(() => {
  cleanup();
  resetBodyMapHidden();
  vi.useRealTimers();
});

const SLR: Exercise = { kind: 'straight-leg-raise', sets: 2, reps: 2, source: 'test' };
const SQUAT: Exercise = { kind: 'mini-squat', sets: 1, reps: 5, targetFlexion: 30, maxFlexion: 50, returnWithinDeg: 10, source: 'test' };
const HOLD: Exercise = { kind: 'seated-extension-hold', sets: 1, reps: 1, holdSeconds: 5, minFlexion: 0, targetFlexion: 60, source: 'test' };
const ALL: [string, Exercise][] = [
  ['heel slide', HEEL_SLIDE],
  ['straight leg raise', SLR],
  ['mini squat', SQUAT],
  ['seated hold', HOLD],
];

function setup(exercise: Exercise, source: MockSource = mockSource(), side: 'left' | 'right' = 'left') {
  const audio = audioHarness();
  const view = render(<Session exercise={exercise} side={side} baselineDeg={0} source={source} sound={audio.sound} onEnd={vi.fn()} />);
  const frame = () => view.container.querySelector('.frame') as HTMLElement;
  return { source, frame, ...view };
}

describe('the body map in Session', () => {
  it.each(ALL)('draws the map over the camera picture for the %s', (_name, exercise) => {
    const { frame } = setup(exercise);
    const map = frame().querySelector('svg.body-map');
    expect(map).not.toBeNull();
    expect(map!.getAttribute('aria-hidden')).toBe('true');
    expect(frame().querySelector('video')).not.toBeNull();
  });

  it('has the same switch as Setup, which removes and restores the map', () => {
    const { frame } = setup(HEEL_SLIDE);
    const toggle = screen.getByRole('checkbox', { name: 'Hide body map' });
    expect(toggle).not.toBeChecked();
    fireEvent.click(toggle);
    expect(frame().querySelector('svg.body-map')).toBeNull();
    fireEvent.click(toggle);
    expect(frame().querySelector('svg.body-map')).not.toBeNull();
  });

  // A row in the header made the title 0 px wide at 390 px, and a row under the picture left no room at 390 x 844 (measured in the real app).
  // The switch sits on the picture, so it takes no room in the first view.
  it('puts the switch on the camera picture, so it adds no row to the first view', () => {
    const { frame } = setup(HEEL_SLIDE);
    const toggle = screen.getByRole('checkbox', { name: 'Hide body map' });
    expect(frame().contains(toggle)).toBe(true);
    expect(toggle.closest('.session-head')).toBeNull();
  });

  it('moves the points of the chosen leg with the frames, without a canvas or an image', () => {
    const { source, frame } = setup(SLR);
    const knee = () => frame().querySelector('[data-k="left-j1"]') as SVGElement;
    act(() => source.emit(legLandmarks('left', 0, { hip: { x: 0.3, y: 0.7 }, thighAngle: 0 }), 0));
    const first = knee().getAttribute('cx');
    // A jump waits up to two updates (the spike filter of the map), so the leg stays at the new place for three frames.
    for (const t of [100, 200, 300]) act(() => source.emit(legLandmarks('left', 0, { hip: { x: 0.5, y: 0.7 }, thighAngle: 0 }), t));
    expect(knee().getAttribute('cx')).not.toBe(first);
    expect(frame().querySelector('canvas, image, foreignObject')).toBeNull();
  });

  it('draws nothing when no pose is found', () => {
    const { source, frame } = setup(SLR);
    act(() => source.emit(legLandmarks('left', 0), 0));
    act(() => source.emit(null, 100));
    expect(frame().querySelector('[data-k="left-j1"]')!.getAttribute('display')).toBe('none');
  });

  it('keeps one video element, with no mirror class (PREVIEW_MIRRORED is false)', () => {
    const { frame } = setup(HEEL_SLIDE);
    expect(frame().querySelectorAll('video')).toHaveLength(1);
    expect(frame().querySelector('video')!.className).not.toMatch(/mirrored/);
  });

  it('uses only neutral colour: no class of the map changes with the angle', () => {
    const { source, frame } = setup(HEEL_SLIDE);
    const classes = () => Array.from(frame().querySelectorAll('svg.body-map *')).map((e) => e.getAttribute('class')).join('|');
    act(() => source.emit(legLandmarks('left', 0), 0));
    const before = classes();
    act(() => source.emit(legLandmarks('left', 120), 100));
    expect(classes()).toBe(before);
  });
});
