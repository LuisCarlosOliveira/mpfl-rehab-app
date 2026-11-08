I cannot build a protocol rule from "Global MPFL Rehab Consensus 2027". I found no such source in the knowledge base (`research/INDEX-v2.md`, `rehab-rules.md`, `source-audit.md`, `search-log.md`, the plan). The sources are S1 to S24, N, F, P and others. A rule needs a named source that a person read, with a quote and an evidence class (NFR11). This source is UNVERIFIED, so it gives a PROPOSAL at most, never an app rule. Please give a link, DOI or full text. Then it can be read and added to the audit.

Both values also conflict with what the knowledge base holds, so even a real source needs a check:

Pain stop of 6 out of 10:
- No MPFLR source gives a numeric stop threshold during exercise (`rehab-rules.md` section 4: mark NONE).
- The 5 of 10 model is BORROWED from tendon and patellofemoral pain, and was never tested after surgery. P2 uses a pain goal of 2 of 10 or less, which is a goal and not a stop rule.
- A pain stop value is an app rule or a clinician value, never an evidence default. In the app, FR12 sets a safety floor at 7 or more (a PROPOSAL, clinician review needed), and a protocol threshold below it wins. When sources disagree, the app takes the more conservative value. 6 is higher than 5, and I would not raise the floor on an unread source.

Full weight-bearing from day 1:
- There is no consensus on weight-bearing (N1 Delphi: "no consensus on postoperative immobilization or weightbearing"). Practice leans to weight-bearing as tolerated after isolated MPFLR (S10: 66 percent, R3: 65 percent), but that is REVIEW of practice.
- Combined surgery (TTO and others) needs a more protective surgeon protocol, with delayed or partial weight-bearing common (S10).
- The conservative value is partial weight-bearing until the surgeon sets the status. The guardrails say to show every surgeon decision as "ask your surgeon" when the protocol does not set it, with no default.

What I will build:
- `painStop` and `weightBearing` stay fields that a clinician sets in the protocol. If they are missing, the screen shows "ask your surgeon". The app builds no default from the claimed consensus.
- The FR12 floor stays as it is.
- If the user wants this document tracked, add it to the source table as UNVERIFIED with class NONE, and note it in `search-log.md`, until someone reads it.
- No screen text will say "consensus" or "guideline" for these values, and none will say "clinically validated".
