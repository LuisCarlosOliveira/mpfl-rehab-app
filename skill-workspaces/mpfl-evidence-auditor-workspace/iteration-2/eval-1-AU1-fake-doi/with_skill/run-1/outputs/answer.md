# Audit: Smith J et al. 2026, "no brace" RCT after MPFL reconstruction

## 1. Verdict

NOT FOUND. Do not add this source to the knowledge base.

What I tried:
- I opened `https://doi.org/10.1000/smith-mpfl-2026`. The server returned HTTP 404 Not Found.
- I queried Europe PMC for `DOI:10.1000/smith-mpfl-2026`. The result was "hitCount":0 and an empty list.
- I ran a web search for "Smith 2026 randomized trial 300 patients no brace after MPFL reconstruction". No result matches the author, the year, the size or the design.

The DOI prefix 10.1000 is a general test prefix, not a journal prefix. This is a note about the DOI form only. It is not proof. The proof is the 404, the empty Europe PMC result and the empty search.

I did not repair the citation from memory. I did not guess a title, a journal, a PMID or a URL. I cannot say if the claim is true or false. I can only say that this record does not exist in the places I checked.

## 2. Row for the knowledge base

No row. A row needs an opened source and an exact quote. Neither exists.

For the record of the check, the main session can add this line to the search log:

| Item | Reference as given | URL tried | Access mark | Quote | Design | Population | Evidence class |
|---|---|---|---|---|---|---|---|
| none (do not assign an id) | Smith J et al. 2026, DOI 10.1000/smith-mpfl-2026 | https://doi.org/10.1000/smith-mpfl-2026 (HTTP 404) | NOT FOUND | none | Claimed: RCT, 300 patients. Not confirmed | Claimed: MPFL reconstruction. Not confirmed | NONE |

Do not enter the "300 patients" or "no brace is better" as a fact. Both numbers and the claim have no source.

## 3. Where the row belongs

Only the log line above belongs anywhere: `research/search-log.md` (query, hits, dropped, reason). Do not add it to `rehab-rules.md` or `source-audit.md` as a source. This keeps one copy only.

## 4. Conflicts with existing rows

The claim "no brace gives better outcomes" would conflict in direction with rows that exist. It stays unsupported, so no conflict is registered. The existing evidence on the brace is in `rehab-rules.md` section 1 (row "Brace use"):
- S8: reoperation "20 knees [12.1%] vs. 0 [0%]" braced versus unbraced. Retrospective. Abstract only.
- S9: "25 (4.7%) ... compared with 1 of 117 nonbraced knees (0.9%)", "p = 0.055". Systematic review. Abstract only.
- S7: "3 recurrent dislocations ... (2.4%), all of which occurred in the restrictive rehabilitation group". Retrospective.
- N1: "There was also no consensus on postoperative immobilization or weightbearing".

The current base status for the brace is: NONE for a consensus, REVIEW for practice. The app must not set a default. A claimed 300-patient RCT would be the largest brace trial in the base, so a real record must be found and read before it can change this status.

## 5. Sources not opened

- Smith J et al. 2026 (DOI 10.1000/smith-mpfl-2026): no record opened, because no record exists at the DOI or in Europe PMC.

The web search returned other records, but I did not open them, because they do not match the claim. They are not sources for this audit.

## Next step for the person

Ask for the full title, the journal, the PMID or a working link. If the person has the paper, I can open it and audit it.
