// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  buildSdp, decodeAnswer, decodeOffer, encodeAnswer, encodeOffer, extractFields, fromBase64Url, toBase64Url,
  MAX_SCANNED_CHARS,
} from '../../src/lib/pairing';
import { fields, MDNS, seeded } from './helpers';

// HAND-MADE fixture, written from the structure of RFC 8866, 8841 and 8839. It is UNVERIFIED against a real
// browser. A later Playwright test must use a real description.
const FP = Array.from({ length: 32 }, (_, i) => (i * 7).toString(16).padStart(2, '0').toUpperCase()).join(':');
const FIXTURE = [
  'v=0',
  'o=- 4611731400430051336 2 IN IP4 127.0.0.1',
  's=-',
  't=0 0',
  'a=group:BUNDLE 0',
  'a=extmap-allow-mixed',
  'a=msid-semantic: WMS',
  'm=application 9 UDP/DTLS/SCTP webrtc-datachannel',
  'c=IN IP4 0.0.0.0',
  `a=candidate:1 1 udp 2113937151 ${MDNS} 53988 typ host generation 0 network-cost 999`,
  'a=candidate:2 1 tcp 1518280447 192.168.1.5 9 typ host tcptype active',
  'a=ice-ufrag:aB3x',
  'a=ice-pwd:abcdefghijklmnopqrstuvwx',
  'a=ice-options:trickle',
  `a=fingerprint:sha-256 ${FP}`,
  'a=setup:actpass',
  'a=mid:0',
  'a=sctp-port:5000',
  'a=max-message-size:262144',
  '',
].join('\r\n');

// Puts extra lines in front of the ufrag line of the fixture.
const withLines = (extra: string[]) => FIXTURE.replace('a=ice-ufrag', [...extra, 'a=ice-ufrag'].join('\r\n'));

const ok = <T>(r: { ok: true; value: T } | { ok: false; code: string }): T => {
  if (!r.ok) throw new Error(`expected ok, got ${r.code}`);
  return r.value;
};

