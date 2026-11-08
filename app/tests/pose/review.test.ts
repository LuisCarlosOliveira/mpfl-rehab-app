// Independent review tests for T8 (pose wrapper). They add cases that the first tests do not cover.
import { spawnSync } from 'node:child_process';
import { appendFileSync, cpSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { detectForVideo, close, createFromOptions, forVisionTasks } = vi.hoisted(() => {
  const detectForVideo = vi.fn();
  const close = vi.fn();
  return {
    detectForVideo,
    close,
    createFromOptions: vi.fn(async () => ({ detectForVideo, close })),
    forVisionTasks: vi.fn(async (base: string) => ({ wasmLoaderPath: base, wasmBinaryPath: base })),
  };
});

vi.mock('@mediapipe/tasks-vision', () => ({
  FilesetResolver: { forVisionTasks },
  PoseLandmarker: { createFromOptions },
}));

import { startCamera, stopCamera } from '../../src/pose/camera';
import { blockForeignFetch, createLandmarker } from '../../src/pose/landmarker';
import { median, startPoseLoop } from '../../src/pose/loop';

// ---------- camera ----------

type FakeTrack = EventTarget & { stop: () => void; stopped: boolean };

function fakeStream() {
  const tracks = [0, 1].map(() => {
    const t = new EventTarget() as FakeTrack;
    t.stopped = false;
    t.stop = vi.fn(() => {
      t.stopped = true;
    });
    return t;
  });
  return { stream: { getTracks: () => tracks } as unknown as MediaStream, tracks };
}

function deferredGum() {
  const pending: ((s: MediaStream) => void)[] = [];
  const getUserMedia = vi.fn(() => new Promise<MediaStream>((resolve) => pending.push(resolve)));
  Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true });
  return { getUserMedia, resolve: (i: number, s: MediaStream) => pending[i]!(s) };
}

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
}

describe('camera: races and listeners', () => {
  beforeEach(() => setVisibility('visible'));
  afterEach(() => {
    stopCamera();
    vi.restoreAllMocks();
  });

  it('stop before the permission arrives leaves no live track', async () => {
    const gum = deferredGum();
    const { stream, tracks } = fakeStream();
    const result = startCamera();
    stopCamera();
    gum.resolve(0, stream);
    const r = await result;
    expect(r.ok).toBe(false);
    expect(tracks.every((t) => t.stopped)).toBe(true);
  });

  it('two starts that overlap leave no stream running after one stop', async () => {
    const gum = deferredGum();
    const a = fakeStream();
    const b = fakeStream();
    const first = startCamera();
    const second = startCamera();
    gum.resolve(0, a.stream);
    gum.resolve(1, b.stream);
    const [r1, r2] = await Promise.all([first, second]);
    expect(r1.ok).toBe(false);
    expect(r2.ok).toBe(true);
    expect(a.tracks.every((t) => t.stopped)).toBe(true);
    expect(b.tracks.some((t) => t.stopped)).toBe(false);
    stopCamera();
    expect(b.tracks.every((t) => t.stopped)).toBe(true);
  });

  it('a late ended event of an old stream does not stop the new stream', async () => {
    const a = fakeStream();
    const b = fakeStream();
    const gum = deferredGum();
    const first = startCamera();
    gum.resolve(0, a.stream);
    await first;
    const second = startCamera();
    gum.resolve(1, b.stream);
    await second;
    a.tracks[0]!.dispatchEvent(new Event('ended'));
    expect(b.tracks.some((t) => t.stopped)).toBe(false);
  });

  it('every added exit listener is removed after stop', async () => {
    const docAdd = vi.spyOn(document, 'addEventListener');
    const docRemove = vi.spyOn(document, 'removeEventListener');
    const winAdd = vi.spyOn(window, 'addEventListener');
    const winRemove = vi.spyOn(window, 'removeEventListener');
    const gum = deferredGum();
    const { stream } = fakeStream();
    const result = startCamera();
    gum.resolve(0, stream);
    await result;
    stopCamera();
    const count = (spy: typeof docAdd, name: string) => spy.mock.calls.filter((c) => c[0] === name).length;
    expect(count(docAdd, 'visibilitychange')).toBeGreaterThan(0);
    expect(count(docRemove, 'visibilitychange')).toBeGreaterThanOrEqual(count(docAdd, 'visibilitychange'));
    expect(count(winAdd, 'pagehide')).toBeGreaterThan(0);
    expect(count(winRemove, 'pagehide')).toBeGreaterThanOrEqual(count(winAdd, 'pagehide'));
    // The handler that was added is the handler that was removed.
    const added = docAdd.mock.calls.find((c) => c[0] === 'visibilitychange')![1];
    expect(docRemove.mock.calls.some((c) => c[0] === 'visibilitychange' && c[1] === added)).toBe(true);
  });

  it('stops the stream if wiring a track throws', async () => {
    const gum = deferredGum();
    const { stream, tracks } = fakeStream();
    tracks[0]!.addEventListener = () => {
      throw new Error('wiring failed');
    };
    const result = startCamera();
    gum.resolve(0, stream);
    const r = await result;
    expect(r.ok).toBe(false);
    expect(tracks.every((t) => t.stopped)).toBe(true);
  });

  it('a stop call with no stream does nothing and does not throw', () => {
    expect(() => {
      stopCamera();
      stopCamera();
    }).not.toThrow();
  });
});

