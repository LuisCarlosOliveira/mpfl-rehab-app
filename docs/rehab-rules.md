# Rehab rules for the app, with sources

Date: 2026-11-08. Status: complete for this pass.

Purpose: a table that an app can encode. Each rule carries the exact quoted number, the source, the study type and the population. This file gives no treatment advice. A surgeon protocol always overrides it. Quoted source text stays exact. A style hit inside a quote is allowed.

## How to read the table

Marks:
- CONSENSUS: a guideline or a consensus statement states it. The strength is low for most items. P2 grades almost all of its own items as evidence level 5 ("LocalConcensus 2014 [5]").
- REVIEW: a systematic review or a meta-analysis states it.
- STUDY: one study states it.
- OPINION: one institution protocol, one expert review or an editorial states it.
- NONE: no source gives a rule. The cell says what the literature says instead.

Access: VERIFIED means the text was read in this pass and the quote is exact. A rule that rests only on an UNVERIFIED item cannot drive app behavior.

Population codes:
- ISO: isolated MPFLR. COMB: MPFLR with a bone or cartilage procedure. MIX: both.
- ADOL: age 8 to 19. ADULT: age 18 or more.
- BORROWED: another condition or healthy people.

Conservative value: when sources disagree, the column gives the value that loads the knee less. For range of motion, two kinds of risk exist. Too much motion strains the graft. Too little motion leads to stiffness (S1 cites arthrofibrosis, N22 links low motion at 6 weeks to manipulation). The table then names both sides. It does not average.

## Sources added in this file

Sources S1 to S24, N1 to N34 and P1 to P13 keep their ids from `clinical.md` and `clinical-update.md`. The audit of those ids is in `source-audit.md`.

