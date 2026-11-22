import { expect, test, type Page } from '@playwright/test';
import { expectScreen, stopButton, watch } from './helpers/app';
import { toLive } from './helpers/simLive';
import { play } from './helpers/simPose';
import { reps, still } from './helpers/simSeries';

test.setTimeout(120_000);

const HEEL = { kind: 'heel-slide', sets: 2, reps: 3, targetFlexion: 60, maxFlexion: 90, returnWithinDeg: 20, minRepSeconds: 2 };

interface Traffic {
  bodies: { url: string; method: string; size: number; type: string; image: boolean }[];
  sockets: string[];
  channels: string[];
  beacons: string[];
}
declare global {
  interface Window {
    __traffic: Traffic;
  }
}

async function installTrafficProbes(page: Page) {
  await page.addInitScript(() => {
    const traffic: Traffic = { bodies: [], sockets: [], channels: [], beacons: [] };
    window.__traffic = traffic;
    const isImageBytes = (b: Uint8Array) =>
      (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) || (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47);
    const IMAGE_TEXT = /data:image|blob:|\/9j\/|iVBORw0KGgo/;
    const describe = async (url: string, method: string, body: unknown) => {
      let size = 0;
      let type = '';
      let image = false;
      if (typeof body === 'string') {
        size = body.length;
        type = 'text';
        image = IMAGE_TEXT.test(body);
      } else if (body instanceof Blob) {
        size = body.size;
        type = body.type || 'blob';
        image = body.type.startsWith('image/') || isImageBytes(new Uint8Array(await body.slice(0, 8).arrayBuffer()));
      } else if (body instanceof ArrayBuffer || ArrayBuffer.isView(body)) {
        const bytes = body instanceof ArrayBuffer ? new Uint8Array(body) : new Uint8Array(body.buffer, body.byteOffset, body.byteLength);
        size = bytes.length;
        type = 'bytes';
        image = isImageBytes(bytes);
      } else if (body instanceof FormData) {
        type = 'form';
        for (const v of body.values()) {
          if (typeof v === 'string') image ||= IMAGE_TEXT.test(v);
          else image = true;
          size += typeof v === 'string' ? v.length : v.size;
        }
      } else if (body !== undefined && body !== null) {
        type = Object.prototype.toString.call(body);
        image = true;
      }
      traffic.bodies.push({ url: String(url), method, size, type, image });
    };
    const realFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const url = input instanceof Request ? input.url : String(input);
      const method = init?.method ?? (input instanceof Request ? input.method : 'GET');
      const body = init?.body ?? (input instanceof Request ? await input.clone().blob() : undefined);
      if (body !== undefined && !(body instanceof Blob && body.size === 0)) await describe(url, method, body);
      return realFetch(input, init);
    };
    const open = XMLHttpRequest.prototype.open;
    const send = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (method: string, url: string | URL, ...rest: unknown[]) {
      (this as XMLHttpRequest & { __m: string; __u: string }).__m = method;
      (this as XMLHttpRequest & { __m: string; __u: string }).__u = String(url);
      // @ts-expect-error pass the original arguments on
      return open.call(this, method, url, ...rest);
    };
    XMLHttpRequest.prototype.send = function (body) {
      const x = this as XMLHttpRequest & { __m: string; __u: string };
      if (body !== undefined && body !== null) void describe(x.__u, x.__m, body);
      return send.call(this, body);
    };
    const RealSocket = window.WebSocket;
    // @ts-expect-error the probe only records the call and then builds the real socket
    window.WebSocket = class extends RealSocket {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);
        traffic.sockets.push(String(url));
      }
    };
    if (window.RTCPeerConnection) {
      const create = RTCPeerConnection.prototype.createDataChannel;
      RTCPeerConnection.prototype.createDataChannel = function (label, opts) {
        traffic.channels.push(label);
        return create.call(this, label, opts);
      };
    }
    const beacon = navigator.sendBeacon?.bind(navigator);
    navigator.sendBeacon = (url, data) => {
      traffic.beacons.push(String(url));
      return beacon ? beacon(url, data) : false;
    };
  });
}