describe('encode and decode', () => {
  it('round trips an offer and an answer', () => {
    expect(ok(decodeOffer(encodeOffer(fields())))).toEqual(fields());
    expect(ok(decodeAnswer(encodeAnswer(fields())))).toEqual(fields());
  });

  it('starts with the prefix and uses only base64url characters', () => {
    expect(encodeOffer(fields())).toMatch(/^MPFL1\.[A-Za-z0-9_-]+$/);
  });

  it('has the measured size for a typical offer: 137 characters', () => {
    expect(encodeOffer(fields()).length).toBe(137);
    expect(encodeOffer(fields()).length - 'MPFL1.'.length).toBe(131);
  });

  it('keeps a worst case with 3 candidates far below the cap of 600', () => {
    const three = fields({
      pwd: 'p'.repeat(48),
      ufrag: 'u'.repeat(32),
      candidates: [
        { host: MDNS, port: 1, protocol: 'udp' },
        { host: '192.168.100.200', port: 65535, protocol: 'udp' },
        { host: MDNS, port: 2, protocol: 'udp' },
      ],
    });
    const text = encodeOffer(three);
    expect(text.length).toBeLessThan(MAX_SCANNED_CHARS);
    expect(ok(decodeOffer(text))).toEqual(three);
  });

  it('keeps an IPv4 candidate', () => {
    const f = fields({ candidates: [{ host: '10.0.0.7', port: 40000, protocol: 'udp' }] });
    expect(ok(decodeOffer(encodeOffer(f)))).toEqual(f);
  });

  it('refuses an answer text as an offer and an offer text as an answer', () => {
    expect(decodeOffer(encodeAnswer(fields()))).toEqual({ ok: false, code: 'bad-role' });
    expect(decodeAnswer(encodeOffer(fields()))).toEqual({ ok: false, code: 'bad-role' });
  });

  it('echoes the secret in the answer', () => {
    const f = fields();
    expect(ok(decodeAnswer(encodeAnswer(f))).secret).toEqual(f.secret);
  });

  describe('size cap', () => {
    const valid = encodeOffer(fields());
    it('passes the cap check at exactly 600 characters and refuses 601', () => {
      // The padded text fails later, but not with too-long.
      expect(decodeOffer(valid + 'A'.repeat(MAX_SCANNED_CHARS - valid.length))).not.toEqual({ ok: false, code: 'too-long' });
      expect(decodeOffer(valid + 'A'.repeat(MAX_SCANNED_CHARS - valid.length + 1))).toEqual({ ok: false, code: 'too-long' });
    });
    it('checks the size before any other step', () => {
      expect(decodeOffer('x'.repeat(601))).toEqual({ ok: false, code: 'too-long' });
    });
  });

  describe('malformed text', () => {
    const body = encodeOffer(fields()).slice('MPFL1.'.length);
    const cases: [string, string, string][] = [
      ['empty text', '', 'bad-prefix'],
      ['a URL', 'https://example.com/?a=1', 'bad-prefix'],
      ['another version', 'MPFL2.' + body, 'bad-prefix'],
      ['lower case prefix', 'mpfl1.' + body, 'bad-prefix'],
      ['a space in the body', 'MPFL1.' + body.slice(0, 10) + ' ' + body.slice(10), 'bad-base64'],
      ['a line break in the body', 'MPFL1.' + body + '\n', 'bad-base64'],
      ['padding characters', 'MPFL1.' + body + '=', 'bad-base64'],
      ['a length of 1 modulo 4', 'MPFL1.AAAAA', 'bad-base64'],
      ['nothing after the prefix', 'MPFL1.', 'truncated'],
      ['a cut text', 'MPFL1.' + body.slice(0, 60), 'truncated'],
    ];
    it.each(cases)('refuses %s', (_name, text, code) => {
      expect(decodeOffer(text)).toEqual({ ok: false, code });
    });

    it('refuses bytes after the last candidate', () => {
      const bytes = fromBase64Url(body)!;
      expect(decodeOffer('MPFL1.' + toBase64Url(Uint8Array.from([...bytes, 0])))).toEqual({ ok: false, code: 'trailing-bytes' });
    });

    it('refuses non-canonical base64url (extra bits at the end)', () => {
      const last = body.at(-1)!;
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
      const other = alphabet[(alphabet.indexOf(last) + 1) % 64]!;
      expect(fromBase64Url(body.slice(0, -1) + other)).toBeNull();
    });

    it('refuses a header with reserved bits', () => {
      const bytes = fromBase64Url(body)!.slice();
      bytes[0] = bytes[0]! | 0x08;
      expect(decodeOffer('MPFL1.' + toBase64Url(bytes))).toEqual({ ok: false, code: 'bad-header' });
    });

    it('refuses zero candidates and an unknown candidate kind', () => {
      const bytes = fromBase64Url(body)!.slice();
      bytes[0] = 0; // zero candidates, so 19 bytes trail
      expect(decodeOffer('MPFL1.' + toBase64Url(bytes)).ok).toBe(false);
      const kind = fromBase64Url(body)!.slice();
      kind[1 + 5 + 25 + 32 + 16] = 9;
      expect(decodeOffer('MPFL1.' + toBase64Url(kind))).toEqual({ ok: false, code: 'bad-field' });
    });

    it('refuses a port of 0 and a multicast address', () => {
      const f = fields({ candidates: [{ host: '10.0.0.7', port: 40000, protocol: 'udp' }] });
      const bytes = fromBase64Url(encodeOffer(f).slice(6))!.slice();
      bytes[bytes.length - 2] = 0;
      bytes[bytes.length - 1] = 0;
      expect(decodeOffer('MPFL1.' + toBase64Url(bytes))).toEqual({ ok: false, code: 'bad-field' });
      bytes[bytes.length - 6] = 224;
      bytes[bytes.length - 1] = 1;
      expect(decodeOffer('MPFL1.' + toBase64Url(bytes))).toEqual({ ok: false, code: 'bad-field' });
    });

    it('never throws on 200 random strings, with and without the prefix', () => {
      const rnd = seeded(7);
      const chars = 'ABCxyz019-_=. \n"{}:/é\u0000';
      for (let i = 0; i < 200; i++) {
        const len = Math.floor(rnd() * 200);
        const s = Array.from({ length: len }, () => chars[Math.floor(rnd() * chars.length)]).join('');
        for (const t of [s, 'MPFL1.' + s]) {
          expect(() => decodeOffer(t)).not.toThrow();
          expect(() => decodeAnswer(t)).not.toThrow();
        }
      }
    });
  });

  describe('field checks on encode', () => {
    it.each([
      ['a ufrag with a line break', { ufrag: 'ab\r\n' }],
      ['a ufrag that is too short', { ufrag: 'abc' }],
      ['a pwd with a space', { pwd: 'abcdefghijklmnopqrstuv w' }],
      ['a pwd that is too short', { pwd: 'a'.repeat(21) }],
      ['a fingerprint of 31 bytes', { fingerprint: new Uint8Array(31) }],
      ['a secret of 15 bytes', { secret: new Uint8Array(15) }],
      ['no candidate', { candidates: [] }],
      ['4 candidates', { candidates: Array(4).fill({ host: '10.0.0.1', port: 1, protocol: 'udp' }) }],
      ['a tcp candidate', { candidates: [{ host: '10.0.0.1', port: 1, protocol: 'tcp' }] }],
      ['a host with a line break', { candidates: [{ host: '10.0.0.1\r\na=x', port: 1, protocol: 'udp' }] }],
      ['an mDNS name in upper case', { candidates: [{ host: MDNS.toUpperCase(), port: 1, protocol: 'udp' }] }],
      ['an IPv4 number with a leading zero', { candidates: [{ host: '10.00.0.1', port: 1, protocol: 'udp' }] }],
      ['an IPv4 octet of 256', { candidates: [{ host: '10.0.0.256', port: 1, protocol: 'udp' }] }],
      ['port 0', { candidates: [{ host: '10.0.0.1', port: 0, protocol: 'udp' }] }],
      ['port 65536', { candidates: [{ host: '10.0.0.1', port: 65536, protocol: 'udp' }] }],
      ['a port with decimals', { candidates: [{ host: '10.0.0.1', port: 1.5, protocol: 'udp' }] }],
    ])('refuses %s', (_name, over) => {
      expect(() => encodeOffer(fields(over as never))).toThrow();
    });

    it('accepts the boundary values', () => {
      const f = fields({
        ufrag: 'a'.repeat(4),
        pwd: 'b'.repeat(22),
        candidates: [{ host: '10.0.0.1', port: 65535, protocol: 'udp' }, { host: '10.0.0.1', port: 1, protocol: 'udp' }],
      });
      expect(ok(decodeOffer(encodeOffer(f)))).toEqual(f);
    });
  });
});

