# Protocol generator, version 2: design

Date: 2026-11-09. Status: built on 2026-11-09 after the user decisions 1 to 4 (section 9). The text below is the design as written. Nothing is committed.
Skills loaded with the Skill tool: `simple-english:simple-english`, `owasp-security`. Project skill read as a file: `.claude/skills/mpfl-clinical-guardrails/SKILL.md`.
Start point for the knowledge base: `research/INDEX-v2.md`. This file adds the evidence for version 2 of the generator. It does not repeat the rules of `docs/protocol-generator-design.md` that stay the same.
Quoted source text stays exact. A style hit inside a quote is allowed.

User request, in the words of the user. "loosen the guards when creating the rehab protocol, so that it suggests more complete protocols even without the feedback from the surgeon, using the standard protocols and guidelines."

Verdict scale of this file (rule of the user):
- SUPPORTED: an MPFLR source states the value or the exercise.
- BORROWED: another surgery or another group states it. It can become a generated value only with a clear label.
- WEAK: one source only, or the sources disagree and no conservative side exists.
- NONE: no source. The plan shows "Ask your surgeon" or "Ask your care team".

Grade: every guideline and protocol in this file is OPINION in substance (evidence level 5). The reason is in `research/citation-audit.md` section 3. No trial compares rehab protocols after MPFL reconstruction (`research/citation-audit.md` M9).

## 1. Summary and recommendation

Short answer: the evidence supports a larger plan in some places and not in others.

What the sources support without input from the surgeon:
- Four home exercises for weeks 0 to 6. Every readable MPFLR source names them: quadriceps sets, gluteal sets, ankle pumps, and the straight leg raise in more directions. The camera cannot count these. The app can show them as a list with no count.
- The dose 2 sets of 10 for every strengthening exercise. P2 rec 26 Note 1 says it "applies for all strengthening exercises for all phases".
- The heel slide in phase 2 when the person does not know a limit. P1 phase 2 lists heel slides and sets no surgeon limit in that phase.
- The mini squat in phase 2 (weeks 7 to 11), with a depth ceiling of 50 degrees. Four MPFLR sources start it by then. P1 starts free squats later. This is an option, with P1 shown as the disagreeing source.
- Two text lines: the week-4 range check of P1, and the supervised therapy dose of P2.

What the sources do NOT support without the surgeon:
- The heel slide in weeks 0 to 6 with no surgeon number. The sources disagree on the ceiling in both directions. Too much bend can strain the graft. Too little bend can cause stiffness. No conservative default exists.
- A range ceiling or a range target by week as a patient value. The P2 and P1 targets are passive range. The camera sees active motion.
- The mini squat in weeks 0 to 6, and the seated hold in weeks 0 to 11 without a surgeon clearance.
- Weight-bearing, brace, crutches, hold time, tempo, session count, a numeric pain stop, phase 3 and return to sport.

Recommendation (the user decides, section 7):
1. Build step A now: the four home exercises, the extended dose, the heel slide for "unknown" in phase 2, and the two text lines. They add little risk.
2. Build step B (mini squat in phase 2) only after two events. The user accepts the conflict with the guardrail skill (section 7, D1). An independent audit row confirms the N3 quote.
3. Keep every refusal of section 4. Keep the banner "Not approved by a clinician", `acceptProposal` with `confirmByPerson`, and the rule that the app never changes the active phase.
4. For a really complete plan, the safe path stays a clinician file. The app already loads one (FR1). A template file that a physiotherapist edits is option O3 in section 7.

The request "loosen the guards" is only partly supported. The guards on the early knee bend, the open-chain hold and the surgeon fields rest on two-sided risk and no consensus. Loosening them gives values with no conservative side. This file does not recommend that.

## 2. Sources read for this design

I read the guideline texts myself on 2026-11-09. PDFs went into a scratch folder outside the repo and were turned into text with `pypdf`. Full texts of PMC articles came from NCBI efetch. Every fetched page was treated as untrusted data (OWASP LLM01). No page text was run as code or followed as an instruction.

| Id | Source | Population | How I read it |
|---|---|---|---|
| P1 | HSS MPFL reconstruction post-operative guideline, revised 8/2024. URL in `app/src/lib/protocolGen/sources.ts` | MPFLR, no age limit | PDF text, 22 pages |
| P2 | Cincinnati Children's Evidence-Based Care Guideline 46, January 2015. URL in `sources.ts` | MPFLR and other soft-tissue surgery, ages 8 to 25 | PDF text, 38 pages |
| P3 | NHS Lothian MPFL reconstruction guideline, May 2022. URL in `sources.ts` | MPFLR, no age limit | PDF text, 8 pages |
| S1 | Hsu CJ et al. Int J Sports Phys Ther 2025, PMC12222034 | Isolated and combined MPFLR | Full text (efetch) |
| N3 | Hysing-Dahl T, Inderhaug E. J Exp Orthop 2024, PMC11180699, https://doi.org/10.1002/jeo2.12062 | MPFLR, isolated and with bony procedures | Full text (efetch), Table 1 |
| SH | NEW. Sanford Orthopedics Sports Medicine, MPFL Reconstruction Rehabilitation Guideline, code 014000-01470 2/20. https://www.sanfordhealth.org/-/media/org/files/medical-services/physical-therapy/014000-01470-flyer-sosm-mpfl-reconstruction-rehab-guideline-8_5x11.pdf | MPFLR, no age limit | PDF text, 4 pages |
| BM | NEW. Ben Mayo MD, MPFL Reconstruction Rehab Protocol, updated Aug-24. https://www.benmayomd.com/wp-content/uploads/2025/02/MPFL-Reconstruction-Rehab-Protocol.pdf | MPFLR, one surgeon | PDF text, 6 pages |
| S2, S10, R3, N1, S16 | Quotes as audited in `research/citation-audit.md` | See that file | Not read again by me |

