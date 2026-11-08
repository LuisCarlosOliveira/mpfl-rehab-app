PICO: Isolated MPFL reconstruction (MPFLR), adult or adolescent, any week after surgery. Question: can the app progress the plan by itself from session data? The answer does not cover combined surgery (TTO, trochleoplasty, cartilage). Those cases need a surgeon protocol.

## Answer

No. The app must not change the phase or the plan by itself. Phase change is a surgeon decision. The evidence does not support automatic progression, and no source gives a safe rule for it.

The app can record session data and show it to a clinician. The clinician decides at a visit and issues a new protocol file. This is the design that the knowledge base supports (progression.md section 1 and section 4, "T1").

## Facts

| Fact | Exact quote or number | Source id | Class | Access | Population |
|---|---|---|---|---|---|
| No trial shows that algorithmic adjustment helps | "AI works as a behavioural amplifier and not as a substitute for the therapist". The authors judge adaptive and prognostic models "not ready for clinical use". 30 studies | El Arab 2026 (progression.md 2.2) | REVIEW | VERIFIED as abstract only (Europe PMC record) | Mixed digital rehab, not MPFLR |
| Digital rehab matches usual care, not better | 23 RCTs, 2607 participants: interactive remote rehab "was not superior". Pain, WOMAC, KOOS and Timed Up and Go showed no advantage | Peng 2026 (progression.md 2.2), T3 | REVIEW | VERIFIED as abstract only | After knee replacement, BORROWED |
| The one adaptive-arm trial found no difference | Adaptive arm difference not significant (P = 0.27). 70 of 860 finished. Maker funded the trial | Kim 2016 (progression.md 2.2) | STUDY | VERIFIED | Knee pain, BORROWED |
| In the best-known commercial trial a human made the adjustments | The therapist "performed adjustments to protocol". An algorithm did not | Cui 2023 (progression.md 2.2) | STUDY | VERIFIED | Chronic low back pain, BORROWED |
| Sword Health is not camera-based and not randomized | "inertial motion trackers". Allocation "was performed according to geographical criteria, and not through randomization". Feasibility study | T1, correction C15 (source-audit.md) | STUDY | VERIFIED (full text) | After TKA, BORROWED |
| Camera feedback after MPFLR | NONE. No trial exists. Literature gives only borrowed trials above | digital-rehab reference | NONE | not applicable | MPFLR |
| No validated protocol and no outcome proof for criteria | "no validated rehabilitation protocols are established" | S1 (citation-audit V1) | OPINION (LoE 5) | VERIFIED | MPFLR |
| Criteria versus time: no head-to-head study | R1: "20 (74%) used evaluation-based guidelines". No study links passing criteria to re-injury after MPFLR (Kang 2026, 6 studies, 243 patients) | R1 (V67), progression.md 2.1 | REVIEW (practice only) | VERIFIED | MPFLR |
| Most criteria are borrowed | Run start: "full ROM or >95% of the non-injured knee, no pain or pain <2/10 ... limb symmetry index of quadriceps >70%" (from an ACL review) | S1 (V53, V63) | OPINION | VERIFIED | BORROWED (ACL) |
| Criteria differ between sources | Quadriceps for run start: 70 percent (S1) versus 90 percent (P3). Conservative value: 90 percent. Never averaged | S1, P3 (rehab-rules.md section 5) | OPINION, CONSENSUS (low) | VERIFIED | MPFLR and BORROWED |
| P2 phase goals are weak | Almost every item ends "(LocalConcensus 2014 [5])". All 55 recommendations use "It is recommended" (weak strength). Dated January 2015. Level 5 | P2 (citation-audit section 3) | OPINION in substance | VERIFIED | Ages 8 to 25, isolated soft tissue |
| P2 flexion targets are passive | "Achieve ≥ 90° knee flexion PROM by 4 weeks", "≥ 120º by 6 weeks". PROM is passive. A camera sees active motion. The two are not one quantity | P2 Table 2 (V11, M3) | OPINION | VERIFIED | P2 population |
| The camera error is large for a gate | Working margin about 9 degrees (best case, F1 LoA ±8.73 and ±8.80, MDC95 10.7). Error depends on the system. The app must measure its own `lite` model | F1 (V85), X1 to X4 (M8) | STUDY | VERIFIED (F1 full text) | Not MPFLR |
| SLR lag of 10 degrees is inside that error | P2: "less than or equal to 10 degrees of extensor lag". Verdict: LOG only, never a progression gate. A false "no lag" can lead to early walking without the brace | P2 Table 2 (V39), citation-audit 4.2 | OPINION | VERIFIED | P2 population |
| Regulation points the same way | MDCG 2019-11: software that adapts therapy by itself is an example of class III (Rule 22). When "a specialist determines the necessary cognitive therapy" it is class IIa. By analogy only. FDA: software that gives recommendations to patients meets the definition of a device | MDCG 2019-11 rev.1, FDA CDS guidance 2026 (progression.md 2.4) | Regulatory text | VERIFIED. Application to this app is UNVERIFIED and needs an expert | Not MPFLR |

