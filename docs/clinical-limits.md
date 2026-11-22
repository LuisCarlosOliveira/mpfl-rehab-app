# Clinical limits

This document states what the app does not do and why. Each claim links to its source, or it is marked PROPOSAL or UNVERIFIED. The app is a prototype. It is not for patient use.

## Not a medical device, and the intended-purpose draft

The app monitors exercise and symptoms after an injury. Under EU MDR this is probably a medical purpose, so the app is probably medical device software. The class is not settled. An expert must set it. The draft is in [plan section 1.5](../MPFL_APP_PLAN.md). It is a draft for expert review. The research reading is in [research/tech.md section 6.1](../research/tech.md). It is a reading and not a ruling.

Update 2026-11-09: the app now makes an exercise plan from the answers of the person (the generator, FR30 and FR31). The reading of MDCG 2019-11 rev.1 is that software which recommends personalised exercises is medical device software under Rule 11. Rule 22 applies to software that adapts therapy by itself. The main session did NOT verify this reading (UNVERIFIED). Whether a confirmation by the person closes the loop of Rule 22 is not known. No regulatory expert has reviewed the app.

## The webcam angle is an estimate

A 2D webcam angle is an estimate. It is not a medical measurement. The error and the margin are in [research/form-opus.md section 3](../research/form-opus.md). The margin is a start value. It is UNVERIFIED for the `lite` model. No study checks a webcam against a goniometer after MPFL surgery ([research/clinical-update.md section 6](../research/clinical-update.md), gap 10).

The accuracy record ([docs/accuracy.md](accuracy.md)) exists. It holds no goniometer number, because no reference data exists. Update 2026-11-09: it holds a smoke test on 8 public clips of healthy people. That test shows that the tools work together. It does not show accuracy. Live tests on the same clips found angles that follow the picture in direction (`docs/live-test/exercise-flows.md`, check 17). They found no reference angle.

The frame rate of the pose loop is about 15 detections per second on a laptop with no GPU. It moves with machine load (`docs/live-test/performance.md`, [docs/accuracy.md](accuracy.md)). No phone frame rate exists. The real Redmi A3 is UNPROVEN.

## No form rating and no verdict

The app does not rate movement form. It shows a measured value against a limit that the care team set. No validated threshold for form exists after MPFL surgery. The reasons are in [research/form-opus.md section 2.2](../research/form-opus.md) and the wording rules are in section 4.4 of the same file. A rep inside the limit shows no message, because a message such as "within range" reads as approval.

## The app never changes the phase

The active phase comes only from the protocol field `activePhase`. The app has no setter for it ([plan FR4](../MPFL_APP_PLAN.md)). A check in `npm run precheck` finds a line that matches a pattern for a write outside `app/src/lib/protocol/`. The check is a pattern match and cannot prove that no other path exists. The test `tests/importGraph.test.ts` reads the imports of the save functions. The check cannot stop a person from editing the protocol file.

Update 2026-11-09: a plan that the app made changes the stored protocol only after the person presses Confirm (`app/src/ui/ConfirmPlan.tsx`, `app/src/lib/protocol/accept.ts`). A later date does not move the phase. An upward change (phase 2, a higher limit) sits behind the flag `VITE_SELF_PROGRESSION`, which is off by default. A script in the same page can still call the save function. The check cannot stop it. A file that the person edits can carry an `approvedOn` date that no one verified (open item L2-05).

Superseded 2026-11-13: the flag is on by default (MPFL_APP_PLAN.md FR31).

Decision 2026-11-22, supersedes 2026-11-13: the flag `VITE_SELF_PROGRESSION` is off by default. Only the exact text `true` or `1` turns it on. With the flag off, a move forward (phase 2, a higher or removed limit, a new mini squat or seated hold) is refused with "Ask your care team about the next stage." The person can still read the plan. The Confirm step and the pain limit hold stay.

With the flag off, a stored plan that the app cannot read blocks every save (code `stored-plan-unreadable`). The app cannot compare the two plans. With an empty store and the flag off, the app refuses a plan of phase 2 or higher. The text is "Ask your care team about the next stage." A phase 1 plan still saves. This closes the open case on 2026-11-22.

## The safety floor

The app pauses the session and shows "pause and contact your care team" when the pain or swelling entry reaches a set level. A protocol can set a lower pain threshold. The floor is an app rule. It is not a clinical default. Its value is a PROPOSAL. A clinician must review it. The value is stated once, in [plan FR12](../MPFL_APP_PLAN.md).

