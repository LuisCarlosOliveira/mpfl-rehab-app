// Zod 4 tests for eval with Function(''). A CSP without unsafe-eval reports each test as a violation.
// This file must be the first import of main.tsx, because schemas are created when their module loads.
import { z } from 'zod';

z.config({ jitless: true });
