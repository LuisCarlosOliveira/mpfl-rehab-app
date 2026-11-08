import json,sys,pathlib
# usage: save_timing.py <ws> <iter> <evalprefix e.g. eval-1-> <cfg> tokens ms
ws,it,pre,cfg,tok,ms=sys.argv[1:7]
d=[p for p in (pathlib.Path(ws)/f"iteration-{it}").glob(pre+"*") if p.name.startswith(pre)]
assert len(d)==1,d
r=d[0]/cfg/"run-1"; json.dump({"total_tokens":int(tok),"duration_ms":int(ms),"total_duration_seconds":round(int(ms)/1000,1)},open(r/"timing.json","w"))
