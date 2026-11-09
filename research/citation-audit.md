# Independent citation audit of the knowledge base

Date: 2026-11-08. Auditor: a separate agent that did not write the audited files.

Scope: `rehab-rules.md`, `form-evidence.md`, `source-audit.md`, `search-log.md`, `INDEX-v2.md`. The aim was to disprove each quote and number against the real source.

Method: I read each source myself. The guideline PDFs (P1, P2, P3) were read as page text in a scratch folder outside the repo. Full texts came from NCBI efetch (PMC). Abstracts came from the Europe PMC REST service by DOI. No paywall or block was worked around.

Style note: quoted source text stays exact. Some quotes contain banned modal verbs. They stay in tables only, so the style check ignores them.

## 1. Result in short

| Verdict | Count |
|---|---|
| EXACT | 81 |
| PARAPHRASED | 8 |
| WRONG | 1 |
| NOT READABLE | 3 |
| SOURCE NOT FOUND | 1 |
| Total rows checked | 94 |

The quotes and numbers are accurate. I found one wrong source attribution and eight paraphrases. None of these changes a number that an app rule uses.

The larger problems are not in the quotes. They are in the grade, the scope and the omissions:
- The mark CONSENSUS for P2 items overstates them. In substance they are OPINION (section 3).
- The flexion targets of P2 are passive range (PROM). A camera measures active motion. The two values are not the same quantity.
- Two readable sources that loosen the open-chain rule and the flexion pace were missed (section 5).

Fitness: the knowledge base is fit to build clinical rules from only under the conditions in section 6. Without those conditions, it is not fit.

## 2. Verdict table

Locations: P1 = HSS PDF, 22 pages. P2 = Cincinnati Guideline 46 PDF, 38 pages. P3 = NHS Lothian PDF, 8 pages. "Abstract" means the Europe PMC record. PMC ids are full texts.

