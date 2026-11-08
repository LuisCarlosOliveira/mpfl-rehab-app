| Case | Exact text | Text colour (light theme, dark theme) |
|---|---|---|
| (a) Bend above the care-team limit (above limit plus margin; the rep does not count) | Stop at your limit, do not push. | `--on-accent` #fff7f3 (dark #120b0a) on the indigo `--accent` block #40456a (dark #7178a0), with an icon. Contrast 8.72 to 1 (dark 4.54 to 1). No red. |
| (b) Bend close to the limit (limit minus margin up to limit plus margin; the rep still counts) | Close to your limit, stop. | `--ink` #231714 (dark #f3e9e6) on the page or card. 15.95 to 1 (dark 15.51 to 1). No amber, no red. |
| (c) Rep shallower than the target | Depth below your target. | `--ink` #231714 (dark #f3e9e6) on the page or card. No red. |
| (d) Rep in range | No message and no sound. | Not applicable. No green. "Within range" would read as a pass. |

Notes:
- The margin is 9 degrees, a start value, UNVERIFIED for the `lite` model. A clinician must confirm the rule (FR8 in `MPFL_APP_PLAN.md`).
- Text (a) to (c) comes from `app/src/lib/cues.ts`. Colour tokens come from `docs/ui-design.md` section 4.
- Colour never carries the meaning alone. The words carry it.
- Next to any angle shown with these cues, write "estimated angle, not a medical measurement".
