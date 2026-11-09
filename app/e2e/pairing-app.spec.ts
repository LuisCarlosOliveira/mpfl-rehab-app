// T12b: the phone as the second camera inside the REAL built app, with a real RTCPeerConnection.
// Two browser contexts of the same build. A is the laptop. B is a fresh profile that acts as the phone.
// The codes go through the paste fields, because no real QR camera scan can run between two pages of one machine.
// The pose model of B sees no person in the fake camera. So B sends its landmark message over its real channel by hand.
// Not covered here: a real phone, a real person in the camera, the QR scan with a real screen.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { expectScreen, installProbes, readStore, toSetupGuide, watch } from './helpers/app';

interface PairProbes {
  pcs: { pc: RTCPeerConnection; config: RTCConfiguration | null }[];
  channels: RTCDataChannel[];
  sends: string[];
  servers: string[];
}
declare global {
  interface Window {
    __pair: PairProbes;
  }
}

/** Records every peer connection with its config, every data channel, every send and every server connection try. */
async function installPairProbes(page: Page) {
  await page.addInitScript(() => {
    const probes: PairProbes = { pcs: [], channels: [], sends: [], servers: [] };
    window.__pair = probes;
    const RealPc = window.RTCPeerConnection;
    window.RTCPeerConnection = class extends RealPc {
      constructor(config?: RTCConfiguration) {
        super(config);
        probes.pcs.push({ pc: this, config: config ? JSON.parse(JSON.stringify(config)) : null });
        this.addEventListener('datachannel', (e) => probes.channels.push((e as RTCDataChannelEvent).channel));
      }
      createDataChannel(label: string, options?: RTCDataChannelInit) {
        const channel = super.createDataChannel(label, options);
        probes.channels.push(channel);
        return channel;
      }
    };
    const realSend = RTCDataChannel.prototype.send;
    RTCDataChannel.prototype.send = function (data: never) {
      probes.sends.push(typeof data === 'string' ? data : `[${typeof data}]`);
      return realSend.call(this, data);
    };
    for (const name of ['WebSocket', 'EventSource', 'XMLHttpRequest'] as const) {
      const Real = window[name] as unknown as new (...a: unknown[]) => object;
      (window as unknown as Record<string, unknown>)[name] = class extends Real {
        constructor(...a: unknown[]) {
          super(...a);
          probes.servers.push(name);
        }
      };
    }
  });
}

async function newPage(browser: Browser, baseURL: string): Promise<{ page: Page; context: BrowserContext; seen: ReturnType<typeof watch> }> {
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  await installProbes(page);
  await installPairProbes(page);
  const seen = watch(page, new URL(baseURL).origin);
  return { page, context, seen };
}

const PHONE_BUTTON = 'Use this phone as the second camera';
const OPEN_STEP = 'Add a second camera (optional)';
// The Wake Lock notice is also a status. Headless Chromium has no Wake Lock, so it shows there.
const status = (page: Page) => page.getByRole('status').filter({ hasNotText: /screen/i });

/** The laptop opens the step, starts pairing and returns the offer text from the paste field. */
async function laptopOffer(a: Page) {
  await toSetupGuide(a);
  await a.getByRole('button', { name: OPEN_STEP }).click();
  await expectScreen(a, 'Add a second camera');
  await a.getByRole('button', { name: 'Start pairing' }).click();
  await expect(a.getByRole('img', { name: 'Pairing code of this laptop' })).toBeVisible();
  return a.getByLabel('Code as text').inputValue();
}

/** The phone, a fresh profile, passes the notice, opens the companion screen, pastes the offer and returns its answer text. */
async function phoneAnswer(b: Page, offer: string) {
  await b.goto('/');
  await expectScreen(b, 'Privacy');
  await b.getByRole('button', { name: 'I understand' }).click();
  await expectScreen(b, 'Load protocol file');
  await b.getByRole('button', { name: PHONE_BUTTON }).click();
  await expectScreen(b, PHONE_BUTTON);
  await b.getByRole('button', { name: 'Scan the laptop code' }).click();
  await b.getByLabel('Or paste the laptop code').fill(offer);
  await b.getByRole('button', { name: 'Use this code' }).click();
  await expect(b.getByRole('img', { name: 'Pairing code of this phone' })).toBeVisible();
  return b.getByLabel('Code as text').inputValue();
}

