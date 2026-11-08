# QR pairing for task T12b

Date: 2026-11-08. This file supports task T12b (second device). It adds to `webrtc-pairing.md` (option A) and `dual-camera-opus.md` sections 4 and 5. Marks: V (opened or measured in this session), DERIVED (my arithmetic), UNVERIFIED (not opened).

Skills loaded: `context7-mcp`, `owasp-security` and `simple-english:simple-english`, all with the Skill tool. I read `mpfl-clinical-guardrails/SKILL.md` and `research/INDEX.md`. Context7 gave the API of `qr-scanner` and `uqr`.

## 1. Overview and recommendation

Option A (two QR codes, `iceServers: []`, data channel only) is feasible. The offer and the answer each fit in ONE QR code of version 8 to 11. The app must send only the needed fields (section 4).

| Part | Recommendation | License | Size |
|---|---|---|---|
| Encoder | `uqr` 0.1.3 | MIT | 79,278 bytes unpacked, 7.8 KB gzip (ESM file) |
| Decoder | `qr-scanner` 1.4.2 | MIT | 15.8 KB min file plus 44 KB worker file, 5.7 KB gzip for the main file |
| Fallback decoder | `jsQR` 1.4.0 (only if `qr-scanner` fails the real-phone test) | Apache-2.0 | 257 KB file, 57 KB gzip |
| Encoding | Compact text, base64url, one QR code of version 8 to 11, level M | not applicable | 126 to 250 characters |

The user allowed ONE QR library. Two libraries are needed because no small library does both (section 3). Ask the user to confirm that two small libraries are acceptable. The alternative is one decoder only, plus a 60-line own encoder (see section 2).

Why this choice:
- `uqr` outputs SVG text. It draws no canvas, and it has no dependency.
- `qr-scanner` uses the native `BarcodeDetector` when it exists. Otherwise it decodes in a worker. It has one dependency, a types package only.
- Both are MIT. Both run offline. Neither needs `eval`, inline script or inline style (section 2 and 3).
- Both are old or young in a risky way. `qr-scanner` last published on 2022-11-23. `uqr` is version 0.1.3 and pre-1.0. Pin exact versions, as the project does.

## 2. Encoder comparison

Data: `npm view` on 2026-11-08 (V), tarballs from `npm pack` in the scratch folder, read as text and not run (V). Size is `dist.unpackedSize`. Browser size is the ESM file I measured, raw and gzip level 9.

| Library | License | Unpacked | Browser file | Last publish | Dependencies |
|---|---|---|---|---|---|
| `uqr` 0.1.3 | MIT | 79,278 B | 27.5 KB, 7.8 KB gzip | 2026-04-03 | none |
| `qrcode-generator` 2.0.4 | MIT | 555,539 B | `qrcode.mjs` 51.9 KB, 11.1 KB gzip | 2025-08-07 | none |
| `nayuki-qr-code-generator` 1.8.0 (port by Kirill Maltsev) | MIT | not read | `index.js` 45.3 KB, 11.7 KB gzip | 2022-05-04 | none |
| `qrcode` (node-qrcode) 1.5.4 | MIT | 135,364 B | no ready browser file in the package | 2024-08-05 | `pngjs`, `yargs`, `dijkstrajs` |
| `qrcode-svg` 1.1.0 | MIT | 248,693 B | not measured | 2019-10-29 | none |