Update 2026-11-09: one answer is enough. Pain at the level, or swelling "more than before", pauses the session. An unanswered question never counts as a high value. Live test 1 found that the old code waited for both answers (L1-01). The fix is in commit 6264037. Live test round 2 verified it (`docs/live-test/retest.md`, L1-01: pain 7 alone gives the message at once).

Update 2026-11-09, audit 3 (H1, commit 903d2c9): the floor now also applies between sets. A pain answer between sets stops the session by the same rule as the Summary. A protocol threshold below 7 stops earlier. A threshold above 7 does not lift the floor. The Summary takes the highest answer. This has unit tests and no live re-test. The value 7 still has no source.

## The red-flag list

The red-flag list is general guidance. It is UNVERIFIED for MPFL surgery. The sources of each item are in `app/src/lib/redflags.ts` and in [research/clinical.md section 7](../research/clinical.md). A clinician must confirm each item and its group ([plan section 11](../MPFL_APP_PLAN.md)).

## Surgeon decisions that the app leaves open

The app shows each of these as "ask your surgeon" when the protocol does not set it. The app sets no default. The source is [research/clinical.md section 9](../research/clinical.md).

1. Start date and daily knee flexion limit, weeks 0 to 6.
2. Weight-bearing status and crutch use.
3. Brace use.
4. Protocol change for concurrent surgery.
5. Graft type, fixation and tunnel details.
6. Permission to start each new phase.
7. Maximum squat or lunge depth, and the load limit.
8. Permission to run, jump, cut and pivot.
9. Final return-to-sport clearance and its criteria.
10. Use of BFR, NMES or other devices.
11. Handling of red flags.
12. Anticoagulation or thromboprophylaxis.
13. Changes for skeletal immaturity, bilateral surgery, revision surgery or high-risk anatomy.
14. Pain and swelling thresholds that pause the program.

## The exported file

The exported file is unsigned. A patient can edit it. It holds health data. The export screen warns about this ([plan FR14](../MPFL_APP_PLAN.md)). The data controller for a file exchange is an open question for the expert ([plan section 11](../MPFL_APP_PLAN.md)).

## Model weights license

The model card says Apache-2.0. It also says the model is for entertainment and not for life-critical decisions. A legal review must decide this before any release to a patient. See [docs/model.md](model.md) and [plan section 11](../MPFL_APP_PLAN.md).

## The evidence is low

The evidence is low or very low for almost every rehab decision after MPFL surgery. The top gaps are in [research/clinical-update.md section 6](../research/clinical-update.md). They include stop rules for red flags, combined surgery, motion limits in weeks 0 to 6, weight-bearing and brace, and squat depth and load. The list also names return to sport, thromboprophylaxis, anatomic risk, adolescents and webcam measurement in this group.

## What a clinician must review before any patient uses the app

Source: [plan section 11](../MPFL_APP_PLAN.md).

- Every protocol value.
- The regulatory class, including the class of the clinician review summary (FR22a).
- The pain value of the safety floor.
- The cue texts "close to your limit, stop" and "stop at your limit, do not push".
- The two newer red-flag items and the group of each item.
- The limits for each exercise, and whether the app stops a set at "close to your limit" or only warns.
- Whether the values hold for adolescents.
- The model license question.
- The import rule for a file with another pseudonymous id. The code refuses such a file when the database already holds sessions (`app/src/lib/storage/export.ts`). The rule is a PROPOSAL until a clinician or the user confirms it.

## Items that need a clinician (list of 2026-11-09)

No clinician reviewed any item below. Each item names its mark. ENGINEERING and PROPOSAL values are not clinical values.

