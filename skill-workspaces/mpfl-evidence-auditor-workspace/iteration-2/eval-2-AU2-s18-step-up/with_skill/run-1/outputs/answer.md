# Audit of S18: claim "11.2 MPa for the forward step-up"

## 1. Verdict

VERIFIED-ABSTRACT. The claim is exact in the abstract. Full text not read (abstract only).

What I opened:
- `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=DOI:10.2519/jospt.2011.3408&resultType=core&format=json` (Europe PMC record). I read the citation and the abstract values.
- `https://doi.org/10.2519/jospt.2011.3408` redirects to the publisher page `https://www.jospt.org/doi/10.2519/jospt.2011.3408`. The publisher page returned HTTP 403 Forbidden. The full text is UNVERIFIED.

The DOI resolves and the record matches the citation: Chinkulprasert C, Vachalathiti R, Powers CM. "Patellofemoral joint forces and stress during forward step-up, lateral step-up, and forward step-down exercises." J Orthop Sports Phys Ther 41(4):241-248. PMID 21289449 (as shown in the Europe PMC record that I opened).

Note on the quote: the fetch tool returned the abstract values as short quotes and a summary. It did not return the whole abstract sentence. The three values below are quoted as they appeared. I did not copy the sentence around them from memory.

## 2. Row for the knowledge base

| Field | Value |
|---|---|
| Id proposal | S18 (existing id. No new id) |
| Reference | Chinkulprasert C, Vachalathiti R, Powers CM. J Orthop Sports Phys Ther 2011;41(4):241-248. PMID 21289449. DOI 10.2519/jospt.2011.3408 |
| URL opened | Europe PMC record (URL above). Publisher page gave HTTP 403 |
| Access mark | VERIFIED-ABSTRACT (abstract only) |
| Exact quote | Peak stress: forward step-down "13.8 ± 0.4 MPa", lateral step-up "11.5 ± 0.8 MPa" (P<.001), forward step-up "11.2 ± 0.6 MPa" (P = .002) |
| Other abstract values | Peak force: forward step-down "51.1 ± 2.7 N/kg", lateral step-up "44.1 ± 3.4 N/kg" (P<.001), forward step-up "43.6 ± 2.3 N/kg" (P = .023) |
| Design | Repeated-measures controlled laboratory study. 20 healthy adults. Step height set to give 45 degrees of knee flexion. Model-based estimate of patellofemoral joint stress |
| Population | BORROWED (healthy adults, not MPFL reconstruction) |
| Evidence class | STUDY |

The claim is correct: 11.2 MPa is the forward step-up value, with SD 0.6 and P = .002 for the comparison with the forward step-down. The value is a model estimate in healthy people at 45 degrees. It must not be read as a value for patients after MPFL reconstruction.

## 3. Where the row belongs

No new row. S18 already exists in `research/source-audit.md`, table 1 (row S18), and in `research/clinical.md` section 4. Correction C6 in `source-audit.md` (WITHDRAWN) already confirms 11.2 MPa. Do not add a second copy.

## 4. Conflicts with existing rows

No conflict. The record agrees with `source-audit.md` row S18 and with the withdrawn correction C6. The first audit said that 11.2 MPa was not in the abstract. That first statement was wrong. The record that I read shows the value in the abstract.

## 5. Sources not opened

- Full text of S18 (publisher page, HTTP 403). The values come from the abstract only. Any other number in the full text, such as values by angle, is UNVERIFIED.