describe('extractFields', () => {
  it('reads the fields of the fixture and keeps only UDP host candidates', () => {
    const f = ok(extractFields(FIXTURE));
    expect(f.ufrag).toBe('aB3x');
    expect(f.pwd).toBe('abcdefghijklmnopqrstuvwx');
    expect(Array.from(f.fingerprint)).toEqual(Array.from(fields().fingerprint));
    expect(f.candidates).toEqual([{ host: MDNS, port: 53988, protocol: 'udp' }]);
  });

  it('keeps at most 3 candidates', () => {
    const many = [1, 2, 3, 4, 5].map((i) => `a=candidate:${i} 1 udp 2113937151 10.0.0.${i} ${4000 + i} typ host`);
    expect(ok(extractFields(withLines(many))).candidates.map((c) => c.port)).toEqual([53988, 4001, 4002]);
  });

  it('skips an IPv6 candidate, a relay candidate and a component 2 candidate', () => {
    const extra = [
      'a=candidate:3 1 udp 1 fe80::1 5000 typ host',
      'a=candidate:4 1 udp 1 10.0.0.9 5000 typ relay raddr 0.0.0.0 rport 0',
      'a=candidate:5 2 udp 1 10.0.0.9 5000 typ host',
    ];
    expect(ok(extractFields(withLines(extra))).candidates).toHaveLength(1);
  });

  it('gives no-candidate when nothing usable is left', () => {
    const sdp = FIXTURE.split('\r\n').filter((l) => !l.includes('udp 2113937151')).join('\r\n');
    expect(extractFields(sdp)).toEqual({ ok: false, code: 'no-candidate' });
  });

  it.each([
    ['no ufrag', FIXTURE.replace('a=ice-ufrag:aB3x\r\n', ''), 'missing-field'],
    ['no pwd', FIXTURE.replace(/a=ice-pwd:.*\r\n/, ''), 'missing-field'],
    ['no fingerprint', FIXTURE.replace(/a=fingerprint:.*\r\n/, ''), 'missing-field'],
    ['a sha-1 fingerprint only', FIXTURE.replace('sha-256', 'sha-1'), 'missing-field'],
    ['two ufrag lines', FIXTURE.replace('a=ice-ufrag:aB3x', 'a=ice-ufrag:aB3x\r\na=ice-ufrag:zzzz'), 'bad-field'],
    ['two media sections', FIXTURE + 'm=video 9 UDP/TLS/RTP/SAVPF 96\r\n', 'bad-field'],
    ['a short fingerprint', FIXTURE.replace(FP, FP.slice(3)), 'bad-field'],
    ['a ufrag with a bad character', FIXTURE.replace('aB3x', 'aB3*'), 'bad-field'],
    ['a port that is not a number', FIXTURE.replace('53988', 'abc'), 'bad-field'],
    ['a text over 8192 characters', FIXTURE + 'x'.repeat(8200), 'too-long'],
  ])('refuses %s', (_name, sdp, code) => {
    expect(extractFields(sdp)).toEqual({ ok: false, code });
  });

  it('never throws on 200 random strings', () => {
    const rnd = seeded(11);
    const lines = FIXTURE.split('\r\n');
    for (let i = 0; i < 200; i++) {
      const sdp = Array.from({ length: Math.floor(rnd() * 25) }, () => {
        const l = lines[Math.floor(rnd() * lines.length)] ?? '';
        return rnd() < 0.3 ? l.slice(Math.floor(rnd() * l.length)) : l;
      }).join(rnd() < 0.5 ? '\r\n' : '\n');
      expect(() => extractFields(sdp)).not.toThrow();
    }
  });
});