// ---------- loop ----------

function fakeVideo() {
  const cbs = new Map<number, (now: number) => void>();
  let id = 0;
  const v = {
    readyState: 4,
    currentTime: 0,
    requestVideoFrameCallback: (cb: (n: number) => void) => (cbs.set(++id, cb), id),
    cancelVideoFrameCallback: (h: number) => cbs.delete(h),
  };
  const fire = (now: number) => {
    const entries = [...cbs];
    cbs.clear();
    entries.forEach(([, cb]) => cb(now));
  };
  return { video: v as unknown as HTMLVideoElement, fire, pending: () => cbs.size };
}

describe('loop: independent checks', () => {
  it('does not call detect or onFrame after stop', () => {
    const f = fakeVideo();
    const detect = vi.fn(() => null);
    const onFrame = vi.fn();
    const { stop } = startPoseLoop({ video: f.video, detect, onFrame, onError: vi.fn() });
    f.fire(10);
    stop();
    f.fire(20);
    f.fire(30);
    expect(detect).toHaveBeenCalledTimes(1);
    expect(onFrame).toHaveBeenCalledTimes(1);
  });

  it('stop inside onFrame leaves no pending callback', () => {
    const f = fakeVideo();
    const ref: { stop?: () => void } = {};
    ref.stop = startPoseLoop({
      video: f.video,
      detect: () => null,
      onFrame: () => ref.stop?.(),
      onError: vi.fn(),
    }).stop;
    f.fire(10);
    expect(f.pending()).toBe(0);
  });

  it('after a detect error it reports once and detects no more', () => {
    const f = fakeVideo();
    const detect = vi
      .fn<() => null>()
      .mockReturnValueOnce(null)
      .mockImplementationOnce(() => {
        throw new Error('boom');
      });
    const onError = vi.fn();
    startPoseLoop({ video: f.video, detect, onFrame: vi.fn(), onError });
    f.fire(10);
    f.fire(20);
    f.fire(30);
    f.fire(40);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(detect).toHaveBeenCalledTimes(2);
  });

  it('frame rate uses the median, so a few long gaps do not move it', () => {
    const f = fakeVideo();
    const { stats } = startPoseLoop({ video: f.video, detect: () => null, onFrame: vi.fn(), onError: vi.fn() });
    // Gaps in ms: 20, 20, 20, 500, 20, 20, 900. The median gap is 20 ms, so 50 fps.
    let t = 100;
    f.fire(t);
    for (const gap of [20, 20, 20, 500, 20, 20, 900]) f.fire((t += gap));
    expect(stats.medianFps()).toBeCloseTo(50, 5);
  });

  it('frame rate of an even number of gaps is the mean of the two middle gaps', () => {
    const f = fakeVideo();
    const { stats } = startPoseLoop({ video: f.video, detect: () => null, onFrame: vi.fn(), onError: vi.fn() });
    let t = 100;
    f.fire(t);
    for (const gap of [10, 30, 10, 30]) f.fire((t += gap)); // sorted 10 10 30 30, median 20
    expect(stats.medianFps()).toBeCloseTo(50, 5);
  });

  it('keeps only the last 120 frames in the window', () => {
    const f = fakeVideo();
    const { stats } = startPoseLoop({ video: f.video, detect: () => null, onFrame: vi.fn(), onError: vi.fn() });
    let t = 100;
    f.fire(t);
    for (let i = 0; i < 130; i++) f.fire((t += 100)); // 10 fps
    for (let i = 0; i < 121; i++) f.fire((t += 20)); // 50 fps fills the whole window
    expect(stats.medianFps()).toBeCloseTo(50, 5);
  });

  it('median does not change its input', () => {
    const input = [3, 1, 2];
    median(input);
    expect(input).toEqual([3, 1, 2]);
  });
});