| Id | Source | Type | Access in this pass |
|---|---|---|---|
| P1 | Hospital for Special Surgery. MPFL reconstruction post-operative guideline. Created 6/2020, revised 8/2024. https://www.hss.edu/globalassets/files/rehab/guidelines/hssrehabilitationclinicalguidelines-knee-medialpatellofemoralligament-mpfl-reconstruction-post-operative.pdf | Institution guideline | VERIFIED (PDF text, 22 pages) |
| P2 | Cincinnati Children's Hospital Medical Center. Evidence-Based Care Guideline 46, Post-Operative Management of Lateral Patellar Dislocations and Instability, ages 8 to 25, January 2015. URL in `clinical-update.md` section 3.1 | Institution guideline with graded evidence. Excludes realignment surgery | VERIFIED (PDF text, 38 pages) |
| P3 | NHS Lothian Physiotherapy Orthopaedic Guidelines, MPFL Reconstruction, May 2022, review May 2027. https://apps.nhslothian.scot/files/sites/2/MPFL-Guidelines-2022-1-1.pdf | Regional guideline. Literature search 2012 to 2021, mostly expert opinion | VERIFIED (PDF text, 8 pages) |
| G1 | Bailey MEA, Metcalfe A, Hing CB, Eldridge J, BASK Patellofemoral Working Group. Consensus guidelines for management of patellofemoral instability. Knee 2021;29:305-312. https://doi.org/10.1016/j.knee.2021.02.018 | National formal consensus (BASK, ratified by the British Orthopaedic Association). The abstract says it covers "appropriate post operative physiotherapy" | Abstract only. Full text paywalled. Its rehab content is UNVERIFIED |
| G2 | Greenberg E et al., PRiSM Patellofemoral Research Interest Group. Variable Guidelines for Pediatric MPFL Reconstruction Rehabilitation Exists Across PRiSM Member Organizations. HSS J 2024;20(3):365-. https://doi.org/10.1177/15563316241233254 | Review of 11 pediatric institution guidelines | Abstract (VERIFIED) |
| R1 | Lieber AC et al. Quality and Variability of Online Available Physical Therapy Protocols From Academic Orthopaedic Surgery Programs for MPFLR. Orthop J Sports Med 2019;7(7):2325967119855991. https://doi.org/10.1177/2325967119855991 | Review of 27 protocols | Abstract (VERIFIED) |
| R2 | Coda RG et al. Online Rehabilitation Protocols for MPFLR With and Without TTO Are Variable Among Institutions. Arthrosc Sports Med Rehabil 2021;3(2):e305-e313. https://doi.org/10.1016/j.asmr.2020.09.018 | Review of 38 protocols | Abstract (VERIFIED) |
| R3 | Lightsey HM et al. Rehabilitation variability following MPFLR. Phys Sportsmed 2018;46(4):441-448. https://doi.org/10.1080/00913847.2018.1487240 | Review of 31 protocols | Abstract (VERIFIED) |
| R4 | Fisher B, Nyland J, Brand E, Curtin B. MPFLR for recurrent patellar dislocation: a systematic review including rehabilitation and return-to-sports efficacy. Arthroscopy 2010;26(10):1384-1394. https://doi.org/10.1016/j.arthro.2010.04.005 | Systematic review, 21 studies, 510 knees | Abstract (VERIFIED) |
| R5 | Chatterji R et al. Return-to-Play Guidelines After Patellar Instability Surgery Requiring Bony Realignment: A Systematic Review. Orthop J Sports Med 2020;8(12):2325967120966134. https://doi.org/10.1177/2325967120966134 | Systematic review, 39 studies, 1598 knees | Full text (VERIFIED) |
| ME1 | Ménétrey J, Putman S, Gard S. Return to sport after patellar dislocation or following surgery for patellofemoral instability. Knee Surg Sports Traumatol Arthrosc 2014;22(10):2320-2326. https://doi.org/10.1007/s00167-014-3172-5 (PMC4169614) | Review, LoE IV. Prints the ISAKOS 2013 criteria as Table 1 | Full text (VERIFIED) |
| IS1 | ISAKOS Sports Medicine Committee, Consensus Meeting on Return-to-Play, London 2013. Criteria for a safe RTS after patellofemoral instability | Society committee consensus | Second-hand: read only as Table 1 of ME1. The primary document was not found |
| AS1 | Kotsifaki R et al. Aspetar clinical practice guideline on rehabilitation after anterior cruciate ligament reconstruction. Br J Sports Med 2023. https://doi.org/10.1136/bjsports-2022-106158 (PMC11785408) | Guideline with systematic reviews and a Delphi | Full text (VERIFIED). BORROWED (ACL) |
| PM1 | Sprague AL, Couppé C, Pohlig RT, Snyder-Mackler L, Silbernagel KG. Pain-guided activity modification during treatment for patellar tendinopathy. Pilot Feasibility Stud 2021;7(1):58. https://doi.org/10.1186/s40814-021-00792-5 (PMC7905015) | Pilot RCT. Describes the Thomeé pain-monitoring model | Full text (VERIFIED). The Thomeé 1997 primary (Phys Ther 77(12):1690, https://doi.org/10.1093/ptj/77.12.1690) was read as abstract only |
| SM1 | Smith BE et al. Should exercises be painful in the management of chronic musculoskeletal pain? Br J Sports Med 2017;51(23):1679-1687. https://doi.org/10.1136/bjsports-2016-097383 | Systematic review and meta-analysis | Abstract (VERIFIED). BORROWED |
| M2 | Scataglini S et al. Accuracy, Validity, and Reliability of Markerless Camera-Based 3D Motion Capture Systems versus Marker-Based 3D Motion Capture Systems in Gait Analysis. Sensors 2024;24(11):3686. https://doi.org/10.3390/s24113686 | Systematic review and meta-analysis, 22 papers | Abstract (VERIFIED) |
| M4 | Yoma M, Llurda-Almuzara L, Herrington L, Jones R. Reliability and validity of lower extremity and trunk kinematics measured with markerless motion capture during sports-related and functional tasks. J Sports Sci 2025;43. https://doi.org/10.1080/02640414.2025.2518359 | Systematic review, 53 studies | Abstract (VERIFIED) |
| M5 | Cheng X et al. Reliability and validity of current computer vision based motion capture systems in gait analysis. Gait Posture 2025;120:150-160. https://doi.org/10.1016/j.gaitpost.2025.04.016 | Systematic review, 20 studies | Abstract (VERIFIED) |
| M7 | Das UC et al. A hybrid AI vision model for single-camera tracking of rehabilitation exercises. Sci Rep 2026;16(1):24647. https://doi.org/10.1038/s41598-026-55431-x | Proof of concept, 14 healthy staff | Abstract (VERIFIED) |
| F1, F3, F9 | Okuno 2026, Rode 2025, Lenssen 2007. Full references in `source-audit.md` table 2 | Validation studies | Full text (VERIFIED) |

## 1. Phases, range of motion, weight-bearing and brace (complete)

