// The pose worker loads the model, turns each received picture into landmark numbers and closes the picture.
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
});
