import { expect, test, type Page } from '@playwright/test';
import { expectScreen, installProbes, stopButton, toSession, trackStates, watch } from './helpers/app';

interface WorkerProbe {
  created: number;
  terminated: number;
  types: Record<string, number>;
  badResults: string[];
}
declare global {
  interface Window {
    __worker: WorkerProbe;
  }
}

async function probeWorker(page: Page, { hideWorker = false } = {}) {
  await page.addInitScript((hide) => {
    const probe: WorkerProbe = { created: 0, terminated: 0, types: {}, badResults: [] };
    window.__worker = probe;
    const num = (v: unknown) => typeof v === 'number';
    const RealWorker = window.Worker;
    if (hide) {
      // @ts-expect-error a browser with no Worker
      window.Worker = undefined;
      return;
    }
    window.Worker = class extends RealWorker {
      constructor(...args: ConstructorParameters<typeof Worker>) {
        super(...args);
        probe.created += 1;
        this.addEventListener('message', (e: MessageEvent) => {
          const d = e.data;
          probe.types[d?.type] = (probe.types[d?.type] ?? 0) + 1;
          if (d?.type !== 'result') return;
          const keys = Object.keys(d).sort().join();
          const marks: unknown[] = d.landmarks ?? [];
          const flat = marks.every((m) => Object.keys(m as object).sort().join() === 'visibility,x,y' && Object.values(m as object).every(num));
          if (keys !== 'landmarks,timestampMs,type' || !num(d.timestampMs) || !(d.landmarks === null || Array.isArray(d.landmarks)) || !flat) probe.badResults.push(keys);
        });
      }
      terminate() {
        probe.terminated += 1;
        super.terminate();
      }
    };
  }, hideWorker);
}

const probe = (page: Page) => page.evaluate(() => window.__worker);

test.beforeEach(async ({ page }) => {
  await installProbes(page);
});

test('the pose model runs in one worker, sends numbers only, and breaks no rule of the CSP', async ({ page, baseURL }) => {
  await probeWorker(page);
  const seen = watch(page, new URL(baseURL!).origin);
  await toSession(page);
  await expect.poll(async () => (await probe(page)).types.result ?? 0, { timeout: 30_000 }).toBeGreaterThan(5);
  const p = await probe(page);
  expect(p.created).toBe(1);
  expect(Object.keys(p.types).sort()).toEqual(['progress', 'ready', 'result']);
  expect(p.badResults).toEqual([]);
  expect(seen.requests.some((u) => u.endsWith('/models/pose_landmarker_lite.task'))).toBe(true);
  await seen.expectClean('Session with the pose worker');
});

test('Stop ends the worker and every track', async ({ page }) => {
  await probeWorker(page);
  await toSession(page);
  await expect.poll(async () => (await probe(page)).types.result ?? 0, { timeout: 30_000 }).toBeGreaterThan(0);
  await stopButton(page).click();
  await expectScreen(page, 'Summary');
  expect((await probe(page)).terminated).toBe(1);
  expect((await trackStates(page)).every((s) => s === 'video:ended')).toBe(true);
});

test('Back from the Session ends the worker', async ({ page }) => {
  await probeWorker(page);
  await toSession(page);
  await expect.poll(async () => (await probe(page)).types.result ?? 0, { timeout: 30_000 }).toBeGreaterThan(0);
  await page.goBack();
  await expect.poll(async () => (await probe(page)).terminated).toBe(1);
  expect((await trackStates(page)).every((s) => s === 'video:ended')).toBe(true);
});
// The main-thread test (no Worker) is in no-gpu.spec.ts. Software WebGL makes the GPU delegate too slow for it.
