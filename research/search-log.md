# Search log

Date of all searches: 2026-11-08. Status: complete for this pass.

Tools:
- Europe PMC REST search (`https://www.ebi.ac.uk/europepmc/webservices/rest/search`), sorted by citations, and record lookup by DOI.
- NCBI efetch for PMC full text, and PMC web pages.
- WebSearch (a general web index) and WebFetch for publisher pages.
- Protocol PDFs, read as text in a scratch folder.

PubMed and Cochrane were reached through Europe PMC, which indexes MEDLINE and the Cochrane Library. Google Scholar and PEDro were not queried directly. The WebSearch tool covers the open web only.

A "read" hit means that the record or the text was opened. A search-engine summary is never used as a source.

## (a) Guidelines and consensus statements

| # | Database or site | Query | Hits | Hits read | Kept or dropped, and why |
|---|---|---|---|---|---|
| A1 | Europe PMC | `(TITLE_ABS:"patellar instability" OR TITLE_ABS:"patellar dislocation" OR TITLE_ABS:"medial patellofemoral ligament") AND (TITLE:consensus OR TITLE:Delphi OR TITLE:guideline OR TITLE:"position statement")` | 9 | 9 titles, 6 records | KEPT: Hurley 2023 Delphi part II (N1), ESSKA 2024 parts 1 and 2 (N2, G4), PRiSM adolescent consensus 2024 (G3, non-operative only), White 2020 Delphi (N4). DROPPED: Dutch GP guideline 2010 (acute knee problems in primary care), cartilage guideline (other condition), LLM study (no rehab statements, read in full) |
| A2 | Europe PMC | `(TITLE:"patellar instability" OR TITLE:"patellar dislocation" OR TITLE:"patellofemoral instability" OR TITLE:"medial patellofemoral ligament") AND (ABSTRACT:consensus OR ABSTRACT:Delphi) AND (ABSTRACT:rehabilitation OR ABSTRACT:"return to sport")` | 10 | 10 titles | KEPT: PRiSM pediatric MPFLR guideline review 2024 (G2). DROPPED: Cochrane 2015 surgery versus no surgery (not rehab), first-time dislocation reviews (not post-operative) |
| A3 | Europe PMC | `TITLE:"Consensus guidelines for management of patellofemoral instability"` | 1 | 1 record | KEPT as G1: BASK Patellofemoral Working Group, Knee 2021. The abstract says the guideline covers "appropriate post operative physiotherapy". Full text paywalled (Elsevier). No open copy found (A7) |
| A4 | WebSearch | `clinical practice guideline rehabilitation after medial patellofemoral ligament reconstruction JOSPT OR APTA OR AAOS` | 9 | 3 | No JOSPT, APTA or AAOS guideline for rehab after MPFLR. KEPT: Cincinnati Guideline 46 (P2, read in full as PDF text). DROPPED: case reports, ACL guideline |
| A5 | WebSearch | `patellar instability consensus statement rehabilitation return to sport 2025 Delphi international patellofemoral` | 9 | 2 | Only Hurley 2023 and White 2020 found. ISAKOS page is a congress abstract of the same Delphi. No 2024 to 2026 rehab consensus |
| A6 | WebSearch | `Patellofemoral Research Retreat consensus patellar instability rehabilitation` | 10 | 0 new | The Retreat consensus statements cover patellofemoral pain only (2013, 2016, 2018). None covers instability or surgery. The APTA patellofemoral pain guideline (Willy 2019) is for pain, not instability |
| A7 | WebSearch | `"Consensus guidelines for management of patellofemoral instability" BASK pdf postoperative physiotherapy recommendations` | 9 | 0 new | No open full text. ResearchGate and ScienceDirect only. Not worked around |
| A8 | WebSearch | `BASK patellofemoral instability best practice rehabilitation guideline UK` | 9 | 1 | Found G1 (A3). PRePPeD trial (Forde 2025, 2026) is non-operative care after dislocation: DROPPED for post-operative rules |
| A9 | WebSearch, then the AWMF register | `AWMF Leitlinie Patellaluxation 012-024 Nachbehandlung MPFL Rekonstruktion` | 9 | AWMF PDFs tried | The AWMF S2e guideline 012-024 (DGU, 2021) exists. All three PDF URLs return an HTML app page of 7.9 kB, not the PDF. UNVERIFIED, not read. German clinic schemes in the results are single-clinic protocols: DROPPED |
| A10 | Bone and Joint publisher page (WebFetch) | `https://boneandjoint.org.uk/Article/10.1302/0301-620X.105B12.BJJ-2023-0110.R1` | 1 | 1 | Paywall. Only the abstract. The rehab statements of N1 stay second-hand through S10 |

