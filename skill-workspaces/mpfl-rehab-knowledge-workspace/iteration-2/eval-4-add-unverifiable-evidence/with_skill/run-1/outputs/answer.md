Answer: I would not add it as a fact. I cannot open the source, and you gave no link. It is UNVERIFIED.

Steps from the skill (Add new evidence):
1. No URL opened. No access mark possible beyond UNVERIFIED. I would never write a DOI or PMID from memory. I also did not search for it. A search summary is not a source.
2. I would ask you for the link (DOI or journal page).

What I would write, if you want a placeholder:
- Where: `research/clinical-update.md`, section 2.1 (accelerated rehab, weight-bearing, brace, early ROM). The file already covers brace evidence. No new file, no copy elsewhere (DRY).
- Row text: "Smith et al. 2026. Claimed: RCT, N=300, no brace gives better outcomes after MPFLR. Access: UNVERIFIED. Population: unknown (MPFLR or not). Source date: not known. Link: not given."
- Do not add it to the `clinical.md` evidence table (section 8). Do not raise any claim level.
- Conflict: it would contradict S8 and S9 (brace evidence is non-randomised, no brace and no difference significant) only if it were true. A claim of an RCT with N=300 would be the largest brace trial. The disagreement table (`clinical.md` section 3) gets a line only after it is opened. The existing text says no trial compares brace with no brace.
- After the edit: update the last search date and run `python3 ~/.claude/scripts/ste-check.py` on the file.
- The app must not use it. Brace use stays "ask your surgeon" (section 9 item 3).
