# Source audit of the knowledge base

Date: 2026-11-08. Status: in progress. This file is written in steps. Each section states when it is complete.

This file checks the sources of `clinical.md` (S1 to S24) and of other base files against the real records. It does not edit the old files. A correction here wins over the old file for the same claim.

Quoted source text stays exact. A style hit inside a quote is allowed.

## Corrections to the old files (read first)

| # | Old file and claim | Correction | Source read |
|---|---|---|---|
| C1 | `clinical.md` section 2, phase 1: "Weight-bearing (S1): usually not limited" and section 3 cites S1 for "accelerated rehabilitation with no brace" | S1 says both things. The text says weight-bearing "is usually not limited" (cites Fithian 2010). The conclusion says: "To protect the graft, initial knee bracing with gradual progression to full weight-bearing is required during the protection phase." S1 is not consistent with itself. Cite S1 for the range of practice, not for "no brace". | S1 full text (PMC efetch) |
| C2 | `clinical.md` section 2: full flexion "4 to 12 weeks" (S1) | S1 also says in its conclusion: "Restoration of full knee ROM and weight-bearing should be achieved at six weeks following the surgery." The phase table puts "Full knee ROM" as the exit of phase 2 (weeks 6 to 12). Keep all three statements. | S1 full text |
| C3 | `clinical.md` section 2: "Run start (S1)" criteria | Exact. S1 cites an ACL source for them: Rambaud 2018, "Criteria for return to running after anterior cruciate ligament reconstruction: a scoping review" (Br J Sports Med 52:1437). The run rule is BORROWED from ACL. | S1 reference 47 |
| C4 | `clinical.md` section 3: "S10: locked brace up to 6 weeks in 63 percent" | The S10 abstract says this. The S10 results table says something else: locked brace 19 of 35 (54 percent), brace duration 0 to 6 weeks 22 of 35 (63 percent). These are two different facts. `clinical-update.md` section 2.1 already has the table values. | S10 PMC web page, Table 2 |
| C5 | Not in the base | S10 Table 2: full ROM was targeted by 0 to 6 weeks in 12 of 35 isolated MPFLR protocols (37 percent), by 6 to 12 weeks in 18 of 35 (51 percent), after 12 weeks in 2 of 35 (6 percent). | S10 Table 2 |
| C6 | `clinical.md` section 4: S18 "step-up (11.2 MPa)" | The abstract gives 13.8 MPa (step-down) and 11.5 MPa (lateral step-up) only. The 11.2 MPa value for the forward step-up is not in the abstract. The full text is paywalled. Mark 11.2 UNVERIFIED. | S18 abstract (Europe PMC) |
| C7 | `clinical.md` section 4: S15 "Loaded squats raise stress at 45 to 90 degrees in descent" | Not in the abstract. The abstract says stress rises with knee flexion and an external load "further increases" it. The angle band is UNVERIFIED (paywall). | S15 abstract |
| C8 | `clinical.md` section 4: S17 "A stride adds stress at 10 to 40 degrees" | The abstract says stress was greater "with a stride compared to without a stride at lower knee flexion angles". The band 10 to 40 degrees is UNVERIFIED (paywall). | S17 abstract |
| C9 | `clinical.md` S6 row | Add: 41 percent of the S6 patients had a bone procedure at the same time (TTO or trochleoplasty). S6 is a mixed population. | S6 abstract |
| C10 | `clinical.md` S21 row | Add: 27 of 97 patients had MPFLR with TTO. S21 is a mixed population. The values 59.2, AUC 0.70 and OR 3.56 (95% CI 1.10 to 11.51) are exact. | S21 full text |
| C11 | `clinical.md` S1 RTS criteria | S1 lists, in the RTS text, LSI of 90 percent or more for isometric peak torque of knee extension, knee flexion "and hip abduction". The base names quadriceps only. | S1 full text |

## Table 1. S1 to S24 of `clinical.md`

Verdicts: VERIFIED-FULL (full text read, claim exact), VERIFIED-ABSTRACT (record and abstract read, claim exact in the abstract, full text not read), DIFFERS (record exists, the claim is different or partly absent), NOT FOUND.

All records were read through the Europe PMC REST service (`https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=DOI:<doi>`). Full texts came from NCBI efetch (`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pmc&id=<pmcid>`) or from the PMC web page.