/** A front frame of the left leg. The knee alignment grows from 0 to `deg`. */
const FRONT_MESSAGE = (t: number, deg: number) => {
  const tilt = (deg / 2) * (Math.PI / 180);
  const aspect = 0.5625;
  const lm = Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 0 }));
  lm[23] = { x: 0.5, y: 0.3, visibility: 1 };
  lm[25] = { x: Math.round((0.5 - (0.2 * Math.sin(tilt)) / aspect) * 1e4) / 1e4, y: Math.round((0.3 + 0.2 * Math.cos(tilt)) * 1e4) / 1e4, visibility: 1 };
  lm[27] = { x: Math.round((lm[25]!.x + (0.2 * Math.sin(tilt)) / aspect) * 1e4) / 1e4, y: Math.round((lm[25]!.y + 0.2 * Math.cos(tilt)) * 1e4) / 1e4, visibility: 1 };
  return JSON.stringify({ type: 'landmarks', tMs: t, view: 'front', aspect, landmarks: lm });
};

test('the phone is the second camera of the laptop in the real app, and everything closes on Stop', async ({ browser, baseURL }) => {
  const a = await newPage(browser, baseURL!);
  const b = await newPage(browser, baseURL!);

  const offer = await laptopOffer(a.page);
  const answer = await phoneAnswer(b.page, offer);
  await a.page.getByLabel('Or paste the phone code').fill(answer);
  await a.page.getByRole('button', { name: 'Use this code' }).click();

  // Both show Connected. The laptop camera for the code scan is off after that.
  await expect(status(a.page)).toHaveText('Connected', { timeout: 20_000 });
  await expect(status(b.page)).toHaveText(/Connected|Sending/, { timeout: 20_000 });
  // The Stop button of the phone is large. A thumb must hit it.
  expect((await b.page.getByRole('button', { name: 'Stop' }).boundingBox())!.height).toBeGreaterThanOrEqual(72);

  // The laptop goes on to the camera step and the Session. The chip shows the connection.
  await a.page.getByRole('button', { name: 'Continue' }).click();
  await a.page.getByRole('button', { name: 'Start camera' }).click();
  await expect(a.page.getByTestId('instruction')).toBeVisible();
  await a.page.getByRole('button', { name: 'Start exercise' }).click();
  await expectScreen(a.page, 'Heel slide');
  await expect(a.page.getByText('Second camera connected')).toBeVisible();

  // The phone sends landmark numbers over its real channel.
  await b.page.evaluate(
    ([messages]) => {
      const channel = window.__pair.channels[0]!;
      for (const m of messages!) channel.send(m);
    },
    [Array.from({ length: 30 }, (_, i) => FRONT_MESSAGE(1000 + i * 100, Math.min(10, i / 2)))],
  );
  await expect(a.page.getByText('Second camera connected')).toBeVisible();
  const patientText = await a.page.locator('main').innerText();
  expect(patientText).not.toMatch(/valgus|inward|front-view|knee alignment/i);

  // Stop closes the camera, the channel and the connection on both sides.
  await a.page.getByRole('button', { name: /^\W*Stop$/ }).click();
  await expectScreen(a.page, 'Summary');
  await expect(status(b.page)).toHaveText('Stopped', { timeout: 10_000 });
  for (const side of [a, b]) {
    const states = await side.page.evaluate(() => window.__pair.pcs.map((p) => p.pc.connectionState));
    expect(states.every((s) => s === 'closed' || s === 'disconnected')).toBe(true);
    const channels = await side.page.evaluate(() => window.__pair.channels.map((c) => c.readyState));
    expect(channels.every((s) => s === 'closing' || s === 'closed')).toBe(true);
    const tracks = await side.page.evaluate(() => window.__probes.streams.flatMap((s) => s.getTracks().map((t) => t.readyState)));
    expect(tracks.every((s) => s === 'ended')).toBe(true);
  }

  // The record holds the second view tag. The patient sees no front-view number.
  await a.page.getByLabel('3', { exact: true }).check();
  await a.page.getByLabel('No swelling').check();
  await a.page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(a.page.getByText('Session saved.')).toBeVisible();
  const rows = await readStore(a.page, 'sessions');
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ view: 'side', secondView: 'front' });
  expect(await a.page.locator('main').innerText()).not.toMatch(/valgus|inward|front-view|knee alignment/i);

  // No policy violation, no foreign request, no server connection, no media on the connection.
  for (const side of [a, b]) {
    await side.seen.expectClean('the paired app');
    const probes = await side.page.evaluate(() => ({
      servers: window.__pair.servers,
      configs: window.__pair.pcs.map((p) => p.config),
      senders: window.__pair.pcs.map((p) => p.pc.getSenders().filter((s) => s.track !== null).length),
      transceivers: window.__pair.pcs.map((p) => p.pc.getTransceivers().length),
      sends: window.__pair.sends,
    }));
    expect(probes.servers, 'no WebSocket, EventSource or XMLHttpRequest').toEqual([]);
    expect(probes.configs.length).toBeGreaterThan(0);
    for (const config of probes.configs) expect(config?.iceServers, 'no STUN and no relay').toEqual([]);
    expect(probes.senders.every((n) => n === 0), 'no track on the connection').toBe(true);
    expect(probes.transceivers.every((n) => n === 0), 'no media line on the connection').toBe(true);
    for (const text of probes.sends) {
      const message = JSON.parse(text) as { type: string; landmarks?: unknown[] };
      expect(['hello', 'ready', 'landmarks', 'bye']).toContain(message.type);
      expect(text).not.toMatch(/data:|blob:|image|frame|video/i);
      expect(text.length).toBeLessThanOrEqual(4096);
      if (message.landmarks) expect(message.landmarks).toHaveLength(33);
    }
  }
  const sent = await b.page.evaluate(() => window.__pair.sends.filter((t) => t.includes('"landmarks"')).length);
  expect(sent).toBeGreaterThanOrEqual(30);

  await a.context.close();
  await b.context.close();
});

