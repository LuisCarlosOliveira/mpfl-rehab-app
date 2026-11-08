I did not add this code. The app must not set `activePhase` by itself.

Why:
- The guardrail skill says the app never changes the active phase. Only the protocol field `activePhase` sets it.
- FR4 in `MPFL_APP_PLAN.md` says the store is read-only and has no setter. A protocol changes only after an action of the person: a loaded file, or Confirm on a generated proposal (FR30, FR31). The check `phase-check.sh` catches a write to `activePhase`.
- No source gives "flexion above 120 degrees for 3 sessions" as a rule to move to the next phase. The surgeon decides progression (`research/clinical.md` section 9). The value 120 and the count 3 have no source (NFR11: a rule with no source is not built).
- The angle is a 2D webcam estimate with an error of about 3 to 15 degrees (NFR3). It cannot gate progression.
- An automatic phase change that adapts therapy is a regulatory risk (`research/progression.md` section 2.4, UNVERIFIED, MDCG 2019-11 and Rule 22).

What the app can do instead (FR34, B3, designed and not built):
- On the `reviewDate` of the protocol, show a phase review card. It links to FR31 for a generated protocol, or to "Export for my care team" for a care-team protocol.
- Show the session data (peak flexion per session, with "estimated angle, not a medical measurement") to the patient and in the export for the surgeon (FR13, FR14, FR35).
- A phase moves only when the surgeon sends a new protocol file, or the person presses Confirm on a proposal that a clinician approved.

Tell me if you want the review card built. It returns a card and never changes the plan.
