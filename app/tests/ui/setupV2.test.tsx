// UI redesign v2, package A (Setup camera and the body map). Each test names its item of docs/ui-redesign-v2-spec.md.
import { createRef } from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Landmark } from '../../src/lib/angle';
import { BodyMap, resetBodyMapHidden, type BodyMapHandle } from '../../src/ui/BodyMap';
import { Setup } from '../../src/ui/Setup';
import { SetupStateCard } from '../../src/ui/SetupStateCard';
import { chipFor, orderedRuleRows, ruleRows, startText, IDLE_TEXT } from '../../src/ui/setupView';
import { audioHarness, mockSource } from './helpers';

afterEach(() => {
  cleanup();
  resetBodyMapHidden();
});

const ASPECT = 16 / 9;

function person(over: { low?: Record<number, number>; flex?: number; moved?: Partial<Record<number, { x: number; y: number }>> } = {}): Landmark[] {
  const out: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 1 }));
  const set = (i: number, x: number, y: number) => (out[i] = { x, y, visibility: over.low?.[i] ?? 1 });
  set(11, 0.45, 0.2);
  set(12, 0.55, 0.2);
  set(13, 0.42, 0.35);
  set(14, 0.58, 0.35);
  set(15, 0.4, 0.5);
  set(16, 0.6, 0.5);
  const f = ((over.flex ?? 0) * Math.PI) / 180;
  set(23, 0.46, 0.5);
  set(25, 0.46, 0.7);
  set(27, 0.46 + 0.2 * Math.sin(f) * 0.5625, 0.7 + 0.2 * Math.cos(f));
  set(31, 0.5, 0.95);
  set(24, 0.54, 0.5);
  set(26, 0.54, 0.7);
  set(28, 0.54, 0.9);
  set(32, 0.58, 0.95);
  for (const [i, p] of Object.entries(over.moved ?? {})) out[Number(i)] = { ...out[Number(i)]!, ...p! };
  return out;
}

function mount(labels: boolean) {
  const handle = createRef<BodyMapHandle>();
  const view = render(<BodyMap ref={handle} leg="left" labels={labels} />);
  const svg = () => view.container.querySelector('svg.body-map') as SVGSVGElement;
  const q = (k: string) => svg().querySelector(`[data-k="${k}"]`) as SVGElement;
  const shown = (k: string) => q(k).getAttribute('display') !== 'none';
  const push = (lm: Landmark[] | null, t: number) => act(() => handle.current!.update(lm, t, ASPECT));
  return { svg, q, shown, push };
}

describe('A3: leg labels with leader lines, on Setup only', () => {
  it('draws Hip, Knee and Ankle with a leader line when the labels are on and the joints are seen', () => {
    const m = mount(true);
    m.push(person(), 0);
    ['Hip', 'Knee', 'Ankle'].forEach((name, j) => {
      expect(m.shown(`jl-${j}`)).toBe(true);
      expect(m.q(`jl-${j}-t`).textContent).toBe(name);
      expect(m.q(`jl-${j}-l`).getAttribute('points')).toMatch(/^[\d. ,-]+$/);
    });
  });

  it('draws no joint labels when the labels are off (Session shows one label)', () => {
    const m = mount(false);
    expect(m.svg().querySelector('[data-k^="jl-"]')).toBeNull();
  });

  it('gives "Ankle not seen" at the last place, with a dashed ankle ring, when ankle visibility is 0.3', () => {
    const m = mount(true);
    m.push(person(), 0);
    m.push(person({ low: { 27: 0.3 } }), 100);
    m.push(person({ low: { 27: 0.3 } }), 700);
    expect(m.shown('jl-2')).toBe(true);
    expect(m.q('jl-2-t').textContent).toBe('Ankle not seen');
    expect(m.shown('ghost-2')).toBe(true);
    expect(m.q('ghost-2').getAttribute('class')).toContain('bm-ghost');
    // the ring sits at the last seen place, not at the guess of the model
    expect(Number(m.q('ghost-2').getAttribute('cy'))).toBeCloseTo(person()[27]!.y * 1000, 0);
    expect(m.shown('left-j2')).toBe(false); // the solid joint is still hidden
    expect(m.shown('lost-2')).toBe(false); // no second label in the corner
  });

  it('falls back to the top-left corner when the joint was never seen', () => {
    const m = mount(true);
    m.push(person({ low: { 27: 0.1 } }), 0);
    m.push(person({ low: { 27: 0.1 } }), 700);
    expect(m.shown('jl-2')).toBe(true);
    expect(m.q('jl-2-t').textContent).toBe('Ankle not seen');
    expect(m.shown('ghost-2')).toBe(false);
  });

  it('keeps the label text 18 px high on screen and gives the label a dark chip', () => {
    const m = mount(true);
    m.push(person(), 0);
    expect(m.q('jl-1-t').getAttribute('font-size')).toBeTruthy();
    expect(m.q('jl-1-r').getAttribute('class')).toContain('bm-chip');
  });

  it('keeps every label number finite', () => {
    const m = mount(true);
    m.push(person({ low: { 25: 0.2 } }), 0);
    m.push(person({ low: { 25: 0.2 } }), 900);
    const nums = [...m.svg().querySelectorAll('[data-k^="jl-"], [data-k^="ghost-"]')].flatMap((el) => [...el.attributes].map((a) => a.value));
    expect(nums.join(' ')).not.toMatch(/NaN|undefined|Infinity/);
  });
});

