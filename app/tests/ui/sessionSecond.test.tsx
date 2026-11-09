// T12b: the second camera in the Session screen (FR24, FR25).
// The chip shows the status. The front-view change goes to the record for the clinician. Patient screens never show it.
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Landmark, Side } from '../../src/lib/angle';
import { FALLBACK_TEXT } from '../../src/lib/pairing';
import type { FrameHandler, LandmarkSource, StartResult } from '../../src/pose/source';
import type { PairingStatus } from '../../src/pairing/pairing';
import { Session, type SecondView } from '../../src/ui/Session';
import { HEEL_SLIDE, audioHarness, mockSource, playRep, type MockSource } from './helpers';
import { hasVerdictWord } from './verdict';

beforeEach(() => vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance', 'Date'] }));
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

interface MockSecond extends LandmarkSource {
  start: ReturnType<typeof vi.fn<LandmarkSource['start']>>;
  stop: ReturnType<typeof vi.fn<LandmarkSource['stop']>>;
  emit: FrameHandler;
}

function mockSecond(): MockSecond {
  let handler: FrameHandler | null = null;
  const source = {
    view: 'front' as const,
    start: vi.fn(async (h: FrameHandler): Promise<StartResult> => {
      handler = h;
      return { ok: true };
    }),
    stop: vi.fn(),
    aspect: () => 9 / 16,
    emit: (landmarks, t) => handler?.(landmarks, t),
  } as MockSecond;
  return source;
}

const IDS: Record<Side, [number, number, number]> = { left: [23, 25, 27], right: [24, 26, 28] };

/** A front frame with the knee alignment `deg`. The image is not mirrored. */
function frontFrame(side: Side, deg: number): Landmark[] {
  const m = side === 'right' ? 1 : -1;
  const tilt = (deg / 2) * (Math.PI / 180);
  const aspect = 9 / 16;
  const hip = { x: 0.5, y: 0.3 };
  const knee = { x: hip.x + (m * 0.2 * Math.sin(tilt)) / aspect, y: hip.y + 0.2 * Math.cos(tilt) };
  const ankle = { x: knee.x - (m * 0.2 * Math.sin(tilt)) / aspect, y: knee.y + 0.2 * Math.cos(tilt) };
  const out: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 0 }));
  const [h, k, a] = IDS[side];
  out[h] = { ...hip, visibility: 1 };
  out[k] = { ...knee, visibility: 1 };
  out[a] = { ...ankle, visibility: 1 };
  return out;
}

/** Front frames every 100 ms. In each 8 s cycle the knee alignment stays at 0 until 3 s, then rises to 10 degrees. */
function frontFrames(second: MockSecond, side: Side, to = 7000) {
  for (let t = 0; t <= to; t += 100) act(() => second.emit(frontFrame(side, t % 8000 < 3000 ? 0 : Math.min(10, ((t % 8000) - 3000) / 200)), t));
}

/** Three reps of the side view, one after the other. This is the engineering minimum of reps for a front-view value. */
function playThreeReps(source: MockSource, side: Side) {
  let t = 0;
  for (let i = 0; i < 3; i++) t = playRep(source, side, 60, t);
}

function setup(over: { status?: PairingStatus; message?: string | null; side?: Side; withSecond?: boolean } = {}) {
  const source: MockSource = mockSource();
  const second = mockSecond();
  const onEnd = vi.fn();
  const audio = audioHarness();
  const props = (status: PairingStatus, message: string | null = null): SecondView => ({ source: second, status, message });
  const view = (status: PairingStatus, message: string | null = null) => (
    <Session
      exercise={HEEL_SLIDE}
      side={over.side ?? 'left'}
      baselineDeg={0}
      source={source}
      second={over.withSecond === false ? undefined : props(status, message)}
      sound={audio.sound}
      onEnd={onEnd}
    />
  );
  const rendered = render(view(over.status ?? 'connected', over.message ?? null));
  return { ...rendered, source, second, onEnd, rerender: (s: PairingStatus, m: string | null = null) => rendered.rerender(view(s, m)) };
}

const text = () => document.body.textContent ?? '';
const endRecord = (onEnd: ReturnType<typeof vi.fn>) => onEnd.mock.calls[0]![1] as { front?: { reps: number; changeDeg?: number } };

