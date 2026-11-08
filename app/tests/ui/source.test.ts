import { beforeEach, describe, expect, it, vi } from 'vitest';

const camera = vi.hoisted(() => ({ startCamera: vi.fn(), stopCamera: vi.fn() }));
const landmarker = vi.hoisted(() => ({ createLandmarker: vi.fn() }));
const loop = vi.hoisted(() => ({ startPoseLoop: vi.fn() }));
vi.mock('../../src/pose/camera', () => camera);
vi.mock('../../src/pose/landmarker', () => landmarker);
vi.mock('../../src/pose/loop', () => loop);

import { cameraSource } from '../../src/pose/source';

const track = () => ({ stop: vi.fn() });
const fakeStream = (tracks = [track()]) => ({ getTracks: () => tracks }) as unknown as MediaStream;

let model: { detect: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> };
let loopStop: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  model = { detect: vi.fn(() => null), close: vi.fn() };
  loopStop = vi.fn();
  camera.startCamera.mockResolvedValue({ ok: true, stream: fakeStream() });
  landmarker.createLandmarker.mockResolvedValue(model);
  loop.startPoseLoop.mockReturnValue({ stop: loopStop, stats: {} });
  HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve());
});

describe('cameraSource', () => {
  it('has the side view tag', () => {
    expect(cameraSource().view).toBe('side');
  });

  it('starts the camera, loads the model and passes the frames to the handler', async () => {
    const source = cameraSource();
    const onFrame = vi.fn();
    const video = document.createElement('video');
    expect(await source.start(onFrame, video)).toEqual({ ok: true });
    expect(camera.startCamera).toHaveBeenCalledTimes(1);
    const options = loop.startPoseLoop.mock.calls[0]![0];
    expect(options.video).toBe(video);
    options.onFrame(null, 12);
    expect(onFrame).toHaveBeenCalledWith(null, 12);
  });

  it('passes a camera error through and does not load the model', async () => {
    camera.startCamera.mockResolvedValue({ ok: false, error: { kind: 'permission-denied', message: 'blocked' } });
    const result = await cameraSource().start(vi.fn());
    expect(result).toEqual({ ok: false, error: { kind: 'permission-denied', message: 'blocked' } });
    expect(landmarker.createLandmarker).not.toHaveBeenCalled();
  });

  it('releases the camera and names the error when the model cannot load', async () => {
    landmarker.createLandmarker.mockRejectedValue(new Error('no model'));
    const result = await cameraSource().start(vi.fn());
    expect(result.ok).toBe(false);
    expect(camera.stopCamera).toHaveBeenCalled();
  });

  it('a second start reuses the stream and the model and replaces the loop', async () => {
    const source = cameraSource();
    await source.start(vi.fn(), document.createElement('video'));
    await source.start(vi.fn(), document.createElement('video'));
    expect(camera.startCamera).toHaveBeenCalledTimes(1);
    expect(landmarker.createLandmarker).toHaveBeenCalledTimes(1);
    expect(loop.startPoseLoop).toHaveBeenCalledTimes(2);
    expect(loopStop).toHaveBeenCalledTimes(1);
  });

  it('stop ends the loop, closes the model and stops the camera', async () => {
    const source = cameraSource();
    await source.start(vi.fn(), document.createElement('video'));
    source.stop();
    expect(loopStop).toHaveBeenCalled();
    expect(model.close).toHaveBeenCalled();
    expect(camera.stopCamera).toHaveBeenCalled();
  });

  it('stop is safe before any start', () => {
    expect(() => cameraSource().stop()).not.toThrow();
  });

  it('a stop while the camera starts stops the new tracks and ends no loop', async () => {
    const t = track();
    let resolve!: (v: unknown) => void;
    camera.startCamera.mockReturnValue(new Promise((r) => (resolve = r)));
    const source = cameraSource();
    const pending = source.start(vi.fn());
    source.stop();
    resolve({ ok: true, stream: fakeStream([t]) });
    expect((await pending).ok).toBe(false);
    expect(t.stop).toHaveBeenCalled();
    expect(loop.startPoseLoop).not.toHaveBeenCalled();
  });

  it('reports the video aspect, with a default before the video has a size', async () => {
    const source = cameraSource();
    expect(source.aspect()).toBeCloseTo(16 / 9);
    const video = document.createElement('video');
    Object.defineProperty(video, 'videoWidth', { value: 640 });
    Object.defineProperty(video, 'videoHeight', { value: 480 });
    await source.start(vi.fn(), video);
    expect(source.aspect()).toBeCloseTo(4 / 3);
  });
});

describe('cameraSource after the camera stopped by itself', () => {
  it('asks for a new stream when every track of the old one has ended', async () => {
    const ended = { stop: vi.fn(), readyState: 'ended' };
    camera.startCamera.mockResolvedValueOnce({ ok: true, stream: fakeStream([ended as never]) });
    const source = cameraSource();
    await source.start(vi.fn(), document.createElement('video'));
    await source.start(vi.fn(), document.createElement('video'));
    expect(camera.startCamera).toHaveBeenCalledTimes(2);
  });
});
