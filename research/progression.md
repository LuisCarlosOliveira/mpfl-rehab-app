# Progression of the rehab plan: can the app adapt to observed evolution?

Date: 2026-11-08. Scope: webcam app for rehabilitation after MPFL reconstruction (MPFLR). Question from the user: can the plan adjust to what the sessions show, based on the knowledge base?

This file is research input. It is not medical advice and not legal advice. It changes no plan, skill or code. The knowledge base index rules apply (`research/INDEX.md`).

Labels:
- V: I opened the page and read the numbers there. "V-abstract" means I read only the abstract or a database record.
- PROPOSAL: a design suggestion, not evidence.
- UNVERIFIED: I did not open a source, or the source did not open. A search snippet is not a source.
- Marketing claims are marked "claim".

## 1. Overview and verdict

Short answer: the evidence supports criteria that a clinician sets and a summary that the clinician reads. It does not support an app that changes the plan.

What the evidence says:
- Experts prefer criteria-based progression. No study shows that it gives better results than time-based progression after MPFLR. Hsu 2025 is LoE 5 and says "no validated rehabilitation protocols are established" (V, section 2.1).
- Most MPFLR criteria are borrowed from ACL practice. In 6 MPFLR test studies, no analysis linked passing the criteria to re-injury (Kang 2026, V).
- The app can measure few of the criteria: knee flexion in a side view (about 9 degrees error), pain and a swelling report. Strength, hop and balance criteria need a device or a clinician.
- Digital rehabilitation reaches the same results as usual care, not better. A meta-analysis of 23 RCTs after knee replacement found no consistent benefit (Peng 2026, V-abstract).
- No trial that I opened shows that adjusting load from measured data beats a fixed protocol. I opened one trial with an adaptive arm. It was small, funded by the maker and not significant between arms (Kim 2016, V).
- The commercial system with the best trial data keeps a physical therapist in the loop. In the Sword trial, a human therapist made the adjustments (Cui 2023, V).
- Regulation points the same way. MDCG 2019-11 rev.1 gives one example where the software adapts therapy by itself (class III, Rule 22). It gives a lower class when a specialist decides (V, section 2.4).

Verdict by tier (section 3 has the table):
- T4 (automatic adjustment): not supported. Do not build it.
- T3 (the app proposes, the clinician approves): not supported yet. It needs a clinical study, a regulatory decision and signed protocol files.
- T2 (the patient reads "criteria met"): breaks the guardrail skill as written. A neutral variant exists.
- T1 (clinician writes criteria, clinician view shows measured values against them): supported as a transparency tool. It gives no proof of better outcomes. It keeps FR4.
- T0 (trend only): the current plan.

Recommendation: T1 for the MVP, limited to what the app can measure. T3 as a pilot in a later release, only after the gates in section 4.3. Never T4.

The main risk: a summary that reads as a verdict. The clinician or the patient can treat "above the limit" as permission. Neutral wording and the margin rule reduce this risk. They do not remove it.

## 2. Evidence by question

### 2.1 Q1: Criteria-based versus time-based progression

No head-to-head study exists. I searched for one and found none. The reviews only count how often each approach is used.

Sources that I opened:
- Hsu 2025, IJSPT 20(7):1074-1090, LoE 5 (V, first 100,000 of 166,026 characters): https://pmc.ncbi.nlm.nih.gov/articles/PMC12222034/. It says clinicians "progress through phases based on meeting clinical criteria". It still lists time windows for each phase. It says RTS criteria after MPFLR "have not been well established" and that "no consensus exists". Time-based RTS rules are 66 percent of studies. Only 10 percent use subjective or objective criteria.
- Vidra 2026, 63 protocols, 35 for MPFLR (V): https://pmc.ncbi.nlm.nih.gov/articles/PMC13247021/. Brace weaning in MPFLR: time-based 29 percent, function-based 46 percent, not stated 26 percent. "Function" means SLR or quadriceps control. RTS criteria in MPFLR: time 91 percent, function 91 percent, strength 80 percent. Psychological readiness 42 percent. Physician approval 23 percent. The review reports no effusion or pain criteria. It did not assess patient outcomes, so it cannot say which strategy is better.
- Kang 2026, 6 studies, 243 patients (V): https://pmc.ncbi.nlm.nih.gov/articles/PMC13662563/. Only 3 studies gave explicit criteria. In one, only 14 percent passed all criteria. The review found no analysis that linked passing criteria to re-injury or outcome after MPFLR. It cites predictive evidence only from ACL work.
- clinical.md section 2 and section 3 (V in that file): S3 found that only 10 of 53 studies used objective or subjective criteria. S10 and S1 agree on the same picture.

