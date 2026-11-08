PICO: Isolated MPFLR (assumed, the prompt does not say), adult (assumed), weeks since surgery not given, question: screen line after a heel slide to 95 degrees.

Answer: I cannot write a line that says the rep was good. The app never gives a verdict on a rep. The guardrails ban "good", "correct", "perfect", "pass" and "goal reached" in screen text. A patient can read such a word as permission to progress, and only the surgeon decides that.

Line that the app can show (PROPOSAL, needs clinician review):

"Rep 3 counted. Estimated peak angle: 95 degrees (estimated angle, not a medical measurement)."

Rules for this line:
- If no clinician limit is set, show the angle and the count only. Set no default limit.
- If the clinician set a ceiling (maxFlexion) and the rep is within range, show no message. "Within range" reads as a pass (mpfl-clinical-guardrails, Wording).
- If the rep is above the ceiling plus the margin, the cue is "stop at your limit, do not push". The rep does not count (FR8).
- Do not compare 95 degrees with the 90 degree target of P2. That target is passive range. The camera measures active motion (citation-audit.md section 6).
- Do not use green or a tick as a verdict colour.

| Fact | Quote | Source id | Class | Mark | Population |
|---|---|---|---|---|---|
| Heel slide is allowed in the first phase | "Heel slides, supine wall slides, heel propping/ prone hangs" (S1 Table 1 phase 1, as quoted in rehab-rules.md) | S1, P3, P1 | CONSENSUS (low, level 5, OPINION in substance) | VERIFIED per rehab-rules.md | ISO |
| 2D knee angle error in exercise video | MAE "9.3-21.9°" | F3 Rode 2025 (form-evidence.md, rehab-rules.md section 9) | STUDY | VERIFIED | 25 healthy, BORROWED |
| 2D angle error, still photos, best case | LoA "±8.73" and "±8.80" degrees | F1 Okuno 2026 | STUDY | VERIFIED | 20 healthy, BORROWED |

So the 95 degree value carries an error of about 9 degrees or more. A difference below 9 to 10 degrees cannot be told. The 95 degrees is an estimate and never a measurement.

Disagreements: none for this line. The conservative choice is to show the number and no verdict.

Ask your surgeon: what is my knee bend limit for heel slides now, and when can it rise?

Gaps:
- NONE: no validated threshold for a good heel slide rep after MPFL surgery. The literature gives only range targets by week (P1, P2: about 90 degrees at 4 weeks), and these are passive goniometer values.
- NONE: no study of the MediaPipe lite model, and none of 2D pose in patients after MPFLR.

Not checked: this answer was not run through ste-check.py or claims-check.sh.
