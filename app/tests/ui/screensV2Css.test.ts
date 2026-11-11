// screensV2.css: the detail line of a Load row sits under the row. The hover fill of the row must not cover it (A-08).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/ui/screensV2.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const rule = (selector: string) => new RegExp(`${selector.replace(/[.]/g, '\\.')}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? '';

describe('Load rows', () => {
  it('pulls the detail line up by no amount, so the hover fill of the row never sits under it', () => {
    const margin = /margin:\s*([^;]+);/.exec(rule('.v2-screens .row-detail-out'))?.[1] ?? '';
    const top = margin.trim().split(/\s+(?![^(]*\))/)[0] ?? '';
    expect(top).not.toMatch(/^-|\*\s*-1|-1\s*\*/);
  });

  it('keeps the padding under the title of a row with a detail line small, so the gap stays tight', () => {
    expect(css).toMatch(/\.action-rows > li:has\(\.row-detail-out\) \.action-row\s*\{[^}]*padding-bottom/);
  });
});
