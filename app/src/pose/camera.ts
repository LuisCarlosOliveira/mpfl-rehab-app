// Camera access. Rules: NFR9 and the guardrails skill.
// Video only (audio:false). The UI calls startCamera only after a button press.
// All tracks stop on: explicit stop, visibilitychange to hidden, pagehide, and error.
// The UI calls stopCamera (or stopOnLeave) on route change.

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

function onHidden() {
  if (document.visibilityState === 'hidden') stopCamera();
}

function removeListeners() {
  document.removeEventListener('visibilitychange', onHidden);
  window.removeEventListener('pagehide', stopCamera);
}

/** Stop every track and remove the exit listeners. Safe to call at any time. */
export function stopCamera(): void {
  removeListeners();
  const stream = active;
  active = null;
  stream?.getTracks().forEach((t) => t.stop());
}

/** Call from a route change or an unmount. Same effect as stopCamera. */
export const stopOnLeave = stopCamera;

export async function startCamera(): Promise<CameraResult> {
  stopCamera();
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
    // The page can go to the background while the permission prompt is open.
    if (document.visibilityState === 'hidden') {
      stream.getTracks().forEach((t) => t.stop());
      return { ok: false, error: mapCameraError(new Error('hidden')) };
    }
    active = stream;
    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('pagehide', stopCamera);
    // A device that disappears ends its track. Release everything then.
    stream.getTracks().forEach((t) => t.addEventListener('ended', stopCamera, { once: true }));
    return { ok: true, stream };
  } catch (err) {
    stopCamera();
    return { ok: false, error: mapCameraError(err) };
  }
}
