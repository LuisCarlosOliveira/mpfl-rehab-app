No. P2 is not a strong consensus guideline, and the app must not use it as fixed limits.

What P2 is: Cincinnati Children's Hospital Medical Center, Evidence-Based Care Guideline 46 (January 2015). It covers post-operative care for lateral patellar dislocation and instability, ages 8 to 25. It is an institution guideline with graded evidence, not a society guideline and not a Delphi consensus. The project found no society guideline for post-operative MPFLR rehab (`research/clinical-update.md`).

Why it is weak:
- P2 grades almost all of its own items as evidence level 5 ("LocalConcensus 2014 [5]"). That is the lowest level, local expert opinion. The project labels these items CONSENSUS (low) (`research/rehab-rules.md`).
- The source documents say that most of its content is consensus.
- It is from 2015 and states a 5-year review cycle. No newer version was found, so it is old.
- It excludes realignment surgery, so it does not fit combined procedures such as tibial tubercle osteotomy. Those cases need a surgeon protocol.
- Other sources disagree with it on some values. Examples are hop test LSI (P2 at least 85, S1 at least 90 percent) and the open-chain arc (P2 90 to 30 degrees, P1 90 to 40 degrees).

Where P2 does help:
- It is one of the few readable sources for a rule set. It is also one of only two protocols for young patients (P2 and P4).
- Red flags to notify the physician (rec 4): DVT signs, rising irritability, persistent or recurrent effusion, loss or minimal progress of ROM, catching or locking. This is the only post-operative stop logic in a guideline, and it is consensus level 5.
- Avoid open-chain extension from 30 to 0 degrees in the initial phase (rec 29). P1 agrees, so the protocol generator must not offer the seated extension hold in phase 1 unless the surgeon enables it.
- Targets such as 90 degrees flexion by 4 weeks and 120 degrees by 6 weeks, SLR lag of 10 degrees or less, 2 sets of 10 to 15 repetitions moving to 3 sets, and pain of 2 of 10 or less.

How the app must use it:
- Treat P2 values as cited reference ranges and defaults that a clinician can change. Show the source and the label CONSENSUS (low).
- The surgeon or clinician sets the real limits (flexion targets, depth, weight-bearing). The app does not invent a value.
- The pain goal of 2 of 10 is a phase goal, not a stop rule. A pain value that pauses a session is an app safety rule or a clinician value (`docs/clinical-limits.md`), not an evidence-based default.
- Do not cue on a P2 threshold that is smaller than the pose measurement error. The 10 degree lag sits inside the error, so the app only logs the top angle.
- Do not average P2 with other sources.
