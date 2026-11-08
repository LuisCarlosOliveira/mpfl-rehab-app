# Max knee flexion in weeks 0 to 6

The app must not set one. The surgeon sets this limit (research/clinical.md section 9, item 1). The app shows "ask your surgeon" when the field is empty.

Why no default: the sources disagree. No trial compares ROM limits (clinical.md section 3).
- HSS: 90 degrees by week 4, 120 by week 6 (clinical-update.md, P1).
- Mass General Brigham: 30 at week 1, 60 at week 2, 90 at week 4, 110 at week 6 (P4).
- Stone Clinic: no flexion past 90 for 4 weeks (P11).
- Dartmouth Hitchcock: no limit, 130 by week 4 (P6).

For the week 3 screen:
- Read the limit from the protocol field `maxFlexion` (plan FR2). It is optional and has no default.
- If the field is empty, show "ask your surgeon". Do not show a number.
- If it is set, the app can compare the measured angle with that limit and show the value. It can also say "cannot tell" when landmarks are weak (form-opus.md, C1).

Do not copy a number from the sources above into the screen. They show the range of practice, not a rule.
