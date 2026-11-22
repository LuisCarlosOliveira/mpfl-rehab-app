# Leg choice and return baseline: answers and design

Date: 2026-11-08. Status: design only. No code changed. Marks: V (read in the source), INFERRED, UNVERIFIED, PROPOSAL.
Method: the skill `mpfl-rehab-knowledge` and the guardrail skill. The agent type did not load, so a general agent read its files.
Skills loaded: `owasp-security`, `anti-slop-code:anti-slop-code`, `simple-english:simple-english`.

## The two answers

**Question 1, return threshold.** Recommend option (b) with a safe fallback. Capture a baseline at Setup. End a rep when the knee is back within N degrees of that baseline. N is a clinician value with no default in the app. If the protocol sets no N, the app shows "ask your surgeon" and counts no rep. Do not keep the fixed 30 percent rule as a silent default. The knowledge base has no source for it.

**Question 2, the leg.** Ask the person which leg will exercise. Preselect the operated side. Ask which side of them the camera is on. Track the leg that the person chose. Use the moving-leg check as a soft warning, never as a switch. The replay test shows the check is useful but not decisive (see section 4).

## 1. Evidence for question 1

| Claim | Source | Mark |
|---|---|---|
| Heel slides are a phase 1 exercise. The start range is 0 to 30 degrees in weeks 1 to 2, then plus 20 to 30 degrees a week | `research/clinical.md` section 4 table, source S1 (Hsu 2025, clinical commentary, LoE 5) | V |
| Phase 1 goals include regaining full extension. Exit criteria: flexion above 110 degrees, full extension, SLR without lag | `research/clinical.md` section 4, S1 | V |
| Range limits differ by protocol: 0 to 90 in weeks 1 to 2 (Lahey 2014), 0 to 90 for 4 weeks (Connecticut 2024), no restriction (Dartmouth 2022, Mayo 2024), 90 by 4 weeks and 120 by 6 weeks (HSS, Cincinnati) | `research/clinical-update.md` section 3 table P1 to P12 | V for the table. Several protocols are old or undated |
| Protocols range from no limit to a locked 0 to 90 range. A clinician sets it | `research/clinical-update.md` gap 3 | V |
| Effusion: no numeric threshold exists. Persistent effusion and loss of ROM are referral signs | `research/clinical.md` section 7, `clinical-update.md` section 3 (P2) | V, consensus level |
| Extension lag is a known state. SLR without lag is a phase criterion | `research/clinical.md` section 4 | V |
| A usual start: lie on the back, both legs straight. The heel stays on the surface | `research/ux-flow.md` section 7.1 | PROPOSAL, not evidence |
| A person returns to full extension at the end of each rep | Not in the knowledge base | Not in the knowledge base. Source type: a rehab text or a clinician |
| Any source for a fixed return threshold, or a start relative to the own resting angle | Not in the knowledge base | Not in the knowledge base. Source type: clinician protocol or measurement study |
| Current thresholds are a PROPOSAL with no source | `app/src/lib/exercises.ts` lines 24 to 26 | V |

The knowledge base cannot say three things. Do early patients usually return to 0 degrees? How large is a normal extension lag? How many degrees is "back to start"? Ask your surgeon.

## 2. What the code does today (Question 1)

All values read in the source (V).

- `exercises.ts`: `ENTER_FRACTION = 0.8`, `EXIT_FRACTION = 0.3`, `MIN_TARGET = 10`, `MIN_STATE_MS = 300`. For target 60: enter 48, exit 18.
- `counters.ts` `repsStep`: a rep starts when flexion is at least `enter` for 300 ms. It ends when flexion is at most `exit` for 300 ms. It counts if the peak is at least `target - margin`. The margin is 9 (`margin.ts`, UNVERIFIED for the lite model).
- If the knee never goes down to `exit`, the phase stays `FLEXED`. No event fires. The count stays 0 and the person sees no reason.
- `schema.ts`: exercise fields are `targetFlexion`, `maxFlexion`, `minRepSeconds`, `maxTopFlexion`, `holdSeconds`. No baseline or return field exists. `maxFlexion` must exceed `targetFlexion` plus 9 for heel slide.
- `docs/accuracy.md`: clip 01, right leg, lowest filtered flexion is 22.3 (one outlier frame) against the 18 threshold. The result is 0 reps. A hand threshold of 50 gives 4 reps. The left leg gives 4 reps with no change.

