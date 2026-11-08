# MPFL rehabilitation app (prototype)

This app is a prototype. It counts reps and estimates knee angle from a webcam, on the device, for a protocol that a clinician sets. It is NOT a medical device and it is NOT for patient use. No video leaves the device, and the app stores no video.

## Status

The plan has the full task list: [MPFL_APP_PLAN.md](MPFL_APP_PLAN.md) section 6. This table shows what code exists.

| Area | Status |
|---|---|
| Angle, filter, counters, margin rule, cues | Built, with unit tests |
| Protocol file, red flags, pause floor | Built, with unit tests |
| Local storage, JSON and CSV export, erase | Built, with unit tests |
| Camera and pose wrapper (self-hosted model) | Built, with browser tests |
| Screens: privacy, load protocol, home, red-flag check, setup, session, summary | Built |
| Camera setup rules, position guide | Planned (T10b) |
| Dashboards, data screen, clinician view | Planned (T11). Pure data code for the dashboard and the review summary exists |
| Second device view | Planned (T9c, T12b) |
| Accuracy and speed record | Planned (T13) |
| Security review | Planned (T14) |
| Test on real video | Not done. No consented clip exists (T7) |

## Install, run, build and test

Run all commands in the `app` folder.

| Task | Command |
|---|---|
| Install | `npm install` |
| Run the dev server | `npm run dev` |
| Build | `npm run build` |
| Preview the build | `npm run preview` |
| Type check | `npm run typecheck` |
| Lint | `npm run lint` |
| Unit tests | `npm test` |
| Browser tests | `npm run e2e` |
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

## Folder map

| Folder | Content |
|---|---|
| `app/src/lib` | Pure logic: angle, filter, counters, margin, cues, red flags, storage, protocol |
| `app/src/pose` | Camera access, pose model wrapper, frame loop, landmark source |
| `app/src/ui` | Screens and navigation state |
| `app/tests` | Unit tests and fixtures |
| `app/e2e` | Browser tests (Playwright) |
| `app/scripts` | The check scripts above, and the Bland-Altman tools |
| `app/public` | Self-hosted model and WASM files, and the header file |
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
- [Architecture](docs/architecture.md): design and module map.
- [Model files](docs/model.md): source, hashes and license text.