describe('Session with a second camera', () => {
  it('shows the status chip "Second camera connected" when the phone is connected', () => {
    setup();
    expect(screen.getByText('Second camera connected')).toBeInTheDocument();
  });

  it.each(['idle', 'starting', 'offer', 'connecting', 'failed', 'closed', 'skipped'] as const)('shows no chip when the status is %s', (status) => {
    setup({ status });
    expect(screen.queryByText('Second camera connected')).toBeNull();
  });

  it('shows no chip and starts nothing when there is no second camera', () => {
    const { second } = setup({ withSecond: false });
    expect(screen.queryByText(/second camera/i)).toBeNull();
    expect(second.start).not.toHaveBeenCalled();
  });

  it('starts the second source once after the first, and only when connected', () => {
    const { source, second } = setup();
    expect(second.start).toHaveBeenCalledTimes(1);
    expect(source.start.mock.invocationCallOrder[0]!).toBeLessThan(second.start.mock.invocationCallOrder[0]!);
    cleanup();
    const other = setup({ status: 'connecting' });
    expect(other.second.start).not.toHaveBeenCalled();
  });

  it('stops the second source on Stop and on unmount', () => {
    const a = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(a.second.stop).toHaveBeenCalled();
    cleanup();
    const b = setup();
    expect(b.second.stop).not.toHaveBeenCalled();
    b.unmount();
    expect(b.second.stop).toHaveBeenCalled();
  });

  it('keeps the camera and the count when the link fails, and shows the fixed text once', () => {
    const { source, second, rerender } = setup();
    playRep(source, 'left', 60);
    rerender('failed', FALLBACK_TEXT);
    expect(screen.queryByText('Second camera connected')).toBeNull();
    expect(screen.getAllByText(FALLBACK_TEXT)).toHaveLength(1);
    expect(second.stop).toHaveBeenCalled();
    expect(source.stop).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Stop' })).toBeEnabled();
  });

  it('says that the second camera stopped when the phone stops during the session', () => {
    const { rerender } = setup();
    rerender('closed');
    expect(screen.getByText(/second camera stopped/i)).toBeInTheDocument();
    expect(screen.queryByText('Second camera connected')).toBeNull();
  });

  it('does not say it stopped when it never connected', () => {
    setup({ status: 'closed' });
    expect(screen.queryByText(/second camera stopped/i)).toBeNull();
  });
});

describe('the front-view change goes to the record, for the clinician only', () => {
  it('adds the reps with a value and the median change to the end summary', () => {
    const { source, second, onEnd } = setup();
    frontFrames(second, 'left', 24_500);
    playThreeReps(source, 'left');
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    const front = endRecord(onEnd).front;
    expect(front?.reps).toBe(3);
    expect(front?.changeDeg).toBeGreaterThan(5);
    expect(front?.changeDeg).toBeLessThan(11);
  });

  it('adds nothing when the second camera sent no frame', () => {
    const { source, onEnd } = setup();
    playRep(source, 'left', 60);
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(endRecord(onEnd).front).toBeUndefined();
  });

  it('adds nothing when there is no second camera, even if a front-like source exists', () => {
    const { source, onEnd } = setup({ withSecond: false });
    playRep(source, 'left', 60);
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(endRecord(onEnd).front).toBeUndefined();
  });

  it('follows the leg that the person chose, not the other leg', () => {
    const { source, second, onEnd } = setup({ side: 'right' });
    frontFrames(second, 'left'); // only the left leg is seen in the front view
    playRep(source, 'right', 60);
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(endRecord(onEnd).front).toEqual({ reps: 0 });
  });

  it('keeps the record when the link fails after the data came in', () => {
    const { source, second, onEnd, rerender } = setup();
    frontFrames(second, 'left');
    rerender('failed', FALLBACK_TEXT);
    playRep(source, 'left', 60);
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(endRecord(onEnd).front?.reps).toBe(1);
  });

  it('shows no front-view number and no word like valgus on the Session screen', () => {
    const { source, second } = setup();
    frontFrames(second, 'left');
    playRep(source, 'left', 60);
    act(() => void vi.advanceTimersByTime(300));
    expect(text()).not.toMatch(/valgus|inward|front|knee alignment|collapse/i);
    expect(text()).not.toMatch(/\b(9|10|11)\.\d\b/); // a change near 10 degrees shows as a decimal here
    expect(hasVerdictWord(text())).toBeNull();
  });
});
