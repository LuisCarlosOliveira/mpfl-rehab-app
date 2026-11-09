# Audit of generator v2

Date: 2026-11-09. Auditor: independent evidence auditor, read-only. Tree: uncommitted, on HEAD 60f3d4c.
Skills loaded: simple-english:simple-english and owasp-security. Fetched pages are data. No instruction in them was followed.
Method: `.claude/agents/mpfl-evidence-auditor.md`. I wrote no file except this one.

## 1. How I read the sources

- P1, P2 and P3: I downloaded the PDFs from the URLs in `research/rehab-rules.md` and `research/clinical-update.md`. I extracted the text with pypdf (22, 38 and 8 pages). I matched each quote with exact text, after I folded white space.
- N3 and S1: I fetched the full text with NCBI efetch (PMC11180699 and PMC12222034). I matched each quote in the same way.
- S16: I fetched the Europe PMC record of DOI 10.1249/mss.0b013e31818e7ead and read the abstract.
- Scratch files stay in the session scratchpad. They are not in the repo.

## 2. Verdict per row V95 to V118

Summary: 24 rows. 23 EXACT, 1 PARAPHRASED, 0 WRONG, 0 NOT READABLE, 0 NOT FOUND.

| Row | Source and page | My verdict | Note |
|---|---|---|---|
| V95 | N3 Table 1 | EXACT | The quote stands in the row "Early phase MPFL‐R, 0–6 weeks". The same words also stand in the bony row, after "After 4–6 weeks:". |
| V96 | N3 Table 1 | EXACT | "Progressive resisted quadriceps strengthening (squats" is in the row "Intermediate phase, 6/8–12 weeks". No depth. |
| V97 | N3 Table 1 | EXACT | |
| V98 | N3 Table 1 | EXACT | |
| V99 | S1 Table 1 | EXACT | |
| V100 | S1 Table 1 | EXACT | The longer sentence in the Note is also exact. |
| V101 | S1 Table 1 | EXACT | |
| V102 | P1 page 10 | EXACT | |
| V103 | P1 page 4 | EXACT | The quote is exact. The Note is wrong in one point. "Ankle pumps, quadriceps sets, gluteal sets" and "Straight leg raise (SLR) in multiple planes" stand on page 3, in the Pre-operative Phase. They do not stand in the same section. |
| V104 | P1 page 10 | EXACT | This line is a criterion to leave phase 2. It is not a rule for the start of phase 2. See defect D3. |
| V105 | P1 page 9 | EXACT | The arc 90-40 belongs to phase 2. The line starts with "Follow surgeon preference and patient tolerance". |
| V106 | P1 page 8 | EXACT | Page 6 has the same line without the clause "unless cleared by surgeon". |
| V107 | P1 page 7 | EXACT | The rule is for the leg press. The Note says this. |
| V108 | P1 page 9 | EXACT | P1 does not name a mini squat. I searched the whole text. It names only "Squat progression" in phase 3 and squat tests. |
| V109 | P3 page 4 | EXACT | |
| V110 | P3 page 4 | EXACT | The text reads "e.g., mini squats, leg press, heel raises, step ups". |
| V111 | P2 page 6 | EXACT | |
| V112 | P2 page 7 | EXACT | |
| V113 | P2 page 13 | EXACT | All four quotes are in Appendix 1a. |
| V114 | P2 page 9 | EXACT | This is rec 39, in the phase "Restoring Basic Function". The row does not say the phase. |
| V115 | P2 page 9 | EXACT | |
| V116 | S16 abstract | EXACT | The quote is exact. The Note is not exact. The sentence starts with "When the goal is to minimize patellofemoral compressive force and stress, it may be prudent to use". The Note says the sentence starts with "it may be prudent to use". |
| V117 | P1 page 12 | EXACT | The heading "Phase 3: (Weeks 12-20)" is on page 11. |
| V118 | N3, P3, P1 | PARAPHRASED | This row has no quote. It is a summary. It leaves out two facts. N3 lists squats in weeks 6/8 to 12 (V96). P2 lists double leg squats in the phase "Restoring Basic Function". Label it PARAPHRASED. |

Rows where I disagree with the builder: V118 (label), V103 (Note), V116 (Note), and V104 (use of the quote, see D3). The sources.ts changes for N3 and S16 to EXACT are correct for the quotes that they list. I checked each of these quotes in the source text.

## 3. Does any source recommend a squat in weeks 7 to 11?

