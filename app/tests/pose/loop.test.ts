import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { median, startPoseLoop } from '../../src/pose/loop';

describe('median', () => {
  it('handles empty, odd and even lists', () => {
    expect(median([])).toBe(0);
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
  });
});

function fakeVideo(withRvfc: boolean) {
  const cbs = new Map<number, (now: number) => void>();
  let id = 0;
  const v: Record<string, unknown> = { readyState: 4, currentTime: 0 };
  if (withRvfc) {
    v.requestVideoFrameCallback = (cb: (n: number) => void) => (cbs.set(++id, cb), id);
    v.cancelVideoFrameCallback = (h: number) => cbs.delete(h);
  }
  const fire = (now: number) => {
    const entries = [...cbs];
    cbs.clear();
    entries.forEach(([, cb]) => cb(now));
  };
  return { video: v as unknown as HTMLVideoElement, fire, pending: () => cbs.size, raw: v };
}

describe('startPoseLoop with requestVideoFrameCallback', () => {
  it('calls detect and onFrame for each frame, and computes median fps', () => {
    const f = fakeVideo(true);
    const detect = vi.fn(() => null);
    const onFrame = vi.fn();
    const { stats } = startPoseLoop({ video: f.video, detect, onFrame, onError: vi.fn() });
    for (let i = 1; i <= 10; i++) f.fire(i * 50); // 50 ms apart = 20 fps
    expect(detect).toHaveBeenCalledTimes(10);
    expect(onFrame).toHaveBeenCalledTimes(10);
    expect(stats.frames).toBe(10);
    expect(stats.medianFps()).toBeCloseTo(20, 5);
    expect(stats.medianDetectMs()).toBeGreaterThanOrEqual(0);
  });

  it('gives detect and onFrame the exact frame time of each video frame, in order', () => {
    const f = fakeVideo(true);
    const detectTimes: number[] = [];
    const frameTimes: number[] = [];
    startPoseLoop({
      video: f.video,
      detect: (_v, t) => (detectTimes.push(t), null),
      onFrame: (_lm, t) => void frameTimes.push(t),
      onError: vi.fn(),
    });
    for (const t of [1000, 1042.5, 1075, 1200]) f.fire(t);
    expect(detectTimes).toEqual([1000, 1042.5, 1075, 1200]);
    expect(frameTimes).toEqual(detectTimes);
  });

  it('asks for the next frame only after detect ended, so late frames are skipped and never queued', () => {
    const f = fakeVideo(true);
    const pendingDuringDetect: number[] = [];
    startPoseLoop({
      video: f.video,
      detect: () => (pendingDuringDetect.push(f.pending()), null),
      onFrame: vi.fn(),
      onError: vi.fn(),
    });
    f.fire(10);
    f.fire(20);
    expect(pendingDuringDetect).toEqual([0, 0]);
    expect(f.pending()).toBe(1);
  });

  it('does not call onFrame when detect gives no answer yet (the worker answers later)', () => {
    const f = fakeVideo(true);
    const onFrame = vi.fn();
    startPoseLoop({ video: f.video, detect: () => undefined, onFrame, onError: vi.fn() });
    f.fire(10);
    f.fire(20);
    expect(onFrame).not.toHaveBeenCalled();
    expect(f.pending()).toBe(1);
  });

  it('stop cancels the next callback', () => {
    const f = fakeVideo(true);
    const detect = vi.fn(() => null);
    const { stop } = startPoseLoop({ video: f.video, detect, onFrame: vi.fn(), onError: vi.fn() });
    f.fire(10);
    stop();
    expect(f.pending()).toBe(0);
    f.fire(20);
    expect(detect).toHaveBeenCalledTimes(1);
  });

  it('stops and reports if detect throws', () => {
    const f = fakeVideo(true);
    const err = new Error('boom');
    const onError = vi.fn();
    startPoseLoop({
      video: f.video,
      detect: () => {
        throw err;
      },
      onFrame: vi.fn(),
      onError,
    });
    f.fire(10);
    expect(onError).toHaveBeenCalledWith(err);
    expect(f.pending()).toBe(0);
  });

  it('skips detect while the video has no data', () => {
    const f = fakeVideo(true);
    f.raw.readyState = 1;
    const detect = vi.fn(() => null);
    startPoseLoop({ video: f.video, detect, onFrame: vi.fn(), onError: vi.fn() });
    f.fire(10);
    expect(detect).not.toHaveBeenCalled();
    expect(f.pending()).toBe(1);
  });
});

describe('startPoseLoop fallback to requestAnimationFrame', () => {
  let rafCbs: ((n: number) => void)[] = [];
  beforeEach(() => {
    rafCbs = [];
    vi.stubGlobal('requestAnimationFrame', (cb: (n: number) => void) => rafCbs.push(cb));
    vi.stubGlobal('cancelAnimationFrame', () => {
      rafCbs = [];
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('runs detect once for each new video frame only', () => {
    const f = fakeVideo(false);
    const detect = vi.fn(() => null);
    startPoseLoop({ video: f.video, detect, onFrame: vi.fn(), onError: vi.fn() });
    const run = (now: number) => rafCbs.splice(0).forEach((cb) => cb(now));
    f.raw.currentTime = 0.1;
    run(16);
    run(32); // same video frame
    f.raw.currentTime = 0.2;
    run(48);
    expect(detect).toHaveBeenCalledTimes(2);
  });
});
