import type { Landmark } from '../lib/angle';

export interface FrameMessage {
  type: 'frame';
  bitmap: ImageBitmap;
  timestampMs: number;
}
/** Switch the model between one and two poses. */
export interface PosesMessage {
  type: 'poses';
  count: 1 | 2;
}
export type WorkerMessage =
  | { type: 'progress'; bytes: number }
  | { type: 'ready' }
  | { type: 'probe-ready' }
  | { type: 'failed' }
  | { type: 'result'; timestampMs: number; landmarks: Landmark[] | null; extra?: Landmark[][] };

/** The time the worker has to answer one frame. After it the bridge fails, so a silent worker cannot freeze the analysis. */
export const FRAME_REPLY_LIMIT_MS = 5000;

export interface FrameBridge {
  /** Send the frame that shows now. It does nothing while the last frame is still in work. */
  submit(video: HTMLVideoElement, timestampMs: number): void;
  /** One pose or two poses for the next frames. */
  setPoses(count: 1 | 2): void;
  /** End the worker and close every picture. It is safe to call twice. */
  close(): void;
}

export interface FrameBridgeOptions {
  onResult: (landmarks: Landmark[] | null, timestampMs: number, extra?: Landmark[][]) => void;
  /** The size of each chunk of the model files that the worker loads. */
  onProgress?: (bytes: number) => void;
  /** The worker has the 2-pose model of the probe ready (it makes the model at the first probe). */
  onProbeReady?: () => void;
  /** The worker failed after the start. The bridge is closed then. */
  onFail: () => void;
}

/**
 * Starts the pose worker and waits until the model is loaded.
 * Gives null when the browser has no Worker or no way to make a picture of a frame (the caller then uses the main thread).
 * Rejects when the worker cannot start or the model does not load in it.
 */
export function createFrameBridge({ onResult, onProgress, onProbeReady, onFail }: FrameBridgeOptions): Promise<FrameBridge | null> {
  const picture = globalThis.createImageBitmap?.bind(globalThis); // claims-check:allow
  if (typeof Worker === 'undefined' || !picture) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL('./poseWorker.ts', import.meta.url));
    } catch (err) {
      reject(err);
      return;
    }
    let started = false;
    let answered = false;
    let closed = false;
    let busy = false; // a picture is made or the worker works on one
    let last: { video: HTMLVideoElement; time: number } | null = null; // the video frame in work
    let lastTs = -Infinity;

    let watchdog: ReturnType<typeof setTimeout> | undefined;
    const stopWatchdog = () => clearTimeout(watchdog);

    const close = () => {
      closed = true;
      stopWatchdog();
      worker.terminate();
    };
    const fail = () => {
      if (closed) return;
      close();
      if (started) onFail();
      else reject(new Error('The pose worker could not start.'));
    };
    const submit = (video: HTMLVideoElement, timestampMs: number) => {
      if (busy || closed) return;
      busy = true;
      last = { video, time: video.currentTime };
      timestampMs = Math.max(timestampMs, lastTs + 0.01); // the model needs times that rise
      lastTs = timestampMs;
      stopWatchdog();
      if (answered) watchdog = setTimeout(fail, FRAME_REPLY_LIMIT_MS);
      picture(video).then(
        (bitmap) => {
          if (closed) return bitmap.close();
          const message: FrameMessage = { type: 'frame', bitmap, timestampMs };
          try {
            worker.postMessage(message, [bitmap]);
          } catch {
            bitmap.close();
            busy = false;
            fail();
          }
        },
        () => {
          busy = false; // a frame that cannot be read is dropped
          stopWatchdog();
        },
      );
    };
    worker.onerror = fail;
    worker.onmessage = ({ data }: MessageEvent<WorkerMessage>) => {
      if (closed) return;
      if (data.type === 'progress') onProgress?.(data.bytes);
      else if (data.type === 'probe-ready') onProbeReady?.();
      else if (data.type === 'failed') fail();
      else if (data.type === 'ready') {
        started = true;
        resolve({
          submit,
          close,
          setPoses: (count) => {
            if (!closed) worker.postMessage({ type: 'poses', count } satisfies PosesMessage);
          },
        });
      } else {
        busy = false;
        answered = true;
        stopWatchdog();
        // The handler gets a third argument only during the probe, so the usual call keeps its two arguments.
        if (data.extra) onResult(data.landmarks, data.timestampMs, data.extra);
        else onResult(data.landmarks, data.timestampMs);
        // The worker is free. Do not wait for the next tick: take the frame that shows now, if it is a new one.
        if (last && last.video.currentTime !== last.time) submit(last.video, performance.now());
      }
    };
  });
}
