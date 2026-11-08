# Seated knee extension hold, phase 1 after isolated MPFLR

## Phase availability

Do not offer this exercise in phase 1. Mark it "not available in phase 1 unless the surgeon enables it".

Source: `research/rehab-rules.md` section 2 (seated knee extension, open chain), grade CONSENSUS (low, evidence level 5).
- P2 rec 29 (initial phase) says to avoid short arc and long arc quadriceps work in the terminal range of 30 to 0 degrees. The reason given is stress on the reconstructed medial patellofemoral ligament.
- P1 phase 1 says "Do not perform open chain knee extension (KE)" and "Do not perform AROM open chain KE, unless cleared by surgeon".
- The protocol generator must not offer the exercise in phase 1 unless the surgeon enables it (`research/rehab-rules.md` section 2, finding for the app).

Rules for the app:
- Phase 1: the exercise is off. The protocol must carry an explicit surgeon enable and a surgeon angle. The app sets no default angle, no hold time and no phase.
- Later phases: the app offers only a mid-range hold, with the angle and the hold time from the protocol (`holdSeconds`, `minFlexion`, `targetFlexion`). The sources give an arc of 90 to 30 degrees (P2 rec 39) or 90 to 40 degrees (P1). The surgeon sets the arc. This is a CONSENSUS-level rule, not trial evidence (`research/rehab-rules.md` section 2).
- The app never changes the phase. Only the protocol field `activePhase` sets it.
- The dose (sets, reps, hold time) has no source for this exercise. Show "ask your surgeon" when the protocol does not set it (`research/clinical.md` section 9).

## Text when the protocol does not enable the exercise

"Your care team has not set this exercise for you. Ask your surgeon."

## Guide text, only when the protocol enables it

Cite: `research/ux-flow.md` section 7.4 for the seat and foot position (PROPOSAL), `research/rehab-rules.md` section 2 for the angle rule.

- Start position: "Sit on a chair with no arm rest on the camera side. Rest your thigh on the seat. Keep your foot off the floor or on a low stool."
- Leg facing the camera: "Sit side-on to the camera. Your operated leg is the leg nearest the camera."
- Hands: "Put your hands on the seat beside your hips."
- Range: "Lift your foot until your knee reaches the angle that your care team sets. Do not straighten your knee past that angle. Hold for the time that your care team sets. Then lower your foot."
- Speed: "Move slowly up and down. The hold time starts when your knee reaches the angle that your care team sets. It restarts if your knee bends more."
- Camera: "The camera must see your thigh, knee and foot."
- Angle label, next to every angle shown: "estimated angle, not a medical measurement".

The text never asks for a straight knee. It names no goal, no pass and no fail. An in-range hold shows no message.

## Open items
- A surgeon must confirm the enable flag and the arc. Until then the text is a PROPOSAL.
- Run `bash app/scripts/claims-check.sh app/src` after the change.
