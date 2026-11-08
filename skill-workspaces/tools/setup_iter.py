"""usage: setup_iter.py <workspace> <iter> <evals.json> <cfgA> <cfgB>"""
import json, sys, pathlib
ws,itn,ev,a,b=sys.argv[1:6]
it=pathlib.Path(ws)/f"iteration-{itn}"
for e in json.load(open(ev))["evals"]:
    d=it/f"eval-{e['id']}-{e['name']}"
    for cfg in (a,b): (d/cfg/"run-1"/"outputs").mkdir(parents=True,exist_ok=True)
    json.dump({"eval_id":e["id"],"eval_name":e["name"],"prompt":e["prompt"],"assertions":e["assertions"]},open(d/"eval_metadata.json","w"),indent=1)
print(it)
