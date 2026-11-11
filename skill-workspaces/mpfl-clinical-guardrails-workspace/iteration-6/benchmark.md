# Iteration 6 benchmark

With skill = reverted skill (v4 text). Baseline = skill-snapshot-v5-pre-revert (old_skill). Graded inline by the main agent against the assertions in each eval_metadata.json. Timing was not captured.

| Eval | with_skill | old_skill |
|---|---|---|
| eval-22-gen-squat-depth-no-clinician-number | 4/4 | 0/4 |
| eval-23-seated-hold-phase1 | 4/4 | 2/4 |
| eval-24-passive-vs-camera | 4/4 | 4/4 |
| Total | 12/12 | 6/12 |

Eval 22 and 23 separate the two versions. Eval 24 passes on both (non-discriminating). Sample size is 1 run for each cell, so this is a direction, not a statistic.