// ---------- foreign fetch guard ----------

describe('blockForeignFetch', () => {
  let real: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    vi.clearAllMocks();
    real = vi.fn(async () => new Response('ok'));
    vi.stubGlobal('fetch', real);
    blockForeignFetch();
  });
  afterEach(() => vi.unstubAllGlobals());

  it.each([
    ['a protocol-relative URL', '//evil.example/log'],
    ['an http URL of another host', 'http://evil.example/log'],
    ['a https URL of another host', 'https://evil.example/log'],
    ['a URL with credentials', 'https://user:pw@evil.example/log'],
    ['a URL that hides the host behind the user part', `${location.origin.replace('://', '://own@')}@evil.example/x`],
    ['another port of the own host', `${location.protocol}//${location.hostname}:1/x`],
    ['a data URL', 'data:text/plain,x'],
  ])('blocks %s', async (_name, url) => {
    await expect(fetch(url)).rejects.toThrow('Blocked');
    expect(real).not.toHaveBeenCalled();
  });

  it('blocks a Request object and a URL object of another host', async () => {
    await expect(fetch(new Request('https://evil.example/x'))).rejects.toThrow('Blocked');
    await expect(fetch(new URL('https://evil.example/x'))).rejects.toThrow('Blocked');
    expect(real).not.toHaveBeenCalled();
  });

  it('lets own-origin requests through, absolute and relative', async () => {
    await fetch('/models/pose_landmarker_lite.task');
    await fetch('models/x.bin');
    await fetch(`${location.origin}/models/y.bin`);
    expect(real).toHaveBeenCalledTimes(3);
  });

  it('returns a rejected promise for a bad URL and does not throw at once', async () => {
    let promise: Promise<Response> | undefined;
    expect(() => {
      promise = fetch('http://');
    }).not.toThrow();
    await expect(promise).rejects.toBeInstanceOf(TypeError);
    expect(real).not.toHaveBeenCalled();
  });

  it('does not stack when it is called twice', async () => {
    const once = globalThis.fetch;
    blockForeignFetch();
    expect(globalThis.fetch).toBe(once);
  });
});

describe('the guard follows the life of the landmarker', () => {
  let real: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    vi.clearAllMocks();
    real = vi.fn(async () => new Response('ok'));
    vi.stubGlobal('fetch', real);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('is installed while the landmarker runs and removed after close', async () => {
    const l = await createLandmarker();
    expect(globalThis.fetch).not.toBe(real);
    await expect(fetch('https://odml.pa.googleapis.com/v1/log')).rejects.toThrow('Blocked');
    l.close();
    expect(globalThis.fetch).toBe(real);
  });

  it('stays while one of two landmarkers runs', async () => {
    const a = await createLandmarker();
    const b = await createLandmarker();
    a.close();
    expect(globalThis.fetch).not.toBe(real);
    b.close();
    expect(globalThis.fetch).toBe(real);
  });

  it('a second close call changes nothing', async () => {
    const a = await createLandmarker();
    const b = await createLandmarker();
    a.close();
    a.close();
    expect(globalThis.fetch).not.toBe(real);
    expect(close).toHaveBeenCalledTimes(1);
    b.close();
    expect(globalThis.fetch).toBe(real);
  });

  it('is removed if the model fails to load', async () => {
    createFromOptions.mockRejectedValueOnce(new Error('wasm failed'));
    await expect(createLandmarker()).rejects.toThrow('wasm failed');
    expect(globalThis.fetch).toBe(real);
  });

  it('detect after close does not call the model', async () => {
    detectForVideo.mockReturnValue({ landmarks: [[{ x: 0, y: 0, visibility: 1 }]] });
    const l = await createLandmarker();
    l.close();
    expect(l.detect({} as HTMLVideoElement, 5)).toBeNull();
    expect(detectForVideo).not.toHaveBeenCalled();
  });
});

