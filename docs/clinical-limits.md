# Clinical limits

This document states what the app does not do and why. Each claim links to its source, or it is marked PROPOSAL or UNVERIFIED. The app is a prototype. It is not for patient use.

## Not a medical device, and the intended-purpose draft

The app monitors exercise and symptoms after an injury. Under EU MDR this is probably a medical purpose, so the app is probably medical device software. The class is not settled. An expert must set it. The draft is in [plan section 1.5](../MPFL_APP_PLAN.md). It is a draft for expert review. The research reading is in [research/tech.md section 6.1](../research/tech.md). It is a reading and not a ruling.

## The webcam angle is an estimate

A 2D webcam angle is an estimate. It is not a medical measurement. The error and the margin are in [research/form-opus.md section 3](../research/form-opus.md). The margin is a start value. It is UNVERIFIED for the `lite` model. No study checks a webcam against a goniometer after MPFL surgery ([research/clinical-update.md section 6](../research/clinical-update.md), gap 10).

The accuracy record ([docs/accuracy.md](accuracy.md)) exists. It holds no measured number, because no reference data and no real-video clip exist yet.

## No form rating and no verdict

The app does not rate movement form. It shows a measured value against a limit that the care team set. No validated threshold for form exists after MPFL surgery. The reasons are in [research/form-opus.md section 2.2](../research/form-opus.md) and the wording rules are in section 4.4 of the same file. A rep inside the limit shows no message, because a message such as "within range" reads as approval.

## The app never changes the phase

The active phase comes only from the protocol field `activePhase`. The app has no setter for it ([plan FR4](../MPFL_APP_PLAN.md)). A check in `npm run precheck` finds any write outside `app/src/lib/protocol/`. The check cannot stop a person from editing the protocol file.

## The safety floor

The app pauses the session and shows "pause and contact your care team" when the pain or swelling entry reaches a set level. A protocol can set a lower pain threshold. The floor is an app rule. It is not a clinical default. Its value is a PROPOSAL. A clinician must review it. The value is stated once, in [plan FR12](../MPFL_APP_PLAN.md).

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
