"""usage: make_tasks.py <iteration_dir> <kind: knowledge|guardrails> <with_skill_path> <other_cfg> <other_skill_path or ''>"""
import json, sys, pathlib
it=pathlib.Path(sys.argv[1]).resolve(); kind=sys.argv[2]; sk=sys.argv[3]; other=sys.argv[4]; osk=sys.argv[5]
REPO="/home/luis/projects/mpfl-rehab-app"
def brief(prompt,outdir,cfg):
    base=f"""You are answering one test prompt for the MPFL rehab app project. The repo is {REPO}. You are read-only: do not edit, create or delete any file except your answer file. Start no server and no process.

"""
    if cfg=="with_skill" or (cfg==other and osk):
        path=sk if cfg=="with_skill" else osk
        base+=f"First read the skill file {path}/SKILL.md and follow it. It points to reference files and to the knowledge base in research/. Read what it tells you to read.\n"
    else:
        base+=f"""Do not use the Skill tool and do not read anything under {REPO}/.claude/ . The project knowledge base is in {REPO}/research/ . You can also read {REPO}/docs/ , {REPO}/MPFL_APP_PLAN.md and {REPO}/app/src . Answer as a careful assistant for this project.\n"""
    base+=f"""
TEST PROMPT (answer it as if a user asked it):
\"\"\"{prompt}\"\"\"

Write your complete answer to {outdir}/answer.md with the Write tool. The file holds only the answer to the prompt. Then reply with the single word: done.
"""
    return base
ev={e["id"]:e for e in json.load(open(sys.argv[6]))["evals"]}
for ed in sorted(it.glob("eval-*")):
    meta=json.load(open(ed/"eval_metadata.json"))
    for cfg in ("with_skill",other):
        run=ed/cfg/"run-1"; (run/"task.md").write_text(brief(meta["prompt"],str(run/"outputs"),cfg))
print("ok")
