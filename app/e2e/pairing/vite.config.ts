import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The test pages for the pairing specs. They are never shipped.
// `vite preview` uses vite.config.ts of the app, so the pages run under the headers of public/_headers.
export default defineConfig({
  root: 'e2e/pairing',
  publicDir: false,
  plugins: [react()],
  build: {
    // PAIR_OUT lets a run build into a scratch folder.
    outDir: resolve(process.env.PAIR_OUT ?? 'node_modules/.cache/e2e-pairing'),
    emptyOutDir: true,
    rollupOptions: { input: { lab: resolve('e2e/pairing/lab.html'), screens: resolve('e2e/pairing/screens.html') } },
  },
});