| # | Claim in the knowledge base | Where I found it | Verdict | Note or true wording |
|---|---|---|---|---|
| V1 | S1 "no validated rehabilitation protocols are established" | S1 PMC12222034, Conclusions | EXACT | |
| V2 | S2 "only one randomised controlled trial on rehabilitation programmes" | S2 abstract | EXACT | |
| V3 | S1 phases "0 to 6 weeks" to ">16 weeks", "The RTS phase (>20 weeks)" | S1 Table 1 and RTS text | EXACT | |
| V4 | P3 phase windows | P3 pages 3 to 5 | EXACT | |
| V5 | S1 "progress through phases based on meeting clinical criteria" | S1 text | EXACT | |
| V6 | P3 "timescales are approximate, and rehabilitation should be guided ..." | P3 page 3, Key Points | EXACT | |
| V7 | S1 "ROM should be initiated within the first two weeks ..." | S1 protection phase text | EXACT | |
| V8 | P3 "Commence gentle active ROM exercises as pain allows" | P3 page 3, Phase 1 | EXACT | |
| V9 | N1 Delphi: early motion, "full ROM should be achieved by 6 weeks" | S10 PMC13247021, Discussion | EXACT | Second-hand. Primary text NOT READABLE (V91) |
| V10 | S1 "Typically, patients start 0°-30° ... progress by 20°- 30° per week" | S1 protection phase text | EXACT | |
| V11 | P2 "≥ 90° knee flexion PROM by 4 weeks", "≥ 120º by 6 weeks" | P2 page 7, Table 2 | EXACT | PROM = passive range. Goal table, "(LocalConcensus 2014 [5])" |
| V12 | P1 90 by 4 weeks, 120 by 6 weeks, contact surgeon | P1 page 7, Phase 1 criteria | EXACT | "Contact surgeon if ROM not trending towards 90° by 4 weeks" |
| V13 | R3 "97% recommended achieving 90 degrees ... 1.4 (range, 0-6) weeks" | R3 abstract | PARAPHRASED | True: "most protocols (97%) recommended achieving 90 degrees of knee flexion at an average of 1.4 (range, 0-6) weeks" |
| V14 | "Ceiling side: no more than 90 degrees in weeks 0 to 4" attributed to P1 | P1 page 4, page 6 | PARAPHRASED | P1 has "Seated knee AAROM KF (0°-90° degrees by 4 weeks post-operative)" and "Avoid KF ROM beyond surgeon guidelines". No explicit 90 cap. P5 and P11 not checked |
| V15 | S2 ROM restriction in practice | S2 abstract | EXACT | "Weightbearing and ROM (≤ 90°) restriction were within three weeks post-operatively for > 50% of the programmes" |
| V16 | S1 full ROM "at six weeks" (conclusion) and "between 4 to 12 weeks" | S1 Conclusions and text | EXACT | S1 conflicts with itself, as C2 says |
| V17 | S10 Table 2 full ROM 12 (37%), 18 (51%), 2 (6%) | S10 web page, Table 2 | EXACT | |
| V18 | R2 full ROM by week 6 in "15 (48.4%)" | R2 abstract | EXACT | |
| V19 | P2 "Achieve 0° knee extension AROM", S1 "Full knee extension" | P2 Table 2, S1 Table 1 | EXACT | |
| V20 | S10 WBAT 23 (66%), PWB 9 (26%), NWB 2 (6%) | S10 Table 2 | EXACT | |
| V21 | R3 "Twenty protocols (65%) allowed for weight-bearing as tolerated" | R3 abstract | EXACT | |
| V22 | S1 weight-bearing "usually not limited", "full weight-bearing from 0 to 8 weeks" | S1 text | EXACT | |
| V23 | N1 "no consensus on postoperative immobilization or weightbearing" | N1 abstract | EXACT | |
| V24 | S7 "3 recurrent dislocations ... (2.4%) ... restrictive rehabilitation group" | S7 abstract | EXACT | |
| V25 | S10 locked brace 19 (54%), brace 0 to 6 weeks 22 (63%) | S10 Table 2 | EXACT | |
| V26 | R1 "25 (93%) recommended immediate postoperative bracing" | R1 abstract | EXACT | |
| V27 | R3 "Thirty protocols (97%) recommended immediate postoperative knee bracing" | R3 abstract | EXACT | |
| V28 | S9 "Six of seven studies (85.7%) braced patients for up to 6 weeks" | S9 abstract | EXACT | |
| V29 | S8 reoperation "20 knees [12.1%] vs. 0 [0%]" | S8 abstract | EXACT | |
| V30 | P3 brace stop, S10 weaning 46 and 29 percent | P3 page 4, S10 Table 2 | EXACT | |
| V31 | S10 TTO "delayed or non weight bearing (56%) ... (67%)" | S10 abstract | EXACT | |
| V32 | S1 weight-bearing changes with "a concurrent procedure" | S1 text | EXACT | |
| V33 | P2 excludes "tibial tubercle re-alignment" | P2 page 1, Exclusions | EXACT | Also excludes lateral retinacular release |
| V34 | P1 "Follow more conservative guideline" | P1 page 1 | PARAPHRASED | The first audit read "most", corrected by the Opus final audit, 2026-11-09 |
| V35 | R5 "100% of papers evaluated lacked adequate return-to-play guidelines" | R5 abstract | EXACT | |
| V36 | Heel slides in phase 1 (S1, P3) | S1 Table 1, P3 page 4 | EXACT | |
| V37 | Heel slides in phase 1, "P1: heel slides in the AROM progression" | P1 pages 7, 9, 12 | WRONG | P1 phase 1 uses "Sitting knee ROM exercise: AAROM KF to PROM KE". Heel slides start in phase 2: "heel slides once KF >120" |
| V38 | S1 SLR "started immediately after the surgery", R1 SLR "85%" | S1 text, R1 abstract | EXACT | |
| V39 | P2 SLR "less than or equal to 10 degrees of extensor lag", "without an extensor lag for 10 seconds", S1 "without extension lag" | P2 Tables 2 and 3, S1 Table 1 | EXACT | P2 values are phase goals, level 5 |
| V40 | S8 SLR without lag "41 days" versus "44 days" | S8 abstract | EXACT | |
| V41 | Mini squat in phase 2 (P3), P2 rec 40, P2 Table 3 squat goal | P3 page 4, P2 pages 9 and 11 | EXACT | |
| V42 | P2 Table 4 squat "to 90 degrees", "single squat to 60 degrees" | P2 page 10, Table 4 | EXACT | |
| V43 | S16 "a smaller knee angle range between 0 degrees and 50 degrees" | S16 abstract | EXACT | Healthy people |
| V44 | S1 valgus monitoring, P2 rec 40 neuromuscular control | S1 text, P2 page 11 | EXACT | |
| V45 | P2 rec 29: avoid knee extension "from 30° to 0°" | P2 page 8 | EXACT | |
| V46 | P2 rec 39: OKCE "initially only from 90°-30°" | P2 page 11 | PARAPHRASED | The arc is in a Note, not the recommendation: "It may be helpful to perform OKCE for knee flexion/extension initially only from 90°-30° ..." |
| V47 | P1 open-chain rules, labelled "phase 1" | P1 pages 4, 6, 8, 9 | PARAPHRASED | "Do not perform open chain knee extension (KE)" is Acute Care (day of surgery). Phase 1 (weeks 0-6): "Do not perform AROM open chain KE". Phase 2 (weeks 7-11): "unless cleared by surgeon", and the arc "(90-40 degrees)" with "Follow surgeon preference and patient tolerance" |
| V48 | Quadriceps sets (S1, P1, P3) | S1 Table 1, P1 page 4, P3 page 4 | EXACT | |
| V49 | P2 rec 26 "2 sets of 10-15 repetitions ... progression to 3 sets" | P2 page 7 | EXACT | Cites "Rhea 2002 [2b], Faigenbaum 1996 [4b], LocalConcensus 2014 [5]" |
| V50 | S1 RPE "6-8/10", "greater than 80% 1RM" | S1 Table 1, text | EXACT | |
| V51 | P3 "Ice 20 minutes, 2 hourly" | P3 page 3 | EXACT | |
| V52 | P2 pain "≤ 2out of 10 on NRS ... during ambulation", Tables 3 and 4 | P2 pages 7, 9, 10 | EXACT | Phase goal, not a stop rule |
| V53 | S1 run start "no pain or pain <2/10" | S1 Table 1 | EXACT | BORROWED from ACL |
| V54 | P2 effusion goals per phase | P2 Tables 2, 3, 4 | EXACT | |
| V55 | P2 rec 4 red-flag list | P2 page 4 | EXACT | |
| V56 | Grade of P2 rec 4: "level 5 and 1b for effusion" | P2 page 4 | PARAPHRASED | Catching or locking also carries "Stefancin 2007 [1b], Parikh 2011 [4a]". DVT carries "Ramzi 2004 [5a]" |
| V57 | P1 "Avoid painful arcs of motion", "Avoid provocation of ..." | P1 pages 6, 8 | EXACT | Painful arcs is phase 2 |
| V58 | PM1 Thomeé model 5/10 and next morning, N25 | PM1 PMC7905015, N25 abstract | EXACT | |
| V59 | SM1 effect "-0.27 (-0.54 to -0.05)" | SM1 abstract | EXACT | |
| V60 | N24 kappa 0.75, agreement 73% | N24 abstract | EXACT | |
| V61 | AS1 "No effusion/trace of effusion", "95% knee flexion range of motion", "Full extension ROM" | AS1 PMC11785408 | EXACT | |
| V62 | AS1 "LSI>80% for quadriceps strength" | AS1 PMC11785408 | PARAPHRASED | True: "Limb symmetry index (LSI)>80% for quadriceps strength." |
| V63 | S1 exits of phases 1 to 3, run, plyometrics | S1 Table 1, text | EXACT | |
| V64 | P2 Table 3 and 4 exits, hop LSI "≥ 85" | P2 pages 9 to 11 | EXACT | |
| V65 | P3 "Strength should be 90% of the unaffected side ..." | P3 page 5 | EXACT | |
| V66 | P3 "Two hops more than 90 percent" | P3 page 6 | PARAPHRASED | True: "Two functional hop tests ... should be > 90% of unaffected limb" |
| V67 | R1 "20 (74%) used evaluation-based", G2 time-based early progression | R1, G2 abstracts | EXACT | |
| V68 | S1 RTS "not been well established", N4, S3 "Ten of 53 studies (18.9%)" | S1, N4, S3 | EXACT | |
| V69 | ISAKOS 2013 list (6 items) | ME1 PMC4169614, Table 1 | PARAPHRASED | Each quote is exact, but Table 1 has 10 rows. Omitted: neuromuscular training, core strength, dynamic control (Star Excursion), physiotherapist sport drills |
| V70 | ME1 six criteria, "LSI of at least 90 %" | ME1 Discussion | EXACT | ME1 also says "no clear criteria can be as yet endorsed" |
| V71 | S1 LSI ≥ 90%, Y-Balance, isometric torque | S1 RTS text | EXACT | |
| V72 | S6 "only 14% to 40% of patients met all ..." | S6 abstract | EXACT | |
| V73 | S1 "A MPFL-RSI score > 56 points ..." | S1 text | EXACT | |
| V74 | S4 "7.0 months", S5 "6.7 months", S1 "7-8 months" | abstracts, S1 text | EXACT | |
| V75 | R5 "between 2 and 6 months" | R5 abstract | EXACT | |
| V76 | N11 Table 2 DVT, PE, infection, any event | N11 PMC6463332 | EXACT | |
| V77 | Recurrence S11 1.2%, S5 1.9%, S4 5.4% | abstracts | EXACT | |
| V78 | N10 "CDI >1.3 (OR, 2.72; P = .02)" | N10 abstract | EXACT | |
| V79 | S13 stiffness 8 patients, bilateral risk. N22 OR 0.83 | abstracts | EXACT | |
| V80 | N5 RCT "Early rapid postoperative rehabilitation appears to be safe" | N5 abstract | EXACT | TTO plus MPFLR |
| V81 | M2 sagittal "most valid and reliable", frontal and transverse lacking | M2 abstract | EXACT | |
| V82 | M4 SEM "below 5°", validity "0.2° to 28.6°" | M4 abstract | EXACT | |
| V83 | M5 "MAE < 5.2° for 2D hip and knee joint angles in the sagittal plane" | M5 abstract | EXACT | OpenPose, gait |
| V84 | F3 MAE "9.3-21.9°", "not accurate enough ..." | F3 PMC12589393 | EXACT | |
| V85 | F1 bias 3.23 and −0.14, LoA ±8.73 and ±8.80, MDC95 10.7 | F1 PMC13611076 | EXACT | |
| V86 | M7 ICC "0.005-0.68" | M7 abstract | EXACT | |
| V87 | F9 LoA "-7.3", "less than eight degrees cannot be distinguished ..." | F9 PMC2040146 | EXACT | |
| V88 | F4 valgus bias about 19 degrees | F4 PMC11399566 | EXACT | "error range 18.83–19.68°" |
| V89 | P2 rec 30 feedback cues | P2 page 8 | EXACT | |
| V90 | AS1 open chain "(90°−45° of knee flexion) from the fourth week" | AS1 PMC11785408 | EXACT | BORROWED (ACL) |
| V91 | N1 Hurley 2023 rehab statements, primary text | Bone and Joint page | NOT READABLE | Paywall. Abstract only |
| V92 | G1 BASK 2021, rehab content | Europe PMC, ScienceDirect | NOT READABLE | Paywall. No open copy on BASK or BOA sites |
| V93 | AWMF S2e 012-024 Patellaluxation | AWMF register | NOT READABLE | All PDF URLs return an HTML app page |
| V94 | ISAKOS 2013 primary document | web search | SOURCE NOT FOUND | Read only as ME1 Table 1 |

