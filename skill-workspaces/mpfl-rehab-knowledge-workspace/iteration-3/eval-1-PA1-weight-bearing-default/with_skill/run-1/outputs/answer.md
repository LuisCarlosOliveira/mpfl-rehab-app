PICO: Isolated MPFLR (no bone or cartilage procedure), adult (18 or more), phase 1 (weeks 0 to 6), question: which weight-bearing default does the protocol generator set.

## Answer

Set no weight-bearing default. Make weight-bearing a field that the surgeon sets, and show "ask your surgeon" until the surgeon fills it.

The knowledge base gives no consensus on weight-bearing after MPFLR. It gives only the range of practice. Weight-bearing as tolerated (WBAT) is the most common practice. It is not a consensus, and the app must not present it as the default.

This answer holds for isolated MPFLR only. If the surgery is combined (tibial tubercle osteotomy, trochleoplasty, cartilage procedure, lateral release), do not use any value below. A surgeon protocol is required.

## Facts

| Fact | Exact quote | Source id | Class | Access | Population |
|---|---|---|---|---|---|
| No consensus exists | "no consensus on postoperative immobilization or weightbearing" | N1 (Hurley 2023 Delphi, 60 surgeons), abstract. Cited in `research/rehab-rules.md` section 1 | CONSENSUS (that none exists) | VERIFIED (abstract). Statement text is NOT READABLE (paywall) | ISO |
| Most protocols allow WBAT | Immediate WBAT "23 (66%)", PWB "9 (26%)", NWB or delayed "2 (6%)" of 35 protocols | S10 (Vidra 2026), Table 2 (audit row V20, EXACT) | REVIEW of practice, not of outcome | VERIFIED | ISO |
| Most protocols allow WBAT | "Twenty protocols (65%) allowed for weight-bearing as tolerated" | R3 (Lightsey 2018), abstract (V21, EXACT) | REVIEW of practice | VERIFIED (abstract) | MPFLR |
| One source says no limit | "weight-bearing following the surgery is usually not limited"; the literature range is "full weight-bearing from 0 to 8 weeks" | S1 (Hsu 2025), text (V22, EXACT) | OPINION (level 5) | VERIFIED | ISO and COMB |
| S1 disagrees with itself | The conclusion says initial bracing "with gradual progression to full weight-bearing is required during the protection phase" | S1 conclusion (correction C1 in `research/source-audit.md`) | OPINION | VERIFIED | ISO and COMB |
| One comparison study | "3 recurrent dislocations ... (2.4%), all of which occurred in the restrictive rehabilitation group" (123 knees) | S7, abstract (V24, EXACT) | STUDY. One study, not a rule | VERIFIED (abstract) | ISO |
| Combined surgery is more protective | TTO protocols "recommended delayed or non weight bearing (56%)" | S10 abstract (V31, EXACT) | REVIEW of practice | VERIFIED | COMB |

## Disagreements

Readable guidance gives different values. Each value is shown with its source. I do not average them.

| Source | Weight-bearing in early weeks | Class |
|---|---|---|
| P1 (HSS, revised 8/2024) | WBAT, brace locked, crutches at least 2 weeks | OPINION |
| P2 (Cincinnati, January 2015, ages 8 to 25) | Per surgeon | OPINION. It gives no value |
| P3 (NHS Lothian, May 2022) | WBAT | OPINION |
| P4 (Mass General Brigham, pediatric) | 25 percent with crutches, weeks 0 to 2 | OPINION. ADOL |
| P7 (Banff) | About half body weight, then full as tolerated | OPINION |
| P12 (Connecticut Children's, MPFLR plus lateral lengthening) | Touchdown for 2 weeks | OPINION. COMB, not usable for isolated surgery |

These P rows come from the protocol table in `research/clinical-update.md` section 3.1. The citation audit did not check P4 to P13 (citation-audit section 2, note under the table). Treat them as range of practice only.

The conservative value is partial weight-bearing until the surgeon sets the status (`research/rehab-rules.md` section 1, weight-bearing row). It is the value that loads the knee less. It is not a recommended default. A restrictive limit also has a cost: S7 is one study, and no trial compares weight-bearing schedules after isolated MPFLR (`research/clinical-update.md` section 2.1).

## Why no default

- No validated protocol exists (S1, S2). The mark for a weight-bearing consensus is NONE (`research/rehab-rules.md` section 1).
- `research/clinical.md` section 9, item 2, lists weight-bearing status and crutch use as an item that the app leaves to the surgeon, with no default.
- The audit says every number is a field that the clinician sets. The app enforces only protective defaults and referrals (`research/citation-audit.md` section 6). Weight-bearing is not one of those protective defaults. The protective defaults are no terminal open-chain extension, the combined-surgery block and the red-flag referral.
- The app never chooses a phase, a limit, a load or a date for a patient.
- Population: all numbers above are from MPFLR sources. No adult-specific weight-bearing source exists in the knowledge base. P2 covers ages 8 to 25 only, and it gives no value for weight-bearing.

## Suggested generator behavior (PROPOSAL, needs clinician review)

- Field "Weight-bearing status": empty, with the text "Ask your surgeon". Allowed values come from the surgeon: for example non, touchdown, partial, as tolerated.
- Show the range of practice as a reference for the clinician, with the counts of S10 and the sources above. Do not preselect a value.
- Block the field when the surgery is combined, and require a surgeon protocol.
- Crutch use and brace use are separate surgeon fields. For brace, S10 abstract and S10 table give different numbers (C4). Name which one you quote. Locked brace is 19 (54%) and brace 0 to 6 weeks is 22 (63%) in Table 2.

## Ask your surgeon

- Weight-bearing status and the date it changes.
- Crutch use and how long.
- Brace: yes or no, locked or open, end date.
- Whether any concurrent procedure was done.

## Gaps

- NONE: a consensus on weight-bearing after isolated MPFLR. N1 found none. The literature gives only practice counts (S10, R3).
- NONE: an adult-specific weight-bearing source.
- NONE: a trial that compares weight-bearing schedules after isolated MPFLR.
- UNVERIFIED: the BASK 2021 consensus (G1). Its full text is paywalled. It cannot support a rule.
- UNVERIFIED: the N1 statement text. Only the abstract was read.
- Source age: P2 is from January 2015, older than 5 years. The audit found no revision.
- S10 has internal mismatches in some numbers (`research/clinical-update.md` section 2.1). The weight-bearing counts above matched the audit (V20).