test('Skip keeps one camera: no peer connection, no chip, and the session runs', async ({ browser, baseURL }) => {
  const a = await newPage(browser, baseURL!);
  await toSetupGuide(a.page);
  await a.page.getByRole('button', { name: OPEN_STEP }).click();
  await a.page.getByRole('button', { name: 'Skip, use one camera' }).click();
  await a.page.getByRole('button', { name: 'Start camera' }).click();
  await expect(a.page.getByTestId('instruction')).toBeVisible();
  await a.page.getByRole('button', { name: 'Start exercise' }).click();
  await expectScreen(a.page, 'Heel slide');
  await expect(a.page.getByText('Second camera connected')).toHaveCount(0);
  expect(await a.page.evaluate(() => window.__pair.pcs.length)).toBe(0);
  await a.seen.expectClean('one camera after Skip');
  await a.context.close();
});

test('Cancel in the pairing step closes the connection and the camera', async ({ browser, baseURL }) => {
  const a = await newPage(browser, baseURL!);
  await laptopOffer(a.page);
  await a.page.getByRole('button', { name: 'Cancel' }).click();
  await expectScreen(a.page, 'Home');
  const states = await a.page.evaluate(() => window.__pair.pcs.map((p) => p.pc.connectionState));
  expect(states.length).toBeGreaterThan(0);
  expect(states.every((s) => s === 'closed')).toBe(true);
  const tracks = await a.page.evaluate(() => window.__probes.streams.flatMap((s) => s.getTracks().map((t) => t.readyState)));
  expect(tracks.every((s) => s === 'ended')).toBe(true);
  await a.context.close();
});

test('a hidden tab ends the pairing of the phone page', async ({ browser, baseURL }) => {
  const a = await newPage(browser, baseURL!);
  const b = await newPage(browser, baseURL!);
  const offer = await laptopOffer(a.page);
  const answer = await phoneAnswer(b.page, offer);
  await a.page.getByLabel('Or paste the phone code').fill(answer);
  await a.page.getByRole('button', { name: 'Use this code' }).click();
  await expect(status(b.page)).toHaveText(/Connected|Sending/, { timeout: 20_000 });
  // The phone page goes to the background and fires the event of the browser.
  await b.page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(status(b.page)).toHaveText('Stopped', { timeout: 10_000 });
  const tracks = await b.page.evaluate(() => window.__probes.streams.flatMap((s) => s.getTracks().map((t) => t.readyState)));
  expect(tracks.every((s) => s === 'ended')).toBe(true);
  await a.context.close();
  await b.context.close();
});

