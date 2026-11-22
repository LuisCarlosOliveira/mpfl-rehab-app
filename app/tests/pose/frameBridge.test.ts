import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FIRST_FRAME_LIMIT_MS, FRAME_REPLY_LIMIT_MS } from '../../src/pose/frameBridge';

class FakeWorker {
  static all: FakeWorker[] = [];
  static throwOnCreate = false;
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  posted: { message: Record<string, unknown>; transfer: unknown[] | undefined }[] = [];
  terminated = false;
  constructor(public url: unknown) {
    if (FakeWorker.throwOnCreate) throw new DOMException('blocked', 'SecurityError');
    FakeWorker.all.push(this);
  }
  postMessage(message: Record<string, unknown>, transfer?: unknown[]) {
    this.posted.push({ message, transfer });
  }
  terminate() {
    this.terminated = true;
  }
  emit(data: unknown) {
    this.onmessage?.({ data });
  }
}

const bitmap = () => ({ close: vi.fn() });
let pending: { resolve: (b: ReturnType<typeof bitmap>) => void; reject: (e: unknown) => void }[];
let createImageBitmapMock: ReturnType<typeof vi.fn>;
const video = {} as HTMLVideoElement;

beforeEach(() => {
  FakeWorker.all = [];
  FakeWorker.throwOnCreate = false;
  pending = [];
  createImageBitmapMock = vi.fn(
    () => new Promise((resolve, reject) => pending.push({ resolve, reject })),
  );
  vi.stubGlobal('Worker', FakeWorker);
  vi.stubGlobal('createImageBitmap', createImageBitmapMock);
});
afterEach(() => vi.unstubAllGlobals());

async function ready(options: Partial<Parameters<typeof import('../../src/pose/frameBridge').createFrameBridge>[0]> = {}) {
  const { createFrameBridge } = await import('../../src/pose/frameBridge');
  const onResult = vi.fn();
  const onFail = vi.fn();
  const made = createFrameBridge({ onResult, onFail, ...options });
  const worker = FakeWorker.all[0]!;
  worker.emit({ type: 'ready' });
  const bridge = (await made)!;
  return { bridge, worker, onResult, onFail };
}

describe('createFrameBridge: start', () => {
  it('gives null when the browser has no Worker, so the caller can use the main thread', async () => {
    vi.stubGlobal('Worker', undefined);
    const { createFrameBridge } = await import('../../src/pose/frameBridge');
    expect(await createFrameBridge({ onResult: vi.fn(), onFail: vi.fn() })).toBeNull();
  });

  it('gives null when the browser cannot make a picture of a video frame', async () => {
    vi.stubGlobal('createImageBitmap', undefined);
    const { createFrameBridge } = await import('../../src/pose/frameBridge');
    expect(await createFrameBridge({ onResult: vi.fn(), onFail: vi.fn() })).toBeNull();
    expect(FakeWorker.all).toHaveLength(0);
  });

  it('starts one worker and resolves when the worker says it is ready', async () => {
    const { createFrameBridge } = await import('../../src/pose/frameBridge');
    let done = false;
    const made = createFrameBridge({ onResult: vi.fn(), onFail: vi.fn() }).then((b) => ((done = true), b));
    await Promise.resolve();
    expect(FakeWorker.all).toHaveLength(1);
    expect(done).toBe(false);
    FakeWorker.all[0]!.emit({ type: 'ready' });
    expect(await made).not.toBeNull();
  });

  it('passes the byte count of the model load on', async () => {
    const onProgress = vi.fn();
    const { createFrameBridge } = await import('../../src/pose/frameBridge');
    const made = createFrameBridge({ onResult: vi.fn(), onFail: vi.fn(), onProgress });
    const w = FakeWorker.all[0]!;
    w.emit({ type: 'progress', bytes: 100 });
    w.emit({ type: 'progress', bytes: 50 });
    w.emit({ type: 'ready' });
    await made;
    expect(onProgress.mock.calls).toEqual([[100], [50]]);
  });

  it('rejects and ends the worker when the model fails to load in the worker', async () => {
    const { createFrameBridge } = await import('../../src/pose/frameBridge');
    const made = createFrameBridge({ onResult: vi.fn(), onFail: vi.fn() });
    FakeWorker.all[0]!.emit({ type: 'failed' });
    await expect(made).rejects.toThrow();
    expect(FakeWorker.all[0]!.terminated).toBe(true);
  });

  it('rejects and ends the worker when the worker script cannot start', async () => {
    const { createFrameBridge } = await import('../../src/pose/frameBridge');
    const made = createFrameBridge({ onResult: vi.fn(), onFail: vi.fn() });
    FakeWorker.all[0]!.onerror?.(new Event('error'));
    await expect(made).rejects.toThrow();
    expect(FakeWorker.all[0]!.terminated).toBe(true);
  });

  it('rejects when the browser refuses to create the worker', async () => {
    FakeWorker.throwOnCreate = true;
    const { createFrameBridge } = await import('../../src/pose/frameBridge');
    await expect(createFrameBridge({ onResult: vi.fn(), onFail: vi.fn() })).rejects.toThrow();
  });
});

