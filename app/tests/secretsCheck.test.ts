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

const j = (...parts: string[]) => parts.join('');
const hex32 = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';

// One line per new kind: [kind, fake value built from pieces, line template]. The secret part follows the prefix.
const providerCases: Array<[string, string, string, string]> = [
  ['gitlab-token', j('gl', 'pat-', 'AbCdEfGhIjKlMnOpQrSt1'), 'x = $V', ''],
  ['huggingface-token', j('h', 'f_', 'AbCdEfGhIjKlMnOpQrStUvWxYz0123'), 'x = "$V"', ''],
  [
    'sendgrid-key',
    j('S', 'G.', 'AbCdEfGhIjKlMnOpQrStUv', '.', 'AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-AbCdE'),
    'x = "$V"',
    '',
  ],
  ['google-oauth-secret', j('GOC', 'SPX-', 'AbCdEfGhIjKlMnOpQrStUvWxYz01'), 'x = "$V"', ''],
  [
    'azure-storage-key',
    j('DefaultEndpointsProtocol=https;Account', 'Key=', 'AbCdEfGhIjKlMnOpQrStUvWxYz0123456789+/AbCdEf=='),
    '$V',
    '',
  ],
  ['npm-auth-basic', j('//reg.example.test/:_au', 'th=', 'dXNlcjpwYXNzd29yZDEyMzQ1Njc4'), '$V', ''],
  ['docker-auth', j('"au', 'th": "', 'dXNlcjpwYXNzd29yZDEyMzQ1Njc4', '"'), '{ $V }', ''],
  ['twilio-key', j('S', 'K', hex32), 'x = "$V"', ''],
  ['mailgun-key', j('ke', 'y-', hex32), 'x = "$V"', ''],
  ['digitalocean-token', j('dop', '_v1_', hex32, '0123456789abcdef0123456789abcdef'), 'x = "$V"', ''],
  ['telegram-bot-token', j('1234567890', ':', 'AAEhBOweik6ad9r_QXmN1o3pQ8sT5vW2yZ0'), 'x = "$V"', ''],
  ['pypi-token', j('py', 'pi-AgEIcHlwaS5vcmc', 'AbCdEfGhIjKlMnOpQrStUv1234'), 'x = "$V"', ''],
  ['hex-token', j('api_to', 'ken = ', hex32, '0123abcd'), '$V', ''],
  ['auth-header', j('Authorization: Bear', 'er ', 'Ab3dE6gH9jK2mN5pQ8sT'), '$V', ''],
  ['auth-header', j('Authorization: Bas', 'ic ', 'dXNlcjpwYXNzd29yZA=='), "curl -H '$V'", ''],
  ['generic-secret-unquoted', j('API_', 'KEY=', 'Ab3dE6gH9jK2mN5pQ8'), '$V', ''],
];

describe('secrets-check.sh new kinds', () => {
  it.each(providerCases)('catches %s without printing the value', (kind, value, tpl) => {
    track('src/p.txt', tpl.replace('$V', value) + '\n');
    const r = check();
    expect(r.status).toBe(1);
    expect(r.stdout).toMatch(new RegExp(`^src/p\\.txt:1: ${kind}: `, 'm'));
    expect(r.stdout + r.stderr).not.toContain(value);
    const payload = value.replace(/^.*?[=: ]/, '');
    expect(r.stdout + r.stderr).not.toContain(payload.slice(0, 6));
  });

  it.each([
    ['env file', 'src/a.sh', j('API_', 'KEY=', 'Ab3dE6gH9jK2mN5pQ8')],
    ['Markdown', 'docs/a.md', j('Set `access_to', 'ken: ', 'Ab3dE6gH9jK2mN5pQ8`')],
    ['YAML', 'src/a.yml', j('client_sec', 'ret: ', 'Ab3dE6gH9jK2mN5pQ8')],
    ['spaces', 'src/a.env', j('DB_PASS', 'WORD = ', 'Ab3dE6gH9jK2mN5pQ8')],
  ])('flags an unquoted assignment in %s', (_n, file, text) => {
    track(file, text + '\n');
    const r = check();
    expect(r.status).toBe(1);
    expect(r.stdout).toContain(`${file}:1: generic-secret-unquoted`);
    expect(r.stdout).not.toContain('Ab3dE');
  });

  it.each([
    j('API_', 'KEY=', 'your-api-key-1234567890'),
    j('API_', 'KEY=', 'example1234567890abcd'),
    j('API_', 'KEY=', '$MY_SECRET_VALUE_123456'),
    j('API_', 'KEY=', '${MY_SECRET_VALUE_123456}'),
    j('const to', 'ken = ', 'process.env.APP_TOKEN_VALUE_1;'),
    j('const to', 'ken = ', 'import.meta.env.VITE_TOKEN_VALUE;'),
    j('const to', 'ken = ', 'getAuthTokenFromStorage2();'),
    j('const to', 'ken: ', 'AuthTokenResponseType,'),
    j('API_', 'KEY=', 'abcdefghijklmnopqrstu'),
    j('API_', 'KEY=', '1234567890123456789'),
    j('API_', 'KEY=', 'Ab3dE6gH9j'),
    j('integrity: sha512-Ab3dE6gH9jK2mN5pQ8sT, to', 'ken: ', 'Ab3dE6gH9jK2mN5pQ8sT'),
    j('Authorization: Bear', 'er ', '${accessTokenValue123}'),
    j('Authorization: Bear', 'er ', '<your-token-here-1234>'),
    j('api_to', 'ken = ', hex32, '0123abcd // sha1 of the file'),
  ])('does not flag normal code: %s', (text) => {
    track('src/ok.ts', text + '\n');
    const r = check();
    expect(r.stdout).not.toMatch(/ok\.ts:1/);
    expect(r.status).toBe(0);
  });

  it('accepts the allow marker for a new kind and rejects a bare marker', () => {
    const v = j('API_', 'KEY=', 'Ab3dE6gH9jK2mN5pQ8');
    track('src/m.sh', `${v} # secrets-check:allow test value\n`);
    expect(check().status).toBe(0);
    track('src/m.sh', `${v} # secrets-check:allow\n`);
    expect(check().status).toBe(1);
  });
});
