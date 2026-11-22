import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const camera = vi.hoisted(() => ({ startCamera: vi.fn(), stopCamera: vi.fn() }));
const landmarker = vi.hoisted(() => ({ createLandmarker: vi.fn() }));
const bridgeModule = vi.hoisted(() => ({ createFrameBridge: vi.fn() }));
const loop = vi.hoisted(() => ({ startPoseLoop: vi.fn() }));
vi.mock('../../src/pose/camera', () => camera);
vi.mock('../../src/pose/landmarker', () => landmarker);
vi.mock('../../src/pose/frameBridge', () => bridgeModule);
vi.mock('../../src/pose/loop', () => loop);

import { cameraSource, type StartProgress } from '../../src/pose/source';

const fakeStream = () => ({ getTracks: () => [{ stop: vi.fn(), readyState: 'live' }] }) as unknown as MediaStream;
let bridge: { submit: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn>; setPoses: ReturnType<typeof vi.fn> };
let bridgeOptions: { onResult: (lm: unknown, t: number) => void; onProgress?: (b: number) => void; onProbeReady?: () => void; onFail: () => void };
let model: { detect: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> };
let loopStop: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  bridge = { submit: vi.fn(), close: vi.fn(), setPoses: vi.fn() };
  model = { detect: vi.fn(() => null), close: vi.fn() };
  loopStop = vi.fn();
  camera.startCamera.mockResolvedValue({ ok: true, stream: fakeStream() });
  bridgeModule.createFrameBridge.mockImplementation(async (o) => ((bridgeOptions = o), bridge));
  landmarker.createLandmarker.mockResolvedValue(model);
  loop.startPoseLoop.mockReturnValue({ stop: loopStop, stats: {} });
  HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve());
});

describe('cameraSource with the pose worker', () => {
  it('uses the worker and does not load the main-thread landmarker', async () => {
    expect(await cameraSource().start(vi.fn(), document.createElement('video'))).toEqual({ ok: true });
    expect(bridgeModule.createFrameBridge).toHaveBeenCalledTimes(1);
    expect(landmarker.createLandmarker).not.toHaveBeenCalled();
  });

  it('the loop sends each frame to the worker and gives no answer itself', async () => {
    const video = document.createElement('video');
    await cameraSource().start(vi.fn(), video);
    const { detect } = loop.startPoseLoop.mock.calls[0]![0];
    expect(detect(video, 33)).toBeUndefined();
    expect(bridge.submit).toHaveBeenCalledWith(video, 33);
  });

  it('passes a worker result to the handler of the latest start', async () => {
    const source = cameraSource();
    const first = vi.fn();
    const second = vi.fn();
    await source.start(first, document.createElement('video'));
    await source.start(second, document.createElement('video'));
    const lm = [{ x: 0.1, y: 0.2, visibility: 1 }];
    bridgeOptions.onResult(lm, 50);
    expect(second).toHaveBeenCalledWith(lm, 50);
    expect(first).not.toHaveBeenCalled();
    expect(bridgeModule.createFrameBridge).toHaveBeenCalledTimes(1);
  });

  it('passes the model bytes on, at most every 200 ms, as the main-thread path does', async () => {
    let now = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    bridgeModule.createFrameBridge.mockImplementation(async (o) => {
      o.onProgress?.(100);
      now += 300;
      o.onProgress?.(100);
      return bridge;
    });
    const steps: StartProgress[] = [];
    await cameraSource().start(vi.fn(), document.createElement('video'), (p) => steps.push(p));
    expect(steps.map((s) => s.step)).toEqual(['camera', 'model', 'model']);
    expect(steps[2]).toEqual({ step: 'model', loadedBytes: 200 });
    vi.restoreAllMocks();
  });

  it('stop closes the worker bridge and stops the camera', async () => {
    const source = cameraSource();
    await source.start(vi.fn(), document.createElement('video'));
    source.stop();
    expect(bridge.close).toHaveBeenCalledOnce();
    expect(loopStop).toHaveBeenCalled();
    expect(camera.stopCamera).toHaveBeenCalled();
  });

  it('a worker that fails after the start releases the camera and the worker', async () => {
    await cameraSource().start(vi.fn(), document.createElement('video'));
    bridgeOptions.onFail();
    expect(bridge.close).toHaveBeenCalled();
    expect(camera.stopCamera).toHaveBeenCalled();
  });

  it('a stop while the worker starts closes the new worker and ends no loop', async () => {
    let finish!: (b: unknown) => void;
    bridgeModule.createFrameBridge.mockReturnValue(new Promise((r) => (finish = r)));
    const source = cameraSource();
    const pending = source.start(vi.fn(), document.createElement('video'));
    await new Promise((r) => setTimeout(r));
    source.stop();
    finish(bridge);
    expect((await pending).ok).toBe(false);
    expect(bridge.close).toHaveBeenCalled();
    expect(loop.startPoseLoop).not.toHaveBeenCalled();
  });
});

describe('cameraSource falls back to the main thread', () => {
  it.each([
    ['the browser has no worker or no picture API', () => bridgeModule.createFrameBridge.mockResolvedValue(null)],
    ['the worker cannot start', () => bridgeModule.createFrameBridge.mockRejectedValue(new Error('no worker'))],
  ])('when %s', async (_n, arrange) => {
    arrange();
    expect(await cameraSource().start(vi.fn(), document.createElement('video'))).toEqual({ ok: true });
    expect(landmarker.createLandmarker).toHaveBeenCalledTimes(1);
    const { detect } = loop.startPoseLoop.mock.calls[0]![0];
    const video = document.createElement('video');
    detect(video, 7);
    expect(model.detect).toHaveBeenCalledWith(video, 7);
  });

  it('does not try the worker when the option is off', async () => {
    await cameraSource({ worker: false }).start(vi.fn(), document.createElement('video'));
    expect(bridgeModule.createFrameBridge).not.toHaveBeenCalled();
    expect(landmarker.createLandmarker).toHaveBeenCalledTimes(1);
  });

  it('names the model error when both ways fail', async () => {
    bridgeModule.createFrameBridge.mockRejectedValue(new Error('no worker'));
    landmarker.createLandmarker.mockRejectedValue(new Error('no model'));
    const result = await cameraSource().start(vi.fn());
    expect(result.ok).toBe(false);
    expect(camera.stopCamera).toHaveBeenCalled();
  });

  describe('probe with the worker', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('counts the probe time from the moment the 2-pose model is ready, so the probe frames are not lost while it loads', async () => {
      const source = cameraSource();
      await source.start(vi.fn(), document.createElement('video'));
      source.probe!(2000);
      expect(bridge.setPoses).toHaveBeenCalledExactlyOnceWith(2);
      vi.advanceTimersByTime(3000); // the model loads for 3 s: the probe goes on
      expect(bridge.setPoses).toHaveBeenCalledTimes(1);
      bridgeOptions.onProbeReady!();
      vi.advanceTimersByTime(1999);
      expect(bridge.setPoses).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(1);
      expect(bridge.setPoses).toHaveBeenLastCalledWith(1);
    });

    it('ends the probe after a limit when the 2-pose model never comes', async () => {
      const source = cameraSource();
      await source.start(vi.fn(), document.createElement('video'));
      source.probe!(2000);
      vi.advanceTimersByTime(9999);
      expect(bridge.setPoses).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(1);
      expect(bridge.setPoses).toHaveBeenLastCalledWith(1);
    });
  });
});
