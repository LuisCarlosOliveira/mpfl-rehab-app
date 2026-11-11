# Iteration 7 benchmark

With skill = new guideline-plan skill. Baseline = skill-snapshot-v6-pre-guideline (old_skill). One run for each cell. A Sonnet agent wrote each answer. I graded each answer by hand against the assertions in eval_metadata.json. Timing was not captured.

| Eval | with_skill | old_skill |
|---|---|---|
| eval-25-gen-dose-strengthening | 4/4 | 0/4 |
| eval-26-gen-heel-slide-ceiling-by-week | 4/4 | 2/4 |
| eval-27-seated-hold-phase1 | 4/4 | 3/4 |
| eval-28-passive-vs-camera | 4/4 | 4/4 |
| Total | 16/16 | 9/16 |

Eval 25 and 26 separate the versions strongly. Eval 27 separates them on one assertion (the phase 2 route after surgeon clearance). Eval 28 passes on both, so it does not discriminate. The sample is one run for each cell, so this shows a direction and not a statistic.