## 3. Recommendation for question 1

1. Add the optional protocol field `returnWithinDeg` for heel slide and mini squat. It has no default. PROPOSAL for the name.
2. At Setup, during the hold-still, record the median filtered flexion of the chosen leg. This is the baseline. Show it as "estimated angle, not a medical measurement".
3. If `returnWithinDeg` is set: a rep ends when flexion is at most baseline plus `returnWithinDeg` for 300 ms. Enter stays at the target-based rule (target minus margin).
4. If `returnWithinDeg` is not set: the app shows "ask your surgeon" for the return value, as it does for a missing target. It does not count reps with an invented number.
5. If the knee stays bent and no rep ends, show a neutral note after a set time: "No rep ended yet. Your care team sets how far the knee must come back." Time value: PROPOSAL, clinician review.
6. Do not mix option (a) with (b). Option (c) keeps an unsourced number as a hidden fallback. That breaks the rule that the app invents no clinical number. Keep the old fractions only in the offline clip tool, labelled PROPOSAL.

These stay with a clinician: the value of `returnWithinDeg`, and the target and the ceiling. A clinician also decides if the return must reach full extension. A clinician also decides what a person with an extension lag does (clinical.md section 9, items 1 and 6).
Open engineering item: the baseline is a resting value. A person who lies with a bent knee at rest gets a high baseline. A clinician must say if that is acceptable.

## 4. Evidence for question 2

### What the app does today (V)

| Item | Present? | Where |
|---|---|---|
| A question to the person about the leg | No. `side` comes from the protocol | `Setup.tsx` props, `schema.ts` field `side` |
| Landmark ids | Fixed: left 23, 25, 27. Right 24, 26, 28 | `angle.ts` `LEG_IDS`, `selectLeg` |
| Check of the other leg | Only for visibility. If the chosen leg is hidden and the other leg is more visible, the text is "Turn so your operated leg faces the camera" | `setupRules.ts` `evaluateSetup` |
| Side-on rule | Yes. The far hip, if visible, must be within 0.25 leg lengths of the near hip | `setupRules.ts` `maxHipGap` |
| Camera side question | No. The guide text says "Camera at the side of your operated leg" | `Setup.tsx` line 37 |
| Near or far leg logic | No. `research/ux-flow.md` section 7 assumes the operated leg is the near leg | `ux-flow.md` |
| Two-view logic | `views.ts` pairs reps and uses `selectLeg` with the protocol side | `views.ts` |

### Technical risk

- The knowledge base: the far-side knee has limits of agreement of -12.0 to 15.2 degrees. The near-side knee has -6.5 to 9.6 (S9, 15 healthy adults, walking). V, `research/dual-camera.md` section 2. BORROWED.
- `research/tech.md` section 2.3: occlusion by the other leg hides landmarks. `z` is a model estimate, not measured depth. Do not use it as depth. V.
- Web, MediaPipe official page (developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker, read 2026-11-08): `visibility` and `presence` are probabilities. `z` is depth relative to the hip midpoint. The page says nothing about the left and right convention in profile view. V for this page. Not validated for MPFL.
- Web, GitHub issue sergioffpc/olivia #62 (read 2026-11-08, second-hand notes of one user): the model always returns 33 landmarks and guesses hidden ones. No threshold for visibility is documented. No left and right swap is reported there. UNVERIFIED as a model fact.
- A web search for a MediaPipe issue about a left and right leg swap in profile view found none. So a swap is neither confirmed nor excluded. UNVERIFIED.
- The clips (`docs/accuracy.md`): clip 01 left 94 percent, right 69 percent. Clip 06 left 99 percent, right 25 percent. The legs alternate in clip 01, so the "wrong" leg there was the other exercising leg. The tool warns when the other leg is found in 25 points more frames.
- The manifest near-leg label is not safe to use. The manifest says "right leg near" for clip 06. The leg that moves and has 99 percent detection is the model left leg. In the still of clip 06 the woman faces image-left, which puts her left side to the camera (INFERRED). The manifest near-leg labels are therefore not reliable ground truth.

