Yes, the generator can use 60 as the open chain arc end, with these limits:

1. Store 60 as a protocol field that the Sanford surgeon sets. Do not put it in code as a default.
2. Label the source as "single-surgeon protocol (Sanford)". It is a clinician value, not an evidence rule, so it has no evidence class.
3. Offer the arc only in the phase that the protocol sets as active. The app must not change the active phase.
4. Show the arc only when the surgeon enables it. If the protocol leaves it unset, show "ask your surgeon".
5. Show the angle with "estimated angle, not a medical measurement".
6. Use neutral words in the screen text. Do not show a goal or pass state when the rep reaches 60.
7. I did not check the knowledge base in `research/` or any source for this value, because I used no tools.
8. After the change, run `bash app/scripts/claims-check.sh app/src` from the repo root.
