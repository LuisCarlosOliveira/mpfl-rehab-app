// Builds the clip page into a scratch folder. analyze-clip.mjs sets the folder in CLIP_OUT_DIR.
// The model and the WASM files come from public/, the same files that the app serves.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: here,
  publicDir: resolve(here, '../public'),
  logLevel: 'warn',
  build: {
    outDir: process.env.CLIP_OUT_DIR,
    emptyOutDir: true,
    rollupOptions: { input: resolve(here, 'clip-page.html') },
  },
});
