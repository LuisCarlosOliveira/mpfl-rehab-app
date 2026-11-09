// W2: the position guide as numbered steps with numbered labels in the drawings (U13, U14).
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { guideFor } from '../../src/lib/guides';
import { CameraFigure, GuideFigure } from '../../src/ui/GuideFigure';
import { Setup } from '../../src/ui/Setup';
import { audioHarness, mockSource } from './helpers';

afterEach(cleanup);

const open = (side: 'left' | 'right' = 'left') =>
  render(<Setup kind="heel-slide" side={side} exerciseName="Heel slide" source={mockSource()} sound={audioHarness().sound} onReady={vi.fn()} onCancel={vi.fn()} />);

describe('numbered guide steps (U13)', () => {
  it('numbers the six notes from 1 to 6 and keeps the clinical text of the guide', () => {
    const { container } = open();
    const cards = [...container.querySelectorAll('dl.guide-notes > div')];
    expect(cards.map((c) => c.querySelector('dt .guide-num')?.textContent)).toEqual(['1', '2', '3', '4', '5', '6']);
    const guide = guideFor('heel-slide');
    expect(cards.map((c) => c.querySelector('dd')?.textContent)).toEqual([guide.startPosition, guide.legFacingCamera, guide.handsAndSupport, guide.range, guide.speed, guide.cameraMustSee]);
    cards.forEach((c) => expect([...c.children].map((x) => x.tagName)).toEqual(['DT', 'DD']));
  });

  it('draws numbered labels in the start, end and camera drawings that match the steps', () => {
    const { container } = open();
    const marks = (i: number) => [...container.querySelectorAll('svg.fig')[i]!.querySelectorAll('.fg-mark-text')].map((t) => t.textContent);
    expect(marks(0)).toEqual(['1', '2', '3']);
    expect(marks(1)).toEqual(['4', '5']);
    expect(marks(2)).toEqual(['6']);
    expect(container.querySelectorAll('svg.fig .fg-mark-line').length).toBe(6);
  });

  it('draws no number in a figure that gets no marks (other screens keep their drawing)', () => {
    const { container } = render(<GuideFigure kind="heel-slide" frame="start" side="left" description="d" />);
    expect(container.querySelectorAll('.fg-mark-text')).toHaveLength(0);
    const cam = render(<CameraFigure view="side" kind="heel-slide" description="d" />);
    expect(cam.container.querySelectorAll('.fg-mark-text')).toHaveLength(0);
  });
});

describe('legend of the chosen leg (U14)', () => {
  it('keeps the legend "chosen leg" in every drawing when the other leg is chosen, and the numbers too', () => {
    const { container } = open('left');
    fireEvent.click(screen.getAllByRole('radio', { name: /^Right/ })[0]!);
    const texts = [...container.querySelectorAll('svg.fig')].map((s) => s.textContent);
    texts.forEach((t) => expect(t).toMatch(/chosen leg/i));
    expect(container.querySelectorAll('.fg-mark-text').length).toBe(6);
  });

  it('keeps the legend "Operated leg" when the plan leg is chosen', () => {
    const { container } = open('left');
    [...container.querySelectorAll('svg.fig')].forEach((s) => expect(s.textContent).toContain('Operated leg'));
  });

  it('gives the numbers a name that the screen reader does not repeat: the drawing stays one image', () => {
    const { container } = open();
    container.querySelectorAll('svg.fig').forEach((svg) => expect(svg.getAttribute('role')).toBe('img'));
  });
});

describe('technique lines (text guide)', () => {
  it('shows the lines in a details element that is closed by default, with the sources', () => {
    const { container } = open();
    const details = container.querySelector('details.technique') as HTMLDetailsElement;
    expect(details).not.toBeNull();
    expect(details.open).toBe(false);
    expect(details.querySelector('summary')?.textContent).toMatch(/How the sources describe this exercise/);
    expect(details.textContent).toMatch(/Source: /);
    expect(details.textContent).toMatch(/paraphrase/i);
    expect(details.querySelectorAll('li').length).toBeGreaterThanOrEqual(3);
  });
});
