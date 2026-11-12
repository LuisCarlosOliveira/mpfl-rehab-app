# Exercise monitoring: one definition for every exercise

Date: 2026-11-12. Decision of the user: "this is a physio app, should monitor all exercises" and "should monitor any suggested exercise correctly".
Source of the facts: a read-only specialist report of the same day. It reads the research files and the code. It opened no web page.

## Goal

The camera monitors every exercise that a plan can suggest, not five special cases. The app learns an exercise from ONE record (a definition). A new exercise needs a new record and a test, not new screens.

## Facts that decide the design

- Only the landmarks 23 to 28 (hip, knee, ankle) are used today (`angle.ts`). The heel (29, 30) and the foot index (31, 32) exist in MediaPipe Pose. The app does not read them yet. There is no kneecap landmark.
- Error budget (`research/form-evidence.md`): knee angle in the side view about 9 degrees at best (F1). In exercise video it is 9.3 to 21.9 degrees (F3). The frontal bias is about 19 degrees (F4). Frontal 2D is not valid (M2). Foot landmarks carry more error than the knee (technique S6). No study of the lite model exists.
- The sources name the five exercises and give one dose (P2 rec 26, strengthening only). They give no camera number for them. The repo has no technique wording for gluteal set, ankle pump, leg raise to the side and to the back.
- The leg raise counter uses ankle above hip (0.05), a settle time of 500 ms and an end time of 300 ms. It works on side-view clips 03 and 04 and fails on the oblique clip 08.

## The definition (ExerciseSpec)

One record for each exercise:

- `id`, `label`, `sourceIds[]`, `phases[]` (the phases where a plan can use it).
- `posture`: supine, side-lying, prone, seated or standing.
- `view`: the camera view it needs (side, front, behind, above), the camera side, and which legs (chosen, both, none).
- `measure`, one of:
  - `joint-angle` with a joint triplet (hip-knee-ankle, knee-ankle-footIndex).
  - `segment-angle` (from, to, against the vertical or the horizontal).
  - `distance` (two points, axis, normalised by a body length).
  - `none`.
- `report`: extra values for the Summary (peak, range, top angle).
- `mode`: `reps-peak`, `reps-cycle`, `lift`, `timed-hold` or `person-timer`.
- `thresholds[]`: name, value, and an origin that is `source:<id>`, `clinician:<field>` or `engineering`.
- `cues[]`: an event and the threshold it checks. A cue can check only a threshold whose origin is a source or a clinician field.
- `needs`: what the Setup rules must see (whole leg, knee to toe, upper body).
- `guide`: start position, hands and support, range, speed, what the camera must see, body map points.
- `summary`: which values the Summary shows (reps, holds, hold seconds, peak, top, range).

Rules that a test enforces: a cue never points at an engineering threshold. Every number shows its origin on the screen. Mode `person-timer` forces measure `none` or a report-only measure. No field holds a verdict word or a score.

## The nine cases

| Exercise | Posture and view | Measure | Mode | Thresholds and cues |
|---|---|---|---|---|
| heel-slide | supine, side | joint-angle hip-knee-ankle | reps-peak | target, max flexion, return (clinician); enter 0.8 x target and min state 300 ms (engineering); cues near-limit, over-limit, shallow, too-fast |
| mini-squat | standing, side | same | reps-peak | same |
| straight-leg-raise | supine, side | gate: ankle above hip (0.05); report: knee angle at the top | lift | settle 500 ms, end 300 ms (engineering); the top-angle limit is a clinician field and logs only |
| seated-extension-hold | seated, side | joint-angle knee | timed-hold | target plus margin 9, min flexion, hold seconds (clinician); cues near-limit, over-limit, hold-restart |
| quad-set | supine, side | none (optional knee angle report) | person-timer | hold seconds (clinician, optional); no cue |
| gluteal-set | supine | none, no view needed | person-timer | no cue |
| ankle-pump | supine, side | joint-angle knee-ankle-footIndex | reps-cycle | min amplitude and min state (engineering); no cue |
| leg-raise-side | side-lying or standing, front-on | segment-angle hip to ankle against the horizontal | lift | lift angle, settle, end (engineering); no cue |
| leg-raise-back | standing, side | segment-angle hip to knee against the vertical | lift | same; no cue |

The existing code fits this record with three new parts. They are the `person-timer` mode, the `segment-angle` measure and the `reps-cycle` mode. The landmark ids 29 to 32 are new too. The leg raise gate becomes a field of the record and not hard-coded.

