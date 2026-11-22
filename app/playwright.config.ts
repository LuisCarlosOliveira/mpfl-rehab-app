import { defineConfig } from '@playwright/test';

const PORT = 4173;
const APP_PORT = 4174; // the real build in dist, for the specs that load the whole app
const FLAG_ON_PORT = Number(process.env.E2E_FLAG_ON_PORT ?? 4175); // the same app built with VITE_SELF_PROGRESSION=true, for the specs that move the phase forward
const fake = ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'];

export default defineConfig({
  testDir: 'e2e',
  workers: 1,
  fullyParallel: false,
  reporter: 'list',
  use: { baseURL: `http://127.0.0.1:${PORT}` },
  // The main app is built (hash check, headers file) and the test page is built beside it.
  // `vite preview` sends the headers of public/_headers.
  webServer: [
    {
      command: `npm run build && vite build --config e2e/harness/vite.config.ts && vite preview --outDir node_modules/.cache/e2e-harness --host 127.0.0.1 --port ${PORT} --strictPort`,
      url: `http://127.0.0.1:${PORT}/index.html`,
      reuseExistingServer: false,
      timeout: 180_000,
    },
    {
      // The real app. It starts after the first server, which builds dist. The headers come from public/_headers.
      command: `vite preview --outDir dist --host 127.0.0.1 --port ${APP_PORT} --strictPort`,
      url: `http://127.0.0.1:${APP_PORT}/index.html`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      // The flag is read at build time. This build is separate from dist, which has the default (off).
      command: `vite build --outDir node_modules/.cache/e2e-flag-on --emptyOutDir && vite preview --outDir node_modules/.cache/e2e-flag-on --host 127.0.0.1 --port ${FLAG_ON_PORT} --strictPort`,
      url: `http://127.0.0.1:${FLAG_ON_PORT}/index.html`,
      env: { VITE_SELF_PROGRESSION: 'true' },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
  projects: [
    {
      name: 'camera',
      testMatch: ['camera.spec.ts', 'landmarker.spec.ts', 'headers.spec.ts'],
      use: { browserName: 'chromium', launchOptions: { args: fake } },
    },
    {
      name: 'denied',
      testMatch: 'camera-denied.spec.ts',
      // Fake device, no fake-ui flag: the permission prompt is not accepted. Full Chromium build.
      use: { browserName: 'chromium', channel: 'chromium', launchOptions: { args: ['--use-fake-device-for-media-stream'] } },
    },
    {
      name: 'no-device',
      testMatch: 'camera-none.spec.ts',
      // No fake device flag. This machine has no real camera.
      use: { browserName: 'chromium', launchOptions: { args: ['--use-fake-ui-for-media-stream'] } },
    },
    {
      name: 'app',
      testMatch: ['app-*.spec.ts', 'camera-exit.spec.ts', 'pairing-app.spec.ts', 'generator.spec.ts', 'progress.spec.ts', 'session-flow.spec.ts'],
      // The real built app with the fake camera. The fake-ui flag accepts the permission prompt.
      use: { browserName: 'chromium', baseURL: `http://127.0.0.1:${APP_PORT}`, launchOptions: { args: fake } },
    },
    {
      name: 'no-gpu',
      testMatch: 'no-gpu.spec.ts',
      // WebGL is off (no GPU, no SwiftShader). The GPU delegate cannot start, so the app must use the CPU delegate.
      use: { browserName: 'chromium', baseURL: `http://127.0.0.1:${APP_PORT}`, launchOptions: { args: [...fake, '--disable-gpu', '--disable-software-rasterizer'] } },
    },
    {
      name: 'webkit',
      testMatch: 'webkit.spec.ts',
      // The Safari engine on the real built app. No fake camera flags exist, so the spec stubs getUserMedia.
      use: { browserName: 'webkit', baseURL: `http://127.0.0.1:${APP_PORT}` },
    },
  ],
});
