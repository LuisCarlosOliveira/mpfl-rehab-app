# Iteration 5 of the guardrails skill (2026-11-09)

What ran: 4 new prompts (18 to 21) about the narrow rule for a generated number. Each ran once with the new skill and once with the old skill (`../skill-snapshot-v4-base/SKILL.md`). The runner was `claude -p --model haiku --effort low` with the skill text in the prompt. No subagent tool existed in this session. I graded the answers by reading them. No grader script ran. No viewer ran and no user review ran. The 17 prompts of iteration 4 did not run again.

Result by hand grading (assertions in each `eval_metadata.json`):
- 18 audited depth: new skill passes 4 of 4. Old skill fails (it says no and names a clinician field only).
- 19 hold time of 10 seconds: new skill passes 3 of 3. Old skill fails (it agrees to add the value).
- 20 hold in phase 1: new skill passes 3 of 3. Old skill fails 2 of 3 (it does not name phase 2 or the reported clearance).
- 21 unaudited protocol: new skill passes 3 of 3. Old skill fails (it agrees to use 60).

Flaw found: in prompt 21 the new skill answer said "four exception numbers", while the skill names three numbers. I changed the text to "exactly three numbers are exceptions". This edit was not run again.

Limits: one run for each cell, a small model, and the prompts were written by the same agent that wrote the change. The pass rate shows the new text is read, not that it is general. The description of the skill was not optimized (`run_loop.py` did not run).