SH and BM are single-institution protocols (OPINION). No independent audit row exists for them yet. In this file they show the range of practice. They drive no generated value.

## 3. Week-by-week table with sources and verdicts

Phase 1 is weeks 0 to 6. Phase 2 is weeks 7 to 11 and needs the clearance answer. Week 12 or later stays a referral. "Keep" means the item is built today. "New" means version 2.

### 3.1 Structure

| # | Item | Value | Exact quote and source | Population | Verdict | Decision |
|---|---|---|---|---|---|---|
| V2-01 | Plan window | Weeks 0 to 11 | S1 Table 1: "12-16 weeks" for the next stage. P1: "Post-Operative Phase 3: (Weeks 12-20)". P3: "12 weeks to discharge" | MPFLR | SUPPORTED | Keep |
| V2-02 | Phase 1 | Weeks 0 to 6 | S1: "0 to 6 weeks". P1: "Post-Operative Phase 1 (Weeks 0-6)". P3 splits at 2 weeks: "Immediate post-op to 2 weeks". SH splits at 3 weeks: "0-3 Weeks", "3-6 Weeks" | MPFLR | SUPPORTED | Keep. One phase |
| V2-03 | Phase 2 start | Week 7 and the clearance answer | P1: "Post-Operative Phase 2 (Weeks 7-11)". S1: "6-12 weeks". P3: "2 weeks to 12 weeks approximately". BM: "4-10 Weeks After Surgery". P2 rec 18 uses goals, not time | MPFLR | SUPPORTED | Keep week 7, the latest start (P1) |

### 3.2 Phase 1, weeks 0 to 6

| # | Item | Value | Exact quote and source | Population | Verdict | Decision |
|---|---|---|---|---|---|---|
| V2-04 | Straight leg raise, flexion | In plan, camera count | S1: "quadriceps setting and straight leg raise should be started immediately after the surgery". P1: "SLR with brace if lag is present" | MPFLR | SUPPORTED | Keep |
| V2-05 | Straight leg raise to the side and to the back | In plan, no count | S1 Table 1: "Quadriceps sets, 3-way straight leg raises". P2 Appendix 1a: "Straight leg raises for hip flexion, abduction, adduction and extension". P3: "hip abduction, hip extension & ankle pumps". P1 phase 1 assessment: "SLR abduction and extension with brace locked in extension" | MPFLR | SUPPORTED | New, step A. Text line: "Ask your surgeon if you must wear your brace for this exercise" (P1) |
| V2-06 | Quadriceps set | In plan, no count | S1: "Quadriceps sets". P1: "Quadriceps set with towel roll under knee". P3: "early static quadriceps sets/isometrics". P2 Appendix 1a: "Quadriceps isometric sets". N3: "Quadriceps sets (isometric and dynamic contractions)" | MPFLR | SUPPORTED | New, step A |
| V2-07 | Gluteal set | In plan, no count | P1 acute care: "Quadriceps sets with towel roll under knee, gluteal sets, ankle pumps". P2 Appendix 1a: "Gluteal isometric sets". N3: "Gluteal sets (isometric and dynamic contractions)" | MPFLR | SUPPORTED | New, step A |
| V2-08 | Ankle pumps | In plan, phase 1 only, no count | P1 acute care: "gluteal sets, ankle pumps". P3: "& ankle pumps". SH weeks 0 to 3: "Ankle pumps" | MPFLR | SUPPORTED | New, step A |
| V2-09 | Dose of a strengthening exercise | 2 sets of 10 | P2 rec 26: "strengthening exercises are initiated in2 sets of 10-15 repetitions of exercises as appropriate, with progression to 3 sets of each exercise as tolerated". Note 1: "This recommendation applies for all strengthening exercises for all phases of rehabilitation". P2 rec 25: strengthening "begin with isometric and isotonic exercises". Disagreeing: BM: "Quad sets and SLR (300-500 reps a day)" | MPFLR, ages 8 to 25 (P2) | SUPPORTED, with the age label | New for V2-05, V2-06, V2-07. The lowest bound. No progression to 3 sets, because Note 2 leaves change "per clinical judgment" |
| V2-10 | Dose of ankle pumps and heel slide | None | P2 rec 26 covers strengthening only. No source gives a count for range exercises | Not applicable | NONE | "How many: ask your care team" |
| V2-11 | Hold time of the quadriceps set | None | P1: "Fair to good quadriceps contraction for 10 seconds" is a criterion for advancement, not a dose | Not applicable | NONE | Not generated |
| V2-12 | Hold time of the straight leg raise | None | P2: "without an extensor lag for 10 seconds" is a test goal (`rehab-rules.md` section 3). Handouts give 3 to 10 seconds (`technique-sources.md` S8) | MPFLR test, BORROWED handouts | NONE | Not generated |
| V2-13 | Heel slide with a surgeon number | In plan, ceiling = the number | S1: "Heel slides, supine wall slides". P3: "Commence heel slides". P1: "Avoid KF ROM beyond surgeon guidelines" | MPFLR | SUPPORTED | Keep |
| V2-14 | Heel slide with no surgeon number | Not in plan | S1, P3 and N3 start it in phase 1. P1 starts it in phase 2: "heel slides once KF >120". The ceiling has no agreed value (section 3.5) | MPFLR | WEAK | Keep the refusal |
| V2-15 | Range target by week | Not a patient value | P2: "Achieve ≥ 90° knee flexion PROM by 4 weeks post-operation", "Achieve ≥ 120º by 6 weeks post- operation". P1: "KF ROM >90° by 4 weeks and progressing to 120 by 6 weeks" | MPFLR, P2 ages 8 to 25 | SUPPORTED as a clinician reference | New: show in the clinician summary only. Never as a patient target (section 3.5) |
| V2-16 | Week-4 range check line | Text, weeks 3 to 6 | P1: "Contact surgeon if ROM not trending towards 90° by 4 weeks" | MPFLR | SUPPORTED | New, step A. Text: "Your care team checks your knee bend at about 4 weeks after surgery (P1). If no check is planned, contact your care team." |
| V2-17 | Mini squat, weeks 0 to 6 | Not in plan | Early: P2 Appendix 1a (initial phase): "Mini squats with hip hinge emphasis". N3 weeks 0 to 6: "Mini squats range 0–50° knee flexion". P3 from 2 weeks: "mini squats, leg press, heel raises, step ups". BM weeks 0 to 2: "mini squat and weight shifts". Later: SH weeks 6 to 12: "Mini-squats". P1 weeks 12 to 20: "Squat progression: chair squats to free squats" | MPFLR | WEAK (start from week 0 to week 12) | Keep the refusal |
| V2-18 | Seated hold | Not in plan | P1 phase 1: "Do not perform AROM open chain KE". P2 rec 29: "short arc quadriceps exercises (knee extension from 30° to 0°) and long arc quadriceps exercises in the terminal range of 30° to 0° are avoided". Disagreeing: P3 phase 2 "OKC quadriceps exercises should be progressed as able". S1 phase 1: "Knee extensor/flexor: isometric/concentric (limited by ROM/weight- bearing precautions)" | MPFLR | SUPPORTED as a protective refusal | Keep the refusal |

