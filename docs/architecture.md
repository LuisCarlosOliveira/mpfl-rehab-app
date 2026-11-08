# Architecture

The app is a static single-page app. All code runs in the browser. The video stays in the browser: the app reads landmark numbers from each frame and keeps no frame. The app has no backend and no account. The clinician view is planned to read an exported file. Full detail is in [MPFL_APP_PLAN.md](../MPFL_APP_PLAN.md) section 3.

## Data flow

```
camera -> pose model -> landmarks -> visibility gate -> knee angle
  -> One Euro filter -> counter -> session record
  -> storage (IndexedDB) -> export (JSON, CSV)
```

The protocol file goes through a schema check into a read-only store. The screens read it from there.

## Module map

| File | Content |
|---|---|
| `app/src/lib/angle.ts` | Knee angle and flexion from three landmarks |
| `app/src/lib/oneEuro.ts` | One Euro filter |
| `app/src/lib/counters.ts` | Rep, hold and top-angle counters |
| `app/src/lib/margin.ts` | Margin constant, and the comparison against a limit |
| `app/src/lib/cues.ts` | Fixed cue texts |
| `app/src/lib/exercises.ts` | Exercise definitions and the landmark-to-counter pipeline |
| `app/src/lib/redflags.ts` | Red-flag list as data |
| `app/src/lib/safety.ts` | The pause floor of FR12 |
| `app/src/lib/mode.ts` | Demo or patient mode, and the banners |
| `app/src/lib/flow.ts` | Screen list and first screen |
| `app/src/lib/progress.ts` | Dashboard series and table rows |
| `app/src/lib/reviewSummary.ts` | Clinician review summary data |
| `app/src/lib/protocol/` | Schema, loader, read-only store, example protocol |
| `app/src/lib/storage/` | Database, export and import, small local values |
| `app/src/pose/camera.ts` | Camera access and stop rules |
| `app/src/pose/landmarker.ts` | Pose model wrapper |
| `app/src/pose/loop.ts` | Frame loop |
| `app/src/pose/source.ts` | Landmark source interface |
| `app/src/ui/appState.ts` | Navigation state (pure reducer) |
| `app/src/ui/askSurgeon.ts` | Decisions that the protocol does not set |
| `app/src/ui/labels.ts` | Exercise names |
| `app/src/ui/App.tsx` | App shell |
| `app/src/ui/Banners.tsx` | Banners |
| `app/src/ui/Home.tsx` | Home screen |
| `app/src/ui/LoadProtocol.tsx` | Load protocol screen |
| `app/src/ui/Privacy.tsx` | Privacy notice |
| `app/src/ui/RedFlag.tsx` | Red-flag check |
| `app/src/ui/Setup.tsx` | Camera setup screen |
| `app/src/ui/Session.tsx` | Session screen |
| `app/src/ui/Summary.tsx` | Pain, swelling and save |

`app/src/main.tsx` starts the app.

## Main decisions

| Decision | Source |
|---|---|
| Local-first, no backend | [Plan 1.4](../MPFL_APP_PLAN.md) |
| Margin rule for limits | [Plan FR8](../MPFL_APP_PLAN.md), [research/form-opus.md section 4.3](../research/form-opus.md) |
| The protocol is a file that a clinician sets | [Plan 1.5](../MPFL_APP_PLAN.md), FR1 and FR2 |
| The clinician view reads an exported file (planned) | [Plan 1.4](../MPFL_APP_PLAN.md), FR15 |
| No video stored or sent | [Plan FR6](../MPFL_APP_PLAN.md), NFR9 |