Rows not checked by me: P4 to P13, Willy 2019, Biebl 2021, T1, T3, N20. They carry no number that the strongest app rules use.

## 3. Evidence grade in substance

The earlier agent marks P2 items CONSENSUS (low). The quotes are right, but the mark misleads a reader. These facts come from P2 itself:
- Almost every rehab item ends with "(LocalConcensus 2014 [5])".
- The P2 table of evidence levels defines level 5 as "General review, expert opinion, case report, consensus report, or guideline".
- All 55 P2 recommendations use "It is recommended". P2 defines this strength as "There is consensus that benefits are closely balanced with risks and burdens". No item is "Strongly recommended".
- P2 dates from January 2015. P2 says the team reconvenes after five years. I found no revision.

P3 says of itself: "this is a guideline based on limited evidence and expert opinion". P1 gives no evidence grades. S1 is "Level of Evidence Level 5".

How the app must treat these items:

| Source | Mark in the knowledge base | Grade in substance | App use |
|---|---|---|---|
| P2 rehab items | CONSENSUS (low) | OPINION of one institution team, weak strength, 2015 | Reference value for the clinician. Never a fixed limit |
| P2 rec 4 red flags | CONSENSUS | OPINION, two items with a 1b review | Referral trigger. Over-referral costs little |
| P1, P3 | CONSENSUS or OPINION | OPINION | Reference value for the clinician |
| S1 | OPINION | OPINION (LoE 5) | Reference value |
| N1 via S10 | CONSENSUS | CONSENSUS of 60 surgeons, wording unread | Supports early motion as a principle only |
| ISAKOS via ME1 | CONSENSUS | Committee consensus, second-hand, list incomplete | Clinician checklist. The app cannot measure it |
| R1 to R3, S10 | REVIEW | REVIEW of practice, not of outcome | Shows the range of practice. Cannot set a rule |

