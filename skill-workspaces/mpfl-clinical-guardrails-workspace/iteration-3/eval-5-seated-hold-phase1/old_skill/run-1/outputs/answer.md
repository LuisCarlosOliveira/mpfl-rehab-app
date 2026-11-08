# Seated knee extension hold, phase 1 after isolated MPFLR

## Short answer

The knowledge base does not support a fixed phase 1 slot for the seated knee extension hold. The app must not decide it. The protocol decides it.

- The current app and plan put the exercise in phase 2 (`research/ux-flow.md` section 7.4, label "phase 2").
- `research/clinical.md` section 2, phase 1, lists "isometric knee extension and flexion" (S1, level of evidence 5). It gives no angle, no hold time, no seat position and no dose. The seated hold is a related exercise, not the same item.
- `research/clinical.md` section 4 (table "Exercises by phase") has no row for the seated hold in phase 1.
- Open-chain knee extension loads the patellofemoral joint more at 0 and 30 degrees (S14, healthy people, N=20). The link to graft safety is UNVERIFIED (`clinical.md` section 4).
- The plan FR30 says the protocol generator makes no seated hold, because no source gives it. A generated protocol never carries this exercise.
- `clinical.md` section 9, items 6 and 7: permission to start a phase and the load limits are surgeon decisions. The app sets no default.

## Phase availability

Set no default. Use the rule below.

| Item | Rule | Source |
|---|---|---|
| Phase in which the exercise appears | Only if the care-team protocol file lists `seated-extension-hold` under phase 1. The app never adds it. | FR2, FR4, `clinical.md` section 9 |
| Active phase | Comes only from the protocol field `activePhase`. The app never changes it. | FR4 |
| Protocol lists it, and `holdSeconds` is set | Exercise is available. Hold band is the target plus the margin (start value 9 degrees, UNVERIFIED for the `lite` model). | FR8, `exercises.ts`, `form-opus.md` C5 |
| Protocol lists it, and `holdSeconds` is missing | Show "Ask your surgeon". Do not start a timer. | FR2, `exercises.ts` |
| Protocol does not list it | Not shown. | FR2 |
| Generated protocol (FR30) | Never lists it. | FR30 |
| Example protocol | Carries the banner "EXAMPLE, NOT APPROVED". Its hold time of 5 seconds is a PROPOSAL, not evidence. | FR3, `ux-flow.md` section 7.4 |
| Before `PATIENT_USE_APPROVED` | Every screen reads "Prototype. Not for patient use." | Skill, wording rules |

Say this to the product owner: the S1 isometric extension in phase 1 is a name only. Before the app offers the seated hold in phase 1, the surgeon or clinician must confirm four things in writing in the protocol. These are the phase, the knee angle band, the hold time and the load. For a patient after combined surgery, the isolated-MPFLR protocol does not apply (S23, `clinical.md` section 7).

## Guide text for the screen

This text matches `app/src/lib/guides.ts`, key `seated-extension-hold`. The seat and foot position are PROPOSAL (`ux-flow.md` section 7.4). The hold time comes from the protocol field `holdSeconds`. The text names no number and no verdict.

- **Start position.** Sit on a chair with no arm rest on the camera side. Rest your thigh on the seat. Keep your foot off the floor or on a low stool.
- **Leg facing the camera.** Sit side-on to the camera. Your operated leg is the leg nearest the camera.
- **Hands and support.** Put your hands on the seat beside your hips.
- **Movement.** Straighten your knee. Hold it for the time that your care team sets. Then lower your foot.
- **Speed.** Move slowly up and down. The hold time starts when your leg is straight. It restarts if your knee bends.
- **The camera must see.** The camera must see your thigh, knee and foot.

If the protocol sets no hold time, the screen shows: "Ask your surgeon how long to hold."

If the screen shows a limit angle, write the label next to the number: "limit set by your care team: N degrees (estimated angle, not a medical measurement)". If the protocol sets no limit, write "Ask your surgeon".

## Guardrail checks

- Wording: the text has no goal, pass, fail, milestone, score, correct, good, bad, safe or form label. A hold that reaches the set time shows no "done well" message and no green colour. The count is a number only.
- Cue near the limit: "close to your limit, stop" (rep counts) and "stop at your limit, do not push" (rep not counted), as in FR8.
- Session screen keeps a visible Stop button and a "knee gave way or hurts" button (FR11).
- Red-flag check comes first (FR5). Any "yes" blocks the session. Red-flag text carries `GENERAL_GUIDANCE_NOTE`.
- The camera asks for video only, with `audio:false`, after a button press. No frame is stored.
- Run `bash app/scripts/claims-check.sh app/src` after any change to the text. I did not run it, because this task was read-only.

## Items marked PROPOSAL or UNVERIFIED

- Placement in phase 1: no source. Needs surgeon approval.
- Seat and foot position: PROPOSAL.
- Example hold of 5 seconds: PROPOSAL.
- Hold band, target plus margin of 9 degrees: UNVERIFIED for `lite`.
- Link between knee extension load at 0 to 30 degrees and MPFL graft safety: UNVERIFIED.
