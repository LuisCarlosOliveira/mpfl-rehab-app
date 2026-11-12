// A source of landmarks. The Session screen reads from one source only.
// The app uses cameraSource(). Tests use a mock with the same shape.
// This file keeps no frame and no image. It passes landmark numbers and a time.
// The pose model loads on demand with import(), so the first screen stays small.
// The model runs in a Web Worker (frameBridge.ts, poseWorker.ts). If the browser cannot run it there, the model runs on the main thread.
import type { Landmark } from '../lib/angle';
import { startCamera, stopCamera, type CameraError, type CameraOptions } from './camera';
import type { View } from '../lib/views';
import { startPoseLoop } from './loop';
import type { FrameBridge } from './frameBridge';

export type SourceView = View;

/** `extra` holds the other poses of the frame. It is there only during a probe (B5-02). */
export type FrameHandler = (landmarks: Landmark[] | null, timeMs: number, extra?: Landmark[][]) => void;

/** The step of the start that runs now. The model step carries the bytes that came in so far. */
export type StartProgress = { step: 'camera' } | { step: 'model'; loadedBytes: number };
export type ProgressHandler = (progress: StartProgress) => void;

export type StartResult = { ok: true } | { ok: false; error: CameraError };

export interface LandmarkSource {
  readonly view: SourceView;
  /**
   * Start the camera (if it does not run yet) and call `onFrame` for each frame.
   * A second call while the source runs only replaces the handler and the preview element.
   * Pass a video element to show the preview. Without one, the source uses a hidden element.
   * `onProgress` is optional. It names each start step that runs (the camera, then the model).
   */
  start(onFrame: FrameHandler, preview?: HTMLVideoElement | null, onProgress?: ProgressHandler): Promise<StartResult>;
  /** Stop the loop and every camera track. It is safe to call at any time. */
  stop(): void;
  /** Return two poses for `ms` milliseconds, then one pose again (B5-02). Frames carry `extra` during that time. A source may omit it. */
  probe?(ms: number): void;
  /** Width divided by height of the video. The angle function needs it. */
  aspect(): number;
}

const MODEL_ERROR: CameraError = {
  kind: 'other',
  message: 'The pose model could not load. Reload the page, then try again.',
};
const STOPPED: CameraError = { kind: 'other', message: 'The camera was stopped.' };
const DEFAULT_ASPECT = 16 / 9;
const REPORT_EVERY_MS = 200; // the screen gets the byte count at most 5 times each second

// Build flag. VITE_POSE_WORKER=off builds the app with the model on the main thread.
const WORKER_DEFAULT = import.meta.env.VITE_POSE_WORKER !== 'off';

export interface CameraSourceOptions extends CameraOptions {
  /** The view tag of this camera. The default is the side view. */
  view?: SourceView;
  /** Run the model in a Web Worker. The default is the build flag. The source falls back to the main thread when the worker cannot run. */
  worker?: boolean;
}

export function cameraSource({ view = 'side', worker = WORKER_DEFAULT, ...cameraOptions }: CameraSourceOptions = {}): LandmarkSource {
  const options = Object.keys(cameraOptions).length > 0 ? cameraOptions : undefined;
  type Landmarker = import('./landmarker').Landmarker;
  let landmarker: Landmarker | null = null;
  let bridge: FrameBridge | null = null;
  let handler: FrameHandler | null = null; // the worker answers to the handler of the latest start
  let stream: MediaStream | null = null;
  let element: HTMLVideoElement | null = null;
  let loop: ReturnType<typeof startPoseLoop> | null = null;
  let generation = 0;
  let probeTimer: ReturnType<typeof setTimeout> | null = null;
  let probing = false; // the main-thread model returns two poses
  let extraPoses: Landmark[][] | undefined; // a stop() during an await makes the older start() give up

  const stopLoop = () => {
    loop?.stop();
    loop = null;
  };

  const endProbe = () => {
    if (probeTimer !== null) clearTimeout(probeTimer);
    probeTimer = null;
    probing = false;
    extraPoses = undefined;
    if (bridge) bridge.setPoses(1);
    else void landmarker?.setPoses(1);
  };

  const release = () => {
    if (probeTimer !== null) clearTimeout(probeTimer);
    probeTimer = null;
    probing = false;
    generation += 1;
    stopLoop();
    landmarker?.close();
    landmarker = null;
    bridge?.close();
    bridge = null;
    handler = null;
    if (element) element.srcObject = null;
    element = null;
    stream = null;
    stopCamera();
  };

  return {
    view,
    async start(onFrame, preview, onProgress) {
      const mine = ++generation;
      stopLoop();
      // The camera layer can end the tracks alone (tab hidden, device removed). Then ask again.
      if (stream && stream.getTracks().every((t) => t.readyState === 'ended')) stream = null;
      if (!stream) {
        onProgress?.({ step: 'camera' });
        const camera = await startCamera(options);
        if (mine !== generation) {
          if (camera.ok) camera.stream.getTracks().forEach((t) => t.stop());
          return { ok: false, error: STOPPED };
        }
        if (!camera.ok) return camera;
        stream = camera.stream;
      }
      handler = onFrame;
      if (!landmarker && !bridge) {
        let loaded = 0;
        let lastReport = performance.now();
        const report =
          onProgress &&
          ((bytes: number) => {
            loaded += bytes;
            const now = performance.now();
            if (now - lastReport < REPORT_EVERY_MS) return;
            lastReport = now;
            onProgress({ step: 'model', loadedBytes: loaded });
          });
        onProgress?.({ step: 'model', loadedBytes: 0 });
        try {
          if (worker) {
            const { createFrameBridge } = await import('./frameBridge');
            const made = await createFrameBridge({
              onResult: (landmarks, timeMs, extra) => (extra ? handler?.(landmarks, timeMs, extra) : handler?.(landmarks, timeMs)),
              onProgress: report,
              onFail: release,
            }).catch(() => null); // no worker, or it cannot start: use the main thread
            if (mine !== generation) {
              made?.close();
              return { ok: false, error: STOPPED };
            }
            bridge = made;
          }
          if (!bridge) {
            const { createLandmarker } = await import('./landmarker');
            const made = await createLandmarker(report);
            if (mine !== generation) {
              made.close();
              return { ok: false, error: STOPPED };
            }
            landmarker = made;
          }
        } catch {
          release();
          return { ok: false, error: MODEL_ERROR };
        }
      }
      const video = preview ?? document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.srcObject = stream;
      element = video;
      void video.play().catch(() => undefined);
      const model = landmarker;
      const sender = bridge;
      loop = startPoseLoop({
        video,
        detect: sender
          ? (v, t) => (sender.submit(v, t), undefined)
          : (v, t) => {
              if (!probing) return model!.detect(v, t);
              const [first, ...rest] = model!.detectAll(v, t);
              extraPoses = rest;
              return first ?? null;
            },
        onFrame: (landmarks, timeMs) => (probing && extraPoses ? onFrame(landmarks, timeMs, extraPoses) : onFrame(landmarks, timeMs)),
        onError: () => release(),
      });
      return { ok: true };
    },
    stop: release,
    probe(ms) {
      if (!bridge && !landmarker) return;
      if (probeTimer !== null) clearTimeout(probeTimer);
      probing = !bridge; // the main-thread loop reads this
      if (bridge) bridge.setPoses(2);
      else void landmarker?.setPoses(2);
      probeTimer = setTimeout(endProbe, ms);
    },
    aspect() {
      return element && element.videoWidth > 0 && element.videoHeight > 0
        ? element.videoWidth / element.videoHeight
        : DEFAULT_ASPECT;
    },
  };
}
