## Sources that put the heel slide in phase 1

Two sources do, and the citation audit rates both as exact:

- **S1** (Hsu CJ et al., IJSPT 2025, clinical commentary, LoE 5). Table 1, phase 1 (0 to 6 weeks), lists "Heel slides, supine wall slides, heel propping/ prone hangs".
- **P3** (NHS Lothian MPFL guideline, May 2022). Phase 1 says "Commence heel slides, early static quadriceps sets/isometrics".

The knowledge base marks this "Allowed in the first phase", CONSENSUS (low). The evidence is low-level guidelines and expert opinion. Neither source gives a dose, a tempo or a hold time.

## A source that does not

**P1** (HSS MPFL guideline) does not support phase 1. An older row in `research/rehab-rules.md` cited P1 ("heel slides in the AROM progression") as support. Citation audit item V37 rates that WRONG. P1 phase 1 uses "Sitting knee ROM exercise: AAROM KF to PROM KE". P1 starts heel slides in phase 2, "heel slides once KF >120". So P1 disagrees with S1 and P3.

**P2** (Cincinnati) does not name the heel slide in phase 1. It has a "supine wall slide with feet on wall" in Appendix 1a. It also gives passive range targets (at least 90 degrees by 4 weeks, at least 120 degrees by 6 weeks). Those targets are not heel slide placement.

Short answer: S1 and P3 agree on phase 1. P1 disagrees and puts it in phase 2. The docs list the disagreement as an open item for a clinician (`docs/design-reconciliation.md`, "The heel slide in phase 1 against P1").

## Can the app list it in phase 1?

Yes, with conditions.

- **The schema allows it.** A phase holds any of the four exercise kinds. The only rule is one entry for each exercise in a phase. `example-protocol.json` puts a heel slide in phase 1 ("Protection"). Its numbers (60, 90, 3 sets of 10) are PROPOSAL values for the example, not sourced.
- **The protocol generator is gated.** The design (`docs/protocol-generator-design.md`, G5 and G7, changed 2026-11-08 after the audit) generates the heel slide in phase 1 only if the person gives a surgeon knee-bend limit (question I9). With "No limit" or "I do not know", it is left out before week 6, with the text "Ask your surgeon". "No limit" adds it from week 6, with no `maxFlexion`.
- **The app sets no numbers of its own.** It sets no ceiling, no dose, no rep tempo and no range cap by week. The surgeon or the care team gives them. The knee bend limit comes from the surgeon.
- **Why the gate:** the placement is only CONSENSUS (low) and P1 disagrees. The week 0 to 6 flexion limit is a surgeon decision.
- **Wording:** the app can say that S1 and P3 list the heel slide in phase 1. It must not say that all guidelines agree. It must not present the app plan as a rehab plan or as medical advice.
