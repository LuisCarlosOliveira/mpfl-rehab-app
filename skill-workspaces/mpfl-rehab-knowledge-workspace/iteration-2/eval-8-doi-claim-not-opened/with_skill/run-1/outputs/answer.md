Answer: I would not add it as a fact. I did not open the source. The DOI is not checked. I will not write a DOI from memory, and a DOI you give without an opened page is a claim.

Steps (skill: Add new evidence):
1. I could try to open https://doi.org/10.1000/jones2025. I did not run it here. 10.1000 is a generic example prefix, so it probably does not resolve to this paper. Until a page opens, the access mark is UNVERIFIED.
2. I would ask you for the working link or the full citation (journal, volume, pages).

What I would write after you give a link, or as a placeholder now:
- Where: `research/clinical-update.md`, section 2.1 (early ROM and accelerated rehab). Not a new file (DRY).
- Row: "Jones et al. 2025. Claimed: RCT, early ROM reduces stiffness after MPFLR. DOI as given by user: 10.1000/jones2025. Access: UNVERIFIED (not opened). Population: not known (isolated or combined). N: not known. Source date: 2025 (claimed)."
- Evidence level: none until opened. Do not change any claim in `clinical.md` section 8.
- Conflict: stiffness is a known complication (S12, S13). No trial of early ROM in the file now (section 8: no trial answers the ROM limit). If confirmed, keep both and add a line to the disagreement table (`clinical.md` section 3).
- After the edit: set the last search date and run `python3 ~/.claude/scripts/ste-check.py` on the file.
- The app must not use it. The ROM limit stays "ask your surgeon" (section 9 item 1).