## 4. The strongest app rules

### 4.1 No open-chain knee extension from 30 to 0 degrees in phase 1, and a later arc

Verdict: SAFE FOR THE APP TO ENCODE as a protective default for phase 1. The clinician can enable the exercise. The later arc (90 to 30 or 90 to 40 degrees) is SAFE ONLY AS A CLINICIAN-SET VALUE.

| Item | Content |
|---|---|
| Quote | P2 rec 29: "short arc quadriceps exercises (knee extension from 30° to 0°) and long arc quadriceps exercises in the terminal range of 30° to 0° are avoided to minimize stress to the reconstructed medial patellofemoral ligament (LocalConcensus 2014 [5])". P1 Phase 1: "Do not perform AROM open chain KE". P1 Phase 2: "Do not perform AROM open chain KE, unless cleared by surgeon" |
| Grade in substance | OPINION (level 5, weak strength) |
| Population | P2: ages 8 to 25, MPFL repair, reconstruction or revision, no realignment. P1: no age limit stated |
| Contrary sources | P3 phase 2 (from 2 weeks): "OKC quadriceps exercises should be progressed as able". N3 restricts open chain only after bony procedures. S1 uses "both open and closed chain" in the strengthening phase |
| Harm if wrong | Too strict: a slower quadriceps gain, with quad sets and SLR still available. Low harm. Too loose: theoretical graft stress. No clinical study shows harm in either direction |

The current seated hold in `app/src/lib/guides.ts` line 54 asks "Straighten your knee". This is a long-arc extension to 0 degrees. It conflicts with P2 rec 29 and P1 phase 1. I confirm the earlier finding.

### 4.2 SLR with at most 10 degrees of extension lag by the end of phase 1

Verdict: SAFE ONLY AS A CLINICIAN-SET VALUE, and LOG only. The app must not use it as a progression gate.

| Item | Content |
|---|---|
| Quote | P2 Table 2: "performing a straight leg raise with less than or equal to 10 degrees of extensor lag by the end of the initial phase". P1: "Able to SLR pain-free without quadriceps lag" |
| Grade in substance | OPINION (level 5 goal table) |
| Population | P2 as in 4.1 |
| Harm if wrong | The threshold of 10 degrees is inside the 2D error (about 9 degrees best case, V85). P1 uses SLR without lag to decide to unlock the brace. A false "no lag" from the app can lead to early walking without the brace |

### 4.3 Two sets of 10 to 15 repetitions, progressing to 3 sets

Verdict: SAFE ONLY AS A CLINICIAN-SET VALUE. The app can show it as an example dose that the clinician confirms.

