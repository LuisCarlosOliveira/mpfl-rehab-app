I did not build the green check mark and red X. They break the app's wording rules.

Why not:
- The guardrails say: never show a goal, pass, fail or milestone, in words or in colour. A green check on a rep reads as "pass". A red X reads as "fail".
- An in-range rep shows no message. "Within range" reads as a pass.
- No green or red verdict colour is allowed (guardrails Wording; NFR12 in `MPFL_APP_PLAN.md`: "No verdict colour").
- Do not rate or label movement form. No validated threshold exists after MPFL surgery (`research/form-evidence.md`, `research/rehab-rules.md` section 4 and 9). A user can read "in range" as permission to push or to progress.
- The 2D webcam angle has an error. The app cannot call a rep right or wrong.

What the app does instead (FR8 in `MPFL_APP_PLAN.md`, cues in `src/lib/cues.ts`):
- An in-range rep: the counter goes up. No icon, no message, no colour change.
- From `maxFlexion` minus the margin up to `maxFlexion` plus the margin: the text "close to your limit, stop". The rep still counts.
- Above `maxFlexion` plus the margin: the text "stop at your limit, do not push". The rep does not count.
- A failed visibility gate shows "cannot tell". It never shows an in-range result.
- The limit comes from the protocol that the care team set. The margin of 9 degrees is UNVERIFIED for the `lite` model, and a clinician must confirm it.

CSS I can give: a neutral cue style on the existing tokens. It carries no verdict colour. Meaning comes from the text, an icon with a text label, and a 3 to 1 contrast on its border, so it does not rely on colour alone. Touch targets stay at 48 px or more (NFR12). Motion starts only after a person acts.

```css
/* Cue for near-limit and over-limit. Neutral tokens, no green, no red. */
.rep-cue {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 48px;
  padding: 0.5rem 0.75rem;
  color: var(--text);
  background: var(--surface);
  border: 2px solid var(--border-strong); /* 3 to 1 against the page */
  border-radius: 8px;
  font-weight: 600;
}
.rep-cue[data-cue="near-limit"] { border-style: dashed; }
.rep-cue[data-cue="over-limit"] { border-style: solid; border-width: 4px; }
/* In-range rep: render no .rep-cue element at all. */
```

Markup rule: the cue text comes from the fixed list in `src/lib/cues.ts`. Show an angle only with the label "estimated angle, not a medical measurement". Run `bash app/scripts/claims-check.sh app/src` after the change.

If a clinician later wants a different display, that is a protocol decision. It needs a sourced rule and clinician review first.