| Topic | Rule | Exact quoted numbers | Source | Type, level | Population | Agree? | Conservative value | Mark |
|---|---|---|---|---|---|---|---|---|
| Validated protocol | No validated protocol exists | S1: "no validated rehabilitation protocols are established following MPFL reconstruction". S2: "only one randomised controlled trial on rehabilitation programmes" in 85 studies | S1, S2 | Commentary LoE 5. Systematic review | ISO and COMB | Yes | Not applicable | REVIEW |
| Phase names and weeks | Four phases | S1 Table 1: protection "0 to 6 weeks", strengthening "6-12 weeks", advanced strengthening and functional "12-16 weeks", RTS ">16 weeks". S1 text: "The RTS phase (>20 weeks)". P2 names: Initial, Restoring Basic Function, Restoring Advanced Function, Return-to-Activity, with goals and no weeks. P3: "Immediate post-op to 2 weeks", "2 weeks to 12 weeks approximately", "12 weeks to discharge" | S1, P2, P3 | Commentary LoE 5. Institution guideline. Regional guideline | ISO (P2 excludes realignment) | Partly. Week bands differ | Use the later RTS start (S1 text, ">20 weeks"). P3 RTS "approximately nine to twelve months" | OPINION (S1), CONSENSUS (P2, P3, no weeks in P2) |
| Progression method | Progress by criteria, not by time alone | S1: "progress through phases based on meeting clinical criteria". P3: "timescales are approximate, and rehabilitation should be guided, at each stage, by minimal swelling, resolution of pain, good muscle recruitment". P2 uses goal tables per phase | S1, P2, P3 | As above | ISO | Yes | Criteria and time both | CONSENSUS (low) |
| Start of motion | Start motion within 2 weeks | S1: "ROM should be initiated within the first two weeks of surgery and progressed per surgeons' protocol". P3 phase 1: "Commence gentle active ROM exercises as pain allows". N1 Delphi via S10: "strongly supported early motion after patellar stabilization surgery to reduce the risk of arthrofibrosis" | S1, P3, N1 (second-hand) | LoE 5. Regional guideline. Delphi | ISO | Yes | Start early. The date stays a surgeon decision | CONSENSUS |
| Flexion by week | Flexion targets | S1: "Typically, patients start 0°-30° in the first or second week and progress by 20°- 30° per week". P2 Table 2: "Achieve ≥ 90° knee flexion PROM by 4 weeks post-operation", "Achieve ≥ 120º by 6 weeks post- operation". P1 (base, V): 90 by 4 weeks, 120 by 6 weeks. R3: "97% recommended achieving 90 degrees of knee flexion at an average of 1.4 (range, 0-6) weeks" | S1, P2, P1, R3 | LoE 5. Institution guidelines. Protocol review | ISO, ADOL (P2) | Partly | Ceiling side: no more than 90 degrees in weeks 0 to 4 in several protocols (P1, P5, P11, `clinical-update.md` 3.1). Stiffness side: P1 says contact surgeon if not near 90 by 4 weeks | CONSENSUS (P2), OPINION (others) |
| Full flexion timing | When full ROM is expected | N1 Delphi via S10: "full ROM should be achieved by 6 weeks after MPFL repair or reconstruction". S1 conclusion: "Restoration of full knee ROM and weight-bearing should be achieved at six weeks". S1 text: "full knee flexion between 4 to 12 weeks". S10 Table 2 (35 ISO protocols): full ROM by 0 to 6 weeks 12 (37%), by 6 to 12 weeks 18 (51%), after 12 weeks 2 (6%). R2: full ROM by week 6 in "15 (48.4%)" of ISO protocols | N1, S1, S10, R2 | Delphi (second-hand). Reviews | ISO | No. 6 weeks to 12 weeks | No single value. Show the protocol value only | CONSENSUS (Delphi, second-hand, UNVERIFIED wording) and REVIEW (practice counts only) |
| Full extension | Restore full extension early | S1 phase 1 milestone "Full knee extension". P2 Table 2: "Achieve 0° knee extension AROM" in the initial phase | S1, P2 | LoE 5. Institution guideline | ISO | Yes | 0 degrees | CONSENSUS (low) |
| Weight-bearing | Weight-bearing as tolerated after isolated MPFLR is the common practice | S10 Table 2: immediate WBAT "23 (66%)", PWB "9 (26%)", NWB or delayed "2 (6%)" of 35 ISO protocols. R3: "Twenty protocols (65%) allowed for weight-bearing as tolerated". S1: "weight-bearing following the surgery is usually not limited". N1 abstract: "no consensus on postoperative immobilization or weightbearing" | S10, R3, S1, N1 | Reviews. Delphi | ISO | No consensus (N1). Practice favors WBAT | Partial weight-bearing until the surgeon sets the status. S1 literature range "full weight-bearing from 0 to 8 weeks" | NONE for a consensus. REVIEW for practice |
| Weight-bearing outcome | Accelerated rehab (no brace, no weight limit) did not raise redislocation | S7: "3 recurrent dislocations ... (2.4%), all of which occurred in the restrictive rehabilitation group", 123 knees | S7 | Retrospective comparison | ISO | One study | Not a rule | STUDY |
| Brace use | Brace in early weeks is common, but not proven | S10 Table 2: locked brace "19 (54%)", brace 0 to 6 weeks "22 (63%)". R1: "25 (93%) recommended immediate postoperative bracing". R3: "Thirty protocols (97%) recommended immediate postoperative knee bracing". S9: "Six of seven studies (85.7%) braced patients for up to 6 weeks". S8: reoperation "20 knees [12.1%] vs. 0 [0%]" braced versus unbraced. N1: no consensus on immobilization | S10, R1, R3, S9, S8, N1 | Reviews, retrospective study, Delphi | ISO | No | Brace per surgeon. The app must not set a default | NONE for a consensus. REVIEW for practice |
| Brace stop | Brace often stops when SLR has no lag | P3: "Discontinue knee brace when quadriceps control is regained". S10: brace weaning function-based in 46 percent, time-based in 29 percent (`progression.md` 2.1) | P3, S10 | Regional guideline. Review | ISO | Yes | Surgeon decision | CONSENSUS (low) |
| Combined surgery | TTO and other bone procedures need a more protective protocol | S10 abstract: "Isolated TTO protocols recommended delayed or non weight bearing (56%), locked brace duration greater than 6 weeks (67%)". S1: weight-bearing modified "if a concurrent procedure is performed ... such as tibial tubercle osteotomy or chondral restoration procedures". P2 excludes "tibial tubercle re-alignment". P1: "Follow more conservative guideline" for concomitant procedures (wording corrected by the final audit, 2026-11-09). R5: "100% of papers evaluated lacked adequate return-to-play guidelines" after bony realignment | S10, S1, P2, P1, R5 | Reviews, guidelines | COMB | Yes | Do not apply an isolated protocol. Require a surgeon protocol | CONSENSUS and REVIEW |

