import { existsSync, readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

test('the built output holds the headers file and the meta CSP matches it', () => {
  expect(existsSync('dist/_headers')).toBe(true);
  const headers = readFileSync('dist/_headers', 'utf8');
  expect(headers).toBe(readFileSync('public/_headers', 'utf8'));
  for (const name of ['Content-Security-Policy', 'Permissions-Policy', 'Referrer-Policy', 'X-Content-Type-Options']) {
    expect(headers).toContain(`${name}:`);
  }
  expect(existsSync('dist/models/SHA256SUMS')).toBe(true);
  expect(existsSync('dist/models/pose_landmarker_lite.task')).toBe(true);

  const csp = /Content-Security-Policy: (.*)/.exec(headers)![1]!;
  const html = readFileSync('dist/index.html', 'utf8');
  const meta = /http-equiv="Content-Security-Policy" content="([^"]*)"/.exec(html)![1]!;
  // A meta tag cannot carry frame-ancestors. Everything else is equal.
  expect(meta).toBe(csp.replace("; frame-ancestors 'none'", ''));
});

test('the page response carries every header of the policy', async ({ page }) => {
  const res = await page.goto('/index.html');
  const h = res!.headers();
  expect(h['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(h['permissions-policy']).toBe('camera=(self), microphone=()');
  expect(h['referrer-policy']).toBe('no-referrer');
  expect(h['x-content-type-options']).toBe('nosniff');
});