| Item | Where | Mark and note |
|---|---|---|
| Start dose of the straight leg raise: 2 sets of 10 repetitions | Generated plan (`DOSE` in `protocolGen/rules.ts`) | Source P2 rec 26, grade OPINION, ages 8 to 25. The citation audit allows a dose only as a clinician-set value (L2-04). The user chose option C, so the dose is kept as built. A clinician must decide |
| Count start of the heel slide, 18 degrees (2 times the margin of 9) | Generated plan (`ENG_TARGET`) | ENGINEERING. The app says "set by the app, not by a clinician". It is not a range target |
| Return tolerance of 9 degrees (the margin) | Generated plan (`ENG_RETURN`) | ENGINEERING. A clinician must say whether the value suits a rep |
| `returnWithinDeg` of a care-team protocol, and whether a resting angle above 0 is normal | Protocol field | No source and no default. A clinician sets it |
| Capture limit of 15 seconds and the "lowest steady angle" button | `CAPTURE_CONFIG` in `lib/baseline.ts` | ENGINEERING. The person chooses the button. The app never takes the lowest angle alone. Clinician review needed |
| Still rule: 0.02 of the frame height over 2 seconds. Size rule: leg length at least 0.30 of the frame along the leg | `SETUP_CONFIG` in `lib/setupRules.ts` | PROPOSAL. Check on real phone video. With a field of view of 65 degrees the leg can fill about 0.27 of the width at 2.5 m (calculation of the main session, not measured). Then the app can say "Move closer." although the advice of 2 to 2.5 m holds |
| `painPauseThreshold` of a protocol, and the FR12 value 7 | `lib/safety.ts` | The threshold is a clinician value. The value 7 has no source |
| Seated hold: `minFlexion`, `targetFlexion` and `holdSeconds` | Protocol fields | Clinician fields with no default. The generator never adds the hold in weeks 0 to 11 (P1, P2 rec 29) |
| Cue texts, including the new cue "Slow down." | `lib/cues.ts` | A clinician must review each text |
| Cue rate: one cue in 3 seconds, no repeat in 10 seconds | `CUE_MIN_GAP_MS`, `CUE_REPEAT_MS` | ENGINEERING |
| The "Count this rep" button for the straight leg raise | `ui/Session.tsx` | PROPOSAL |
| The heel slide limit floor of 28 degrees (3 margins plus 1) | Schema | Engineering floor with no clinical source |
| Phase structure: phase 1 to week 6, phase 2 from week 7 after clearance, no plan from week 12, review dates at 6 and 12 weeks | Generator | Grade OPINION (S1, P1, P3). A clinician must review it |
| Referral texts and the "Contact your care team" card | Generator, `lib/contactCard.ts` | A referral and not a verdict. A clinician must review the texts |
| Front-view change value: median of at least 3 reps, sign convention | `lib/views.ts` | UNVERIFIED sign. For the care team only. A study with patients needs ethics approval before a patient sees any such value |

## Items that need a clinician after audit 3 (2026-11-09)

Source: [docs/audit-3.md](audit-3.md) and the fixes of commit 903d2c9. No clinician reviewed any item below. ENGINEERING and PROPOSAL values are not clinical values.

| Item | Where | Mark and note |
|---|---|---|
| Red-flag item "or it is not getting better" | `lib/redflags.ts` | A person cannot test it on one day (A2-10, M6). A clinician must give a yes or no form |
| Pain floor 7, now between sets and at Summary | `lib/safety.ts`, `ui/Session.tsx`, `ui/Summary.tsx` | PROPOSAL with no source. A clinician must review the value and the new stop between sets |
| Size threshold 0.30 along the leg and still rule 0.02 of the frame height | `lib/setupRules.ts` | PROPOSAL. Check on real phone video |
| Capture limit of 15 seconds and the lowest-angle rule (the lowest 0.5 s plateau) | `lib/baseline.ts` | ENGINEERING. The person chooses the button. A clinician must review the rule |
| Repeat of the over-limit beep every 5 s | `ui/Session.tsx` | ENGINEERING. A clinician and the user must decide whether the repeat suits a patient |
| Straight leg raise peak above 30 degrees shows "The camera could not read this leg raise." | `lib/cues.ts` | ENGINEERING plausibility value with no source. The stored number stays. A clinician must review the value and the text |
| Hand count of the straight leg raise, marked `repsBy: hand` | `ui/Session.tsx`, `ui/ClinicianView.tsx` | PROPOSAL. The Dashboard and the review summary do not mark a hand count |
| Text "Set N done. Rest when you are ready." and "That was the last set in your plan." | `ui/Session.tsx`, `lib/sets.ts` | Neutral wording by the guardrail rule. A clinician must review it |
| A self-reported phase 2 clearance can make a phase 2 plan | `lib/protocolGen/generate.ts` | A documented limit (M2). The guard runs only when a plan is stored. Erase then create skips it. The user decides |
| A hand-added `approvedOn` date | Patient mode | An unsigned claim (L2-05). A regulatory expert decides |

