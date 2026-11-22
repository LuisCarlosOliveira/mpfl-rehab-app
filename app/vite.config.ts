/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `vite preview` sends the headers of the `/*` block of public/_headers, so tests run under the real policy.
// Blocks for single paths (caching rules) are not copied. They would apply to every path.
const headers = Object.fromEntries(
  readFileSync('public/_headers', 'utf8')
    .split(/\n(?=\S)/)
    .filter((b) => b.startsWith('/*\n'))
    .flatMap((b) => b.split('\n').slice(1))
    .filter((l) => /^\s+\S+:\s/.test(l))
    .map((l) => {
      const i = l.indexOf(':');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        // Zod and its setup (src/zodConfig.ts) share one chunk. The setup turns the eval test of zod off. A schema that
        // loads before the setup would run the test, and the CSP reports that as an issue (L4-02 split side effect).
        codeSplitting: { groups: [{ name: 'zod', test: /node_modules\/zod\/|src\/zodConfig\.ts/, priority: 20 }] },
      },
    },
  },
  preview: { headers },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/setup.ts'],
    // The first render of a lazy screen loads heavy chunks. On a loaded machine this takes more than the default 5 s.
    // A test that hangs still fails: it fails at 15 s instead of 5 s.
    testTimeout: 15000,
    hookTimeout: 15000,
  },
});
