# Answer: no source cites "pause above 12 reps", so I did not write a source comment

I did not add the rule as an app rule. I also did not write a code comment that cites a source. No source in the knowledge base supports the value 12.

## What the knowledge base says

I read `research/INDEX-v2.md` and `research/rehab-rules.md`. The guardrail skill says a clinical rule or value needs a VERIFIED source id with an evidence class. A value with no source is a PROPOSAL.

- Dose, section 3: the only rep numbers are P2 rec 26. It says to start strengthening at "2 sets of 10-15 repetitions", and to progress to 3 sets as tolerated. P2 is a guideline at evidence level 5, mark CONSENSUS (low).
- This is a starting dose, not a ceiling. It gives a range of 10 to 15, not 12. It does not say to stop or pause a session above any rep count. A comment that cites P2 for "pause above 12" would misquote the source.
- Section 4, "Numeric stop threshold during exercise": mark NONE. "No MPFLR source read gives a numeric pain or swelling level that stops an exercise." No source gives a rep-count stop either.
- The only post-operative stop logic in a guideline is "notify the physician" for the P2 red flags (DVT signs, rising irritability, persistent effusion, loss of ROM, catching or locking).
- Section 3 also says there is no source for session frequency or tempo (mark NONE).

## Why this matters for the app

- A surgeon sets the protocol. The app does not decide treatment. A hard-coded cap of 12 would be a clinical value that the app invents.
- The cap would also conflict with P2. A patient who does the P2 starting dose of 15 reps would be paused, and the app would show no reason.
- The skill rule is that every clinical number in a protocol is a field that a clinician sets. The app enforces only protective defaults and referrals.

## What I can do instead

Choose one:

1. Clinician field (recommended). Add an optional protocol field, for example `maxRepsPerSet`, with no default. When the field is empty, the app does not pause. When the surgeon sets it, the app pauses the session at that count. The text says "Your care team set this limit". The code comment states what the field is and cites no source for a number:

   ```ts
   // PROPOSAL: not from the research. No source gives a rep-count stop (rehab-rules.md section 3 and 4, mark NONE).
   // A clinician sets this value. The app has no default.
   ```

2. Keep 12 as a pure app rule. Label it PROPOSAL or UNVERIFIED in the code comment, and say that the owner chose it. Do not cite P2. This needs a decision from the owner and a surgeon review. It stays out of patient use until then (`PATIENT_USE_APPROVED`).

3. Use a source that exists. If you have a source for 12, send it. I will check it and give it a source id, evidence class and population before I write the rule.

Please tell me which option you want. If you choose option 1 or 2, I will write the code and run `bash app/scripts/claims-check.sh app/src`.

I changed no app file. I started no process.