## Items that need an expert or the user

- The regulatory class (MDCG 2019-11, Rule 11 and Rule 22): UNVERIFIED by the main session.
- The legal basis to store the surgery date, and the data controller of the file exchange.
- A hand-added `approvedOn` date (L2-05): patient mode cannot check a claim in an unsigned file.
- The clip licences: 8 Creative Commons clips ran in private tests. The attribution is in `docs/accuracy.md`. The clips never enter the repo. YouTube terms forbid a download with a tool. The user accepted this after the vetting in `docs/dependency-vetting-ytdlp.md`.
- Moving the pose loop to a Worker (L4-04): the user decided yes ("6. ok"). The work is T42 and `docs/pose-worker.md`. The speed on a real phone is NOT RUN.

## Register of values for clinician review

Cites name the file and the symbol. Line numbers are not used because they go stale.

Each row is one value or one group of values. The source of each row is a note in `app/src`. The code does not change for this register. A clinician fills the last two columns. "Source named in code" lists only the sources that the note names. If the note names none, the cell says "no source named".

### Protocol generator

| ID | Value and unit | File and symbol | What it controls | Status in code note | Source named in code | Reviewed by | Date |
|---|---|---|---|---|---|---|---|
| CV-01 | 58 degrees (40 plus 2 times the margin of 9), seated hold target | `lib/protocolGen/rules.ts`, `ENG_HOLD` | Target angle of the generated seated hold | grade ENGINEERING, note "Camera error from healthy adults" | F1, F3 | | |

### Margin and angle

| ID | Value and unit | File and symbol | What it controls | Status in code note | Source named in code | Reviewed by | Date |
|---|---|---|---|---|---|---|---|
| CV-02 | 9 degrees, camera margin | `lib/margin.ts`, `MARGIN_DEG` and `MARGIN_SOURCE`; `lib/monitor/registry.ts`, `margin` | Base tolerance for the generated targets and cue limits | "start value, UNVERIFIED for the" | Okuno 2026, F1 | | |
| CV-03 | 0.5, landmark visibility | `lib/angle.ts`, `MIN_VISIBILITY` | Minimum visibility before an angle is read | "The value 0.5 is a start value." | research/tech.md section 2.3 | | |

### Setup and capture

| ID | Value and unit | File and symbol | What it controls | Status in code note | Source named in code | Reviewed by | Date |
|---|---|---|---|---|---|---|---|
| CV-04 | 0.05 of frame edge | `lib/setupRules.ts`, `SETUP_CONFIG.edgeFraction` | A leg landmark this close to the edge fails the setup | "PROPOSAL, to be tuned in T13" | ux-flow 6.2 rule 4 | | |
| CV-05 | 0.25 of leg length, maximum hip gap | `lib/setupRules.ts`, `SETUP_CONFIG.maxHipGap` | Side-on gap check | "PROPOSAL, to be tuned in T13" | setup rule 6, no clinical source named | | |
| CV-06 | 2000 ms, still window | `lib/setupRules.ts`, `SETUP_CONFIG.stillWindowMs` | Time window of the stillness check | "PROPOSAL (engineering, not clinical)" | rule 7, F1 check on 7 clips | | |
| CV-07 | 1000 ms, failure hold | `lib/setupRules.ts`, `SETUP_CONFIG.failHoldMs` | A failure must last this long before the text changes | "PROPOSAL, to be tuned in T13" | FR27 | | |
| CV-08 | 3000 ms, spoken text interval | `lib/setupRules.ts`, `SETUP_CONFIG.announceEveryMs` | Spoken setup text changes at most this often | "PROPOSAL, to be tuned in T13" | FR27, WCAG 4.1.3 | | |
| CV-09 | 5000 ms, start countdown | `lib/setupRules.ts`, `SETUP_CONFIG.countdownMs` | Countdown before a capture starts | "PROPOSAL, to be tuned in T13" | FR27 | | |
| CV-10 | 30000 ms, More time extension | `lib/setupRules.ts`, `SETUP_CONFIG.moreTimeMs` | Time added by the More time button | "PROPOSAL, to be tuned in T13" | WCAG 2.2.1, ux-flow 6.2 | | |
| CV-11 | 20 samples, minimum for a median | `lib/baseline.ts`, `BASELINE_MIN_SAMPLES` | Fewer samples are not steady enough to use | "PROPOSAL, no source: a median" | no source named | | |
| CV-12 | 20 samples, minimum for the lowest steady angle | `lib/baseline.ts`, `CAPTURE_CONFIG.minLowestSamples` | Samples needed before the lowest steady angle counts | "ENGINEERING values, not clinical." | no source named | | |
| CV-13 | 0.8 of the protocol target, rep start | `lib/exercises.ts`, `ENTER_FRACTION`; `lib/baseline.ts`, note on `startBelowDeg` | Angle where a rep starts | "PROPOSAL, no source: a rep starts" | no source named | | |

