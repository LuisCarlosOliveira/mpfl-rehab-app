import { readFileSync } from 'node:fs';
import { decodeQr, readQrFromVideo, startQrScan } from '../../src/pairing/qrReader';
import { frameFor, type Frame } from './qrHelpers';

const TEXT = 'MPFL1.hello-world';
const here = (rel: string) => new URL(rel, import.meta.url);

describe('decodeQr', () => {
  it('returns the text of a real QR frame', () => {
    expect(decodeQr(frameFor(TEXT))).toBe(TEXT);
  });

  it('returns null for a blank frame', () => {
    const data = new Uint8ClampedArray(40 * 40 * 4).fill(255);
    expect(decodeQr({ data, width: 40, height: 40 })).toBeNull();
  });

  it('returns null, and does not throw, when the data length is wrong', () => {
    expect(decodeQr({ data: new Uint8ClampedArray(10), width: 40, height: 40 })).toBeNull();
    expect(decodeQr({ data: new Uint8ClampedArray(40 * 40 * 4 + 1), width: 40, height: 40 })).toBeNull();
  });

  it.each([
    [0, 0],
    [-4, 4],
    [2.5, 2],
    [Number.NaN, 4],
  ])('returns null for the size %s by %s', (width, height) => {
    expect(decodeQr({ data: new Uint8ClampedArray(64), width, height })).toBeNull();
  });

  it('returns null for input that is not a frame', () => {
    expect(decodeQr(null as unknown as Frame)).toBeNull();
    expect(decodeQr({ data: [1, 2, 3, 4], width: 1, height: 1 } as unknown as Frame)).toBeNull();
  });

  it('does not read a code with swapped colours', () => {
    expect(decodeQr(frameFor(TEXT, undefined, true))).toBeNull();
  });

  it('returns a string and nothing else', () => {
    const result = decodeQr(frameFor(TEXT));
    expect(typeof result).toBe('string');
  });

  it('accepts text of exactly 600 characters', () => {
    const text = 'a'.repeat(600);
    expect(decodeQr(frameFor(text, { ecc: 'L' }))).toBe(text);
  });

  it('refuses text of 601 characters', () => {
    expect(decodeQr(frameFor('a'.repeat(601), { ecc: 'L' }))).toBeNull();
  });
});

type Spy = ReturnType<typeof vi.fn>;
function stubCanvas(frame: Frame, over: { getImageData?: Spy } = {}) {
  const drawImage = vi.fn();
  const getImageData = over.getImageData ?? vi.fn(() => ({ data: frame.data, width: frame.width, height: frame.height }));
  const canvas = { width: 0, height: 0, getContext: vi.fn(() => ({ drawImage, getImageData })) };
  const create = vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
    if (tag === 'canvas') return canvas as unknown as HTMLCanvasElement;
    throw new Error(`unexpected element ${tag}`);
  }) as typeof document.createElement);
  return { canvas, drawImage, getImageData, create };
}

function video(width: number, height: number) {
  return { videoWidth: width, videoHeight: height } as HTMLVideoElement;
}

describe('readQrFromVideo', () => {
  afterEach(() => vi.restoreAllMocks());

  it('draws the frame, reads the pixels and returns the text', () => {
    const frame = frameFor(TEXT);
    const { drawImage, getImageData, canvas } = stubCanvas(frame);
    const v = video(frame.width, frame.height);
    expect(readQrFromVideo(v)).toBe(TEXT);
    expect(drawImage).toHaveBeenCalledTimes(1);
    expect(drawImage.mock.calls[0]?.[0]).toBe(v);
    expect(getImageData).toHaveBeenCalledTimes(1);
    expect(canvas.width).toBe(0);
    expect(canvas.height).toBe(0);
  });

  it('returns a string or null only', () => {
    const frame = frameFor(TEXT);
    stubCanvas(frame);
    expect(typeof readQrFromVideo(video(frame.width, frame.height))).toBe('string');
    vi.restoreAllMocks();
    const blank = { data: new Uint8ClampedArray(16 * 16 * 4), width: 16, height: 16 };
    stubCanvas(blank);
    expect(readQrFromVideo(video(16, 16))).toBeNull();
  });

  it('scales a large video to 640 pixels on the long side', () => {
    const frame = frameFor(TEXT);
    const { canvas, drawImage } = stubCanvas(frame);
    const sizes: number[][] = [];
    drawImage.mockImplementation(() => sizes.push([canvas.width, canvas.height]));
    readQrFromVideo(video(1920, 1080));
    expect(sizes[0]).toEqual([640, 360]);
    sizes.length = 0;
    readQrFromVideo(video(1080, 1920));
    expect(sizes[0]).toEqual([360, 640]);
    sizes.length = 0;
    readQrFromVideo(video(320, 240));
    expect(sizes[0]).toEqual([320, 240]);
  });

  it('shrinks the canvas to 0 by 0 when the decode path throws', () => {
    const boom = vi.fn(() => {
      throw new Error('no pixels');
    });
    const { canvas } = stubCanvas(frameFor(TEXT), { getImageData: boom });
    expect(() => readQrFromVideo(video(100, 100))).not.toThrow();
    expect(readQrFromVideo(video(100, 100))).toBeNull();
    expect(canvas.width).toBe(0);
    expect(canvas.height).toBe(0);
  });

  it('returns null and shrinks the canvas when jsQR throws on a wrong buffer', () => {
    const bad = vi.fn(() => ({ data: new Uint8ClampedArray(8), width: 100, height: 100 }));
    const { canvas } = stubCanvas(frameFor(TEXT), { getImageData: bad });
    expect(readQrFromVideo(video(100, 100))).toBeNull();
    expect(canvas.width).toBe(0);
  });

  it('returns null when the video has no size yet', () => {
    const { getImageData } = stubCanvas(frameFor(TEXT));
    expect(readQrFromVideo(video(0, 0))).toBeNull();
    expect(getImageData).not.toHaveBeenCalled();
  });

  it('refuses a result longer than 600 characters', () => {
    const frame = frameFor('a'.repeat(601), { ecc: 'L' });
    const { canvas } = stubCanvas(frame);
    expect(readQrFromVideo(video(frame.width, frame.height))).toBeNull();
    expect(canvas.width).toBe(0);
  });

  it('sends and stores nothing', () => {
    const frame = frameFor(TEXT);
    stubCanvas(frame);
    const beacon = vi.fn(() => true);
    vi.stubGlobal('navigator', { ...navigator, sendBeacon: beacon });
    const calls = [
      vi.spyOn(globalThis, 'fetch'),
      vi.spyOn(XMLHttpRequest.prototype, 'open'),
      vi.spyOn(XMLHttpRequest.prototype, 'send'),
      beacon,
      vi.spyOn(Storage.prototype, 'setItem'),
      vi.spyOn(indexedDB, 'open'),
      vi.spyOn(HTMLCanvasElement.prototype, 'toBlob'),
      vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL'),
    ];
    readQrFromVideo(video(frame.width, frame.height));
    expect(calls.map((c) => c.mock.calls.length)).toEqual(calls.map(() => 0));
    vi.unstubAllGlobals();
  });

  it('leaves no canvas in the page', () => {
    const frame = frameFor(TEXT);
    stubCanvas(frame);
    readQrFromVideo(video(frame.width, frame.height));
    expect(document.querySelectorAll('canvas')).toHaveLength(0);
  });
});

