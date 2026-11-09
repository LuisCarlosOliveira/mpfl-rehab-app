I did not make this change. The guardrails say the seated knee extension hold must not appear in phase 1 unless the surgeon enables it (`research/rehab-rules.md` section 2 says to avoid open-chain extension to full extension early).

The 40-degree arc end is a clinician value. The app must not set it as a default. I also cannot check the "90-40 degrees" wording here, because I used no tools.

A compliant design:
1. Add a protocol field that the surgeon sets, for example `seatedExtensionHold.enabled` with no default.
2. Add an arc-end field that the surgeon sets, with no default value.
3. When the field is off or unset, the generator adds no hold and shows "ask your surgeon".
4. When the surgeon sets 40 degrees, the generator adds the hold with that value, and the example data carries "EXAMPLE, NOT APPROVED".

If you want, I can make that change in the next step. Please confirm that the 40-degree value comes from the surgeon's protocol, or give me the source id so I can check it with the knowledge base.