Notes per library:
- `uqr`: the license file names "Project Nayuki" and Anthony Fu. So it derives from the Nayuki code. API from Context7: `renderSVG(text, { ecc, border, pixelSize })` and `encode(text, options)`, which returns a matrix. Default level is `L`, so pass `ecc: 'M'`. `renderSVG` writes `<svg>`, a `<rect fill=...>` and a `<path fill=... d=...>`. It uses attributes and no `style` attribute. No `eval`.
- `qrcode-generator`: `createSvgTag` writes SVG with attributes. `createDataURL` and `createImgTag` also exist. The table output uses inline `style` attributes, so do not use `createTableTag`. It has a canvas drawing path in `qrcode.mjs` (`fillRect`). Use SVG only.
- Nayuki original: the author site says MIT, no dependencies, about 1,000 lines per language, all 40 versions, all 4 levels. It gives the module matrix and leaves drawing to you. The npm package above is a third-party port. The author site names TypeScript and JavaScript but not that port. The port is stale (2022).
- `qrcode`: it has a CLI and `yargs`, so it is heavy. Its default browser output is a canvas. It does support SVG output (UNVERIFIED, I did not open its README). Reject for size and dependencies.
- `qrcode-svg`: last publish 2019. Reject as stale.

Checks of all downloaded packages (V): a search for `eval(` and `new Function(` found no hit in any of them. No package makes a network call in the encoder code I read (`uqr` and `qrcode-generator`). Network calls in the other packages are not checked.

How to keep the guardrails clear:
- Use SVG output. Insert it as `<img src="data:image/svg+xml,...">` or as an inline `<svg>` that React builds from the boolean matrix of `encode`. The CSP allows `img-src data:`.
- The safest way is to render the matrix with React: one `<svg>` and one `<path d>`. Then no SVG string goes into HTML, and the app uses no `dangerouslySetInnerHTML`.
- The QR code comes from text. It is not a camera frame. Never call `toBlob`, `toDataURL` or `canvas` for the QR code. The `claims-check.sh` script then stays clean.
- Do not ask the user to download or share the QR image. It holds a one-time secret.

Own encoder option: the Nayuki code is MIT and about 1,000 lines. A reduced byte-mode-only copy is possible, but it adds code to test. Not recommended while `uqr` exists.

## 3. Decoder comparison

| Library | License | Unpacked | Browser file | Last publish | Dependencies |
|---|---|---|---|---|---|
| `qr-scanner` 1.4.2 | MIT | 524,238 B | main 15.8 KB (5.7 KB gzip), worker 44.0 KB | 2022-11-23 | `@types/offscreencanvas` (types only) |
| `jsQR` 1.4.0 | Apache-2.0 | 279,741 B | `jsQR.js` 257 KB (57 KB gzip) | 2021-04-24 | none |
| `@zxing/browser` 0.2.1 | MIT | 5,800,976 B | not measured | 2026-07-06 | peer `@zxing/library` ^0.23.0 (Apache-2.0, 11,863,492 B, one dependency) |
| `barcode-detector` 3.2.3 (ponyfill) | MIT | 259,535 B | wrapper 58 KB, plus `zxing-wasm` 3.1.6 (MIT, 3,717,806 B) | 2026-10-19 | `zxing-wasm` |
| `BarcodeDetector` API | built in | none | none | not applicable | none |

The "modified" field of `jsqr` shows 2025-11, but the last version is from 2021-04-24 (V, `npm view jsqr time`).

