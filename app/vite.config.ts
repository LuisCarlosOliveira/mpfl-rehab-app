/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `vite preview` sends the same headers as public/_headers, so tests run under the real policy.
const headers = Object.fromEntries(
  readFileSync('public/_headers', 'utf8')
    .split('\n')
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