function walkStorage(page: Page) {
  return page.evaluate(async () => {
    const found: string[] = [];
    const IMAGE_TEXT = /data:image|blob:|\/9j\/|iVBORw0KGgo/;
    const isImageBytes = (b: Uint8Array) =>
      (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) || (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47);
    const seen = new WeakSet<object>();
    const scan = (where: string, v: unknown, depth = 0) => {
      if (typeof v === 'string') {
        if (IMAGE_TEXT.test(v)) found.push(`${where}: image text`);
      } else if (v instanceof Blob || v instanceof ImageBitmap || v instanceof ImageData || v instanceof File) {
        found.push(`${where}: ${Object.prototype.toString.call(v)}`);
      } else if (v instanceof ArrayBuffer || ArrayBuffer.isView(v)) {
        const bytes = v instanceof ArrayBuffer ? new Uint8Array(v) : new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
        if (isImageBytes(bytes)) found.push(`${where}: image bytes`);
      } else if (v !== null && typeof v === 'object' && depth < 12 && !seen.has(v)) {
        seen.add(v);
        for (const [k, child] of Object.entries(v)) scan(`${where}.${k}`, child, depth + 1);
      }
    };
    for (const store of [localStorage, sessionStorage]) {
      for (let i = 0; i < store.length; i += 1) {
        const key = store.key(i)!;
        scan(`web-storage ${key}`, store.getItem(key));
      }
    }
    const dbs = await indexedDB.databases();
    let stores = 0;
    for (const info of dbs) {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const open = indexedDB.open(info.name!);
        open.onsuccess = () => resolve(open.result);
        open.onerror = () => reject(open.error);
      });
      for (const name of Array.from(db.objectStoreNames)) {
        stores += 1;
        const rows = await new Promise<unknown[]>((resolve, reject) => {
          const all = db.transaction(name).objectStore(name).getAll();
          all.onsuccess = () => resolve(all.result);
          all.onerror = () => reject(all.error);
        });
        rows.forEach((row, i) => scan(`idb ${info.name}/${name}[${i}]`, row));
      }
      db.close();
    }
    return { found, databases: dbs.length, stores, rows: 0 };
  });
}

test('a full live session sends nothing off the origin and stores no image', async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const seen = watch(page, origin);
  const posted: { url: string; method: string; size: number; type: string; magic: boolean; text: boolean }[] = [];
  page.on('request', (r) => {
    const buf = r.postDataBuffer();
    if (buf === null) return;
    posted.push({
      url: r.url(),
      method: r.method(),
      size: buf.length,
      type: r.headers()['content-type'] ?? '',
      magic: (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) || (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47),
      text: /data:image|blob:/.test(buf.toString('latin1')),
    });
  });
  const sockets: string[] = [];
  page.on('websocket', (ws) => sockets.push(ws.url()));
  await installTrafficProbes(page);

  await toLive(page, HEEL, still('heel-slide', 5, 60_000));
  const series = reps('heel-slide', { reps: 3, leadMs: 1000, gapMs: 1000 });
  await play(page, series);
  await page.waitForTimeout((series.at(-1)?.tMs ?? 0) + 1000);
  await stopButton(page).click();
  await expectScreen(page, 'Summary');
  await page.getByLabel('3', { exact: true }).check();
  await page.getByLabel('Some swelling').check();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Session saved.')).toBeVisible();
  await page.getByRole('button', { name: 'Done' }).click();
  await expectScreen(page, 'Today');

  const traffic = await page.evaluate(() => window.__traffic);
  const all = seen.requests.filter((u) => !u.startsWith('data:') && !u.startsWith('blob:'));
  expect(all.length, 'the session made requests to the own origin (the probe sees traffic)').toBeGreaterThan(0);
  const foreign = all.filter((u) => new URL(u).origin !== origin);
  expect(foreign, 'requests that leave the own origin').toEqual([]);
  expect(await page.evaluate(() => window.__probes.gumCalls), 'the camera ran').toBeGreaterThan(0);

  const wire = posted.filter((p) => p.method === 'POST' || p.method === 'PUT');
  expect(wire.filter((p) => p.magic || p.text || p.type.startsWith('image/') || p.type.startsWith('video/')), `image bytes on the wire: ${JSON.stringify(wire)}`).toEqual([]);
  expect(traffic.bodies.filter((b) => b.image), `image bodies seen by the page probe: ${JSON.stringify(traffic.bodies)}`).toEqual([]);
  expect(traffic.sockets, 'WebSocket').toEqual([]);
  expect(sockets, 'WebSocket seen by the browser').toEqual([]);
  expect(traffic.channels, 'RTCDataChannel').toEqual([]);
  expect(traffic.beacons, 'sendBeacon').toEqual([]);

  const stored = await walkStorage(page);
  expect(stored.stores, 'the walk found the app database').toBeGreaterThan(0);
  expect(stored.found, 'image data in browser storage').toEqual([]);
  await seen.expectClean('the end of the session');
});