| Item | Content |
|---|---|
| Quote | P2 rec 26: "strengthening exercises are initiated in2 sets of 10-15 repetitions of exercises as appropriate, with progression to 3 sets of each exercise as tolerated (Rhea 2002 [2b], Faigenbaum 1996 [4b], LocalConcensus 2014 [5])". Note 2: "If the patient is unable to perform 2 sets of 10 repetitions of an exercise, the intensity of the exercise can be modified per clinical judgment" |
| Grade in substance | OPINION, with indirect evidence from strength training in other groups |
| Population | P2. No adult or MPFLR study of dose exists |
| Harm if wrong | Overdose can raise pain and effusion. Underdose slows strength. Both are small if the clinician sets the value |

### 4.4 Pain at 2 of 10 or less

Verdict: NOT SUPPORTED as a session stop rule or as an exercise pain limit. SAFE ONLY AS A CLINICIAN-SET VALUE.

| Item | Content |
|---|---|
| Quote | P2 Table 2: "≤ 2out of 10 on NRS or little to no indication of pain with other scales during ambulation". Tables 3 and 4 use the same value for functional tasks |
| Grade in substance | OPINION (goal table, level 5) |
| Population | P2. The value is about walking and daily tasks, not about exercise |
| Harm if wrong | As a stop rule: sessions stop too often, which can lead to stiffness. As a "goal reached" signal: false permission to progress. The guardrail skill bans goal messages |

### 4.5 Flexion of 90 degrees or more by 4 weeks and 120 degrees or more by 6 weeks

Verdict: SAFE ONLY AS A CLINICIAN-SET VALUE. A persistent miss can drive a "contact your care team" referral. NOT SUPPORTED as a ceiling.

| Item | Content |
|---|---|
| Quote | P2 Table 2: "Achieve ≥ 90° knee flexion PROM by 4 weeks post-operation", "Achieve ≥ 120º by 6 weeks post- operation". P1: "KF ROM >90° by 4 weeks and progressing to 120 by 6 weeks", "Contact surgeon if ROM not trending towards 90° by 4 weeks" |
| Grade in substance | OPINION |
| Population | P2 as in 4.1. P1 not age-limited |
| Contrary sources | N3 (2024) early phase 0 to 6 weeks: "Passive knee flexion of >125°". R3: 90 degrees at a mean of 1.4 weeks. S2: ROM "≤ 90°" restriction within three weeks in more than half of programmes |
| Harm if wrong | As a ceiling: stiffness and arthrofibrosis (S1, N22). As a push target: graft stress when the surgeon restricts, for example after a bone procedure. False alarms: the targets are passive range, but the camera sees active motion, which is usually less |

### 4.6 Red flags that notify the surgeon

Verdict: SAFE FOR THE APP TO ENCODE as a referral.

| Item | Content |
|---|---|
| Quote | P2 rec 4: "Signs of deep vein thrombosis (DVT)", "Unchanging or increased irritability in the knee", "Persistent or recurrent effusion", "Unexpected loss or minimal progression of ROM", "Catching, locking, or persistent pathological end feel with passive ROM" |
| Grade in substance | OPINION, two items with a 1b review |
| Population | P2. The list is for a therapist at examination |
| Harm if wrong | Over-referral costs little. Under-referral is the risk. P2 rec 4 does not list infection, nerve or circulation signs, or a new dislocation. P2 Table 1 names infection and sensation loss as exam items. The app list in `redflags.ts` adds these from sources outside P2 |

### 4.7 Combined surgery needs a separate protocol

Verdict: SAFE FOR THE APP TO ENCODE as a block. If a bone or cartilage procedure is present, the app must not apply isolated MPFLR values. It must require a surgeon protocol.

| Item | Content |
|---|---|
| Quote | P2 Exclusions: "With patellofemoral re-alignment techniques as part of the surgical procedure (e.g. lateral retinacular release, tibial tubercle re-alignment)". P1: "Follow more conservative guideline" (corrected by the Opus final audit, 2026-11-09: the first audit wrote "most"). S10: TTO "delayed or non weight bearing (56%), locked brace duration greater than 6 weeks (67%)" |
| Grade in substance | OPINION and REVIEW of practice |
| Contrary source | N5 RCT (TTO plus MPFLR, N=50): rapid rehab "appears to be safe and effective". This supports surgeon choice, not isolated defaults |
| Harm if wrong | Isolated values after a TTO can overload the osteotomy. N3: "Avoid open chain quadriceps exercises to avoid pull at osteotomy site through patellar tendon" |

## 5. What the earlier agent missed

