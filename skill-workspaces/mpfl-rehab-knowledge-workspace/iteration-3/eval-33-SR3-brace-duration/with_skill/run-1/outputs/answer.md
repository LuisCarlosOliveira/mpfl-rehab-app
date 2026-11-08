PICO: isolated MPFL reconstruction (the case that this answer covers), adult or adolescent, any week since surgery, question: can the protocol generator choose the brace duration?

## Answer

No. The generator must not pick the brace duration. No source gives a brace default, and the brace end date is a surgeon decision.

The generator can do three safe things. It can show the brace field as "Ask your surgeon". It can show the range of practice as a reference for the clinician. It can accept a brace limit that the surgeon gives (the I9 question in `docs/protocol-generator-design.md`). It must not turn a practice count into a default.

If the surgery is combined (TTO, trochleoplasty, cartilage work, lateral release), the isolated numbers below do not apply. A surgeon protocol is required.

## Facts

| Value | Exact quote | Source id | Evidence class | Access | Population |
|---|---|---|---|---|---|
| No consensus on brace or immobilization | "no consensus on postoperative immobilization or weightbearing" (the audit gives the wording as EXACT, row V23) | N1 (Hurley 2023 abstract) | CONSENSUS that no consensus exists. NONE for a brace rule | VERIFIED (abstract). Full statements NOT READABLE (paywall, V91) | ISO |
| Locked brace in 19 of 35 protocols. Brace for 0 to 6 weeks in 22 of 35 (63%) | S10 Table 2: locked brace "19 (54%)", brace 0 to 6 weeks "22 (63%)" | S10 (Vidra 2026) | REVIEW of practice, not of outcome | VERIFIED (V25) | ISO |
| Immediate bracing recommended | "25 (93%) recommended immediate postoperative bracing" | R1 | REVIEW of practice | VERIFIED (V26) | ISO |
| Immediate bracing recommended | "Thirty protocols (97%) recommended immediate postoperative knee bracing" | R3 | REVIEW of practice | VERIFIED (V27) | ISO |
| Braced up to 6 weeks | "Six of seven studies (85.7%) braced patients for up to 6 weeks" | S9 | REVIEW of practice | VERIFIED (V28) | ISO |
| Brace stop is often tied to quadriceps control | "Discontinue knee brace when quadriceps control is regained" | P3 (NHS Lothian, page 4) | OPINION in substance (regional guideline, "limited evidence and expert opinion") | VERIFIED | ISO |
| Brace weaning is function-based in 46 percent and time-based in 29 percent | S10 Table 2 (see `progression.md` 2.1) | S10 | REVIEW of practice | VERIFIED (V30) | ISO |
| Brace with no brace: reoperation 12.1 percent versus 0 percent | "20 knees [12.1%] vs. 0 [0%]" | S8 | STUDY, retrospective, non-random. Confounding is possible | VERIFIED (V29) | ISO |
| No-brace rehab did not raise redislocation | "3 recurrent dislocations ... (2.4%), all of which occurred in the restrictive rehabilitation group" | S7 | STUDY, retrospective, 123 knees | VERIFIED (V24) | ISO |
| Brace-free early phase is described | N3 Table 1: "Brace-free rehabilitation" (early phase, 0 to 6 weeks) | N3 (Hysing-Dahl and Inderhaug 2024) | OPINION (review of protocols) | VERIFIED in the independent audit (row M1, full text) | ISO |
| Combined surgery is more protective | S10: TTO "delayed or non weight bearing (56%), locked brace duration greater than 6 weeks (67%)" | S10 | REVIEW of practice | VERIFIED (V31) | COMB |

## Disagreements

- Practice leans to a brace. R1 shows 93 percent, R3 shows 97 percent, S9 shows 6 of 7 studies, and S10 shows 54 percent with a locked brace and 63 percent with a brace for 0 to 6 weeks.
- Practice is not a rule. N1 finds no consensus. S7, S8 (time to straight leg raise without lag, 41 versus 44 days, unbraced sooner), N3 and the abstract-level instability data (S9: 4.7 percent braced versus 0.9 percent unbraced, p = 0.055, not significant) do not show that a brace protects.
- Duration across protocols runs from 0 to 12 weeks (S1, `clinical.md` section 2). S1 is not consistent with itself (correction C1): its text says weight-bearing is "usually not limited", and its conclusion says initial bracing is "required". Cite S1 only for the range of practice.
- S10 gives two brace numbers (correction C4). The abstract says locked brace up to 6 weeks in 63 percent. The table says locked brace 19 of 35 (54 percent) and brace 0 to 6 weeks 22 of 35 (63 percent). These are two different facts. Name which one you quote.
- Conservative value: P1 says "Follow most conservative guideline" for a concomitant procedure. For an isolated MPFLR, no source sets a conservative brace duration. The conservative action is to leave the field to the surgeon. P1 also uses straight leg raise without lag to decide to unlock the brace ("SLR with brace if lag is present"). The app cannot measure lag well, because a 10 degree lag is inside the 2D error (V85, about 9 degrees best case). A false "no lag" could lead to early walking without the brace. So the app must not unlock or end a brace on its own.

## Ask your surgeon

- Brace: yes or no, locked or open, and the end date (`clinical.md` section 9, item 3).
- Any limit on how far you can bend the knee, also with a brace (I9 in the generator design).
- Weight-bearing status and crutch use.
- Whether TTO, cartilage work or another concurrent procedure changes the plan.
- Permission to start each new phase (the brace end often follows phase clearance).

## Gaps

- NONE: a consensus on brace use. N1 states there is none.
- NONE: a validated brace duration for isolated MPFLR. S1 states that "no validated rehabilitation protocols are established" after MPFL reconstruction, and S2 found "only one randomised controlled trial on rehabilitation programmes". The literature gives only the practice range (0 to 12 weeks, most often up to 6 weeks) and low-grade comparisons.
- NONE: any source that links a brace duration to a patient factor (age, bilateral, anatomy), so the generator has no input that can drive a duration.
- BASK 2021 (G1) is UNVERIFIED (paywall, V92). It cannot support a rule. AWMF S2e (V93) is NOT READABLE.
- The audit rule applies: every number is a protocol field that a clinician sets. The knowledge base values are reference ranges only (`citation-audit.md` section 6).
- The generator design already follows this. It does not ask about brace type, and `brace` stays "Ask your surgeon" (`docs/protocol-generator-design.md` G12).
