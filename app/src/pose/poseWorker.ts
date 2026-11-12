// The pose worker. It loads the model, turns each picture it receives into landmark numbers, and closes the picture.
// It sends back numbers and a time only. It never sends a picture and it draws nothing.
// The main thread starts it from frameBridge.ts. The file builds as a classic worker, because MediaPipe loads its WASM loader with importScripts.
import type { FrameMessage, PosesMessage, WorkerMessage } from './frameBridge';
import { createLandmarker, type Landmarker } from './landmarker';

const send = (message: WorkerMessage) => postMessage(message);
let model: Landmarker | null = null;
let probing = false; // two poses for a short probe (B5-02)

createLandmarker((bytes) => send({ type: 'progress', bytes })).then(
  (made) => {
    model = made;
    send({ type: 'ready' });
  },
  () => send({ type: 'failed' }),
);

self.onmessage = ({ data }: MessageEvent<FrameMessage | PosesMessage>) => {
  if (data.type === 'poses') {
    probing = data.count === 2;
    void model?.setPoses(data.count);
    return;
  }
  const { bitmap, timestampMs } = data;
  try {
    // A picture before the model is ready is dropped.
    if (model && probing) {
      const [first, ...extra] = model.detectAll(bitmap, timestampMs);
      send({ type: 'result', timestampMs, landmarks: first ?? null, extra });
    } else if (model) send({ type: 'result', timestampMs, landmarks: model.detect(bitmap, timestampMs) });
  } catch {
    send({ type: 'failed' });
  } finally {
    bitmap.close();
  }
};
