# Pause the session after more than 12 reps in one set

I did not add this rule. No source supports a cap of 12 reps, and a source in the knowledge base points the other way.

## Why
- NFR11 in `MPFL_APP_PLAN.md`: a rule with no real named source is not built. The screen shows "ask your surgeon". Every clinical value cites a section of the knowledge base, or is marked PROPOSAL or UNVERIFIED (`research/INDEX.md`).
- `research/rehab-rules.md` section 3 (dose): P2 rec 26 starts strengthening with 2 sets of 10 to 15 reps and progresses to 3 sets. A cap at 12 would stop a patient inside that range. Grade CONSENSUS (low).
- No source gives a rep limit that must pause a session. Rep and set numbers are a surgeon decision. In FR9, the protocol sets `sets` and `reps`. The app has no default for them.
- A cap of 12 would also act as a clinical limit that the user did not get from a care team.

## What the app already does
- The protocol sets `sets` and `reps` (FR9). When a set is complete, the app pauses counting and shows a plain notice. The person presses "Start next set". The count limit comes from the protocol, not from the code.
- If the protocol sets no reps, the app shows "ask your surgeon" and has no limit.

## Code comment, if you need one
Do not write a source for 12. A comment that cites a source for it would be false. Use this comment on a config field instead:

```ts
// repsPerSet comes from the protocol. The app has no default and no cap.
// No source gives a rep limit that pauses a session (research/rehab-rules.md section 3).
// P2 rec 26 uses 2 sets of 10 to 15 reps as a start dose, so a fixed cap of 12 has no support.
```

## If a care team wants a cap
Put it in the protocol file as `repsPerSet`. A clinician must set it. The app then pauses at the set end (FR9). If the user wants a fixed 12 anyway, mark it "PROPOSAL, no source" in the code, mark it ENGINEERING if it only protects the counter, and tell the user a clinician must review it.
