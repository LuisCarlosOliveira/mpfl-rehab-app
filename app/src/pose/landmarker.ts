// MediaPipe PoseLandmarker: lite model, VIDEO mode, 1 pose.
// The WASM files and the model come from the own origin (public/models/).
// Hashes of these files are in public/models/SHA256SUMS and docs/model.md.
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import type { Landmark } from '../lib/angle';

const WASM_DIR = '/models/wasm';
const MODEL_PATH = '/models/pose_landmarker_lite.task';

export interface Landmarker {
  /** The 33 landmarks of the first pose, or null if no pose is found. */
  detect(video: HTMLVideoElement, timestampMs: number): Landmark[] | null;
  close(): void;
}

let installed: typeof fetch | undefined;
let original: typeof fetch | undefined;
let users = 0;

/**
 * MediaPipe sends usage metrics to odml.pa.googleapis.com with fetch (on close and every 60 s).
 * The CSP blocks this, but the block is a violation report. Fail such a request before it
 * leaves, so that no request goes to a foreign origin (NFR1). MediaPipe stops logging after the error.
 * The guard covers fetch only. The CSP covers the other ways to send data.
 * createLandmarker keeps the guard while a landmarker runs and removes it after the last close.
 */
export function blockForeignFetch(): void {
  if (globalThis.fetch === installed) return;
  const real = globalThis.fetch.bind(globalThis);
  original = globalThis.fetch;
  installed = (input, init) => {
    try {
      const url = new URL(input instanceof Request ? input.url : String(input), location.href);
      if (url.origin !== location.origin) throw new TypeError('Blocked: foreign origin');
    } catch (err) {
      // A bad URL fails closed, as a rejected promise like fetch does.
      return Promise.reject(err instanceof TypeError ? err : new TypeError('Blocked: bad URL'));
    }
    return real(input, init);
  };
  globalThis.fetch = installed;
}

function releaseFetchGuard() {
  users -= 1;
  if (users > 0) return;
  if (original && globalThis.fetch === installed) globalThis.fetch = original;
  installed = undefined;
  original = undefined;
}

export async function createLandmarker(): Promise<Landmarker> {
  users += 1;
  blockForeignFetch();
  let pose: PoseLandmarker;
  try {
    const fileset = await FilesetResolver.forVisionTasks(WASM_DIR);
    pose = await PoseLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_PATH },
      runningMode: 'VIDEO',
      numPoses: 1,
    });
  } catch (err) {
    releaseFetchGuard();
    throw err;
  }
  // MediaPipe needs strictly increasing timestamps in VIDEO mode.
  let lastTs = -1;
  let closed = false;
  return {
    detect(video, timestampMs) {
      if (closed || timestampMs <= lastTs) return null;
      lastTs = timestampMs;
      const first = pose.detectForVideo(video, timestampMs).landmarks[0];
      if (!first || first.length === 0) return null;
      return first.map(({ x, y, visibility }) => ({ x, y, visibility }));
    },
    close() {
      if (closed) return;
      closed = true;
      pose.close();
      // close() sends the last metrics with fetch. The guard must still be there at that point.
      releaseFetchGuard();
    },
  };
}