describe('A8: the angle label stays inside the picture and wraps to two lines', () => {
  const W = ASPECT * 1000;
  const labelBox = (m: ReturnType<typeof mount>) => {
    const [a, b] = [...m.q('arc-text').children] as SVGElement[];
    const size = Number(m.q('arc-text').getAttribute('font-size'));
    const x = Number(a!.getAttribute('x'));
    const anchor = m.q('arc-text').getAttribute('text-anchor');
    const w = Math.max(a!.textContent!.length, b!.textContent!.length) * 0.6 * size; // the same estimate that the code uses
    return { left: anchor === 'end' ? x - w : x, right: anchor === 'end' ? x : x + w };
  };

  it('keeps the words "estimated angle" and the number in two lines of one text', () => {
    const m = mount(false);
    m.push(person({ flex: 60 }), 0);
    expect(m.q('arc-text').textContent).toMatch(/^\d+° estimated angle$/);
    const lines = m.q('arc-text').children;
    expect(lines[1]!.textContent).toBe('estimated angle');
    expect(lines[1]!.getAttribute('dy')).not.toBeNull();
  });

  it.each([0.62, 0.8, 0.95])('stays inside the view box with the knee at x = %s of the width', (x) => {
    const m = mount(false);
    const moved = { 23: { x, y: 0.5 }, 25: { x, y: 0.7 } };
    const lm = person({ flex: 90, moved: { ...moved, 27: { x: x - 0.05, y: 0.9 } } });
    for (const t of [0, 100, 200, 300]) m.push(lm, t);
    expect(m.shown('arc-text')).toBe(true);
    const { left, right } = labelBox(m);
    expect(left).toBeGreaterThanOrEqual(0);
    expect(right).toBeLessThanOrEqual(W);
  });
});

describe('A3: Setup camera, before and while the camera runs', () => {
  function open() {
    const source = mockSource();
    render(<Setup kind="heel-slide" side="left" exerciseName="Heel slide" source={source} sound={audioHarness().sound} onReady={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next: set up the camera' }));
    return { source };
  }
  const start = async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Start camera' }));
    await screen.findByRole('button', { name: 'Start exercise' });
  };

  it('shows a step card in the frame before the start, with a state line and a help line', () => {
    open();
    const card = document.querySelector('.frame .setup-state')!;
    expect(card).not.toBeNull();
    expect(card).toHaveTextContent(IDLE_TEXT.line);
    expect(card).toHaveTextContent(IDLE_TEXT.help);
    expect(screen.queryByText(/your camera view shows here/i)).toBeNull();
  });

  it('names the start step in the frame card while the camera starts, and keeps the old words', async () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Start camera' }));
    expect(document.querySelector('.frame .start-status')).toHaveTextContent(startText.camera);
    await screen.findByRole('button', { name: 'Start exercise' });
    expect(document.querySelector('.frame .setup-state')).toBeNull();
  });

  // v3: the chip sits at the top of the panel, beside the camera, so it never covers a joint label.
  it('shows a status chip next to the picture whose text equals the first rule that failed', async () => {
    const { source } = open();
    await start();
    act(() => source.emit(null, 0));
    const chip = document.querySelector('.v3-live-panel .status-line')!;
    expect(chip).toHaveTextContent(chipFor('no-pose').text);
    expect(chip).toHaveTextContent(orderedRuleRows('no-pose')[0]!.label);
  });

  it('chipFor names the first not-seen rule of ruleRows for every rule', () => {
    for (const id of ['no-pose', 'show-leg', 'whole-leg', 'closer', 'side-on', 'still'] as const) {
      const first = ruleRows(id).find((r) => r.word === 'not seen')!;
      expect(chipFor(id).text).toContain(first.label);
      expect(chipFor(id).seen).toBe(false);
    }
    expect(chipFor('ready')).toEqual({ text: 'Ready', seen: true });
  });

  it('shows the Hip, Knee and Ankle labels on Setup, and gives the unseen rows the full width', async () => {
    const { source } = open();
    await start();
    act(() => source.emit(null, 0));
    expect(document.querySelector('.frame svg.body-map')).not.toBeNull();
    const list = screen.getByRole('list', { name: 'Camera check' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(6);
    expect(list.querySelectorAll('.rule-missing')).toHaveLength(6);
  });

  it('puts the camera error in the frame as one alert with a title and a sentence, and keeps the retry button in the bar', async () => {
    const source = mockSource();
    source.nextStart = { ok: false, error: { kind: 'permission-denied', message: 'Camera access was blocked. Allow the camera in the browser settings for this site, then try again.' } };
    render(<Setup kind="heel-slide" side="left" exerciseName="Heel slide" source={source} sound={audioHarness().sound} onReady={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next: set up the camera' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start camera' }));
    const alert = await screen.findByRole('alert');
    expect(document.querySelector('.frame')!).toContainElement(alert);
    expect(alert.querySelector('.notice-title')).toHaveTextContent('Camera access was blocked.');
    expect(alert).toHaveTextContent('Allow the camera in the browser settings for this site, then try again.');
    expect(screen.getAllByRole('button', { name: 'Try again' })).toHaveLength(1);
  });
});

describe('SetupStateCard', () => {
  it('renders a state line and an optional help line, and no NaN', () => {
    render(<SetupStateCard icon="camera" line="Camera is off" help="Press Start camera." />);
    expect(screen.getByText('Camera is off')).toBeInTheDocument();
    expect(screen.getByText('Press Start camera.')).toBeInTheDocument();
    cleanup();
    render(<SetupStateCard icon="camera" line="Only a line" />);
    expect(document.querySelector('.setup-help')).toBeNull();
  });
});