### Exercise counting

| ID | Value and unit | File and symbol | What it controls | Status in code note | Source named in code | Reviewed by | Date |
|---|---|---|---|---|---|---|---|
| CV-14 | 10 degrees, minimum target | `lib/exercises.ts`, `MIN_TARGET` | Below this value, noise decides the count | "PROPOSAL, no source. Below this" | no source named | | |
| CV-15 | 0.05 of image height, raised ankle | `lib/exercises.ts`, `RAISE_MIN_HEIGHT` | Ankle above the hip by this much counts as raised | "PROPOSAL, no source. Image fraction" | no source named | | |
| CV-16 | 300 ms, minimum lift end | `lib/exercises.ts`, `LIFT_END_MS` | Shortest return to rest that ends a lift | "ENGINEERING, not clinical. In clip" | no source named | | |
| CV-17 | 500 ms, raise settle | `lib/exercises.ts`, `RAISE_SETTLE_MS` | Filter settle time before the top angle is read | "PROPOSAL, no source. The filter" | no source named | | |
| CV-18 | 0.4 to 2.5, thigh to shin ratio | `lib/exercises.ts`, `SEGMENT_RATIO` | Check for a plausible whole leg | "ENGINEERING, not clinical. No source" | no source named | | |
| CV-19 | 1 to 6, foot ratio | `lib/exercises.ts`, `FOOT_RATIO` | Check for the ankle pump foot | "ENGINEERING, not tuned on real" | no source named | | |
| CV-20 | Group: 0.1 jump fraction, 0.005 anchor step, 4000 ms lockout, 0.02 edge margin, 0.03 minimum segment, 2000 ms confirm, 0.05 steady radius, 5 probe frames, 3000 ms probe wait, 10000 ms reprobe, 0.2 probe share | `lib/exercises.ts`, `HIP_JUMP_FRACTION`, `ANCHOR_STEP`, `LOCKED_OUT_MS`, `EDGE_MARGIN`, `MIN_SEGMENT`, `CONFIRM_MS`, `STEADY_RADIUS`, `PROBE_MIN_FRAMES`, `PROBE_WAIT_MS`, `REPROBE_MS`, `PROBE_MANY_SHARE` | Tracking of the person and the probes for the camera count | "ENGINEERING, not clinical. No source sets" | no source named | | |

### Cues and screen timing

| ID | Value and unit | File and symbol | What it controls | Status in code note | Source named in code | Reviewed by | Date |
|---|---|---|---|---|---|---|---|
| CV-21 | 500 ms, paused cue | `lib/cues.ts`, `PAUSED_CUE_MS` | Leg out of view for this long before the pause cue shows | "ENGINEERING: the leg must stay" | no source named | | |
| CV-22 | 500 ms, limit gap reset | `lib/counters.ts`, `LIMIT_GAP_RESET_MS` | Gap that lets the over-limit alert repeat | "ENGINEERING, not clinical. No source" | no source named | | |
| CV-23 | 2000 ms, pose probe | `ui/Session.tsx`, `PROBE_MS` | Two-pose probe when the lockout starts | "ENGINEERING: how long the source" | internal item B5-02 | | |
| CV-24 | 500 ms, lock box hold | `ui/Session.tsx`, `LOCK_HOLD_MS` | Lock box stays after the lock ends | "ENGINEERING: the lock box stays" | no source named | | |
| CV-25 | 4000 ms, cue text on screen | `ui/Session.tsx`, `CUE_SHOW_MS` | How long a cue text stays | "PROPOSAL, no source: how long" | no source named | | |
| CV-26 | 2000 ms, stale frame | `ui/Session.tsx`, `STALE_MS` | No frame for this long shows the camera notice | "PROPOSAL, no source: no frame" | no source named | | |
| CV-27 | 5000 ms, Next card wait | `ui/PlanSession.tsx`, `NEXT_CARD_MS` | How long the Next card waits | "ENGINEERING value, no clinical source" | no source named | | |
| CV-28 | 10000 ms, confirmation age | `lib/protocol/accept.ts`, `CONFIRMATION_MAX_AGE_MS` | An older confirmation is stale | "ENGINEERING value." | no source named | | |
| CV-29 | 20000 values, placeholder scan limit | `lib/protocol/loader.ts`, `PLACEHOLDER_SCAN_LIMIT` | Stop of the scan for "SET BY CLINICIAN" | "ENGINEERING value, no source" | no source named | | |

