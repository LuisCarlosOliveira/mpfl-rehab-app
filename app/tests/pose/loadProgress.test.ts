import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { createFromOptions, forVisionTasks } = vi.hoisted(() => ({
  createFromOptions: vi.fn(async () => ({ detectForVideo: vi.fn(), close: vi.fn() })),
  forVisionTasks: vi.fn(async (base: string) => ({ wasmLoaderPath: base, wasmBinaryPath: base })),
}));
vi.mock('@mediapipe/tasks-vision', () => ({ FilesetResolver: { forVisionTasks }, PoseLandmarker: { createFromOptions } }));

import { createLandmarker } from '../../src/pose/landmarker';

const realFetch = globalThis.fetch;
const body = (parts: number[]) =>
  new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        parts.forEach((n) => controller.enqueue(new Uint8Array(n)));
        controller.close();
      },
    }),
    { status: 200, headers: { 'Content-Type': 'application/wasm' } },
  );

beforeEach(() => {
  vi.clearAllMocks();
  globalThis.fetch = vi.fn(async () => body([1000, 2000, 500])) as unknown as typeof fetch;
});
afterEach(() => {
  globalThis.fetch = realFetch;
});

describe('createLandmarker progress callback', () => {
  it('reports the bytes of a model file that the loader fetches, and keeps the response usable', async () => {
    const seen: number[] = [];
    // The mocked loader fetches one file while the landmarker loads.
    forVisionTasks.mockImplementationOnce(async (base: string) => {
      const res = await fetch('/models/wasm/x.wasm');
      expect(res.headers.get('Content-Type')).toBe('application/wasm');
      expect((await res.arrayBuffer()).byteLength).toBe(3500);
      return { wasmLoaderPath: base, wasmBinaryPath: base };
    });
    const landmarker = await createLandmarker((bytes) => seen.push(bytes));
    expect(seen.reduce((a, b) => a + b, 0)).toBe(3500);
    landmarker.close();
  });

  it('does not wrap a response when no callback is given', async () => {
    const original = body([10]);
    globalThis.fetch = vi.fn(async () => original) as unknown as typeof fetch;
    forVisionTasks.mockImplementationOnce(async (base: string) => {
      expect(await fetch('/models/wasm/x.wasm')).toBe(original);
      return { wasmLoaderPath: base, wasmBinaryPath: base };
    });
    (await createLandmarker()).close();
  });

  it('still blocks a foreign origin when a callback is given', async () => {
    forVisionTasks.mockImplementationOnce(async (base: string) => {
      await expect(fetch('https://example.com/a')).rejects.toThrow('Blocked');
      return { wasmLoaderPath: base, wasmBinaryPath: base };
    });
    (await createLandmarker(() => undefined)).close();
  });
});
