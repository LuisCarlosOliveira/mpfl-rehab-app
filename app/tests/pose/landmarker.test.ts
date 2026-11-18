import { beforeEach, describe, expect, it, vi } from 'vitest';

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

import { blockForeignFetch, createLandmarker } from '../../src/pose/landmarker';

const video = {} as HTMLVideoElement;
const lm = (i: number) => ({ x: i / 100, y: i / 50, z: 9, visibility: 0.9, presence: 1 });

beforeEach(() => vi.clearAllMocks());

describe('createLandmarker', () => {
  it('loads WASM and model from the own origin, VIDEO mode, 1 pose', async () => {
    await createLandmarker();
    expect(forVisionTasks).toHaveBeenCalledWith('/models/wasm');
    expect(createFromOptions).toHaveBeenCalledWith(expect.anything(), {
      baseOptions: { modelAssetPath: '/models/pose_landmarker_lite.task' },
      runningMode: 'VIDEO',
      numPoses: 1,
    });
  });

  it('makes a 2-pose instance on request', async () => {
    await createLandmarker(undefined, 2);
    expect(createFromOptions).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ numPoses: 2 }));
  });

  it('returns 33 landmarks as {x,y,visibility}', async () => {
    detectForVideo.mockReturnValue({ landmarks: [Array.from({ length: 33 }, (_, i) => lm(i))] });
    const l = await createLandmarker();
    const out = l.detect(video, 10)!;
    expect(out).toHaveLength(33);
    expect(out[5]).toEqual({ x: 0.05, y: 0.1, visibility: 0.9 });
    expect(Object.keys(out[0]!).sort()).toEqual(['visibility', 'x', 'y']);
  });

  it('returns null if no pose is found', async () => {
    detectForVideo.mockReturnValue({ landmarks: [] });
    const l = await createLandmarker();
    expect(l.detect(video, 10)).toBeNull();
  });

  it('skips a timestamp that does not increase', async () => {
    detectForVideo.mockReturnValue({ landmarks: [[lm(1)]] });
    const l = await createLandmarker();
    l.detect(video, 10);
    expect(l.detect(video, 10)).toBeNull();
    expect(l.detect(video, 9)).toBeNull();
    expect(detectForVideo).toHaveBeenCalledTimes(1);
  });

  it('passes an init error to the caller', async () => {
    createFromOptions.mockRejectedValueOnce(new Error('wasm failed'));
    await expect(createLandmarker()).rejects.toThrow('wasm failed');
  });

  it('close releases the model', async () => {
    const l = await createLandmarker();
    l.close();
    expect(close).toHaveBeenCalledOnce();
  });
});

describe('blockForeignFetch', () => {
  it('rejects a foreign origin and passes the own origin', async () => {
    const real = vi.fn(async () => new Response('ok'));
    vi.stubGlobal('fetch', real);
    blockForeignFetch();
    await expect(fetch('https://odml.pa.googleapis.com/v1/log', { method: 'POST' })).rejects.toThrow('Blocked');
    expect(real).not.toHaveBeenCalled();
    await fetch('/models/pose_landmarker_lite.task');
    expect(real).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
});
