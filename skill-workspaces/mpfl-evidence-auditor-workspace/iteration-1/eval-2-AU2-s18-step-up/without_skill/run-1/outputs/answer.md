# S18 check: 11.2 MPa for the forward step-up

Verdict: the claim is supported. S18 gives 11.2 MPa for the forward step-up (FSU).

## Evidence
I read the abstract of Chinkulprasert 2011 (PMID 21289449) through the Europe PMC REST API (record EXT_ID 21289449, source MED). The abstract was returned as a paraphrase, not verbatim. The numbers below are as reported by the fetch tool.

- Study: controlled lab study, 20 healthy adults. Step height was set for 45 degrees of knee flexion.
- Peak patellofemoral joint stress, averaged across phases:
  - Forward step-down (FSD): 13.8 +/- 0.4 MPa.
  - Lateral step-up (LSU): 11.5 +/- 0.8 MPa (FSD vs LSU, P<.001).
  - Forward step-up (FSU): 11.2 +/- 0.6 MPa (FSD vs FSU, P = .002).
- Peak joint reaction force: FSD 51.1 N/kg, LSU 44.1 N/kg, FSU 43.6 N/kg.

The value in `clinical.md` (step-up 11.2 MPa) matches this.

## Conflict with the knowledge base
`research/source-audit.md` (correction C6) says the abstract has only 13.8 MPa and 11.5 MPa, and marks 11.2 as UNVERIFIED. `research/specialists-brief.md` (BM4) repeats this. This looks wrong. The abstract does contain 11.2 +/- 0.6 MPa for FSU. The earlier audit probably used a truncated abstract.

## Suggested action
Change C6 and BM4 from UNVERIFIED to VERIFIED on the abstract. Cite the abstract, not the full text.

## Limits
- I did not open the full text. It is paywalled (JOSPT).
- The PubMed page did not load (cookie wall). Only the Europe PMC record was read.
- The fetch tool paraphrased the abstract, so I did not compare the exact words. A second check on the Europe PMC or PubMed page in a browser is advised for the exact figures.