const axeViolations = async (page: Page) =>
  (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations.map((v) => ({
    id: v.id,
    nodes: v.nodes.map((n) => n.target.join(' ')),
  }));

const focusedH1 = (page: Page) => page.evaluate(() => ({ tag: document.activeElement?.tagName, text: document.activeElement?.textContent?.trim() }));

/** Every visible button is 48 px or more, in height and width. */
const smallButtons = (page: Page) =>
  page.evaluate(() => {
    const out: string[] = [];
    document.querySelectorAll('button').forEach((el) => {
      const b = el.getBoundingClientRect();
      if (b.width > 0 && b.height > 0 && (b.width < 47.5 || b.height < 47.5)) out.push(`${el.textContent?.trim()} ${Math.round(b.width)}x${Math.round(b.height)}`);
    });
    return out;
  });

for (const scheme of ['light', 'dark'] as const) {
  test(`the laptop step has no axe violation, a focused h1 and 48 px buttons at phone width (${scheme})`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, viewport: { width: 360, height: 740 }, colorScheme: scheme });
    const page = await context.newPage();
    await installProbes(page);
    await toSetupGuide(page);
    expect(await axeViolations(page)).toEqual([]); // the guide with the new button
    await page.getByRole('button', { name: OPEN_STEP }).click();
    await expectScreen(page, 'Add a second camera');
    expect(await focusedH1(page)).toEqual({ tag: 'H1', text: 'Add a second camera' });
    expect(await axeViolations(page)).toEqual([]);
    expect(await smallButtons(page)).toEqual([]);
    await page.getByRole('button', { name: 'Start pairing' }).click();
    await expect(page.getByRole('img', { name: 'Pairing code of this laptop' })).toBeVisible();
    expect(await axeViolations(page)).toEqual([]);
    expect(await smallButtons(page)).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    await context.close();
  });

  test(`the phone screens have no axe violation, a focused h1 and 48 px buttons at phone width (${scheme})`, async ({ browser, baseURL }) => {
    const a = await newPage(browser, baseURL!);
    const offer = await laptopOffer(a.page);
    const context = await browser.newContext({ baseURL, viewport: { width: 360, height: 740 }, colorScheme: scheme });
    const page = await context.newPage();
    await installProbes(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'I understand' }).click();
    await expectScreen(page, 'Load protocol file');
    expect(await axeViolations(page)).toEqual([]); // the Load screen with the new card
    expect(await smallButtons(page)).toEqual([]);
    await page.getByRole('button', { name: PHONE_BUTTON }).click();
    await expectScreen(page, PHONE_BUTTON);
    expect(await focusedH1(page)).toEqual({ tag: 'H1', text: PHONE_BUTTON });
    expect(await axeViolations(page)).toEqual([]);
    expect(await smallButtons(page)).toEqual([]);
    await page.getByRole('button', { name: 'Scan the laptop code' }).click();
    await page.getByLabel('Or paste the laptop code').fill(offer);
    await expect(page.getByRole('button', { name: 'Use this code' })).toBeEnabled();
    await page.waitForTimeout(400); // the button colour fades from the disabled colour in 140 ms. Axe must not read a mid-fade colour.
    expect(await axeViolations(page)).toEqual([]);
    expect(await smallButtons(page)).toEqual([]);
    await page.getByRole('button', { name: 'Use this code' }).click();
    await expect(page.getByRole('img', { name: 'Pairing code of this phone' })).toBeVisible();
    expect(await axeViolations(page)).toEqual([]);
    expect(await smallButtons(page)).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    // The QR frame stays light with dark modules, also in the dark theme.
    const qr = await page.evaluate(() => {
      const frame = document.querySelector('.qr-frame') as HTMLElement;
      const dark = document.querySelector('.qr-dark') as SVGElement;
      return { background: getComputedStyle(frame).backgroundColor, module: getComputedStyle(dark).fill };
    });
    expect(qr).toEqual({ background: 'rgb(255, 255, 255)', module: 'rgb(0, 0, 0)' });
    await context.close();
    await a.context.close();
  });
}

test('Home has the phone button as a secondary action, and the phone screen opens with no red-flag check', async ({ page }) => {
  await installProbes(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'I understand' }).click();
  await page.getByLabel('Choose a file from your care team').setInputFiles('src/lib/protocol/example-protocol.json');
  await expectScreen(page, 'Home');
  await expect(page.getByRole('button', { name: PHONE_BUTTON })).toBeVisible();
  await page.getByRole('button', { name: PHONE_BUTTON }).click();
  await expectScreen(page, PHONE_BUTTON);
  await expect(page.getByRole('heading', { name: 'Check before you exercise' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^\W*Stop$/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Back' }).click();
  await expectScreen(page, 'Home');
});