I searched P1, P2, P3, S1, N3 and S16. Quotes are exact.

| Source | Window | Quote | Depth |
|---|---|---|---|
| P3 page 4 | Phase 2, "2 weeks to 12 weeks approximately" | "All muscle groups. q uadriceps (concentric & eccentric), calf, gluteal, adductor and hamstring exercises e.g., mini squats, leg press, heel raises, step ups" | None |
| N3 Table 1 | 6/8 to 12 weeks | "Progressive resisted quadriceps strengthening (squats, step‐ups, lateral step downs, leg press, wall slides, blood‐flow restriction training)" | None |
| N3 text | Intermediate phase | "Relevant exercises are step‐up tasks (Figure 2 ), squats and the use of an elliptical trainer." | None |
| P2 Appendix 1b | "Restoring Basic Function Phase" (no weeks) | "Double leg squats" and "Wall squats and leg press beginning at 45 degrees of knee flexion and progressively working into the higher and lower levels of flexion" | Start at 45, then more |
| P2 Table 3 | Same phase | "Demonstrate a double leg squat with proper alignment with minimal visual, tactile or verbal cues" | None |
| P1 page 9 | Phase 2, weeks 7-11 | "Sit to stand starting with elevated seat height" and "Leg press: bilateral with progression to single leg" | Not a squat |
| P1 page 12 | Phase 3, weeks 12-20 | "Squat progression: chair squats to free squats, progress load, depth, foot placement" | None |
| S1 Table 1 | 6-12 weeks | "Progressive lower body exercises per patient tolerance with target RPE in 6-8/10". It names "squat/deadlift" only in weeks 12-16. | None |
| N3 Table 1 | 0-6 weeks | "Mini squats range 0–50° knee flexion" | 0 to 50 |
| S16 abstract | Healthy people | "it may be prudent to use a smaller knee angle range between 0 degrees and 50 degrees" | 0 to 50 |

Plain finding: no source gives a depth for a mini squat in weeks 7 to 11 after MPFL reconstruction. One guideline (P3) names mini squats inside this window, as an example in a list. N3 and P2 name squats in this window, with no mini squat and no depth. P1, the strictest guideline, starts squats at week 12.

Verdict per element:

| Element | Verdict | Reason |
|---|---|---|
| Start at week 7 | WEAK | Only P3 names the mini squat in weeks 2 to 12, as an example, grade OPINION. N3 names squats from week 6/8 with no mini squat. P1 starts free squats at week 12. The sources disagree. |
| Depth ceiling 50 degrees | BORROWED | The 50 is for N3 weeks 0 to 6 and for S16 healthy people. No source gives it for weeks 7 to 11. P2 starts wall squats at 45 degrees and goes deeper later, so the 50 is stricter than P2. That is conservative. It is not sourced. |
| Gate 1, walks without crutches | BORROWED | S1 lists "Walking without crutches" as a milestone to leave the protection phase. It is not a squat gate. |
| Gate 2, leg raise without bend | BORROWED | S1 and P1 use the leg raise without lag as a milestone. P1 uses the active contraction in the leg raise as a gate for the leg press (V107). No source gates a squat. |
| Removal after a knee gave way | WEAK | The rule cites "P2 rec 4, irritability of the knee". Rec 4 lists "Unchanging or increased irritability in the knee". It does not name giving way. "Giving way" appears in P2 only as a history item (rec 8). `redflags.ts` says the giving-way sign is "general practice". The action is protective, so the risk is low. The source is weak. |

User condition "add it ONLY IF the guidelines recommend it": NOT cleanly met. A guideline (P3) and an editorial (N3) list squats in the window. P1 contradicts the start. No guideline gives the depth or the gates. The depth and both gates are the own reading of the builder. The builder wrote this itself in the rule text. A clinician or the user must decide this. The conservative answer is that the condition is not met for the depth and the gates.

## 4. The seated hold

