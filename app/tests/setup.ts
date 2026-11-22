import '../src/zodConfig';
import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { configure } from '@testing-library/react';

// findBy and waitFor wait 1 s by default. A lazy screen can need more when the CPU is shared.
// A wait that never ends still fails: it fails at 10 s instead of 1 s.
configure({ asyncUtilTimeout: 10000 });
