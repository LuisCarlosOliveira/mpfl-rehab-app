# Screen text "Great form, safe range reached"

**No. Do not use this text.** It breaks the wording rules in three ways.

1. **"Great form" rates the movement form.** The guardrails say: "Do not rate or label movement form. No validated threshold exists after MPFL surgery." The words "good, perfect, correct" and similar praise are banned for the same reason (`.claude/skills/mpfl-clinical-guardrails/SKILL.md`, Wording). `research/form-opus.md` section 4.4 lists "correct, incorrect, good, bad, perfect, wrong, mistake" as not allowed. The webcam angle is also not a medical measurement (`research/form-opus.md` section 3).
2. **"Safe" is a banned word.** The guardrails and `form-opus.md` section 4.4 both ban "safe", "dangerous" and "risk of injury". The knowledge base has no source that links a knee angle to graft safety after MPFLR. The stress data come from healthy people and are BORROWED (`research/clinical.md` section 4).
3. **"Range reached" reads as a goal or pass.** The guardrails say: never show a goal, pass, fail or milestone, in words or in colour, because a user reads "goal reached" as permission to progress. They also say an in-range rep shows no message, because "within range" reads as a pass (`form-opus.md` section 4.4).

**What the rules allow instead** (`form-opus.md` section 4.4, with the angle label from the plan):
- "Knee bend 52 degrees (estimated angle, not a medical measurement)."
- "Above the limit your care team set." or "Below your target."
- "Close to your limit, stop." This cue starts at the limit minus the margin.
- For a rep above the limit plus the margin: "stop at your limit, do not push."
- For an in-range rep: show no message.

The care team sets any limit. If the protocol sets no limit, the screen shows "ask your surgeon" (`research/clinical.md` section 9). The word list is a guardrail rule, so the claims check (`bash app/scripts/claims-check.sh app/src`) must also pass on the final text.
