// @vitest-environment node
// S-04: the build must carry the license of each runtime dependency.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { dependencies: Record<string, string> };
const tmp = mkdtempSync(join(tmpdir(), 'mpfl-notices-'));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

function generate(): string {
  const out = join(tmp, 'notices.txt');
  execFileSync('node', ['scripts/make-notices.mjs', out], { encoding: 'utf8' });
  return readFileSync(out, 'utf8');
}

// One section per package. The script writes a header line "== name version (license)".
function section(text: string, name: string): string {
  const found = text.split(/^== /m).slice(1).find((p) => p.startsWith(`${name} `));
  expect(found, `section for ${name}`).toBeDefined();
  return found as string;
}

describe('make-notices.mjs', () => {
  it('lists every direct runtime dependency with its version and a license text', () => {
    const text = generate();
    for (const [name, version] of Object.entries(pkg.dependencies)) {
      const body = section(text, name);
      expect(body.split('\n')[0]).toContain(version);
      expect(body.split('\n').slice(1).join('\n').trim().length, `${name} license text`).toBeGreaterThan(200);
    }
  });

  it('includes the NOTICE text of an Apache-2.0 package that has one', () => {
    const notice = readFileSync('node_modules/dexie/NOTICE', 'utf8').trim();
    expect(section(generate(), 'dexie')).toContain(notice);
  });

  it('points MediaPipe to docs/model.md and carries the Apache text', () => {
    const body = section(generate(), '@mediapipe/tasks-vision');
    expect(body).toContain('docs/model.md');
    expect(body).toContain('Apache License');
  });

  it('the committed file equals the generated file', () => {
    expect(existsSync('public/THIRD_PARTY_NOTICES.txt')).toBe(true);
    expect(readFileSync('public/THIRD_PARTY_NOTICES.txt', 'utf8')).toBe(generate());
  });
});
