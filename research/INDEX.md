# Knowledge base index

This folder is the knowledge base of the MPFL rehabilitation app. Every agent reads this index first. Every clinical, flow or screen-text decision cites a section of these files, or it is marked PROPOSAL or UNVERIFIED.

Rule: do not copy a fact from these files into another file. Link to the file and the section (DRY).

| File | Answers | Status |
|---|---|---|
| `clinical.md` | Phases, exercises, joint angles, red flags, contraindications, evidence quality, the 14 surgeon decisions (section 9) | 24 sources, institution protocols UNVERIFIED |
| `form.md` | Which movement faults matter, validated criteria, pose accuracy, regulatory reading (Sonnet report) | 16 UNVERIFIED items |
| `form-opus.md` | Same questions (Opus report), criteria table C1 to C15, margin rule, allowed and banned wording, second opinion on `form.md` | About 20 citations of `form.md` not confirmed |
| `tech.md` | Pose model, stack, rep counting, privacy, WCAG, regulatory notes, alternatives rejected | Versions checked 2026-11-08, 30 UNVERIFIED items |
| `apps.md` | Commercial and open-source rehab apps, licenses, reuse verdicts | Commercial facts are claims |
| `github-features.md` | Reference repos for each feature, license flags, gaps that no repo covers | License read from the API field only |
| `dual-camera.md` | Phone as second camera: value, options, sync, first step (Sonnet report) | Several items UNVERIFIED, see its last section |
| `dual-camera-opus.md` | Same question (Opus report, with a second opinion) | Pending |
| `ux-flow.md` | User flow, inputs, camera setup guidance, position guidance | Pending |
| `../docs/model.md` | Pose model source, hashes, license text | Model card quotes need a human check |
| `../.claude/skills/mpfl-clinical-guardrails/SKILL.md` | Wording and behavior rules for screens, camera and data | Scanned, 0 findings |

## How an agent uses it

1. Read this index. Then read the sections that your task needs.
2. Cite the section next to each clinical value, flow step or screen text. Example: "clinical.md section 2, phase 1".
3. If no section supports the item, mark it PROPOSAL (a design suggestion) or UNVERIFIED. Never present it as evidence.
4. If your work finds a new fact, add it to the matching file and keep the mark VERIFIED or UNVERIFIED. Do not make a second copy.
5. Follow the guardrail skill for every word that a patient reads.
6. A named agent for this knowledge base does not exist. A general agent gets a brief that names this index.