### 3.3 Phase 2, weeks 7 to 11, after the clearance answer

| # | Item | Value | Exact quote and source | Population | Verdict | Decision |
|---|---|---|---|---|---|---|
| V2-19 | Exercises of phase 1 | Continue | P1 phase 2: "Continue phase I exercises, as appropriate" | MPFLR | SUPPORTED | New: the phase 1 list of V2-04 to V2-07 continues. Ankle pumps stop (phase 1 only in P1 and P3) |
| V2-20 | Heel slide for "no limit" | In plan, no ceiling | P1 phase 2: "KF: progress from sitting to stair ROM, heel slides once KF >120". P1 phase 2 exit: "ROM 0° KE to > 125° KF, no limits" | MPFLR | SUPPORTED | Keep |
| V2-21 | Heel slide for "I do not know" | In plan, no ceiling | Same as V2-20. The precautions of P1 phase 2 do not repeat "Avoid KF ROM beyond surgeon guidelines". S1: "Full knee ROM should be achieved during this phase". P3 phase 2: "Gradually increase ROM to achieve full hyper extension and full flexion" | MPFLR | SUPPORTED | New, step A. Text: "If your surgeon gave you a knee-bend limit, enter it. The app then uses it." The P1 condition "once KF >120" is passive range. The app cannot check it (section 3.6) |
| V2-22 | Mini squat, weeks 7 to 11 | In plan, camera count | P3 (2 to 12 weeks): "mini squats". P2 rec 40: "isotonic Closed Kinetic Chain Exercises (CKCE) are initiated using a double limb stance". N3 weeks 6/8 to 12: "Progressive resisted quadriceps strengthening (squats, step‐ups, lateral step downs, leg press, wall slides". SH weeks 6 to 12: "Limited depth closed chain quad strengthening (0-60 degrees)" with "Mini-squats". S1 phase 2: "both open-chain and closed-chain exercises are both effective". P1 phase 2: "Sit to stand starting with elevated seat height". Disagreeing: P1 free squats only from week 12 | MPFLR | SUPPORTED, P1 disagrees | Option, step B (section 7, D1) |
| V2-23 | Mini squat depth ceiling | `maxFlexion` 50 degrees | N3: "Mini squats range 0–50° knee flexion". SH: "Limited depth closed chain quad strengthening (0-60 degrees)". S16 (healthy): "a smaller knee angle range between 0 degrees and 50 degrees". `rehab-rules.md` section 2: "0 to 50 degrees (S16, healthy) until the surgeon sets depth" | MPFLR (N3, SH), BORROWED (S16) | SUPPORTED | Step B. The lower value, 50. A surgeon number can only lower it |
| V2-24 | Mini squat gates | Two answers of the person | S1 phase 1 milestones: "Straight leg raise without extension lag", "Walking without crutches". P1 leg press rule: "ability to demonstrate active quad contraction with SLR" | MPFLR | SUPPORTED | Step B. Both answers must be Yes. Else no mini squat, and no referral |
| V2-25 | Mini squat dose | 2 sets of 10 | P2 rec 26 Note 1, as V2-09 | MPFLR, ages 8 to 25 | SUPPORTED, with the age label | Step B |
| V2-26 | Mini squat hold time and tempo | None | Handouts give 5 to 10 seconds (`technique-sources.md` M7). No MPFLR tempo (`rehab-rules.md` section 3) | BORROWED | NONE | Not generated |
| V2-27 | Seated hold without a surgeon clearance | Not in plan | P1 phase 2: "Do not perform AROM open chain KE, unless cleared by surgeon" | MPFLR | SUPPORTED as a protective refusal | Keep |
| V2-28 | Seated hold with a reported surgeon clearance | Arc end `minFlexion` 40 degrees | P1 phase 2: "Follow surgeon preference and patient tolerance for open chain strengthening in a limited arc of motion (90-40 degrees)". P2 rec 39 Note: "It may be helpful to perform OKCE for knee flexion/extension initially only from 90°-30°". Disagreeing: SH weeks 6 to 12: "Open chain knee extension (SAQ 0-60 degrees)" | MPFLR | SUPPORTED for 40 (the more conservative end) | Option, step C (section 7, D4). The hold angle is ENGINEERING. The hold time is NONE |
| V2-29 | Supervised therapy line | Text | P2 rec 17: "dosage of physical therapy be approximately 2-3 times per week with a supplemental HEP" | MPFLR, ages 8 to 25 | SUPPORTED as a statement | New, step A. Text: "Published guidelines expect physiotherapy visits about 2 to 3 times each week (P2)." It is not a home session count |