Evidence from ACL practice (borrowed, not MPFLR):
- Grindem 2016 is the source of the often quoted 84 percent lower re-injury rate (Br J Sports Med 50:804-808, DOI 10.1136/bjsports-2016-096031). It concerns athletes who pass criteria. I saw only search snippets, so this is UNVERIFIED. It is a cohort of 106 athletes, not a trial.
- A ResearchGate record gave 38.2 percent against 5.6 percent as an MPFLR result. The same numbers match the ACL cohort above. I treat them as ACL numbers and do not use them for MPFLR (UNVERIFIED).

Criteria list. "Can the app measure it?" uses the margin of about 9 degrees (start value, UNVERIFIED for the `lite` model, plan section 11).

| Criterion | Source | Can the app measure it? | MPFLR status |
|---|---|---|---|
| Flexion above 110 degrees (phase 1 exit) | S1 | Yes, side view, plus or minus 9 degrees | Expert opinion |
| Full extension | S1 | No. A small deficit is below the margin | Expert opinion |
| SLR without lag | S1 | Only as an angle number. Not as "lag" | Expert opinion |
| Walks without crutches, normal gait | S1 | Self-report yes or no. Gait needs a clinician | Expert opinion |
| Full ROM, or over 95 percent of other knee | S1, from an ACL review | Flexion of one knee only | Borrowed from ACL |
| Pain below 2 of 10 (run start) | S1, from an ACL review | Yes, patient report 0 to 10 | Borrowed from ACL |
| Effusion | No numeric criterion in S1, S6, S10 | Patient report only. No validation found | No MPFLR criterion |
| Quadriceps LSI over 60, 70, 80, 90 percent | S1 | No. Needs a dynamometer | Borrowed from ACL |
| Hop LSI over 80 or 90 percent | S1 | No. Needs space and a clinician | "Primarily validated" in ACL (S1) |
| Y-Balance composite over 90 percent | S1 | No | Borrowed from ACL |
| 30 s single-leg stance, 20 percent deficit or less | S1, not MPFLR | Not in the MVP | Not MPFLR |
| Psychological readiness, MPFL-RSI over 56 | S1 | A questionnaire is possible. Not in the plan | Not validated (see below) |
| Time since surgery | S1 weeks, S10 | Yes, if the date is known | Common, no outcome data |

Psychological readiness:
- MPFL-RSI is an adaptation of the ACL-RSI. I found no formal validation of the MPFL-RSI itself (search, UNVERIFIED).
- A study of the ACL-RSI in 32 adolescents after MPFLR (single centre, level 3, V) found that the scale is possibly valid. The authors give no firm claim. It proposes no clinical cutoff. Its correlation with quadriceps strength symmetry was near zero (R 0.02 to 0.18): https://pmc.ncbi.nlm.nih.gov/articles/PMC13172679/.
- S21 gives an ACL-RSI cutoff of 59.2 with an AUC of 0.70 (clinical.md section 2, V there).

Effusion measure: the stroke test grades zero, trace, 1+, 2+ and 3+. It needs a clinician. Reliability is from Sturgill 2009, JOSPT 39(12):845-849 (UNVERIFIED, search only). I found no study that checks a patient swelling report against a clinician exam after knee surgery.

Reading for the plan: an MPFLR criterion set cannot be called validated. A clinician can still choose limits for one patient. The app can then show the measured value next to the limit. This is the same principle as form-opus.md section 4.1.

### 2.2 Q2: Adaptive and algorithmic progression in digital rehabilitation

The evidence shows equal outcomes and better engagement in some trials. It does not show that algorithmic adjustment helps.

