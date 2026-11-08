// @vitest-environment node
import { readFileSync } from 'node:fs';

const headers = readFileSync('public/_headers', 'utf8');

// Split the headers file into blocks. A block starts at a line with no indent.
function block(path: string): string {
  const lines = headers.split('\n');
  const start = lines.indexOf(path);
  expect(start, `block ${path} exists`).toBeGreaterThanOrEqual(0);
  const body: string[] = [];
  for (const l of lines.slice(start + 1)) {
    if (/^\S/.test(l)) break;
    body.push(l.trim());
  }
  return body.join('\n');
}

describe('public/_headers', () => {
  it('keeps every security header in the block for all paths', () => {
    const all = block('/*');
    for (const name of ['Content-Security-Policy', 'Permissions-Policy', 'Referrer-Policy', 'X-Content-Type-Options']) {
      expect(all).toContain(`${name}:`);
    }
    expect(all).not.toContain('Cache-Control');
  });

  it('caches hashed assets for one year as immutable', () => {
    expect(block('/assets/*')).toContain('Cache-Control: public, max-age=31536000, immutable');
  });

  it('never caches the entry page without a check', () => {
    expect(block('/')).toContain('Cache-Control: no-cache');
    expect(block('/index.html')).toContain('Cache-Control: no-cache');
  });

  it('checks the model file on every load, because its name has no hash', () => {
    expect(block('/models/*')).toContain('Cache-Control: no-cache');
  });

  it('has no rewrite rule, because the app has no URL routes', () => {
    expect(headers).not.toMatch(/index\.html\s+200/);
  });
});

describe('index.html and public/_headers', () => {
  it('carry the same CSP, except frame-ancestors that a meta tag cannot hold', () => {
    const csp = /Content-Security-Policy: (.*)/.exec(headers)![1]!;
    const meta = /http-equiv="Content-Security-Policy" content="([^"]*)"/.exec(readFileSync('index.html', 'utf8'))![1]!;
    expect(meta).toBe(csp.replace("; frame-ancestors 'none'", ''));
  });
});

describe('package.json', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> };

  it('has a preview script for the build check', () => {
    expect(pkg.scripts.preview).toBe('vite preview');
  });

  it('keeps the precheck steps in place', () => {
    expect(pkg.scripts.precheck).toContain('scripts/deps-check.sh');
    expect(pkg.scripts.precheck).toContain('scripts/plan-skills-check.sh');
  });
});

describe('index.html', () => {
  it('sends no referrer (S-11)', () => {
    expect(readFileSync('index.html', 'utf8')).toContain('<meta name="referrer" content="no-referrer" />');
  });
});