describe('frame bridge: frames and backpressure', () => {
  it('sends a frame as a transferable picture with the time and nothing else', async () => {
    const { bridge, worker } = await ready();
    bridge.submit(video, 1000.5);
    expect(createImageBitmapMock).toHaveBeenCalledWith(video);
    const b = bitmap();
    pending[0]!.resolve(b);
    await Promise.resolve();
    await Promise.resolve();
    expect(worker.posted).toHaveLength(1);
    expect(worker.posted[0]!.message).toEqual({ type: 'frame', bitmap: b, timestampMs: 1000.5 });
    expect(worker.posted[0]!.transfer).toEqual([b]);
  });

  it('drops a new frame while the picture is made and while the worker is busy, and never queues', async () => {
    const { bridge, worker } = await ready();
    bridge.submit(video, 1);
    bridge.submit(video, 2); // the picture of frame 1 is not ready yet
    expect(createImageBitmapMock).toHaveBeenCalledTimes(1);
    pending[0]!.resolve(bitmap());
    await new Promise((r) => setTimeout(r));
    bridge.submit(video, 3); // the worker still works on frame 1
    expect(createImageBitmapMock).toHaveBeenCalledTimes(1);
    worker.emit({ type: 'result', timestampMs: 1, landmarks: null });
    bridge.submit(video, 4); // the worker is free: the latest frame goes
    expect(createImageBitmapMock).toHaveBeenCalledTimes(2);
    pending[1]!.resolve(bitmap());
    await new Promise((r) => setTimeout(r));
    expect(worker.posted.map((p) => p.message.timestampMs)).toEqual([1, 4]);
  });

  it('passes a result to the handler with the time of its frame', async () => {
    const { bridge, worker, onResult } = await ready();
    bridge.submit(video, 5);
    pending[0]!.resolve(bitmap());
    await new Promise((r) => setTimeout(r));
    const landmarks = [{ x: 0.1, y: 0.2, visibility: 0.9 }];
    worker.emit({ type: 'result', timestampMs: 5, landmarks });
    expect(onResult).toHaveBeenCalledWith(landmarks, 5);
  });

  it('takes the next frame after a picture that could not be made', async () => {
    const { bridge } = await ready();
    bridge.submit(video, 1);
    pending[0]!.reject(new DOMException('not ready', 'InvalidStateError'));
    await new Promise((r) => setTimeout(r));
    bridge.submit(video, 2);
    expect(createImageBitmapMock).toHaveBeenCalledTimes(2);
  });
});