### Replay test (read-only, saved landmarks, no browser)

Script: `/tmp/claude-1000/-home-luis-projects/c0df9405-b52e-4b2f-b357-194865342f04/scratchpad/legid/id4.mjs`. Rule: in each 6 second window, take two ranges for each leg (5th to 95th percentile). The ranges are knee flexion and the direction of the hip-to-ankle line. Keep the larger one. Use frames with all three visibility values at least 0.5 and at least 30 usable frames. If the smaller range is at least 0.6 of the larger, the answer is ambiguous. If the larger is below 8, the answer is none.

| Clip | Windows | Left | Right | Ambiguous | None | Reading |
|---|---|---|---|---|---|---|
| 01 heel slide | 5 | 0 | 0 | 5 | 0 | Both legs move. Correct: no single leg |
| 02 heel slide, mixed framing | 5 | 3 | 0 | 2 | 0 | Left, which has 125 degrees range. Truth not recorded |
| 04 SLR, table | 6 | 1 | 0 | 4 | 1 | Raised leg and bent support leg both move. Weak |
| 06 seated extension | 4 | 4 | 0 | 0 | 0 | Left every time. Matches the visible extended leg |
| 03 SLR, floor | 7 | 0 | 5 | 2 | 0 | Right in 5 of 7. Truth by eye not confirmed |
| 08 SLR, oblique | 4 | 1 | 3 | 0 | 0 | Right mostly. Left is only seen in the first window |

Answer: no, the moving-leg rule does not pick one right leg on every clip. It is clear on clip 06, mostly clear on 02, 03 and 08, and ambiguous on 01 and 04 because both legs move. I did not record a trusted ground truth for the exercising leg, so "right" cannot be scored as a percentage. The test shows the signal exists. It does not prove a rule. No frame-to-frame left and right swap was measured. UNVERIFIED.

## 5. Design

### 5.1 Setup steps before the camera

1. "Which leg will you exercise?" Two buttons, Left and Right. The protocol `side` is preselected and labelled "operated leg in your plan".
2. "Which side of you is the camera on?" Two buttons, Left and Right. The near leg is the leg on the camera side (INFERRED from the geometry).
3. If the chosen leg is not the operated side: show a neutral note and ask for a confirm. The app keeps the protocol and the active phase unchanged. It stores the choice for this session only.
4. The answer is stored in the session record as `exerciseLeg` and `cameraSide`. No name and no free text.

### 5.2 Tracking rule

- The pipeline calls `selectLeg(landmarks, exerciseLeg)`. The ids stay as they are.
- If the chosen leg is the far leg, the app uses it but marks the angle as lower confidence. The clinician summary records `legRole: 'near' | 'far'`. The far-leg margin is UNVERIFIED. T13 must measure it.
- Do not use world `z` to decide near or far. It is an estimate. Use the camera side answer.

### 5.3 Identity check (soft)

During the hold-still in Setup the legs are both still, so the check cannot run there. Run it on the first reps of the session.

- Window: the first 6 seconds after the first rep starts, then every 6 seconds. Values are PROPOSAL.
- Compute the flexion range of each leg as in the replay test.
- Condition: the other leg has at least 8 degrees of range and twice the range of the chosen leg. Then show: "The camera sees your other leg move more. Make sure that the chosen leg is the one that moves." Buttons: "Continue with this leg" and "Choose the other leg".
- If both ranges are close, show nothing. Both legs can move in a normal session.
- If the chosen leg is below the visibility gate for 3 seconds, keep the existing "show-leg" text.
- The note never says wrong, correct, error or mistake. It never blocks the session. It never counts a rep for the other leg without the person pressing the button.
- Also test the far hip: the existing side-on rule stays.

### 5.4 Texts (simple English, no verdict words)

