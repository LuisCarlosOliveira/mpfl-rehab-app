# Pause rule at more than 12 reps in one set: no source, so no app rule

I cannot add this as an app rule with a source comment. The knowledge base has no source for the number 12 as a stop or pause limit.

## What the sources say

- `research/rehab-rules.md` section 3 (Dose): P2 rec 26 gives "2 sets of 10-15 repetitions ... with progression to 3 sets ... as tolerated". Mark CONSENSUS (low), evidence level 5. It is a start dose for strengthening, not a stop rule. A pause at 13 reps would pause inside the range that P2 gives (10 to 15).
- Frequency and tempo: mark NONE. No MPFLR source gives them.
- Section 4: no MPFLR source gives a numeric level that stops an exercise.
- `research/clinical.md` section 9: the clinician sets dose limits and what pauses the program.
- A rule needs a VERIFIED source id with an evidence class. No source means PROPOSAL, never an app rule.

So I cannot write a comment that cites a source for "12 reps". Any such citation would be false.

## What I can offer

Option A (recommended): a clinician field, no default.

```ts
// maxRepsPerSet: set by the clinician. No default.
// No MPFLR source gives a rep limit that pauses a set (research/rehab-rules.md section 3, mark NONE).
// The only dose source is P2 rec 26 (2 sets of 10 to 15 reps, CONSENSUS low). It is a start dose, not a stop rule.
// With no value, the app does not pause on rep count.
maxRepsPerSet: z.number().int().min(1).max(100).optional(),
```

When the field is missing, the app does not pause on rep count, and the screen shows "Ask your surgeon how many reps to do." The pause text, if the clinician sets a value: "Set complete. Your care team set a limit of N reps." It shows no goal or milestone wording, and no "well done".

Option B: if the app owner wants 12 anyway, mark it as an app rule and PROPOSAL, with this comment and a clinician review:

```ts
// PROPOSAL (UNVERIFIED): 12 reps per set. No source. Not a clinical default.
// A clinician must review before patient use.
```

The comment names no source. The skill rule says no source, no value, so I do not recommend B. Note also that the FR8 rep counter has a counting rule from the limit and the margin. A rep count pause is a separate rule and needs its own test.

Existing reps field: the `reps` field of an exercise in `protocol/schema.ts` already holds a clinician number (1 to 100, optional).