### Views and front camera

| ID | Value and unit | File and symbol | What it controls | Status in code note | Source named in code | Reviewed by | Date |
|---|---|---|---|---|---|---|---|
| CV-30 | 500 ms, view sync | `lib/views.ts`, `PAIR_TOLERANCE_MS` | Offset allowed when reps are paired across views | "PROPOSAL, 500 ms. Each view" | research/dual-camera-opus.md section 3 | | |
| CV-31 | 60000 ms, front buffer | `lib/views.ts`, `FRONT_BUFFER_MS` | How long the front buffer holds frames | "PROPOSAL: how long the buffer" | no source named | | |
| CV-32 | Start frame plus 4 usable frames | `lib/views.ts`, `MIN_FRONT_FRAMES` | Frames needed for a front view | "PROPOSAL: the start frame plus" | no source named | | |

### Review summary, export and pairing

| ID | Value and unit | File and symbol | What it controls | Status in code note | Source named in code | Reviewed by | Date |
|---|---|---|---|---|---|---|---|
| CV-33 | 5 counted reps | `lib/reviewSummary.ts`, `MIN_COUNTED_REPS` | Minimum reps for an angle measure | "PROPOSAL, no source (progression.md" | progression.md section 5.2 | | |
| CV-34 | Highest pain of the window | `lib/reviewSummary.ts`, `numericRow`, branch `painMax` | A pain limit reads the highest value | "The highest value of the window" | no source named | | |
| CV-35 | 1 set when sets are missing | `lib/sets.ts`, `totalSets` | Reps without sets count as one set | "PROPOSAL: reps without sets count" | no source named | | |
| CV-36 | One space | `lib/storage/export.ts`, `REPS_PER_SET_SEPARATOR` | Separator of the per-set count cell | "PROPOSAL: the per-set counts are" | no source named | | |
| CV-37 | 5 to 1, maximum width to height of the phone image | `lib/pairing/messages.ts`, field `aspect` of the frame schema | Range of the phone image aspect | "PROPOSAL range, a camera is not" | no source named | | |
| CV-38 | Visit check wording | `lib/reviewSummary.ts`, `CHECK_TEXT` | Visit check texts | "The wording is a PROPOSAL." | progression.md section 5.2, strength item only | | |
| CV-39 | Group: 3000 ms gather, 16384 bytes buffer, 15 frames each second, 4096 bytes message, 15000 ms hello, 120000 ms secret, 4 open secrets, 600 characters scan | `pairing/rtcLink.ts`, `GATHER_TIMEOUT_MS` and `SEND_BUFFER_LIMIT`; `pairing/frameMessage.ts`, `SEND_HZ`; `lib/pairing/messages.ts`, `MAX_MESSAGE_BYTES`; `lib/pairing/session.ts`, `HELLO_TTL_MS`; `lib/pairing/security.ts`, `DEFAULT_TTL_MS` and `MAX_OPEN_SECRETS`; `lib/pairing/payload.ts`, `MAX_SCANNED_CHARS` | Connection and transfer limits of the phone pairing | "PROPOSAL: qr-pairing.md section 5" | qr-pairing.md section 5 | | |
| CV-40 | Pairing identity config group: 6000 ms window, 30 frames, 8 degrees range, 0.6 ratio, 2 windows | `lib/legIdentity.ts`, `IDENTITY_CONFIG` | Decides which leg moves | "Every value in IDENTITY_CONFIG is a PROPOSAL" | T13, internal | | |

### Monitor and body map

