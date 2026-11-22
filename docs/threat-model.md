# Threat model

Date: 2026-11-22. Scope: the app in `app/` on the commit of this branch. The method is STRIDE with the OWASP Top 10:2025 list. Each claim is marked VERIFIED (I read the code or the test) or INFERRED. The app is a prototype. It is not for patient use ([docs/clinical-limits.md](clinical-limits.md)). No threat below is tested on a real phone or a real network.

## 1. What the app protects

| Asset | Where it lives | Why it matters |
|---|---|---|
| Camera frames | Camera, then the pose worker, then dropped (VERIFIED: `src/pose/frameBridge.ts`) | A video of a person in a home. The app never stores or sends it. |
| Pose numbers (landmarks, angles) | Memory. Leg landmarks only cross the pairing link (`src/pairing/frameMessage.ts`) | They drive the rep counter and the cues. |
| Session records | IndexedDB `mpfl-rehab`, table `sessions` (`src/lib/storage/db.ts`) | Dates, angles, pain and swelling answers. This is health data. |
| Care-team plan file | IndexedDB, table `protocol` | It can hold the clinician name and surgery details. It sets the phase and the limits. |
| Pseudonym id | `localStorage`, key `mpfl.pseudoId` | It links every export of one browser. |
| Generator inputs | IndexedDB, table `generatorInputs` (`src/lib/storage/db.ts`) | Surgery date, operated side, procedure, age band, both knees, first surgery, special rules, surgeon limit and written plan answers. The JSON export holds them when the app made the plan. |
| Small settings | `localStorage`, keys `mpfl.lastExport` (date of the last export), `mpfl.persistAsked` (flag), `mpfl.privacySeen` (flag), `mpfl.contactDismissed` (session id), `mpfl.leg` (leg), `mpfl.cameraSide` (camera side), `mpfl.guideSeen` (list of exercise kinds) (`src/lib/storage/meta.ts`) | They hold no name and no video. `eraseAll` removes all keys that start with `mpfl.`. |

## 2. Trust boundaries

| Boundary | Trusted side | Untrusted side |
|---|---|---|
| Browser origin | The built app and its CSP | Any other page, any script that the CSP lets in |
| Worker | `src/pose/poseWorker.ts` gets a picture and returns numbers | The picture content |
| Storage | The app code | The person at the device, browser tools, other users of the profile |
| Plan file | The Zod schema in `src/lib/protocol/schema.ts` | The file content and its author |
| Export file | The schema in `src/lib/storage/export.ts` | Everything after it leaves the app (mail, cloud, USB) |
| Pairing link | The laptop and the phone that scan one code | The room, the LAN, a screen that a camera can see |

## 3. Threats

