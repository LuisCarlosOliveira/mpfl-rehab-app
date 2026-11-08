---
name: mpfl-clinical-guardrails
description: Safety and wording rules for the MPFL rehabilitation app. Use whenever you write or change any screen text, protocol field, red-flag logic, pain or swelling rule, export, camera code or counter in this repo. Also use when you review such a change. It keeps the app from giving treatment advice, from implying clinical validation, and from storing video.
---

# MPFL app guardrails

The app counts reps and estimates knee angle from a 2D webcam. The error is about 9 degrees or more. A surgeon sets the protocol. The app never decides treatment. These rules keep that true. The evidence is in `research/clinical.md` and the plan is `MPFL_APP_PLAN.md`.

## Wording
- Next to every angle, write: "estimated angle, not a medical measurement".
- Never write "clinically validated", "clinically proven" or "medically accurate".
- Never show a goal, pass, fail or milestone, in words or in colour. A user reads "goal reached" as permission to progress.
- Never judge form. Do not write "correct form", "incorrect form", "good form", "bad form" or "perfect form". No validated threshold exists. A cue states what was measured, for example "depth below your target".
- Never call a webcam comparison "LSI". LSI needs strength tests. Write "movement symmetry".
- Show every surgeon decision as "ask your surgeon" when the protocol does not set it. Set no default. The 14 decisions are in `research/clinical.md` section 9.
- Mark red-flag text "general guidance, not verified for MPFL surgery".
- Example data carries the banner "EXAMPLE, NOT APPROVED". Without `PATIENT_USE_APPROVED`, every screen reads "Prototype. Not for patient use."

## Behavior
- The app never changes the active phase. Only the protocol field `activePhase` sets it.
- Red flags come from `src/lib/redflags.ts` in two groups: care team and emergency services. Any "yes" blocks the session.
- Safety floor with no protocol threshold: pain 7 or more, or swelling "more than before", shows "pause and contact your care team". This is an app rule and not a clinical default.
- A rep above `maxFlexion` shows an alert and does not count. The cue is "stop at your limit, do not push".
- A session always has a visible Stop button and a "knee gave way or hurts" button.

## Camera and data
- Ask for video only: `getUserMedia` with `audio:false`, after a button press.
- Stop all tracks on session end, `visibilitychange`, `pagehide`, route change and error.
- Never store or send a frame. Never use `MediaRecorder`, `toBlob`, `toDataURL` or `ImageCapture`.
- Render file data as plain text. Never use `dangerouslySetInnerHTML` or a link from file data.
- Exports carry `angleMethod`, `schemaVersion` and a random pseudonymous id. They carry no name or free text. Quote CSV cells that start with `=`, `+`, `-`, `@`, tab or carriage return.

## Check
Run `bash app/scripts/claims-check.sh app/src` after each change. It fails on banned phrases and banned APIs. A line that must keep a banned string, for example in a test about this rule, ends with the marker `claims-check:allow`.