describe('startQrScan', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('reads on an interval and stops after the first text', () => {
    const frame = frameFor(TEXT);
    const blank = { data: new Uint8ClampedArray(16 * 16 * 4), width: 16, height: 16 };
    const { getImageData } = stubCanvas(blank);
    getImageData.mockReturnValueOnce(blank).mockReturnValueOnce(blank).mockReturnValue(frame);
    const onText = vi.fn();
    startQrScan(video(100, 100), onText, 250);
    vi.advanceTimersByTime(249);
    expect(getImageData).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(getImageData).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(500);
    expect(onText).toHaveBeenCalledExactlyOnceWith(TEXT);
    vi.advanceTimersByTime(5000);
    expect(getImageData).toHaveBeenCalledTimes(3);
  });

  it('uses 250 ms as the default interval', () => {
    const { getImageData } = stubCanvas(frameFor(TEXT));
    getImageData.mockReturnValue({ data: new Uint8ClampedArray(16 * 16 * 4), width: 16, height: 16 });
    const stop = startQrScan(video(100, 100), vi.fn());
    vi.advanceTimersByTime(250);
    expect(getImageData).toHaveBeenCalledTimes(1);
    stop();
  });

  it('stops when the caller stops it', () => {
    const { getImageData } = stubCanvas(frameFor(TEXT));
    getImageData.mockReturnValue({ data: new Uint8ClampedArray(16 * 16 * 4), width: 16, height: 16 });
    const stop = startQrScan(video(100, 100), vi.fn(), 100);
    vi.advanceTimersByTime(300);
    stop();
    stop();
    vi.advanceTimersByTime(1000);
    expect(getImageData).toHaveBeenCalledTimes(3);
  });

  it('keeps no timer after the first text', () => {
    stubCanvas(frameFor(TEXT));
    startQrScan(video(100, 100), vi.fn(), 100);
    vi.advanceTimersByTime(100);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('source rules of qrReader.ts', () => {
  const source = readFileSync(here('../../src/pairing/qrReader.ts'), 'utf8');
  const code = source.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

  it('has one getImageData line and it ends with the marker', () => {
    const lines = source.split('\n').filter((l) => l.includes('getImageData'));
    expect(lines.filter((l) => !l.startsWith('//') && !l.trim().startsWith('*'))).toHaveLength(1);
    expect(lines.find((l) => /getImageData\(/.test(l)) ?? '').toMatch(/claims-check:allow\s*$/);
  });

  it.each([
    'toBlob', 'toDataURL', 'createImageBitmap', 'OffscreenCanvas', 'MediaRecorder', 'ImageCapture',
    'localStorage', 'sessionStorage', 'indexedDB', 'fetch', 'postMessage', 'XMLHttpRequest', 'sendBeacon', 'WebSocket',
  ])('does not use %s', (name) => {
    expect(code).not.toContain(name);
  });

  it('passes dontInvert to jsQR', () => {
    expect(code).toContain("inversionAttempts: 'dontInvert'");
  });

  it('exports no function that returns a frame or a canvas', () => {
    expect(code).not.toMatch(/export (const|function) \w+[^{=]*:\s*(ImageData|HTMLCanvasElement)/);
  });
});
