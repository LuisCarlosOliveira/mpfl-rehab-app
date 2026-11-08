import { beforeEach, describe, expect, it, vi } from 'vitest';

const camera = vi.hoisted(() => ({ startCamera: vi.fn(), stopCamera: vi.fn() }));
const landmarker = vi.hoisted(() => ({ createLandmarker: vi.fn() }));
const loop = vi.hoisted(() => ({ startPoseLoop: vi.fn() }));
vi.mock('../../src/pose/camera', () => camera);
vi.mock('../../src/pose/landmarker', () => landmarker);
vi.mock('../../src/pose/loop', () => loop);

import { cameraSource } from '../../src/pose/source';

beforeEach(() => {
  vi.clearAllMocks();
  camera.startCamera.mockResolvedValue({ ok: true, stream: { getTracks: () => [] } });
  landmarker.createLandmarker.mockResolvedValue({ detect: vi.fn(), close: vi.fn() });
  loop.startPoseLoop.mockReturnValue({ stop: vi.fn(), stats: {} });
  HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve());
});

describe('cameraSource view and device', () => {
  it('keeps the side view and the default camera when no option is given', async () => {
    const source = cameraSource();
    expect(source.view).toBe('side');
    await source.start(vi.fn());
    expect(camera.startCamera).toHaveBeenCalledWith(undefined);
  });

  it('takes the view tag from the options', () => {
    expect(cameraSource({ view: 'front' }).view).toBe('front');
  });

  it('passes the device id and the facing mode to the camera', async () => {
    await cameraSource({ deviceId: 'cam-2', facingMode: 'environment' }).start(vi.fn());
    expect(camera.startCamera).toHaveBeenCalledWith({ deviceId: 'cam-2', facingMode: 'environment' });
  });
});
