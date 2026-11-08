PICO: isolated MPFL reconstruction, adult (P2 covers ages 8 to 25), weeks 0 to 6 (phase 1). Question: which sources place the heel slide in phase 1, and can the app list it there.

## Answer

Two sources put the heel slide in phase 1: S1 and P3. The earlier knowledge base also named P1, but the independent audit marked that as WRONG (row V37), so P1 does not support it. The app can list the heel slide in phase 1 only as a gated item. The surgeon must give a knee-bend limit. Without it, the app must not list it before week 6.

## Facts

| Value | Exact quote | Source id | Class | Mark | Population |
|---|---|---|---|---|---|
| Heel slide in phase 1 | "Heel slides, supine wall slides, heel propping/ prone hangs" (S1 Table 1, phase 1, 0 to 6 weeks, as quoted in `research/rehab-rules.md` section 2) | S1 (Hsu 2025, IJSPT, PMC12222034), `rehab-rules.md` section 2, audit row V36 | OPINION (level of evidence 5) | VERIFIED (full text) | ISO |
| Heel slide in phase 1 | "Commence heel slides, early static quadriceps sets/isometrics" (P3, phase 1) | P3 (NHS Lothian, May 2022), audit rows V36 and V8 | OPINION (the guideline calls itself "based on limited evidence and expert opinion") | VERIFIED (full PDF) | ISO |
| Heel slide NOT in phase 1 | P1 phase 1 uses "Sitting knee ROM exercise: AAROM KF to PROM KE". Heel slides start in phase 2: "heel slides once KF >120" | P1 (HSS, revised 8/2024), `citation-audit.md` row V37 | OPINION | VERIFIED (full PDF) | no age limit stated |
| Heel slide in the P2 appendix | "supine wall slide with feet on wall" (a related exercise, not named a heel slide, no phase quote read) | P2 Appendix 1a, via `docs/protocol-generator-design.md` G5 | OPINION | Not rechecked by the audit rows I read | ISO, ADOL |

Correction note: `research/rehab-rules.md` section 2 still says "P1: heel slides in the AROM progression" and marks the rule CONSENSUS (low). The audit (V37) overrides that line. Condition 4 of audit section 6 lists V37 as a correction that applies. The mark "Agree? Yes" in that row is therefore too strong. Two sources agree (S1, P3). One source (P1) disagrees. Both agreeing sources are level 5 opinion.

## Disagreements

- S1 and P3 say phase 1. P1 says phase 2, once knee flexion is above 120 degrees.
- Conservative value: do not list the heel slide in phase 1 unless the surgeon gives a knee-bend range. Never average the sources.
- The sources do not give a ceiling for phase 1. P1 says "Avoid KF ROM beyond surgeon guidelines". The base text "no more than 90 degrees in weeks 0 to 4" is PARAPHRASED (V14). P1 has no explicit 90 degree cap. S1 says "Typically, patients start 0°-30° in the first or second week and progress by 20°- 30° per week" (V10).
- Flexion targets of P2 (90 degrees by 4 weeks, 120 by 6 weeks) are passive range (PROM). The camera sees active motion. Do not compare them as one quantity.

## Can the app list it in phase 1?

Yes, with a gate. This follows the design in `docs/protocol-generator-design.md` (G5, G7, I9, changed 2026-11-08 after the audit).

- The generator adds the heel slide only if the person gives a surgeon limit for knee bend (`maxFlexion`).
- If the answer is "No limit" before week 6, the heel slide stays out and the screen says "Ask your surgeon". From week 6 it can be listed without `maxFlexion`.
- The app code does not block it by phase. In `app/src/lib/protocol/schema.ts`, `EXERCISE_KINDS` includes `heel-slide`, and the schema has no rule that ties an exercise to a phase. The example file `app/src/lib/protocol/example-protocol.json` puts the heel slide in phase 1. It marks every value except the exercise name as PROPOSAL.
- The reason for the gate: P1 disagrees, every source is OPINION, and the audit allows every number only as a clinician-set value (audit section 6, conditions 1 and 2).
- The app never picks the phase or the ceiling for a patient. Phase and limit are surgeon decisions. A change in phase is also a surgeon decision.
- The source field of the heel slide must name S1 and P3 for the exercise name. It must not name P1 as support. It must mark sets, reps, targetFlexion, maxFlexion and returnWithinDeg as PROPOSAL or as surgeon value.
- A combined surgery (TTO, trochleoplasty, cartilage) must not get this template. P2 excludes it, and P1 says "Follow most conservative guideline". A surgeon protocol is required.

## Ask your surgeon

- Which exercises are allowed in the first weeks, and is the heel slide one of them.
- How far can you bend your knee now, also with a brace.
- When can that limit change.

## Gaps

- Heel slide dose (sets, reps, hold, tempo): NONE. P2 rec 26 gives "2 sets of 10-15 repetitions" for strengthening in general, level 5, ages 8 to 25. It is not a heel slide source.
- A phase 1 ceiling for the heel slide: NONE as a firm number. The literature gives a range of practice only (R3: 90 degrees at a mean of 1.4 weeks; S2: restriction to 90 degrees within three weeks in more than half of programmes; N3: passive flexion above 125 degrees in weeks 0 to 6).
- BASK 2021 (G1) was not read. It is UNVERIFIED and cannot support a rule. AWMF S2e was not readable.
- The knowledge base has no outcome study that compares heel slides in phase 1 with later start.
