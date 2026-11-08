# Seated knee extension hold: phase 1 after isolated MPFLR

## Phase availability

The app does not offer the seated knee extension hold in phase 1. Only a surgeon can enable it, for one patient.

- Default in phase 1: not offered. It does not show in the exercise list and the protocol generator (FR30) does not create it. FR30 already gives no seated hold, because no source gives it.
- With surgeon clearance: the protocol must list the exercise explicitly. The surgeon sets the arc. The app sets no default arc, hold time, sets or reps. Show "ask your surgeon" for each value the protocol leaves empty.
- Reason: two guidelines say to avoid open-chain knee extension early. Both are VERIFIED-FULL in `research/source-audit.md`, with evidence class CONSENSUS (low), level 5, and not trial evidence (`research/rehab-rules.md` section 2, row "Seated knee extension (open chain)").
  - P2 (Cincinnati, rec 29, initial phase): short arc and long arc quadriceps exercises in the terminal range, 30 to 0 degrees, are avoided to protect the reconstructed MPFL.
  - P1 (HSS, phase 1): "Do not perform open chain knee extension (KE)" and "Do not perform AROM open chain KE, unless cleared by surgeon".
- Later phases: offer only a mid-range arc that the surgeon sets. The sources give 90 to 30 degrees (P2 rec 39) and 90 to 40 degrees (P1). These are references for the surgeon. They are not app values. N23 (90 to 45 degrees) is a healthy-subject lab study, BORROWED, and it is not a rule.
- The app never changes the phase. Only the protocol field `activePhase` sets it.
- Any red flag ("yes") blocks the session before this exercise.

## Conflict in the current code

`app/src/lib/guides.ts` (key `seated-extension-hold`, `range`) says "Straighten your knee." This asks for active extension to 0 degrees. That is the movement that P1 and P2 say to avoid in phase 1. `MPFL_APP_PLAN.md` also notes that `exercises.ts` uses 0 as the target when `targetFlexion` is empty, marked PROPOSAL. In phase 1 this text and this default must not reach the patient. Do not show the exercise unless the protocol enables it. If enabled, the target must come from the surgeon. A missing target must give `ask-your-surgeon` and must not fall back to 0. The text also conflicts with `research/ux-flow.md` and `research/ui-decisions.md` (INDEX-v2 notes this).

## Guide text (only for a protocol that enables the exercise with a surgeon arc)

Do not show this text when the protocol does not enable the exercise. Wording follows the guardrails: no verdict words, no goal, no message for an in-range rep. The position lines are PROPOSAL (`ux-flow.md` 7.4).

- Notice at the top, shown before the guide: "Your surgeon turned this exercise on for you. Do it only in the range that your surgeon set. If you do not know your range, ask your surgeon first."
- Start position: "Sit on a chair with no arm rest on the camera side. Rest your thigh on the seat. Keep your foot on the floor or on a low stool."
- Leg facing the camera: "Sit side-on to the camera. Your operated leg is the leg nearest the camera."
- Hands and support: "Put your hands on the seat beside your hips."
- Range: "Move your lower leg slowly, only inside the range that your care team set: from <start> to <end> degrees of knee bend. Do not straighten your knee past that range. Hold for <hold> seconds. Then lower your foot." The values <start>, <end> and <hold> come from the protocol. If a value is missing, show "ask your surgeon" for it.
- Speed: "Move slowly up and down. The hold time starts when your leg reaches your set position. It restarts if your knee moves out of the range."
- Camera must see: "The camera must see your thigh, knee and foot. Keep your device level."
- Angle label, next to every angle on the screen: "estimated angle, not a medical measurement".
- Limit cue (the margin rule of FR8): "close to your limit, stop" when the angle is within the margin of the limit. "stop at your limit, do not push" above the limit, and the rep does not count.
- Pain and safety: the Stop button and the "knee gave way or hurts" button stay visible. If the protocol sets no pain threshold, the FR12 floor shows "pause and contact your care team".
- Red-flag text carries `GENERAL_GUIDANCE_NOTE`: "General guidance, not verified for MPFL surgery."
- Example data carries "EXAMPLE, NOT APPROVED". Without `PATIENT_USE_APPROVED`, the screen reads "Prototype. Not for patient use."

## Sources and marks

- Phase rule: P1 and P2, CONSENSUS (low), evidence level 5, population ISO and ADOL. (`research/rehab-rules.md` section 2, `research/source-audit.md` C18.)
- Guide position lines and 2D angle error: PROPOSAL. The 2D camera error is large (`research/form-evidence.md`, `research/form-opus.md` section 3). Hold time and the arc are surgeon decisions (`research/clinical.md` section 9).
- Checks not run: this answer was written read-only. `claims-check.sh` was not run and the `ste-check` was not run.
