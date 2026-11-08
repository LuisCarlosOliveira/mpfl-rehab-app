PICO: Case not stated. The answer covers a patient-facing screen text in the app, for any MPFL reconstruction patient (isolated or combined, any age, any week). Question: can the text "Great form, safe range reached" be shown?

Answer: No. Do not use this text. It breaks the wording rules of the app in three places.

Why it is refused:

| Part of the text | Rule | Source | Class | Mark |
|---|---|---|---|---|
| "Great form" | The app does not rate movement form. No validated form threshold exists after MPFL surgery. "Great" is a verdict word. | `.claude/skills/mpfl-clinical-guardrails/SKILL.md` (Wording); `research/form-opus.md` section 4.4 and criterion C15: "Any 'good form', 'bad form', score or colour verdict" is "Never show". Evidence: NONE. | NONE (no source supports a form verdict) | VERIFIED (rule text read) |
| "safe" | "safe" is a banned word. It tells the user that movement is without risk. No source gives a safe range for a patient. | `mpfl-clinical-guardrails` Wording; `research/form-opus.md` section 4.4 | NONE | VERIFIED |
| "range reached" | Reads as "goal reached" or "pass". A user can read it as permission to progress. Only the surgeon changes the phase. | `mpfl-clinical-guardrails` Wording ("Never show a goal, pass, fail or milestone"); `docs/clinical-limits.md` ("No form rating and no verdict") | NONE | VERIFIED |

Also:
- An in-range rep shows no message. A message such as "within range" reads as approval (`research/form-opus.md` section 4.4; `docs/clinical-limits.md`). So no replacement "all good" text is needed.
- A 2D webcam angle has an error of about 9 degrees at best (`research/form-evidence.md`, check 1). The app cannot say that a range was reached or that it is safe. It can only show an estimate against a limit.
- Any range limit is a clinician-set value. The literature range (90 degrees at 4 weeks, P1 and P2) is not an app default (`research/form-evidence.md`, check 1; `research/rehab-rules.md` section 1).
- The evidence for the limit is mostly level 5 (expert opinion) in substance. Class: OPINION. Population: BORROWED where taken from healthy people (S14 to S17, S16).

Allowed replacement (only when the care team set the limit and the rep is out of range):
- Above the limit: "Above the limit your care team set." Or "Stop at your limit, do not push." The rep is not counted (margin rule, `research/form-opus.md` section 4.3).
- Near the limit: "Close to your limit, stop."
- Below a target: "Below your target."
- Next to any angle: "Knee bend 52 degrees (estimated angle, not a medical measurement)."
These texts state what was measured against a limit. They do not judge the person. The cue wording is PROPOSAL until a clinician reviews the rule set. Do not use a green or red verdict colour or icon with them.

Disagreements: none. All sources agree. The conservative choice is to show nothing for an in-range rep.

Ask your surgeon:
- What knee bend limit applies to me, and for which exercise?
- When can I go to the next phase? (The app never decides this.)

Gaps:
- NONE: a validated form threshold after MPFL surgery. The literature says only that the range by week is a clinician decision (P2, 2015, level 5, older than 5 years).
- NONE: a source that supports a "safe range" for a patient. The app cannot claim it.

After the change, run `bash app/scripts/claims-check.sh app/src` from the repo root. It fails on banned words such as "safe" and "great" verdict text. Not run here (read-only task). The text of this answer was not run through ste-check.
