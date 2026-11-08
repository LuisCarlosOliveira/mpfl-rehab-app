# Audit: Hurley 2023 Delphi, "full ROM by 6 weeks"

I cannot add the row. I write no file. The main session must add it. Also, I cannot give a verified row. The claim stays SECOND-HAND.

## 1. Verdict

SECOND-HAND. The statement is not VERIFIED-FULL and not VERIFIED-ABSTRACT.

- I opened the Europe PMC record of the paper (DOI 10.1302/0301-620X.105B12.BJJ-2023-0110.R1, PMID 38035602). The abstract does not mention range of motion or 6 weeks.
- I tried the publisher page through the DOI. The tool failed (rate limit). I did not read the full text. The earlier audits in `research/` also record a paywall (`citation-audit.md` V91, `search-log.md`).
- The only text in the repo with the statement is the review S10 (Vidra 2026, PMC13247021). It says: "the consensus group strongly supported early motion ... and recommended that full ROM should be achieved by 6 weeks after MPFL repair or reconstruction" (`source-audit.md` S10, `citation-audit.md` V9). I did not re-open S10 in this run.
- The wording is paraphrased by S10. I cannot confirm the exact statement text, its agreement level (consensus or strong consensus) or its number.

The abstract does confirm: modified Delphi, 60 surgeons, 11 countries, 41 statements, 19 strong consensus, 15 consensus, 7 none. It states no consensus on postoperative immobilization or weightbearing.

## 2. Row for the knowledge base (proposal, not added)

| Field | Value |
|---|---|
| Id proposal | N1-ROM6 (second-hand part of N1) |
| Reference | Hurley ET et al. A modified Delphi consensus statement on patellar instability: part II. Bone Joint J 2023;105-B(12):1265-1270. PMID 38035602 |
| URL opened | Europe PMC record (abstract only). Publisher page: not opened |
| Access mark | UNVERIFIED for the primary text. SECOND-HAND through S10 |
| Exact quote | None from the primary text. Second-hand from S10: "full ROM should be achieved by 6 weeks after MPFL repair or reconstruction" |
| Design | Modified Delphi, 60 surgeons, 11 countries, 41 statements |
| Population | MPFLR (isolated or combined not stated in what I read) |
| Evidence class | CONSENSUS (weak, expert opinion in substance). It cannot support an app rule while it is UNVERIFIED |

## 3. Where it belongs

The row already exists. `research/rehab-rules.md`, section 2, row "Full flexion timing" (around line 61) holds "N1 Delphi via S10: full ROM should be achieved by 6 weeks ...". Do not make a second copy. If the mark needs a change, edit that row. Do not upgrade it to VERIFIED.

## 4. Conflicts with existing rows

- S1 conclusion: full ROM and weight-bearing "at six weeks". S1 text: "full knee flexion between 4 to 12 weeks". S1 disagrees with itself (C2).
- S10 Table 2 (35 isolated protocols): full ROM by 0 to 6 weeks in 12 (37%), by 6 to 12 weeks in 18 (51%), after 12 weeks in 2 (6%). Most protocols target 6 weeks or later.
- P2 phase 2: "≥ 120º or 75% of uninvolved limb for knee flexion". This is a criterion, not a week number.
- Keep all values. Name no average.

## 5. Not opened

- The Bone and Joint Journal publisher page (full statements). Tool failure, and a known paywall.
- S10 (PMC13247021) was not re-opened in this run. I relied on the repo files for its wording.

## Next step

To get a VERIFIED row, a person needs legal access to the full text of the paper. Until then the row stays SECOND-HAND.
