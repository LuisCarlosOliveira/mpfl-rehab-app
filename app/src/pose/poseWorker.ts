// The pose worker. It loads the model, turns each picture it receives into landmark numbers, and closes the picture.
// It sends back numbers and a time only. It never sends a picture and it draws nothing.
// The main thread starts it from frameBridge.ts. The file builds as a classic worker, because MediaPipe loads its WASM loader with importScripts.
import type { FrameMessage, PosesMessage, WorkerMessage } from './frameBridge';
import { createLandmarker, type Landmarker } from './landmarker';

const send = (message: WorkerMessage) => postMessage(message);
let model: Landmarker | null = null;
let probing = false; // two poses for a short probe (B5-02)
// The probe runs on its own 2-pose model. The tracking model keeps its 1 pose and is never rebuilt (a rebuild took 400 to 650 ms, twice
// for each probe). The probe frames go to the 2-pose model only. The tracking model takes the next frame when the probe ends. The model is made at the first probe and closed after PROBE_GRACE_MS without a probe.
// ENGINEERING: the grace is longer than REPROBE_MS (10 s) of exercises.ts, so the repeated probes of "someone else" reuse the model.
const PROBE_GRACE_MS = 15000;
let probeModel: Landmarker | null = null;
let probeLoading = false;
let closeTimer: ReturnType<typeof setTimeout> | null = null;

const scheduleClose = () => {
  if (closeTimer !== null) clearTimeout(closeTimer);
  closeTimer = setTimeout(() => {
    closeTimer = null;
    probeModel?.close();
    probeModel = null;
  }, PROBE_GRACE_MS);
};
const startProbe = () => {
  probing = true;
  if (probeModel) send({ type: 'probe-ready' });
  if (closeTimer !== null) clearTimeout(closeTimer);
  closeTimer = null;
  if (probeModel || probeLoading) return;
  probeLoading = true;
  // Frames before the model is ready get a plain result (no `extra`), and the tracking goes on.
  createLandmarker(undefined, 2).then(
    (made) => {
      probeLoading = false;
      probeModel = made;
      if (probing) send({ type: 'probe-ready' });
      else scheduleClose();
    },
    () => {
      probeLoading = false; // the next probe tries again
    },
  );
};

createLandmarker((bytes) => send({ type: 'progress', bytes })).then(
  (made) => {
    model = made;
    send({ type: 'ready' });
  },
  () => send({ type: 'failed' }),
);

self.onmessage = ({ data }: MessageEvent<FrameMessage | PosesMessage>) => {
  if (data.type === 'poses') {
    if (data.count === 2) startProbe();
    else {
      probing = false;
      if (probeModel) scheduleClose();
    }
    return;
  }
  const { bitmap, timestampMs } = data;
  try {
    // A picture before the model is ready is dropped.
    if (model && probing && probeModel) {
      // One inference for each probe frame, as before. Two (1 pose and 2 poses) halved the frames of the probe: 3 to 5 in 2 s, and 5 are needed.
      const [first, ...extra] = probeModel.detectAll(bitmap, timestampMs);
      send({ type: 'result', timestampMs, landmarks: first ?? null, extra });
    } else if (model) send({ type: 'result', timestampMs, landmarks: model.detect(bitmap, timestampMs) });
  } catch {
    send({ type: 'failed' });
  } finally {
    bitmap.close();
  }
};
