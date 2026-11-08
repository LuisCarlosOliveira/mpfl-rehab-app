No. The generator must not pick the brace duration.

Why:
- The evidence does not support one answer. The plan says sources disagree on brace use and the app "must not pick a side" (MPFL_APP_PLAN.md). The knowledge base calls brace use common but not proven (research/rehab-rules.md). Practice varies: locked brace 54 percent, brace 0 to 6 weeks 63 percent (S10). Weaning is function-based in 46 percent of protocols and time-based in 29 percent. Another source reports "no consensus on postoperative immobilization or weightbearing" (N1).
- The duration depends on the case. Combined surgery such as a tibial tubercle osteotomy often means a locked brace for more than 6 weeks (S10). Brace stop usually follows quadriceps control or a straight leg raise without lag (P3). That is a decision for the surgeon.

What the app does instead (docs/protocol-generator-design.md, G12):
- The surgeon field `brace` is a free text field of up to 200 characters (app/src/lib/protocol/schema.ts). If it is empty, the app shows "Ask your surgeon".
- No generated exercise depends on brace type or duration.
- A brace lock enters only through question I9. The user gives the surgeon's limit for knee bend, "also with a brace". A number of degrees limits the heel slide. If the user does not know, the app does not generate the heel slide before week 6.

So the user or the surgeon enters the brace instruction. The app records and shows it. It does not compute a brace duration or a brace-removal date.
