---
name: mpfl-rehab-knowledge
description: Answer or check clinical, exercise, form, progression and safety questions about MPFL reconstruction rehab from the project knowledge base, with citations and evidence marks. Use before you write any clinical value, phase rule, red flag, progression criterion, screen text or protocol field in the MPFL rehab app repo. Use it also to review such a change and to add new evidence to the knowledge base. Use it when a person asks what to do about their own knee.
---

# MPFL rehab knowledge

The facts live in `research/`. This skill holds no facts. It sets the method. Read `research/INDEX.md` first. It lists each file, the evidence legend and what each file answers.

## Refuse treatment advice

You give no treatment advice to a person. Do not choose a protocol, a limit, a load or a date for a patient. If a question describes a symptom that is happening now, answer only this: contact your care team now. If the symptom is in the emergency list of `research/clinical.md` section 7, say to call emergency services. Give no other content. The app and this skill support a clinician. They do not replace one.

## Answer a question

1. Restate the question in PICO form: surgery type (isolated or combined), age group (adult or adolescent), intervention, comparison, outcome, and weeks since surgery. If the question does not give these, answer for each case, or say which case the answer covers.
2. Find the answer in the knowledge base. Start with the file that `INDEX.md` names for the topic. Use `grep` for exact terms.
3. Cite the file and section. Give the access mark, the population class and the design or level of evidence, as the legend in `INDEX.md` defines them.
4. Give the source date of each protocol or guideline. Flag a source older than 5 years. Say that a newer version needs a search.
5. If sources disagree, show the range and the source of each value. Never average values from different sources. Rank by how well the population matches, then by design. Pick a side only when the file already decided.
6. If the knowledge base does not answer, say "not in the knowledge base". Then name the kind of source that can answer it. Do not fill the gap from memory.
7. If the answer is a surgeon decision, say "ask your surgeon". The list is in `research/clinical.md` section 9.
8. Mark any value that you suggest yourself as PROPOSAL. A PROPOSAL needs clinician review before use.

## Never

- Never give a number, angle, week or threshold that has no source in the knowledge base. A source that covers only healthy people or another condition is BORROWED. Say so.
- Never say "safe", "correct form" or "clinically validated". The guardrail skill lists the banned words.
- Never present a webcam angle as a medical measurement. The error estimate is in `research/form-opus.md` section 3.

## Add new evidence

1. Open the source. Record the URL that you opened and the access mark. Never write a DOI or PMID from memory. A search-engine summary is not a source. A claim that you read in a review is second-hand.
2. If you cannot open the source, or the user gave no link, mark the claim UNVERIFIED and ask for the link.
3. Add the fact to the file that already covers the topic. Do not create a second copy of a fact elsewhere (DRY). Link to it instead.
4. Keep the study design, the population and the number of participants next to the claim. Record the source date.
5. If a new fact contradicts an old one, keep both with their sources and add the disagreement to the table of disagreements.
6. Update `INDEX.md` if you add a file. Run `python3 ~/.claude/scripts/ste-check.py <file>` and fix every hit.
7. Each research file states the date of its last search. Repeat the search for a file before a release, or after 12 months.

## Related

- Wording and behavior rules for screens, camera and data: `.claude/skills/mpfl-clinical-guardrails/SKILL.md`.
- The test prompts of this skill: `evals/evals.json`. Run them after a change to this skill or to the knowledge base.
