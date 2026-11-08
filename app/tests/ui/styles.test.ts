import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/ui/styles.css', 'utf8');
const rules = css.replace(/\/\*[\s\S]*?\*\//g, '');

function hsl(hex: string): { h: number; s: number; l: number } {
  const full = hex.length === 4 ? `#${[...hex.slice(1)].map((c) => c + c).join('')}` : hex;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(full.slice(i, i + 2), 16) / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  return { h, s, l };
}

function luminance(hex: string): number {
  const full = hex.length === 4 ? `#${[...hex.slice(1)].map((c) => c + c).join('')}` : hex;
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(full.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};

const token = (name: string) => new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,6})`).exec(rules)![1]!;

describe('styles.css rules', () => {
  it('has no mirrored preview', () => {
    expect(rules).not.toMatch(/scaleX\(\s*-1/i);
  });

  it('uses no saturated red or green colour (no verdict colour)', () => {
    const colours = rules.match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g) ?? [];
    expect(colours.length).toBeGreaterThan(5);
    for (const c of colours) {
      const { h, s } = hsl(c);
      const red = h < 25 || h > 335;
      const green = h > 70 && h < 170;
      expect(s < 0.25 || !(red || green), `${c} is a red or green colour`).toBe(true);
    }
    expect(rules).not.toMatch(/\b(red|green|lime|crimson|tomato)\b/i);
    expect(rules).not.toMatch(/\b(rgb|hsl)a?\(/i); // colours stay in the checked hex tokens
  });

  it('keeps nothing moving, and respects reduced motion', () => {
    expect(rules).not.toMatch(/@keyframes/);
    for (const m of rules.matchAll(/(?<![a-z-])animation:\s*([^;!]+)/g)) expect(m[1]!.trim()).toBe('none');
    expect(rules).toMatch(/prefers-reduced-motion:\s*reduce/);
  });

  it('ends every font-family with a generic family', () => {
    const families = [...rules.matchAll(/(?:font-family|--font-[a-z]+):\s*([^;]+);/g)]
      .map((m) => m[1]!.trim())
      .filter((f) => !f.startsWith('var('));
    expect(families.length).toBeGreaterThanOrEqual(2);
    for (const f of families) expect(f, f).toMatch(/(sans-serif|serif|monospace)$/);
  });

  it('gives buttons a touch target of at least 48 px and a visible focus style', () => {
    expect(rules).toMatch(/\.btn\s*\{[^}]*min-height:\s*48px[^}]*min-width:\s*48px/);
    expect(rules).toMatch(/:focus-visible\s*\{[^}]*outline:\s*3px/);
  });

  it('has text contrast of at least 4.5 to 1 on the page and the surface', () => {
    for (const fg of ['ink', 'muted', 'focus']) {
      for (const bg of ['bg', 'surface']) {
        expect(contrast(token(fg), token(bg)), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
      }
    }
    expect(contrast(token('disabled-ink'), token('disabled-bg'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('surface'), token('ink'))).toBeGreaterThanOrEqual(4.5); // primary button text
  });

  it('sets the live angle number at 72 px or more (88 px)', () => {
    const m = /\.readout-number\s*\{[^}]*font-size:\s*([\d.]+)rem/.exec(rules)!;
    expect(Number(m[1]) * 16).toBeGreaterThanOrEqual(72);
  });
});
