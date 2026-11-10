// flowV2.css of package B: scoped under its own root classes, tokens only, no important, reduced motion safe.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const raw = readFileSync('src/ui/flowV2.css', 'utf8');
const css = raw.replace(/\/\*[\s\S]*?\*\//g, '');
const ROOTS = ['.v2-home', '.v2-redflag', '.v2-seg', '.v2-setup', '.v2-guide', '.v2-summary', '.v2-pain', '.v2-nav', '.v2-flow'];

describe('flowV2.css', () => {
  it('has no !important, no colour of its own, no url and no import', () => {
    expect(css).not.toMatch(/!important/);
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(css).not.toMatch(/url\(|@import|@font-face/);
  });

  it('puts every selector under one of the root classes', () => {
    const selectors = [...css.matchAll(/(?:^|\})\s*([^{}@]+?)\s*\{/g)].flatMap((m) => m[1]!.split(',').map((x) => x.trim()));
    expect(selectors.length).toBeGreaterThan(40);
    for (const s of selectors) expect(ROOTS.some((r) => s.startsWith(r)), s).toBe(true);
  });

  it('uses only tokens that styles.css declares', () => {
    const sheet = readFileSync('src/ui/styles.css', 'utf8');
    const declared = new Set([...sheet.matchAll(/(--[a-z0-9-]+):/g)].map((m) => m[1]));
    for (const m of css.matchAll(/var\((--[a-z0-9-]+)\)/g)) expect(declared.has(m[1]!), m[1]).toBe(true);
  });

  it('starts no animation and no transition (nothing moves unless the person acts)', () => {
    expect(css).not.toMatch(/animation|@keyframes|transition/);
  });

  it('keeps the 48 px floor on the new controls', () => {
    expect(css).toMatch(/\.v2-guide \.guide-dot\s*\{[^}]*min-width:\s*var\(--touch\)[^}]*min-height:\s*var\(--touch\)/);
    expect(css).toMatch(/\.v2-pain \.scale-item\s*\{[^}]*min-height:\s*3\.5rem/);
    expect(css).toMatch(/\.v2-seg \.seg-cell\s*\{[^}]*min-height:\s*3\.5rem/);
  });
});