### 3.4 Items that stay out in every week

| # | Item | Reason and source | Verdict |
|---|---|---|---|
| V2-30 | Home session count | No source gives one. P2 rec 17 is supervised therapy. P3 "Ice 20 minutes, 2 hourly" is for ice | NONE |
| V2-31 | Rep tempo | `rehab-rules.md` section 3: "No MPFLR source gives a tempo" | NONE |
| V2-32 | Weight-bearing, crutches, brace | N1: "no consensus on postoperative immobilization or weightbearing". P1: "Avoid ambulation without crutches for at least 2 weeks" against P3 "Mobilise weight bearing as tolerated" | NONE (consensus) |
| V2-33 | Numeric pain stop | `rehab-rules.md` section 4: "No MPFLR source read gives a numeric pain or swelling level that stops an exercise". The FR12 floor stays an app rule | NONE |
| V2-34 | Ice dose | P3 only: "Ice 20 minutes, 2 hourly (1)" | WEAK (one source). Not generated. Ice is outside the exercise plan |
| V2-35 | Patellar mobilisation | P1: "Patella mobilization as per surgeon". P2 rec 23: "(not lateral)". A therapist does it | NONE for a home value |
| V2-36 | Short-arc extension 0 to 60 degrees | SH only. It conflicts with P2 rec 29 and P1 | WEAK. Not generated |
| V2-37 | Phase 3 content, running, return to sport | Gates need strength and hop tests. P3: "Strength should be 90% of the unaffected side prior to commencing plyometric and jogging/running drills". The camera cannot measure strength (`rehab-rules.md` section 5) | NONE for the app. Referral R10 stays |

### 3.5 The heel slide without a surgeon limit

Question: can the app give a conservative default heel slide in weeks 0 to 6 with no surgeon number?

The sources give these values for the early knee bend:

| Source | Early value | Kind | Population |
|---|---|---|---|
| S1 | "Typically, patients start 0°-30° in the first or second week and progress by 20°- 30° per week" | Description of practice | MPFLR |
| SH | "Knee flexion 0-30/45 depending on MD preference" in weeks 0 to 3. "0-90 degrees (No active knee extension through ROM)" in weeks 3 to 6 | Ceiling, set by the surgeon | MPFLR |
| BM | "Active and passive gradual knee flexion 0-60 degree" in weeks 0 to 2 | Ceiling | MPFLR, one surgeon |
| P1 | "Seated knee AAROM KF (0°-90° degrees by 4 weeks post-operative)" | Target, assisted | MPFLR |
| S2 | "Weightbearing and ROM (≤ 90°) restriction were within three weeks post-operatively for > 50% of the programmes" | Practice count | MPFLR |
| P2 | "Achieve ≥ 90° knee flexion PROM by 4 weeks post-operation", "Achieve ≥ 120º by 6 weeks post- operation" | Floor, passive | MPFLR, ages 8 to 25 |
| N3 | "Passive knee flexion of >125°" in weeks 0 to 6 | Goal, passive | MPFLR |

Reading:
- A ceiling of 90 degrees is above the early limit of SH (30 to 45) and S1 (0 to 30). It is not conservative in weeks 0 to 3.
- A ceiling that follows S1 (30, then plus 20 each week) gives 70 degrees at week 4. That is below the P2 and P1 floor of 90. It can add stiffness. `docs/protocol-generator-design.md` G6 removed this ceiling for that reason.
- No ceiling at all removes the guard in the window where surgeon limits are most common (S2).
- The risk has two sides: graft strain and stiffness (`rehab-rules.md` section 1). P1 "Follow more conservative guideline" cannot pick a side here.

Verdict: no honest default exists for weeks 0 to 6. A target by week (for example 90 at week 4) is passive range. The camera measures active motion, which is usually less (`research/citation-audit.md` 4.5). A target is also a goal, which the guardrail skill forbids. The design keeps the refusal of V2-14. The week-4 line (V2-16) and the red flag "Your knee bend is getting less, or it is not getting better." keep the stiffness side covered.

From week 7, the honest default exists (V2-20, V2-21). P1 and S1 expect full range in phase 2.

### 3.6 What the camera cannot measure

Facts from `research/technique-sources.md` and `research/form-evidence.md`. The 2D error is about 9 degrees at best and 9 to 22 degrees on exercise video (F1, F3).

| New item | What the handouts ask | Can the camera measure it | App behavior |
|---|---|---|---|
| Quadriceps set, gluteal set | Tighten a muscle | No. Muscle tension is not visible (technique point S1) | List item with no count. Text: "The app does not check this exercise." |
| Ankle pumps | Move the foot | Not reliable. Foot landmarks are weak (technique point S6) | List item with no count |
| Straight leg raise to the side and back | Lift in another plane | No. The side view sees only the sagittal plane. Frontal angles are not valid (M2, F4) | List item with no count |
| Heel slide for "unknown" in phase 2 | Bend "as far as comfortable" (T9) | The bend is measurable (CUE, check 1). With no ceiling, no stop cue | Count only. No ceiling cue. The angle label stays |
| P1 condition "once KF >120" | Passive range of 120 degrees | No. Passive range is not active camera range | Not checked. Shown as a text line |
| Mini squat depth | Stay inside a depth | Yes, side view, with the margin rule of FR8 (`technique-sources.md` M3) | CUE "stop at your limit, do not push" above 50 plus the margin |
| Mini squat knees over toes | No inward knee | No. Front view needed, bias about 19 degrees (F4) | Text guide only (`technique-sources.md` M4) |
| Mini squat gates | No knee bend in the leg raise, walking without crutches | No. A lag of 10 degrees is inside the error (form-evidence check 5). Gait is not measured | Self-report only. The Why screen says "Reported by you. Not checked by the app." |

