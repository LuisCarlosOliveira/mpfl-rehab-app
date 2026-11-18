// MediaPipe PoseLandmarker: lite model, VIDEO mode, 1 pose. A probe of 2 poses runs for a short time only (B5-02).
// The worker runs the probe on a second instance of 2 poses, so the tracking instance never rebuilds (skeleton fix A).
// The WASM files and the model come from the own origin (public/models/).
// Hashes of these files are in public/models/SHA256SUMS and docs/model.md.
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import type { Landmark } from '../lib/angle';

const WASM_DIR = '/models/wasm';
const MODEL_PATH = '/models/pose_landmarker_lite.task';

export interface Landmarker {
  /** The 33 landmarks of the first pose, or null if no pose is found. The image is a video element, or a picture of one frame (the pose worker gets a picture). */
  detect(image: HTMLVideoElement | ImageBitmap, timestampMs: number): Landmark[] | null;
  /** The landmarks of every pose of the frame, the first one first. Use it while setPoses(2) is on. */
  detectAll(image: HTMLVideoElement | ImageBitmap, timestampMs: number): Landmark[][];
  /** Switch between one pose and two poses while the model runs. Two poses cost about half of the frame rate, so use it for a short probe only. */
  setPoses(count: 1 | 2): Promise<void>;
  close(): void;
}

let installed: typeof fetch | undefined;
let original: typeof fetch | undefined;
let users = 0;
/** The byte counter of the load that runs now. Missing means no counting. */
let onBytes: ((bytes: number) => void) | undefined;

/** Count the bytes of a response body as they arrive. The response stays usable (headers, status, body). */
function counted(res: Response): Response {
  const report = onBytes;
  if (!report || !res.ok || !res.body) return res;
  const counter = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      report(chunk.byteLength);
      controller.enqueue(chunk);
    },
  });
  return new Response(res.body.pipeThrough(counter), { status: res.status, statusText: res.statusText, headers: res.headers });
}

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
    return real(input, init).then(counted);
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

/** GPU is the default (about 2.5 times the frame rate on an Intel UHD 630). If the GPU start fails, retry once on the CPU. Both landmarkers use this. */
async function createWithFallback(fileset: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>, numPoses: 1 | 2): Promise<PoseLandmarker> {
  const make = (delegate: 'GPU' | 'CPU') =>
    PoseLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_PATH, delegate },
      runningMode: 'VIDEO',
      numPoses,
    });
  try {
    return await make('GPU');
  } catch {
    return make('CPU');
  }
}

/** `onProgress` is optional. It gets the size of each chunk of the files that load from the own origin. `poses` is 1, or 2 for the probe instance. */
export async function createLandmarker(onProgress?: (bytes: number) => void, poses: 1 | 2 = 1): Promise<Landmarker> {
  users += 1;
  blockForeignFetch();
  onBytes = onProgress;
  let pose: PoseLandmarker;
  try {
    const fileset = await FilesetResolver.forVisionTasks(WASM_DIR);
    pose = await createWithFallback(fileset, poses);
  } catch (err) {
    onBytes = undefined;
    releaseFetchGuard();
    throw err;
  }
  onBytes = undefined;
  // MediaPipe needs strictly increasing timestamps in VIDEO mode.
  let lastTs = -1;
  let closed = false;
  return {
    detect(image, timestampMs) {
      if (closed || timestampMs <= lastTs) return null;
      lastTs = timestampMs;
      const first = pose.detectForVideo(image, timestampMs).landmarks[0];
      if (!first || first.length === 0) return null;
      return first.map(({ x, y, visibility }) => ({ x, y, visibility }));
    },
    detectAll(image, timestampMs) {
      if (closed || timestampMs <= lastTs) return [];
      lastTs = timestampMs;
      return pose
        .detectForVideo(image, timestampMs)
        .landmarks.filter((one) => one.length > 0)
        .map((one) => one.map(({ x, y, visibility }) => ({ x, y, visibility })));
    },
    setPoses: (count) => (closed ? Promise.resolve() : pose.setOptions({ numPoses: count })),
    close() {
      if (closed) return;
      closed = true;
      pose.close();
      // close() sends the last metrics with fetch. The guard must still be there at that point.
      releaseFetchGuard();
    },
  };
}