## (b) Systematic reviews and meta-analyses on post-operative rehab

| # | Database or site | Query | Hits | Hits read | Kept or dropped, and why |
|---|---|---|---|---|---|
| B1 | Europe PMC | `(TITLE_ABS:"medial patellofemoral ligament" OR TITLE_ABS:"patellar stabilization" OR TITLE_ABS:"patellar instability surgery") AND (TITLE_ABS:rehabilitation OR TITLE_ABS:"weight bearing" OR TITLE_ABS:weightbearing OR TITLE_ABS:brace OR TITLE_ABS:bracing OR TITLE_ABS:"return to sport" OR TITLE_ABS:accelerated) AND (PUB_TYPE:"Systematic Review" OR PUB_TYPE:"Meta-Analysis" OR TITLE:"systematic review" OR TITLE:"meta-analysis") AND PUB_YEAR:[2015 TO 2026]` | 18 | 18 titles, 4 new records | KEPT: R5 Chatterji 2020 (bony realignment RTS). Already in base: S2, S3, S5, S9, N10, N19. DROPPED: surgery versus rehab after dislocation, graft-type reviews (not rehab), adult versus pediatric outcomes (no rehab data in abstract) |
| B2 | Europe PMC | `(TITLE:"medial patellofemoral ligament" OR TITLE:"patellar instability" OR TITLE:"patellofemoral instability" OR TITLE:MPFL) AND (TITLE:rehabilitation OR TITLE:protocol OR TITLE:protocols OR TITLE:"physical therapy" OR TITLE:physiotherapy OR TITLE:"weight-bearing" OR TITLE:weightbearing OR TITLE:immobilization)` | 37 | 37 titles, 8 records | KEPT: R4 Fisher 2010 (systematic review with rehab), R1 Lieber 2019, R2 Coda 2021, R3 Lightsey 2018 (protocol reviews), G2 PRiSM 2024. DROPPED: imaging studies, case reports, YouTube study, RCT protocols without results, non-operative trials |
| B3 | Reference lists | S1 reference list (read in full text) | 123 refs | 15 refs opened by number | KEPT: Rambaud 2018 (source of the run rule, ACL), Ménétrey 2014 (ME1). Confirmed that S1 cites S7 and S8 for accelerated rehab |
| B4 | Reference list | S10 text on the Delphi | 1 | 1 | Confirms the N1 rehab statements only second-hand |

Result for (b): no meta-analysis compares rehab protocols, weight-bearing, bracing or ROM limits after MPFLR. The reviews only count practice (S2, S3, S9, S10, R1 to R4) or pool outcomes without a rehab comparison (S4, S5, S11). No Cochrane review on rehab after MPFLR was found.

## (c) Evidence for the exercises

| # | Database or site | Query | Hits | Hits read | Kept or dropped, and why |
|---|---|---|---|---|---|
| C1 | Europe PMC | `(TITLE_ABS:"patellofemoral joint stress" OR TITLE_ABS:"patellofemoral joint reaction force" OR TITLE_ABS:"patellofemoral joint load" OR TITLE_ABS:"patellofemoral joint loading") AND (TITLE_ABS:exercise OR TITLE_ABS:squat OR TITLE_ABS:"knee extension") AND (PUB_TYPE:"Systematic Review" OR TITLE:"systematic review" OR TITLE:"meta-analysis" OR TITLE:review)` | 1 | 1 title | No systematic review of patellofemoral stress by exercise angle. DROPPED (running study). The lab studies S14 to S18 and N23 stay the evidence |
| C2 | Europe PMC | `(TITLE_ABS:"extension lag" OR TITLE_ABS:"extensor lag" OR TITLE_ABS:"quadriceps lag") AND (TITLE_ABS:knee)` | 494 | 15 titles | No validation study of an extension lag threshold in rehab. Top hits are arthroplasty and fracture surgery: DROPPED. The only number found is in P2 (10 degrees, level 5) |
| C3 | Protocol PDFs P1, P2, P3 | Text search for "arc", "open chain", "OKC", "knee extension", "lag", "squat" | 3 docs | 3 | KEPT: P2 rec 26, 29, 39 and Table 2 to 4. P1 phase rules on open-chain extension. P3 phase 2 exercises |
| C4 | Europe PMC | `(TITLE:"anterior cruciate ligament") AND (TITLE:"clinical practice guideline" OR TITLE:"evidence statement" OR TITLE:"consensus") AND (TITLE:rehabilitation OR TITLE:"return to sport") AND PUB_YEAR:[2016 TO 2026]` | 10 | 1 full text | KEPT as BORROWED: AS1 Aspetar 2023 (open-chain 90 to 45 degrees from week 4, run criteria, NMES). DROPPED: Dutch 2016 ACL guideline and Panther consensus (overlap with AS1, not read) |
| C5 | App code | `app/src/lib/guides.ts` | 1 | 1 | The seated hold asks "Straighten your knee. Hold it". This is open-chain extension to 0 degrees, against P1 and P2 for phase 1 |

