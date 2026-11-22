import { beforeEach, describe, expect, it, vi } from 'vitest';

const landmarker = vi.hoisted(() => ({ createLandmarker: vi.fn() }));
vi.mock('../../src/pose/landmarker', () => landmarker);

const posted: unknown[][] = [];
let model: { detect: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> };
const bitmap = () => ({ close: vi.fn() });
const send = (data: unknown) => (self as unknown as { onmessage: (e: { data: unknown }) => void }).onmessage({ data });
const flush = () => new Promise((r) => setTimeout(r));

async function start() {
  vi.resetModules();
  await import('../../src/pose/poseWorker');
  await flush();
}

beforeEach(() => {
  posted.length = 0;
  vi.stubGlobal('postMessage', (...args: unknown[]) => posted.push(args));
  model = { detect: vi.fn(() => null), close: vi.fn() };
  landmarker.createLandmarker.mockReset();
  landmarker.createLandmarker.mockResolvedValue(model);
});

describe('pose worker', () => {
  it('loads the model at once, reports the bytes, then says ready', async () => {
    landmarker.createLandmarker.mockImplementation(async (report: (b: number) => void) => (report(10), report(5), model));
    await start();
    expect(posted.map((p) => p[0])).toEqual([
      { type: 'progress', bytes: 10 },
      { type: 'progress', bytes: 5 },
      { type: 'ready' },
    ]);
  });

  it('says failed when the model cannot load', async () => {
    landmarker.createLandmarker.mockRejectedValue(new Error('wasm'));
    await start();
    expect(posted.map((p) => p[0])).toEqual([{ type: 'failed' }]);
  });

  it('detects on the picture, closes it, and sends landmark numbers and the time only', async () => {
    const lm = [{ x: 0.1, y: 0.2, visibility: 0.9 }];
    model.detect.mockReturnValue(lm);
    await start();
    posted.length = 0;
    const b = bitmap();
    send({ type: 'frame', bitmap: b, timestampMs: 42.5 });
    expect(model.detect).toHaveBeenCalledWith(b, 42.5);
    expect(b.close).toHaveBeenCalledOnce();
    expect(posted).toEqual([[{ type: 'result', timestampMs: 42.5, landmarks: lm }]]);
    expect(JSON.stringify(posted)).not.toContain('bitmap');
  });

  it('sends null landmarks when no pose is found', async () => {
    await start();
    posted.length = 0;
    send({ type: 'frame', bitmap: bitmap(), timestampMs: 1 });
    expect(posted).toEqual([[{ type: 'result', timestampMs: 1, landmarks: null }]]);
  });

  it('closes the picture and says failed when detect throws', async () => {
    model.detect.mockImplementation(() => {
      throw new Error('gpu lost');
    });
    await start();
    posted.length = 0;
    const b = bitmap();
    send({ type: 'frame', bitmap: b, timestampMs: 1 });
    expect(b.close).toHaveBeenCalledOnce();
    expect(posted).toEqual([[{ type: 'failed' }]]);
  });

  it('closes a picture that arrives before the model is ready, and does not detect', async () => {
    let release!: (m: typeof model) => void;
    landmarker.createLandmarker.mockReturnValue(new Promise((r) => (release = r)));
    vi.resetModules();
    await import('../../src/pose/poseWorker');
    const b = bitmap();
    send({ type: 'frame', bitmap: b, timestampMs: 1 });
    expect(b.close).toHaveBeenCalledOnce();
    expect(model.detect).not.toHaveBeenCalled();
    release(model);
  });

  describe('probe of two poses (no rebuild of the tracking model)', () => {
    const flush2 = async () => {
      await flush();
      await flush();
    };
    let probeModel: { detectAll: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> };
    const lm = [{ x: 0.1, y: 0.2, visibility: 0.9 }];
    const other = [{ x: 0.7, y: 0.2, visibility: 0.9 }];

    beforeEach(() => {
      model = { detect: vi.fn(() => lm), close: vi.fn(), setPoses: vi.fn() } as never;
      probeModel = { detectAll: vi.fn(() => [lm, other]), close: vi.fn() };
      landmarker.createLandmarker.mockReset();
      landmarker.createLandmarker.mockImplementation(async (_report?: unknown, poses?: number) => (poses === 2 ? probeModel : model));
    });

    it('never calls setPoses on the tracking model and creates the 2-pose model at the first probe only', async () => {
      await start();
      expect(landmarker.createLandmarker).toHaveBeenCalledTimes(1);
      send({ type: 'poses', count: 2 });
      await flush2();
      expect(landmarker.createLandmarker).toHaveBeenCalledTimes(2);
      expect(landmarker.createLandmarker.mock.calls[1]![1]).toBe(2);
      expect((model as unknown as { setPoses: ReturnType<typeof vi.fn> }).setPoses).not.toHaveBeenCalled();
    });

    it('says probe-ready when the 2-pose model is there, at once on a later probe', async () => {
      await start();
      posted.length = 0;
      send({ type: 'poses', count: 2 });
      expect(posted).toEqual([]); // the model still loads
      await flush2();
      expect(posted).toEqual([[{ type: 'probe-ready' }]]);
      send({ type: 'poses', count: 1 });
      posted.length = 0;
      send({ type: 'poses', count: 2 });
      expect(posted).toEqual([[{ type: 'probe-ready' }]]);
    });

    it('runs one inference for each probe frame, on the 2-pose model: the first pose is the result, the rest is extra', async () => {
      await start();
      send({ type: 'poses', count: 2 });
      await flush2();
      posted.length = 0;
      const b = bitmap();
      send({ type: 'frame', bitmap: b, timestampMs: 5 });
      expect(probeModel.detectAll).toHaveBeenCalledWith(b, 5);
      expect(model.detect).not.toHaveBeenCalled(); // two inferences for each frame halved the probe frames (3 to 5 in 2 s, 5 are needed)
      expect(b.close).toHaveBeenCalledOnce();
      expect(posted).toEqual([[{ type: 'result', timestampMs: 5, landmarks: lm, extra: [other] }]]);
    });

    it('sends one-pose results with an empty extra when the 2-pose model sees one person', async () => {
      probeModel.detectAll.mockReturnValue([lm]);
      await start();
      send({ type: 'poses', count: 2 });
      await flush2();
      posted.length = 0;
      send({ type: 'frame', bitmap: bitmap(), timestampMs: 6 });
      expect(posted).toEqual([[{ type: 'result', timestampMs: 6, landmarks: lm, extra: [] }]]);
    });

    it('sends null landmarks with the extra when the 2-pose model finds nobody', async () => {
      probeModel.detectAll.mockReturnValue([]);
      await start();
      send({ type: 'poses', count: 2 });
      await flush2();
      posted.length = 0;
      send({ type: 'frame', bitmap: bitmap(), timestampMs: 6 });
      expect(posted).toEqual([[{ type: 'result', timestampMs: 6, landmarks: null, extra: [] }]]);
    });

    it('tracks without a gap while the 2-pose model loads (no extra yet)', async () => {
      let release!: (m: typeof probeModel) => void;
      landmarker.createLandmarker.mockImplementation((_r?: unknown, poses?: number) =>
        poses === 2 ? new Promise((r) => (release = r)) : Promise.resolve(model),
      );
      await start();
      send({ type: 'poses', count: 2 });
      posted.length = 0;
      send({ type: 'frame', bitmap: bitmap(), timestampMs: 7 });
      expect(posted).toEqual([[{ type: 'result', timestampMs: 7, landmarks: lm }]]);
      release(probeModel);
    });

    it('sends plain results after the probe ends', async () => {
      await start();
      send({ type: 'poses', count: 2 });
      await flush2();
      send({ type: 'poses', count: 1 });
      posted.length = 0;
      send({ type: 'frame', bitmap: bitmap(), timestampMs: 8 });
      expect(model.detect).toHaveBeenCalledTimes(1);
      expect(posted).toEqual([[{ type: 'result', timestampMs: 8, landmarks: lm }]]);
    });

    it('closes the 2-pose model after the grace period, and reuses it before', async () => {
      await start();
      vi.useFakeTimers();
      try {
        send({ type: 'poses', count: 2 });
        await vi.advanceTimersByTimeAsync(10);
        send({ type: 'poses', count: 1 });
        await vi.advanceTimersByTimeAsync(5000);
        send({ type: 'poses', count: 2 }); // second probe inside the grace period
        await vi.advanceTimersByTimeAsync(10);
        expect(landmarker.createLandmarker).toHaveBeenCalledTimes(2); // not created again
        expect(probeModel.close).not.toHaveBeenCalled();
        send({ type: 'poses', count: 1 });
        await vi.advanceTimersByTimeAsync(20000);
        expect(probeModel.close).toHaveBeenCalledOnce();
        expect(model.close).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });

    it('keeps tracking when the 2-pose model cannot load, and tries again at the next probe', async () => {
      landmarker.createLandmarker.mockImplementation(async (_r?: unknown, poses?: number) => {
        if (poses === 2) throw new Error('no memory');
        return model;
      });
      await start();
      send({ type: 'poses', count: 2 });
      await flush2();
      posted.length = 0;
      send({ type: 'frame', bitmap: bitmap(), timestampMs: 9 });
      expect(posted).toEqual([[{ type: 'result', timestampMs: 9, landmarks: lm }]]);
      send({ type: 'poses', count: 1 });
      send({ type: 'poses', count: 2 });
      await flush2();
      expect(landmarker.createLandmarker).toHaveBeenCalledTimes(3);
    });
  });
});
