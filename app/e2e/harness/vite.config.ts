import { defineConfig } from 'vite';

// Builds the test page next to the models. The result stays inside node_modules/.cache.
export default defineConfig({
  root: 'e2e/harness',
  publicDir: '../../public',
  build: { outDir: '../../node_modules/.cache/e2e-harness', emptyOutDir: true },
});