## (d) Pain and swelling monitoring

| # | Database or site | Query | Hits | Hits read | Kept or dropped, and why |
|---|---|---|---|---|---|
| D1 | Europe PMC | `AUTH:"Thomee R" AND PUB_YEAR:[1995 TO 1998]` | 10 | 1 record | KEPT: Thomeé 1997 Phys Ther (abstract only). It names "the pain monitoring system" but the abstract gives no limits |
| D2 | Europe PMC | `(TITLE_ABS:"pain-monitoring model" OR TITLE_ABS:"pain monitoring model")` | 9 | 2 | KEPT: PM1 Sprague 2021 (open full text, states the model limits), N25 Silbernagel 2007. DROPPED: BFR studies, tendinosis imaging |
| D3 | Europe PMC | `(TITLE_ABS:"traffic light" OR TITLE_ABS:"pain-monitoring") AND (TITLE_ABS:knee) AND (TITLE_ABS:exercise OR TITLE_ABS:rehabilitation)` | 6 | 6 titles | DROPPED: no post-surgical traffic-light rule. Rathleff 2019 (adolescent patellofemoral pain) uses load management but is a pain condition |
| D4 | Europe PMC | `(TITLE_ABS:"pain during exercise" OR TITLE_ABS:"exercise-induced pain") AND (TITLE_ABS:knee) AND (TITLE_ABS:osteoarthritis) AND (TITLE_ABS:"safe" OR TITLE_ABS:acceptable)` | 0 | 0 | No hit |
| D5 | Europe PMC | DOI 10.1136/bjsports-2016-097383 | 1 | 1 | KEPT: SM1 Smith 2017 (BORROWED, chronic pain) |
| D6 | OUP page (WebFetch) | A guessed URL for Thomeé 1997 | 1 | 1 | ERROR in method: the URL id was not from a search and led to another paper (capsular pattern study). Nothing from it is used. Thomeé 1997 primary stays abstract only |

Result for (d): no post-operative MPFLR or knee surgery source gives a numeric pain or swelling stop rule. P2 gives a phase goal (pain 2 of 10 or less) and red flags. The 5 of 10 model comes from pain conditions.

## (e) Measurement: 2D and markerless pose estimation

| # | Database or site | Query | Hits | Hits read | Kept or dropped, and why |
|---|---|---|---|---|---|
| E1 | Europe PMC | `(TITLE_ABS:markerless OR TITLE_ABS:"pose estimation" OR TITLE_ABS:MediaPipe OR TITLE_ABS:BlazePose OR TITLE_ABS:OpenPose OR TITLE_ABS:smartphone OR TITLE_ABS:"2D video") AND (TITLE_ABS:"joint angle" OR TITLE_ABS:"range of motion" OR TITLE_ABS:kinematics OR TITLE_ABS:knee) AND (PUB_TYPE:"Systematic Review" OR PUB_TYPE:"Meta-Analysis" OR TITLE:"systematic review" OR TITLE:"meta-analysis" OR TITLE:"scoping review") AND PUB_YEAR:[2019 TO 2026]` | 61 | 30 titles, 5 records | KEPT: M1 Lam 2023, M2 Scataglini 2024 (meta-analysis), M3 Scott 2022, M4 Yoma 2025, M5 Cheng 2025. DROPPED: smartphone inclinometer apps (not camera pose), spine, shoulder, telehealth qualitative reviews |
| E2 | Europe PMC | `(TITLE_ABS:MediaPipe OR TITLE_ABS:BlazePose) AND (TITLE_ABS:knee) AND (TITLE_ABS:validity OR TITLE_ABS:validation OR TITLE_ABS:accuracy OR TITLE_ABS:agreement OR TITLE_ABS:goniometer)` | 17 | 17 titles, 3 records | KEPT: M6 Russo 2026 (gait, versus IMU), M7 Das 2026 (knee extension exercise, versus motion capture), M8 Sabo 2024 (goniometer, hypermobility). Already in base: F1, F4, F7. DROPPED: lumbar, schizophrenia gait, football kicks |
| E3 | Base re-check | F1, F3, F9 full texts | 3 | 3 | Corrections C13, C14 in `source-audit.md` |