## What the camera can really do for the five new exercises

- **Leg raise to the back** (standing, side view): partly good. Sagittal plane, the same setup as the mini squat. The count and the peak angle are credible. The values are not clinical.
- **Leg raise to the side** (front-on): partly. The count is credible, the angle is weak (frontal plane). It needs a front-facing setup and a new figure.
- **Ankle pump** (supine, side): partly, low value. It counts cycles by amplitude. The foot landmark is noisy. The frame must show knee to toe.
- **Quadriceps set and gluteal set**: the camera has NO signal for the effort. No joint moves. The app times the hold that the person starts and ends, and it says so: "The camera cannot see this effort. The app times your hold." It never shows an angle as proof of effort.

## Exercises that a plan can suggest (from the repo sources)

Only an exercise with a source name in a repo file can enter the registry.

- Phase 1: heel slide, wall slide, heel prop or prone hang, quad set, straight leg raise, 3-way leg raises.
- Phase 1, more: clamshell, bridge, gluteal set, ankle pump, weight shift, balance.
- Phase 2: cycling, mini squat, wall squat, sit to stand, chair squat, heel raises, step-ups, single-leg balance.
- Phase 2, more: the open-chain arc 90 to 40 (the seated hold). Leg press: not with one camera.
- Phase 3: squat, deadlift, lunge and split squat, step-down. Single-leg hop and landing: not with one camera (30 fps, 19 degree bias).
- Phase 4: cutting, pivot, agility, running: not with one camera. Valgus and knee-in cues: no build.

Each entry is monitored fully, partly (a count or a time, no clinical angle) or not at all. The plan screen says which for every row.

## An exercise with no definition

The app refuses it with a plain text: "This file names an exercise that the app does not know. Ask your care team to use an exercise from the list." The schema stays strict. A generic mode exists only as a registered `person-timer` entry with its own id and label. It shows the honest line "The camera cannot see this effort. The app times your hold."

## Plan screen lines after the change

The line "The app does not check these exercises" stays only for an exercise that has no definition. Each row gets one line:

- Leg raise to the back: "The camera counts your lifts and measures the angle. The app does not judge how you do it."
- Leg raise to the side: "The camera counts your lifts. It cannot measure the angle well."
- Ankle pump: "The camera counts your pumps. It does not check how far you move."
- Quadriceps set and gluteal set: "The camera cannot see this effort. The app times your hold."

## Decisions taken (the user said: no human-decision blockers)

1. Timer-only mode for the quadriceps set and the gluteal set: accepted. The camera has no signal, and the app says so.
2. A front-on camera setup for the leg raise to the side: accepted, with a new Setup rule and figure.
3. Validation clips: no licensed clip is verified. The new counters are tested on saved landmark series of the existing clips for the shared logic and on synthetic series for the new geometry. Clips of the user doing each exercise are the best test and are needed for the live proof.
4. Every engineering threshold is marked on the screen as the value of the app, not from a source. The hold time of a timed hold comes from the clinician field or from the person.

## Build plan (steps that can run in parallel without editing the same file)

- Step 0: the definition type and the registry. New files `lib/monitor/spec.ts` and `lib/monitor/registry.ts`. The four existing exercises are written as data. Behaviour does not change.
- Step A: protocol and generator. The five kinds move from home exercises to camera exercises with a Start button, and an old file with `homeExercises` still loads. Files: `lib/protocol/schema.ts`, `lib/protocolGen/*`, `lib/storage/db.ts`, `lib/planView.ts`, `lib/progress.ts`.
- Step B: the engine. New `lib/monitor/*.ts` (measure, phases, counters for person-timer, cycle and segment-lift), `lib/angle.ts` (landmark ids 29 to 32), `lib/exercises.ts`. The existing counts must not change (clip 03: 2, clip 04: 1, clip 05: 2, clip 02: 2 in the unit tests).
- Step C: guides and figures. `lib/guides.ts`, `lib/figure.ts`, `lib/technique.ts`. Every new line without a source is marked as the proposal of the app.
- Step D (after B and C): screens. Setup rules per definition, a timer screen (Start hold, End hold, seconds), Session.
- Step E (after A and B): Summary, Your sessions and the care team view show counts, whole degrees and "timed by you".
- Step F: tests, saved landmark fixtures and the clip analysis tool with an exercise id.
