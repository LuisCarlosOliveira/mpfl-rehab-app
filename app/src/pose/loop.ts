// Frame loop. Plan section 3.1 (pose loop rule):
// The landmark loop writes to a ref or a canvas. It must NOT set React state
// at frame rate. React state updates at most 4 times each second.
// The onFrame callback is the concern of the caller: keep it cheap and
// throttle any state update there.
import type { Landmark } from '../lib/angle';

export interface LoopStats {
  frames: number;
  longTasks: number;
  /** Median frames per second over the last WINDOW frames. */
  medianFps(): number;
  /** Median time of detect() in ms over the last WINDOW frames. */
  medianDetectMs(): number;
}

const WINDOW = 120;

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

function push(arr: number[], v: number) {
  arr.push(v);
  if (arr.length > WINDOW) arr.shift();
}

export interface LoopOptions {
  video: HTMLVideoElement;
  /** `undefined` means the answer comes later, from the pose worker. The loop calls no onFrame then. */
  detect: (video: HTMLVideoElement, timestampMs: number) => Landmark[] | null | undefined;
  onFrame: (landmarks: Landmark[] | null, timestampMs: number) => void;
  /** Called once if detect throws. The loop stops first. */
  onError: (err: unknown) => void;
}

export function startPoseLoop({ video, detect, onFrame, onError }: LoopOptions) {
  const intervals: number[] = [];
  const detectTimes: number[] = [];
  const stats: LoopStats = {
    frames: 0,
    longTasks: 0,
    medianFps: () => {
      const m = median(intervals);
      return m > 0 ? 1000 / m : 0;
    },
    medianDetectMs: () => median(detectTimes),
  };

  let observer: PerformanceObserver | undefined;
  try {
    observer = new PerformanceObserver((list) => {
      stats.longTasks += list.getEntries().length;
    });
    observer.observe({ entryTypes: ['longtask'] });
  } catch {
    observer = undefined; // longtask is not supported in this browser
  }

  let stopped = false;
  let handle = 0;
  let lastNow = 0;
  let lastMediaTime = -1;
  const hasRvfc = typeof video.requestVideoFrameCallback === 'function';

  const schedule = () => {
    handle = hasRvfc ? video.requestVideoFrameCallback(tick) : requestAnimationFrame(tick);
  };

  function tick(now: number) {
    if (stopped) return;
    // rAF can fire more than once for one video frame. Skip repeats.
    const fresh = hasRvfc || video.currentTime !== lastMediaTime;
    if (fresh && video.readyState >= 2) {
      lastMediaTime = video.currentTime;
      try {
        const t0 = performance.now();
        const landmarks = detect(video, now);
        push(detectTimes, performance.now() - t0);
        if (lastNow > 0) push(intervals, now - lastNow);
        lastNow = now;
        stats.frames++;
        if (landmarks !== undefined) onFrame(landmarks, now);
      } catch (err) {
        stop();
        onError(err);
        return;
      }
    }
    // onFrame can call stop. Do not schedule again then.
    if (!stopped) schedule();
  }

  function stop() {
    if (stopped) return;
    stopped = true;
    observer?.disconnect();
    if (hasRvfc) video.cancelVideoFrameCallback(handle);
    else cancelAnimationFrame(handle);
  }

  schedule();
  return { stop, stats };
}
