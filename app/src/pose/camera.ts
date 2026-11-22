
export type CameraErrorKind = 'permission-denied' | 'no-device' | 'other';

export interface CameraError {
  kind: CameraErrorKind;
  message: string;
}

export type CameraResult = { ok: true; stream: MediaStream } | { ok: false; error: CameraError };

const MESSAGES: Record<CameraErrorKind, string> = {
  'permission-denied':
    'Camera access was blocked. Allow the camera in the browser settings for this site, then try again.',
  'no-device': 'No camera was found. Connect a camera, then try again.',
  other: 'The camera could not start. Close other apps that use the camera, then try again.',
};

export function mapCameraError(err: unknown): CameraError {
  const name = err instanceof DOMException || err instanceof Error ? err.name : '';
  let kind: CameraErrorKind = 'other';
  if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError') {
    kind = 'permission-denied';
  } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') {
    kind = 'no-device';
  }
  return { kind, message: MESSAGES[kind] };
}

let active: MediaStream | null = null;
let generation = 0;

function onHidden() {
  if (document.visibilityState === 'hidden') stopCamera();
}

function removeListeners() {
  document.removeEventListener('visibilitychange', onHidden);
  window.removeEventListener('pagehide', stopCamera);
}

/** Stop every track and remove the exit listeners. It is fine to call at any time. */
export function stopCamera(): void {
  generation += 1;
  removeListeners();
  const stream = active;
  active = null;
  stream?.getTracks().forEach((t) => t.stop());
}

export interface CameraOptions {
  /** One camera by id. It wins over `facingMode`. */
  deviceId?: string;
  /** `user` is the front camera and the default. The phone uses `environment` (rear camera). */
  facingMode?: 'user' | 'environment';
}

export async function startCamera(options: CameraOptions = {}): Promise<CameraResult> {
  stopCamera();
  const mine = generation;
  const video: MediaTrackConstraints = options.deviceId
    ? { deviceId: { exact: options.deviceId } }
    : { facingMode: options.facingMode ?? 'user' };
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video, audio: false });
    // A stop or a newer start during the permission prompt makes this stream stale.
    // The page can also go to the background while the prompt is open.
    if (mine !== generation || document.visibilityState === 'hidden') {
      stream.getTracks().forEach((t) => t.stop());
      return { ok: false, error: mapCameraError(new Error('stopped')) };
    }
    active = stream;
    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('pagehide', stopCamera);
    // A device that disappears ends its track. Release everything then.
    // The check keeps an old stream from stopping a newer one.
    const onEnded = () => {
      if (active === stream) stopCamera();
    };
    stream.getTracks().forEach((t) => t.addEventListener('ended', onEnded, { once: true }));
    return { ok: true, stream };
  } catch (err) {
    // A failure after the stream was stored must release it. A newer start is not touched.
    if (mine === generation) stopCamera();
    return { ok: false, error: mapCameraError(err) };
  }
}
