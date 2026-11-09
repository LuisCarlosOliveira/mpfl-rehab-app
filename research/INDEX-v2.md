# Knowledge base index, version 2

Date: 2026-11-08. This index adds the files of the source audit pass. `INDEX.md` stays as it was. Read this file first.

Rules:
- Do not copy a fact from these files into another file. Link to the file and the section (DRY).
- A correction in `source-audit.md` wins over the older file for the same claim.
- For an app rule, start with `rehab-rules.md`. It holds the quoted numbers with their marks.

## Start here (new files of this pass)

| File | Purpose | Status |
|---|---|---|
| `rehab-rules.md` | Rules that the app can encode: phases, ROM, weight-bearing, brace, the four exercises, dose, pain and swelling, progression, return to sport, red flags, special groups, 2D error. Each rule has a quote, a source, a population and a mark (CONSENSUS, REVIEW, STUDY, OPINION, NONE) | Complete for this pass. Most CONSENSUS items are evidence level 5 |
| `form-evidence.md` | Verdict for each live check: CUE, LOG or NO BUILD. The 2D error budget | Complete for this pass |
| `technique-sources.md` | How patient handouts, therapy pages and protocols describe the technique of the four exercises: 34 points with exact quotes, source, population, grade and a camera verdict. Text guide lines that the app can show without judging. Decision for the user | Complete for this pass. All sources are level 5. Several PDFs and pages are listed as NOT READ |
| `source-audit.md` | Check of S1 to S24 and of N, F and P sources against the real records. Corrections C1 to C18 at the top | Complete for this pass. Paywalled full texts are listed |
| `search-log.md` | Every query: database, query, hits, kept or dropped, contradicting evidence, paywalls | Complete for this pass |
| `specialists-brief.md` | Roles, files, output format, refusal rules and 35 test questions for the skill-creator loop | Complete. No skill changed |

## Older files and what supersedes what

| File | Answers | Status after this pass |
|---|---|---|
| `clinical.md` | Phases, exercises, angles, red flags, the 14 surgeon decisions (section 9) | Still valid for section 9 and the S list. Corrections C1 to C11 apply. For rules, `rehab-rules.md` supersedes sections 2, 3, 4 and 7 |
| `clinical-update.md` | 13 protocols, safety data, consensus search, skill critique | Corrections C12, C16, C17, C18 apply. Section 3.2 ("no society guideline") is superseded by C17 (BASK 2021 exists, not read) |
| `progression.md` | Plan adjustment, criteria versus time, digital rehab trials | Valid. Correction C15 applies to the Sword item. Criteria thresholds: `rehab-rules.md` section 5 supersedes the criteria list of section 2.1 |
| `form-opus.md` | Criteria C1 to C15, margin rule, wording, regulation | Valid for the margin rule and the wording. Corrections C13 and C14 apply. `form-evidence.md` supersedes section 3 for the live check verdicts |
| `form.md` | First form report (Sonnet) | Superseded by `form-opus.md` and `form-evidence.md` |
| `tech.md` | Pose model, stack, privacy | Unchanged |
| `apps.md`, `github-features.md` | Apps and repos | Unchanged |
| `dual-camera.md`, `dual-camera-opus.md`, `webrtc-pairing.md`, `qr-pairing.md` | Second camera and pairing | Unchanged |
| `ui-decisions.md`, `ux-flow.md` | UI and flow | Unchanged. The seated hold guide text conflicts with `rehab-rules.md` section 2 (open-chain rule) |
| `../docs/clinical-limits.md` | What the app does not do | Unchanged. Consistent with `rehab-rules.md` section 4 |

## Evidence legend (both versions)

- Access: VERIFIED or V (text read, quote exact), V-abstract, V-second-hand, UNVERIFIED (not opened).
- Population: MPFLR or ISO, MPFLR-COMBINED or COMB, ADOL, BORROWED, OPINION.
- Mark (new): CONSENSUS, REVIEW, STUDY, OPINION, NONE. Definitions in `rehab-rules.md`.

## Key facts for the two design documents

- Protocol generator: no validated protocol and no consensus on weight-bearing or brace (N1). Readable guideline rules: P2 (2015, level 5), P1 (2024), P3 (2022). Combined surgery needs a surgeon protocol. `rehab-rules.md` sections 1 to 3 and 8.
- Live form: only side-view knee angle against a clinician limit, rep time and leg visibility can be patient cues. `form-evidence.md`.
- Protocol generator, version 2 (2026-11-09): what the generator can add without the surgeon, week by week, with a verdict for each value. `../docs/generator-v2-design.md`.
- Plan adjustment: no trial shows that algorithmic adjustment helps. Progression criteria that the app can see are few. `rehab-rules.md` section 5, `progression.md` section 2.2.