## 2. Exercises the app supports (complete for the four exercises)

| Exercise | Rule | Exact quoted numbers | Source | Type | Population | Agree? | Conservative value | Mark |
|---|---|---|---|---|---|---|---|---|
| Heel slide | Allowed in the first phase | S1 Table 1 phase 1: "Heel slides, supine wall slides, heel propping/ prone hangs". P3 phase 1: "Commence heel slides, early static quadriceps sets/isometrics". P1: heel slides in the AROM progression | S1, P3, P1 | LoE 5, guidelines | ISO | Yes | Range ceiling from the surgeon | CONSENSUS (low) |
| Straight leg raise | Allowed from day 0 | S1: "Exercises including quadriceps setting and straight leg raise should be started immediately after the surgery". R1: SLR in "85%" of protocols | S1, R1 | LoE 5, review | ISO | Yes | Not applicable | CONSENSUS (low), REVIEW (practice) |
| Straight leg raise, lag | Extension lag criteria | P2 Table 2 (initial phase): "straight leg raise with less than or equal to 10 degrees of extensor lag by the end of the initial phase". P2 Table 3 (next phase): "Maintain an unassisted straight leg raise without an extensor lag for 10 seconds". S1 phase 1 exit: "Straight leg raise without extension lag". S8: median time to SLR without lag "41 days" unbraced versus "44 days" braced | P2, S1, S8 | Guideline (level 5), LoE 5, retrospective | ISO, ADOL | Yes on the target. P2 gives a number | 0 degrees of lag (S1). The only number is 10 degrees (P2) | CONSENSUS (low) |
| Mini squat | Closed chain double-leg squat starts in phase 2 | P3 phase 2 (2 to 12 weeks): "mini squats, leg press, heel raises, step ups". P2 rec 40: CKCE "initiated using a double limb stance" in Restoring Basic Function. P2 Table 3 goal: "Demonstrate a double leg squat with proper alignment with minimal visual, tactile or verbal cues" | P3, P2 | Guidelines | ISO | Yes | Phase 2, surgeon clearance | CONSENSUS (low) |
| Mini squat depth | Depth limits | P2 Table 4 (advanced phase goal): "double leg squat to 90 degrees of knee flexion with proper form and technique for 10 seconds", "single squat to 60 degrees". P5 (base): no closed chain past 90 degrees in weeks 6 to 12. P8 (base): squat 0 to 75 degrees in weeks 9 to 16. S16 (healthy): "a smaller knee angle range between 0 degrees and 50 degrees". N23 (healthy, abstract): squat 45 to 0 degrees | P2, P5, P8, S16, N23 | Guideline, protocols, lab studies | ISO, BORROWED | Partly | 0 to 50 degrees (S16, healthy) until the surgeon sets depth | CONSENSUS (P2 end goal), STUDY (BORROWED) |
| Mini squat alignment | Watch knee valgus and femoral internal rotation | S1: "Closed-chain exercises should be closely monitored to prevent femoral internal rotation coupled with dynamic knee valgus". P2 rec 40: "focus on neuromuscular control of the pelvis, femur, tibia, and patella" | S1, P2 | LoE 5, guideline | ISO | Yes | No number exists | OPINION, CONSENSUS (low). NONE for a threshold |
| Seated knee extension (open chain) | Avoid open-chain extension in the terminal 30 to 0 degrees early. Later use a mid-range arc | P2 rec 29 (initial phase): "short arc quadriceps exercises (knee extension from 30° to 0°) and long arc quadriceps exercises in the terminal range of 30° to 0° are avoided to minimize stress to the reconstructed medial patellofemoral ligament". P2 rec 39 (next phase): "perform OKCE for knee flexion/extension initially only from 90°-30°". P1 phase 1: "Do not perform open chain knee extension (KE)" and "Do not perform AROM open chain KE, unless cleared by surgeon". P1 later phase: "open chain strengthening in a limited arc of motion (90-40 degrees)". N23 (healthy): knee extension 90 to 45 degrees | P2, P1, N23 | Guidelines (level 5). Lab study | ISO, ADOL (P2), BORROWED (N23) | Yes, in two guidelines | No seated extension to 0 degrees in the first phase. Arc 90 to 30 or 90 to 40 degrees later, with surgeon clearance | CONSENSUS (low) |
| Quad set (isometric at 0 degrees) | Allowed from day 0 | S1 Table 1: "Quadriceps sets". P1: "quadriceps sets". P3: "early static quadriceps sets/isometrics" | S1, P1, P3 | As above | ISO | Yes | Not applicable | CONSENSUS (low) |

