PICO: Surgery type: mixed knee surgery, not MPFL reconstruction. Age group not stated. Weeks since surgery not stated. Question: does N31 show better knee extension with tele-rehab.

## Answer

Do not use N31 as proof of better knee extension with tele-rehab.
The N31 source does not agree with itself on this value (`research/source-audit.md`, correction C12).
N31 is not an MPFL study. Its extension value is BORROWED.

## Facts

| Value | Exact quote | Source id | Class | Access | Population |
|---|---|---|---|---|---|
| Abstract wording: "knee extension range" | The abstract says "knee extension range" (C12). The knowledge base summary gives "knee extension (MD 9.64 degrees)" | N31: Wang Y et al. J Med Internet Res 2025;27:e76844 (`research/clinical-update.md` section 2.3) | REVIEW (meta-analysis, 19 RCTs) | VERIFIED. The audit read the full text (PMC12716415) | BORROWED: knee surgery of mixed types, not MPFLR |
| Results text: "active extension lag", 3 trials | "active extension lag (Figure 13; k=3; MD=9.64 degrees; 95% CI 6.89-12.39; P =.049 ... PI=0.60-18.68)" | N31 full text, via `research/source-audit.md` C12 | REVIEW | VERIFIED | BORROWED |
| KOOS | "Better KOOS (SMD 0.58)" | N31, `research/clinical-update.md` section 2.3 | REVIEW | VERIFIED-ABSTRACT in that file | BORROWED |
| Satisfaction | Tele-rehab "equal to usual care for satisfaction" | N31, same row | REVIEW | VERIFIED-ABSTRACT | BORROWED |

- The abstract calls the value "extension range". The results text calls it "active extension lag". These are two different measures. The source is not consistent with itself.
- The value rests on 3 trials. The prediction interval is wide (0.60 to 18.68). The knowledge base lists the limit "Mixed knee surgery types. Wide prediction intervals".
- N31 is from 2025. It is not older than 5 years.
- Correction C12 wins over the older summary line in `clinical-update.md`. It says: "Do not use it as a benefit of tele-rehab."
- Related source T3 (smart-device tele-rehab after total knee replacement, 22 RCTs): the VAS and WOMAC differences are not significant (`.claude/skills/mpfl-rehab-knowledge/references/digital-rehab.md`). T3 was not rechecked by the audit.

## Disagreements

- N31 abstract: "knee extension range". N31 results text: "active extension lag". The conservative reading is that the benefit is not shown. Show both. Do not average.

## Ask your surgeon

- Whether remote or app-based rehab can be part of your program, and which exercises it can cover. The surgeon sets this.

## Gaps

- Tele-rehab effect on knee extension after MPFL reconstruction: NONE. No trial of tele-rehab or camera feedback after MPFLR exists. The literature gives only mixed-knee-surgery data (N31) and total knee replacement data (T3).
- A proof that an algorithm that adjusts the plan helps: NONE. Phase change stays with the surgeon.
