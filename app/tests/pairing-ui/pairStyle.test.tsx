// T12b: the two pairing screens use the shared design (cards, .btn, Notice, steps) and the tokens of styles.css.
import { cleanup, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPairing } from '../../src/pairing/pairing';
import { QrCode } from '../../src/pairing/qrCode';
import { PairCompanion } from '../../src/ui/PairCompanion';
import { PairHost } from '../../src/ui/PairHost';
import { makePeer } from './fakeRtc';

afterEach(cleanup);

const pairCss = readFileSync('src/pairing/pair.css', 'utf8');
const qrCss = readFileSync('src/pairing/qr.css', 'utf8');
const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');

describe('pair.css and qr.css', () => {
  it.each([
    ['pair.css', pairCss],
    ['qr.css', qrCss],
  ])('%s has no fixed colour value', (_name, css) => {
    const code = stripComments(css);
    expect(code).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(code).not.toMatch(/\b(rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|hwb)\(/i);
    expect(code).not.toMatch(/\b(red|green|crimson|lime|tomato|orange|yellow|white|black)\b/i);
  });

  it('uses only tokens that styles.css defines', () => {
    const styles = readFileSync('src/ui/styles.css', 'utf8');
    const defined = new Set([...styles.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
    const used = [...stripComments(pairCss + qrCss).matchAll(/var\((--[a-z0-9-]+)/g)].map((m) => m[1]!);
    expect(used.filter((t) => !defined.has(t))).toEqual([]);
  });

  it('keeps the QR code dark on a light frame in both themes, with round corners', () => {
    const code = stripComments(qrCss);
    expect(code).toMatch(/\.qr-frame\s*\{[^}]*color-scheme:\s*light/);
    expect(code).toMatch(/\.qr-frame\s*\{[^}]*border-radius:/);
    expect(code).toMatch(/\.qr-light\s*\{\s*fill:\s*Canvas/);
    expect(code).toMatch(/\.qr-dark\s*\{\s*fill:\s*CanvasText/);
  });

  it('keeps the Stop button of the phone large, and wins over .btn-lg in any file order', () => {
    expect(stripComments(pairCss)).toMatch(/\.btn\.pair-btn-stop\s*\{[^}]*min-height:\s*4\.5rem/);
  });

  it('has no animation and no keyframes', () => {
    expect(pairCss + qrCss).not.toMatch(/@keyframes|animation:|transition:/);
  });
});

describe('the QR frame', () => {
  it('wraps the svg in the frame', () => {
    const { container } = render(<QrCode text="MPFL1.hello" label="Code" />);
    expect(container.querySelector('.qr-frame > svg.qr-svg')).not.toBeNull();
  });
});

describe('PairHost design', () => {
  it('uses .btn buttons, a card, and no inline style or old pair button class', () => {
    const pairing = createPairing({ createPeer: makePeer });
    const { container } = render(<PairHost pairing={pairing} view={pairing.getView()} onDone={vi.fn()} onSkip={vi.fn()} />);
    expect(container.querySelector('.card')).not.toBeNull();
    const buttons = [...container.querySelectorAll('button')];
    expect(buttons.length).toBeGreaterThan(0);
    buttons.forEach((b) => expect(b).toHaveClass('btn'));
    expect(container.querySelector('[style], [class*="pair-btn"], .pair-status, .pair-block')).toBeNull();
    expect(container.querySelector('svg[aria-hidden="true"]')).not.toBeNull(); // an icon in a button
  });

  it('shows a status in a Notice', () => {
    const pairing = createPairing({ createPeer: makePeer });
    const { container } = render(
      <PairHost pairing={pairing} view={{ status: 'connected', offerText: null, message: null }} onDone={vi.fn()} onSkip={vi.fn()} />,
    );
    expect(container.querySelector('.notice[role="status"]')).toHaveTextContent('Connected');
  });

  it('shows the fixed failure text in an alert Notice with a retry button of 48 pixels or more', () => {
    const pairing = createPairing({ createPeer: makePeer });
    render(
      <PairHost
        pairing={pairing}
        view={{ status: 'failed', offerText: null, message: 'Could not pair. The app continues with one camera.' }}
        onDone={vi.fn()}
        onSkip={vi.fn()}
      />,
    );
    expect(screen.getByRole('alert').closest('.notice')).not.toBeNull();
    expect(screen.getByRole('alert')).toHaveTextContent('Could not pair. The app continues with one camera.');
    expect(screen.getByRole('button', { name: 'Try again' })).toHaveClass('btn', 'btn-lg');
  });
});

describe('the code fields (web interface guidelines)', () => {
  it('give every textarea a name, no autocomplete and no spell check, so a pasted code stays as it is', async () => {
    const pairing = createPairing({ createPeer: makePeer });
    const { container } = render(
      <PairHost pairing={pairing} view={{ status: 'offer', offerText: 'MPFL1.abc', message: null }} onDone={vi.fn()} onSkip={vi.fn()} />,
    );
    const boxes = [...container.querySelectorAll('textarea')];
    expect(boxes).toHaveLength(2);
    for (const box of boxes) {
      expect(box.getAttribute('name')).toBeTruthy();
      expect(box.getAttribute('autocomplete')).toBe('off');
      expect(box.getAttribute('spellcheck')).toBe('false');
    }
  });
});

describe('PairCompanion design', () => {
  it('uses a step indicator, a card, .btn buttons and no inline style', () => {
    const { container } = render(<PairCompanion onExit={vi.fn()} />);
    const steps = screen.getByRole('list', { name: 'Pairing steps' });
    expect(steps.querySelector('[aria-current="step"]')).toHaveTextContent('Start');
    expect(container.querySelector('.card')).not.toBeNull();
    container.querySelectorAll('button').forEach((b) => expect(b).toHaveClass('btn'));
    expect(container.querySelector('[style], [class*="pair-btn"]:not(.pair-btn-stop)')).toBeNull();
  });

  it('has exactly one h1', () => {
    render(<PairCompanion onExit={vi.fn()} />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });
});
