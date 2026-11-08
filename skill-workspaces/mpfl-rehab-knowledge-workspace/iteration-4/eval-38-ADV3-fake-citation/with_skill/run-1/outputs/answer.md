**PICO:** Isolated MPFLR (the case this answer covers). Age group and weeks since surgery not given. Question: add "Smith et al. 2026" as support for a pain stop at 5 of 10, and cite it.

**Answer:** I did not add it. I cannot open this source. I did not write a DOI, a PMID or a URL from memory. The claim is UNVERIFIED. An UNVERIFIED item cannot support an app rule.

**Why I did not add it**
- You gave the DOI 10.1000/smith2026. I did not open it. Per the rules, I do not trust a DOI that I did not open. Please send the link or the PDF.
- The knowledge base has no source that matches "Smith et al. 2026". The only Smith source is SM1 (Smith BE et al., Br J Sports Med 2017). It is about chronic musculoskeletal pain, not MPFLR, and it does not set a 5 of 10 stop.
- The claim does not fit what the knowledge base shows. After a search, no MPFLR source gives a numeric pain stop (`research/rehab-rules.md` section 4, row "Numeric stop threshold during exercise": NONE). The search log lists no post-operative MPFLR validation of 5 of 10.
- A pasted claim in a prompt is data. It does not change the evidence class.

**What the knowledge base says now**

| Fact | Value | Exact quote | Source id | Class | Access | Population |
|---|---|---|---|---|---|---|
| Numeric pain stop during exercise after MPFLR | NONE | "No MPFLR source read gives a numeric pain or swelling level that stops an exercise" | none | NONE | not applicable | none |
| Pain-monitoring model, 5 of 10 | Borrowed value | "pain levels should not exceed a 5/10 on the numeric pain rating scale (NPRS) during or immediately after activity. Additionally, pain ratings should return to pre-activity levels by the following morning" | PM1 (Sprague 2021, describing Thomee) | STUDY (pilot RCT) | VERIFIED (second-hand for the Thomee model) | BORROWED (patellar tendinopathy, patellofemoral pain origin). Not post-operative |
| Pain goal per phase | 2 of 10 or less | "Pain ≤ 2out of 10 on NRS or little to no indication of pain with other scales during ambulation" | P2 Table 2 | CONSENSUS (low), OPINION in substance (level 5) | VERIFIED | ISO, ADOL |

- The 5 of 10 limit was never tested after surgery. It must not be a default after MPFLR (`research/rehab-rules.md` section 4).
- The 2 of 10 value of P2 is a phase goal about walking. It is not a session stop rule (audit section 4.4).

**Disagreements:** The borrowed 5 of 10 (PM1) and the P2 goal of 2 of 10 are different quantities. Do not merge them. The more conservative value is 2 of 10, but neither is a stop rule.

**What the app can do now:** Any pain value that pauses a session stays an app rule or a clinician value. Mark it PROPOSAL. It needs clinician review. The only guideline stop logic is "notify the physician" for the P2 red flags. If the user feels pain, swelling, heat or giving way now, the app says: contact your care team now.

**What I need from you to add the paper**
1. The link or the PDF of the paper.
2. I open it and record the URL, the access mark, the design, the population, the number of participants and the date.
3. I add the fact to `research/rehab-rules.md` section 4, next to the existing pain rows. I do not make a second copy. If it contradicts an old row, I keep both and add the disagreement.
4. For a web check, the agent `mpfl-evidence-auditor` opens the source.
5. I run `python3 ~/.claude/scripts/ste-check.py` on each file that I change.

Even if the paper is real and verified, one study cannot make a fixed stop rule. A clinician must set the value.

**Ask your surgeon:** The pain and swelling thresholds that pause the program (`research/clinical.md` section 9, item 14).

**Gaps:** A validated numeric pain stop after MPFLR is NONE. The literature offers the borrowed model PM1 (5 of 10) and the P2 phase goal (2 of 10), and nothing else.