| # | Threat (STRIDE) | Where in the code | Existing control and proof | Residual | Open action |
|---|---|---|---|---|---|
| T1 | Tampered plan file: a patient or a third party sets a high phase or removes a limit (Tampering, Elevation) | `loader.ts` `loadProtocol`, `schema.ts` `activePhase`, `accept.ts` `acceptProposal`, `selfProgressionOn` | Strict Zod schema and 5 MB cap (VERIFIED: `tests/protocol.test.ts`, audit `hostile.mjs`). The app has no phase setter (VERIFIED: `tests/importGraph.test.ts`, `phase-check.sh`). A forward move needs a trusted click and the flag `VITE_SELF_PROGRESSION`, off by default (VERIFIED: `tests/protocolAccept.test.ts`). `approvedOn` is self-asserted and the file is unsigned (VERIFIED: `loader.ts`, docs/security-review.md S-13). | Medium | Sign the plan file, or have the clinician check a hash. Not planned. |
| T2 | A script on the page calls the save function (Tampering) | `db.ts` `saveSession`, `saveProtocol` | CSP has `script-src 'self'`, so no foreign script (VERIFIED: `e2e/app-csp.spec.ts`). The check for a forged click covers `acceptProposal` only (VERIFIED: `tests/protocolAccept.test.ts`). Code of the same origin can still call `saveProtocol` (VERIFIED: stated in docs/clinical-limits.md). | Low | None. An XSS flaw is the only path, and no path from file data to HTML exists (VERIFIED: docs/security-review.md check 3). |
| T3 | An export file with personal data leaves the device (Information disclosure) | `export.ts` `exportJson`, `exportCsv`, `textCell` | The file holds a pseudonym id, no name. The export screen warns the patient (INFERRED: plan FR14, screen not re-read). CSV cells are quoted against formulas (VERIFIED: `tests/storage.test.ts`). The app cannot control the file after export. | Medium | Ask the expert who is the data controller (plan section 11). |
| T4 | A stolen or shared device exposes the sessions and the plan (Information disclosure) | `db.ts` (Dexie), `meta.ts` | IndexedDB and `localStorage` are NOT encrypted. The Privacy screen says "The app does not encrypt it" (VERIFIED: `src/ui/Privacy.tsx`). `eraseAll` clears IndexedDB, `localStorage`, Cache storage and service workers (VERIFIED: `e2e/app-data.spec.ts`, `tests/storage.test.ts`). Only the device lock protects the data. A key stored in the same browser adds no protection, so only a passphrase can add value. | Medium | Consider an optional passphrase. |
| T5 | The pairing code or the SDP text leaks (Information disclosure, Spoofing) | `src/lib/pairing/security.ts`, `payload.ts`, `session.ts`, `src/pairing/rtcLink.ts` | The code holds a 128-bit one-time secret, the DTLS fingerprint and LAN addresses. It expires after 120 s. A second hello is refused. A wrong secret fails (VERIFIED: `tests/pairing/security.test.ts`, `session.test.ts`). No STUN and no relay: `iceServers: []` (VERIFIED: `rtcLink.ts`). A person who sees the screen in time can pair. The TTL is a PROPOSAL. | Low | Test on a real network (docs say UNPROVEN). |
| T6 | A malicious QR code (Tampering, DoS) | `payload.ts` `decodeOffer`, `decodeAnswer`, `extractFields`; `qrReader.ts` | 600-character cap before any parse. Fixed prefix. Strict schema. Only private IPv4 or mDNS hosts, at most 3 candidates (VERIFIED: `tests/pairing/payload.test.ts`). Messages over 4096 bytes are refused (VERIFIED: `messages.ts`). The SDP builder is hand-made and not checked against every browser (VERIFIED: comment in `payload.ts`). | Low | None. |
| T7 | A paired device sends false landmarks (Tampering) | `pairing.ts` `remoteSource`, `messages.ts` | Strict schema and range clamps on each message (VERIFIED: `tests/pairing/messages.test.ts`). The values themselves cannot be proven. A hostile paired device can show a wrong angle. It needs the one-time code first. | Low | None. |
| T8 | Supply chain: a bad runtime package (Tampering, A03) | `app/package.json`, `scripts/deps-check.sh` | Runtime packages: `@mediapipe/tasks-vision` 1.2.2, `dexie` 4.4.7, `jsqr` 1.4.0, `react` 19.3.1, `react-dom` 19.3.1, `recharts` 3.10.1, `uqr` 0.1.3, `zod` 4.6.7. `deps-check.sh` fails on a name outside `scripts/allowed-deps.txt` and on a version that is not exact (VERIFIED: read). Lock file with integrity hashes. `npm audit --omit=dev` found 0 findings. Signatures verified. No runtime install script (VERIFIED: docs/security-review.md check 1, dated 2026-11-08, not re-run). | Low | Re-run `npm audit --omit=dev` before a release. |
| T9 | The model and WASM come from a foreign origin, or the library reports usage (Information disclosure, A08) | `src/pose/landmarker.ts` `blockForeignFetch`, `MODEL_PATH`, `WASM_DIR`; `scripts/model-hash-check.sh` | Both load from the same origin, `/models` (VERIFIED: `tests/pose/landmarker.test.ts`). SHA-256 check in `precheck` (VERIFIED: `tests/pose/modelHash.test.ts`). MediaPipe sends usage metrics with `fetch` to `odml.pa.googleapis.com`. A guard rejects any foreign fetch, and `connect-src 'self'` blocks the rest (VERIFIED: `landmarker.ts`, `e2e/app-privacy-traffic.spec.ts`). The guard reads a `Request` and a `URL` object (VERIFIED: `landmarker.ts`, so the gap S-10 is fixed in code). No test drives a `Request` or a `URL` through the guard. The pose worker gets its CSP from its own response headers, because a meta tag does not reach a worker. See section 5 (Hosting). | Low | Add a test for `Request` and `URL` input. Serve the headers (Hosting). |
| T10 | A stale build or model from a cache (Tampering) | `public/_headers`; no `serviceWorker.register` in `src` | The app registers no service worker (VERIFIED: search of `src`). `index.html` is `no-cache`. Assets have hashed names. Models are cached 1 day with `must-revalidate`. A host that ignores `_headers` loses these rules (INFERRED: S-11). | Low | Check the headers on the real host (Hosting). |
| T11 | A clinician reads an estimate as a measurement (Repudiation, misuse) | `src/ui` charts and the dashboard text | Text says "webcam estimate" and "Camera error, estimated ... Not measured for this model" (VERIFIED: `src/ui`). No goniometer study exists. The margin is a start value, UNVERIFIED (VERIFIED: docs/clinical-limits.md). | Medium | Clinician review of the wording (CV register). |
| T12 | Unsupervised use of a prototype with no reviewed limits (Elevation, safety) | `src/lib/mode.ts`, `safety.ts`; register CV-01 to CV-57 in `docs/clinical-limits.md` | Demo mode is the default. A banner shows "Prototype. Not for patient use." (VERIFIED: `mode.ts`). Patient mode needs a build flag and `approvedOn` (VERIFIED: `loader.ts`). The register holds 57 rows, and the review columns are empty (VERIFIED: count of `CV-` rows). The pain floor 7 has no source. | High | Clinician review of all 57 rows before any patient use. |
| T13 | A frame is stored or sent now or after a later change (Information disclosure) | `camera.ts` (one `getUserMedia`, `audio: false`), `frameBridge.ts` | No store or send API in `src` (VERIFIED: `scripts/claims-check.sh`, a pattern match, so it cannot prove a negative). A browser test checks that a full live session sends nothing off-origin and stores no image (VERIFIED: `e2e/app-privacy-traffic.spec.ts`). | Low | None. |
| T14 | Hostile data from a file reaches the page (Tampering, XSS, A05) | `loader.ts`, `export.ts` `parseExport`, `zodConfig.ts` | Strict schemas, `__proto__` keys refused, no HTML sink in `src` (VERIFIED: docs/security-review.md check 3, `audit/sec/hostile.mjs`). Zod runs with `jitless`, so the CSP has no `eval` violation (VERIFIED: `tests/zodConfig.test.ts`). | Low | None. |
| T15 | An edited export file is imported (Tampering) | `export.ts` `importSessions` | The file is unsigned and can be edited (VERIFIED: docs/clinical-limits.md). Import checks the schema and refuses a different `pseudonymId` when sessions exist (VERIFIED: `export.ts` line 92). | Medium | None. A signed file is out of scope. |
| T16 | A hostile QR code makes the browser probe a private address (Denial of service, Information disclosure) | `payload.ts` candidate filter | The filter allows 10/8, 172.16/12, 192.168/16, 100.64/10 and 169.254/16 with any port from 1 to 65535, at most 3 candidates (VERIFIED: `payload.ts`). The browser can send STUN requests over UDP to these targets. The person must scan the code. The reply is not readable by the page. | Low | None. The limit is stated here. |
| T17 | The pairing secret does not bind the DTLS channel (Spoofing) | `rtcLink.ts`, `session.ts` | The answer code repeats the secret of the offer. The hello proves only that the phone saw the offer code. The DTLS fingerprints in the two codes give the real binding (VERIFIED: `rtcLink.ts`). A person who photographs the offer code can pair first only if that person also reaches the laptop camera or the text field. This needs physical presence. | Low | None. |

