// @vitest-environment node
// S-02: Zod must not call Function('') under a CSP without eval. See docs/security-review.md.
import { readFileSync } from 'node:fs';
import { vi } from 'vitest';

function spyOnFunction() {
  const real = globalThis.Function;
  const calls: unknown[][] = [];
  const spy = function (this: unknown, ...args: unknown[]) {
    calls.push(args);
    return real(...(args as string[]));
  } as unknown as FunctionConstructor;
  Object.defineProperty(spy, 'prototype', { value: real.prototype });
  globalThis.Function = spy;
  return { calls, restore: () => { globalThis.Function = real; } };
}

describe('zodConfig', () => {
  it('control: without the config, Zod calls Function', async () => {
    vi.resetModules();
    const spy = spyOnFunction();
    try {
      const { z } = await import('zod');
      z.config({ jitless: false }); // tests/setup.ts sets it, so undo it for the control
      z.strictObject({ a: z.number() }).safeParse({ a: 1 });
      expect(spy.calls.length).toBeGreaterThan(0);
    } finally {
      spy.restore();
    }
  });

  it('with the config, the real schemas never call Function and still validate', async () => {
    vi.resetModules();
    const spy = spyOnFunction();
    try {
      await import('../src/zodConfig');
      const { exportSchema } = await import('../src/lib/storage/export');
      const { z } = await import('zod');
      const shape = z.strictObject({ a: z.number().max(5) });
      expect(shape.safeParse({ a: 1 }).success).toBe(true);
      expect(shape.safeParse({ a: 9 }).success).toBe(false);
      expect(shape.safeParse({ a: 1, extra: 1 }).success).toBe(false);
      expect(exportSchema.safeParse({}).success).toBe(false);
      expect(spy.calls).toEqual([]);
    } finally {
      spy.restore();
    }
  });

  it('main.tsx imports zodConfig first', () => {
    const imports = readFileSync('src/main.tsx', 'utf8')
      .split('\n')
      .filter((l) => l.startsWith('import '));
    expect(imports[0]).toMatch(/^import ['"]\.\/zodConfig['"];$/);
  });

  it('tests/setup.ts imports zodConfig', () => {
    expect(readFileSync('tests/setup.ts', 'utf8')).toMatch(/import ['"]\.\.\/src\/zodConfig['"]/);
  });
});
