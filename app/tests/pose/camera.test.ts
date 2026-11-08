import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mapCameraError, startCamera, stopCamera, stopOnLeave } from '../../src/pose/camera';

function fakeStream() {
  const tracks = [0, 1].map(() => {
    const t = new EventTarget() as EventTarget & { stop: () => void; stopped: boolean };
    t.stopped = false;
    t.stop = vi.fn(() => {
      t.stopped = true;
    });
    return t;
  });
  return { stream: { getTracks: () => tracks } as unknown as MediaStream, tracks };
}

function setGum(impl: () => Promise<MediaStream>) {
  const getUserMedia = vi.fn(impl);
  Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true });
  return getUserMedia;
}

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
}

beforeEach(() => setVisibility('visible'));
afterEach(() => stopCamera());

describe('mapCameraError', () => {
  it.each([
    ['NotAllowedError', 'permission-denied'],
    ['SecurityError', 'permission-denied'],
    ['NotFoundError', 'no-device'],
    ['OverconstrainedError', 'no-device'],
    ['AbortError', 'other'],
    ['NotReadableError', 'other'],
  ])('%s -> %s', (name, kind) => {
    const e = mapCameraError(new DOMException('x', name));
    expect(e.kind).toBe(kind);
    expect(e.message.length).toBeGreaterThan(10);
  });

  it('maps a non-error value to other', () => {
    expect(mapCameraError('boom').kind).toBe('other');
  });
});

describe('startCamera', () => {
  it('asks for video only', async () => {
    const { stream } = fakeStream();
    const gum = setGum(async () => stream);
    const r = await startCamera();
    expect(r.ok).toBe(true);
    expect(gum).toHaveBeenCalledWith({ video: { facingMode: 'user' }, audio: false });
  });

  it('returns a typed error and does not throw', async () => {
    setGum(async () => {
      throw new DOMException('denied', 'NotAllowedError');
    });
    const r = await startCamera();
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe('permission-denied');
  });

  it('retry works after an error', async () => {
    setGum(async () => {
      throw new DOMException('none', 'NotFoundError');
    });
    expect((await startCamera()).ok).toBe(false);
    const { stream } = fakeStream();
    setGum(async () => stream);
    expect((await startCamera()).ok).toBe(true);
  });
});

describe('stop on every exit path', () => {
  async function started() {
    const { stream, tracks } = fakeStream();
    setGum(async () => stream);
    await startCamera();
    return tracks;
  }
  const allStopped = (tracks: { stopped: boolean }[]) => tracks.every((t) => t.stopped);

  it('explicit stop', async () => {
    const tracks = await started();
    stopCamera();
    expect(allStopped(tracks)).toBe(true);
  });

  it('stopOnLeave', async () => {
    const tracks = await started();
    stopOnLeave();
    expect(allStopped(tracks)).toBe(true);
  });

  it('visibilitychange to hidden', async () => {
    const tracks = await started();
    setVisibility('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(allStopped(tracks)).toBe(true);
  });

  it('visibilitychange to visible keeps the camera', async () => {
    const tracks = await started();
    document.dispatchEvent(new Event('visibilitychange'));
    expect(tracks.some((t) => t.stopped)).toBe(false);
  });

  it('pagehide', async () => {
    const tracks = await started();
    window.dispatchEvent(new Event('pagehide'));
    expect(allStopped(tracks)).toBe(true);
  });

  it('a track that ends stops the other tracks', async () => {
    const tracks = await started();
    tracks[0]!.dispatchEvent(new Event('ended'));
    expect(allStopped(tracks)).toBe(true);
  });

  it('stops the stream if the page is hidden when the permission arrives', async () => {
    const { stream, tracks } = fakeStream();
    setGum(async () => {
      setVisibility('hidden');
      return stream;
    });
    const r = await startCamera();
    expect(r.ok).toBe(false);
    expect(allStopped(tracks)).toBe(true);
  });

  it('a second start stops the first stream', async () => {
    const first = await started();
    await started();
    expect(allStopped(first)).toBe(true);
  });
});
