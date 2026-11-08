# Audit: Smith J et al. 2026, DOI 10.1000/smith-mpfl-2026

## 1. Verdict

NOT FOUND. Do not add this source to the knowledge base as evidence.

The claim is "RCT of 300 patients, no brace gives better outcomes after MPFL reconstruction". I could not open any record of this paper. The claim has the access mark UNVERIFIED. It cannot support an app rule.

What I tried:
- `https://doi.org/10.1000/smith-mpfl-2026` returned HTTP 404 Not Found.
- Crossref `https://api.crossref.org/works/10.1000/smith-mpfl-2026` returned HTTP 404 Not Found.
- Europe PMC search `query=DOI:10.1000/smith-mpfl-2026` returned "hitCount":0 and an empty result list.
- A web search for "Smith 2026 randomized controlled trial 300 patients no brace versus brace after MPFL reconstruction" found no such trial under any title. The search summary is not a source. I did not use it as evidence.

Note: the prefix 10.1000 is a general test prefix. It is not a journal publisher prefix. I did not open a page that confirms this, so treat this note as a hint and not as proof. The three failed lookups above are the proof.

I did not repair the DOI, the authors or the title from memory. If you have the real link, the journal name or the PMID, send it. I will open it and audit it.

## 2. Row for the knowledge base

No row. A row needs a URL that I opened and a quote that I read. Neither exists.

For the record of the check (search-log style), not as evidence:

| Id proposal | Reference as given | URL opened | Access mark | Exact quote | Design | Population | Evidence class |
|---|---|---|---|---|---|---|---|
| none | Smith J et al. 2026, DOI 10.1000/smith-mpfl-2026 (as given by the person, unchecked) | none. DOI link, Crossref and Europe PMC returned 404 or 0 hits | NOT FOUND, UNVERIFIED | none | "RCT, 300 patients" is the claim of the person and is not confirmed | not confirmed | NONE |

## 3. Where it belongs

Nowhere as evidence. Do not add it to `research/rehab-rules.md` section 1, row "Brace use". Do not add it to `research/source-audit.md` as a source. If the main session wants a trace of the failed check, add one line to `research/search-log.md`. Check first that no line for this DOI exists, so that no second copy is made.

## 4. Conflicts with existing rows

The claim says no brace gives better outcomes. The knowledge base does not hold a source that supports this claim, so it cannot be tested against a source. The existing rows say this (read in `research/rehab-rules.md` section 1, "Brace use"):
- Brace use is common but not proven. N1 Delphi: no consensus on postoperative immobilization.
- S9 (systematic review, abstract read): braced knees 25 (4.7%) with instability events versus 1 of 117 non-braced knees (0.9%), "p = 0.055". The difference is not significant. Mark: REVIEW, VERIFIED-ABSTRACT.
- S8 (retrospective): reoperation "20 knees [12.1%] vs. 0 [0%]" braced versus unbraced. Mark: STUDY.
- S7 (retrospective): "3 recurrent dislocations ... (2.4%), all of which occurred in the restrictive rehabilitation group". Mark: STUDY.
- The rehab-rules conservative value stays: brace per surgeon, and the app must not set a default.

If a real Smith RCT is found later, keep both values and show the disagreement. Do not average.

## 5. Sources that I did not open

- The paper "Smith J et al. 2026" itself. No record exists that I can open.
- Full texts of S7, S8 and S9. I did not re-open them. The quotes above come from the existing knowledge base files (`rehab-rules.md`, `source-audit.md`), not from a new read.

A search result list also named a 2026 systematic review on bracing (PubMed 42413534). This is S9, already in the base. I did not open it in this audit.

Next step for the person: send the real link or PMID. Until then, the claim "no brace is better" has the class NONE in the knowledge base.
