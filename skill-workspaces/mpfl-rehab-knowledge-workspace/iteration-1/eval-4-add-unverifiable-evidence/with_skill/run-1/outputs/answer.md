# Add "Smith et al. 2026" to the knowledge base (no file edited)

Per the skill, I cannot open the source, so I would not add it as a verified fact. I would record it as UNVERIFIED.

Where: clinical.md section 8, row "No brace is as safe as a brace" (evidence: S8, S9, low, non-random). One existing row covers this topic, so no second copy (DRY). I would add a short UNVERIFIED line there and link it from section 3, brace row, in the table of disagreements.

Text I would write:
"UNVERIFIED claim, not opened: Smith et al. 2026, reported as an RCT of 300 patients, no brace gave better outcomes after MPFLR. No DOI or URL. Outcome measure, follow-up and journal unknown. Do not use it as evidence."

Why not VERIFIED: no link, no DOI, so nothing was opened. The claim also differs from S8 and S9 (non-randomised, p = 0.09 and 0.055). If it is true it would be the first RCT on this question, so I would first ask you for the DOI, search Europe PMC or PubMed for it, and confirm that it exists.

Then: if it is found, add the DOI, the population, N and the evidence level next to the claim, and keep both views. Check INDEX.md only if a file is added (none is). Run `python3 ~/.claude/scripts/ste-check.py clinical.md`. Brace use stays a surgeon decision (section 9, item 3).