describe('buildSdp', () => {
  it('writes the fixed lines and the checked fields', () => {
    const sdp = buildSdp(fields(), 'offer');
    expect(sdp).toContain('m=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\n');
    expect(sdp).toContain('a=ice-ufrag:aB3x\r\n');
    expect(sdp).toContain(`a=fingerprint:sha-256 ${FP}\r\n`);
    expect(sdp).toContain('typ host\r\na=end-of-candidates\r\n');
    expect(sdp.endsWith('\r\n')).toBe(true);
  });

  it('uses actpass for an offer and active for an answer', () => {
    expect(buildSdp(fields(), 'offer')).toContain('a=setup:actpass\r\n');
    expect(buildSdp(fields(), 'answer')).toContain('a=setup:active\r\n');
    expect(buildSdp(fields(), 'answer')).not.toContain('actpass');
  });

  it('does not write the one-time value', () => {
    expect(buildSdp(fields(), 'offer')).not.toContain(toBase64Url(fields().secret));
  });

  it('refuses fields that fail the check, so no raw text enters the SDP', () => {
    expect(() => buildSdp(fields({ ufrag: 'ab\r\na=evil:1' }), 'offer')).toThrow();
    expect(() => buildSdp(fields({ candidates: [{ host: '1.2.3.4\r\na=x', port: 5, protocol: 'udp' }] }), 'offer')).toThrow();
  });

  it('round trips: extract, build, extract gives the same fields', () => {
    const first = ok(extractFields(FIXTURE));
    for (const role of ['offer', 'answer'] as const) {
      expect(ok(extractFields(buildSdp(first, role)))).toEqual(first);
    }
  });

  it('round trips 50 random field sets through the QR text and through the SDP', () => {
    const rnd = seeded(3);
    const ice = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const text = (n: number) => Array.from({ length: n }, () => ice[Math.floor(rnd() * 64)]).join('');
    const bytes = (n: number) => Uint8Array.from({ length: n }, () => Math.floor(rnd() * 256));
    for (let i = 0; i < 50; i++) {
      const f = fields({
        ufrag: text(4 + Math.floor(rnd() * 28)),
        pwd: text(22 + Math.floor(rnd() * 26)),
        fingerprint: bytes(32),
        secret: bytes(16),
        candidates: Array.from({ length: 1 + Math.floor(rnd() * 3) }, () => ({
          host: rnd() < 0.5 ? MDNS : `10.${Math.floor(rnd() * 256)}.${Math.floor(rnd() * 256)}.${1 + Math.floor(rnd() * 200)}`,
          port: 1 + Math.floor(rnd() * 65535),
          protocol: 'udp' as const,
        })),
      });
      const viaQr = ok(decodeOffer(encodeOffer(f)));
      expect(viaQr).toEqual(f);
      expect(ok(extractFields(buildSdp(viaQr, 'offer')))).toEqual({
        ufrag: f.ufrag, pwd: f.pwd, fingerprint: f.fingerprint, candidates: f.candidates,
      });
    }
  });
});

describe('candidate hosts (audit A1-1)', () => {
  const cand = (host: string) => fields({ candidates: [{ host, port: 40000, protocol: 'udp' }] });
  const sdpWith = (host: string) =>
    FIXTURE.split('\r\n').filter((l) => !l.includes('udp 2113937151')).join('\r\n')
      .replace('a=ice-ufrag', `a=candidate:1 1 udp 2113937151 ${host} 40000 typ host\r\na=ice-ufrag`);

  it.each([
    '10.0.0.1', '10.255.255.254', '172.16.0.1', '172.31.255.255', '192.168.1.1', '192.168.255.255',
    '100.64.0.1', '100.84.170.33', '100.127.255.254', '169.254.10.20',
  ])('accepts the private or tailnet address %s', (host) => {
    expect(ok(decodeOffer(encodeOffer(cand(host)))).candidates[0]?.host).toBe(host);
    expect(ok(extractFields(sdpWith(host))).candidates[0]?.host).toBe(host);
  });

  it.each([
    '8.8.8.8', '1.2.3.4', '11.0.0.1', '127.0.0.1', '0.0.0.0', '172.15.255.255', '172.32.0.1', '100.63.255.255',
    '100.128.0.1', '192.167.1.1', '192.169.0.1', '169.253.1.1', '224.0.0.1', '255.255.255.255',
  ])('refuses the address %s', (host) => {
    expect(() => encodeOffer(cand(host))).toThrow();
    expect(extractFields(sdpWith(host))).toEqual({ ok: false, code: 'no-candidate' });
  });
});