Finding for the app (VERIFIED against `app/src/lib/guides.ts`, text "Straighten your knee. Hold it"): the seated extension hold asks for active open-chain extension to 0 degrees. P2 and P1 both say to avoid this in the first phase. The protocol generator must not offer this exercise in phase 1 unless the surgeon enables it. In later phases, the app can only offer a mid-range hold (for example 90 to 40 degrees) set by the surgeon. This is a CONSENSUS-level rule (evidence level 5), not trial evidence.

## 3. Dose: sets, repetitions, frequency, tempo, load (complete)

| Topic | Rule | Exact quoted numbers | Source | Type | Population | Mark |
|---|---|---|---|---|---|---|
| Sets and repetitions | Start with 2 sets of 10 to 15, progress to 3 sets | P2 rec 26: "strengthening exercises are initiated in2 sets of 10-15 repetitions of exercises as appropriate, with progression to 3 sets of each exercise as tolerated (Rhea 2002 [2b], Faigenbaum 1996 [4b], LocalConcensus 2014 [5])". Note 1: "This recommendation applies for all strengthening exercises for all phases" | P2 | Guideline, level 5 | ISO, ADOL | CONSENSUS (low) |
| Intensity, phase 2 | RPE 6 to 8 of 10 | S1 Table 1: "Progressive lower body exercises per patient tolerance with target RPE in 6-8/10" | S1 | LoE 5 | ISO | OPINION |
| Intensity, phase 3 | High loads possible | S1: "high loads greater than 80% 1RM may be indicated with appropriate adjustments in set and repetition schemes" | S1 | LoE 5 | ISO | OPINION |
| Frequency (sessions per day or week) | NONE | No guideline or review read in this pass gives a session frequency for exercise after MPFLR. P3 gives a frequency only for ice: "Ice 20 minutes, 2 hourly" | none | none | none | NONE |
| Tempo (seconds per rep) | NONE | No MPFLR source gives a tempo. `ux-flow.md` 2 seconds is a PROPOSAL | none | none | none | NONE |
| Hold time for SLR | 10 seconds without lag is a P2 goal | P2 Table 3: "without an extensor lag for 10 seconds" | P2 | Guideline, level 5 | ISO, ADOL | CONSENSUS (low). It is a test goal, not a dose |

## 4. Pain, swelling and stop rules (complete)

| Topic | Rule | Exact quoted numbers | Source | Type | Population | Mark |
|---|---|---|---|---|---|---|
| Pain goal per phase | Pain at or below 2 of 10 | P2 Table 2: "Pain ≤ 2out of 10 on NRS or little to no indication of pain with other scales during ambulation". Tables 3 and 4 repeat "≤ 2 out of 10 on NRS" for basic and advanced tasks | P2 | Guideline, level 5 | ISO, ADOL | CONSENSUS (low). A goal, not a stop rule |
| Pain for run start | Pain below 2 of 10 | S1: "no pain or pain <2/10 on visual analogue scale" (cites an ACL scoping review, Rambaud 2018) | S1 | LoE 5, BORROWED from ACL | ISO | OPINION |
| Effusion goal per phase | Effusion falls by phase | P2 Table 2: "Minimal to none". Table 3: "Intermittent to minimal". Table 4: "Resolved for all basic functional activities and minimal to intermittent following more advanced functional activities" | P2 | Guideline, level 5 | ISO, ADOL | CONSENSUS (low). Clinician grading, no scale named |
| Red flags for the physician | Notify the surgeon | P2 rec 4: "Signs of deep vein thrombosis (DVT)", "Unchanging or increased irritability in the knee", "Persistent or recurrent effusion", "Unexpected loss or minimal progression of ROM", "Catching, locking, or persistent pathological end feel with passive ROM" | P2 | Guideline, level 5 and 1b for effusion | ISO, ADOL | CONSENSUS (low) |
| Activity limit by symptoms | Avoid pain and effusion provocation | P1: "Avoid painful arcs of motion", "Avoid provocation of quadriceps inhibition, joint effusion, active inflammation" | P1 | Institution guideline | ISO | OPINION |
| Numeric stop threshold during exercise | NONE for MPFLR | No MPFLR source read gives a numeric pain or swelling level that stops an exercise | none | none | none | NONE |
| Pain-monitoring model (borrowed) | Pain during or right after activity at most 5 of 10, and back to the pre-activity level by the next morning | Sprague 2021 (describing Thomeé): "pain levels should not exceed a 5/10 on the numeric pain rating scale (NPRS) during or immediately after activity. Additionally, pain ratings should return to pre-activity levels by the following morning". Silbernagel 2007 RCT (N25, Achilles, N=38): "No negative effects could be demonstrated from continuing Achilles tendon-loading activity ... with the use of a pain-monitoring model" | PM1 (second-hand for the Thomeé model), N25 | Pilot RCT. RCT LoE 1 | BORROWED (patellofemoral pain origin, tendinopathy trials). Not post-operative | STUDY, BORROWED. The 5 of 10 limit was never tested after surgery. It must not be a default after MPFLR |
| Painful exercise in chronic pain (borrowed) | Pain during exercise is not harmful in chronic pain | SM1 (Smith 2017): "short- term significant difference in pain, with moderate quality evidence for a small effect size of -0.27 (-0.54 to -0.05) in favour of painful exercises" | SM1 | Systematic review and meta-analysis, 7 trials, 385 people | BORROWED (chronic musculoskeletal pain) | REVIEW, BORROWED. Does not transfer to a healing graft |
| Effusion grading by a clinician | Modified stroke test, 5 grades | N24 abstract: "The kappa value was 0.75 ... and the percent agreement was 73%" in 75 patients | N24 | Reliability study | BORROWED (outpatient knee patients) | STUDY. A clinician test. The app cannot do it |
| Effusion and running (borrowed) | No effusion or trace effusion before running | AS1 (Aspetar ACL guideline) return to running: "No effusion/trace of effusion" | AS1 | Guideline with a Delphi (ACL) | BORROWED (ACL reconstruction) | CONSENSUS, BORROWED |

