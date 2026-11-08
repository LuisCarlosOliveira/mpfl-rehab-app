# MPFL rehabilitation app (prototype)

This app is a prototype. It counts reps and estimates knee angle from a webcam, on the device, for a protocol that a clinician sets. It is NOT a medical device and it is NOT for patient use. No video leaves the device, and the app stores no video.

## Status

The plan has the full task list: [MPFL_APP_PLAN.md](MPFL_APP_PLAN.md) section 6. The table shows what code exists on 2026-11-08. The counts come from the Result lines of the plan and were not re-run for this file. The unit suite has 1,392 tests in 67 files. The browser suite has 99 tests in the main project and 18 in the pairing projects.

| Area | Status |
|---|---|
| Angle, filter, counters, margin rule, cues | Built, with unit tests |
| Protocol file, red flags, pause floor | Built, with unit tests |
| Local storage, JSON and CSV export, import, erase | Built, with unit tests and browser tests |
| Camera and pose wrapper (self-hosted model) | Built, with browser tests. The fake camera shows no person |
| Screens: privacy, load protocol, home, red-flag check, setup, session, summary | Built, with unit tests and browser tests |
| Camera setup rules, position guide, guide figures | Built and wired into the Setup screen |
| Sound cues with a mute button | Built, with browser tests |
| Dashboard, data screen, clinician view, review summary | Built, with unit tests and browser tests |
| Second view (pairing): QR codes, WebRTC link, phone screen, laptop screen | Built and tested in a browser. NOT wired into the screens yet. A later step wires it |
| Rep pairing and front-view change value (`views.ts`) | Built, with unit tests. No screen uses it yet |
| Accuracy record | Tooling built. `docs/accuracy.md` holds no measured number |
| Security review | Written ([docs/security-review.md](docs/security-review.md)). The fixes are in the audit list ([docs/audit-2.md](docs/audit-2.md)) |
| Test on real video | Not done. No consented clip exists |

## What is NOT done

- WebKit and iOS Safari: the browser tests run on Chromium only.
- Lighthouse: no run exists. The plan asks for an accessibility score of 95 or more.
- Real-device accuracy: no goniometer data exists, and no frame-rate run exists on the Redmi A3. The margin of 9 degrees is a start value and it is UNVERIFIED for the `lite` model.
- Clinician review: no clinician reviewed any protocol value, cue text, red-flag item or the pause floor.
- Patient release: the flag `PATIENT_USE_APPROVED` is off. The regulatory class and the model license need an expert decision.
- Real pose on video: the browser tests use a fake camera with no person, so rep counting runs on synthetic landmarks only.

## Install, run, build and test

Run all commands in the `app` folder. The file `app/.npmrc` sets `ignore-scripts=true`, so no package runs an install script. This is condition C1 of [docs/dependency-vetting.md](docs/dependency-vetting.md). The browsers for Playwright come from `npx playwright install chromium`, which is a separate step.

| Task | Command |
|---|---|
| Install | `npm ci` |
| Run the dev server | `npm run dev` |
| Build | `npm run build` |
| Preview the build | `npm run preview` |
| Type check | `npm run typecheck` |
| Lint | `npm run lint` |
| Unit tests | `npm test` |
| Browser tests | `npm run e2e` |
| Pairing browser tests | `PAIR_OUT=<folder> npx playwright test -c e2e/pairing/playwright.config.ts --workers=1` |
| All local checks | `npm run precheck` |

## Checks in `npm run precheck`

- `npm run typecheck`: the TypeScript compiler finds no type error.
- `npm run lint`: ESLint finds no error in `src` and `tests`.
- `npm test`: all unit tests run.
- `scripts/model-hash-check.sh`: the model and WASM files match `public/models/SHA256SUMS`.
- `scripts/deps-check.sh`: each dependency is in `scripts/allowed-deps.txt` and has an exact version.
- `scripts/claims-check.sh`: the code has no banned claim, no banned video API and no verdict word in patient text.
- `scripts/phase-check.sh`: only `src/lib/protocol/` can write the active phase (FR4).
- `scripts/plan-skills-check.sh`: each finished task in the plan records the skills that it used.

## Dependencies

Runtime: `react`, `react-dom`, `zod`, `dexie`, `recharts`, `@mediapipe/tasks-vision`, `uqr` and `jsqr`. The package `uqr` draws a QR code. The package `jsqr` reads a QR code from a camera frame in memory. Each package is vetted in [docs/dependency-vetting.md](docs/dependency-vetting.md).

## Folder map

| Folder | Content |
|---|---|
| `app/src/lib` | Pure logic: angle, filter, counters, margin, cues, exercises, red flags, safety floor, setup rules, guides, figure geometry, progress, review summary, views, flow, mode |
| `app/src/lib/protocol` | Schema, loader, read-only store, example protocol |
| `app/src/lib/storage` | Database, export and import, small local values |
| `app/src/lib/pairing` | Pure pairing core: payload, messages, secrets, state machine |
| `app/src/pose` | Camera access, pose model wrapper, frame loop, landmark sources |
| `app/src/pairing` | Pairing in the browser: QR draw and read, WebRTC link, frame messages, hook |
| `app/src/ui` | Screens, navigation state, sound, styles |
| `app/tests` | Unit tests and fixtures |
| `app/e2e` | Browser tests (Playwright). `e2e/pairing` has its own config |
| `app/scripts` | The check scripts above, and the Bland-Altman tools |
| `app/public` | Self-hosted model and WASM files, the header file and the third-party notices |
| `docs` | Project documents |
| `research` | Knowledge base. Start with [research/INDEX.md](research/INDEX.md) |
| `.claude` | Project skills and the knowledge agent |
| `skill-workspaces` | Test records of the two project skills |

## The flag `PATIENT_USE_APPROVED`

The build variable is `VITE_PATIENT_USE_APPROVED`. Only the exact text `true` turns on patient mode (`app/src/lib/mode.ts`).

Without the flag, the app is in demo mode. Each screen shows "Prototype. Not for patient use." The example protocol can load, with the banner "EXAMPLE, NOT APPROVED". With the flag, the app refuses the example and a protocol with no `approvedOn`.

Nobody can set the flag as part of this work. It needs a clinician review and an expert decision on the regulatory class ([plan section 1.5](MPFL_APP_PLAN.md)).

## Documents

- [Plan](MPFL_APP_PLAN.md): requirements, tasks, open items.
- [Knowledge base index](research/INDEX.md): the evidence and its marks.
- [Clinical limits](docs/clinical-limits.md): what the app does not do.
- [Architecture](docs/architecture.md): design, data flow and module map.
- [Accuracy record](docs/accuracy.md): angle error and frame rate. It holds no measured number.
- [Audit 2](docs/audit-2.md): the second audit and its fix list.
- [Security review](docs/security-review.md): the findings of T14.
- [Pairing wiring](docs/pairing-wiring.md): the steps that connect the second view to the screens.
- [Dependency vetting](docs/dependency-vetting.md) and [UI package vetting](docs/dependency-vetting-ui.md): the safety checks of packages.
- [Model files](docs/model.md): source, hashes and license text.