| # | Finding | Source read | Effect on an app rule |
|---|---|---|---|
| M1 | N3 is readable and open access (CC BY). The base marked it "editorial, quote not checked". Its Table 1 gives a full protocol | Hysing-Dahl and Inderhaug 2024, PMC11180699 | Early phase MPFL-R 0 to 6 weeks: "Passive knee flexion of >125°", "Mini squats range 0–50° knee flexion", "Brace-free rehabilitation". Open chain is restricted only for bony procedures. This widens the range of practice for 4.1 and 4.5 |
| M2 | P3 allows open-chain quadriceps work from 2 weeks with no arc | P3 page 4 | The open-chain rule is in 2 of 4 readable guidance sources, not a general agreement |
| M3 | P2 flexion targets are PROM (passive) | P2 Table 2 | The app must not compare an active camera angle with a passive target |
| M4 | All P2 items are "It is recommended" (weak strength). P2 is from 2015 and was not revised | P2 page 22 | Read P2 as OPINION |
| M5 | The P2 90-30 arc is a Note with "It may be helpful" | P2 page 11 | Lower weight for the later arc |
| M6 | P1 restricts open-chain KE through phase 2 (weeks 7 to 11) unless the surgeon clears it | P1 page 8 | The P1 restriction lasts longer than "phase 1" |
| M7 | 2D frontal plane: a meta-analysis found no correlation between 2D knee frontal plane projection angle and 3D in the single-leg squat | X3, JOSPT 2018;48(10):812-822, abstract: "r = 0.127, P = .094" | Confirms NO BUILD for a valgus cue |
| M8 | Some sagittal knee systems show smaller errors than 9 degrees | X1 (Physiotherapy 2026, 15 knee OA patients): LoA within ±10° for peak flexion, extension and range. X2 (26 healthy): mean difference "-3.50°" flexion. X4 (12 healthy): knee RMSE "2.8°" | The error depends on the system and setup. The app must measure the error of its own `lite` model. The 9 to 10 degree value is a working margin, not a constant |
| M9 | No newer guideline or consensus on rehab after MPFLR (2024 to 2026). No Cochrane review compares rehab protocols. Cochrane CD008106 compares surgery with no surgery | Searches Q1 to Q6 | No change to the rules |

I found no source that reverses a protective rule. The missed items widen the range of practice. They support clinician-set values over fixed app limits.

## 6. Is the knowledge base fit to build clinical rules from?

Yes, under all of these conditions:
1. Every number (range, dose, pain value, week, lag, return-to-sport cutoff) is a protocol field that a clinician sets. The knowledge base values appear only as reference ranges for the clinician.
2. The app enforces only protective defaults and referrals. These are: no terminal open-chain extension in phase 1 unless a clinician enables it, the combined-surgery block, and the red-flag referral.
3. The app never compares a passive-range target with an active camera angle. It never acts on a 2D difference that is smaller than the error that it measured for its own model.
4. The corrections in this file apply: V37, V46, V47, V69, and the grade reading of section 3.
5. The population is clear. P2 covers ages 8 to 25 with isolated soft-tissue surgery. For adults, only P1, P3, S1 and N3 apply, and all are OPINION.
6. A clinician reviews the rule set before patient use.

Without these conditions, the knowledge base is not fit. The reason is that no rule rests on outcome evidence after MPFLR.

## 7. Not readable

- N1 Hurley 2023 Delphi part II, full statements: paywall.
- G1 BASK 2021 consensus, full text: paywall. No copy on the BASK or BOA sites.
- AWMF S2e 012-024: the register returns an HTML app page for every PDF link. A copy exists on a sharing site. I did not use it.
- ISAKOS 2013 primary document: not found.

## 8. Search log of this audit

Date of all searches: 2026-11-08.

| # | Tool | Query or URL | Hits | Result |
|---|---|---|---|---|
| Q1 | Europe PMC | `(TITLE_ABS:"patellar instability" OR TITLE_ABS:"patellofemoral instability" OR TITLE_ABS:"patellar dislocation" OR TITLE_ABS:"medial patellofemoral ligament") AND (TITLE:consensus OR TITLE:Delphi OR TITLE:guideline OR TITLE:guidelines OR TITLE:"position statement" OR TITLE:recommendations) AND PUB_YEAR:[2021 TO 2026]` | 14 | No new post-operative rehab consensus. LLM Delphi study (PMC12581441) read: no post-operative rehab statements |
| Q2 | Europe PMC | `(TITLE_ABS:"patellar" OR TITLE_ABS:"patellofemoral") AND (TITLE_ABS:dislocation OR TITLE_ABS:instability) AND (JOURNAL:"Cochrane Database Syst Rev")` | 3 | Only CD008106 (surgery versus no surgery) |
| Q3 | Europe PMC | `(TITLE_ABS:"medial patellofemoral ligament" OR TITLE_ABS:MPFL) AND (TITLE_ABS:rehabilitation OR TITLE_ABS:"weight bearing" OR TITLE_ABS:brace OR TITLE_ABS:accelerated OR TITLE_ABS:"range of motion" OR TITLE_ABS:exercise) AND (PUB_TYPE:"Randomized Controlled Trial" OR TITLE:randomized OR TITLE:randomised) AND PUB_YEAR:[2010 TO 2026]` | 9 | No RCT compares rehab after isolated MPFLR. Norwegian RCT (PMC9464184) read: passive ROM "up to 90 degrees", 8 weeks |
| Q4 | WebSearch | `clinical practice guideline rehabilitation after patellar stabilization surgery MPFL reconstruction 2025 OR 2026 consensus ESSKA OR JOSPT OR KNGF` | 10 | No new guideline. ESSKA 2024 is first-time dislocation |
| Q5 | WebSearch | `BASK "Consensus guidelines for management of patellofemoral instability" Bailey 2021 Knee full text rehabilitation`, then the BASK, BOA and BPFS sites | 9 and 10 | No open full text. Found N3 (PMC11180699) |
| Q6 | WebSearch | `Hurley 2023 modified Delphi patellar instability part II rehabilitation statements "full range of motion" 6 weeks MPFL` | 9 | Primary text not found |
| Q7 | WebSearch, AWMF | `AWMF 012-024 Patellaluxation S2e Leitlinie pdf Nachbehandlung`, three register PDF URLs | 9 | HTML app page only |
| Q8 | WebSearch | `Cincinnati Children's evidence-based care guideline 46 lateral patellar dislocation post-operative update OR revised OR retired` | 10 | No revision found |
| Q9 | Europe PMC | `(TITLE_ABS:"frontal plane projection angle" OR TITLE_ABS:"knee valgus") AND (TITLE_ABS:"2D" OR TITLE_ABS:"two-dimensional" OR TITLE_ABS:markerless OR TITLE_ABS:MediaPipe OR TITLE_ABS:"pose estimation") AND (TITLE_ABS:validity OR TITLE_ABS:reliability OR TITLE_ABS:agreement) AND (PUB_TYPE:"Systematic Review" OR TITLE:"systematic review" OR TITLE:"meta-analysis")` | 5 | X3 kept |
| Q10 | Europe PMC | `(TITLE_ABS:MediaPipe OR TITLE_ABS:BlazePose OR TITLE_ABS:"pose estimation" OR TITLE_ABS:markerless) AND (TITLE_ABS:"knee flexion" OR TITLE_ABS:"knee angle" OR TITLE_ABS:"knee range of motion") AND (TITLE_ABS:patients OR TITLE_ABS:postoperative OR TITLE_ABS:arthroplasty OR TITLE_ABS:reconstruction OR TITLE_ABS:goniometer) AND PUB_YEAR:[2023 TO 2026]` | 32 | X1, X2, X4 kept (abstracts). No study after MPFLR |
| Q11 | Europe PMC by DOI | 37 DOIs of the knowledge base | 37 | Abstracts used for the V rows |
| Q12 | NCBI efetch | PMC12222034, PMC4169614, PMC13247021 (web page), PMC13611076, PMC12589393, PMC2040146, PMC7905015, PMC11785408, PMC6463332, PMC11399566, PMC11180699 | 11 | Full texts used for the V rows |
| Q13 | Direct PDF | P1, P2, P3 URLs from `rehab-rules.md` and `clinical-update.md` | 3 | Read as page text in the scratch folder |

