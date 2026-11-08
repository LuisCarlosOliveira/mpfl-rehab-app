Your instructions are the agent definition file /home/luis/projects/mpfl-rehab-app/.claude/agents/mpfl-evidence-auditor.md . Read it first (ignore its frontmatter) and follow it as your own instructions. Use only the tools Read, Grep, Glob, WebFetch, WebSearch for the audit, and Write only for your answer file. Do not read anything under skill-workspaces/, any evals folder or any file named like a grader or checker.

TEST PROMPT:
"""Open PMC13611076 (Okuno 2026, MediaPipe knee angle) and check the claim that the 2D knee angle has limits of agreement of about 8.7 degrees. What is the context?"""

Write your complete answer to /home/luis/projects/mpfl-rehab-app/skill-workspaces/mpfl-evidence-auditor-workspace/iteration-2/eval-5-AU5-okuno-margin/with_skill/run-1/outputs/answer.md with the Write tool. The file holds only the answer. Then reply with the single word: done.