describe('frame bridge: the worker never waits for the next tick', () => {
  const moving = (t: number) => ({ currentTime: t }) as unknown as HTMLVideoElement;

  async function inWork(v: HTMLVideoElement, ts: number) {
    const r = await ready();
    r.bridge.submit(v, ts);
    pending[0]!.resolve(bitmap());
    await new Promise((x) => setTimeout(x));
    return r;
  }

  it('sends the frame that shows now as soon as a result comes, when the video moved on', async () => {
    const v = moving(1);
    const { worker } = await inWork(v, 100);
    (v as unknown as { currentTime: number }).currentTime = 1.04;
    vi.spyOn(performance, 'now').mockReturnValue(140);
    worker.emit({ type: 'result', timestampMs: 100, landmarks: null });
    expect(createImageBitmapMock).toHaveBeenCalledTimes(2);
    pending[1]!.resolve(bitmap());
    await new Promise((x) => setTimeout(x));
    expect(worker.posted.map((p) => p.message.timestampMs)).toEqual([100, 140]);
    vi.restoreAllMocks();
  });

  it('does not send the same video frame twice', async () => {
    const v = moving(1);
    const { worker } = await inWork(v, 100);
    worker.emit({ type: 'result', timestampMs: 100, landmarks: null });
    expect(createImageBitmapMock).toHaveBeenCalledTimes(1);
  });

  it('keeps the times strictly rising when the clock of a tick is behind', async () => {
    const v = moving(1);
    const { worker } = await inWork(v, 100);
    (v as unknown as { currentTime: number }).currentTime = 1.04;
    vi.spyOn(performance, 'now').mockReturnValue(90);
    worker.emit({ type: 'result', timestampMs: 100, landmarks: null });
    pending[1]!.resolve(bitmap());
    await new Promise((x) => setTimeout(x));
    const [first, second] = worker.posted.map((p) => p.message.timestampMs as number);
    expect(second).toBeGreaterThan(first!);
    vi.restoreAllMocks();
  });

  it('sends nothing after close', async () => {
    const v = moving(1);
    const { bridge, worker } = await inWork(v, 100);
    (v as unknown as { currentTime: number }).currentTime = 1.04;
    bridge.close();
    worker.emit({ type: 'result', timestampMs: 100, landmarks: null });
    expect(createImageBitmapMock).toHaveBeenCalledTimes(1);
  });
});

describe('frame bridge: stop and failure', () => {
  it('tells the caller when the worker has the 2-pose model ready', async () => {
    const onProbeReady = vi.fn();
    const { worker, onResult } = await ready({ onProbeReady });
    worker.emit({ type: 'probe-ready' });
    expect(onProbeReady).toHaveBeenCalledOnce();
    expect(onResult).not.toHaveBeenCalled();
  });

  it('close ends the worker and takes no more frames', async () => {
    const { bridge, worker } = await ready();
    bridge.close();
    expect(worker.terminated).toBe(true);
    bridge.submit(video, 1);
    expect(createImageBitmapMock).not.toHaveBeenCalled();
  });

  it('close closes a picture that is still being made, so no frame stays in memory', async () => {
    const { bridge, worker } = await ready();
    bridge.submit(video, 1);
    bridge.close();
    const b = bitmap();
    pending[0]!.resolve(b);
    await new Promise((r) => setTimeout(r));
    expect(b.close).toHaveBeenCalledOnce();
    expect(worker.posted).toHaveLength(0);
  });

  it('ignores a result that arrives after close', async () => {
    const { bridge, worker, onResult } = await ready();
    bridge.close();
    worker.emit({ type: 'result', timestampMs: 1, landmarks: null });
    expect(onResult).not.toHaveBeenCalled();
  });

  it('close is safe to call twice', async () => {
    const { bridge } = await ready();
    bridge.close();
    expect(() => bridge.close()).not.toThrow();
  });

  it('a worker error after the start ends the worker and tells the caller once', async () => {
    const { bridge, worker, onFail } = await ready();
    bridge.submit(video, 1);
    worker.onerror?.(new Event('error'));
    worker.emit({ type: 'failed' });
    expect(worker.terminated).toBe(true);
    expect(onFail).toHaveBeenCalledOnce();
    const b = bitmap();
    pending[0]!.resolve(b);
    await new Promise((r) => setTimeout(r));
    expect(b.close).toHaveBeenCalledOnce();
  });
});

