import { MARGIN_SOURCE } from '../../src/lib/margin';
import { act } from '@testing-library/react';
import { vi } from 'vitest';
import example from '../../src/lib/protocol/example-protocol.json';
import type { Exercise } from '../../src/lib/protocol';
import type { Side } from '../../src/lib/angle';
import type { FrameHandler, LandmarkSource, StartResult } from '../../src/pose/source';
import { createDb } from '../../src/lib/storage';
import { createSound } from '../../src/ui/sound';
import { legLandmarks } from '../helpers/leg';

let counter = 0;
export const freshDb = () => createDb(`ui-test-${Date.now()}-${counter++}`);

/** A protocol file text. An approved, non-example file by default. */
export function protocolText(over: Record<string, unknown> = {}): string {
  const base = { ...example, example: undefined, authoredBy: 'Test clinic', approvedOn: '2026-01-02' };
  return JSON.stringify({ ...base, ...over });
}

export const exampleText = () => JSON.stringify(example);

export function fileOf(text: string, name = 'protocol.json'): File {
  return new File([text], name, { type: 'application/json' });
}

export const HEEL_SLIDE: Exercise = {
  kind: 'heel-slide',
  sets: 3,
  reps: 10,
  targetFlexion: 60,
  maxFlexion: 90,
  returnWithinDeg: 18,
  minRepSeconds: 2,
  source: 'test',
};

export interface MockSource extends LandmarkSource {
  start: ReturnType<typeof vi.fn<LandmarkSource['start']>>;
  stop: ReturnType<typeof vi.fn<LandmarkSource['stop']>>;
  emit: FrameHandler;
  probe: ReturnType<typeof vi.fn<(ms: number) => void>>;
  nextStart: StartResult;
}

export function mockSource(): MockSource {
  let handler: FrameHandler | null = null;
  const source = {
    view: 'side' as const,
    nextStart: { ok: true } as StartResult,
    start: vi.fn(async (h: FrameHandler) => {
      handler = h;
      return source.nextStart;
    }),
    stop: vi.fn(),
    aspect: () => 16 / 9,
    emit: (landmarks, t, extra) => handler?.(landmarks, t, extra),
    probe: vi.fn(),
  } as MockSource;
  return source;
}

/** Feed one rep to the source: rest, rise to `peak`, hold, return. 100 ms between frames, so the rep is slower than the minimum rep time. Returns the next time. */
export function playRep(source: MockSource, side: Side, peak: number, t0 = 0): number {
  let t = t0;
  const frame = (flexion: number) => {
    act(() => source.emit(legLandmarks(side, flexion), t));
    t += 100;
  };
  for (let i = 0; i < 10; i++) frame(0);
  for (let i = 1; i <= 10; i++) frame((peak * i) / 10);
  for (let i = 0; i < 25; i++) frame(peak);
  for (let i = 9; i >= 0; i--) frame((peak * i) / 10);
  for (let i = 0; i < 25; i++) frame(0);
  return t;
}

export const sessionInput = (): import('../../src/lib/storage').SessionInput => ({
  date: '2026-03-01T10:00:00.000Z',
  exercise: 'heel-slide',
  side: 'left',
  reps: 3,
  peakFlexion: 50,
  holdSeconds: null,
  topFlexion: null,
  marginDeg: 9,
  marginSource: MARGIN_SOURCE,
  view: 'side',
  nearLimit: 0,
  overLimit: 0,
  tooFast: 0,
  gaveWayPresses: 0,
  redFlagBlocks: 0,
  pain: 2,
  swelling: 'none',
  protocolId: 'example-001',
  phase: 1,
});

/** A real sound object over a fake AudioContext. `oscillators` counts the beeps. */
export function audioHarness() {
  const oscillators: { frequency: { value: number }; start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }[] = [];
  const ctx = {
    currentTime: 0,
    state: 'running',
    destination: {},
    resume: vi.fn(async () => undefined),
    close: vi.fn(async () => undefined),
    createOscillator: vi.fn(() => {
      const osc = { frequency: { value: 0 }, type: 'sine', connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
      oscillators.push(osc);
      return osc;
    }),
    createGain: vi.fn(() => ({
      gain: { value: 1, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
    })),
  };
  const factory = vi.fn(() => ctx as unknown as AudioContext);
  return { sound: createSound(factory), factory, oscillators };
}

/** The setup frames of a leg that the check accepts: the whole leg, big enough, side-on. */
export const readyLeg = () => legLandmarks('left', 20, { length: 0.3, hip: { x: 0.5, y: 0.2 } });

/** Setup frames of the chosen leg that the check accepts, for either side. */
export const readyLegOf = (side: Side, flexion = 20) => legLandmarks(side, flexion, { length: 0.3, hip: { x: 0.5, y: 0.2 } });

/** One frame with both legs shown. A flexion of null hides that leg. The hip and the line from hip to ankle stay still. */
export function twoLegs(left: number | null, right: number | null) {
  const a = legLandmarks('left', left ?? 0, { length: 0.3, hip: { x: 0.5, y: 0.2 } });
  const b = legLandmarks('right', right ?? 0, { length: 0.3, hip: { x: 0.5, y: 0.2 } });
  if (left === null) [23, 25, 27].forEach((i) => (a[i] = { ...a[i]!, visibility: 0.1 }));
  if (right === null) [24, 26, 28].forEach((i) => (b[i] = { ...b[i]!, visibility: 0.1 }));
  return a.map((p, k) => (k === 24 || k === 26 || k === 28 ? b[k]! : p));
}
