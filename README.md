# MPFL rehabilitation app (prototype)

This app is a prototype. It counts reps and estimates knee angle from a webcam, on the device. It is NOT a medical device and it is NOT for patient use. No video leaves the device, and the app stores no video.

## Status

The plan has the full task list: [MPFL_APP_PLAN.md](MPFL_APP_PLAN.md) section 6. The status block of 2026-11-09 at the top of the plan is the reference. This table is a short copy of it.

The test counts come from the main session and were not re-run for this file. The unit suite (`npm run precheck`) has 2,815 tests in 140 files. The main browser suite has 154 tests and the WebKit project has 14. The pairing browser suite has 18 tests and passed three times in a row.

| Area | Status |
|---|---|
| Angle, filter, counters, margin rule, cues | Built, with unit tests. Checked on 8 public clips as a smoke test only |
| Protocol file, red flags, pause floor | Built, with unit tests and browser tests |
| Protocol generator: questions, plan, "Why this plan", referral, Confirm, "Update my plan" | Built. Confirm is the only path that saves a plan that the app made. No clinician reviewed it |
| Local storage, JSON and CSV export, import, erase | Built, with unit tests and browser tests. Live test round 1 passed the data checks |
| Camera and pose wrapper (self-hosted model) | Built, with browser tests and with real clips as the fake webcam |
| Camera setup rules, position guide, numbered guide, resting angle | Built. The resting angle can be captured in the Session screen when Setup gave none |
| Body map (leg lines over the camera picture) | Built in Setup only. Session waits for a frame-rate gate with no recorded result |
| Session: rest panel, hold meter, sets, sound cues, pain between sets | Built, with unit tests and browser tests |
| Dashboard, data screen, clinician view, review summary | Built, with unit tests and browser tests |
| Lazy screens and a load error screen | Built. The first load has 172.7 kB of gzip JavaScript, checked by `tests/ui/bundleSize.test.ts` |
| Second camera: QR codes, WebRTC link, phone screen, front-view record | Built and wired into Home and Setup. Tested in two Chromium browsers. NOT tested on a real phone |
| Accuracy record | Tooling built. `docs/accuracy.md` holds a clip smoke section and no goniometer number |
| Security review | Written ([docs/security-review.md](docs/security-review.md)). The fix list is in [docs/audit-2.md](docs/audit-2.md) |
| Live test | Round 1 done by four testers on commit b451206. Fixes are in later commits. The re-test is PENDING |

## What is NOT done

- The real phone: no run exists on the Redmi A3, on real Android Chrome or on the real tailnet. This is UNPROVEN.
- Wake Lock: no real Wake Lock request ran. Only headless Chromium ran it, and it rejected the request.
- Accuracy: no goniometer data exists. The margin of 9 degrees is a start value, UNVERIFIED for the `lite` model.
- Frame rate: this laptop has no GPU. The median is at the limit of 15 frames per second and it moves with machine load. No phone number exists.
- Clinician review: no clinician reviewed any protocol value, cue text, red-flag item, pause floor or generated plan.
- Regulatory class: not settled. [Plan section 1.5](MPFL_APP_PLAN.md) holds the draft. An expert must decide.
- Patient release: the flag `PATIENT_USE_APPROVED` is off.
- iOS Safari camera: UNVERIFIED. The WebKit tests stub the camera.
- Re-test of the fixes: PENDING. The report will be `docs/live-test/retest.md`.

## Install, run, build and test

Run all commands in the `app` folder. The file `app/.npmrc` sets `ignore-scripts=true`, so no package runs an install script. This is condition C1 of [docs/dependency-vetting.md](docs/dependency-vetting.md). Playwright needs its browsers: `npx playwright install chromium webkit`.

| Task | Command |
|---|---|
| Install | `npm ci` |
| Run the dev server | `npm run dev` |
| Build | `npm run build` |
| Preview the build | `npm run preview` |
| Type check | `npm run typecheck` |
| Lint | `npm run lint` |
| Unit tests | `npm test` |
| Browser tests (projects camera, denied, no-device, app and webkit) | `npm run e2e` |
| WebKit project alone | `npx playwright test --project=webkit` |
| Pairing browser tests (projects pairing and pairing-ip) | `npm run e2e:pairing` |
| All local checks | `npm run precheck` |

## Checks in `npm run precheck`

- `npm run typecheck`: the TypeScript compiler finds no type error.
- `npm run lint`: ESLint finds no error in `src` and `tests`.
- `npm test`: all unit tests run.
- `scripts/model-hash-check.sh`: the model and WASM files match `public/models/SHA256SUMS`.
- `scripts/deps-check.sh`: each dependency is in `scripts/allowed-deps.txt` and has an exact version.
- `scripts/claims-check.sh`: the code has no banned claim, no banned video API, no pixel read outside the QR reader and no frame drawing.
- `scripts/phase-check.sh`: only `src/lib/protocol/` can write the active phase (FR4).
- `scripts/plan-skills-check.sh`: each finished task in the plan records the skills that it used.

## Tests with real clips

Two tools run a video clip through the real app code. Both need `ffmpeg`. The details are in [docs/clip-analysis.md](docs/clip-analysis.md).

- `node scripts/analyze-clip.mjs <video> --leg right --exercise heel-slide` (Method A) reads the clip frame by frame and writes numbers only. Output goes to `app/.clip-out/`, which Git ignores.
- `bash scripts/clip-to-webcam.sh <clip>` (Method B) converts a clip to a file that Chromium plays as the fake webcam. The script prints the three launch arguments.