describe('frame bridge: a worker that cannot take or answer a frame', () => {
  it('fails once and closes the picture when postMessage throws, and the next submit is not stuck', async () => {
    const { bridge, worker, onFail } = await ready();
    worker.postMessage = () => {
      throw new DOMException('gone', 'DataCloneError');
    };
    bridge.submit(video, 1);
    const b = bitmap();
    pending[0]!.resolve(b);
    await new Promise((r) => setTimeout(r));
    expect(b.close).toHaveBeenCalledOnce();
    expect(onFail).toHaveBeenCalledOnce();
    expect(worker.terminated).toBe(true);
    bridge.submit(video, 2);
    expect(createImageBitmapMock).toHaveBeenCalledTimes(1);
  });

  it('fails once and closes the bridge when onResult throws, and the next submit is dropped', async () => {
    const onResult = vi.fn(() => {
      throw new Error('caller broke');
    });
    const { bridge, worker, onFail } = await ready({ onResult });
    bridge.submit(video, 1);
    pending[0]!.resolve(bitmap());
    await new Promise((r) => setTimeout(r));
    expect(() => worker.emit({ type: 'result', timestampMs: 1, landmarks: null })).not.toThrow();
    expect(onFail).toHaveBeenCalledOnce();
    expect(worker.terminated).toBe(true);
    bridge.submit(video, 2);
    expect(createImageBitmapMock).toHaveBeenCalledTimes(1);
  });

  it('gives the first frame the long limit: no fail at 59999 ms, fail at 60000 ms', async () => {
    vi.useFakeTimers();
    try {
      const { bridge, worker, onFail } = await ready();
      bridge.submit(video, 1);
      pending[0]!.resolve(bitmap());
      await vi.advanceTimersByTimeAsync(FIRST_FRAME_LIMIT_MS - 1);
      expect(onFail).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1);
      expect(onFail).toHaveBeenCalledOnce();
      expect(worker.terminated).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('gives the first frame after setPoses the long limit again', async () => {
    vi.useFakeTimers();
    try {
      const { bridge, worker, onFail } = await ready();
      bridge.submit(video, 1);
      pending[0]!.resolve(bitmap());
      await vi.advanceTimersByTimeAsync(10);
      worker.emit({ type: 'result', timestampMs: 1, landmarks: null });
      bridge.setPoses(2);
      bridge.submit(video, 2);
      pending[1]!.resolve(bitmap());
      await vi.advanceTimersByTimeAsync(10_000);
      expect(onFail).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(FIRST_FRAME_LIMIT_MS);
      expect(onFail).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });

  it('fails when the worker gives no reply within the limit after the first result', async () => {
    vi.useFakeTimers();
    try {
      const { bridge, worker, onFail } = await ready();
      bridge.submit(video, 1);
      pending[0]!.resolve(bitmap());
      await vi.advanceTimersByTimeAsync(10);
      worker.emit({ type: 'result', timestampMs: 1, landmarks: null });
      bridge.submit(video, 2);
      pending[1]!.resolve(bitmap());
      await vi.advanceTimersByTimeAsync(FRAME_REPLY_LIMIT_MS - 1);
      expect(onFail).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1);
      expect(onFail).toHaveBeenCalledOnce();
      expect(worker.terminated).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not fail after a reply, and does not fail after close', async () => {
    vi.useFakeTimers();
    try {
      const { bridge, worker, onFail } = await ready();
      bridge.submit(video, 1);
      pending[0]!.resolve(bitmap());
      await vi.advanceTimersByTimeAsync(10);
      worker.emit({ type: 'result', timestampMs: 1, landmarks: null });
      await vi.advanceTimersByTimeAsync(FRAME_REPLY_LIMIT_MS * 2);
      expect(onFail).not.toHaveBeenCalled();
      bridge.submit(video, 2);
      bridge.close();
      await vi.advanceTimersByTimeAsync(FRAME_REPLY_LIMIT_MS * 2);
      expect(onFail).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