| ID | Reference (checked) | URL read | Verdict | Corrected or exact quote |
|---|---|---|---|---|
| S1 | Hsu CJ, Lee C, Christensen RS, Liu TY. Int J Sports Phys Ther 2025;20(7):1074-1090. PMID 40620410 | https://doi.org/10.26603/001c.141128, PMC12222034 full text | DIFFERS (partly) | Exact: phases "0 to 6 weeks", "6-12 weeks", "12-16 weeks", ">16 weeks" (Table 1), "The RTS phase (>20 weeks)" (text). "Typically, patients start 0°-30° in the first or second week and progress by 20°- 30° per week." Phase 1 milestones "Knee flexion greater than 110°", "Full knee extension", "Straight leg raise without extension lag", "Walking without crutches". Run: "full ROM or >95% of the non-injured knee, no pain or pain <2/10 on visual analogue scale and limb symmetry index of quadriceps >70%". Hop tests "starting at 12-19 weeks". "A MPFL-RSI score > 56 points indicates a patient is psychologically ready". Corrections C1, C2, C3, C11 |
| S2 | Koshino Y et al. Int Orthop 2022;46(11):2517-2528. PMID 35701590 | https://doi.org/10.1007/s00264-022-05480-4 | VERIFIED-ABSTRACT | "Eighty-five studies were included, 57 of which were case series and only one randomised controlled trial". "Weightbearing and ROM (≤ 90°) restriction were within three weeks post-operatively for > 50% of the programmes." Population: age 18 or more |
| S3 | Zaman S et al. Am J Sports Med 2018;46(10):2530-2539. PMID 28678520 | https://doi.org/10.1177/0363546517713663 | VERIFIED-ABSTRACT | "weightbearing restrictions and range of motion restrictions in 90.6% and 84.9% of studies". "Ten of 53 studies (18.9%)" used criteria |
| S4 | Manjunath AK et al. Am J Sports Med 2021;49(4):1094-1100. PMID 32866030 | https://doi.org/10.1177/0363546520947044 | VERIFIED-ABSTRACT | "rate of return to play was 85.1%, with 68.3% returning to the same level". "7.0 months". "recurrent instability events ... 5.4%" |
| S5 | Platt BN et al. Am J Sports Med 2022;50(1):282-291. PMID 33720789 | https://doi.org/10.1177/0363546521990004 | VERIFIED-ABSTRACT | "92.8% (95% CI, 86.4-97.6)", "71.3%", "mean of 6.7 months (range, 3.0-6.4 months)" (the abstract range does not contain the mean: an error in the source), complications "8.8%", recurrence "1.9%" |
| S6 | Kang L et al. Arthrosc Sports Med Rehabil 2026;e70110. PMID 42876992 | https://doi.org/10.1002/ars2.70110 | VERIFIED-ABSTRACT | "only 14% to 40% of patients met all study-specific RTS criteria". "70% to 96% for isokinetic extension". Correction C9 |
| S7 | Magnussen RA et al. Knee 2022;38:178-183. PMID 36063612 | https://doi.org/10.1016/j.knee.2021.08.006 | VERIFIED-ABSTRACT | "123 (75%) were available". "3 recurrent dislocations ... (2.4%), all of which occurred in the restrictive rehabilitation group" |
| S8 | Schaver AL et al. J Knee Surg 2024;37(9):631-637. PMID 38113911 | https://doi.org/10.1055/a-2232-4856 | VERIFIED-ABSTRACT | "41 days ... vs. 44 days", "B: 12 knees [7.27%] vs. NB: 1 knee [1.56%], p = 0.09", "20 knees [12.1%] vs. 0 [0%], p = 0.001", "OR: 19.63, 95% CI: 1.43-269.40" |
| S9 | Grossman MG et al. J Knee Surg 2026. PMID 42413534 | https://doi.org/10.1055/a-2908-2717 | VERIFIED-ABSTRACT | "Six of seven studies (85.7%) braced patients for up to 6 weeks". "25 (4.7%) ... compared with 1 of 117 nonbraced knees (0.9%)", "p = 0.055" |
| S10 | Vidra M et al. Curr Rev Musculoskelet Med 2026;19(1):45. PMID 42258047 | PMC13247021 web page (full text) | DIFFERS (partly) | Exact: "immediate weight bearing as tolerated (66%, p < 0.001)". Corrections C4, C5. The review also reports a Delphi: "the consensus group strongly supported early motion ... and recommended that full ROM should be achieved by 6 weeks after MPFL repair or reconstruction" |
| S11 | Schneider DK et al. Am J Sports Med 2016;44(11):2993-3005. PMID 26872895 | https://doi.org/10.1177/0363546515624673, PMC5502077 | VERIFIED-ABSTRACT | "pooled total risk of recurrent instability after surgery was 1.2%", "apprehension sign risk of 3.6%" |
| S12 | Shah JN et al. Am J Sports Med 2012;40(8):1916-1923. PMID 22679297 | https://doi.org/10.1177/0363546512442330, PMC3615712 | VERIFIED-ABSTRACT | "A total of 164 complications occurred in 629 knees (26.1%)" |
| S13 | Parikh SN et al. Am J Sports Med 2013;41(5):1030-1038. PMID 23539043 | https://doi.org/10.1177/0363546513482085 | VERIFIED-ABSTRACT | "38 complications in 29 knees (16.2%)", stiffness 8, patellar fractures 6, "Eighteen of 38 (47%)" technical |
| S14 | Steinkamp LA et al. Am J Sports Med 1993;21(3):438-444. PMID 8346760 | https://doi.org/10.1177/036354659302100319 | VERIFIED-ABSTRACT | "intersected at 48 degrees of knee flexion". Population: 20 normal subjects, 18 to 45 years |
| S15 | Wallace DA et al. JOSPT 2002;32(4):141-148. PMID 11949662 | https://doi.org/10.2519/jospt.2002.32.4.141 | DIFFERS (partly) | Exact: "patellofemoral joint stress increases as the knee flexion angle increases". Correction C7 |
| S16 | Escamilla RF et al. Med Sci Sports Exerc 2009;41(4):879-888. PMID 19276845 | https://doi.org/10.1249/mss.0b013e31818e7ead | VERIFIED-ABSTRACT | "it may be prudent to use a smaller knee angle range between 0 degrees and 50 degrees". Population: 18 healthy subjects with a 12 RM load |
| S17 | Escamilla RF et al. JOSPT 2008;38(11):681-690. PMID 18978453 | https://doi.org/10.2519/jospt.2008.2694 | DIFFERS (partly) | Exact: "Between 70 degrees and 90 degrees ... greater when performing a forward lunge with a short step". Correction C8 |
| S18 | Chinkulprasert C et al. JOSPT 2011;41(4):241-248. PMID 21289449 | https://doi.org/10.2519/jospt.2011.3408 | DIFFERS (partly) | Exact: "FSD (mean ± SD, 13.8 ± 0.4 MPa) compared to the LSU (11.5 ± 0.8 MPa". Correction C6 |
| S19 | Giles L et al. Br J Sports Med 2017;51(23):1688-1694. PMID 28500081 | https://doi.org/10.1136/bjsports-2016-096329 | VERIFIED-ABSTRACT | "93% greater reduction in pain with activities of daily living (p=0.02)" |
| S20 | Lorenz DS et al. J Athl Train 2021;56(9):937-944. PMID 34530434 | https://doi.org/10.4085/418-20 | VERIFIED-ABSTRACT | "a reasonable option for bridging earlier phases of rehabilitation" |
| S21 | Kim CL et al. Am J Sports Med 2026;54(13):3222-3229. PMID 42852817 | PMC13736508 full text | VERIFIED-FULL | "odds ratio, 3.56; 95% CI, 1.10-11.51; P = .0333". Correction C10 |
| S22 | Burcea CC et al. Life (Basel) 2024;14(11):1355. PMID 39598154 | PMC11595769 full text | VERIFIED-FULL | "Thirty-five patients aged 18-38 ... (20 SG, 15 QTA)". Single cohort, pre and post |
| S23 | Pozzi L et al. Knee Surg Sports Traumatol Arthrosc 2026;34(8):2721-2730. PMID 40905301 | PMC13418298 web page | VERIFIED-FULL | "deterioration was observed in 18 knees" (of 24 knees) |
| S24 | Maione A et al. J Exp Orthop 2026;13(4):e70928. PMID 42812844 | PMC13623013 full text | VERIFIED-FULL | "51 patients (55 knees)". "Redislocation rates were comparable between groups (4.0% vs. 6.7%; p = 1.0)" |

Result for S1 to S24: 24 of 24 exist. 19 are exact (4 on full text, 15 on the abstract only). 5 differ in part (S1, S10, S15, S17, S18). S6 and S21 get a population note (C9, C10), not a correction of a number. 0 are NOT FOUND.

Paywalled full texts not read: S2, S3, S4, S5, S6, S7, S8, S9, S13, S14, S15, S16, S17, S18, S19. For these, only the abstract supports a number.
