"""Mechanical grader. usage: grade.py <iteration_dir> <evals.json>"""
import json, re, sys, pathlib
it=pathlib.Path(sys.argv[1]); evals={e["id"]:e for e in json.load(open(sys.argv[2]))["evals"]}
def grade(check, text):
    f=re.I|re.S|re.M if False else re.I|re.M
    ev=[]; ok=True
    for p in check.get("all",[]):
        m=re.search(p,text,f)
        if not m: ok=False; ev.append(f"missing /{p}/")
        else: ev.append(f"found '{m.group(0)[:50]}'")
    if check.get("any"):
        ms=[re.search(p,text,f) for p in check["any"]]; ms=[m for m in ms if m]
        if ms: ev.append(f"found '{ms[0].group(0)[:50]}'")
        else: ok=False; ev.append("none of any-patterns found")
    for p in check.get("none",[]):
        m=re.search(p,text,f)
        if m: ok=False; ev.append(f"forbidden '{m.group(0)[:60]}'")
    for p1,p2,w in check.get("near",[]):
        for m in re.finditer(p1,text,f):
            ctx=text[max(0,m.start()-w):m.end()+w]
            if not re.search(p2,ctx,f): ok=False; ev.append(f"'{m.group(0)}' without /{p2}/ nearby")
    if "maxlen" in check:
        n=len(text.strip())
        if n>check["maxlen"]: ok=False; ev.append(f"length {n} > {check['maxlen']}")
        else: ev.append(f"length {n}")
    return ok,"; ".join(ev) or "ok"
for ed in sorted(it.glob("eval-*")):
    meta=json.load(open(ed/"eval_metadata.json")); e=evals[meta["eval_id"]]
    for cfg in ed.iterdir():
        if not cfg.is_dir(): continue
        for run in cfg.glob("run-*"):
            ans=run/"outputs"/"answer.md"
            text=ans.read_text() if ans.exists() else ""
            exp=[]
            for ch in e["checks"]:
                if not text: ok,evd=False,"no answer file"
                else: ok,evd=grade(ch,text)
                exp.append({"text":ch["text"],"passed":ok,"evidence":evd})
            p=sum(x["passed"] for x in exp)
            out={"expectations":exp,"summary":{"passed":p,"failed":len(exp)-p,"total":len(exp),"pass_rate":round(p/len(exp),3)}}
            t=run/"timing.json"
            if t.exists(): out["timing"]=json.load(open(t))
            json.dump(out,open(run/"grading.json","w"),indent=1)
