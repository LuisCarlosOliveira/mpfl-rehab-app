# Seated knee extension hold: phase 1 after isolated MPFLR

## Phase availability

The seated knee extension hold is NOT available in phase 1. The app does not offer it unless the surgeon enables it in the protocol.

Reason (`research/rehab-rules.md` section 2, row "Seated knee extension (open chain)", mark CONSENSUS (low), evidence level 5, population ISO):
- P2 (VERIFIED) rec 29, initial phase: open-chain extension "in the terminal range of 30° to 0° [is] avoided to minimize stress to the reconstructed medial patellofemoral ligament".
- P1 (VERIFIED) phase 1: "Do not perform open chain knee extension (KE)" and "Do not perform AROM open chain KE, unless cleared by surgeon".
- Two guidelines agree. This is consensus, not trial evidence.

Rules for the protocol:
- Phase 1: the exercise is absent from `exercises` unless the surgeon adds it. If the exercise is listed, the clinician must set `holdSeconds`, `minFlexion` and `targetFlexion`. The app sets no default (`exercises.ts` returns `ask-your-surgeon` when one is missing).
- When the exercise is not enabled, the screen shows: "Ask your surgeon. This exercise is not part of your plan."
- Later phases: only a mid-range arc that the surgeon sets (the sources give 90 to 30 degrees in P2 rec 39 and 90 to 40 degrees in P1, with surgeon clearance). The app never picks the arc. Graduating to a later phase is never automatic. Only the protocol field `activePhase` sets the phase (surgeon decisions 6 and 7 in `research/clinical.md` section 9).
- Note: `research/ux-flow.md` has an older guide text for this hold that conflicts with this rule (`INDEX-v2.md` says so). Use the text below. It matches `app/src/lib/guides.ts`.

## Guide text (shown only when the surgeon has enabled the exercise)

The text never asks for a straight knee, because P1 and P2 avoid extension to full extension early. The seat and foot position are PROPOSAL (`ux-flow.md` section 7.4). The angle and the hold time come from the protocol.

- Start position: Sit on a chair with no arm rest on the camera side. Rest your thigh on the seat. Keep your foot off the floor or on a low stool.
- Leg facing the camera: Sit side-on to the camera. Your operated leg is the leg nearest the camera.
- Hands: Put your hands on the seat beside your hips.
- Range: Lift your foot until your knee reaches the angle that your care team sets. Do not straighten your knee past that angle. Hold for the time that your care team sets. Then lower your foot.
- Speed: Move slowly up and down. The hold time starts when your knee reaches the angle that your care team sets. It restarts if your knee bends more.
- Camera: The camera must see your thigh, knee and foot.
- Hold restart cue: "The knee left the hold angle. The hold timer starts again."
- Next to every angle on screen: "estimated angle, not a medical measurement".

The text uses no verdict words and no goal. A finished hold shows no "well done" or "goal reached" message. The screen always has a visible Stop button and a "knee gave way or hurts" button. The red-flag check and the pain and swelling pause rule (FR12) apply as for every exercise.

Status: the availability rule is CONSENSUS (low), from P1 and P2. The guide sentences are PROPOSAL where marked. A clinician must review them. No dose or hold time is given, because no opened source gives one for this exercise.