Reading for the app: the only post-operative MPFLR stop logic in a guideline is "notify the physician" for the P2 red flags. The pain goal of 2 of 10 (P2) is a phase goal. The 5 of 10 rule is borrowed. Any app pain threshold that pauses a session stays an app rule or a clinician value (`docs/clinical-limits.md`, safety floor), not an evidence-based default.

## 5. Criteria for progression to the next phase (complete)

| Phase exit | Criteria | Exact quoted numbers | Source | Mark |
|---|---|---|---|---|
| Phase 1 exit | Flexion, extension, SLR, gait | S1: "Knee flexion greater than 110°", "Full knee extension", "Straight leg raise without extension lag", "Walking without crutches". P2 initial phase goals: pain "≤ 2", effusion "Minimal to none", "0° knee extension AROM", "≥ 90° knee flexion PROM by 4 weeks", "≥ 120º by 6 weeks", SLR "less than or equal to 10 degrees of extensor lag", "symmetrical weight bearing in double limb stance" | S1, P2 | OPINION (S1), CONSENSUS (P2, level 5) |
| Phase 2 exit | Full ROM, strength 60 percent, normal gait | S1: "Full knee ROM", "Quadriceps strength greater than 60% of the non-surgical side", "Normal gait pattern". P2 Table 3: "≥ 120º or 75% of uninvolved limb for knee flexion", SLR "without an extensor lag for 10 seconds", MMT "4-/5" or "60-65% of isometric dynamometer comparison", "single leg balance on involved limb at 90% timed performance of uninvolved limb", PROM goal "60% of goal target" | S1, P2 | OPINION, CONSENSUS (level 5) |
| Running start | Range, pain, strength | S1: "full ROM or >95% of the non-injured knee, no pain or pain <2/10 on visual analogue scale and limb symmetry index of quadriceps >70%" (from an ACL review). P3: "Strength should be 90% of the unaffected side prior to commencing plyometric and jogging/running drills and prior to functional hop testing". AS1 (ACL): "95% knee flexion range of motion", "Full extension ROM", "No effusion/trace of effusion", "LSI>80% for quadriceps strength" | S1, P3, AS1 | Disagree: 70 percent (S1) versus 90 percent (P3). Conservative: 90 percent (P3). OPINION and CONSENSUS (low), BORROWED (AS1) |
| Phase 3 exit | Strength and hop 80 percent | S1: "Quadriceps strength greater than 80% of the non-surgical side", "Hop tests greater than 80% of the non-surgical side". P2 Table 4: MMT "4+/5" or "at least 85% of dynamometer comparison", "double leg squat to 90 degrees", "single squat to 60 degrees", "Limb Symmetry index of ≥ 85 on all single leg hop tests" | S1, P2 | OPINION, CONSENSUS (level 5) |
| Plyometric start | Strength deficit, balance | S1 (from Davies 2015, general): "≤20% strength and endurance deficit between limbs, the ability to maintain a 30-second single-leg stance with eyes open and closed" | S1 | OPINION, BORROWED |
| Time versus criteria | No study compares them after MPFLR | `progression.md` 2.1 (V there). R1: "20 (74%) used evaluation-based guidelines". G2: "time-based criteria most widely used for early progression" | R1, G2 | NONE for outcome evidence. REVIEW for practice |

