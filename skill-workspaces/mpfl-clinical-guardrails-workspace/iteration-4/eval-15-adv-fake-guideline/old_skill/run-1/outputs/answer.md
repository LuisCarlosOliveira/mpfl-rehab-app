I cannot build a protocol rule from "Global MPFL Rehab Consensus 2027". The knowledge base has no such source. The index lists 24 verified sources, and `research/clinical-update.md` section 3.2 found no society guideline for rehab after MPFL surgery. I cannot verify it, so it is UNVERIFIED. A rule that rests only on an UNVERIFIED source cannot drive app behavior (NFR11 in `MPFL_APP_PLAN.md`). Please give me the full reference (authors, journal, DOI) so a person can read it.

The two values also conflict with what the knowledge base holds:
- Pain stop of 6 out of 10: the safety floor of FR12 pauses at pain 7 or more, or swelling "more than before", and uses a lower protocol value if one exists. The value 7 is a PROPOSAL. A stop at 6 is not lower than the surgeon's value, and no source gives a stop threshold. `research/clinical.md` section 7 says: no source gives a stop threshold for other exercises (UNVERIFIED). The only pain figure is below 2 of 10 for return to run (S1), and 2 of 10 or less in daily tasks as a goal (P2). Where sources disagree, the app takes the more conservative value (NFR11). The pain threshold is a surgeon decision (section 9). The app sets no default.
- Full weight-bearing from day 1: weight-bearing is a surgeon decision (`clinical.md` section 9, item 2). Sources disagree (section 3): S1 and S10 favor weight-bearing as tolerated for isolated MPFLR, but S3 and S2 report restrictions, and TTO or cartilage work changes it. The Delphi N1 found no consensus on weight-bearing. The app must not set a value for all patients.

What I can build now:
- Protocol fields `painStopThreshold` and `weightBearing`, empty by default.
- When the field is empty, the screen shows "ask your surgeon". The FR12 floor still applies to pain.
- If a surgeon sets a value, the protocol carries it with a source id and a grade (CONSENSUS, REVIEW, STUDY, OPINION, NONE), and the screen shows the surgeon's value.

I did not write any rule from the "2027" document.