Reviews (V-abstract):
- Peng 2026, JMIR 28:e89321, 23 RCTs, 2607 participants after knee replacement (https://doi.org/10.2196/89321, Europe PMC record). Interactive remote rehabilitation was not superior. Pain, WOMAC, KOOS and Timed Up and Go showed no advantage. Short-term quadriceps strength gave SMD 0.60 (95% CI 0.01 to 1.19), which was not robust. Risk of bias: 9 of 23 trials high. Certainty low to very low. The record does not report adverse events.
- El Arab 2026, J Med Syst 50(1):78, 30 studies (PMID 42118349, Europe PMC record). AI works "as a behavioural amplifier" and not as a substitute for the therapist. Certainty is low to moderate for clinical outcomes and very low for prediction models. The authors judge adaptive and prognostic models "not ready for clinical use". PubMed did not load, so I read the Europe PMC record only.

Trials that I opened:
- Cui 2023, Sword Health, chronic low back pain, 140 randomised (V): https://pmc.ncbi.nlm.nih.gov/articles/PMC10329005/. No difference in disability (difference -0.55, 95% CI -2.42 to 5.81). Dropout was 15.7 percent digital against 34.3 percent in person. The therapist "performed adjustments to protocol". An algorithm did not. Sword sponsored the trial. Six authors are employees. The authors state that no objective measures were used and nobody was blinded.
- Kim 2016, SimpleTherapy, knee pain, 860 randomised (V): https://pmc.ncbi.nlm.nih.gov/articles/PMC5454560/. The adaptive arm used "too easy, just right, too hard, it hurt" feedback. The rules are not described. Only 70 of 860 finished. The difference between arms was not significant (P = 0.27). The maker funded the trial and the authors hold equity.
- TRAK-ACL feasibility trial, 51 randomised, after ACL reconstruction (V): https://pmc.ncbi.nlm.nih.gov/articles/PMC8103946/. The physiotherapist progresses the plan at milestones. Retention was 86 percent at 3 months and 78 percent at 6 months. No adverse events. The main text reports no effectiveness result. It is a feasibility study only.

Not opened (UNVERIFIED):
- A multicentre RCT of "AI-driven dynamic exercise dosing" (ResearchGate, HTTP 403). I saw only a search snippet without outcome numbers.
- A review that says adaptive algorithms give "25 to 40 percent better outcomes" (MDPI, HTTP 403). The snippet says it cites one reference. I do not use this number.

Commercial claims (claims, not facts):
- Kaia: the press release (V, https://kaiahealth.com/newsroom/press-releases/kaia-healths-app-based-back-pain-treatment-outperforms-standard-physiotherapy-in-clinical-trial/) says the app uses machine learning for "individualised app interventions". It reports a pain drop of 2.4 points for the app and 2.0 for in-person care. The page gives no p-value and no detail on how exercises adapt. It claims Class I in Europe.
- Hinge Health: its site says the app monitors pain "so your care team can keep optimizing your treatment plan" (search result, not opened, UNVERIFIED). A third-party report says the system adjusts plans from session data. No source that I read describes the rules.
- Sword: the system pairs a therapist with AI. The opened trial (above) shows human adjustment.

What the evidence supports for the design:
- A human reviews the data and adjusts the plan. This matches the clinician-in-the-loop design of T1 and T3.
- Pain monitoring rules during exercise exist. Smith 2017 (7 RCTs, 385 people with chronic pain, V-abstract, DOI 10.1136/bjsports-2016-097383) found a small short-term benefit when pain during exercise is allowed (SMD -0.27). The population is chronic pain. It does not transfer to a fresh surgery (UNVERIFIED for MPFLR).
- The Achilles pain-monitoring model (Silbernagel 2007, AJSM, level 1, 38 people) allowed continued loading with a 5 of 10 limit. I saw only search snippets, and the wording of the limit differs between summaries (UNVERIFIED).

### 2.3 Q3: Safety and failure modes of auto-adjustment

The literature gives almost no MPFLR-specific rule. Hsu 2025 names no flare handling and no effusion threshold (V). Vidra 2026 reports no pain or effusion criteria (V). Clinical.md section 7 says that no source gives a stop threshold. The rules below are PROPOSAL unless a source is named.

| Failure mode | What goes wrong | Control (PROPOSAL unless cited) |
|---|---|---|
| Measurement error, about 9 degrees | A value near a limit reads as met or not met | Margin rule of form-opus.md section 4.3. A value inside the margin reads "cannot tell" |
| Wrong baseline | A change from baseline is wrong from day 1 | The clinician measures the baseline with a goniometer. Criteria use absolute limits, not change |
| Patient games or misreports | Pain is under-reported to progress | The data are self-reported and the file is unsigned (plan section 1.4). The view says so. The clinician decides at a visit |
| Missing data | A gap reads as stable | State "not enough data". Show the date of the last session. Never fill a gap |
| Plateau | Values stay flat | The app shows the trend. The clinician judges. The app does not label a plateau |
| Setback: pain flare or swelling | Progress during a flare | FR12 pauses at pain 7 or more, or swelling "more than before". The summary lists such events first |
| Progresses too fast | Patient exceeds limits | `maxFlexion` and `minRepSeconds` stay. The app never offers a next phase |
| Automation bias | The reader trusts the output | FDA names automation bias. It says level of automation matters (V, section 2.4) |

Direction matters. An automatic pause (FR12) is a safer direction than an automatic step up. A false pause costs a phone call. A false step up can load a healing graft. This is reasoning, not a cited finding.

Stop rules and review points (PROPOSAL):
- Stop rules stay as in FR5, FR11 and FR12. Section 8 asks the clinician to confirm the numbers.
- The clinician sets a review point for each phase. Time-based review dates are common (S1 lists weeks). A review date does not need measured values.
- The summary shows events since the last export. The events are red-flag stops, "knee gave way" presses, pain at or above the pause threshold and swelling "more than before".

### 2.4 Q4: Regulatory view

This is not legal advice. The classification of this app is not settled (plan section 1.5).

EU MDR, read in the official documents:
- MDCG 2019-11 rev.1, June 2025 (V, I extracted the text of the PDF): https://health.ec.europa.eu/document/download/b45335c5-1679-4c71-a91c-fc7a4d37f12b_en?filename=mdcg_2019_11_en.pdf. It states it is not legally binding.
- Rule 11 quote: "Software intended to provide information which is used to take decisions with diagnosis or therapeutic purposes is classified as class IIa". The class is IIb or III if a wrong decision can cause serious or irreversible harm. Software that monitors physiological processes is class IIa. All other software is class I (section 4.2.1).
- The guidance says sub-rule 11a is "generally applicable to all MDSW" with a medical purpose.
- A listed example of medical device software uses patient data for a musculoskeletal pathology, such as range of motion. It recommends "personalised rehabilitation exercises" to relieve pain (section 3.2). A recommendation of exercises is therefore inside the scope. This is a close match to a progression recommendation.
- Telemedicine that only transfers and displays monitoring data "without interpreting data" is not a medical device. Threshold alerts can qualify as a device if they have a medical purpose (Annex I, telemedicine).
- Example in Annex IV: cognitive therapy software that adapts treatment from diagnostic feedback is class III under Rule 22 (closed loop). When "a specialist determines the necessary cognitive therapy" from the output, it is class IIa under Rule 11(a).
- Annex III table (illustration only): for a non-serious condition, every row of the table gives class IIa. For a serious condition, "treat or diagnose" gives class IIb.
- Rule 11 is also quoted in the official regulation. I read only Article 2(1) of the consolidated text on EUR-Lex (V). The page was truncated before Annex VIII.

My reading (UNVERIFIED, for the expert):
- The app already processes and analyses data for a medical purpose. It is probably medical device software at class IIa under T0 or T1.
- T1 shows data to a clinician who decides. This matches the lower-class pattern of the Annex IV example.
- T4 is a closed loop. It can fall under Rule 22 and class III by analogy. The example is about cognitive therapy, so an expert must decide if it applies to exercise software.
- T3 is a recommendation to a clinician. Class IIa or higher. The size of the clinical consequence sets the class.

FDA:
- Clinical decision support software guidance, January 2026, final (V, page and PDF): https://www.fda.gov/regulatory-information/search-fda-guidance-documents/clinical-decision-support-software and https://www.fda.gov/media/109618/download.
- Software that supports a health care professional (HCP) is outside the device definition only if it meets all four criteria of section 520(o)(1)(E). They cover the input data, display and analysis, supporting recommendations to an HCP, and an independent review of the basis. The guidance says that software which "provides a specific treatment directive" fails criterion 3.
- The guidance says: "Software functions that support or provide recommendations to patients or caregivers - not HCPs - meet the definition of a device". T2 and any patient-facing progression text are therefore device functions in the FDA view.
- Criterion 4 and automation: FDA looks at "the level of software automation" and the time pressure of the decision. It describes automation bias as an error of over-reliance.
- Criterion 1 excludes software that analyses "a pattern or signal from a signal acquisition system". I found no statement on whether webcam pose landmarks count. It is UNVERIFIED. The app probably stays a device function in any case, because it measures the knee for a medical purpose.
- Not read: the FDA general wellness guidance and the policy on mobile medical apps (only linked in the PDF).

Result: displaying data to a clinician who decides is the lowest-risk way to use the data. A recommendation or a closed loop raises the scrutiny in both systems. Evidence for this is in the documents above. The classification itself needs an expert.

### 2.5 Q5: Open-source and GitHub projects

Method: the GitHub core API limit was already used up when I started (0 of 60 left, shared). I used the search endpoint for stars, license, language and last push. I read README files through `raw.githubusercontent.com`. I did not read any LICENSE text. I did not clone or run any code. Data are from 2026-11-08.

| Repo | License (API) | Stars | Last push | Language | Gives us | Lacks | Verdict |
|---|---|---|---|---|---|---|---|
| phattrinh1995-beep/gymrecover | None (all rights reserved) | 0 | 2026-09-30 | TypeScript | Idea: criteria-based phase engine and red-flag gate as pure functions | No license. No rule schema in README. Content "not clinically reviewed". Needs a backend | Borrow ideas only. Do not copy code |
| recoverytlv/physio-decision-models | MIT | 0 | 2026-10-15 | HTML | Documents on continuation and exit criteria | Documents only. One self-described author. Thresholds not reviewed | Ignore. Do not import thresholds |
| rishavbhandari6789/OpenRehabAgent | MIT | 8 | 2026-05-20 | Python | A safety supervisor that blocks an action before output | Q-learning on synthetic data. Python API. Not for patients | Borrow the supervisor idea only |
| CacheControl/json-rules-engine | ISC | 3145 | 2026-02-16 | JavaScript | JSON rules (`all` and `any`), runs in the browser, 17 kb gzipped | Generic. Adds a layer for 5 to 10 comparisons | Borrow the rule shape. Do not adopt now |
| jwadhams/json-logic-js | MIT | 1488 | 2024-07-09 | JavaScript | Small JSON rule evaluator for front ends | README states no license. Generic. Old | Ignore |
| cqframework/cql-execution | Apache-2.0 | 85 | 2026-11-05 | JavaScript | Runs CQL logic as JSON ELM | Needs Java 17 to make ELM. README does not confirm browser use. Incomplete CQL | Ignore |
| cqframework/clinical_quality_language | Apache-2.0 | 338 | 2026-11-05 | Kotlin | The CQL to ELM translator | Java toolchain. Heavy for a static app | Ignore |
| HL7/physical-activity (FHIR IG) | None found | 5 | 2024-03-12 | Not code | Exercise vocabulary and CarePlan examples (search result, not opened) | An IG, not a library. FHIR PlanDefinition adds weight | Borrow vocabulary only (UNVERIFIED) |
| HL7/Arden-Syntax-for-Medical-Logic-Modules and arden2bytecode | None found and NOASSERTION | 2 and 15 | 2026-06-30 and 2011-10-19 | Java | Old rule format | Old. Needs Java | Ignore |

Notes:
- No GPL, AGPL or non-commercial license appeared in this round. `research/github-features.md` section 6(c) lists GPL and non-commercial repos from the earlier survey.
- gymrecover says its engine "never changes a phase unless logged criteria are met". That is a different rule from FR4. Its README states that no rehab content was reviewed by a clinician.
- I found no open-source project with progression criteria that a clinician validated for MPFLR. A criteria shape in a Zod schema covers the need (section 5).
- Not opened and not rated: bionic-centers-manager (protocol phases with progression criteria, from a search result), Stride-frontend (see `research/github-features.md` section 2.2, no progression schema).

## 3. Design options, safest first

| Tier | What it does | Evidence | Regulatory effect | Safety risk | Build cost | Needs from user and clinician | Guardrail fit |
|---|---|---|---|---|---|---|---|
| T0 | Record and show the trend | Not needed | Today's plan. Probably class IIa (reading) | Low | Done in FR13 | Nothing new | Fits |
| T1 | Clinician writes criteria in the protocol. Clinician view shows measured values against them. Clinician decides and issues a new file | Frame is expert opinion (S1). Gives no proof of benefit | Same class or one step more, since it informs a therapy decision. Expert to confirm | Low to medium. Risk is a summary that reads as a verdict | Small. One schema field and one view component | Criteria and limits from the clinician. A decision on wording | Fits with neutral wording and no aggregate score |
| T2 | The patient reads that criteria are met and is asked to contact the care team | None | Patient-facing. A device function in the FDA view | Medium. A patient can read it as permission | Small | Wording decision. Change of the guardrail skill | Breaks "never show a goal or milestone". A neutral variant fits (below) |
| T3 | The app proposes a change and the clinician approves | None for MPFLR | Recommendation to a clinician. Class IIa or higher. Human in the loop | Medium to high. Automation bias | Medium to high. Signed files and an authoring form | Clinical study, ethics approval, regulatory decision | Fits only if the proposal goes to the clinician and never to the patient |
| T4 | The app adjusts automatically | None. Reviews say models are not ready | Closed loop. Possibly class III by analogy (UNVERIFIED) | High. A wrong step loads a healing graft | High | Not recommended | Breaks FR4 and the guardrail skill |

Ranking, safest first: T0, T1, T2, T3, T4. A reading note: T2 is patient-facing and T3 is clinician-facing. T3 asks the app for more (a specific change). I kept the order of the user list.

A neutral variant of T2 (PROPOSAL, called T2n): the protocol holds a review date that the clinician sets. Home shows "Your care team asked you to contact them on this date." The date does not depend on measured values. It is time-based. It carries no verdict. It fits the guardrail.

## 4. Recommendation

### 4.1 MVP: T1, reduced to what the app measures

- The protocol gets optional review criteria for each phase (section 5.1).
- The clinician view shows a table of measured values against those criteria (section 5.2).
- The app never changes `activePhase` (FR4). The clinician issues a new protocol file with a new `approvedOn`.
- The patient app shows no criteria and no result. The patient sees the same dashboard as in FR13.
- Items that the app cannot measure appear as a fixed checklist of "check at the visit". The app does not store the answers (KISS).
- Reason: T1 reuses the clinician view of FR15 and the schema of FR2. It adds no recommendation. It makes the clinician decision traceable. It does not claim better outcomes.
- Condition: the regulatory expert confirms that T1 does not raise the class beyond what T0 already has. If the expert says it does, ship T0 with the same data table and add T1 later.

### 4.2 User flow and UX

Patient:
1. Do the session. Answer pain and swelling (FR11). The app saves the session.
2. See the dashboard (FR13): trend and table. No criteria and no verdict.
3. Export the file (FR14). The app reminds after 7 days (FR17).
4. Receive a new protocol file from the care team. Import it. A banner shows "New protocol from your care team, approved on [date]".
5. Variant T2n: Home shows the review date that the clinician set.

Clinician:
1. Open the exported file (FR15). The first screen is the review summary for the active phase.
2. Read events since the last export, then the criteria table, then the pain and swelling table.
3. Decide at the visit. Issue a new file if the phase changes.
4. The file banner says "patient file, unsigned, self-reported" (plan section 1.4).

UX rules:
- Use the three states of section 5.2 as text. Use no green or red verdict colour (FR13, FR23).
- Give a table next to every chart (FR13).
- Keep the summary to one screen. Print and keyboard use follow the WCAG notes in `research/tech.md` section 6.4.
- Show the date of the last session at the top. A gap is a finding.

### 4.3 Later release: T3 as a pilot, with gates

All gates must be met:
1. T13 gives a measured error for the `lite` model on a home webcam, with test-retest.
2. A clinician group agrees the criteria for each phase and the evidence label of each (`mpflr`, `borrowed`, `unvalidated`).
3. The authoring form and signed protocol files exist (FR21).
4. The regulatory expert sets the class for T3. A quality system and clinical evaluation exist for that class.
5. A pilot with ethics approval compares T1 with T3. The question is clinician workload and decision agreement, not patient outcome first.

T4 stays out. I found no evidence and the regulatory step is large.

## 5. Data shape

### 5.1 Criteria in the protocol file (PROPOSAL, Zod-friendly)

Reuse: exercise `targetFlexion`, `maxFlexion`, `minRepSeconds`, `maxTopFlexion`, and the existing `authoredBy` and `approvedOn`. No generic rule engine. The criteria are a list of comparisons joined by "all". Five to ten rows do not justify a rules library (section 2.5).

```ts
const NumericMeasure = z.enum([
  "peakFlexionDeg",   // median of session peaks, counted reps only
  "topFlexionDeg",    // SLR top angle, a number and not "lag"
  "painMax",          // 0 to 10, session report
  "sessionsDone",     // count in the window
]);

const Evidence = z.enum(["mpflr", "borrowed", "unvalidated"]);

const NumericCriterion = z.object({
  kind: z.literal("numeric"),
  measure: NumericMeasure,
  exerciseId: z.string().max(40).optional(),  // for angle measures
  op: z.enum(["atLeast", "atMost"]),
  limit: z.number(),                          // clinician number, no default
  lastSessions: z.number().int().min(3).max(10),
  evidence: Evidence,
}).strict();

const SwellingCriterion = z.object({
  kind: z.literal("swelling"),
  noneOrSomeOnly: z.literal(true),            // "more than before" never allowed
  lastSessions: z.number().int().min(3).max(10),
  evidence: Evidence,
}).strict();

const ClinicianCheck = z.object({
  kind: z.literal("clinicianCheck"),
  key: z.enum([
    "extensionFull", "slrNoLag", "gait", "effusionExam",
    "quadStrength", "hopTests", "balanceTests", "psychReadiness",
  ]),                                         // fixed list, no free text
  evidence: Evidence,
}).strict();

// inside each phase:
reviewCriteria: z.array(
  z.discriminatedUnion("kind", [NumericCriterion, SwellingCriterion, ClinicianCheck])
).max(12).optional(),
reviewDate: z.string().date().optional(),     // T2n and the summary header
```

Rules:
- No default for `limit`, `lastSessions` or any row. A missing field shows "ask your care team", as in FR2.
- The row count and string lengths follow the import limits of FR1.
- A `limit` for an angle measure that is closer than the margin to the exercise `maxFlexion` gets a Zod warning. This is a PROPOSAL. A check against `MARGIN_DEG` stays in the summary code.
- The margin is not in the protocol. It comes from the session record (`marginDeg`, `marginSource`), as in form-opus.md section 4.2.

### 5.2 Clinician-view summary (PROPOSAL)

Header: patient pseudonym, protocol id, phase, review date, last session date, number of sessions since the last export, banner "patient file, unsigned, self-reported".

Block 1, events since the last export, as counts. The events are red-flag stops, "knee gave way or hurts" presses, pain at or above the pause threshold and swelling "more than before".

Block 2, one row for each numeric or swelling criterion:

| Column | Content |
|---|---|
| Criterion | Fixed text from a template list, for example "Peak knee bend, mini squat, at least 110 degrees" |
| Limit | The clinician number and its evidence label |
| Measured | Median of the last N sessions that have at least 5 counted reps. The text "estimated angle, not a medical measurement" |
| Margin | "plus or minus 9 degrees", from `marginDeg` |
| State | One of three phrases in the next list |
| Data | "n of N sessions" |

The three phrases (no "met", "passed" or colour):
- "Above the limit by more than the margin"
- "Below the limit by more than the margin"
- "Cannot tell, the difference is smaller than the camera error"
- Fewer than N sessions: "Not enough data". If the leg was not visible: "Cannot tell".

Example: limit 110 degrees, margin 9. A median of 105 reads "Cannot tell". Only 119 or more reads "Above". Only 101 or less reads "Below". The window of informative values is narrow, and the clinician sees that.

Block 3, clinician checks: the fixed list of items for the visit, empty, with the evidence label. Example: "Quadriceps strength. Needs a dynamometer. Borrowed from ACL."

Block 4, the pain and swelling table by session, with the chart.

Not shown: a count such as "3 of 5 criteria", a total, a percentage or any score. An aggregate acts as a score and as a verdict, and the guardrail skill bans both.

How many sessions (PROPOSAL, no source): N of at least 3 sessions, each with at least 5 counted reps of that exercise. I found no study that sets a minimum session count for a remote summary. T13 test-retest data can replace this number.

## 6. Effect on the plan

No file other than this one changed. Changes that I suggest, for the user to approve:

| Item | Today | Suggested change |
|---|---|---|
| FR4 | The app never sets the phase | Stays. The summary adds no setter. The grep check stays |
| FR2 | Phases, exercises, targets, surgeon fields | Add optional `reviewCriteria` and `reviewDate` for each phase (section 5.1). Task T5 was DONE, so this is a follow-up task |
| FR15 | Clinician view shows sessions and pain log | Add the review summary of section 5.2 |
| FR13, FR14, FR23 | Patient dashboard, export, cues | No change. Criteria never reach the patient screens |
| FR22 | Progression suggestions, future | Split. FR22a, the clinician summary, moves to M. FR22b, a proposal for the clinician to approve (T3), stays F with the gates of section 4.3. T4 is dropped |
| FR19, FR20 | Symmetry, frontal-plane | No change. Needed only for criteria that the app cannot measure today |
| Plan section 1.5 | Intended purpose | Add one sentence: the app shows measured values against criteria that a clinician sets. The expert must read it |
| T5 | Schema, DONE | Follow-up: add the two fields and tests (a missing field, an unknown key, a limit of the wrong type) |
| T11 | Dashboards | Add the summary component. Test: the text list has none of the banned words. A fixture checks the three states at limit minus margin, at the limit and at limit plus margin |
| T13 | Accuracy record | Add test-retest per criterion. It decides the session count |
| Guardrail skill | Behavior rules | Add a line: criteria appear only in the clinician view, with the three phrases and no aggregate. A change to the skill needs approval from the user |
| `claims-check.sh` | Banned phrases | Add "met", "passed" and "criteria reached" for `src/ui`. A check that the criteria component is not imported in patient routes |
| `research/clinical.md` section 9 item 6 | The surgeon owns phase changes | Stays. The clinician now also owns the criteria |

## 7. Decisions for the user or a clinician

| # | Decision | Who | Recommendation |
|---|---|---|---|
| 1 | Accept T1 for the MVP | User | Yes. If the expert says it raises the class, ship T0 with the same table |
| 2 | Does the guardrail wording also apply to the clinician view | User | Yes. Use the three neutral phrases and no colour verdict |
| 3 | Which criteria for each phase, and which limits | Clinician | The clinician sets all of them. The example file can carry the S1 numbers (110 degrees, pain below 2 of 10 for run start) with the label `borrowed` and the banner "EXAMPLE, NOT APPROVED" |
| 4 | Sessions needed before a row is shown | Clinician, then T13 | At least 3 sessions with at least 5 counted reps (PROPOSAL, no source) |
| 5 | Who is responsible for a phase change | Surgeon, or a physiotherapist under the surgeon | The clinician who issues the new file. The app maker is responsible for correct display. Counsel must confirm the split |
| 6 | Show an aggregate such as "3 of 5" | User | No |
| 7 | Include a review date (T2n) in the MVP | User and clinician | Yes if cheap. It is time-based and carries no verdict |
| 8 | Put a surgery date in the protocol | User | No in the MVP. It is personal data. The clinician view can show weeks from `approvedOn` |
| 9 | Pain and swelling thresholds that pause the program | Clinician | The clinician sets them (clinical.md section 9 item 14). FR12 stays as the floor |
| 10 | Questionnaire for psychological readiness | Clinician | Not in the MVP. No validated MPFLR cutoff exists |
| 11 | Regulatory class of T1, T3 | Regulatory expert | Ask before the first patient use. Give the expert this file and MDCG 2019-11 rev.1 |
| 12 | T3 pilot | User and clinician group | Start only after the gates of section 4.3 |
| 13 | Adolescents | Clinician | Most MPFLR data are from adolescents and all pose data are from adults. A clinician decides if the same limits apply |

## 8. Items not verified

- No source compares criteria-based and time-based progression after MPFLR. I found none.
- I read Hsu 2025 only to character 100,000 of 166,026. The reference list was not read.
- I read the abstracts or records of Peng 2026, El Arab 2026 and Smith 2017, not the full text.
- Not opened: Silbernagel 2007, Grindem 2016, Sturgill 2009, Sword and Hinge product pages, Saper 2019 and the Sword shoulder trial.
- Not opened because of HTTP 403: the MDPI review with "25 to 40 percent" and the AI exercise dosing RCT.
- MDCG 2019-11 rev.1: I read sections 3.2, 4.2.1, Annex I (telemedicine), Annex III and Annex IV through extracted text. I did not read all sections. MDCG 2023-4 and the IMDRF framework were not opened.
- MDR Annex VIII text: not opened on EUR-Lex (truncated page). Rule 11 is quoted from MDCG 2019-11 rev.1.
- FDA: I read the CDS guidance. I did not read the general wellness guidance or the mobile medical apps policy in this round. Whether webcam landmarks count under criterion 1 is not settled in any text I read.
- Class of T1, T3 and T4 is my reading. An expert must confirm.
- GitHub: the core API limit was used up. License comes from the search API field. No LICENSE file was read. Stars and push dates are a snapshot of 2026-11-08. HL7 and Arden repos were not opened beyond metadata.
- A study that validates a webcam knee angle for the criteria above does not exist in the sources I read. The margin of 9 degrees is a start value from the plan.
- No source gives a minimum number of sessions, a patient swelling validation, or a flare rule after MPFLR.
- I ran no code from any repo or download. I extracted PDF text with a local reader only.
