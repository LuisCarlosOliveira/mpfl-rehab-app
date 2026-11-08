No. The app does not progress the plan by itself from session data, and the project decided not to build this.

What the app does today
- It counts reps, estimates knee angle (side view, "estimated angle, not a medical measurement"), logs pain and swelling, and shows the trend to the person.
- The active phase comes only from the protocol field `activePhase`. The store is read-only and has no setter (FR4). The app never advances a phase silently.
- During a session, the only automatic changes are safety stops. These are the "knee gave way or hurts" button and a pause at pain 7 or more (or a lower clinician threshold), or swelling "more than before" (FR12). After a safety event the app shows "contact your care team".
- Between sessions, the app can show a phase review card on the review date that a clinician set. It never decides that a phase is complete.

Why it is not built
- Evidence: no source gives a deload amount, a trend window, or a rule to go from 2 to 3 sets after MPFL surgery. Guideline P2 rec 26 leaves a dose change "per clinical judgment". P2 rec 18 asks for functional criteria that a webcam cannot measure (strength, hop, balance).
- Evidence on outcomes: no trial that was reviewed shows that adjusting load from measured data beats a fixed protocol. Digital rehab matches usual care and does not beat it. The best commercial trial (Sword) kept a human therapist making the adjustments.
- Measurement limit: the webcam angle has an error of about 9 degrees in the best case, and 9.3 to 21.9 degrees in exercise video. That is as large as the effects it would have to detect.
- Safety: a false step up can load a healing graft. A false pause only costs a phone call. Automation bias is also a risk.
- Regulation: under EU MDR the app is probably medical device software. MDCG 2019-11 rev.1 gives a higher class (III by its example) when software adapts therapy by itself, and a lower class when a specialist decides. The class is not settled, and an expert must confirm it.

Verdict from `research/progression.md`: automatic adjustment (T4) is not supported and must not be built. The plan lists "automatic progression" as rejected, and the design reconciliation marks "auto 2 to 3 sets" as DO NOT BUILD.

What is allowed or planned
- The clinician writes review criteria and a review date for each phase (FR2). The clinician view shows measured values against those criteria (FR22a). This is a transparency tool and not proof of better outcomes.
- A proposal that a clinician approves (FR22b, T3) is a later pilot only. It needs a clinical study, a regulatory decision and signed protocol files. It is not built.
- A separate, designed but not built path: the protocol generator (FR30, FR31). The person opens "Update my plan", the app proposes a change with reasons and source ids, and the person confirms or keeps the current plan. Nothing changes without that confirmation. This path still needs an expert ruling (plan section 11) and applies only to weeks 0 to 11 after a first, isolated MPFL reconstruction. Referral cases get no plan.

Practical answer: the plan moves forward only when the surgeon or physiotherapist changes it, or when the person confirms a proposal in the designed update flow. Session data is shown to the person and the clinician. It does not change the plan on its own.
