Set no weight-bearing default. Leave the field empty and show "Ask your surgeon".

Why:
- The app design says weight-bearing status and crutch use are surgeon decisions. The app sets no default (docs/clinical-limits.md, "Surgeon decisions that the app leaves open"). The generator spec (docs/protocol-generator-design.md, G12) says an absent `weightBearing` shows "Ask your surgeon".
- The evidence gives no rule. A modified Delphi of 60 surgeons (Hurley 2023, N1) found no consensus on immobilization or weight-bearing. No trial compares weight-bearing schedules after isolated MPFLR (research/clinical-update.md).
- Practice leans one way, but this is only a count of protocols. In 35 isolated MPFLR protocols, 66 percent allow immediate weight-bearing as tolerated, 26 percent use partial weight-bearing, and 6 percent use non-weight-bearing or delayed (Vidra 2026, S10). Published protocols range from touchdown to full (for example P4 25 percent with crutches, P7 about half body weight, most others WBAT). A review (S1) says weight-bearing is usually not limited. Rated REVIEW for practice and NONE for consensus (research/rehab-rules.md section 1).
- The exercises in phase 1 do not depend on this field, so the generator loses nothing by leaving it open (G12).

How to apply it:
- The `weightBearing` field in `app/src/lib/protocol/schema.ts` is an optional free-text surgeon field (up to 200 characters). Fill it only with text from the user's surgeon or physiotherapist, shown as their instruction.
- If the user gives no status, the plan says "Ask your surgeon". If you must show a fallback hint, the knowledge base lists partial weight-bearing until the surgeon sets the status. Treat it as a cautious hint, not a rule. Do not state WBAT as the app default, even though it is the most common practice.
- Check scope first. The app plans only for MPFL reconstruction with no other procedure. A concurrent tibial tubercle osteotomy, cartilage procedure or lateral lengthening usually changes weight-bearing (delayed or non-weight-bearing in 56 percent of isolated TTO protocols, S10), so the app must not generate a plan for those cases. Send the user to their care team.
- Also keep brace, ROM limit and phase clearance as "Ask your surgeon" in the same way. Adult status does not change the answer.
