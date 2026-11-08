# Default weight-bearing schedule: not done, and what to build instead

I did not fill the template with a default weight-bearing schedule by week. The generator must not set one.

## Why

- Weight-bearing status and crutch use are a surgeon decision. The knowledge base lists them as item 2 of "What the app must leave to the surgeon" (`research/clinical.md` section 9). The rule is: show "ask your surgeon" and set no default.
- No source supports a default. The N1 Delphi found no consensus on weight-bearing (`research/rehab-rules.md` section 1, mark NONE for a consensus). Practice only favors weight-bearing as tolerated for isolated MPFL reconstruction (S10: 23 of 35 protocols, 66 percent). That is REVIEW evidence of practice. It is not a rule.
- The literature range is wide. Full weight-bearing starts from 0 to 8 weeks (S1). Older studies mostly limited it (S3 and S2).
- Combined surgery changes it. TTO, cartilage work and lateral lengthening need a protective protocol. S10 reports delayed or non-weight-bearing in 56 percent of TTO protocols. The app must not apply an isolated protocol to these patients and must require a surgeon protocol (`research/rehab-rules.md` section 1, combined surgery row).
- A default that looks like a clinical week-by-week plan can lead a patient to load a graft too early or too late. This would be treatment advice. The app never decides treatment (skill `mpfl-clinical-guardrails`).
- A number would also carry no VERIFIED source with an evidence class. Without that, it is a PROPOSAL and never an app rule.

## What to build so the generator is never "empty"

1. Make weight-bearing a protocol field per phase or per week that only a clinician sets. The field has no default value.
2. When the field is not set, show the text "Weight-bearing: ask your surgeon". Do not show a blank, a number or a percentage. This text is not a clinical default, so the template is never empty.
3. Mark the protocol as incomplete when this field is missing. Keep the "Prototype. Not for patient use." banner until `PATIENT_USE_APPROVED` is set.
4. For example data, use the banner "EXAMPLE, NOT APPROVED". An example schedule is allowed only with this banner and a note that a surgeon must replace it. Cite the source of each value, or mark it PROPOSAL or UNVERIFIED. Do not copy an institution protocol marked UNVERIFIED in the knowledge base (for example UVA, Lahey, Mayo 2025).
5. Add a combined-surgery switch (TTO, cartilage, lateral lengthening). If it is on, require the surgeon protocol. Do not generate from an isolated-surgery template.
6. Do not use words such as "safe", "goal", "pass" or "milestone" in the screen text of this field. Run `bash app/scripts/claims-check.sh app/src` after the change.

## What the app can still show

The app can show red flags from `src/lib/redflags.ts`. One of them is the inability to bear weight. It tells the user to contact the care team or emergency services. The app does not interpret it.

If the user wants a reference range for the surgeon to review, I can add it as clearly labeled background text with its source (S1, S10, N1) and the mark REVIEW. It cannot be a default value in the protocol.
