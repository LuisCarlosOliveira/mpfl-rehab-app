# Heel slide in phase 1: sources and app

Case covered: adult, isolated MPFL reconstruction (MPFLR), weeks 0 to 6. This is general information for a clinician. It is not advice for a person. The surgeon decides the knee-bend limit (`research/clinical.md` section 9, item 1: ask your surgeon).

## Sources that put the heel slide in phase 1

| Source | What it says | Access, population, design | Date |
|---|---|---|---|
| S1, Hsu 2025, IJSPT (`research/clinical.md` section 1 and section 4 table) | Phase 1 (Protection, weeks 0 to 6) lists "Heel slides, supine wall slides, heel propping/ prone hangs". The table gives a range: 0 to 30 degrees in weeks 1 to 2, then +20 to 30 degrees a week | V (the file says only the first 100,000 characters were read). MPFLR. Clinical commentary, LoE 5 (stated) | 2025 |
| P3, NHS Lothian guideline (`research/rehab-rules.md` row "Heel slide"; `research/clinical-update.md` protocol table) | Phase 1: "Commence heel slides, early static quadriceps sets/isometrics". Note: this protocol puts its phase 2 at 2 to 12 weeks, so its phase 1 is shorter than the S1 phase 1 | Protocol document, read as text. The citation audit marks it EXACT (V36). MPFLR guideline | May 2022, review due May 2027. Younger than 5 years |

The citation audit (`research/citation-audit.md`, V36) confirms the quote for S1 and P3. I did not open S1 or P3 myself. I read these checks in the knowledge base.

## Source that disagrees

- P1, HSS protocol (revised 8/2024). `research/rehab-rules.md` lists P1 as support ("heel slides in the AROM progression"). The citation audit (V37) marks that as WRONG. In P1, phase 1 uses "Sitting knee ROM exercise: AAROM KF to PROM KE". Heel slides start in phase 2: "heel slides once KF >120". This is read from the audit note, so it is second-hand. I did not open P1.
- So the sources do not agree. S1 and P3 put it in phase 1. P1 puts it in phase 2. I do not average or choose a side. The knowledge base files the P1 point as a clinician item (`docs/design-reconciliation.md`, items D6 and the open question "The heel slide in phase 1 against P1 (seated AAROM first)").
- The table in `rehab-rules.md` still says P1 supports the heel slide. That row is stale. It marks the heel slide CONSENSUS (low).

Other protocols in `clinical-update.md` (P7, P9, P10, P11) give range goals for phase 1 or week 1 to 4 (for example P11: 30 in week 1, 60 by week 2, 90 by week 4). They do not name the heel slide as an exercise, so they do not count as sources for it.

## Can the app list it in phase 1?

Yes, with limits.

- The example protocol (`app/src/lib/protocol/example-protocol.json`) lists the heel slide in phase 1. Its `source` field says: name from S1. `targetFlexion` 60, `maxFlexion` 90, `returnWithinDeg`, sets, reps and `minRepSeconds` are PROPOSAL. The surgeon sets the real value. It is an example (`"example": true`).
- The app gives no default number. If `targetFlexion` is missing, the exercise gives `ask-your-surgeon` (`app/tests/exercises.test.ts`).
- The protocol generator (FR30 in `MPFL_APP_PLAN.md`) is DESIGNED, NOT BUILT. In the design, it adds the heel slide to phase 1 only when the person gives a knee-bend limit from the surgeon. With "No limit", it adds the heel slide only from week 6 (`docs/design-reconciliation.md`, D2 and T11). Before week 6 the app needs the surgeon number.
- The reason is the P1 disagreement and rule "no source, no value". The generator design keeps the heel slide as a clinician item.

## Evidence gaps

- S1 is LoE 5 (clinical commentary). P3 is a guideline. No trial tests the heel slide in phase 1.
- The start range (0 to 30 degrees) comes from S1 only. A newer source needs a search if this file is older than 12 months.
- If a person asks about their own knee: contact your care team.
