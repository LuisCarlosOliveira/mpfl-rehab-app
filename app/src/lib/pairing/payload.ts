import { z } from 'zod';
import { fail, type Result } from './result';
import { SECRET_BYTES } from './security';

const PREFIX = 'MPFL1.';
export const MAX_SCANNED_CHARS = 600; // PROPOSAL, qr-pairing.md section 5 rule 5. Checked before any parse.
const MAX_SDP_CHARS = 8192;
const MAX_CANDIDATES = 3;

export type Role = 'offer' | 'answer';

// ICE characters from RFC 8839: letters, digits, plus and slash. This also blocks line breaks in SDP text.
const iceChars = /^[A-Za-z0-9+/]+$/;
const ipv4 = /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;
const mdns = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.local$/;

function isPrivateIpv4(host: string): boolean {
  if (!ipv4.test(host)) return false;
  const [a = 0, b = 0] = host.split('.').map(Number);
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254);
}

const bytesOf = (length: number) => z.custom<Uint8Array>((v) => v instanceof Uint8Array && v.length === length);

const candidateSchema = z.strictObject({
  host: z.string().refine((h) => mdns.test(h) || isPrivateIpv4(h)),
  port: z.int().min(1).max(65535),
  protocol: z.literal('udp'),
});

const sdpFieldsSchema = z.strictObject({
  ufrag: z.string().min(4).max(32).regex(iceChars),
  pwd: z.string().min(22).max(48).regex(iceChars),
  fingerprint: bytesOf(32),
  candidates: z.array(candidateSchema).min(1).max(MAX_CANDIDATES),
});
const pairingFieldsSchema = sdpFieldsSchema.extend({ secret: bytesOf(SECRET_BYTES) });

export type Candidate = z.infer<typeof candidateSchema>;
export type SdpFields = z.infer<typeof sdpFieldsSchema>;
export type PairingFields = z.infer<typeof pairingFieldsSchema>;

export function toBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(text: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text) || text.length % 4 === 1) return null;
  const padded = text.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(text.length / 4) * 4, '=');
  const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
  return toBase64Url(bytes) === text ? bytes : null; // refuses extra bits at the end
}

const KIND_IPV4 = 0;
const KIND_MDNS = 1;
const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0));

function encode(role: Role, fields: PairingFields): string {
  const f = pairingFieldsSchema.parse(fields); // throws on a field that the app built wrong
  const out: number[] = [(role === 'answer' ? 1 : 0) | (f.candidates.length << 1)];
  out.push(f.ufrag.length, ...ascii(f.ufrag), f.pwd.length, ...ascii(f.pwd), ...f.fingerprint, ...f.secret);
  for (const c of f.candidates) {
    if (mdns.test(c.host)) {
      const hex = c.host.slice(0, 36).replace(/-/g, '');
      out.push(KIND_MDNS, ...Array.from({ length: 16 }, (_, i) => parseInt(hex.slice(i * 2, i * 2 + 2), 16)));
    } else {
      out.push(KIND_IPV4, ...c.host.split('.').map(Number));
    }
    out.push(c.port >> 8, c.port & 255);
  }
  return PREFIX + toBase64Url(Uint8Array.from(out));
}

export type DecodeError =
  | 'too-long'
  | 'bad-prefix'
  | 'bad-base64'
  | 'bad-header'
  | 'bad-role'
  | 'truncated'
  | 'trailing-bytes'
  | 'bad-field';

const TRUNCATED = Symbol('truncated');