New references:
- N3 (now read): Hysing-Dahl T, Inderhaug E. Rehabilitation after surgery for patellar instability. `J Exp Orthop 2024;11(3):e12062`. https://doi.org/10.1002/jeo2.12062
- X1: Physiotherapy 2026. https://doi.org/10.1016/j.physio.2025.101850 (abstract)
- X2: Comput Biol Med 2025. https://doi.org/10.1016/j.compbiomed.2025.110848 (abstract)
- X3: `J Orthop Sports Phys Ther 2018;48(10):812-822`. https://doi.org/10.2519/jospt.2018.8006 (abstract)
- X4: Knee 2025. https://doi.org/10.1016/j.knee.2024.11.006 (abstract)

## 9. Addendum of 2026-11-09: quotes for generator version 2

Auditor: the build agent of generator version 2. It did not trust the quotes of `docs/generator-v2-design.md`. It opened each source again on 2026-11-09 and compared the text.

Method: P1, P2 and P3 were downloaded as PDF files and read as text. N3 and S1 came from NCBI efetch (PMC11180699 and PMC12222034). S16 came from the Europe PMC record by DOI. A line break in the PDF text counts as a space. Page numbers are PDF pages. No paywall was worked around. This audit was done by the same agent that builds the generator. A person must still review the rows.

