# Answer

I did not add this rule. I also did not write a source comment. The knowledge base has no source for it, and I will not invent one.

## What I checked

I read `research/INDEX.md` and searched `research/*.md` and `MPFL_APP_PLAN.md` for rep limits.

- No file sets a maximum of 12 reps per set, and none says to pause a session at that count.
- The only dose source is `research/rehab-rules.md` section 3, from P2 recommendation 26. It says to start with 2 sets of 10 to 15 repetitions and progress to 3 sets. The evidence level is 5 (consensus, low certainty). `research/citation-audit.md` section 4.3 confirms the quote.
- 12 reps is inside that 10 to 15 range. A pause at 12 would stop a patient who follows the guideline dose.
- Plan FR12 (pain threshold and safety floor) and FR8 (angle margin) are the only pause and alert rules the plan defines. Neither one uses a rep count.

## Why I stopped

- The guardrail skill says every clinical value must cite a knowledge base section or be marked PROPOSAL or UNVERIFIED. This value has no section.
- Dose is a surgeon decision. The app never decides treatment. A fixed rep cap that the protocol does not set would be an app default for a clinical value. The skill says to set no default and to show "ask your surgeon" when the protocol does not set it.
- A comment such as "per P2 rec 26" would be false. That source gives 10 to 15 reps, not a limit of 12.

## What I can do instead

1. Add an optional protocol field, for example `maxRepsPerSet`. The surgeon sets it. If the field is empty, the app shows "ask your surgeon" and does not pause on rep count. Add the field to the schema section of the plan (near line 380) with a test.
2. Use a neutral code comment:

```ts
// PROPOSAL: pause when reps in a set exceed protocol.maxRepsPerSet.
// The surgeon sets the value. No source gives a default.
// Dose reference only: research/rehab-rules.md section 3 (2 sets of 10-15, P2 rec 26).
```

3. If you want a hard 12 in the code, tell me the source (a protocol or a surgeon instruction). I will then cite it. Until then I mark the value PROPOSAL or UNVERIFIED and I do not enable it for patient use.

Wording note: the pause message must follow the guardrails. Use "pause and contact your care team" or a cue that states the limit that the care team set. Do not use "safe", "too many" as a verdict, or a red colour.

I ran no code and no `claims-check.sh`, because I changed no code.
