# Design: Today's session

Date: 2026-11-18. Branch: feat-session-flow.
Source: a real test in Edge. The user wrote that the UX is terrible because of the many clicks. After an exercise the app must open the next one. The plan session needs a progress bar.

## Problem

The monitor log of the real run (`mpfl-mon/run1/monitor.log`) shows six exercises. Each exercise used the same screens:
Home, Check before you exercise, Get ready (or Set up the camera), the exercise, Summary, Home.
That is 6 screens for each exercise and 36 screens for six exercises. About 9 clicks for each exercise with a camera.

## Decisions

1. Home gets one main button: "Start today's session". It runs the exercises of the active phase in plan order. The single Start buttons stay as a second path. They use the secondary button style.
2. The red-flag check runs once for the plan session. The check returns if the person leaves the session (Stop session or Home). The screen, the texts, the block rule and the "Knee gave way or hurts" button are the same as before. The check is never removed.
3. The leg and the camera side are stored in the local settings (`mpfl.leg`, `mpfl.cameraSide`). Only the words left or right are stored. The app never stores a frame or a video.
4. The guide steps show in full the first time that a person starts an exercise (`mpfl.guideSeen`, a list of exercise names). After that, one compact "Get ready" card shows the leg and the camera side. It has the links "Show the steps" and "Change leg or camera side".
5. The camera stays on between two exercises that both use the camera. Session does not stop the source at the end of the exercise when the next one uses the camera. Setup starts the same source again, so the stream and the pose model stay loaded. The shell stops the camera on every other screen.
6. After an exercise ends, the Summary screen is the "Done" step. Pain and swelling stay optional. One button saves and continues. Another button skips the questions and continues.
7. Then the "Next: name" card opens. It waits 5 seconds. It has Start now, Skip and Stop session. The card never starts a movement. It opens the Get ready screen. The person presses Start there. A key press or a pointer press on the card stops the 5 seconds, so the person has time to read.
8. The plan progress shows on Get ready, Session, Done and Next. It uses the existing segmented track (StepTrack), a native list with one mark for each exercise. It also shows text: "Exercise 3 of 6". It shows the sets of the exercise. It is a position mark, not a score. It uses no verdict colour.
9. At the end, one "Today's session" summary lists each exercise with its measured numbers. It reuses the number block of Summary (RunStats). A skipped exercise says "Skipped".
10. Each exercise still saves its own session row at the end of the run, as before. Your sessions, Check my progress and the export read the same rows.

## Safety rules that stay

- The phase never changes. The plan list comes from the active phase only.
- "Knee gave way or hurts" ends the whole session after the Done step. The next exercise does not open.
- If pain or swelling answers start the pause rule (FR12), the session stops. The Done step shows the message and the only next step is "End session".
- Skip and Stop session on the Next card save nothing for the skipped exercise.
- In-range reps show nothing and play no sound. The new screens show no verdict word and no score.
- The camera asks for permission only after a button press. If the stream is already on, Setup reuses it. If it is off, the person presses "Start camera".

## State (appState.ts)

New field `plan`: `{ kinds, index, entries }` or null. `entries` holds the run of each finished exercise (or null if skipped).
New actions: `start-session`, `plan-continue` (from Done), `plan-skip`, `plan-stop`.
New screens: `next` and `overview`.
While `plan` is set, the cleared check stays on the screens setup, session, summary and next. It drops when the person goes anywhere else.
Leg and camera side stay in the state between exercises and come from the stored values at the start.

## Files

- `src/lib/sessionPlan.ts`: the list of kinds (pure) and the camera rule.
- `src/lib/storage/meta.ts`: leg, camera side and guide-seen helpers.
- `src/ui/PlanProgress.tsx`: the progress mark and the text.
- `src/ui/PlanSession.tsx` (lazy): the Next card and the session summary.
- `src/ui/Home.tsx`, `Setup.tsx`, `SetupGuide.tsx`, `Session.tsx`, `Summary.tsx`, `App.tsx`, `appState.ts`, `lib/flow.ts`.
- Tests: `tests/sessionPlan.test.ts`, `tests/planState.test.ts`, `tests/ui/planSession.test.tsx`, `e2e/session-flow.spec.ts`.

## Not in this change

- Another agent owns `CheckProgress.tsx`, `progressCheck.ts`, `Onboarding.tsx` and `lib/onboarding.ts`. They stay as they are.
- No new setting screen. No rest timer. No change of the exercise engine, the lock and probe logic or the timers.
- Camera exercises still start by the existing countdown after the check of the leg. The countdown is part of Setup and is not changed.