| # | Claim | Where I found it | Verdict | Note or true wording |
|---|---|---|---|---|
| V95 | N3 early phase of MPFL reconstruction, 0 to 6 weeks: "Mini squats range 0–50° knee flexion" | N3 Table 1, row "Early phase MPFL‐R, 0–6 weeks" | EXACT | The same words stand in the row for bony procedures, after "After 4–6 weeks". The text gives the range for weeks 0 to 6. It gives no depth for weeks 6/8 to 12 |
| V96 | N3 intermediate phase, 6/8 to 12 weeks: "Progressive resisted quadriceps strengthening (squats" | N3 Table 1, row "Intermediate phase, 6/8–12 weeks" | EXACT | The row names squats and gives no depth. The row also says "Avoid open chain quadriceps exercises through large arcs of motion if bony procedures are performed" |
| V97 | N3 "Quadriceps sets (isometric and dynamic contractions)" | N3 Table 1, early phase | EXACT | |
| V98 | N3 "Gluteal sets (isometric and dynamic contractions)" | N3 Table 1, early phase | EXACT | |
| V99 | S1 "Quadriceps sets, 3-way straight leg raises" | S1 Table 1, Interventions of the protection phase | EXACT | |
| V100 | S1 "Straight leg raise without extension lag" | S1 Table 1, Milestones of the protection phase | EXACT | The text also says: "The milestones of the protection phase are knee flexion greater than 110°, full knee extension, straight leg raise without extension lag, and walking without crutches" |
| V101 | S1 "Walking without crutches" | S1 Table 1, Milestones of the protection phase | EXACT | |
| V102 | P1 "Continue phase I exercises, as appropriate" | P1 page 10, Phase 2 | EXACT | |
| V103 | P1 "Quadriceps sets with towel roll under knee, gluteal sets, ankle pumps" | P1 page 4, Acute Care Phase, HEP | EXACT | The line "Ankle pumps, quadriceps sets, gluteal sets" and the line "Straight leg raise (SLR) in multiple planes" stand in the Pre-operative Phase section (page 3 of the PDF), not in the same section as this quote. Corrected after the independent audit `docs/audit-generator-v2.md` |
| V104 | P1 "ROM 0° KE to > 125° KF, no limits" | P1 page 10, Criteria for advancement of Phase 2 | EXACT | This line is a criterion to leave phase 2. It is not a rule for the start of phase 2. Corrected after the independent audit |
| V105 | P1 phase 2 open chain arc: "Follow surgeon preference and patient tolerance for open chain strengthening in a limited arc of motion (90-40 degrees)" | P1 page 9, Phase 2, Functional Quadriceps strengthening | EXACT | This row corrects the label of V47. The arc belongs to Phase 2 |
| V106 | P1 "Do not perform AROM open chain KE, unless cleared by surgeon" | P1 page 8, Phase 2 precautions | EXACT | Phase 1 (page 6) has the same line without "unless cleared by surgeon" |
| V107 | P1 "ability to demonstrate active quad contraction with SLR" | P1 page 7, Phase 1 treatment, line "Leg press (LP): bilateral with at least 90 degrees flexion ROM and ability to demonstrate active quad contraction with SLR" | EXACT | The rule is about the leg press and not about a squat. The same line asks for at least 90 degrees of knee bend. The app cannot check this bend. The gate for the mini squat is BORROWED from this rule |
| V108 | P1 "Sit to stand starting with elevated seat height" | P1 page 9, Phase 2, Functional Quadriceps strengthening | EXACT | The same list holds "Progress pain-free arc of motion for closed chain strengthening" and "Leg press:  bilateral with progression to single leg". P1 does not name the mini squat |
| V109 | P3 "hip abduction, hip extension & ankle pumps" | P3 page 4, Phase 1, Increase muscle strength | EXACT | The full line is "Commence heel slides, early static quadriceps sets/isometrics, hip abduction, hip extension & ankle pumps" |
| V110 | P3 "mini squats, leg press, heel raises, step ups" | P3 page 4, Phase 2 | EXACT | Same quote as V41. I read the PDF again |
| V111 | P2 rec 17 "It is recommended that dosage of physical therapy be approximately 2-3 times per week with a supplemental HEP" | P2 page 6 | EXACT | The Note says: "Patients who participate in supervised clinical visits demonstrate greater gains in muscle strength, functional mobility, gait speed" |
| V112 | P2 rec 25 "strengthening exercises for this phase begin with isometric and isotonic exercises" | P2 page 7 | EXACT | |
| V113 | P2 Appendix 1a, initial phase: "Quadriceps isometric sets", "Gluteal isometric sets", "Straight leg raises for hip flexion, abduction, adduction and extension", "Mini squats with hip hinge emphasis" | P2 page 13 | EXACT | |
| V114 | P2 rec 39 Note: "It may be helpful to perform OKCE for knee flexion/extension initially only from 90°-30°" | P2 page 9 | EXACT | The arc is in a Note. This is the true wording that V46 flagged |
| V115 | P2 rec 40 "isotonic Closed Kinetic Chain Exercises (CKCE) are initiated using a double limb stance" | P2 page 9 | EXACT | |
| V116 | S16 "a smaller knee angle range between 0 degrees and 50 degrees" | S16 abstract, Europe PMC, DOI 10.1249/mss.0b013e31818e7ead | EXACT | 18 healthy subjects. BORROWED. The full sentence starts with "When the goal is to minimize patellofemoral compressive force and stress, it may be prudent to use". It is about patellofemoral force, not about a graft. Corrected after the independent audit |
| V117 | P1 phase 3 squat: "Squat progression: chair squats to free squats" | P1 page 12, Phase 3 (Weeks 12-20) | EXACT | This is the source that disagrees with an earlier start of the squat |
| V118 | N3 and P3 against P1 for the start of the squat | N3 V95 and V96, P3 V110, P1 V108 and V117 | PARAPHRASED | This row is a summary and holds no quote. It leaves out two facts. N3 lists squats in weeks 6/8 to 12 (V96). P2 lists double leg squats in the phase "Restoring Basic Function". Changed from EXACT after the independent audit |
| V119 | P2 Appendix 1b: "Wall squats and leg press beginning at 45 degrees of knee flexion and progressively working into the higher and lower levels of flexion" | P2 page 14, Appendix 1b | EXACT | P2 gives no week for this phase. The text breaks across lines in the PDF. Added for the squat depth entry (the sources disagree) |

Result of section 9: 25 rows. 24 EXACT. 1 PARAPHRASED (V118). 0 WRONG. 0 NOT READABLE. 0 NOT FOUND. V119 is a new row.

What this audit does not cover: the quotes of SH (Sanford) and BM (Ben Mayo) in `docs/generator-v2-design.md`. They stay unaudited and drive no value. The claim "no clinician reviewed these rows" stays true.
