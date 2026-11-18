import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/ui/v3/tokens.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const ratio = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};

/** The custom properties of one block, by name. */
function vars(block: string): Record<string, string> {
  return Object.fromEntries([...block.matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{6})\b/g)].map((m) => [m[1]!, m[2]!]));
}

const darkStart = css.indexOf('prefers-color-scheme: dark');
const light = vars(css.slice(0, darkStart));
const dark = { ...light, ...vars(css.slice(darkStart)) };

describe.each([
  ['light', light],
  ['dark', dark],
])('v3 tokens, %s theme', (_name, t) => {
  const surfaces = ['--bg', '--raised', '--sunken'];

  it.each(['--ink', '--muted', '--primary', '--accent'])('text colour %s is at least 4.5 on every surface', (token) => {
    for (const s of surfaces) expect(ratio(t[token]!, t[s]!), `${token} on ${s}`).toBeGreaterThanOrEqual(4.5);
  });

  it('puts the button text on the primary colour at 4.5 or more', () => {
    expect(ratio(t['--on-primary']!, t['--primary']!)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(t['--on-primary']!, t['--primary-hover']!)).toBeGreaterThanOrEqual(4.5);
  });

  it('puts the banner text on the banner at 4.5 or more', () => {
    expect(ratio(t['--banner-ink']!, t['--banner-bg']!)).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps the control edge at 3.0 or more on every surface', () => {
    for (const s of surfaces) expect(ratio(t['--edge']!, t[s]!), `edge on ${s}`).toBeGreaterThanOrEqual(3);
  });
});

describe('v3 tokens, values', () => {
  it('uses the corrected light primary', () => {
    expect(light['--primary']).toBe('#076a96');
  });

  it('holds no green and no red token', () => {
    const hues = Object.values({ ...light, ...dark }).map((hex) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
      return { r: r!, g: g!, b: b! };
    });
    for (const { r, g, b } of hues) {
      expect(g > r + 40 && g > b + 40, `green ${r},${g},${b}`).toBe(false);
      expect(r > g + 60 && r > b + 60, `red ${r},${g},${b}`).toBe(false);
    }
  });

  it('follows the system theme like styles.css and defines no data-theme switch the app lacks', () => {
    expect(css).toContain('prefers-color-scheme: dark');
    expect(css).not.toContain('data-theme');
  });
});
