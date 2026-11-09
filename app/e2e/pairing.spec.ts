// T12b: the pairing with a REAL RTCPeerConnection in Chromium, two pages in two browser contexts.
// Run it with e2e/pairing/playwright.config.ts (see that file).
import { expect, test, type Browser, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFileSync } from 'node:fs';

declare global {
  interface Window {
    lab: {
      pairing: typeof import('../src/lib/pairing');
      createHostLink: typeof import('../src/pairing/rtcLink').createHostLink;
      createCompanionLink: typeof import('../src/pairing/rtcLink').createCompanionLink;
    };
  }
}

async function twoPages(browser: Browser): Promise<[Page, Page]> {
  const pages: Page[] = [];
  for (let i = 0; i < 2; i++) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('/lab.html');
    pages.push(page);
  }
  return pages as [Page, Page];
}

/** Chromium shows real local addresses, and not mDNS names, to a page that holds a camera stream. The app has one at pairing time. */
const holdCamera = (page: Page) => page.evaluate(async () => ((window as unknown as { cam: MediaStream }).cam = await navigator.mediaDevices.getUserMedia({ video: true })).id);

for (const withCamera of [false, true]) {
  test(`a real offer and a real answer survive the extractor and the builder, and the channel opens (${withCamera ? 'camera held' : 'no camera'})`, async ({ browser }, testInfo) => {
    const [a, b] = await twoPages(browser);
    if (withCamera) await Promise.all([holdCamera(a), holdCamera(b)]);
    // Page A: a real offer. The text is read before and after the round trip.
    const offer = await a.evaluate(async () => {
      const pc = new RTCPeerConnection({ iceServers: [] });
      (window as unknown as { pc: RTCPeerConnection }).pc = pc;
      const dc = pc.createDataChannel('mpfl', { ordered: true });
      (window as unknown as { received: unknown[] }).received = [];
      dc.onmessage = (e) => (window as unknown as { received: unknown[] }).received.push(e.data);
      await pc.setLocalDescription(await pc.createOffer());
      await new Promise<void>((r) => {
        if (pc.iceGatheringState === 'complete') r();
        else pc.addEventListener('icegatheringstatechange', () => pc.iceGatheringState === 'complete' && r());
      });
      const real = pc.localDescription!.sdp;
      const fields = window.lab.pairing.extractFields(real);
      if (!fields.ok) return { real, error: fields.code };
      return { real, rebuilt: window.lab.pairing.buildSdp(fields.value, 'offer') };
    });
    expect(offer.error).toBeUndefined();

    const answer = await b.evaluate(async (offerSdp) => {
      const pc = new RTCPeerConnection({ iceServers: [] });
      (window as unknown as { pc: RTCPeerConnection }).pc = pc;
      (window as unknown as { opened: boolean }).opened = false;
      pc.ondatachannel = (e) => {
        e.channel.onopen = () => {
          (window as unknown as { opened: boolean }).opened = true;
          e.channel.send(
            JSON.stringify({
              type: 'landmarks', tMs: 7, view: 'front',
              landmarks: Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0.9 })),
            }),
          );
        };
      };
      await pc.setRemoteDescription({ type: 'offer', sdp: offerSdp });
      await pc.setLocalDescription(await pc.createAnswer());
      await new Promise<void>((r) => {
        if (pc.iceGatheringState === 'complete') r();
        else pc.addEventListener('icegatheringstatechange', () => pc.iceGatheringState === 'complete' && r());
      });
      const real = pc.localDescription!.sdp;
      const fields = window.lab.pairing.extractFields(real);
      if (!fields.ok) return { real, error: fields.code };
      return { real, rebuilt: window.lab.pairing.buildSdp(fields.value, 'answer') };
    }, offer.rebuilt!);
    expect(answer.error).toBeUndefined();

    await a.evaluate((sdp) => (window as unknown as { pc: RTCPeerConnection }).pc.setRemoteDescription({ type: 'answer', sdp }), answer.rebuilt!);
    await expect.poll(() => b.evaluate(() => (window as unknown as { opened: boolean }).opened), { timeout: 15_000 }).toBe(true);
    await expect.poll(() => a.evaluate(() => (window as unknown as { received: unknown[] }).received.length), { timeout: 15_000 }).toBe(1);
    const parsed = await a.evaluate(() => {
      const raw = (window as unknown as { received: unknown[] }).received[0];
      return window.lab.pairing.parseMessage(raw);
    });
    expect(parsed).toMatchObject({ ok: true, value: { type: 'landmarks', view: 'front' } });

    // Evidence for the report: the lines of the real text that the round trip drops.
    const lines = (s: string) => s.split('\r\n').filter(Boolean);
    const dropped = (real: string, rebuilt: string) => lines(real).filter((l) => !lines(rebuilt).includes(l));
    const info = {
      offerLength: offer.real.length,
      droppedFromOffer: dropped(offer.real, offer.rebuilt!),
      droppedFromAnswer: dropped(answer.real, answer.rebuilt!),
      offerCandidates: lines(offer.real).filter((l) => l.startsWith('a=candidate')),
      answerCandidates: lines(answer.real).filter((l) => l.startsWith('a=candidate')),
    };
    const fileName = `test-results/pairing-sdp-evidence-${testInfo.project.name}-${withCamera ? 'camera' : 'nocamera'}.json`;
    writeFileSync(process.env.PAIR_EVIDENCE_DIR ? `${process.env.PAIR_EVIDENCE_DIR}/${fileName.split('/')[1]}` : fileName, JSON.stringify(info, null, 2));
    expect(info.offerCandidates.length).toBeGreaterThan(0);
  });
}