function decode(text: string, role: Role): Result<PairingFields, DecodeError> {
  if (text.length > MAX_SCANNED_CHARS) return fail('too-long');
  if (!text.startsWith(PREFIX)) return fail('bad-prefix');
  const bytes = fromBase64Url(text.slice(PREFIX.length));
  if (!bytes) return fail('bad-base64');

  let pos = 0;
  const take = (n: number): Uint8Array => {
    if (pos + n > bytes.length) throw TRUNCATED;
    pos += n;
    return bytes.subarray(pos - n, pos);
  };
  const takeText = () => String.fromCharCode(...take(take(1)[0] ?? 0));
  try {
    const flags = take(1)[0] ?? 0;
    if (flags >> 3 !== 0) return fail('bad-header');
    if ((flags & 1) !== (role === 'answer' ? 1 : 0)) return fail('bad-role');
    const ufrag = takeText();
    const pwd = takeText();
    const fingerprint = take(32).slice();
    const secret = take(SECRET_BYTES).slice();
    const candidates: unknown[] = [];
    for (let i = 0; i < ((flags >> 1) & 3); i++) {
      const kind = take(1)[0];
      let host: string;
      if (kind === KIND_IPV4) {
        host = take(4).join('.');
      } else if (kind === KIND_MDNS) {
        const hex = Array.from(take(16), (b) => b.toString(16).padStart(2, '0')).join('');
        host = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}.local`;
      } else {
        return fail('bad-field');
      }
      const [hi = 0, lo = 0] = take(2);
      candidates.push({ host, port: hi * 256 + lo, protocol: 'udp' });
    }
    if (pos !== bytes.length) return fail('trailing-bytes');
    const parsed = pairingFieldsSchema.safeParse({ ufrag, pwd, fingerprint, secret, candidates });
    return parsed.success ? { ok: true, value: parsed.data } : fail('bad-field');
  } catch (e) {
    if (e === TRUNCATED) return fail('truncated');
    throw e;
  }
}

export const encodeOffer = (fields: PairingFields): string => encode('offer', fields);
export const encodeAnswer = (fields: PairingFields): string => encode('answer', fields);
export const decodeOffer = (text: string): Result<PairingFields, DecodeError> => decode(text, 'offer');
export const decodeAnswer = (text: string): Result<PairingFields, DecodeError> => decode(text, 'answer');

const fingerprintText = (fp: Uint8Array) => Array.from(fp, (b) => b.toString(16).padStart(2, '0').toUpperCase()).join(':');

/**
 * Builds the smallest SDP for a data-channel-only connection. The text is HAND-MADE from RFC 8866,
 * RFC 8841 and RFC 8839. It is UNVERIFIED against a real browser. A later Playwright test must use a real one.
 * The offer uses `a=setup:actpass`. The answer uses `a=setup:active`. Fields are checked first, never pasted raw.
 */
export function buildSdp(fields: SdpFields, role: Role): string {
  const f = sdpFieldsSchema.parse({
    ufrag: fields.ufrag,
    pwd: fields.pwd,
    fingerprint: fields.fingerprint,
    candidates: fields.candidates,
  });
  const candidates = f.candidates.map((c, i) => `a=candidate:${i + 1} 1 udp ${2122260223 - i} ${c.host} ${c.port} typ host`);
  return [
    'v=0',
    'o=- 1 2 IN IP4 127.0.0.1',
    's=-',
    't=0 0',
    'a=group:BUNDLE 0',
    'm=application 9 UDP/DTLS/SCTP webrtc-datachannel',
    'c=IN IP4 0.0.0.0',
    `a=ice-ufrag:${f.ufrag}`,
    `a=ice-pwd:${f.pwd}`,
    `a=fingerprint:sha-256 ${fingerprintText(f.fingerprint)}`,
    `a=setup:${role === 'offer' ? 'actpass' : 'active'}`,
    'a=mid:0',
    'a=sctp-port:5000',
    'a=max-message-size:262144',
    ...candidates,
    'a=end-of-candidates',
    '',
  ].join('\r\n');
}

export type SdpError = 'too-long' | 'missing-field' | 'bad-field' | 'no-candidate';

export function extractFields(sdp: string): Result<SdpFields, SdpError> {
  if (sdp.length > MAX_SDP_CHARS) return fail('too-long');
  const lines = sdp.split(/\r\n|\n/);
  if (lines.filter((l) => l.startsWith('m=')).length !== 1) return fail('bad-field');
  const values = (prefix: string) => lines.filter((l) => l.startsWith(prefix)).map((l) => l.slice(prefix.length));
  const [ufrag, ...moreUfrag] = values('a=ice-ufrag:');
  const [pwd, ...morePwd] = values('a=ice-pwd:');
  const [fp, ...moreFp] = values('a=fingerprint:sha-256 ');
  if (ufrag === undefined || pwd === undefined || fp === undefined) return fail('missing-field');
  if (moreUfrag.length + morePwd.length + moreFp.length > 0) return fail('bad-field');
  if (!/^(?:[0-9A-Fa-f]{2}:){31}[0-9A-Fa-f]{2}$/.test(fp)) return fail('bad-field');

  const candidates: unknown[] = [];
  for (const rest of values('a=candidate:')) {
    const [, component, transport, , host, port, typ, type] = rest.split(' ');
    if (component !== '1' || transport?.toLowerCase() !== 'udp' || typ !== 'typ' || type !== 'host') continue;
    const name = (host ?? '').toLowerCase();
    if (!mdns.test(name) && !isPrivateIpv4(name)) continue;
    if (candidates.length < MAX_CANDIDATES) candidates.push({ host: name, port: Number(port), protocol: 'udp' });
  }
  if (candidates.length === 0) return fail('no-candidate');

  const parsed = sdpFieldsSchema.safeParse({
    ufrag,
    pwd,
    fingerprint: Uint8Array.from(fp.split(':'), (h) => parseInt(h, 16)),
    candidates,
  });
  return parsed.success ? { ok: true, value: parsed.data } : fail('bad-field');
}
