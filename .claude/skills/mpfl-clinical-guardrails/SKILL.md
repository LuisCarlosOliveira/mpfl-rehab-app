---
name: mpfl-clinical-guardrails
description: Safety and wording rules for the MPFL rehabilitation app. Use whenever you write or change any screen text, protocol field, red-flag logic, pain or swelling rule, export, camera code or counter in this repo. Also use when you review such a change. It keeps the app from giving treatment advice, from implying clinical validation, and from storing video.
---

# MPFL app guardrails

The app counts reps and estimates knee angle from a 2D webcam. The error estimate is in `research/form-opus.md` section 3. A surgeon sets the protocol. The app never decides treatment. These rules keep that true. The evidence is in `research/clinical.md` and the plan is `MPFL_APP_PLAN.md`.

## Before you write
Read `research/INDEX-v2.md`. Cite a section of the knowledge base for each clinical value, flow step or screen text, or mark it PROPOSAL or UNVERIFIED. A clinical rule or value needs a VERIFIED source id with its evidence class. An UNVERIFIED source, or a class of NONE, gives a PROPOSAL and never an app rule. Use the skill `mpfl-rehab-knowledge` for the sources. Cover the user flow in each design: inputs, measuring, position guidance, camera setup. Keep it KISS and DRY.

## Wording
- Next to every angle, write: "estimated angle, not a medical measurement".
- Never write "clinically validated", "clinically proven" or "medically accurate".
- Never show a goal, pass, fail or milestone, in words or in colour. A user reads "goal reached" as permission to progress.
- Do not rate or label movement form. No validated threshold exists after MPFL surgery. A cue states what was measured against a limit that the care team set, for example "depth below your target".
- Do not use these words in screen text: correct, incorrect, good, bad, perfect, wrong, mistake. Also banned: safe, dangerous, risk of injury, score, grade, pass, fail, goal, milestone. Do not use a green or red verdict colour.
- An in-range rep shows no message. "Within range" reads as a pass.
- Compare a measured angle with a limit using the margin rule in `MPFL_APP_PLAN.md` (FR8). The margin and its status are stated there. The safety side warns early. The counting side gives the benefit of the doubt.
- Never call a webcam comparison "LSI". LSI needs strength tests. Write "movement symmetry".
- A pain stop value is an app rule or a clinician value. It is never an evidence default. The 5 of 10 model is BORROWED from tendon and patellofemoral pain (`research/rehab-rules.md` section 4).
- Show every surgeon decision as "ask your surgeon" when the protocol does not set it. Set no default. The surgeon decisions are in `research/clinical.md` section 9.
- Mark red-flag text with the note that `src/lib/redflags.ts` holds (`GENERAL_GUIDANCE_NOTE`).
- Example data carries the banner "EXAMPLE, NOT APPROVED". Without `PATIENT_USE_APPROVED`, every screen reads "Prototype. Not for patient use."

## Behavior
- Every clinical number in a protocol is a field that a clinician sets. The app enforces only protective defaults and referrals. Never compare a passive-range target (the P2 flexion goals) with an active camera angle (`research/citation-audit.md` section 6).
- The seated knee extension hold needs a clinician arc. Do not offer it in phase 1 unless the surgeon enables it. P1 and P2 say to avoid open-chain extension to full extension early (`research/rehab-rules.md` section 2). Later, offer only a mid-range arc that the surgeon sets.
- The app never changes the active phase. Only the protocol field `activePhase` sets it.
- Red flags come from `src/lib/redflags.ts` in two groups: care team and emergency services. Any "yes" blocks the session.
- The safety floor of FR12 in `MPFL_APP_PLAN.md` applies when the protocol sets no pain threshold. It shows "pause and contact your care team". It is an app rule and not a clinical default. The pain value is stated in FR12 only.
- A rep above `maxFlexion` plus the margin shows an alert and does not count. The cue is "stop at your limit, do not push". The cue "close to your limit, stop" starts at the limit minus the margin, and the rep still counts (FR8).
- A session always has a visible Stop button and a "knee gave way or hurts" button.

## Camera and data
- Ask for video only: `getUserMedia` with `audio:false`, after a button press.
- Stop all tracks on session end, `visibilitychange`, `pagehide`, route change and error.
- Never store or send a frame. Never use `MediaRecorder`, `toBlob`, `toDataURL` or `ImageCapture`.
- Render file data as plain text. Never use `dangerouslySetInnerHTML` or a link from file data.
- Exports carry `angleMethod`, `schemaVersion` and a random pseudonymous id. They carry no name or free text. Quote CSV cells that start with `=`, `+`, `-`, `@`, tab or carriage return.

## Check
Run `bash app/scripts/claims-check.sh app/src` from the repo root after each change. It fails on banned phrases, banned APIs, a verdict word in patient text, and a path that does not exist. A line that must keep a banned string, for example in a test about this rule, ends with the marker `claims-check:allow`.