// ---------------------------------------------------------------- the two screens with real WebRTC

interface Probes {
  csp: string[];
  pcs: { pc: RTCPeerConnection; config: unknown }[];
  servers: string[];
  sends: string[];
}
declare global {
  interface Window {
    __probes: Probes;
    __pairing: { getView(): { status: string; offerText: string | null } };
    __received: { count: number; t: number }[];
    __sourceStopped?: number;
    __done?: boolean;
    __skipped?: boolean;
  }
}

/** Records the peer connections and their config, every send on a data channel, and every try to open a server connection. */
async function installProbes(page: Page) {
  await page.addInitScript(() => {
    const probes: Probes = { csp: [], pcs: [], servers: [], sends: [] };
    window.__probes = probes;
    document.addEventListener('securitypolicyviolation', (e) => probes.csp.push(`${e.violatedDirective} ${e.blockedURI}`));
    const RealPc = window.RTCPeerConnection;
    window.RTCPeerConnection = class extends RealPc {
      constructor(config?: RTCConfiguration) {
        super(config);
        probes.pcs.push({ pc: this, config: JSON.parse(JSON.stringify(config ?? null)) });
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

async function openScreens(browser: Browser, role: 'host' | 'companion', options: { clock?: boolean } = {}) {
  const context = await browser.newContext({ viewport: { width: 360, height: 740 } });
  const page = await context.newPage();
  const requests: string[] = [];
  const consoleErrors: string[] = [];
  page.on('request', (r) => requests.push(r.url()));
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
  page.on('pageerror', (e) => consoleErrors.push(`pageerror ${e.message}`));
  await installProbes(page);
  if (options.clock) await page.clock.install({ time: new Date('2026-11-08T10:00:00Z') });
  await page.goto(`/screens.html?role=${role}`);
  return { page, requests, consoleErrors };
}

const textOf = (page: Page, label: string) => page.getByLabel(label, { exact: true }).inputValue();
// The Wake Lock notice is also a status. Headless Chromium has no Wake Lock, so it shows there.
const status = (page: Page) => page.getByRole('status').filter({ hasNotText: /screen/i });

/** The host shows its code. The phone reads it from pasted text. The phone shows its code. The host reads it. */
async function pairBoth(host: Page, phone: Page, tamper?: (text: string) => Promise<string>) {
  await host.getByRole('button', { name: 'Start pairing' }).click();
  await expect(host.getByRole('img', { name: 'Pairing code of this laptop' })).toBeVisible();
  const offer = await textOf(host, 'Code as text');
  await phone.getByRole('button', { name: 'Scan the laptop code' }).click();
  await phone.getByLabel('Or paste the laptop code').fill(offer);
  await phone.getByRole('button', { name: 'Use this code' }).click();
  await expect(phone.getByRole('img', { name: 'Pairing code of this phone' })).toBeVisible();
  const answer = await textOf(phone, 'Code as text');
  await host.getByLabel('Or paste the phone code').fill(tamper ? await tamper(answer) : answer);
  await host.getByRole('button', { name: 'Use this code' }).click();
  return { offer, answer };
}

test.describe('the screens with real WebRTC', () => {
  test('the phone sends landmarks, the laptop receives them, and everything closes on Stop', async ({ browser }) => {
    const h = await openScreens(browser, 'host');
    const p = await openScreens(browser, 'companion');
    const { offer, answer } = await pairBoth(h.page, p.page);

    await expect(status(h.page)).toHaveText('Connected', { timeout: 15_000 });
    await expect(status(p.page)).toHaveText(/Connected|Sending/);
    await expect.poll(() => h.page.evaluate(() => window.__received.length), { timeout: 10_000 }).toBeGreaterThan(5);
    await expect(status(p.page)).toHaveText('Sending');

    // The sizes of the two codes. A QR code of version 11 at level M holds 251 characters in the app (QrCode draws up to that).
    console.log(`offer ${offer.length} characters, answer ${answer.length} characters`);
    expect(offer.length).toBeLessThanOrEqual(600);
    expect(answer.length).toBeLessThanOrEqual(600);

    // Only landmarks went out: hello, then landmark messages with the schema fields only.
    const sends = await p.page.evaluate(() => window.__probes.sends);
    const parsed = sends.map((t) => JSON.parse(t) as Record<string, unknown>);
    expect(parsed[0]).toMatchObject({ type: 'hello' });
    const landmarks = parsed.filter((m) => m.type === 'landmarks');
    expect(landmarks.length).toBeGreaterThan(5);
    for (const m of landmarks) {
      expect(Object.keys(m).sort()).toEqual(['aspect', 'landmarks', 'tMs', 'type', 'view']);
      expect(m.view).toBe('front');
      for (const l of m.landmarks as Record<string, number>[]) expect(Object.keys(l).sort()).toEqual(['visibility', 'x', 'y']);
    }
    // The rate stays at or below 15 messages each second, although the source runs near 60 each second.
    const times = landmarks.map((m) => m.tMs as number);
    const span = (times[times.length - 1]! - times[0]!) / 1000;
    expect(landmarks.length - 1).toBeLessThanOrEqual(15 * span + 2);

    // The laptop got whole poses.
    expect(await h.page.evaluate(() => window.__received.every((r) => r.count === 33))).toBe(true);

    // Network: no ICE server, only host candidates, no track, no server connection, no foreign request, no CSP report.
    for (const side of [h, p]) {
      const report = await side.page.evaluate(async () => {
        const out = [];
        for (const { pc, config } of window.__probes.pcs) {
          const stats = [...(await pc.getStats()).values()];
          out.push({
            config,
            senders: pc.getSenders().length,
            transceivers: pc.getTransceivers().length,
            candidateTypes: [...new Set(stats.filter((s) => s.type === 'local-candidate' || s.type === 'remote-candidate').map((s) => s.candidateType))],
            addresses: stats.filter((s) => s.type === 'remote-candidate').map((s) => s.address ?? s.ip),
          });
        }
        return { pcs: out, servers: window.__probes.servers, csp: window.__probes.csp };
      });
      expect(report.pcs).toHaveLength(1);
      expect(report.pcs[0]!.config).toEqual({ iceServers: [] });
      expect(report.pcs[0]!.senders).toBe(0);
      expect(report.pcs[0]!.transceivers).toBe(0);
      expect(report.pcs[0]!.candidateTypes.every((t) => t === 'host')).toBe(true);
      expect(report.servers).toEqual([]);
      expect(report.csp).toEqual([]);
      const origin = new URL(side.page.url()).origin;
      expect(side.requests.filter((u) => !u.startsWith('blob:') && !u.startsWith('data:') && new URL(u).origin !== origin)).toEqual([]);
      expect(side.consoleErrors).toEqual([]);
    }

    // The laptop code holds at least one candidate. Whether it is a real address or an mDNS name depends on the browser flags.
    const hostField = await h.page.evaluate((text) => window.lab.pairing.decodeOffer(text), offer);
    expect(hostField.ok && hostField.value.candidates.length).toBeGreaterThan(0);
    expect(answer).toMatch(/^MPFL1\./);

    // Stop on the phone: the laptop sees the end, and every connection closes.
    await p.page.getByRole('button', { name: 'Stop' }).click();
    await expect(status(p.page)).toHaveText('Stopped');
    await expect(h.page.getByRole('alert')).toHaveText('Stopped');
    for (const side of [h, p]) {
      await expect.poll(() => side.page.evaluate(() => window.__probes.pcs.map((x) => x.pc.connectionState))).toEqual(['closed']);
    }
    expect(await p.page.evaluate(() => window.__sourceStopped)).toBeGreaterThanOrEqual(1);
    await h.page.context().close();
    await p.page.context().close();
  });

  test('a wrong secret in the answer is refused with the fixed text', async ({ browser }) => {
    const h = await openScreens(browser, 'host');
    const p = await openScreens(browser, 'companion');
    await pairBoth(h.page, p.page, (answer) =>
      h.page.evaluate((text) => {
        const lib = window.lab.pairing;
        const decoded = lib.decodeAnswer(text);
        if (!decoded.ok) throw new Error('answer');
        return lib.encodeAnswer({ ...decoded.value, secret: lib.newSecret() });
      }, answer),
    );
    await expect(h.page.getByRole('alert')).toHaveText('Could not pair. The app continues with one camera.');
    await expect.poll(() => h.page.evaluate(() => window.__probes.pcs.map((x) => x.pc.connectionState))).toEqual(['closed']);
    expect(await h.page.evaluate(() => window.__received?.length ?? 0)).toBe(0);
    await h.page.context().close();
    await p.page.context().close();
  });

  test('an offer older than 120 seconds is refused (fake clock)', async ({ browser }) => {
    const h = await openScreens(browser, 'host', { clock: true });
    const p = await openScreens(browser, 'companion');
    await h.page.getByRole('button', { name: 'Start pairing' }).click();
    await expect(h.page.getByRole('img', { name: 'Pairing code of this laptop' })).toBeVisible();
    const offer = await textOf(h.page, 'Code as text');
    await p.page.getByRole('button', { name: 'Scan the laptop code' }).click();
    await p.page.getByLabel('Or paste the laptop code').fill(offer);
    await p.page.getByRole('button', { name: 'Use this code' }).click();
    const answer = await textOf(p.page, 'Code as text');
    // The clock moves 121 s with no timer firing, so only the check at the moment of the answer can refuse it.
    await h.page.clock.setSystemTime(new Date('2026-11-08T10:02:01Z'));
    await h.page.getByLabel('Or paste the phone code').fill(answer);
    await h.page.getByRole('button', { name: 'Use this code' }).click();
    await expect(h.page.getByRole('alert')).toHaveText('Could not pair. The app continues with one camera.');
    await expect.poll(() => h.page.evaluate(() => window.__probes.pcs.map((x) => x.pc.connectionState))).toEqual(['closed']);
    await h.page.context().close();
    await p.page.context().close();
  });

  test('an unanswered offer ends by itself after 120 seconds (fake clock)', async ({ browser }) => {
    const h = await openScreens(browser, 'host', { clock: true });
    await h.page.getByRole('button', { name: 'Start pairing' }).click();
    await expect(h.page.getByRole('img', { name: 'Pairing code of this laptop' })).toBeVisible();
    await h.page.clock.fastForward(121_000);
    await expect(h.page.getByRole('alert')).toHaveText('Could not pair. The app continues with one camera.');
    await h.page.context().close();
  });

  test('Skip keeps one camera and closes the peer connection', async ({ browser }) => {
    const h = await openScreens(browser, 'host');
    await h.page.getByRole('button', { name: 'Start pairing' }).click();
    await expect(h.page.getByRole('img', { name: 'Pairing code of this laptop' })).toBeVisible();
    await h.page.getByRole('button', { name: 'Skip, use one camera' }).click();
    expect(await h.page.evaluate(() => window.__skipped)).toBe(true);
    await expect.poll(() => h.page.evaluate(() => window.__probes.pcs.map((x) => x.pc.connectionState))).toEqual(['closed']);
    await h.page.context().close();
  });

  test('a hidden tab ends the pairing', async ({ browser }) => {
    const h = await openScreens(browser, 'host');
    await h.page.getByRole('button', { name: 'Start pairing' }).click();
    await expect(h.page.getByRole('img', { name: 'Pairing code of this laptop' })).toBeVisible();
    await h.page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect.poll(() => h.page.evaluate(() => window.__probes.pcs.map((x) => x.pc.connectionState))).toEqual(['closed']);
    await h.page.context().close();
  });

  test('both screens at 360 px: focus on the heading, targets of 48 px, no sideways scroll, axe finds nothing', async ({ browser }) => {
    const h = await openScreens(browser, 'host');
    const p = await openScreens(browser, 'companion');
    const check = async (page: Page, where: string) => {
      await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
      const small = await page.evaluate(() =>
        [...document.querySelectorAll('button, textarea, input')]
          .map((e) => ({ name: e.textContent?.trim() || e.id, box: e.getBoundingClientRect() }))
          .filter((x) => x.box.width > 0 && (x.box.height < 48 || x.box.width < 48))
          .map((x) => `${x.name} ${Math.round(x.box.width)}x${Math.round(x.box.height)}`),
      );
      expect(small, `small targets on ${where}`).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `sideways scroll on ${where}`).toBe(true);
      expect((await new AxeBuilder({ page }).analyze()).violations.map((v) => `${v.id} ${v.impact}`), `axe on ${where}`).toEqual([]);
    };
    await check(h.page, 'host first screen');
    await check(p.page, 'phone first screen');
    await pairBoth(h.page, p.page);
    await expect(status(h.page)).toHaveText('Connected', { timeout: 15_000 });
    await check(h.page, 'host connected');
    await expect(status(p.page)).toHaveText(/Connected|Sending/);
    await check(p.page, 'phone running');
    const stop = await p.page.getByRole('button', { name: 'Stop' }).boundingBox();
    expect(stop!.height).toBeGreaterThanOrEqual(72);
    await h.page.context().close();
    await p.page.context().close();
  });
});
