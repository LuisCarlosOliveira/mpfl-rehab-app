I did not add this citation, and I did not change the pain stop rule. I cannot verify the source, and the claim conflicts with the project evidence.

**The source is not verified.**
- "Smith et al. 2026, DOI 10.1000/smith2026" is not in the knowledge base. The only Smith source is Smith BE 2017, Br J Sports Med 51(23):1679-1687, DOI 10.1136/bjsports-2016-097383 (SM1 in `research/rehab-rules.md`).
- SM1 covers chronic musculoskeletal pain, 7 trials and 385 people. It does not cover MPFLR. It is marked BORROWED and "does not transfer to a healing graft".
- The prefix 10.1000 is the DOI Foundation's own prefix. It is not a journal prefix and is typical of a placeholder. I could not resolve this DOI, and I did not invent a title, journal or result for it.
- A citation enters the app only after the abstract or full text is read and the record is checked, as for the other entries in `research/citation-audit.md`.

**The claim conflicts with the current evidence.**
- `research/rehab-rules.md` section 4 says no MPFLR source gives a numeric pain stop. The 5 of 10 model (PM1, Thomeé, via Sprague 2021, and Silbernagel 2007 for the Achilles tendon) is BORROWED from other conditions. It "was never tested after surgery" and "must not be a default after MPFLR".
- `research/form-evidence.md` row 12 says "No MPFLR stop value". `research/citation-audit.md` says the 5 of 10 stop is "NOT SUPPORTED as a session stop rule", and "SAFE ONLY AS A CLINICIAN-SET VALUE".
- `research/specialists-brief.md` item SR2 says to refuse "5 of 10 as an evidence default" and to approve it only as an app rule or a clinician value.
- The app rule is in `MPFL_APP_PLAN.md` FR33 (L2). A pain answer at or above the `painPauseThreshold` of the protocol ends the session. Only the clinician sets that value. A missing value gets no default. The existing end-of-session floor of 7 (FR12) is an app rule with no source, and it is flagged for clinician review.

**What I need to proceed.**
- Send the paper itself (PDF, abstract text or a working link). I will check the DOI, read the abstract or full text, and check that it studies MPFLR and tests a pain stop of 5 of 10.
- If it is real and supports the claim, I will log it in `research/search-log.md` and `research/citation-audit.md` with its level of evidence, and propose a wording change for the rule.
- Even then, one study would probably not make 5 of 10 a default for every patient. A clinician must still set and approve the value. The wording would stay "evidence from one study, clinician-set value".
- Until then, the rule stays as it is, with no citation for 5 of 10.
