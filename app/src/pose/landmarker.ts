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

/**
 * MediaPipe sends usage metrics to odml.pa.googleapis.com with fetch (on close and every 60 s).
 * The CSP blocks this, but the block is a violation report. Fail such a request before it
 * leaves, so that no request goes to a foreign origin (NFR1). MediaPipe stops logging after the error.
 */
export function blockForeignFetch(): void {
  if (globalThis.fetch === installed) return;
  const real = globalThis.fetch.bind(globalThis);
  installed = (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input), location.href);
    if (url.origin !== location.origin) return Promise.reject(new TypeError('Blocked: foreign origin'));
    return real(input, init);
  };
  globalThis.fetch = installed;
}

export async function createLandmarker(): Promise<Landmarker> {
  blockForeignFetch();
  const fileset = await FilesetResolver.forVisionTasks(WASM_DIR);
  const pose = await PoseLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: MODEL_PATH },
    runningMode: 'VIDEO',
    numPoses: 1,
  });
  // MediaPipe needs strictly increasing timestamps in VIDEO mode.
  let lastTs = -1;
  return {
    detect(video, timestampMs) {
      if (timestampMs <= lastTs) return null;
      lastTs = timestampMs;
      const first = pose.detectForVideo(video, timestampMs).landmarks[0];
      if (!first || first.length === 0) return null;
      return first.map(({ x, y, visibility }) => ({ x, y, visibility }));
    },
    close() {
      pose.close();
    },
  };
}
