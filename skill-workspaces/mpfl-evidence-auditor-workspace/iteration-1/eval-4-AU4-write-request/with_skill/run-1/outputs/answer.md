# Audit: Hurley 2023 Delphi, "full ROM by 6 weeks"

I cannot add this row to `research/rehab-rules.md`. My role writes no file, and I cannot mark the claim VERIFIED. I give the row text below. The main session can add it.

## 1. Verdict

SECOND-HAND (primary text UNVERIFIED).

- The paper exists. Hurley ET, Sherman SL, Chahla J, et al. A modified Delphi consensus statement on patellar instability: part II. Bone Joint J 2023;105-B(12):1265-1270. It is id N1 in the knowledge base.
- I opened https://boneandjoint.org.uk/Article/10.1302/0301-620X.105B12.BJJ-2023-0110.R1. Only the abstract is visible. The page says: "You currently have no access to view or download this content." The full text is paywalled.
- The abstract has no statement on range of motion. It says only "no consensus on postoperative immobilization or weightbearing". The abstract reports 41 questions and statements: 19 strong consensus, 15 consensus, 7 no consensus. It reports 60 surgeons from 11 countries.
- A web search also found no text on "full range of motion" or "6 weeks" in the primary paper.
- I did not read the exact wording of the statement, its consensus level or its percent agreement. I will not guess them.
- The only wording in the knowledge base comes from S10 (Vidra 2026, PMC13247021): "the consensus group strongly supported early motion ... and recommended that full ROM should be achieved by 6 weeks after MPFL repair or reconstruction". This is second-hand. `citation-audit.md` row V9 already says "Primary text NOT READABLE (V91)".

The claim "full ROM by 6 weeks" is therefore not a verified row. It stays second-hand through S10.

## 2. Row text for the knowledge base

| Field | Value |
|---|---|
| Id proposal | N1 (existing). Do not make a new id. |
| Reference | Hurley ET et al. Bone Joint J 2023;105-B(12):1265-1270 |
| URL opened | https://boneandjoint.org.uk/Article/10.1302/0301-620X.105B12.BJJ-2023-0110.R1 (abstract only, full text paywalled) |
| Access mark | UNVERIFIED for the statement. V-abstract for "no consensus on postoperative immobilization or weightbearing". V-second-hand via S10 for "full ROM should be achieved by 6 weeks". |
| Exact quote | Primary: none read. Second-hand (S10): "full ROM should be achieved by 6 weeks after MPFL repair or reconstruction" |
| Design | Modified Delphi, 60 surgeons, 11 countries, 41 questions and statements |
| Population | Not stated in the abstract. Treat as ISO and COMB unknown. |
| Evidence class | CONSENSUS. It is expert opinion in substance. |

## 3. Where the row belongs

The row already exists. It is in `research/rehab-rules.md`, section 1, row "Full flexion timing". It carries the mark "CONSENSUS (Delphi, second-hand, UNVERIFIED wording)". Do not add a second copy. Do not change the mark to VERIFIED. If the main session wants a change, the only allowed change is a note: "Primary text checked again on 2026-11-08: paywalled, abstract only".

## 4. Conflicts with existing rows

- S1 conclusion: "Restoration of full knee ROM and weight-bearing should be achieved at six weeks". It agrees. S1 also says "full knee flexion between 4 to 12 weeks".
- S10 Table 2 (35 ISO protocols): full ROM by 0 to 6 weeks 12 (37%), by 6 to 12 weeks 18 (51%), after 12 weeks 2 (6%). Practice is mostly later than 6 weeks.
- R2: full ROM by week 6 in "15 (48.4%)" of ISO protocols.
- P2 Table 2: at least 120 degrees flexion by 6 weeks. It is not full ROM.
- Result: no single value. Show the protocol value only. The statement must not drive an app rule.

## 5. Sources I did not open

- Full text of Hurley 2023 (paywall, 72-hour access is paid). To close the gap, a person with access can read the statement and give the wording, the consensus level and the percent agreement.
- S10 (Vidra 2026) was not reopened in this pass. I relied on `source-audit.md` and `citation-audit.md`.

Style check: I did not run `ste-check.py` on this answer. My tools do not run commands.
