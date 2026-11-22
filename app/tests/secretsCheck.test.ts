// @vitest-environment node
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

vi.setConfig({ testTimeout: 60_000 });

const here = dirname(fileURLToPath(import.meta.url));
const script = resolve(here, '../scripts/secrets-check.sh');

let repo: string;
beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), 'mpfl-secrets-test-'));
  execFileSync('git', ['init', '-q'], { cwd: repo });
});
afterEach(() => {
  rmSync(repo, { recursive: true, force: true });
});

// The fake values are built from pieces. This file holds no full secret pattern.
const fakeAws = ['AK', 'IA', 'ABCDEFGH', 'IJKLMNOP'].join('');
const fakeGithub = ['gh', 'p_', 'a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8'].join('');

function track(rel: string, text: string) {
  const file = join(repo, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
  execFileSync('git', ['add', '-f', rel], { cwd: repo });
}

const run = (...args: string[]) => spawnSync('bash', [script, ...args], { encoding: 'utf8' });
const check = () => run('--repo', repo);

describe('secrets-check.sh', () => {
  it('passes its own selftest', () => {
    const r = run('--selftest');
    expect(r.stdout).toContain('secrets-check selftest: OK');
    expect(r.status).toBe(0);
  });

  it('exits 0 on a clean repo', () => {
    track('src/a.ts', 'export const answer = 42; // contact: noreply@example.com');
    const r = check();
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('secrets-check: ok');
  });

  it('exits 1 on a planted AWS key and never prints the value', () => {
    track('src/b.ts', `const k = '${fakeAws}';`);
    const r = check();
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('src/b.ts:1');
    expect(r.stdout).toContain('aws-access-key');
    expect(r.stdout + r.stderr).not.toContain(fakeAws);
    expect(r.stdout).toContain('AKIA****');
  });

  it('never prints a long match, for a GitHub token either', () => {
    track('src/c.ts', `const t = '${fakeGithub}';`);
    const r = check();
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('github-token');
    expect(r.stdout + r.stderr).not.toContain(fakeGithub);
    expect(r.stdout + r.stderr).not.toContain(fakeGithub.slice(0, 10));
  });

  it('exits 1 on a tracked .env file name', () => {
    track('.env', 'A=1');
    const r = check();
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('file-name');
  });

  it('exits 1 on a private IP address and accepts the allow marker with a reason', () => {
    const ip = ['192', '168', '1', '20'].join('.');
    track('src/d.ts', `const h = '${ip}';`);
    expect(check().status).toBe(1);
    track('src/d.ts', `const h = '${ip}'; // secrets-check:allow range test`);
    expect(check().status).toBe(0);
    track('src/d.ts', `const h = '${ip}'; // secrets-check:allow`);
    expect(check().status).toBe(1);
  });

  it('exits 1 on a person e-mail and a local path, and passes the allowed ones', () => {
    track('docs/e.md', 'Write to pw@evil.example or noreply@example.org.');
    expect(check().status).toBe(0);
    track('docs/f.md', ['Mail jane.doe', '@corp.test now.'].join(''));
    expect(check().status).toBe(1);
    track('docs/f.md', ['See /ho', 'me/jane/notes.txt'].join(''));
    expect(check().stdout).toContain('local-path');
    track('docs/f.md', ['see C:\\', 'Users\\jane\\x'].join(''));
    expect(check().stdout).toContain('local-path');
  });

  it('skips package-lock.json and the models folder', () => {
    const ip = ['10', '1', '2', '3'].join('.');
    track('app/package-lock.json', `{"x": "${ip}"}`);
    track('app/public/models/m.js', `var a = "${fakeAws}";`);
    expect(check().status).toBe(0);
  });

  it('exits 2 on a usage error', () => {
    expect(run('--nope').status).toBe(2);
    expect(run('--repo', join(repo, 'missing')).status).toBe(2);
  });
});
