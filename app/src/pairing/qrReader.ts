// The only file that reads camera pixels (docs/dependency-vetting.md section 5).
import jsQR from 'jsqr';

export type QrFrame = { data: Uint8ClampedArray; width: number; height: number };

const MAX_TEXT_CHARS = 600; // The same cap as MAX_SCANNED_CHARS in src/lib/pairing. Checked before any parse.
const MAX_SIDE = 640; // pixels on the long side of the scan canvas

/** Decode one RGBA frame. Any bad input or any error gives null (fail closed). */
export function decodeQr(frame: QrFrame): string | null {
  try {
    const { data, width, height } = frame;
    if (!(data instanceof Uint8ClampedArray) || !Number.isInteger(width) || !Number.isInteger(height)) return null;
    if (width < 1 || height < 1 || data.length !== 4 * width * height) return null;
    // The option goes on every call, because jsQR changes its shared default after the first call.
    const text = jsQR(data, width, height, { inversionAttempts: 'dontInvert' })?.data;
    return text && text.length <= MAX_TEXT_CHARS ? text : null;
  } catch {
    return null;
  }
}

/** Read the current video frame once. The canvas is shrunk to 0 by 0 on every path. */
export function readQrFromVideo(video: HTMLVideoElement): string | null {
  const { videoWidth, videoHeight } = video;
  if (!(videoWidth > 0 && videoHeight > 0)) return null;
  const scale = Math.min(1, MAX_SIDE / Math.max(videoWidth, videoHeight));
  const width = Math.max(1, Math.round(videoWidth * scale));
  const height = Math.max(1, Math.round(videoHeight * scale));
  const canvas = document.createElement('canvas');
  let frame: ImageData | null = null;
  try {
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.drawImage(video, 0, 0, width, height);
    frame = context.getImageData(0, 0, width, height); // claims-check:allow
    return decodeQr(frame);
  } catch {
    return null;
  } finally {
    frame = null;
    canvas.width = 0;
    canvas.height = 0;
  }
}

/** Scan on an interval. It stops after the first text or when the returned function runs. */
export function startQrScan(video: HTMLVideoElement, onText: (text: string) => void, intervalMs = 250): () => void {
  const timer = setInterval(() => {
    const text = readQrFromVideo(video);
    if (text === null) return;
    stop();
    onText(text);
  }, intervalMs);
  function stop() {
    clearInterval(timer);
  }
  return stop;
}