- Arc end 40: P1 page 9 has the exact quote (V105): "Follow surgeon preference and patient tolerance for open chain strengthening in a limited arc of motion (90-40 degrees)". It is in phase 2, weeks 7 to 11. The phase is right. The 40 is an end of an arc for open chain strengthening. P1 does not name a "hold". The word "hold" is a choice of the builder.
- Clearance: P1 page 8, phase 2 precautions, reads "Do not perform AROM open chain KE, unless cleared by surgeon". So P1 allows open chain extension after a surgeon clears it, in weeks 7 to 11. P1 phase 3 (week 12 on) reads "Follow surgeon guidelines regarding open chain knee extension". P2 rec 39 allows it in the phase "Restoring Basic Function" with the Note "initially only from 90°-30°". P2 gives no week. The app uses the more bent end, 40. This is conservative.
- The clearance is a report of the person. The app cannot check it. The rule text says this. This follows the P1 words "unless cleared by surgeon".
- Hold angle 58: it is 40 plus 2 times MARGIN_DEG (9). It is flagged `clinical-review-needed` and graded ENGINEERING. The text says it is not a range for the knee. It passes as an engineering value with no clinical claim. One limit: MARGIN_DEG is a start value, UNVERIFIED for the lite model (`margin.ts`). So 58 is only as good as that margin.
- Gap: the hold does not check `kneeGaveWay`, but the squat does. The hold is also open chain extension. See D4.

## 5. The guardrails skill change

I compared `.claude/skills/mpfl-clinical-guardrails/SKILL.md` with `skill-workspaces/mpfl-clinical-guardrails-workspace/skill-snapshot-v4-base/SKILL.md`. The diff has two parts.

1. A new bullet "Narrow exception (user decision, 2026-11-09)". It lets the generator put a number in a plan when four conditions hold. It names exactly three numbers: dose 2 x 10 (P2), mini squat depth 50 (N3), seated hold arc end 40 (P1).
2. The seated hold bullet now allows a generated hold in phase 2 after the reported clearance.

Is it narrow? Mostly yes. The list of three numbers is closed. Other numbers stay clinician fields. A surgeon number can only lower a value.

Is it consistent? Not fully. Condition 1 says "The number is a quote from a published MPFL source" and that the audit row says EXACT. The 50 is an exact quote for N3 weeks 0 to 6, and S16 is healthy people. The generator applies it to weeks 7 to 11. The quote is exact, but the use is not in the window of the source. So the exception text is met for the quote and not for the use. The old bullet "Every clinical number in a protocol is a field that a clinician sets" now stands next to a bullet that overrides it. This is allowed by the user decision, but the first bullet is now only partly true. The exception does not name the P2 start dose as population "ages 8 to 25". The rule text in `rules.ts` names it.

Does the evidence justify it? No, not fully (`iteration-5/benchmark.md`):
- 4 prompts, one run per cell, Haiku at effort low, graded by reading by the builder. No grader script, no viewer, no user review.
- The prompts were written by the same agent that wrote the change. The benchmark says this itself.
- The 17 prompts of iteration 4 did not run again. A regression check is missing.
- One edit ("exactly three numbers") was not run again.
- The tests ask the skill what it says. They do not test an agent with a task that tempts it to add a fourth number or a squat in week 3.
- The user decision 2026-11-09 is quoted in the skill. I did not find the user message in the repo. I cannot check it.

Missing: a rerun of iteration 4 and prompts written by someone else. Also missing: one adversarial prompt for each exception number, and a test for the use of a number inside the window of its source.

## 6. Code and generated values (`git diff --stat`, `git status --short`)

`git diff --stat`: 45 tracked files changed, 1123 insertions, 127 deletions. `git status --short` also lists untracked `app/e2e/app-pose-worker.spec.ts`, `app/src/lib/technique.ts`, `app/src/pose/frameBridge.ts`, `app/src/pose/poseWorker.ts` and `app/src/ui/HomeExercises.tsx`. The pose files belong to the Worker. I did not review them.

Source id, grade and the line "Not approved by a clinician":
- Every `WhyEntry` is built by `why()`, which always sets `label: NOT_APPROVED`, and copies `sourceIds` and `grade` from the rule. Each new rule (HEEL_P2_UNKNOWN, HOME, ANKLE, ROM_CHECK, PT_VISITS, SQUAT_P2, SQUAT_DEPTH, SQUAT_GATE, HOLD_P2, ENG_HOLD) has `sourceIds` and `grade`. I found no new rule without them.
- Each new exercise `source` string holds `NOT_APPROVED` and a rule id: home exercises (via `doseSource` and the ANKLE line), mini squat, seated hold. I found none without it.
- The ankle pump has no dose. This is stated (DOSE_NONE). The seated hold has no hold time (NONE_HOLDTIME).
- I did not run tests. The rule says no full suites.

