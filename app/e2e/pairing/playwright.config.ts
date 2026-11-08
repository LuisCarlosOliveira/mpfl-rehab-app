import { defineConfig } from '@playwright/test';

// A separate config for the pairing specs. It builds its own pages and serves them on its own port.
// The main config is untouched, so another session can keep its servers on 4173 and 4174.
// Run: PAIR_OUT=<scratch folder> npx playwright test -c e2e/pairing/playwright.config.ts --workers=1 --project=pairing (and --project=pairing-ip)
const PORT = Number(process.env.PAIR_PORT ?? 4182);
const OUT = process.env.PAIR_OUT ?? 'node_modules/.cache/e2e-pairing';
const fake = ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'];

export default defineConfig({
  testDir: '..',
  testMatch: 'pairing.spec.ts',
  workers: 1,
  fullyParallel: false,
  reporter: 'list',
  use: { baseURL: `http://127.0.0.1:${PORT}` },
  webServer: {
    command: `vite build --config e2e/pairing/vite.config.ts && vite preview --outDir ${OUT} --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}/lab.html`,
    reuseExistingServer: false,
    timeout: 120_000,
    cwd: '../..',
  },
  projects: [
    // The default Chromium. A page hides its local address behind an mDNS name.
    { name: 'pairing', use: { browserName: 'chromium', launchOptions: { args: fake } } },
    // The same specs with real local addresses in the candidates (the case of a phone that holds the camera permission).
    // The flag turns the mDNS hiding off. It is used only here.
    {
      name: 'pairing-ip',
      use: { browserName: 'chromium', launchOptions: { args: [...fake, '--disable-features=WebRtcHideLocalIpsWithMdns'] } },
    },
  ],
});
