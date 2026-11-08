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
| `dual-camera-opus.md` | Same question (Opus report, with a second opinion) | 18 citations of the Sonnet report not opened, OpenCap Q&A PDF unreadable |
| `ux-flow.md` | User flow, inputs, camera setup check, position guide, screens, 12 decisions | UX evidence is thin, no MPFL patient study |
| `progression.md` | Plan adjustment from session data: evidence, regulation, 5 tiers, data shape, clinician summary | Several sources abstract only |
| `clinical-update.md` | New clinical evidence, 13 protocols, consensus search, existing skills, critique of our skills, top 10 gaps | Delphi full text and UVA protocol not opened |
| `../docs/model.md` | Pose model source, hashes, license text | Model card quotes need a human check |
| `../.claude/skills/mpfl-clinical-guardrails/SKILL.md` | Wording and behavior rules for screens, camera and data | Scanned, 0 findings |

## Evidence legend

- Access: V (full text opened), V-abstract (abstract or record only), V-second-hand (read in another review), UNVERIFIED (not opened).
- Population: MPFLR, MPFLR-COMBINED (with another procedure), BORROWED (another condition or healthy people), OPINION.
- Design and level of evidence: as the source states them. GRADE certainty only for a pooled claim.
- Some older files write V for V (full text). Read them that way.

## How an agent uses it

1. Follow the skill `mpfl-rehab-knowledge` (`.claude/skills/mpfl-rehab-knowledge/SKILL.md`). It holds the method: query, citation, refusal and update rules.
2. Follow the guardrail skill for every word that a patient reads.
3. The read-only agent `mpfl-rehab-knowledge` applies both. The agent type loads in a new session. Until then, a general agent gets a brief that names this index and the agent file.