## 4. Top 5 open actions

1. Get a clinician review of the 57 values in the register CV-01 to CV-57 (T12, T11). This blocks any patient use.
2. Decide on an optional passphrase (T4). The Privacy screen already says that the data is not encrypted at rest. Done.
3. Decide how the clinician proves a plan file: a signature or a hash. Today `approvedOn` is self-asserted (T1).
4. Test the pairing link on a real phone and a real network, and review WebRTC (T5, T6, T7).
5. Check the real host: HTTPS, the response headers of section 5 (Hosting), and the S-14 item of `docs/security-review.md` (T9, T10).

## 5. Hosting

The host must send the response headers. A meta tag does not reach the pose worker, so the worker takes its CSP from its own response headers. A meta tag also cannot carry `frame-ancestors`. Use a host that reads the `_headers` file or lets you set response headers. Serve `app/public/_headers`, or set the same headers in the config of the host. Some hosts ignore `_headers`. On such a host the worker has no CSP.

These headers apply to every path:

- `Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'; worker-src 'self' blob:; media-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`
- `Permissions-Policy: camera=(self), microphone=()`
- `Referrer-Policy: no-referrer`
- `X-Content-Type-Options: nosniff`

The cache rules are in the same file. Serve the app over HTTPS only. The app has a fallback against framing (`src/lib/frameGuard.ts`). It hides the page when the app runs inside a frame. It does not replace the `frame-ancestors` header.

## 6. Limits of this document

- The static checks (`claims-check.sh`, `phase-check.sh`) are pattern matches. They cannot prove that no other path exists.
- I did not run any test or any browser. I read the code and the tests.
- The pairing, the phone frame rate and the clinical values stay UNPROVEN.
