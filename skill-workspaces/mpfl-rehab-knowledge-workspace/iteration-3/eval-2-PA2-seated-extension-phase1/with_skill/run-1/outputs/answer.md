**PICO:** Isolated MPFL reconstruction (no bone or cartilage procedure). Age group not stated. P2 covers ages 8 to 25. Adults rest on P1, P3, S1 and N3. Weeks 0 to 6 after surgery (phase 1). Question: can the app offer an active seated knee extension hold to full extension (0 degrees)?

## Answer

No. By default, the app must not offer this hold in phase 1. Only the surgeon can enable it.

The hold is active open-chain extension to 0 degrees. Two guidelines say to avoid it early. The evidence is weak. It is expert opinion (level 5), not trial data. The app can encode it as a protective default, not as a proven rule. A clinician must review the rule before patient use.

## Facts

| Fact | Exact quote | Source id and place | Class | Access | Population |
|---|---|---|---|---|---|
| Avoid terminal open-chain extension in the initial phase | "short arc quadriceps exercises (knee extension from 30° to 0°) and long arc quadriceps exercises in the terminal range of 30° to 0° are avoided to minimize stress to the reconstructed medial patellofemoral ligament (LocalConcensus 2014 [5])" | P2 (Cincinnati Guideline 46, Jan 2015), rec 29. `research/citation-audit.md` section 4.1 and row V45 | CONSENSUS on paper. OPINION in substance (level 5, "It is recommended", one institution) | VERIFIED | ISO, ADOL (ages 8 to 25) |
| No active open-chain extension in phase 1 | "Do not perform AROM open chain KE" | P1 (HSS guideline, revised 8/2024), phase 1 (weeks 0 to 6). Audit row V47 | OPINION (no evidence grades in P1) | VERIFIED | ISO, no age limit stated |
| The restriction lasts into phase 2 in P1 | "Do not perform AROM open chain KE, unless cleared by surgeon" (weeks 7 to 11) | P1 phase 2. Audit row V47 and M6 | OPINION | VERIFIED | ISO |
| Full extension is still a goal, by other means | "Achieve 0° knee extension AROM" (initial phase goal). P1 phase 1 uses "Sitting knee ROM exercise: AAROM KF to PROM KE" | P2 Table 2. P1 phase 1. Audit rows V19 and V37 | CONSENSUS (low) | VERIFIED | ISO |
| Quad sets and straight leg raise are allowed from day 0 | "Exercises including quadriceps setting and straight leg raise should be started immediately after the surgery" | S1, `research/rehab-rules.md` section 2 | OPINION (LoE 5) | VERIFIED | ISO |

Audit corrections that apply:
- Audit row V47 (PARAPHRASED): "Do not perform open chain knee extension (KE)" belongs to acute care (day of surgery). The phase 1 wording is "Do not perform AROM open chain KE". I used the audit wording.
- Audit row V46 (PARAPHRASED): the P2 later arc of 90 to 30 degrees is in a Note ("It may be helpful ..."). It is not a recommendation.
- Audit row V37 is WRONG, so I did not use "heel slides in P1 phase 1" for anything here.

## Disagreements

| Source | Value | Note |
|---|---|---|
| P2 rec 29 | Avoid 30 to 0 degrees in the initial phase | Conservative |
| P1 | No AROM open-chain KE in phase 1 and phase 2, unless the surgeon clears it | Conservative. The longest restriction |
| P3 (NHS Lothian 2022), phase 2, from 2 weeks | "OKC quadriceps exercises should be progressed as able" | No arc given. Audit M2 |
| N3 (Hysing-Dahl and Inderhaug 2024, PMC11180699, read in the audit) | Open chain restricted only after bony procedures | Audit M1. Looser |
| S1 | "both open and closed chain" in the strengthening phase | Looser. Phase 1 not specific |

The open-chain restriction is in 2 of 4 readable guidance sources. It is not a general agreement. The conservative value is: no active seated extension to 0 degrees in phase 1. The app does not average the sources.

Later arcs, all with surgeon clearance, are shown side by side and none is a consensus:
- P2: 90 to 30 degrees (Note, "may be helpful").
- P1: 90 to 40 degrees, phase 2, "Follow surgeon preference and patient tolerance".
- AS1: 90 to 45 degrees from week 4. BORROWED (ACL).
- N23: knee extension 90 to 45 degrees. BORROWED (healthy people).

## App finding

The seated hold text in `app/src/lib/guides.ts` (line 54, "Straighten your knee. Hold it") asks for a long-arc extension to 0 degrees. This conflicts with P2 rec 29 and with P1 phase 1 (audit section 4.1, `research/rehab-rules.md` section 2). The protocol generator must not offer it in phase 1 unless the surgeon enables it. In later phases, the app can offer only a mid-range hold with an arc that the surgeon sets.

## Ask your surgeon

- Do I do active seated knee extension in phase 1? If yes, in which arc, from which week?
- When can I start open-chain quadriceps work?
- Which exercises restore my full extension now (for example passive or assisted extension)?
- Did my surgery include a bone or cartilage procedure? If yes, this answer does not apply. A surgeon protocol is required (S10, N3 and audit section 4.7).

## Gaps

- Graft strain in open-chain extension after MPFLR: NONE. No study measures it. The literature has only stress-by-angle data from healthy people (BORROWED, S14 to S18, N23). It does not give a graft value.
- Outcome evidence for or against the restriction: NONE. The audit says no clinical study shows harm in either direction. A too-strict rule costs a slower quadriceps gain, while quad sets and SLR remain available. The audit rates this harm as low.
- The date or week to enable open-chain extension: NONE. P1 gives phase 2 (weeks 7 to 11) "unless cleared by surgeon". P3 gives from 2 weeks. The surgeon sets it.
- BASK 2021 (G1) and N1 (Hurley 2023): not readable (paywall). UNVERIFIED. They do not support this answer.
- P2 is from January 2015 (more than 5 years old). The audit found no revision.

The app never picks a phase or a load for a person. If you have a symptom in your knee now, contact your care team.

Check: `ste-check` was not run on this answer file.
