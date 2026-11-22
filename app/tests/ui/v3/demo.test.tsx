import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { hasVerdictWord } from '../verdict';
import { AppDemo, LiveDemo, type DemoData } from './Demo';

afterEach(cleanup);

const DATA: DemoData[] = ['base', 'worst'];
const TABS = ['today', 'progress', 'sessions', 'data'] as const;

describe.each(DATA)('demo, %s data', (data) => {
  it.each(TABS)('app shell, tab %s: one h1, one current tab, one current plan row, the banner', (tab) => {
    const { container } = render(<AppDemo data={data} tab={tab} />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(container.querySelectorAll('nav [aria-current="page"]')).toHaveLength(1);
    expect(container.querySelectorAll('li[aria-current="step"]')).toHaveLength(1);
    expect(screen.getByText('Prototype. Not for patient use.')).toBeInTheDocument();
    expect(container.querySelectorAll('input[type="radio"]').length).toBeGreaterThanOrEqual(9);
    expect(hasVerdictWord(container.textContent ?? '')).toBeNull();
  });

  it('live shell: the name comes first, then the camera, then the numbers and the Stop button', () => {
    const { container } = render(<LiveDemo data={data} />);
    const order = [...container.querySelectorAll('h1, [aria-label="Camera view"], [role="group"], button')].map((e) => e.tagName + (e.getAttribute('aria-label') ?? e.textContent));
    expect(order[0]).toMatch(/^H1/);
    expect(order.findIndex((o) => o.includes('Camera view'))).toBe(1);
    expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Knee gave way or hurts' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).toBeNull();
    expect(hasVerdictWord(container.textContent ?? '')).toBeNull();
  });
});

describe('demo, the worst case', () => {
  it('holds the long German name, the number 128 and 12 plan rows', () => {
    render(<AppDemo data="worst" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Gesäßmuskelanspannung im Liegen');
    expect(screen.getByText('128')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(12);
  });
});