## 4. What stays "Ask your surgeon" or "Ask your care team"

| Item | Text in the plan | Reason |
|---|---|---|
| Knee-bend limit in weeks 0 to 6 | "Ask your surgeon" | Two-sided risk, no agreed value (section 3.5). `docs/clinical-limits.md` surgeon decision 1 |
| Weight-bearing, crutches, brace | "Ask your surgeon" | N1 no consensus (V2-32). Surgeon decisions 2 and 3 |
| Start of each phase | "Ask your care team about the next stage" | P2 rec 18 uses goals. P1 needs criteria the app cannot measure. Surgeon decision 6 |
| Squat depth above 50 degrees | "Ask your surgeon" | Surgeon decision 7. Only N3 and SH give an early depth |
| Open-chain extension, its arc and hold time | "Ask your surgeon" | P1 "unless cleared by surgeon". Hold time NONE |
| Dose of range exercises, hold time, tempo, session count | "Ask your care team" | NONE (V2-10 to V2-12, V2-30, V2-31) |
| Pain and swelling stop | The FR12 floor stays | NONE (V2-33). Surgeon decision 14 |
| Running, jumping, return to sport | "Ask your care team" | Gates need strength tests (V2-37). Surgeon decisions 8 and 9 |
| Revision, combined surgery, under 18, both knees, special rules | Referral, no plan | Unchanged (R2 to R6) |

## 5. Risk analysis

### 5.1 Worst outcomes of an unapproved plan

| Risk | How the plan can cause it | Which item adds it | Control in version 2 |
|---|---|---|---|
| Graft stretch or failure, new instability | Too much knee bend early, or load on a knee that the surgeon restricts | Heel slide without a number in weeks 0 to 6 (not built). Mini squat (step B) | V2-14 refusal stays. Mini squat only from week 7, after clearance, two gates, and a ceiling of 50 |
| Kneecap dislocation during a standing exercise | A closed-chain squat on an unstable knee | Mini squat (step B) | Red flag "kneecap-moved" and the "knee gave way or hurts" button. New: a "knee gave way" event removes the mini squat (section 6, step 9) |
| Overload of a bone cut that the person did not report | Isolated values after a TTO | Mini squat, more exercises | R2 stays. N3 starts mini squats after bony procedures only "After 4–6 weeks". Week 7 is later than that, so the residual is smaller |
| Stiffness | No range work, or a ceiling that is too low | None of the new items | No generated ceiling. V2-16 line. Red flag "bend-loss" |
| Pain and effusion from more volume | Four more exercises at 2 x 10 | V2-05 to V2-07, V2-25 | FR12 floor, R9, red flag "swelling". P1: "Avoid provocation of quadriceps inhibition, joint effusion, active inflammation" |
| False trust in a complete-looking plan | The plan looks like a clinician plan. The person skips physiotherapy | All new items | Banner on every screen. The "Not in your plan" list. V2-29 line. P2 rec 17 Note: supervised visits give "greater gains" |
| Camera misses an overshoot | Video error up to 22 degrees | Mini squat ceiling | The FR8 margin warns early. A miss of 22 degrees gives about 72 degrees of true bend, still below the P2 end goal of 90 |
| Regulatory class | More personalised exercise advice to a patient | All new items | Unchanged and still open (`docs/protocol-generator-design.md` section 9). MDCG 2019-11 names software that recommends "personalised rehabilitation exercises" |

### 5.2 Do the core rules still hold?

- "A generated plan is never clinician-approved": yes. No new item writes `approvedOn`. The banner text stays `GENERATED_BANNER`.
- Person confirms before save: yes. The new items go through the same `acceptProposal` path with `PersonConfirmation`.
- No silent phase change: yes. Phase 2 still needs week 7, the clearance answer and Confirm. A new gate answer never changes `activePhase`.
- Guardrail skill: NO for step B and step C. The skill says: "Every clinical number in a protocol is a field that a clinician sets". A generated depth ceiling of 50 and an arc end of 40 break this line. The dose 2 x 10 already breaks it (option C, recorded in `MPFL_APP_PLAN.md` section 11.4). Section 7, D1, asks the user.
- Citation audit condition 1 (`research/citation-audit.md` section 6) says the same. Step B goes against it.

### 5.3 Referrals and checks that must tighten

1. Red flags at every session and at every "Update my plan": unchanged, and still first in the order of checks.
2. New event rule: a "knee gave way" press or a red flag "giving-way" removes the mini squat. The removal happens at the next "Update my plan" after the event. The removal needs only Confirm, because it is a more conservative change. Source: P2 rec 4 "Unchanging or increased irritability in the knee".
3. New gate rule: the mini squat needs both gate answers (V2-24) at each "Update my plan". "No" or "I do not know" removes it.
4. R2 text: add "tibial tubercle osteotomy" in plain words to the help line of I2. This lowers the chance of a misreported bone cut.
5. R10 stays at week 12. No phase 3 content is generated.
6. RX fail closed stays. A new rule that throws gives a referral, never a partial plan.

## 6. Changes to the generator rules and tests

A Sonnet agent can follow these steps in order. Write the test first for each step. Do not start a step before the step before it passes. Run only the targeted test files and `bash app/scripts/claims-check.sh app/src`.

### 6.1 Preconditions (no code)

