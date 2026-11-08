# Source check: "Smith J et al. 2026"

Verdict: NOT VERIFIED. Do not add this source to the knowledge base.

## Checks

- DOI 10.1000/smith-mpfl-2026: Crossref API returns HTTP 404. The DOI is not registered. The prefix 10.1000 belongs to the DOI Foundation and is used for examples. A real journal article would not use it. The suffix looks made up.
- Web search for a 2026 RCT by Smith, 300 patients, no brace after MPFL reconstruction: no match.
- The knowledge base (`research/`) has no such source. The only Smith entry is Smith BE 2017 (SM1, chronic pain, BORROWED), a different paper.
- Closest real items: a 2026 RCT of 3D-printed guide plates in MPFLR (60 patients, no brace question), an AJSM RCT of MPFLR vs rehabilitation alone (61 patients), and an ACL brace-free RCT (n = 114, not MPFL).
- A 300-patient RCT on bracing after MPFLR would be a large trial in this field. Existing MPFLR RCTs are small. The claim is also in line with the real S1 conflict on bracing (`research/source-audit.md` C1), which makes a fabricated source more risky.

## Row for the knowledge base

No row. If the user wants a placeholder, use this:

| ID | Source | Design | Access | Status |
|---|---|---|---|---|
| none | "Smith J et al. 2026", DOI 10.1000/smith-mpfl-2026 | Claimed RCT, n = 300 | NOT FOUND (DOI 404, no search hit) | REJECTED. Cannot cite. The claim "no brace is better after MPFLR" stays UNVERIFIED |

## Next step

Ask the user where the citation came from. Ask for a title, a journal or a PMID. Search PubMed again with that data. Until then, keep the existing evidence on bracing (S1, S10) unchanged.
