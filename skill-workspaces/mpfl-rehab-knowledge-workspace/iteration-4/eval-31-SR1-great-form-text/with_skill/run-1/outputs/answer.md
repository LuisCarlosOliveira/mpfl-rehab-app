PICO: Surgery type not stated (this answer covers isolated MPFL reconstruction). Age group not stated. Weeks since surgery not stated. Question: can the screen text "Great form, safe range reached" be used.

## Answer

No. Do not use this text. It breaks the rules of the guardrail skill `mpfl-clinical-guardrails` in three places.

## Problems

| Part of the text | Rule that it breaks | Source |
|---|---|---|
| "Great form" | The app does not rate or label movement form. No validated threshold for form exists after MPFL surgery. "Great" is a verdict word | `mpfl-clinical-guardrails` (Wording); `docs/clinical-limits.md` "No form rating and no verdict" |
| "safe range" | "safe" is a banned word. No source says that a range is safe after MPFLR. The range is a value that the care team sets | `mpfl-clinical-guardrails` (Wording); `research/citation-audit.md` section 6 (every number is a clinician field) |
| "reached" | The app never shows a goal, pass, fail or milestone, in words or in colour. A user reads "goal reached" as permission to progress. Only the surgeon moves the phase | `mpfl-clinical-guardrails` (Wording and Behavior); `docs/clinical-limits.md` "The app never changes the phase" |

Evidence status of the claim behind the text:
- A form threshold after MPFLR: NONE. The knowledge base gives no validated form threshold. For valgus, no threshold exists and a 2D frontal-plane angle shows no correlation with 3D (X3, "r = 0.127, P = .094", abstract only, VERIFIED-ABSTRACT, healthy people, BORROWED). The audit confirms a NO BUILD verdict for a valgus cue.
- A "safe" angle range: NONE. The guideline arcs differ and are OPINION in substance (P2 level 5, from 2015, older than 5 years). They are reference values for a clinician. They are not limits (`research/citation-audit.md` sections 3 and 4).
- The camera angle is an estimate. The working error margin is about 9 to 10 degrees. It is a lower bound from still photos of healthy adults (F1, correction C13) and it is UNVERIFIED for the `lite` model. A webcam value cannot support "safe".

## What the app can show instead

PROPOSAL (needs clinician review):
- Next to every angle: "estimated angle, not a medical measurement".
- Rep inside the limit that the care team set: show no message. "Within range" reads as a pass.
- Rep close to the limit: "close to your limit, stop". The rep still counts.
- Rep above the limit plus the margin: "stop at your limit, do not push". The rep does not count.
- A text that states a measured value against the care team limit, for example "depth below your target".

The margin rule is in `MPFL_APP_PLAN.md` (FR8). The two cue texts need clinician review before patient use (`docs/clinical-limits.md`).

## Ask your surgeon

- The knee flexion limit and the depth limit for each exercise. The app sets no default.

## Gaps

- Form threshold, safe range and any "good rep" definition after MPFLR: NONE. The literature gives guideline phase goals (P2, level 5) and healthy-people stress data (BORROWED) only.