Library notes:
- `qr-scanner`: README and Context7 (V). `new QrScanner(video, onDecode, { returnDetailedScanResult: true, preferredCamera, maxScansPerSecond })`, then `start()` and `destroy()`. `destroy()` stops the camera stream and the worker. It uses the native `BarcodeDetector` if it exists. Then it loads only about 15.3 kB (5.6 kB gzip) instead of the full 59.3 kB. The project has 109 open issues, and its release list was empty on the page I read.
- `qr-scanner` CSP (V by reading the minified code): the worker is built from a string with `URL.createObjectURL(new Blob([...]))` and `new Worker(...)`. This is allowed by `worker-src 'self' blob:`. The worker module loads by dynamic `import("./qr-scanner-worker.min.js")` from the same origin, so `script-src 'self'` is enough. Vite bundles this file. It uses no `eval`, no `new Function` and no wasm. `getUserMedia` calls in its code use `audio:false`.
- `qr-scanner` privacy: it draws each video frame to a canvas and reads pixels with `getImageData`. It does not call `toBlob`, `toDataURL`, `MediaRecorder` or `ImageCapture` (V, grep of the minified files). The frame stays in memory. The app never stores or sends it. This reading is part of the same `getUserMedia` camera permission as pose tracking.
- `qr-scanner` risk with the guardrails: it opens its own camera stream. The guardrail rules (button press, stop tracks on `visibilitychange`, `pagehide`, route change and error) must also apply. `claims-check.sh` scans only `app/src` and not `node_modules`. So a test must prove that no camera track stays live after `destroy()`.
- `jsQR`: the API is `jsQR(imageData, width, height, { inversionAttempts })`. It needs RGBA pixels, so the app must draw frames to a canvas by itself, with its own `camera.ts`. The README names no worker, wasm or `eval`, and my grep found none. The result has `data` and `binaryData`. Default `attemptBoth` costs about 50% speed, so pass `dontInvert`. Last publish was 2021.
- `@zxing/browser`: 5.8 MB plus 11.8 MB for the library. Too large. Reject.
- `barcode-detector`: the code holds a default URL `https://fastly.jsdelivr.net/npm/zxing-wasm@3.1.6/dist/...` for the wasm file (V, line 538 of `zxing-exported.js`). That call breaks `connect-src 'self'` and sends a request to a third party. It can be set to a local file, but that is more work. Reject.

`BarcodeDetector` API:
- MDN page (opened): "not Baseline", "experimental technology", available only in secure contexts, also in workers. The compatibility table was empty in the text that I got. So the browser versions from MDN are UNVERIFIED.
- Chrome developer page (opened, `developer.chrome.com/docs/capabilities/shape-detection`). It says: "Barcode detection is available on macOS, ChromeOS, and Android." "Google Play Services are required on Android." It became default in Chrome 83. `qr_code` is a listed format. The page does not name Windows or Linux. So desktop Windows is UNVERIFIED and likely not supported. The laptop of the patient is probably Windows. So the laptop needs a JavaScript decoder.
- Check at run time: `'BarcodeDetector' in window` and `(await BarcodeDetector.getSupportedFormats()).includes('qr_code')`.
- Edge and Chrome on desktop: UNVERIFIED.

Decision: `qr-scanner` already does "BarcodeDetector first, worker decoder second". So use it as the one decoder. It covers the phone (native) and the laptop (worker).

## 4. Offer and answer size

### 4.1 Method

One-off script in the scratch folder. It imported `chromium` from the Playwright package of the app (version 1.65.0). The browser was `HeadlessChrome/158.0.8127.18` on Linux (WSL2). The script created `RTCPeerConnection({ iceServers: [] })` and one data channel. It made an offer and waited for ICE gathering. Then a second peer in the same page built the answer. I removed the scratch folder at the end. The numbers are below.

### 4.2 Measured values (V, one run)

| Item | Offer | Answer |
|---|---|---|
| Full SDP, characters (equal to bytes) | 587 | 586 |
| `a=candidate` lines | 1 | 1 |
| Trimmed JSON (fingerprint, ufrag, pwd, setup, candidate) | 299 | 298 |
| Compact text `fp-hex|ufrag|pwd|role|candidate` | 222 | 222 |
| Compact text as base64url | 296 | 296 |
| Raw deflate of full SDP, bytes | 426 | 430 |
| Raw deflate of compact text, bytes | 183 | 190 |

The compact text holds these fields. The fingerprint has 64 hex characters without colons. The ufrag has 4 characters and the pwd has 24. Then come the role letter and the full candidate line.

Candidate line in both SDPs: a host candidate with an mDNS name, for example `<uuid>.local 53988 typ host generation 0 network-cost 999`. Chrome hid the local IP address behind a random `.local` name. The headless run had no camera permission. Chrome documentation on this was not found: the WebRTC page I opened says nothing about mDNS or camera permission. So "Chrome shows real addresses when the page has camera permission" stays UNVERIFIED.

### 4.3 What the receiver needs

