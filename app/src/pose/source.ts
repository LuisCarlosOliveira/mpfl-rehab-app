// A source of landmarks. The Session screen reads from one source only.
// The app uses cameraSource(). Tests use a mock with the same shape.
// This file keeps no frame and no image. It passes landmark numbers and a time.
// The pose model loads on demand with import(), so the first screen stays small.
import type { Landmark } from '../lib/angle';
import { startCamera, stopCamera, type CameraError } from './camera';
import { startPoseLoop } from './loop';

export type SourceView = 'side';

export type FrameHandler = (landmarks: Landmark[] | null, timeMs: number) => void;

export type StartResult = { ok: true } | { ok: false; error: CameraError };

export interface LandmarkSource {
  readonly view: SourceView;
  /**
   * Start the camera (if it does not run yet) and call `onFrame` for each frame.
   * A second call while the source runs only replaces the handler and the preview element.
   * Pass a video element to show the preview. Without one, the source uses a hidden element.
   */
  start(onFrame: FrameHandler, preview?: HTMLVideoElement | null): Promise<StartResult>;
  /** Stop the loop and every camera track. It is safe to call at any time. */
  stop(): void;
  /** Width divided by height of the video. The angle function needs it. */
  aspect(): number;
}

const MODEL_ERROR: CameraError = {
  kind: 'other',
  message: 'The pose model could not load. Reload the page, then try again.',
};
const STOPPED: CameraError = { kind: 'other', message: 'The camera was stopped.' };
const DEFAULT_ASPECT = 16 / 9;

export function cameraSource(): LandmarkSource {
  type Landmarker = import('./landmarker').Landmarker;
  let landmarker: Landmarker | null = null;
  let stream: MediaStream | null = null;
  let element: HTMLVideoElement | null = null;
  let loop: ReturnType<typeof startPoseLoop> | null = null;
  let generation = 0; // a stop() during an await makes the older start() give up

  const stopLoop = () => {
    loop?.stop();
    loop = null;
  };

  const release = () => {
    generation += 1;
    stopLoop();
    landmarker?.close();
    landmarker = null;
    if (element) element.srcObject = null;
    element = null;
    stream = null;
    stopCamera();
  };

  return {
    view: 'side',
    async start(onFrame, preview) {
      const mine = ++generation;
      stopLoop();
      // The camera layer can end the tracks alone (tab hidden, device removed). Then ask again.
      if (stream && stream.getTracks().every((t) => t.readyState === 'ended')) stream = null;
      if (!stream) {
        const camera = await startCamera();
        if (mine !== generation) {
          if (camera.ok) camera.stream.getTracks().forEach((t) => t.stop());
          return { ok: false, error: STOPPED };
        }
        if (!camera.ok) return camera;
        stream = camera.stream;
      }
      if (!landmarker) {
        try {
          const { createLandmarker } = await import('./landmarker');
          const made = await createLandmarker();
          if (mine !== generation) {
            made.close();
            return { ok: false, error: STOPPED };
          }
          landmarker = made;
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
      loop = startPoseLoop({
        video,
        detect: (v, t) => model.detect(v, t),
        onFrame,
        onError: () => release(),
      });
      return { ok: true };
    },
    stop: release,
    aspect() {
      return element && element.videoWidth > 0 && element.videoHeight > 0
        ? element.videoWidth / element.videoHeight
        : DEFAULT_ASPECT;
    },
  };
}