## What the app can and cannot see

The app can measure: side-view knee angle, with about 9 degrees error. It can also record time since surgery, and pain and swelling by self-report (rehab-rules.md section 5, progression.md 2.1).

The app cannot measure: quadriceps strength LSI, hop tests, Y-Balance, gait, or effusion grade. These stay clinician inputs. Most phase exit criteria need these items, so session data cannot decide a phase exit.

## Disagreements

- Sources disagree on every threshold that a rule could use (70 versus 90 percent for run start, hop LSI 85 to 95 percent). Conservative value: the higher percent (rehab-rules.md sections 5 and 6). Never average.
- Sources disagree on time. S1 gives "0 to 6 weeks" and ">16 weeks" as phase windows. P3 says timescales are "approximate". Time-only progression has no outcome proof either.

## Safe direction

An automatic pause is a safer direction than an automatic step up. A false pause costs a phone call. A false step up can load a healing graft. This is reasoning, not a cited finding (progression.md 2.3). Pause rules (FR12: pain 7 or more, or swelling "more than before") and the red-flag referral are protective defaults that the app can enforce. They are PROPOSAL values that need clinician review.

## What the app can do instead (PROPOSAL, needs clinician and regulatory review)

- T1: the clinician writes the criteria into the protocol. The clinician view shows measured values against them. The app never changes `activePhase`. The clinician issues a new file.
- T2n: the clinician sets a review date. The patient sees "contact your care team" on that date. It does not depend on measured values.
- Use a margin rule. A value inside the error margin reads "cannot tell".
- The patient view shows no criteria and no verdict.
- T3 (the app proposes, the clinician approves) is not supported yet. It needs a measured error for the `lite` model, a clinician-agreed criteria set, signed protocol files, a regulatory class decision and an ethics-approved pilot.
- T4 (automatic adjustment): do not build it.

## Ask your surgeon

- Permission to start each new phase. The knowledge base criteria are a reference only (clinical.md section 9, item 6).
- Which criteria and limits apply to you.
- Weight-bearing, brace, flexion limit, and permission to run, jump and cut.
- Pain and swelling thresholds that pause the program.

## Gaps

- NONE: any trial of automatic or algorithmic plan adjustment after MPFLR. The literature gives borrowed trials only (knee replacement, back pain, knee pain), with equal results at best.
- NONE: a validated progression criteria set after MPFLR. The literature gives opinion (S1) and ACL-based values.
- NONE: a validated patient swelling report against a clinician exam after knee surgery.
- NONE: the measured error of the app `lite` model on a home webcam. The 9 degree value is UNVERIFIED for this model.
- UNVERIFIED: BASK 2021 consensus (G1) and the N1 Delphi primary text were not readable. They cannot support a rule.
- UNVERIFIED: the claim of "25 to 40 percent better outcomes" for adaptive algorithms. The source did not open. Do not use it.
- The regulatory class of this app is not settled. An expert must decide.

This answer is general. It is not advice for your own knee. If you have a symptom now, contact your care team.