| Screen | Text |
|---|---|
| Leg question | "Which leg will you exercise?" |
| Preselect label | "Operated leg in your plan" |
| Camera question | "Which side of you is the camera on?" |
| Other leg confirm | "Your plan names the other leg. The app will follow the leg that you chose. It does not change your plan. Continue?" |
| Far leg note | "The camera is on the other side. The estimated angle can be less exact." |
| Identity note | "The camera sees your other leg move more. Make sure that the chosen leg is the one that moves." |
| Baseline shown | "Resting angle: 12 degrees. Estimated angle, not a medical measurement." |
| No return value | "Ask your surgeon how far the knee must come back." |
| Rep not ended | "No rep ended yet. Your care team sets how far the knee must come back." |

## 6. Build list (tests first)

1. `app/src/lib/legIdentity.test.ts`, then `legIdentity.ts`: pure function `movingLeg(samples, config)` returning `left | right | ambiguous | none`. Test with synthetic series: one leg moves, both move, one hidden, short series.
2. `app/src/lib/protocol/schema.ts` and its test: optional `returnWithinDeg` (number, 0 to 90). No default. Reject on exercises that have no rep counter.
3. `app/src/lib/counters.ts` and `exercises.ts`: add `baseline` and `returnWithin` to `RepsConfig`. Test: a baseline of 20 and N of 10 ends the rep at 30. A missing N gives `ask-your-surgeon` with `missing: 'returnWithinDeg'`. Remove `EXIT_FRACTION` from the app path.
4. `app/src/lib/setupRules.ts`: a function `restingAngle(history, side, aspect)` returning the median flexion over the still window. Test with a still series.
5. Session state: `exerciseLeg`, `cameraSide`, `legRole`. Check that `activePhase` and `side` of the protocol are never written (`precheck` has the check).
6. `app/src/ui/Setup.tsx` and `setupView.ts`: the two questions, the confirm step, the texts above. Keep the text rules of the guardrail skill. Run `claims-check.sh`.
7. Pass `exerciseLeg` to `createPipeline` and `views.ts` instead of the protocol side.
8. Export and clinician summary: record `exerciseLeg`, `legRole`, baseline, and `returnWithinDeg`. No free text.
9. `docs/clinical-limits.md`: add the clinician review items below.

## 7. Real-clip tests

Use the clips in `/tmp/claude-1000/-home-luis-projects/c0df9405-b52e-4b2f-b357-194865342f04/scratchpad/clips-real/` with the replay scripts in `.../rca/replay.mjs`.

| Test | Clip | Expected |
|---|---|---|
| Moving leg is clear | 06 | `left` in every window |
| Both legs move: no pick | 01 | `ambiguous` in every window |
| Leg choice is honoured | 01 with left chosen, then right chosen | 4 reps and 0 reps today. With a baseline rule and a set N, the right leg result is re-measured |
| Hidden chosen leg | 08 left chosen | Shows the visibility text, no identity note |
| Mixed framing | 02 | No false identity note during close-ups |
| Baseline return | 01 left, 02 left | Reps end with a set N. Record the numbers |

A trusted ground truth (a person who writes down the leg and the camera side while filming) is needed before any accuracy claim. Test on own recordings with both camera sides.

## 8. Risks and UNVERIFIED

- UNVERIFIED: whether MediaPipe swaps left and right labels in a profile view, and how often. No issue found. Not measured here.
- UNVERIFIED: the far-leg error for the lite model. The 12 to 15 degree limits come from a gait study (BORROWED).
- UNVERIFIED: the visibility gate of 0.5 and all window values in section 5.3.
- Risk: the baseline from a resting leg can be wrong if the person moves during the hold-still. Use the median and the existing still rule.
- Risk: a person picks the unoperated leg by habit. The note is neutral. The app does not decide.
- Risk: both legs move in a normal heel slide. The check is a hint only.
- Clip ground truth is not trusted. The manifest near-leg labels disagree with the pose data for clip 06.

## 9. Open decisions

For the user:
- Remove the 30 percent fraction from the app path, as in option (b)?
- Show the identity note, or log it only for the clinician at first?
- Allow the person to pick the unoperated leg at all?

For a clinician:
- The value of `returnWithinDeg`, and whether return to 0 degrees is expected.
- What happens when a person cannot reach the return value.
- Whether a resting angle above 0 is a normal baseline, and the limit for it.
- Whether a session on the unoperated leg is stored or discarded.