The receiver rebuilds the SDP from fixed lines that Chrome writes (`v=0`, `m=application ... webrtc-datachannel`, `a=sctp-port:5000`, `a=max-message-size:262144`, `a=mid:0`, `a=group:BUNDLE 0`). The variable fields are the fingerprint, ufrag, pwd, setup role, and the candidates. The offer has `a=setup:actpass`. The answer has `a=setup:active`. So the role needs no field: it follows from the message type.

A binary design (DERIVED):
- fingerprint 32 bytes, ufrag 4, pwd 24, mDNS uuid 16, port 2, one-time secret 16.
- Total 94 bytes. As base64url: 126 characters.
- Each extra candidate (for example IPv6) costs about 20 bytes if encoded as address and port. In text form it costs about 130 characters.

The receiver must check each field against a strict pattern before it builds the SDP (section 5).

### 4.4 QR capacity

Source: I computed byte-mode capacity from the error-correction tables in the Nayuki code (`ECC_CODEWORDS_PER_BLOCK` and `NUM_ERROR_CORRECTION_BLOCKS`, read in `nayuki-qr-code-generator/index.js`). Formula: data codewords minus mode and count bits. Values for version 10 match the standard table that I know (271 at L). The Wikipedia page gave only version 40 (2,953 bytes at L), and the module formula 17 + 4 x version. Byte-mode capacity in bytes:

| Version | Modules | L | M | Q | H |
|---|---|---|---|---|---|
| 6 | 41 | 134 | 106 | 74 | 58 |
| 7 | 45 | 154 | 122 | 86 | 64 |
| 8 | 49 | 192 | 152 | 108 | 84 |
| 9 | 53 | 230 | 180 | 130 | 98 |
| 10 | 57 | 271 | 213 | 151 | 119 |
| 11 | 61 | 321 | 251 | 177 | 137 |
| 12 | 65 | 367 | 287 | 203 | 155 |
| 15 | 77 | 520 | 412 | 292 | 220 |

### 4.5 Fit

| Payload | Size | Smallest fit |
|---|---|---|
| Full SDP | 587 bytes | More than 520, so version 16 or higher. Do not use. |
| Trimmed JSON | 299 bytes | Version 12 at M (287 is too small), version 13 at M (331) |
| Compact text plus secret (222 + 22 characters) | 244 | Version 10 at L (271), version 11 at M (251) |
| Binary design as base64url | 126 | Version 8 at M (152), version 7 at L (154) |

Result: ONE QR code is enough, if the payload is the compact text or the binary design. The target is version 8 at level M (49 x 49 modules).

Can a phone scan it from a laptop screen? I found no source with a safe version limit. It is UNVERIFIED. My judgment (INFERRED): a code of 49 to 61 modules scans easily from a laptop at normal distance. Version 15 and above (77 modules) is risky on a low-end phone like the Redmi A3. Keep the version at or below 11 and show the code large (at least 300 CSS pixels) with a white border of 4 modules. A real-phone test decides.

If a payload does not fit, in order of preference:
1. Drop all but one candidate. A data channel needs only one working candidate.
2. Use the binary design with base64url.
3. Use `CompressionStream('deflate-raw')`. The saving is small for such short data (183 of 222 bytes), and the stream is asynchronous. Not worth it.
4. Split into 2 or 3 codes. This adds a scan loop and more states. Last resort.

Caveats:
- Host candidates with `.local` names work only if mDNS works between the two devices. A phone and a laptop on one Wi-Fi often do this. Router client isolation and WSL2 networking break it (`webrtc-pairing.md` section 4). The pairing must show a clear "no connection" state after the timeout.
- The measure used one machine and one interface. A real laptop can give more candidates (UNVERIFIED). The compact format must accept a list and cap it.
- The measured data come from a Chrome 158 headless run. The phone browser can write other values. Repeat the measure on the phone.

## 5. Security rules

Method: OWASP Top 10:2025 and ASVS 5.0, as the `owasp-security` skill lists them. Used items: A05 injection, A06 insecure design, A08 integrity, A10 exceptional conditions. ASVS 2.2.1 and 2.2.2 need an allowlist for input. ASVS 1.3.2 bans `eval`. Each threat below is reachable: the QR text and the data channel are real attacker-controlled inputs.

