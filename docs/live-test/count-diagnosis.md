# Diagnosis: no rep count for the straight leg raise

Date: 2026-11-09. HEAD 095debf. Read-only work. No source, test or script changed.
Skills loaded: anti-slop-code:anti-slop-code, simple-english:simple-english. The guardrail skill `.claude/skills/mpfl-clinical-guardrails/SKILL.md` was read.

## Cause

The straight leg raise has no automatic rep counter. This is a design fact, not a state that fails.

- `src/lib/exercises.ts:34`: `countsReps` is true for the heel slide and the mini squat only.
- `src/lib/exercises.ts:91-92`: `counterSetup` returns `{ ok: true, kind: 'lag' }` for the straight leg raise. This kind has no config.
- `src/lib/exercises.ts:204-225`: the step function calls `repsStep` only for `kind === 'reps'`. For `lag` it only reads the top angle while `isLegRaised` holds. It always returns `event: null`.
- `src/lib/counters.ts:218-235`: `lagStep` keeps the smallest flexion. It has no start, top or end state and no rep event.
- `src/lib/exercises.ts:242`: the summary gives `reps: null` for this kind.
- `docs/accuracy.md:134` and the plan FR9 say it on purpose: "The straight leg raise has no automatic rep count."
- The only way to raise the number is the button "Count this rep" (`src/ui/Session.tsx:160, 424, 693-697`). It calls `addRep('hand')`. The number on screen is `sets.repsInSet` (`Session.tsx:607`). It only moves by this button.
- The screen has no text that tells the person to tap the button. The detail line only says "The angle at the top shows after a lift." (`Session.tsx:618`). A person who lifts the leg and waits sees 0 reps. This is the likely cause of the report.

## Rules that do not cause the zero

These rules apply to heel slide and mini squat only. They are not used for the straight leg raise.

- Baseline: `needsCapture` needs `kind === 'reps'` (`Session.tsx:159`). No capture runs for the leg raise.
- Start margin and `enter`: `ENTER_FRACTION` 0.8 times `targetFlexion` (`exercises.ts:28, 57`). Not used.
- `returnWithinDeg` and `targetFlexion`: the schema refuses `returnWithinDeg` for the leg raise (`src/lib/protocol/schema.ts:63-66`). The generated leg raise has neither value (`src/lib/protocolGen/generate.ts:113-118`). The example protocol has neither (`example-protocol.json:22-27`). So generated and example behave the same.
- The 30 degree rule (`src/lib/cues.ts:109-117`): it only hides a stored value in the Summary and the care team view. It does not touch counting.
- Sets logic: `startSets` with 2 sets of 10 works. It only counts reps that the button adds.
- Leg choice, confidence: they can pause the angle (`MIN_VISIBILITY` in `angle.ts`). They cannot block a hand count.

## Offline reproduction

Method: a temporary vitest file in the scratchpad (`/tmp/claude-1000/-home-luis-projects/c0df9405-b52e-4b2f-b357-194865342f04/scratchpad/d/repro.test.ts`). It runs the real `createPipeline` on the saved landmark fixtures `tests/fixtures/clipSeries.ts` (first 18 s of clips 03 and 04, both legs). The baseline is 10 degrees. The clip 08 fixture does not exist, so clip 08 was not run.

| Clip, leg | Example SLR (3 x 10) | Generated SLR (2 x 10) | Generated heel slide (target 18, return 9) |
|---|---|---|---|
| 03 left | reps null, events only paused | same | 3 reps |
| 03 right | reps null, top 1.7 | same | 1 rep |
| 04 left | reps null, top 4.8 | same | 2 reps |
| 04 right | reps null | same | 0 reps |

The example and the generated leg raise give the same result in every run: `reps` is always null and no event fires. The only difference between the two protocols is the dose (sets and reps). The heel slide counter does fire on the same traces. So the zero comes from the missing counter and not from a plan value.
Side note: the peak flexion is 41, 85 and 155 degrees on these clips for a leg that stays near straight. This confirms the camera misreads of clips 03 and 04. The top angle used for the leg raise stays small (1.7 and 4.8), because it takes the smallest value while the leg is raised.

## Smallest honest fix

Option A (no new number, smallest): tell the person what to do. Add one neutral line near the Reps readout for the leg raise, for example "The camera does not count leg raises. Press Count this rep after each lift." This is a screen text and needs the check `bash app/scripts/claims-check.sh app/src` and a test. It gives no verdict word and no clinical value.

Option B (automatic count, needs numbers): a lift counter that starts when `isLegRaised` becomes true after `RAISE_SETTLE_MS` and ends when it becomes false. It needs no clinician value. The existing constants `RAISE_MIN_HEIGHT` 0.05 and `RAISE_SETTLE_MS` 500 are already marked PROPOSAL, no source. Any new value, for example a minimum lift time, must carry the tag ENGINEERING (tuned on real video, not clinical) with the reason. No new clinical value is needed. A rep count from the image height of ankle and hip does not depend on the knee angle, so it avoids the misread angles. This is a product decision, because FR9 says "no automatic rep count (PROPOSAL, a clinician or the user must confirm it)". It must stay marked as an estimate, and the hand button must stay as a fallback.

I recommend A now and B only after the user decides, with a replay test on recorded landmarks.

## What stays unknown

- I did not see the real phone session. I cannot prove that the person did not tap the button, or that it was visible on a Redmi A3 screen. The code shows the button is in the bottom bar and is only disabled between sets.
- I did not run clip 08 (no fixture). The fixtures hold the first 18 s only.
- I cannot say if `isLegRaised` (ankle 0.05 of the image height above the hip) fires on a real side view of a supine person. In clips 03 right and 04 left the top angle was read, so it fired there. In 03 left and 04 right it did not, because the leg was paused or not visible. This matters only for Option B.
- No browser, camera or live check was run.
