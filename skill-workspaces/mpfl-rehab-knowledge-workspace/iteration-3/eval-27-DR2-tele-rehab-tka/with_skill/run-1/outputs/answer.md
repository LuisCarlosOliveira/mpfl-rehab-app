# Does smart-device tele-rehab beat usual care after TKA?

PICO: Total knee arthroplasty (TKA), not MPFL reconstruction. Adults. Time since surgery is not stated, so the answer covers the review as a whole. Question: smart-device tele-rehab against usual care.

Note on scope: this app is about MPFL reconstruction. Every value below is BORROWED (TKA population). It is not an MPFLR result.

## Answer

The knowledge base does not show that smart-device tele-rehab beats usual care after TKA. The one review in the base found no significant difference in pain or WOMAC. Do not write "superior" or "better". The base also has no trial of camera feedback after MPFL reconstruction (NONE).

## Facts

| Value | Exact quote | Source id | Class | Access | Population |
|---|---|---|---|---|---|
| Pain (VAS) difference between smart-device tele-rehab and usual care | "SMD = 0.02, 95% CI: - 0.24 to 0.28" | T3 Zhai 2025, 22 RCTs (`research/form-evidence.md`, section "Feedback itself") | REVIEW | UNVERIFIED for app use. The independent audit (`research/citation-audit.md`, section 2) did not check T3. The quote comes from `form-evidence.md` only | BORROWED (TKA) |
| Function (WOMAC) difference | "SMD = - 0.27, 95% CI: - 0.60 to 0.06" | T3 Zhai 2025 (same section) | REVIEW | UNVERIFIED for app use (same reason) | BORROWED (TKA) |

Reading: both confidence intervals include zero. The VAS effect is about zero. The WOMAC interval ends at 0.06, so it is not significant. This is no proof of benefit. It is also no proof of equal outcome. It shows that the review found no clear difference.

## Related trials and why they do not answer the question

| Item | What it is | Source id | Class | Population |
|---|---|---|---|---|
| Sword Health digital biofeedback after TKA used "inertial motion trackers". Allocation "was performed according to geographical criteria, and not through randomization" | A feasibility study. Not an RCT. Not a camera. It does not support a claim for camera or smart-device tele-rehab (correction C15, `research/source-audit.md`) | T1 Correia 2018 (PMC6062628, read in full by the source audit) | STUDY | BORROWED (TKA) |
| Tele-rehab "equal to usual care for satisfaction", "better KOOS (SMD 0.58)" and "knee extension (MD 9.64 degrees)" | 19 RCTs of mixed knee surgery. The extension value is "active extension lag" in the results text but "extension range" in the abstract. The source is not consistent with itself, and it rests on 3 trials. Correction C12 says: do not use it as a benefit | N31 Wang 2025 (`research/clinical-update.md` section 2.3, C12) | REVIEW | BORROWED (mixed knee surgery, not TKA only) |
| In a Sword trial (chronic low back pain, 140 people), a human therapist "performed adjustments to protocol". Sword sponsored it | Shows that the best-known commercial system kept a human in the loop. Different condition | Cui 2023 (`research/progression.md`) | STUDY | BORROWED (low back pain) |

## Disagreements

The two reviews point different ways. T3 (TKA only) finds no significant difference in VAS or WOMAC. N31 (mixed knee surgery) reports a better KOOS, but with wide prediction intervals and an inconsistent extension result. Conservative reading: no proven benefit. The values are not averaged.

## What this means for the app

- No trial in the base shows that an algorithm that adjusts the plan helps. Phase change stays a surgeon decision.
- No trial in the base shows that live camera cues improve outcome or safety after knee surgery (`form-evidence.md`, "Feedback itself"). A camera cue needs clinician approval and is not an evidence-based treatment.
- T3 is unverified in this pass, so it cannot support an app rule.

## Ask your surgeon

- Whether a tele-rehab program fits your own surgery and recovery plan.
- Which exercises, limits and phases the surgeon wants in any digital program.

## Gaps

- MPFL reconstruction: NONE. No trial of tele-rehab or camera feedback exists in the base. The literature in the base is TKA or other knee surgery.
- T3 full text: not opened in the audit. Number of patients and risk of bias are not in the base.
- Outcome after the review's pooled follow-up time: not in the knowledge base. A new check of T3 is needed (agent `mpfl-evidence-auditor`).