| Threat | Path | Effect | Control |
|---|---|---|---|
| Someone photographs or scans the code | Camera or photo of the laptop screen | The person can connect as the phone | One-time secret, short timeout, show the code only while pairing, one peer only |
| Replay of an old code | Reuse of an old offer or answer | A stale or hostile peer connects | New secret and new peer connection for each pairing, expiry of 120 s, delete after use |
| Huge or malformed text | A QR code of version 40 holds up to 2,953 bytes | Memory use, parser errors, SDP injection | Limit of 600 characters before any parse. Strict pattern for each field. Reject all else. |
| Code holds a URL or HTML | A decoder returns any text | Link open, script run | Never open, navigate to or render the text. It is data for the parser only. |
| SDP injection | Line breaks in a field add `a=` lines | Extra candidates, a changed fingerprint | Rebuild the SDP from checked fields only. Never paste received text into an SDP. |
| Stranger on the data channel | A peer that has the offer, but no secret | Fake landmark data in the session | Secret check before the channel counts as paired. Schema check of each message. Close on the first bad message. |
| Flood of messages | Large or fast messages | Frozen page | Size cap and rate cap, close on breach |
| Decoder library fault | A crafted image or frame | Crash or wrong text | Pinned versions, text-only output, a try and catch around decode, fail closed |

Minimum rules for T12b (all MUST):
1. The offer holds a random secret of at least 128 bits from `crypto.getRandomValues`. The answer must echo it. The laptop compares it in constant time or at least with plain equality, and closes the connection on a mismatch. ASVS 7.2.3 sets 128 bits for session tokens (from the skill list).
2. The phone sends the echo as the first message on the data channel. Before that message, the laptop ignores all data.
3. A timeout of 120 s from the display of the offer. After it, the laptop closes the peer connection and clears the secret. A second timeout of 15 s applies from the answer scan to an open channel.
4. Each secret works once. A second answer for the same offer is ignored.
5. Maximum size of 600 characters for the scanned text. Reject longer text before any parse. Maximum size of 4,096 bytes for each data channel message. The negotiated `max-message-size` is 262,144 in the SDP, so the app must set its own lower cap.
6. Use a Zod schema for the scanned text. Its fields are version, type, secret, fingerprint, ufrag, pwd and candidates. Each field has an exact pattern. The fingerprint is 64 hex characters. The ufrag and pwd use the ICE character set. A candidate matches one strict pattern, and the cap is 3 candidates. Zod 4.6.7 is already a dependency. Use `.strict()` so unknown keys fail.
7. Zod schema for every data channel message (landmark frame: a fixed count of points, numbers with a range, a sequence number, a message type). Use `safeParse`. Never `JSON.parse` without a size check and a schema. Drop and count bad messages. Close the channel after a set number.
8. Build the SDP from checked fields only. Never concatenate raw text.
9. No `eval`, no `new Function`, no `innerHTML`, no `dangerouslySetInnerHTML`, no navigation to scanned text. Render any scanned value as plain text, or not at all.
10. `iceServers: []`. No STUN, no TURN. No fetch to any other address (the CSP `connect-src 'self'` already blocks it).
11. The data channel carries landmark numbers only. No frame, no image, no video track. This matches the camera rules of `mpfl-clinical-guardrails`.
12. Show the pairing state in plain words: "waiting for the phone", "paired", "pairing timed out, try again". No verdict colour.
13. Log nothing that holds the secret or the SDP. Clear the secret from memory on end.

Limits: the secret does not stop someone who photographs the code AND answers before the real phone. The timeout and the single use reduce this. The code is on the patient screen in a private room, so the risk is low (INFERRED). A DTLS fingerprint in the offer binds the connection to the offer. The answer carries its own fingerprint, which the laptop checks against the connection (the browser does this itself).

## 6. Recommendation for T12b

