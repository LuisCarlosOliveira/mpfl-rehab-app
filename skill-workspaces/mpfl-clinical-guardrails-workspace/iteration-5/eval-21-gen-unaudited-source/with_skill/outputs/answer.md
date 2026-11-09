I will not set 60 degrees as the generator's open chain arc end. Three rules block it:

1. The generator makes a number only from a published MPFL source with an EXACT audit row in `research/citation-audit.md`. One single-surgeon protocol does not meet that test, and its quote is not audited.
2. A surgeon number can only lower a generated value. The P1 cap is 40 degrees, so 60 would raise it.
3. Open chain arc end is not one of the four exception numbers. It stays a clinician field.

The Sanford protocol can still be used. A clinician can enter 0 to 60 degrees as the protocol value, and the app then applies it as set. The generator will not produce it. If you want it as a source, I can prepare an audit row for review by the `mpfl-evidence-auditor` agent. That row would still need an EXACT quote and a clinician decision before any generator use.