| ID | Value and unit | File and symbol | What it controls | Status in code note | Source named in code | Reviewed by | Date |
|---|---|---|---|---|---|---|---|
| CV-41 | 30 degrees, minimum ankle pump amplitude | `lib/monitor/modes.ts`, `ANKLE_MIN_AMPLITUDE` | Smallest rise and fall that counts as a pump | "ENGINEERING, not clinical. No source" | no source named | | |
| CV-42 | 4000 ms, longest pump rise | `lib/monitor/modes.ts`, `ANKLE_MAX_RISE_MS` | Longest rise that counts as a pump | "ENGINEERING, not clinical. No source" | R-10, internal | | |
| CV-43 | 3 degrees for the side view, 20 degrees for the back view, lift angle | `lib/monitor/modes.ts`, `LIFT_ANGLE_SIDE` and `LIFT_ANGLE_BACK` | Angle at which a leg counts as lifted | "ENGINEERING, not clinical. No source" | no source named | | |
| CV-44 | 0.02 of picture, minimum foot move | `lib/monitor/modes.ts`, `FOOT_MIN_DX` | The foot must point this far to vote for facing | "ENGINEERING. The foot of" | no source named | | |
| CV-45 | Filter cut-offs 1.2 and 1.5 | `lib/monitor/modes.ts`, `CYCLE_FILTER` and `LIFT_FILTER` | Smoothing of the angles for cycles and lifts | "Every number here is ENGINEERING." | no source named | | |
| CV-46 | Group: 500 ms lost hold, 0.02 spike, 100 ms hold, 0.06 side band | `ui/BodyMap.tsx`, `LOST_HOLD_MS`, `SPIKE_FRACTION`, `HOLD_MS`, `SIDE_BAND` | Drawing of the joints on the body map | "ENGINEERING, not clinical. Measured on" | docs/live-test/skeleton-validation.md | | |

### Drawings, examples and texts

| ID | Value and unit | File and symbol | What it controls | Status in code note | Source named in code | Reviewed by | Date |
|---|---|---|---|---|---|---|---|
| CV-47 | 60 degrees, heel slide drawing | `lib/figure.ts`, `ILLUSTRATIVE_FLEXION`, key `heel-slide` | Illustrative angle in the drawing | "PROPOSAL, same as the example target" | example-protocol.json | | |
| CV-48 | 30 degrees, mini squat drawing | `lib/figure.ts`, `ILLUSTRATIVE_FLEXION`, key `mini-squat` | Illustrative angle in the drawing, not a limit | "PROPOSAL, inside the borrowed range" | clinical.md section 4, S16 | | |
| CV-49 | 30 degrees, hip flexion in the straight leg raise drawing | `lib/figure.ts`, `poseFor`, case `straight-leg-raise` | Hip angle in the drawing | "PROPOSAL: a hip flexion of 30" | clinical.md section 4 | | |
| CV-50 | 0.62 of label size | `lib/figure.ts`, `CHAR_W` | Width of one bold character in labels | "PROPOSAL, width of one bold" | browser check, no clinical source | | |
| CV-51 | 50 degrees, example maximum flexion | `lib/protocol/example-protocol.json`, field `source` of the mini squat | Example ceiling in the example plan | "maxFlexion 50: S16, BORROWED (healthy" | S16, healthy people | | |
| CV-52 | 2 sets of 10 repetitions, example dose | `lib/protocol/example-protocol.json`, field `source` of the mini squat | Example dose | "sets, reps: example values, P2" | P2 rec 26, OPINION, ages 8 to 25 | | |
| CV-53 | 40 and 60 degrees, example seated hold | `lib/protocol/example-protocol.json`, field `source` of the seated extension hold | Example hold range | "minFlexion 40: P1 phase 2" | P1, OPINION | | |
| CV-54 | Five new exercise guide texts | `lib/guides.ts`, header note; `lib/monitor/registry.ts`, comment "The five new exercises (PROPOSAL)" | Patient guide texts for five exercises | "The five new exercises (PROPOSAL)" | research/technique-sources.md covers four exercises | | |
| CV-55 | Technique note text | `lib/technique.ts`, `PROPOSAL_NOTE` | Note above the guide lines | "These lines are a proposal" | no source named | | |
| CV-56 | Beep pitch and length | `ui/sound.ts`, `TONES` | Sound of the cues | "PROPOSAL, no source: the pitches" | no source named | | |
| CV-57 | Camera question starts on the side of the chosen leg | `ui/setupView.ts`, `LEG_TEXT.cameraHint` | Order of the camera questions | "PROPOSAL: the camera question starts" | no source named | | |