## (f) Tele-rehabilitation and digital rehab with feedback

| # | Database or site | Query | Hits | Hits read | Kept or dropped, and why |
|---|---|---|---|---|---|
| F1q | Europe PMC | `(AUTH:"Correia FD" OR AUTH:"Dias Correia F") AND (TITLE_ABS:knee OR TITLE_ABS:"anterior cruciate")` | 4 | 2 full or abstract | KEPT: T1 Correia 2018 (Sword, TKA, full text), T2 Correia 2019. Finding: inertial sensors, not camera, non-random allocation |
| F2q | Europe PMC | `(TITLE_ABS:telerehabilitation OR TITLE_ABS:"digital rehabilitation" OR TITLE_ABS:"app-based" OR TITLE_ABS:"motion tracking" OR TITLE_ABS:"computer vision" OR TITLE_ABS:"artificial intelligence") AND (TITLE_ABS:"knee surgery" OR TITLE_ABS:"anterior cruciate ligament reconstruction" OR TITLE_ABS:"knee arthroplasty" OR TITLE_ABS:"knee replacement") AND (PUB_TYPE:"Meta-Analysis" OR TITLE:"meta-analysis") AND PUB_YEAR:[2021 TO 2026]` | 13 | 4 records | KEPT: T3 Zhai 2025 (22 RCTs, smart devices after TKA), T4 Choudhury 2023 (app-based after TKA), T5 = N31 Wang 2025 (full text). DROPPED: readmission prediction, templating, prehab |

Result for (f): no trial of camera-based feedback after MPFLR or ACL reconstruction was found. Evidence is from TKA. The pooled effect of smart-device tele-rehab on pain and function is not different from usual care (T3).

## (g) Return-to-sport test batteries

| # | Database or site | Query | Hits | Hits read | Kept or dropped, and why |
|---|---|---|---|---|---|
| G1q | Europe PMC and PMC | S1 reference 123 (Ménétrey 2014), N20 Saper 2019 full text | 2 | 2 | KEPT: ME1 with the ISAKOS 2013 table. N20 thresholds and the TTO share |
| G2q | Base | S6, N4, N21, R5 | 4 | 4 records | N4 domains stay paywalled. R5 adds bony realignment |

## Evidence that contradicts the base

- S1 conclusion says initial bracing "is required" and full ROM by 6 weeks (C1, C2). The base used S1 for "weight-bearing not limited" and for no brace.
- N5 (RCT, combined TTO plus MPFLR) favors faster rehab. Practice reviews (S10) say combined surgery needs a more protective plan.
- N31 "knee extension" benefit is "active extension lag" in the results (C12).
- Sword evidence is sensor-based and non-random (C15).
- Okuno 2026 does not support 9 degrees for moving webcam video (C13). M7 found poor to fair agreement (ICC 0.005 to 0.68) for a knee extension exercise.
- P1 and P2 both say to avoid open-chain knee extension to 0 degrees in phase 1. The app offers a seated hold to full extension (`rehab-rules.md` section 2).
- One national society consensus (G1, BASK 2021) covers post-operative physiotherapy. The base said none exists.

## Paywalled or blocked, not read

| Item | Reason |
|---|---|
| N1 Hurley 2023 Delphi part II, full statements | Paywall (Bone and Joint) |
| G1 BASK consensus 2021, full text | Paywall (Elsevier). No open copy |
| AWMF S2e 012-024 Patellaluxation (DGU 2021) | Register returns an HTML app page, not the PDF |
| N4 White 2020 checklist domains | Paywall (Springer) |
| Willy 2019 JOSPT CPG (patellofemoral pain) | HTTP 403 in this pass. `form-opus.md` read it earlier |
| Thomeé 1997 full text | PDF only, no access |
| S2 to S9, S13 to S19 full texts | Paywalls. Abstract only |
| S15, S17, S18 angle and MPa details | Paywall (JOSPT) |
| Silbernagel 2007 full text | Paywall |
| ISAKOS 2013 primary document | Not found. Read as printed in ME1 |
