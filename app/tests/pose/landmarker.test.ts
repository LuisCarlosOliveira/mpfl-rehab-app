import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { detectForVideo, close, createFromOptions, forVisionTasks } = vi.hoisted(() => {
  const detectForVideo = vi.fn();
  const close = vi.fn();
  return {
    detectForVideo,
    close,
    createFromOptions: vi.fn<(fileset: unknown, options: { baseOptions: { delegate: string }; numPoses: number }) => Promise<unknown>>(async () => ({ detectForVideo, close })),
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
      baseOptions: { modelAssetPath: '/models/pose_landmarker_lite.task', delegate: 'GPU' },
      runningMode: 'VIDEO',
      numPoses: 1,
    });
  });

  it('uses the GPU delegate once when it works', async () => {
    await createLandmarker();
    expect(createFromOptions).toHaveBeenCalledTimes(1);
  });

  it.each([1, 2] as const)('retries once with the CPU delegate if the GPU fails (%s poses)', async (poses) => {
    createFromOptions.mockImplementation(async (_f, o) => {
      if (o.baseOptions.delegate === 'GPU') throw new Error('gpu failed');
      return { detectForVideo, close };
    });
    await createLandmarker(undefined, poses);
    const delegates = createFromOptions.mock.calls.map((c) => c[1].baseOptions.delegate);
    expect(delegates).toEqual(['GPU', 'CPU']);
    expect(createFromOptions).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ numPoses: poses }));
    createFromOptions.mockImplementation(async () => ({ detectForVideo, close }));
  });

  describe('GPU that starts but fails at run time', () => {
    const gpuPose = { detectForVideo: vi.fn(() => { throw new Error('StartGraph failed: kGpuService'); }), close: vi.fn(), setOptions: vi.fn() };
    const cpuPose = { detectForVideo: vi.fn(() => ({ landmarks: [[lm(1)]] })), close: vi.fn(), setOptions: vi.fn(async () => undefined) };
    let t = 10;
    beforeEach(() => {
      t = 10;
      gpuPose.detectForVideo.mockClear();
      cpuPose.detectForVideo.mockClear();
      createFromOptions.mockImplementation(async (_f, o) => (o.baseOptions.delegate === 'GPU' ? gpuPose : cpuPose));
    });
    afterEach(() => createFromOptions.mockImplementation(async () => ({ detectForVideo, close })));

    it('rebuilds once with the CPU delegate, drops that frame, and goes on', async () => {
      const l = await createLandmarker(undefined, 2);
      expect(l.detect(video, 10)).toBeNull();
      expect(gpuPose.close).toHaveBeenCalledOnce();
      await vi.waitFor(() => expect(l.detect(video, (t += 10))).toHaveLength(1));
      expect(createFromOptions.mock.calls.map((c) => c[1].baseOptions.delegate)).toEqual(['GPU', 'CPU']);
      expect(createFromOptions).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ numPoses: 2 }));
      expect(gpuPose.detectForVideo).toHaveBeenCalledTimes(1);
    });

    it('never loops: if the CPU model fails to start, the next frame throws and no third model is made', async () => {
      createFromOptions.mockImplementation(async (_f, o) => {
        if (o.baseOptions.delegate === 'GPU') return gpuPose;
        throw new Error('cpu failed');
      });
      const l = await createLandmarker();
      expect(l.detectAll(video, 10)).toEqual([]);
      await vi.waitFor(() => expect(() => l.detect(video, (t += 10))).toThrow('cpu failed'));
      expect(createFromOptions).toHaveBeenCalledTimes(2);
    });

    it('does not retry when the CPU model itself throws while running', async () => {
      cpuPose.detectForVideo.mockImplementationOnce(() => { throw new Error('cpu run failed'); });
      const l = await createLandmarker();
      l.detect(video, 10);
      await vi.waitFor(() => expect(() => l.detect(video, (t += 10))).toThrow('cpu run failed'));
      expect(createFromOptions).toHaveBeenCalledTimes(2);
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
    createFromOptions.mockRejectedValueOnce(new Error('wasm failed')).mockRejectedValueOnce(new Error('wasm failed'));
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