Privacy rule: a clip never enters the repository. Clips and outputs stay in the scratch folder or in `app/.clip-out/`. One clip is a smoke test and not a validation. The 8 clips of the tests are public Creative Commons clips. Their attribution is in `docs/accuracy.md`. The user accepted `yt-dlp` for private tests after a vetting ([docs/dependency-vetting-ytdlp.md](docs/dependency-vetting-ytdlp.md)).

## Second camera

A phone can send body points of the front view to the laptop. The phone runs the pose model and sends numbers only, over a WebRTC data channel with no server. The steps are in [docs/pairing-wiring.md](docs/pairing-wiring.md).

- Laptop: Setup has the optional step "Add a second camera (optional)". Home and the Load screen have the button "Use this phone as the second camera" for the phone.
- The phone needs a secure context for the camera. The Wake Lock also needs it. The phone screen tells the person when the screen can turn off.
- `TASKS.md` says that the real-phone test needs two Chrome flags. No document names them (PENDING). The pairing browser tests use `--disable-features=WebRtcHideLocalIpsWithMdns` on the PC browser, in tests only.
- The real phone test is UNPROVEN.

## Dependencies

Runtime: `react`, `react-dom`, `zod`, `dexie`, `recharts`, `@mediapipe/tasks-vision`, `uqr` and `jsqr`. The package `uqr` draws a QR code. The package `jsqr` reads a QR code from a camera frame in memory. Each package is vetted in [docs/dependency-vetting.md](docs/dependency-vetting.md).

## Folder map

| Folder | Content |
|---|---|
| `app/src/lib` | Pure logic: angle, filter, counters, margin, cues, exercises, sets, red flags, safety floor, setup rules, still rule, baseline, leg identity, guides, figure geometry, progress, review summary, views, plan view, onboarding, flow, mode |
| `app/src/lib/protocol` | Schema, loader, read-only store, `accept.ts` (the only save path of a generated plan), example protocol |
| `app/src/lib/protocolGen` | Pure generator: inputs, rules, sources table. It never saves |
| `app/src/lib/storage` | Database, export and import, small local values |
| `app/src/lib/pairing` | Pure pairing core: payload, messages, secrets, state machine |
| `app/src/pose` | Camera access, pose model wrapper, frame loop, landmark sources |
| `app/src/pairing` | Pairing in the browser: QR draw and read, WebRTC link, frame messages, hook |
| `app/src/ui` | Screens, body map, navigation state, sound, styles |
| `app/tests` | Unit tests and fixtures |
| `app/e2e` | Browser tests (Playwright). `e2e/pairing` has its own config |
| `app/scripts` | The check scripts, the clip tools and the Bland-Altman tools |
| `app/public` | Self-hosted model and WASM files, the header file and the third-party notices |
| `docs` | Project documents. `docs/live-test` holds the live test reports |
| `research` | Knowledge base. Start with [research/INDEX-v2.md](research/INDEX-v2.md) |
| `.claude` | Project skills and agents |
| `skill-workspaces` | Test records of the project skills |

## The flag `PATIENT_USE_APPROVED`

The build variable is `VITE_PATIENT_USE_APPROVED`. Only the exact text `true` turns on patient mode (`app/src/lib/mode.ts`).

Without the flag, the app is in demo mode. Each screen shows "Prototype. Not for patient use." The example protocol can load, with the banner "EXAMPLE, NOT APPROVED". With the flag, the app refuses the example, a protocol with no `approvedOn` and a plan that the app made without approval.

Nobody can set the flag as part of this work. It needs a clinician review and an expert decision on the regulatory class ([plan section 1.5](MPFL_APP_PLAN.md)). The field `approvedOn` is a claim in an unsigned file. The app cannot check it (open item L2-05).

## Documents

- [Plan](MPFL_APP_PLAN.md): requirements, tasks, open items.
- [Knowledge base index, version 2](research/INDEX-v2.md): the evidence and its marks. [Citation audit](research/citation-audit.md): the independent check of the quotes.
- [Clinical limits](docs/clinical-limits.md): what the app does not do and what a clinician must review.
- [Architecture](docs/architecture.md): design, data flow and module map.
- [Accuracy record](docs/accuracy.md): angle error, clip smoke results and frame rate.
- [Clip analysis](docs/clip-analysis.md): the two clip methods.
- [Lighthouse](docs/lighthouse.md): scores and the SEO decision.
- [Audit 2](docs/audit-2.md) and [Security review](docs/security-review.md): the audits and their fix lists.
- [Pairing wiring](docs/pairing-wiring.md): how the second camera is wired and its limits.
- Designs: [UI design](docs/ui-design.md), [UI ideas study](docs/ui-ideas.md), [leg choice and baseline](docs/leg-and-baseline-design.md), [protocol generator](docs/protocol-generator-design.md), [live form and adaptation](docs/adaptation-and-live-form-design.md) and the [reconciliation](docs/design-reconciliation.md) after the knowledge base audit.
- Live test round 1: [exercise flows](docs/live-test/exercise-flows.md), [workflows](docs/live-test/workflows.md), [pairing](docs/live-test/pairing.md) and [performance](docs/live-test/performance.md).
- [Dependency vetting](docs/dependency-vetting.md), [UI package vetting](docs/dependency-vetting-ui.md) and [yt-dlp vetting](docs/dependency-vetting-ytdlp.md): the safety checks.
- [Model files](docs/model.md): source, hashes and license text.
- [TASKS.md](TASKS.md): the verification campaign and its gates.
