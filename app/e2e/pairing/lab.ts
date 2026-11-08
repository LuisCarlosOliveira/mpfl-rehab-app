// Test-only page. It gives the browser code of the pairing to the Playwright specs. It is never shipped.
import '../../src/zodConfig'; // the first import, as in main.tsx
import * as pairing from '../../src/lib/pairing';
import { createCompanionLink, createHostLink } from '../../src/pairing/rtcLink';

const w = window as unknown as Record<string, unknown>;
w.lab = { pairing, createCompanionLink, createHostLink };
const violations: string[] = [];
document.addEventListener('securitypolicyviolation', (e) => violations.push(`${e.violatedDirective} ${e.blockedURI}`));
w.__violations = violations;
