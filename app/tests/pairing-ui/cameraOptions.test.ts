// The view tag and the camera choice of a landmark source (T9c leftovers, used by the second view).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startCamera, stopCamera } from '../../src/pose/camera';

const stream = () => ({ getTracks: () => [] }) as unknown as MediaStream;
const gum = vi.fn();

beforeEach(() => {
  gum.mockReset().mockResolvedValue(stream());
  Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: gum }, configurable: true });
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
});
afterEach(() => stopCamera());

describe('startCamera options', () => {
  it('asks for the user facing camera and no audio by default', async () => {
    await startCamera();
    expect(gum).toHaveBeenCalledWith({ video: { facingMode: 'user' }, audio: false });
  });

  it('asks for the rear camera when the caller says so, still with no audio', async () => {
    await startCamera({ facingMode: 'environment' });
    expect(gum).toHaveBeenCalledWith({ video: { facingMode: 'environment' }, audio: false });
  });

  it('asks for one device when the caller gives a device id, still with no audio', async () => {
    await startCamera({ deviceId: 'cam-2' });
    expect(gum).toHaveBeenCalledWith({ video: { deviceId: { exact: 'cam-2' } }, audio: false });
  });
});
