**PICO:** Isolated MPFLR (the case this answer covers). Age group and weeks since surgery not given. Question: a line of text that rates a heel slide to 95 degrees.

**Answer:** I will not write a line that says the rep was good. The rules of the skill ban a verdict word about a rep. The patient text rules ban the same words (`.claude/skills/mpfl-clinical-guardrails/SKILL.md`). The app can only describe what the camera saw. It compares that with a limit that a clinician set.

**Proposed line** (PROPOSAL, needs clinician review):

> "Your knee bent to about 95 degrees on this rep. The camera estimate can be off by several degrees."

If the care team set a limit, use this form:

> "Your knee bent to about 95 degrees. Your care team set a limit of [limit set by the care team] degrees."

Rules for this line:
- Do not use these words: good, bad, correct, wrong, safe, perfect, pass, fail, goal, milestone. Do not use a green or red verdict colour.
- Show "about" or "estimated" next to the angle. A webcam angle is not a measurement.
- Do not say whether 95 is enough or too much. No source sets a number for the app to judge against.

**Facts behind this**

| Fact | Value | Exact quote | Source id | Class | Access | Population |
|---|---|---|---|---|---|---|
| Flexion targets are passive range | 90 by 4 weeks, 120 by 6 weeks | "Achieve ≥ 90° knee flexion PROM by 4 weeks post-operation", "Achieve ≥ 120º by 6 weeks post- operation" | P2 Table 2 | CONSENSUS (low), OPINION in substance (level 5, 2015, ages 8 to 25) | VERIFIED | ISO, ADOL |
| 2D angle error | Margin about 9 to 10 degrees | F3: MAE "9.3-21.9°" in 2D. F1: LoA "±8.73" (still photos, healthy) | F3, F1 | STUDY | VERIFIED | BORROWED (healthy people) |
| Rule for the app | Treat a difference smaller than about 9 to 10 degrees as not measurable | `research/rehab-rules.md` section 9 | M2, M4, F3 | REVIEW | VERIFIED | BORROWED |

**Disagreements:** Sources give different ranges of flexion by week. P1 has no explicit 90 degree cap before week 4. N3 gives passive flexion of more than 125 degrees in weeks 0 to 6. S2 reports a restriction of 90 degrees or less within three weeks in more than half of programs. Show these as a range. Do not average. The surgeon sets the limit.

**Why not compare 95 with 90:** The P2 targets are passive range (PROM). A camera sees active motion, which is usually less. Never compare the two as one quantity (audit M3). The angle of 95 degrees is also inside the 2D error.

**Ask your surgeon:** The daily limit of knee flexion in weeks 0 to 6 and the start date (`research/clinical.md` section 9, item 1).

**Gaps:** No MPFLR source gives a rule that rates a single rep. No study tested the MediaPipe `lite` model after MPFLR. This is NONE. The literature says only that the sagittal knee angle in a side view is the most valid 2D angle (M2).