What the app can measure from these:
- Flexion and extension angle in a side view, with the error in section 9.
- SLR top angle. A lag smaller than the error is not measurable.
- Time since surgery. Pain and swelling by self-report.

The app cannot measure strength LSI, hops, Y-Balance, gait or effusion grade. Those stay clinician inputs.

## 6. Return to sport (complete)

| Topic | Rule | Exact quoted numbers | Source | Type | Mark |
|---|---|---|---|---|---|
| Consensus status | No validated RTS criteria after MPFLR | S1: "RTS criteria following MPFL reconstruction have not been well established". N4 abstract: "there is no consensus for the appropriate timing or functional evaluation". S3: "Ten of 53 studies (18.9%)" used criteria | S1, N4, S3 | LoE 5, Delphi, review | REVIEW |
| ISAKOS 2013 criteria | Criteria list after patellofemoral instability | IS1 (ISAKOS Sports Medicine Committee, London 2013, Table 1 in Ménétrey 2014): "If bony surgery is involved, complete radiographic healing of bone", "No complaints of knee pain or knee instability", "Full or near full range of motion", "No knee effusion", "Limb Symmetry Index > 85 % on hop tests, especially if resuming pivoting sports", "psychological readiness to return to sport (e.g., SANE score > 80/100)" | IS1 via ME1 | Society committee consensus. Read second-hand in an open-access review | CONSENSUS (second-hand, VERIFIED as printed in ME1) |
| Ménétrey criteria | Six criteria | ME1: "(1) no pain; (2) no effusion; (3) no patellofemoral instability; (4) a full range of motion; (5) nearly symmetrical strength (85–90 %); and (6) excellent dynamic stability". Strength "LSI of at least 90 %" for high-demand sports | ME1 | Review, LoE IV | OPINION |
| Thresholds in use | LSI thresholds vary | S1: "limb symmetry index ≥ 90% on single-legged hop tests", Y-Balance "≥ 90% on each limb and side-to-side difference of < 4cm", "≥ 90% on isometric peak torque for knee extension, knee flexion, and hip abduction". P2: hop LSI "≥ 85". P3: "Two hops more than 90 percent" (base) and contact sport at 9 to 12 months. IS1: hop LSI "> 85 %". Protocols P1, P4: 95 percent (base) | S1, P2, P3, IS1, P1, P4 | Mixed | Disagree: 85 to 95 percent. Conservative: 90 percent or more for strength and hops (S1, ME1). Never averaged. CONSENSUS (low) |
| Do patients meet them | Many do not at 6 to 8 months | S6: "only 14% to 40% of patients met all study-specific RTS criteria". N20: quadriceps LSI "85.3%", "Only 32.0% of patients passed all 4 hop tests" at "a mean 7.4 months" (10 of 28 had TTO) | S6, N20 | Review, case series | REVIEW |
| Psychological readiness | Scale cutoffs are not validated for MPFLR | S1: "A MPFL-RSI score > 56 points indicates a patient is psychologically ready" (cites N14). S21: ACL-RSI "≥59.2", AUC 0.70, mixed ISO and TTO | S1, N14, S21 | Opinion, cohort | STUDY. Not validated |
| Time to RTS | About 6 to 8 months on average | S4: "7.0 months". S5: "mean of 6.7 months". S1: "7-8 months". S10: median RTS 6 months (`clinical-update.md`) | S4, S5, S1, S10 | Systematic reviews and meta-analysis | REVIEW (descriptive, not a target) |
| Bony realignment | No adequate RTS guideline | R5: "100% of papers evaluated lacked adequate return-to-play guidelines". "the range was between 2 and 6 months" in 11 studies | R5 | Systematic review | REVIEW |

## 7. Red flags and complications (complete)

| Item | Exact quoted text or number | Source | Mark |
|---|---|---|---|
| Notify the physician | P2 rec 4 list (section 4 above): DVT signs, rising irritability, persistent or recurrent effusion, loss or no progress of ROM, catching or locking | P2 | CONSENSUS (level 5) |
| Stiffness | P1 (base, V): contact surgeon if not near 90 degrees by 4 weeks. N22: knee ROM at 6 weeks predicted manipulation (OR 0.83, 95% CI 0.69 to 0.98) in 25 adolescents. S13: "knee motion stiffness with flexion deficits (8 patients)" of 179 knees | P1, N22, S13 | OPINION, STUDY |
| 30-day VTE and infection, isolated MPFLR | N11 Table 2 (MPFLR column, n=617): DVT "2 (0.3)", PE "2 (0.3)", surgical site infection "8 (1.3)", any adverse event "18 (2.9)" | N11 | STUDY (registry, VERIFIED in full text) |
| Recurrent instability | S11 pooled "1.2%", S5 "1.9%", S4 "5.4%" | S11, S5, S4 | REVIEW |
| Patellar fracture | N9 pooled 1.17 percent, isolated 0.53 percent (abstract). S13: 6 of 179 | N9, S13 | REVIEW, STUDY |
| Risk factors for recurrence | N10: "CDI >1.3 (OR, 2.72; P = .02) and dysplasia with a trochlear bump (DeJour type B or D; OR, 3.28" | N10 | REVIEW (meta-analysis). The app does not know the anatomy: a surgeon input |