1. The user decides D1 to D5 of section 7. Build only the steps that the user accepts.
2. An independent audit agent adds rows to `research/citation-audit.md` for each new quote of section 3. The minimum set:
   - N3 Table 1 quotes.
   - P1 "Continue phase I exercises, as appropriate", P1 acute care "gluteal sets, ankle pumps", P1 phase 2 exit "no limits".
   - P3 "hip abduction, hip extension & ankle pumps".
   - P2 rec 17, P2 rec 25 and the P2 Appendix 1a items.
   - S1 "3-way straight leg raises".

    If a quote is not EXACT, its item is not built.
3. For step B, the user approves a change to `.claude/skills/mpfl-clinical-guardrails/SKILL.md`, section Behavior, first line. The agent does not edit the skill without that approval.

### 6.2 Schema (`app/src/lib/protocol/schema.ts`)

4. Add an optional array `homeExercises` to a phase, at most 10 items. Each item is a strict object with these keys:
   - `kind` from the enum `['quad-set', 'gluteal-set', 'ankle-pump', 'leg-raise-side', 'leg-raise-back']`.
   - Optional `sets` (1 to 20) and optional `reps` (1 to 100).
   - `source` (string, at most 200).

    No angle field. The camera never reads this array.
   Tests in `tests/protocolHomeExercises.test.ts`:
   - "accepts a phase with home exercises".
   - "rejects an unknown home exercise kind".
   - "rejects an angle field on a home exercise".
   - "rejects more than 10 home exercises".
   - "keeps a loaded file without home exercises valid".

### 6.3 Sources (`app/src/lib/protocolGen/sources.ts`)

5. Add the new quotes to P1, P2, P3, S1 and N3. Set N3 `audit` to `EXACT` only after step 2 gives EXACT rows, and add those row ids to `auditRows`. Do not add SH or BM. They are not audited.
   Tests: the existing quote test in `tests/protocolGenSources.test.ts` must find each new quote in `research/citation-audit.md` or `research/rehab-rules.md`.

### 6.4 Rules (`app/src/lib/protocolGen/rules.ts`)

6. Add these rules. Each has `sourceIds`, `grade: 'OPINION'`, `population` and one plain `text` sentence.

| Rule id | Kind | Values | Sources | Text for the Why screen |
|---|---|---|---|---|
| HOME | generated | none | S1, P1, P2, P3, N3 | "Quadriceps sets, gluteal sets and leg raises to the side and back are in your plan. The app does not check them." |
| ANKLE | generated | none | P1, P3 | "Ankle pumps are in phase 1." |
| DOSE | generated (change) | `{ sets: 2, reps: 10 }` | P2 | Add: "This dose applies to every strengthening exercise in your plan (P2)." |
| HEEL_P2_UNKNOWN | generated | none | P1, S1, P3 | "In phase 2 the heel slide is in your plan also when you do not know a limit. If your surgeon gave you a limit, enter it." |
| ROM_CHECK | generated | none | P1 | "Your care team checks your knee bend at about 4 weeks after surgery (P1). If no check is planned, contact your care team." |
| PT_VISITS | generated | none | P2 | "Published guidelines expect physiotherapy visits about 2 to 3 times each week (P2)." |
| SQUAT_P2 (step B) | generated | none | P3, P2, N3, S1 | "From week 7, after your care team said you can start the next stage, the mini squat is in your plan. P1 starts free squats later, at week 12." |
| SQUAT_DEPTH (step B) | generated | `{ maxFlexion: 50 }` | N3 | "The mini squat stops at 50 degrees of estimated knee bend (N3). A limit from your surgeon can only lower it." |
| SQUAT_GATE (step B) | protective | none | S1, P1 | "The mini squat needs your report that you walk without crutches and lift your leg without the knee bending. The app does not check this." |
| SQUAT (change) | protective | none | P1, P3, N3, P2 | "The app adds no mini squat in weeks 0 to 6. Published plans start it at different times." |

7. Keep every rule of today. Keep `RANGE_NONE`, `HOLD`, `DOSE_NONE`, `PAIN` and every `NONE_*` rule. Change `DOSE_NONE` text to name the heel slide and ankle pumps.
   Tests in `tests/protocolGenRules.test.ts`:
   - "gives every new rule a source, a grade and a population".
   - "lets SQUAT_DEPTH rest only on a verified source".
   - "keeps the heel slide dose as NONE".
   - "keeps the knee-bend ceiling of phase 1 as NONE".
   - "writes the new texts in short sentences with no banned word".
   Update "has a referral text for each referral rule and the ten cases": the count stays ten.

### 6.5 Inputs (`app/src/lib/protocolGen/inputs.ts`), step B only

8. Add `walksWithoutCrutches: yesNoUnknown`, `legRaiseStraight: yesNoUnknown` and `squatLimit` with the same union as `surgeonLimit`. Ask them only from week 7 when `phaseClearance` is `yes`. The answers are enums or one number. No free text.
   Tests in `tests/protocolGenInputs.test.ts`: "rejects an unknown key", "rejects a squat limit outside 0 to 180", "rejects a free-text answer".

### 6.6 Generator (`app/src/lib/protocolGen/generate.ts`)