Libraries (ask the user to confirm two small libraries, see section 1):
- Encoder: `uqr` 0.1.3, SVG output, level M. Pin the exact version.
- Decoder: `qr-scanner` 1.4.2, one `QrScanner` instance, `returnDetailedScanResult: true`.

Encoding:
- Binary design (94 bytes) as base64url, or the compact text of section 4.2 as the first version. Choose the compact text first, because it is easy to debug (244 characters, version 11 at M). Move to the binary design if the real-phone scan is weak.
- A leading version character, for example `1`, so the format can change.
- The phone page URL is separate. The phone scans the first QR code with its camera app. The URL holds the offer in the fragment (`#`), because a fragment does not go to the host server. The URL length adds about 50 characters to the first QR code. The phone page then needs no QR decoder for the first step. This is a design choice that needs the user to confirm the hosted address.

Build order:
1. Pure functions with unit tests (Vitest): `encodeOffer`, `decodeOffer`, `buildSdp`, with the Zod schemas and the size limits. Test with the measured SDP from this file.
2. Pairing state machine with timeouts and the secret echo, tested without a browser.
3. Two peers in one page (the same trick as the measure script), with a data channel and a landmark message schema. Test that a wrong secret closes the channel.
4. QR display (SVG) and the scan view, behind a button press and with all tracks stopped on exit.
5. Real phone test: scan distance, light, mDNS on the real Wi-Fi, time to connect.

Playwright tests:
- Chromium flags `--use-fake-device-for-media-stream` and `--use-fake-ui-for-media-stream` give a fake camera. This is a known Chromium option (UNVERIFIED here, I did not open a source). The fake camera shows a test pattern, not a QR code.
- To test the scan, use `--use-file-for-fake-video-capture=<file>` with a QR frame as a video file (UNVERIFIED, needs Y4M or MJPEG). An easier test feeds a QR image into `QrScanner.scanImage` as a unit test.
- To test the pairing: two browser contexts in one Playwright test. Context A shows the code and the test reads the text from a test hook. Context B takes it as input and returns the answer. Do not put a test hook in the production build.
- Test these cases: right secret, wrong secret, expired offer, replay of the same answer.
- Test also: text longer than 600 characters, a candidate with a line break, and a message with a bad schema.
- Test also: a scan of a URL code. The app must not navigate.
- Check that `getUserMedia` tracks end after the scan view closes (`track.readyState === 'ended'`), after `visibilitychange`, and after an error.
- Check the CSP: no console violation for the worker (`blob:` worker) and for the SVG.
- Check that `claims-check.sh app/src` stays clean.

## 7. Items not verified

- MDN browser compatibility table for `BarcodeDetector`: the page text had no data. Desktop Chrome and Edge on Windows: UNVERIFIED. The Chrome page names only macOS, ChromeOS and Android.
- Chrome behaviour of mDNS names and camera permission: no official source opened. UNVERIFIED.
- Real phone scan limits (version, size, light) and the real-phone connection over mDNS: not tested. The Redmi A3 was not available.
- `qr-scanner` behaviour inside the Vite build (worker file path) and the CSP in a real browser: read from code only, not run.
- `qr-scanner` health: last publish 2022-11-23, 109 open issues (as the repository page showed). Its fit with future Chrome versions is unknown.
- `uqr` is version 0.1.3. Its API can change before 1.0. Not checked against its tests.
- `qrcode` SVG support and `qrcode-svg` quality: not opened.
- The measure ran once on Chrome 158 headless on Linux. Android Chrome SDP can differ (extra candidates, other attributes).
- Playwright fake-camera flags: not checked in an official source.
- ASVS and OWASP items come from the `owasp-security` skill text, not from the standards themselves.
- The effect of exact limits (600 characters, 4,096 bytes, 120 s, 15 s, 3 candidates) is a PROPOSAL. No source sets them.
- The fragment-in-URL design in section 6 was not tested. It needs the hosted address.
- Whether the user accepts two libraries instead of one: needs the user.
