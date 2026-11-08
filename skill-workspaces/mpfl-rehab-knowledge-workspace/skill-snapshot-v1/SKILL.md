---
name: mpfl-rehab-knowledge
description: Answer or check clinical, exercise, form, progression and safety questions about MPFL reconstruction rehab from the project knowledge base, with citations and evidence marks. Use before you write any clinical value, phase rule, red flag, progression criterion, screen text or protocol field in the MPFL rehab app repo. Use it also to review such a change and to add new evidence to the knowledge base.
---

# MPFL rehab knowledge

The facts live in `research/`. This skill holds no facts. It says how to query the knowledge base and how to keep it honest. Read `research/INDEX.md` first. It lists each file and what it answers.

## Answer a question

1. Find the answer in the knowledge base. Start with the file that `INDEX.md` names for the topic. Use `grep` for exact terms.
2. Give the answer with the file and section, for example "clinical.md section 3, weight-bearing". Give the evidence mark of the source: VERIFIED or UNVERIFIED, and the evidence level or study design where the file states it.
3. If the sources disagree, show each view with its source. Do not pick a side. Pick a side only when the file already decided.
4. If the knowledge base does not answer, say "not in the knowledge base". Then name the kind of source that can answer it. Do not fill the gap from memory.
5. If the answer is a surgeon decision, say "ask your surgeon". `clinical.md` section 9 lists 14 such decisions.
6. Mark any value that you suggest yourself as PROPOSAL. A PROPOSAL needs clinician review before use.

## Never

- Never give a number, angle, week or threshold that has no source in the knowledge base. A source that only covers healthy people or another condition is BORROWED. Say so.
- Never say "safe", "correct form" or "clinically validated". The guardrail skill lists the banned words.
- Never present a webcam angle as a medical measurement. The error is about 9 degrees, a start value that is UNVERIFIED for the lite model (`form-opus.md` section 3).

## Add new evidence

1. Open the source. Record the DOI or URL that you opened. If you cannot open it, mark the claim UNVERIFIED.
2. Add the fact to the file that already covers the topic. Do not create a second copy of a fact elsewhere (DRY). Link to it instead.
3. Keep the evidence level, the population and the number of participants next to the claim.
4. If a new fact contradicts an old one, keep both with their sources and add the disagreement to the table of disagreements.
5. Update `INDEX.md` if you add a file. Run `python3 ~/.claude/scripts/ste-check.py <file>` and fix every hit.

## Related

- Wording and behavior rules for screens, camera and data: `.claude/skills/mpfl-clinical-guardrails/SKILL.md`.
- The plan and its requirements: `MPFL_APP_PLAN.md`.
