// Shared helpers for the specs that load the real built app (the project "app").
// Probes are installed with addInitScript, so they run before the app code on every page load.
import { expect, type Page } from '@playwright/test';

export const EXAMPLE = 'src/lib/protocol/example-protocol.json';
export const PROTOTYPE_BANNER = 'Prototype. Not for patient use.';
export const EXAMPLE_BANNER = 'EXAMPLE, NOT APPROVED';

interface Probes {
  csp: string[];
  streams: MediaStream[];
  gumCalls: number;
  audioContexts: number;
}
declare global {
  interface Window {
    __probes: Probes;
  }
}

/** Records CSP violations, getUserMedia calls, the streams it returns and AudioContext instances. */
export async function installProbes(page: Page) {
  await page.addInitScript(() => {
    const probes: Probes = { csp: [], streams: [], gumCalls: 0, audioContexts: 0 };
    window.__probes = probes;
    document.addEventListener('securitypolicyviolation', (e) => {
      probes.csp.push(`${e.violatedDirective} blocked ${e.blockedURI || 'inline'} at ${e.sourceFile}:${e.lineNumber} sample=${e.sample}`);
    });
    const md = navigator.mediaDevices;
    if (md) {
      const real = md.getUserMedia.bind(md);
      md.getUserMedia = async (constraints) => {
        probes.gumCalls += 1;
        const stream = await real(constraints);
        probes.streams.push(stream);
        return stream;
      };
    }
    const Real = window.AudioContext;
    if (Real) {
      window.AudioContext = class extends Real {
        constructor(options?: AudioContextOptions) {
          super(options);
          probes.audioContexts += 1;
        }
      };
    }
  });
}

/** Collects console errors, page errors and every request. Call before the first goto. */
export function watch(page: Page, ownOrigin: string) {
  const consoleErrors: string[] = [];
  const requests: string[] = [];
  page.on('console', (m) => {
    // MediaPipe writes its info line "INFO: Created TensorFlow Lite XNNPACK delegate for CPU." to stderr.
    // The browser reports it as type error. It is a notice and not an error, so only this prefix is skipped.
    if (m.type() === 'error' && !m.text().startsWith('INFO: ')) consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));
  page.on('request', (r) => requests.push(r.url()));
  return {
    requests,
    /** Zero violations, zero console errors, zero requests to another origin. `where` names the screen. */
    async expectClean(where: string) {
      const csp = await page.evaluate(() => window.__probes.csp);
      expect(csp, `CSP violations on ${where}`).toEqual([]);
      expect(consoleErrors, `console errors on ${where}`).toEqual([]);
      const foreign = requests.filter((u) => !u.startsWith('data:') && !u.startsWith('blob:') && new URL(u).origin !== ownOrigin);
      expect(foreign, `foreign requests on ${where}`).toEqual([]);
    },
  };
}

/** The Stop button. Its name can start with a symbol, so the match skips non-word characters. */
export const stopButton = (page: Page) => page.getByRole('button', { name: /^\W*Stop$/ });

export const heading = (page: Page) => page.getByRole('heading', { level: 1 });

/** Text of the focused element, and its tag. */
export const focused = (page: Page) =>
  page.evaluate(() => ({ tag: document.activeElement?.tagName ?? '', text: document.activeElement?.textContent?.trim() ?? '' }));

export async function expectScreen(page: Page, h1: string) {
  await expect(heading(page)).toHaveText(h1);
}

/** First launch to the Load protocol screen. */
export async function toLoad(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'I understand' }).click();
  await expectScreen(page, 'Load protocol file');
}

/** First launch to Home with the example protocol. */
export async function toHome(page: Page) {
  await toLoad(page);
  await page.getByLabel('Choose a file from your care team').setInputFiles(EXAMPLE);
  await expectScreen(page, 'Home');
}

export async function toRedFlag(page: Page) {
  await toHome(page);
  await page.getByRole('button', { name: 'Start Heel slide' }).click();
  await expectScreen(page, 'Check before you exercise');
}

export async function toSetupGuide(page: Page) {
  await toRedFlag(page);
  await page.getByRole('button', { name: 'None of these apply. Continue' }).click();
  await expectScreen(page, 'Set up the camera');
}

export async function toSetupCamera(page: Page) {
  await toSetupGuide(page);
  await page.getByRole('button', { name: 'Next: set up the camera' }).click();
  await expect(page.getByRole('button', { name: 'Start camera' })).toBeVisible();
}

/** Press Start camera and wait until the fake camera runs and the check shows its text. */
export async function startCamera(page: Page) {
  await page.getByRole('button', { name: 'Start camera' }).click();
  await expect(page.getByTestId('instruction')).toBeVisible();
}

export async function toSession(page: Page) {
  await toSetupCamera(page);
  await startCamera(page);
  await page.getByRole('button', { name: 'Start exercise' }).click();
  await expectScreen(page, 'Heel slide');
}

export async function toSummary(page: Page) {
  await toSession(page);
  await stopButton(page).click();
  await expectScreen(page, 'Summary');
}

/** The state of every video track of every stream that getUserMedia returned. */
export const trackStates = (page: Page) =>
  page.evaluate(() => window.__probes.streams.flatMap((s) => s.getTracks().map((t) => `${t.kind}:${t.readyState}`)));

/** Every record of one IndexedDB store of the app database. Call it after the app made data. */
export const readStore = (page: Page, store: 'sessions' | 'protocol') =>
  page.evaluate(
    (name) =>
      new Promise<Record<string, unknown>[]>((resolve, reject) => {
        const open = indexedDB.open('mpfl-rehab');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          if (!db.objectStoreNames.contains(name)) {
            db.close();
            resolve([]);
            return;
          }
          const all = db.transaction(name).objectStore(name).getAll();
          all.onsuccess = () => {
            db.close();
            resolve(all.result);
          };
          all.onerror = () => reject(all.error);
        };
      }),
    store,
  );

/** The banners of demo mode. The prototype banner is on every screen. The example banner follows the example protocol. */
export async function expectBanners(page: Page, opts: { example: boolean }) {
  await expect(page.getByRole('note').filter({ hasText: PROTOTYPE_BANNER })).toBeVisible();
  const example = page.getByRole('note').filter({ hasText: EXAMPLE_BANNER });
  if (opts.example) await expect(example).toBeVisible();
  else await expect(example).toHaveCount(0);
}

/** From a first launch: run one session with the fake camera, save it with the given answers and return to Home. */
export async function saveOneSession(page: Page, pain = '3', swelling = 'Some swelling') {
  await toSummary(page);
  await page.getByLabel(pain, { exact: true }).check();
  await page.getByLabel(swelling).check();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Session saved.')).toBeVisible();
  await page.getByRole('button', { name: 'Done' }).click();
  await expectScreen(page, 'Home');
}

export async function openMyData(page: Page) {
  await page.getByRole('button', { name: 'My data' }).click();
  await expectScreen(page, 'My data');
}
