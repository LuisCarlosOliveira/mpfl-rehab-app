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
  preview: { headers },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/setup.ts'],
  },
});