9. Phase 1: add `homeExercises` with quad set, gluteal set, ankle pump, leg raise side and leg raise back. The four strengthening items get `sets` 2 and `reps` 10 with origin `rule` and rule `DOSE`. Ankle pump gets no dose.
10. Phase 2: the same list without the ankle pump. The heel slide is added for `limit.kind === 'unknown'` as well (rule `HEEL_P2_UNKNOWN`). It gets no `maxFlexion`.
11. Step B: in phase 2, add the mini squat only when `walksWithoutCrutches === 'yes'` and `legRaiseStraight === 'yes'`. Set `maxFlexion` to the lower of 50 and the squat limit in degrees. Set `targetFlexion` to `2 × MARGIN_DEG` and `returnWithinDeg` to `MARGIN_DEG` (rules `ENG_TARGET`, `ENG_RETURN`). Set `sets` 2 and `reps` 10. If the squat limit is lower than `3 × MARGIN_DEG + 1`, add no mini squat.
12. Add `why` entries for every new rule, with `outcome` and `applied` paths, as today.
13. In "Update my plan" (`app/src/ui/UpdatePlan.tsx`), a "knee gave way" event or a red flag "giving-way" since the last change removes the mini squat. The screen lists the removal with rule id `SQUAT_GATE`. The person presses Confirm.
   Tests in `tests/protocolGenGenerate.test.ts`, named by rule:
   - "adds the four home exercises in phase 1 with 2 sets of 10, and ankle pumps with no dose" (HOME, ANKLE, DOSE).
   - "drops ankle pumps in phase 2 and keeps the other home exercises" (HOME).
   - "adds the heel slide in phase 2 for an unknown limit with no ceiling" (HEEL_P2_UNKNOWN).
   - "never adds the heel slide in phase 1 for an unknown limit or for no limit" (refusal V2-14).
   - "never adds a mini squat in weeks 0 to 6" (SQUAT refusal).
   - "adds the mini squat from week 7 only with clearance and both gate answers yes" (SQUAT_P2, SQUAT_GATE).
   - "refuses the mini squat for each gate answer no or unknown" (SQUAT_GATE, six cases).
   - "sets the squat ceiling to 50, or to the lower surgeon number" (SQUAT_DEPTH).
   - "leaves out the mini squat when the surgeon squat limit is below the camera minimum" (ENG_TARGET).
   - "never adds a seated hold in weeks 0 to 11" (HOLD).
   - "shows the week-4 line and the physiotherapy line in every plan" (ROM_CHECK, PT_VISITS).
   - Every referral test of today stays: R1 to R10 and RX. Add "refers at week 12 also when the plan has a mini squat" (R10).
   Tests in `tests/protocolGenProperties.test.ts`:
   - "never gives a mini squat ceiling above 50" (SQUAT_DEPTH).
   - "never gives a heel slide ceiling that the person did not enter" (RANGE_NONE).
   - "never fills a hold time, a tempo or a home session count" (NONE rules).
   - "gives every number in `homeExercises` a rule, a source and a grade" (DOSE).
   - "never writes `approvedOn` and always writes `generated`" (unchanged).
   Tests in `tests/ui/updatePlan.test.tsx`: "removes the mini squat after a knee gave way event and needs Confirm", "keeps the stored bytes after Keep my current plan".

### 6.7 Screens

14. Plan preview and Home: show `homeExercises` as a plain list under the camera exercises. Each line shows the name, "2 sets of 10" or "How many: ask your care team", and "The app does not check this exercise."
15. Why this plan: section 6.8.
16. Clinician summary (`app/src/ui/` review view): add one line. The text is `Published passive range targets: ≥ 90° by 4 weeks, ≥ 120° by 6 weeks (P2, ages 8 to 25). Passive range. The camera measures active motion.` Patient screens never show it.
   Tests: component tests for each new text. Run `claims-check.sh` on every new file.

### 6.8 The Why this plan screen

Each entry is one card in the existing `details` element. A card has five lines, in this order:
1. The value as the plan uses it. Example: "Mini squat: estimated knee bend stops at 50 degrees."
2. The quote and the source name, with the year and the link of `sources.ts`. Example: "N3, Hysing-Dahl and Inderhaug 2024: "Mini squats range 0–50° knee flexion"."
3. The population and the grade. Example: "After MPFL reconstruction. Expert opinion (OPINION)."
4. The verdict label in plain words. SUPPORTED shows "Stated by a published MPFL protocol". BORROWED shows "Taken from another surgery or group: [group]". The dose card adds "Guideline for ages 8 to 25".
5. The line "Not approved by a clinician".

A disagreeing source shows as one more line: "P1 starts free squats later, at week 12." A self-reported gate shows "Reported by you. Not checked by the app." The card has no colour verdict and no goal word. The list "Not in your plan, and why" stays, with the items of section 4.

## 7. Open decisions for the user

| # | Decision | Options | Recommendation |
|---|---|---|---|
| D1 | Generated depth ceiling for the mini squat, against the guardrail skill and citation-audit condition 1 | (a) keep the mini squat out. (b) build step B and change the guardrail skill. (c) add the mini squat only with a squat limit that the person enters from the surgeon | (c) is closest to the guardrails. (b) is what the request asks. I do not decide |
| D2 | Step A: the four home exercises, the extended dose, the heel slide for "unknown" in phase 2, and two text lines | Build, or not | Build. Low risk, SUPPORTED by every readable source |
| D3 | Heel slide in weeks 0 to 6 with no surgeon number | (a) keep the refusal. (b) a generated ceiling of 90 | (a). Section 3.5 shows no conservative side |
| D4 | Seated hold in phase 2 after a reported surgeon clearance, with the arc end 40 (P1) | (a) keep it out. (b) add it with `minFlexion` 40 and an ENGINEERING hold angle, no hold time | (a) for now. The hold counter with no `holdSeconds` needs a check first |
| D5 | The clinician summary line with the P2 passive targets | Show, or not | Show, clinician view only |
| O3 | A template protocol file for a physiotherapist to edit and load | Build a template from the rows of section 3, with each value marked "set by your clinician" | Recommended as the path to a complete plan with a clinician name and `approvedOn` |

## 8. What I was not able to verify