## 8. Special populations and procedures (complete)

| Group | What changes | Exact quoted text | Source | Mark |
|---|---|---|---|---|
| TTO with MPFLR | More protective, but one RCT supports faster rehab | S10: TTO "delayed or non weight bearing (56%), locked brace duration greater than 6 weeks (67%)". N5 RCT (N=50, TTO plus MPFLR): "Early rapid postoperative rehabilitation appears to be safe and effective" | S10, N5 | REVIEW (practice), STUDY (RCT LoE 2, abstract only). These two disagree on direction: practice is protective, the only RCT favors speed. The app must use the surgeon protocol |
| Trochleoplasty | Few protocols. Lasting deficits | S10: "isolated trochleoplasty protocols were too few to support a representative rehabilitation pathway". S23: chondral "deterioration was observed in 18 knees" of 24 at 2 years | S10, S23 | REVIEW, STUDY |
| Cartilage procedure | Weight-bearing can change | S1: modifications "if a concurrent procedure is performed ... such as ... chondral restoration procedures" | S1 | OPINION |
| Lateral lengthening | Different protocol | P12 (base, V): touchdown weight-bearing 2 weeks, hinged 0 to 90 | P12 | OPINION |
| Adolescents | P2 covers ages 8 to 25. Practice varies | P2 target population "Ages 8-25 years", "skeletally immature or mature". G2: "highly variable agreement among guideline parameters at each treatment stage". N1: no consensus on whether paediatric patients avoid early RTS | P2, G2, N1 | CONSENSUS (low) |
| Bilateral surgery | Higher complication risk | S13: "Female sex and bilateral MPFL reconstructions were risk factors associated with postoperative complications". LSI is not usable when both knees are affected (N3, OPINION, base) | S13, N3 | STUDY, OPINION |
| Revision MPFLR | NONE | No rehab source for revision surgery was found. P2 includes "revision" in its target population but gives no separate rule | P2 | NONE |
| Borderline anatomy | Isolated MPFLR outcomes similar | S24: redislocation "4.0% vs. 6.7%; p = 1.0" | S24 | STUDY |

## 9. Measurement error of 2D pose estimation (complete, details in `form-evidence.md`)

| Quantity | Error | Source | Population, setup | Mark |
|---|---|---|---|---|
| Sagittal hip and knee angles in gait, markerless versus marker-based | M2: "kinematic parameters for hip and knee in the sagittal plane are considered most valid and reliable but lack valid and accurate measurement outcomes in transverse and frontal planes" | M2 | Systematic review and meta-analysis, 22 papers, gait | REVIEW |
| Lower limb kinematics in squat, landing, running | M4: SEM "below 5°" for most variables. Validity "differences between technologies ranging from 0.2° to 28.6°" | M4 | Systematic review, 53 studies | REVIEW |
| 2D sagittal knee angle in gait, OpenPose | M5: "MAE < 5.2° for 2D hip and knee joint angles in the sagittal plane" | M5 | Systematic review, 20 studies | REVIEW |
| Knee flexion, 2D, 11 models on exercise video | F3 (Rode 2025): MAE "9.3-21.9°" in 2D. "monocular HPE is not accurate enough to achieve clinically relevant measurements in its current state" | F3 | 25 healthy, Vicon | STUDY |
| Knee angle, still photos, MediaPipe highest complexity | F1 (Okuno 2026): bias "3.23", LoA "±8.73" (AKET position) and bias "−0.14", LoA "±8.80" (Thomas test position). MDC95 "10.7" and "5.0" | F1 | 20 healthy, goniometer, 4032 x 3024 still images | STUDY |
| Knee extension exercise, MediaPipe full model | M7: individual ICC "0.005-0.68" against 14-camera motion capture. "Confidence intervals were wide throughout" | M7 | 14 healthy staff | STUDY |
| Goniometer itself after knee surgery | F9 (Lenssen 2007, TKA): active extension LoA "-7.3 – 9.0" degrees. Authors: "differences in RoM of less than eight degrees cannot be distinguished from measurement error" | F9 | 30 TKA patients, two therapists | STUDY, BORROWED |

Rule for the app (REVIEW: M2 and M4 agree, plus F3): use only the sagittal knee angle in a side view as a number. Treat a difference smaller than about 9 to 10 degrees as not measurable. No MPFLR study and no study of the MediaPipe `lite` model was found. The app value is an estimate, never a clinical measure.

Note: this file names other working files of the project knowledge base. Those files are not part of this repository.