Referral cases and red flags: `evaluateRedFlags` runs first and returns R8 on any "yes". The list still has `giving-way`, `swelling`, `catching-locking`, `bend-loss`, `calf` and the emergency items. `evaluateSession` gives R9 for pain or swelling. These cover a knee that gave way, swelling and pain as before. The new `kneeGaveWay` flag is a press on "Knee gave way or hurts" since the plan. It removes the mini squat only when the person updates the plan. It does not refer. It does not remove the seated hold.

Can the squat appear after an answer of "unknown" or "no"? No. In `generate.ts`, `phase2` is true only if week is 7 or more and `phaseClearance === 'yes'`. `squatBuilt` also needs `walksWithoutCrutches === 'yes'`, `legRaiseStraight === 'yes'` and `!kneeGaveWay`. The inputs default to "unknown". `UpdatePlan.tsx` sends "no" for the clearance when the question is not asked. So a missing or "unknown" answer gives no squat. The property test at `protocolGenProperties.test.ts` line 238 also checks this.

## 7. Defects

- D1 (low): V118 has the label EXACT and has no quote. Change it to PARAPHRASED. V103 and V116 have wrong Notes.
- D2 (medium): `SQUAT_DEPTH` and `SQUAT_P2` do not list the P2 start of wall squats "beginning at 45 degrees of knee flexion". The rule shows only the P2 single squat to 60 degrees, which is a goal for a later phase. Condition 3 of the guardrails exception says a disagreeing source shows on the same screen. P2 and P1 are the disagreeing sources. P1 is named in the text.
- D3 (medium): P1 page 9, phase 2, reads "heel slides once KF >120". The rule `HEEL_P2_UNKNOWN` does not ask the person for a knee bend of more than 120 degrees. I found no "120" check in `generate.ts`, `UpdatePlan.tsx` or `onboarding.ts`. The row V104 (">125°, no limits") is the exit criterion of phase 2. It does not support a plan with no ceiling at the start of phase 2. The sources S1 and P3 expect full range in this stage. But the plan then has a heel slide with no ceiling for a person who does not know the limit. The "no limit" answer from the surgeon is a different case. It is safe.
- D4 (medium): The seated hold ignores `kneeGaveWay`. The squat does not ignore it. The hold also does not need the two gates. It needs only the report of clearance.
- D5 (low): The ankle pump rule says P1 names ankle pumps in "the first stage". P1 names them in the Pre-operative Phase and the Acute Care Phase, and P3 names them in weeks 0 to 2. P1 phase 1 (weeks 0-6) names "Ankle PREs", not ankle pumps. Phase 1 in the app is weeks 0 to 6.
- D6 (low): The dose 2 sets of 10 comes from P2, for ages 8 to 25. Note 1 says it applies "for all strengthening exercises for all phases of rehabilitation". The rule says this. A quadriceps set and a gluteal set are isometric. P2 rec 26 covers them by implication. The grade is OPINION.

## 8. Recommendation

| Item | Recommendation | Reason |
|---|---|---|
| Home exercises (quad set, gluteal set, ankle pump, leg raise side and back) | SHIP ON | Each is named in at least two guidelines, in the early phases. Low load. The camera does not count them. Fix the Notes in D5 and V103. |
| Phase 2 heel slide with a surgeon limit or with "no limit" | SHIP ON | Phase 1 rule is unchanged. P3 and S1 support the heel slide. A surgeon number only lowers the ceiling. |
| Phase 2 heel slide with an unknown limit | SHIP OFF BEHIND A FLAG | P1 says "heel slides once KF >120". The app does not check this bend and sets no ceiling (D3). |
| Seated hold after reported clearance | SHIP OFF BEHIND A FLAG | The arc end 40 is exact and in the right phase. The clearance is only a report. P1 gives no "hold". The hold ignores a knee that gave way (D4). The angle 58 uses an UNVERIFIED margin. A clinician must review it first. |
| Mini squat from week 7 with depth 50 | SHIP OFF BEHIND A FLAG, and REMOVE if the user keeps the rule "ONLY IF the guidelines recommend it" | One guideline lists it as an example and P1 starts squats at week 12. No guideline gives the depth or the gates. The user condition is not cleanly met. If the user wants it, a clinician must review the depth and the gates first. |

Limits of this audit: I did not run tests, a server or a browser. I did not read the pose files. I checked the P1, P2 and P3 text through pypdf. A table that pypdf reads in a different order can hide a line. The quotes that I report came from a text match, so the risk is low for those.
