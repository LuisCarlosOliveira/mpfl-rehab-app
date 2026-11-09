// The camera source tells the screen which start step runs: the camera, then the model with its bytes.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const camera = vi.hoisted(() => ({ startCamera: vi.fn(), stopCamera: vi.fn() }));
const landmarker = vi.hoisted(() => ({ createLandmarker: vi.fn() }));
const loop = vi.hoisted(() => ({ startPoseLoop: vi.fn() }));
vi.mock('../../src/pose/camera', () => camera);
vi.mock('../../src/pose/landmarker', () => landmarker);
vi.mock('../../src/pose/loop', () => loop);

import { cameraSource, type StartProgress } from '../../src/pose/source';

const fakeStream = () => ({ getTracks: () => [{ stop: vi.fn(), readyState: 'live' }] }) as unknown as MediaStream;

beforeEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
  camera.startCamera.mockResolvedValue({ ok: true, stream: fakeStream() });
  landmarker.createLandmarker.mockResolvedValue({ detect: vi.fn(() => null), close: vi.fn() });
  loop.startPoseLoop.mockReturnValue({ stop: vi.fn(), stats: {} });
  HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve());
});

describe('cameraSource start progress', () => {
  it('names the camera step, then the model step, in this order', async () => {
    const steps: StartProgress[] = [];
    await cameraSource().start(vi.fn(), document.createElement('video'), (p) => steps.push(p));
    expect(steps.map((s) => s.step)).toEqual(['camera', 'model']);
    expect(steps[1]).toEqual({ step: 'model', loadedBytes: 0 });
  });

  it('passes the bytes of the loader on, at most every 200 ms', async () => {
    let now = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    landmarker.createLandmarker.mockImplementation(async (report?: (bytes: number) => void) => {
      report?.(100);
      now += 50;
      report?.(100); // inside 200 ms: not passed on
      now += 300;
      report?.(100); // passed on with the total 300
      return { detect: vi.fn(() => null), close: vi.fn() };
    });
    const steps: StartProgress[] = [];
    await cameraSource().start(vi.fn(), document.createElement('video'), (p) => steps.push(p));
    const loads = steps.filter((s) => s.step === 'model').map((s) => (s as { loadedBytes: number }).loadedBytes);
    expect(loads).toEqual([0, 300]);
    vi.restoreAllMocks();
  });

  it('skips a step that already ran: a second start names none', async () => {
    const source = cameraSource();
    await source.start(vi.fn(), document.createElement('video'));
    const steps: StartProgress[] = [];
    await source.start(vi.fn(), document.createElement('video'), (p) => steps.push(p));
    expect(steps).toEqual([]);
  });

  it('works without a handler', async () => {
    expect(await cameraSource().start(vi.fn(), document.createElement('video'))).toEqual({ ok: true });
    expect(landmarker.createLandmarker).toHaveBeenCalledWith(undefined);
  });
});