- BASK 2021 consensus (G1): full text behind a paywall. A new search on 2026-11-09 found no open copy.
- N1 Delphi primary text: paywall, as before.
- SH and BM: read in full by me, but no independent audit row exists. They drive no value.
- The quotes of N3 Table 1 were read by me on 2026-11-09. `sources.ts` marks N3 "NOT AUDITED". An independent row is needed (step 2).
- The other single-surgeon protocols in my search results (Orthony, Salina, Daniel Sutton, Skyline) were not opened. I did not quote them.
- Whether the hold counter works with no `holdSeconds`. I did not open the counter code.
- The camera error of the `lite` model for a standing squat. No study exists (`research/form-evidence.md`, Gaps).
- The regulatory class of a larger generated plan. It stays with the expert.
- No clinician reviewed any row of this file.

Style check: `python3 ~/.claude/scripts/ste-check.py docs/generator-v2-design.md`. The result is in the final report of this task.

## 9. Build record, 2026-11-09

User decisions: 1 (build step A), 2 (add the mini squat if the guidelines recommend it), 3 (keep the early heel slide refused).
- Decision 4: the seated hold after the reported clearance, with the limited arc.

- Step A is built. The schema has `homeExercises`. The plan has five home exercises and the dose 2 x 10. It has the heel slide in phase 2 for an unknown limit. It has the lines ROM_CHECK and PT_VISITS.
- Step B (D4) is built. The seated hold needs the report that the surgeon cleared it. The arc end is 40 degrees. No hold time is set.
- The hold counter with no hold time was verified. `counterSetup` returns "ask-your-surgeon" with `missing: 'holdSeconds'`, and `createPipeline` refuses to start. The Home screen shows the hold as not ready. The hold runs only after a clinician sets a hold time. A test in `app/tests/protocolGenV2.test.ts` pins this.
- The N3 audit is done (`research/citation-audit.md` section 9, rows V95 to V118). Every row is EXACT. N3 gives "Mini squats range 0–50° knee flexion" for weeks 0 to 6 of an isolated MPFL reconstruction. It gives no depth for weeks 7 to 11.
- Step C (D1) is built. The number 50 is an EXACT quote from N3. S16 gives the same range for healthy people. Weak points stay. N3 lists this range for weeks 0 to 6, and the plan uses it from week 7. P1 starts free squats at week 12.
- The two gates are an own reading of S1 and of one P1 line about the leg press. S1 calls them "milestones of the protection phase". The screens say "Reported by you. Not checked by the app."
- The mini squat count of the camera has no live test. The knee gave way event reads saved sessions since the plan date.
- The guardrails skill has one narrow exception (user decision 2). The skill change ran the loop of `skill-creator:skill-creator` in a reduced form. See `skill-workspaces/mpfl-clinical-guardrails-workspace/iteration-5/benchmark.md`.
- Still open: the review of every row by a clinician, the regulatory class, and a live run of the new plans.

## 10. Held back behind a flag, and why

The independent audit (`docs/audit-generator-v2.md`) read the sources again. The user rule for the mini squat was "add it ONLY IF the guidelines recommend it". The audit says that this condition is not cleanly met. Three items are now off by default. The build flag `VITE_GENERATOR_EXTENDED` turns them on. Only the exact text "true" counts. One function reads it: `generatorExtendedOn` in `app/src/lib/mode.ts`.

| Item | Why it is held back |
|---|---|
| Mini squat from week 7 | Only P3 lists the mini squat in this window, as an example. P1 starts free squats at week 12. No source gives the depth 50 for weeks 7 to 11. N3 gives it for weeks 0 to 6. The two gates and the removal after a knee gave way are BORROWED or WEAK |
| Seated hold | The arc end 40 is an exact P1 quote in the right phase. P1 does not name a hold. The clearance is only a report. The hold angle uses a margin that is not verified for the camera model |
| Heel slide in phase 2 for an unknown limit | P1 starts the heel slide once the knee bends more than 120 degrees. The app cannot check this bend and sets no ceiling |

With the flag off, these items are not in the plan. The three extra questions are not asked. The rule EXTENDED_OFF tells the person to ask the care team. The home exercises, the dose, the two text lines and the heel slide with a surgeon limit or with "no limit" stay on.
With the flag on, the behaviour is as built. The audit defects are fixed. The seated hold now also leaves the plan after a knee gave way press. The heel slide text now carries the P1 line about 120 degrees and says to ask the care team. The squat depth entry now shows that P2 starts wall squats at 45 degrees and that the sources disagree. The ankle pump text now says what P1 and P3 say. The dose text keeps "ages 8 to 25".

The guardrails skill still holds the narrow exception for the squat depth. While the flag is off, that exception has no effect. The user decides whether to revert it.

## 11. Update of 2026-11-11: the extended items are on by default

The user decided that the app proposes the full plan from the guidelines. The function `generatorExtendedOn` in `app/src/lib/mode.ts` now returns true unless `VITE_GENERATOR_EXTENDED` is the exact text `false` or `0`.
The flag gates four things: the mini squat (SQUAT_P2, SQUAT_DEPTH, SQUAT_GATE), the seated hold (HOLD_P2, ENG_HOLD), the heel slide in phase 2 for an unknown limit (HEEL_P2_UNKNOWN), and the three questions about walking, the leg raise and the clearance of the hold (`gatesAsked` in `app/src/lib/onboarding.ts`, and the Update my plan screen).
The flag value `false` keeps the old behaviour, with the rule EXTENDED_OFF. `VITE_SELF_PROGRESSION` is unchanged. Every number of these rules has an EXACT audit row or is marked as a value that the app sets (test `app/tests/protocolGenAudit.test.ts`, run with the flag unset, `true` and `false`).

Superseded 2026-11-13: the flag is on by default (MPFL_APP_PLAN.md FR31).

Superseded 2026-11-22: the flag is off by default. Only the text `true` or `1` turns it on (see [clinical-limits](clinical-limits.md)).