// ---------- model hash check ----------

describe('model-hash-check.sh: swaps that must fail', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'vst-t8-review-'));
  afterAll(() => rmSync(tmp, { recursive: true, force: true }));
  const run = (dir: string) => spawnSync('bash', ['scripts/model-hash-check.sh', dir], { encoding: 'utf8' });
  const copyOf = (name: string) => {
    const dir = join(tmp, name);
    cpSync('public/models', dir, { recursive: true });
    return dir;
  };

  it('fails on an extra file that SHA256SUMS does not list', () => {
    const dir = copyOf('extra');
    writeFileSync(join(dir, 'evil.js'), 'alert(1)');
    expect(run(dir).status).toBe(1);
  });

  it('fails on an extra file inside the wasm folder', () => {
    const dir = copyOf('extra-wasm');
    writeFileSync(join(dir, 'wasm/extra.wasm'), 'x');
    expect(run(dir).status).toBe(1);
  });

  it('fails if a listed file is a symlink', () => {
    const dir = copyOf('link');
    const target = join(tmp, 'same-bytes.task');
    cpSync(join(dir, 'pose_landmarker_lite.task'), target);
    rmSync(join(dir, 'pose_landmarker_lite.task'));
    symlinkSync(target, join(dir, 'pose_landmarker_lite.task'));
    const r = run(dir);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('symlink');
  });

  it('fails if SHA256SUMS lists a file outside the folder', () => {
    const dir = copyOf('outside');
    writeFileSync(join(tmp, 'outside.txt'), 'x');
    const digest = spawnSync('sha256sum', [join(tmp, 'outside.txt')], { encoding: 'utf8' }).stdout.split(' ')[0];
    appendFileSync(join(dir, 'SHA256SUMS'), `${digest}  ../outside.txt\n`);
    expect(run(dir).status).toBe(1);
  });

  it('fails if SHA256SUMS was changed and docs/model.md still holds the old hash', () => {
    const root = join(tmp, 'tree');
    mkdirSync(join(root, 'app/scripts'), { recursive: true });
    mkdirSync(join(root, 'docs'));
    cpSync('scripts/model-hash-check.sh', join(root, 'app/scripts/model-hash-check.sh'));
    cpSync('public/models', join(root, 'app/public/models'), { recursive: true });
    cpSync('../docs/model.md', join(root, 'docs/model.md'));
    const ok = spawnSync('bash', ['app/scripts/model-hash-check.sh'], { cwd: root, encoding: 'utf8' });
    expect(ok.status).toBe(0);
    // Swap the model and write the new hash in SHA256SUMS only.
    const task = join(root, 'app/public/models/pose_landmarker_lite.task');
    appendFileSync(task, 'x');
    const digest = spawnSync('sha256sum', [task], { encoding: 'utf8' }).stdout.split(' ')[0];
    const sums = join(root, 'app/public/models/SHA256SUMS');
    const lines = spawnSync('cat', [sums], { encoding: 'utf8' }).stdout.split('\n');
    lines[0] = `${digest}  pose_landmarker_lite.task`;
    writeFileSync(sums, lines.join('\n'));
    const r = spawnSync('bash', ['app/scripts/model-hash-check.sh'], { cwd: root, encoding: 'utf8' });
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('docs/model.md');
  });
});
