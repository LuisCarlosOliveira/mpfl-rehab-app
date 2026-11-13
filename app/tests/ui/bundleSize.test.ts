// @vitest-environment node
// L4-02: the first load must stay small. This test builds the app in memory (nothing is written) and measures
// the JavaScript that the first screens load: the entry chunk and every chunk that it imports at start.
// Before the split the entry chunk alone had 241 kB gzip (749 kB raw) and Home on a phone scored 92 on Lighthouse.
import { gzipSync } from 'node:zlib';
import { build, type Rolldown } from 'vite';
import { describe, expect, it } from 'vitest';

const FIRST_LOAD_GZIP_LIMIT = 195_000; // measured 187,136 gzip on 2026-11-12 (was 172,736): the plan source notes, the registry of nine exercises and the larger Home. Margin 4 percent.
const ENTRY_RAW_LIMIT = 335_000; // measured 314,359
// Source files that only a later screen needs. None of them may sit in a chunk that the first load fetches.
const LATER_ONLY = ['src/ui/Setup.tsx', 'src/ui/Session.tsx', 'src/ui/Summary.tsx', 'src/ui/Onboarding.tsx', 'src/ui/PlanResult.tsx', 'src/ui/CheckProgress.tsx', 'src/ui/ConfirmPlan.tsx', 'src/ui/UpdatePlan.tsx', 'src/ui/PairCompanion.tsx', 'src/ui/Dashboard.tsx', 'src/ui/DataScreen.tsx', 'src/ui/ClinicianView.tsx', 'src/pose/landmarker.ts', 'node_modules/jsqr/', 'node_modules/recharts/', 'node_modules/@mediapipe/'];

type Chunk = Extract<Rolldown.OutputChunk | Rolldown.OutputAsset, { type: 'chunk' }>;

async function measure() {
  // Vitest sets NODE_ENV to test, and React would then bundle its development build. The size must come from the production build.
  const before = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  const result = await build({ logLevel: 'silent', configFile: 'vite.config.ts', mode: 'production', build: { write: false } }).finally(() => {
    process.env.NODE_ENV = before;
  });
  const output = (Array.isArray(result) ? result[0]! : (result as Rolldown.RolldownOutput)).output;
  const chunks = output.filter((o): o is Chunk => o.type === 'chunk');
  const byName = new Map(chunks.map((c) => [c.fileName, c]));
  const entry = chunks.find((c) => c.isEntry)!;
  const first = new Set<string>();
  const walk = (c: Chunk) => {
    if (first.has(c.fileName)) return;
    first.add(c.fileName);
    for (const name of c.imports) {
      const next = byName.get(name);
      if (next) walk(next);
    }
  };
  walk(entry);
  const firstChunks = [...first].map((n) => byName.get(n)!);
  const gzip = firstChunks.reduce((sum, c) => sum + gzipSync(c.code, { level: 9 }).length, 0);
  return { entry, firstChunks, gzip, chunks };
}

describe('first-load size (L4-02)', () => {
  it('keeps the JavaScript of the first load under the limit and the entry chunk small', async () => {
    const { entry, gzip } = await measure();
    expect(gzip, `first-load JS gzip ${gzip}`).toBeLessThan(FIRST_LOAD_GZIP_LIMIT);
    expect(entry.code.length, `entry chunk raw ${entry.code.length}`).toBeLessThan(ENTRY_RAW_LIMIT);
  }, 120_000);

  it('holds no screen of a later step, no pose code, no chart code and no QR reader in a first-load chunk', async () => {
    const { firstChunks } = await measure();
    const ids = firstChunks.flatMap((c) => Object.keys(c.modules));
    for (const later of LATER_ONLY) {
      expect(ids.filter((id) => id.includes(later)), later).toEqual([]);
    }
  }, 120_000);

  it('keeps the zod setup in the same chunk as zod, so jitless is set before any schema is built', async () => {
    // A split chunk that builds schemas before zodConfig runs makes zod test for eval. The CSP blocks that test,
    // and Lighthouse then counts a CSP issue (Best practices 96, not 100).
    const { chunks } = await measure();
    const zodChunk = chunks.find((c) => Object.keys(c.modules).some((id) => id.includes('node_modules/zod/')))!;
    expect(Object.keys(zodChunk.modules).some((id) => id.endsWith('src/zodConfig.ts'))).toBe(true);
  }, 120_000);

  it('gives each lazy screen its own chunk', async () => {
    const { chunks } = await measure();
    const entries = new Set(chunks.filter((c) => c.isDynamicEntry).map((c) => c.facadeModuleId?.split('/app/')[1]));
    for (const file of ['src/ui/Setup.tsx', 'src/ui/Session.tsx', 'src/ui/Summary.tsx', 'src/ui/Onboarding.tsx', 'src/ui/Dashboard.tsx', 'src/pose/landmarker.ts']) {
      expect(entries.has(file), file).toBe(true);
    }
  }, 120_000);
});
