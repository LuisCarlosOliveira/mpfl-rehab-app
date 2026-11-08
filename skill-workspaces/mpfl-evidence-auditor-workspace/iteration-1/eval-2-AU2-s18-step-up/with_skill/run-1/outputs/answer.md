# Audit of S18: forward step-up 11.2 MPa

## 1. Verdict

Claim: S18 gives 11.2 MPa for the forward step-up.

Verdict: VERIFIED-ABSTRACT. The number 11.2 MPa is in the abstract of S18. I did not read the full text. It is paywalled.

The existing audit file disagrees. `research/source-audit.md`, correction C6, says 11.2 is not in the abstract and marks it UNVERIFIED. My reading of the Europe PMC record does not support C6. I keep both values and report the conflict (section 4).

## 2. Row for the knowledge base

| Field | Value |
|---|---|
| Id proposal | S18 (keep the id, update the row) |
| Reference | Chinkulprasert C, Vachalathiti R, Powers CM. Patellofemoral joint forces and stress during forward step-up, lateral step-up, and forward step-down exercises. J Orthop Sports Phys Ther 2011;41(4):241-248. PMID 21289449. DOI 10.2519/jospt.2011.3408 |
| URL that I opened | https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=EXT_ID:21289449%20AND%20SRC:MED&resultType=core&format=json (Europe PMC record, abstract field) |
| Access mark | V-abstract. The record flags inPMC N, isOpenAccess N and the DOI link as "Subscription required". |
| Exact quote | "FSU (11.2 ± 0.6 MPa; P = .002)". Same sentence set: "(mean ± SD, 13.8 ± 0.4 MPa" for FSD and "LSU (11.5 ± 0.8 MPa; P<.001)". |
| Design | Controlled laboratory study, repeated-measures design, 20 healthy adults. Step height set so knee flexion reached 45 degrees. Peak patellofemoral joint stress (PFJS) from a biomechanical model. |
| Population | BORROWED (healthy adults, not MPFLR patients). |
| Evidence class | STUDY |

Other values in the same abstract, as returned by the tool: patellofemoral joint reaction force 51.1 ± 2.7 N/kg (FSD), 44.1 ± 3.4 N/kg (LSU), 43.6 ± 2.3 N/kg (FSU). I read these in one tool answer only. Treat them as unconfirmed until a second read.

Identity check: the title, authors, journal, year, volume, pages, PMID and DOI of the record match the citation in the task and in `clinical.md` section 1.

## 3. Where the row belongs

- `research/clinical.md`, section 4, "Evidence on loading by knee angle". The S18 bullet already holds the value (13.8, 11.2 and 11.5 MPa). Keep it in place. No second copy.
- `research/source-audit.md`, correction C6 and the S18 row of Table 1. Update both there, not in a new file. The S18 verdict becomes VERIFIED-ABSTRACT. Remove "DIFFERS (partly)" for the 11.2 value.
- `clinical.md` section 4 uses the S18 step-up value in the phase 3 exercise table. That use stays valid for the value, but it is a healthy-adult value (BORROWED). Link to the file and section. Do not copy the numbers again.

## 4. Conflicts with existing rows

- C6 in `research/source-audit.md` says: "The 11.2 MPa value for the forward step-up is not in the abstract." The record that I opened says it is. Both statements are kept here. The two checks may have read different record versions or a truncated abstract. I cannot tell which. I asked the tool for the abstract field twice and it found "11.2" twice in the same sentence. A single record read by a summarising tool is a weak source. The main session should re-read the record once by hand before it edits C6.
- C6 is right about two things. The full text is paywalled. The numbers 13.8 and 11.5 are exact.
- `clinical.md` section 4 reports the S18 result as "step-down gave higher stress (13.8 MPa) than step-up (11.2 MPa) or lateral step-up (11.5 MPa)". This matches the abstract. The abstract also says the step-down values differ from the lateral step-up (P<.001) and from the forward step-up (P = .002). Lateral step-up and forward step-up are not compared with each other in the sentence that I read.

## 5. Sources that I did not open

- Full text of S18 at https://www.jospt.org/doi/10.2519/jospt.2011.3408. The server answered HTTP 403. The DOI redirect (https://doi.org/10.2519/jospt.2011.3408) led to that page. I did not read the full text, tables or methods. Any number that is only in the full text is UNVERIFIED.
- PubMed page https://pubmed.ncbi.nlm.nih.gov/21289449/. It returned only a cookie notice. The abstract was not shown. One earlier try failed with a tool error.
- PMC: the record says the article is not in PMC.

## 6. Limits of this check

- All text came from a tool that summarises pages. It cannot copy long quotes. The strings "11.2 ± 0.6 MPa; P = .002" and the two other MPa values were returned the same way in two separate calls. I did not see the raw record.
- The first answer of the tool gave a full list of results. The second call about the same record gave a paraphrase that left out the step-up value. The third and fourth calls gave the step-up value again. Because of this mixed behavior, the mark is V-abstract and not V.
- The value is from healthy adults at 45 degrees of knee flexion. It is BORROWED for MPFLR. It cannot support an app rule for a patient. It can only support the statement that step-down loads the patellofemoral joint more than step-up at the same step height, in healthy people.
- No treatment advice is given.
