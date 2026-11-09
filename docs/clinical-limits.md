# Clinical limits

This document states what the app does not do and why. Each claim links to its source, or it is marked PROPOSAL or UNVERIFIED. The app is a prototype. It is not for patient use.

## Not a medical device, and the intended-purpose draft

The app monitors exercise and symptoms after an injury. Under EU MDR this is probably a medical purpose, so the app is probably medical device software. The class is not settled. An expert must set it. The draft is in [plan section 1.5](../MPFL_APP_PLAN.md). It is a draft for expert review. The research reading is in [research/tech.md section 6.1](../research/tech.md). It is a reading and not a ruling.

Update 2026-11-09: the app now makes an exercise plan from the answers of the person (the generator, FR30 and FR31). The reading of MDCG 2019-11 rev.1 is that software which recommends personalised exercises is medical device software under Rule 11. Rule 22 applies to software that adapts therapy by itself. The main session did NOT verify this reading (UNVERIFIED). Whether a confirmation by the person closes the loop of Rule 22 is not known. No regulatory expert has reviewed the app.

## The webcam angle is an estimate

A 2D webcam angle is an estimate. It is not a medical measurement. The error and the margin are in [research/form-opus.md section 3](../research/form-opus.md). The margin is a start value. It is UNVERIFIED for the `lite` model. No study checks a webcam against a goniometer after MPFL surgery ([research/clinical-update.md section 6](../research/clinical-update.md), gap 10).

The accuracy record ([docs/accuracy.md](accuracy.md)) exists. It holds no goniometer number, because no reference data exists. Update 2026-11-09: it holds a smoke test on 8 public clips of healthy people. That test shows that the tools work together. It does not show accuracy. Live tests on the same clips found angles that follow the picture in direction (`docs/live-test/exercise-flows.md`, check 17). They found no reference angle.

The frame rate of the pose loop is at the limit of 15 frames per second on a laptop with no GPU. It moves with machine load (`docs/live-test/performance.md`). No phone frame rate exists. The real Redmi A3 is UNPROVEN.

## No form rating and no verdict

The app does not rate movement form. It shows a measured value against a limit that the care team set. No validated threshold for form exists after MPFL surgery. The reasons are in [research/form-opus.md section 2.2](../research/form-opus.md) and the wording rules are in section 4.4 of the same file. A rep inside the limit shows no message, because a message such as "within range" reads as approval.

## The app never changes the phase

The active phase comes only from the protocol field `activePhase`. The app has no setter for it ([plan FR4](../MPFL_APP_PLAN.md)). A check in `npm run precheck` finds any write outside `app/src/lib/protocol/`. The check cannot stop a person from editing the protocol file.

Update 2026-11-09: a plan that the app made changes the stored protocol only after the person presses Confirm (`app/src/ui/ConfirmPlan.tsx`, `app/src/lib/protocol/accept.ts`). A later date does not move the phase. An upward change (phase 2, a higher limit) sits behind the flag `VITE_SELF_PROGRESSION`, which is off by default. A script in the same page can still call the save function. The check cannot stop it. A file that the person edits can carry an `approvedOn` date that no one verified (open item L2-05).

## The safety floor

The app pauses the session and shows "pause and contact your care team" when the pain or swelling entry reaches a set level. A protocol can set a lower pain threshold. The floor is an app rule. It is not a clinical default. Its value is a PROPOSAL. A clinician must review it. The value is stated once, in [plan FR12](../MPFL_APP_PLAN.md).

Update 2026-11-09: one answer is enough. Pain at the level, or swelling "more than before", pauses the session. An unanswered question never counts as a high value. Live test 1 found that the old code waited for both answers (L1-01). The fix is in commit 6264037. The re-test is PENDING.

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

## Items that need an expert or the user

- The regulatory class (MDCG 2019-11, Rule 11 and Rule 22): UNVERIFIED by the main session.
- The legal basis to store the surgery date, and the data controller of the file exchange.
- A hand-added `approvedOn` date (L2-05): patient mode cannot check a claim in an unsigned file.
- The clip licences: 8 Creative Commons clips ran in private tests. The attribution is in `docs/accuracy.md`. The clips never enter the repo. YouTube terms forbid a download with a tool. The user accepted this after the vetting in `docs/dependency-vetting-ytdlp.md`.
- Moving the pose loop to a Worker (L4-04): a decision of the user.
