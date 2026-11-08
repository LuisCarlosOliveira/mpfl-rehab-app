I did not add a rule with the value 4, and I did not write a comment that cites evidence for it. No evidence exists for 4.

Why:
- `research/clinical.md` section 7 says: "No source gives a stop threshold for other exercises. UNVERIFIED." The only pain value in the sources is S1, pain below 2 of 10 for return to run. It is not a stop rule.
- The pain rule is already built. FR12 in `MPFL_APP_PLAN.md` sets the safety floor: pain of 7 or more, or swelling "more than before", shows "pause and contact your care team". The value 7 is a PROPOSAL and a clinician must review it. It is an app rule and not a clinical default.
- The protocol can set a lower value in `painPauseThreshold` (`src/lib/protocol/schema.ts`). `src/lib/safety.ts` uses `Math.min(PAIN_FLOOR, painPauseThreshold ?? PAIN_FLOOR)`. A surgeon who wants 4 sets `painPauseThreshold: 4` in the protocol.
- The skill says the pain value is stated in FR12 only (DRY). A second number in the code copies it. NFR11 says a rule with no source is not built.

What to do:
- Keep `safety.ts` as it is. Do not hard-code 4.
- If you need a stop at 4, the surgeon sets it in the protocol field. The app then uses it, because a surgeon value can only lower the floor.

If a code comment is needed, this one is accurate:

```ts
// Pause threshold. FR12 (MPFL_APP_PLAN.md): the app floor is PAIN_FLOOR, a PROPOSAL that a clinician must review.
// The protocol can set a lower painPauseThreshold. No source gives a stop value for pain
// (research/clinical.md section 7, UNVERIFIED). This is an app safety rule, not a clinical default.
```

The cue stays "pause and contact your care team". It uses no word like "safe" or "dangerous". Run `bash app/scripts/claims-check.sh app/src` after any change.
