// W2: the body map. An SVG layer drawn from landmark numbers. It never holds a frame and it has no score.
import { readFileSync } from 'node:fs';
import { createRef, Profiler } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Landmark, Side } from '../../src/lib/angle';
import { BodyMap, BodyMapSwitch, PREVIEW_MIRRORED, mirrorClass, resetBodyMapHidden, type BodyMapHandle } from '../../src/ui/BodyMap';
import { Setup } from '../../src/ui/Setup';
import { audioHarness, mockSource } from './helpers';

afterEach(() => {
  cleanup();
  resetBodyMapHidden();
});

const ASPECT = 16 / 9;

/** A whole person, standing. Each leg is [hip, knee, ankle, foot] with an x. `flex` bends the left knee in degrees. */
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

function mount(leg: Side = 'left', mirrored = false) {
  const handle = createRef<BodyMapHandle>();
  const view = render(<BodyMap ref={handle} leg={leg} mirrored={mirrored} />);
  const svg = () => view.container.querySelector('svg.body-map') as SVGSVGElement;
  const q = (k: string) => svg().querySelector(`[data-k="${k}"]`) as SVGElement;
  const shown = (k: string) => q(k).getAttribute('display') !== 'none';
  const push = (lm: Landmark[] | null, t: number, aspect = ASPECT) => act(() => handle.current!.update(lm, t, aspect));
  return { ...view, handle, svg, q, shown, push };
}

describe('BodyMap drawing', () => {
  it('is an svg layer that hides from assistive technology, with no canvas, no image and no style attribute', () => {
    const { container, svg } = mount();
    expect(svg().getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('canvas, image, foreignObject, video')).toBeNull();
    expect(container.querySelectorAll('[style]')).toHaveLength(0);
  });

  it('draws nothing when no pose is found', () => {
    const m = mount();
    m.push(null, 0);
    // The two lines inside a bone group never carry display. The group carries it.
    expect([...m.svg().querySelectorAll('[data-k]:not([display="none"])')].filter((el) => !/-[hc]$/.test(el.getAttribute('data-k')!))).toHaveLength(0);
  });

  it('follows the person: the knee circle sits on the landmark number in view box units', () => {
    const m = mount('left');
    const lm = person();
    m.push(lm, 0);
    const knee = m.q('left-j1');
    expect(Number(knee.getAttribute('cx'))).toBeCloseTo(lm[25]!.x * ASPECT * 1000, 0);
    expect(Number(knee.getAttribute('cy'))).toBeCloseTo(lm[25]!.y * 1000, 0);
    expect(m.svg().getAttribute('viewBox')).toBe(`0 0 ${Math.round(ASPECT * 10000) / 10} 1000`);
    // A jump waits 100 ms (the spike filter, HOLD_MS). A move that holds is drawn at the first update after that.
    for (const t of [100, 200, 300]) m.push(person({ moved: { 25: { x: 0.3, y: 0.6 } } }), t);
    expect(Number(knee.getAttribute('cx'))).toBeCloseTo(0.3 * ASPECT * 1000, 0);
  });

  it('draws the bones again after a frame with no pose (the line elements are not left hidden)', () => {
    const m = mount('left');
    m.push(person(), 0);
    m.push(null, 100);
    expect(m.shown('left-0')).toBe(false);
    m.push(person(), 200);
    expect(m.shown('left-0')).toBe(true);
    for (const k of ['left-0-h', 'left-0-c', 'left-1-h', 'left-1-c', 'right-0-c']) expect(m.q(k).getAttribute('display'), k).not.toBe('none');
  });

  it('draws the chosen leg and the other leg with different style classes, and swaps them with the choice', () => {
    const m = mount('left');
    m.push(person(), 0);
    expect(m.q('left-0').classList.contains('bm-chosen')).toBe(true);
    expect(m.q('right-0').classList.contains('bm-other')).toBe(true);
    expect(m.q('right-0').classList.contains('bm-chosen')).toBe(false);
    m.rerender(<BodyMap ref={m.handle} leg="right" />);
    m.push(person(), 100);
    expect(m.q('right-0').classList.contains('bm-chosen')).toBe(true);
    expect(m.q('left-0').classList.contains('bm-other')).toBe(true);
  });

  it('draws the chosen leg with a dark outline under the core line', () => {
    const m = mount('left');
    const halo = m.q('left-0-h');
    const core = m.q('left-0-c');
    expect(halo.getAttribute('class')).toContain('bm-halo');
    expect(core.getAttribute('class')).toContain('bm-core');
    expect(halo.compareDocumentPosition(core) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('draws the whole body softly: shoulders, trunk and arms', () => {
    const m = mount();
    m.push(person(), 0);
    for (const k of ['soft-11-12', 'soft-11-23', 'soft-12-24', 'soft-23-24', 'soft-11-13', 'soft-13-15', 'soft-12-14', 'soft-14-16']) expect(m.shown(k)).toBe(true);
    expect(m.q('soft-11-12').getAttribute('class')).toContain('bm-soft-line');
  });

  it('draws an arc at the chosen knee with the live angle and the words "estimated angle"', () => {
    const m = mount('left');
    m.push(person({ flex: 60 }), 0);
    expect(m.shown('arc-core')).toBe(true);
    expect(m.q('arc-text').textContent).toMatch(/^\d+° estimated angle$/);
    const bent = Number(/^(\d+)°/.exec(m.q('arc-text').textContent!)![1]);
    expect(bent).toBeGreaterThan(40);
    expect(bent).toBeLessThan(70);
    m.push(person({ flex: 0 }), 100);
    m.push(person({ flex: 0 }), 200); // the jump of the ankle holds, so the update 100 ms later draws it
    m.push(person({ flex: 0 }), 300);
    expect(m.shown('arc-core')).toBe(false);
  });

  it('never changes class, fill or stroke with the angle (no verdict colour)', () => {
    const m = mount('left');
    const snap = () => ['arc-core', 'arc-halo', 'left-j1', 'left-0-c', 'left-1-c', 'arc-text'].map((k) => `${m.q(k).getAttribute('class')}|${m.q(k).getAttribute('fill')}|${m.q(k).getAttribute('stroke')}`);
    m.push(person({ flex: 10 }), 0);
    const low = snap();
    m.push(person({ flex: 80 }), 100);
    expect(snap()).toEqual(low);
    m.push(person({ flex: 130 }), 200);
    expect(snap()).toEqual(low);
  });
});

describe('BodyMap lost joint (U2)', () => {
  it('shows a label after the joint was low for 500 ms, and draws no ring and no line at the guess of the model', () => {
    const m = mount('left');
    m.push(person({ low: { 27: 0.2 } }), 0);
    expect(m.shown('lost-2')).toBe(false); // the first low frame does not show it
    m.push(person({ low: { 27: 0.2 } }), 400);
    expect(m.shown('lost-2')).toBe(false);
    m.push(person({ low: { 27: 0.2 } }), 600);
    expect(m.shown('lost-2')).toBe(true);
    expect(m.q('lost-2').textContent).toBe('Ankle not seen');
    expect(m.svg().querySelector('.bm-lost-ring, .bm-leader, circle[stroke-dasharray]')).toBeNull();
    expect(m.shown('left-j2')).toBe(false); // no joint circle at the wrong place
    expect(m.shown('left-1')).toBe(false); // the bone to the lost joint is hidden
    expect(m.shown('left-0')).toBe(true); // the other bones stay
    expect(m.shown('arc-core')).toBe(false); // no angle without the three joints
  });

  it('puts the label in the top corner, not at the place of the joint', () => {
    const m = mount('left');
    m.push(person({ low: { 27: 0.1 }, moved: { 27: { x: 0.9, y: 0.8 } } }), 0);
    m.push(person({ low: { 27: 0.1 }, moved: { 27: { x: 0.9, y: 0.8 } } }), 900);
    const label = m.q('lost-2');
    expect(Number(label.getAttribute('x'))).toBeLessThan(100);
    expect(Number(label.getAttribute('y'))).toBeLessThan(150);
  });

  it('stacks two labels so they do not overlap', () => {
    const m = mount('left');
    const lm = person({ low: { 25: 0.1, 27: 0.1 } });
    m.push(lm, 0);
    m.push(lm, 900);
    expect(Number(m.q('lost-2').getAttribute('y'))).toBeGreaterThan(Number(m.q('lost-1').getAttribute('y')));
  });

  it('uses the same joint names as the setup rules, and the same gate (0.5 is seen)', () => {
    const m = mount('left');
    for (const [id, name, k] of [[23, 'Hip not seen', 'lost-0'], [25, 'Knee not seen', 'lost-1']] as const) {
      m.push(person({ low: { [id]: 0.49 } }), 0);
      m.push(person({ low: { [id]: 0.49 } }), 700);
      expect(m.q(k).textContent).toBe(name);
      expect(m.shown(k)).toBe(true);
      m.push(person({ low: { [id]: 0.5 } }), 800);
      expect(m.shown(k)).toBe(false);
    }
  });

  it('removes the label at once when the joint is seen again, and does not blink on a short dip', () => {
    const m = mount('left');
    m.push(person({ low: { 27: 0.1 } }), 0);
    m.push(person(), 200);
    m.push(person({ low: { 27: 0.1 } }), 300);
    m.push(person({ low: { 27: 0.1 } }), 700); // only 400 ms since the dip began again
    expect(m.shown('lost-2')).toBe(false);
  });

  it('puts a label only for the chosen leg: a lost joint of the other leg only hides its bone', () => {
    const m = mount('left');
    m.push(person({ low: { 28: 0.1 } }), 0);
    m.push(person({ low: { 28: 0.1 } }), 900);
    expect(m.shown('right-1')).toBe(false);
    expect([0, 1, 2].every((j) => !m.shown(`lost-${j}`))).toBe(true);
  });
});

describe('BodyMap does not use React state for each frame', () => {
  it('commits one time for the mount and none for 200 frames', () => {
    const handle = createRef<BodyMapHandle>();
    const onRender = vi.fn();
    render(
      <Profiler id="map" onRender={onRender}>
        <BodyMap ref={handle} leg="left" />
      </Profiler>,
    );
    const mounted = onRender.mock.calls.length;
    for (let i = 0; i < 200; i++) act(() => handle.current!.update(person({ flex: i % 90 }), i * 33, ASPECT));
    expect(onRender.mock.calls.length).toBe(mounted);
  });

  it('has no canvas, no frame call and no pixel read in its source', () => {
    const src = readFileSync('src/ui/BodyMap.tsx', 'utf8').replace(/\/\/.*$/gm, '');
    expect(src).not.toMatch(/canvas|drawImage|getImageData|toDataURL|createImageBitmap|OffscreenCanvas/i);
  });
});

describe('Hide body map switch', () => {
  it('is a real checkbox with a label, off by default, and hides the map when it is on', () => {
    render(
      <>
        <BodyMap leg="left" />
        <BodyMapSwitch />
      </>,
    );
    const box = screen.getByRole('checkbox', { name: 'Hide body map' });
    expect(box).not.toBeChecked();
    expect(document.querySelector('svg.body-map')).not.toBeNull();
    fireEvent.click(box);
    expect(box).toBeChecked();
    expect(document.querySelector('svg.body-map')).toBeNull();
    fireEvent.click(box);
    expect(document.querySelector('svg.body-map')).not.toBeNull();
  });

  it('survives an update while hidden, and is remembered for the page session only (no storage)', () => {
    const handle = createRef<BodyMapHandle>();
    const first = render(
      <>
        <BodyMap ref={handle} leg="left" />
        <BodyMapSwitch />
      </>,
    );
    fireEvent.click(screen.getByRole('checkbox', { name: 'Hide body map' }));
    expect(() => handle.current!.update(person(), 0, ASPECT)).not.toThrow();
    first.unmount();
    render(<BodyMapSwitch />);
    expect(screen.getByRole('checkbox', { name: 'Hide body map' })).toBeChecked();
    expect(readFileSync('src/ui/BodyMap.tsx', 'utf8').replace(/\/\/.*$/gm, '')).not.toMatch(/localStorage|sessionStorage|indexedDB|db\./);
  });
});

describe('same mirror as the picture', () => {
  it('gives the svg the mirror class of the same function', () => {
    expect(mirrorClass(false)).toBe('');
    expect(mirrorClass(true)).toBe('mirrored');
    expect(mount('left', true).svg().getAttribute('class')).toContain('mirrored');
    cleanup();
    expect(mount('left', false).svg().getAttribute('class')).not.toContain('mirrored');
  });

  it('puts the same mirror class on the video and on the svg in Setup, from one constant', () => {
    const source = mockSource();
    render(<Setup kind="heel-slide" side="left" exerciseName="Heel slide" source={source} sound={audioHarness().sound} onReady={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next: set up the camera' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start camera' }));
    return screen.findByRole('button', { name: 'Start exercise' }).then(() => {
      const video = document.querySelector('video.preview')!;
      const svg = document.querySelector('svg.body-map')!;
      expect(video.classList.contains('mirrored')).toBe(PREVIEW_MIRRORED);
      expect(svg.classList.contains('mirrored')).toBe(PREVIEW_MIRRORED);
      const src = readFileSync('src/ui/Setup.tsx', 'utf8');
      expect(src).toMatch(/mirrorClass\(PREVIEW_MIRRORED\)/);
      expect(src).toMatch(/mirrored=\{PREVIEW_MIRRORED\}/);
    });
  });
});

describe('Setup with the body map', () => {
  async function running(side: Side = 'left') {
    const source = mockSource();
    render(<Setup kind="heel-slide" side={side} exerciseName="Heel slide" source={source} sound={audioHarness().sound} onReady={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next: set up the camera' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start camera' }));
    await screen.findByRole('button', { name: 'Start exercise' });
    return source;
  }

  it('draws the map inside the camera frame and feeds it from the frame callback', async () => {
    const source = await running('left');
    const svg = document.querySelector('.frame svg.body-map')!;
    expect(svg).not.toBeNull();
    act(() => source.emit(person(), 0));
    const knee = svg.querySelector('[data-k="left-j1"]')!;
    expect(Number(knee.getAttribute('cx'))).toBeCloseTo(0.46 * (16 / 9) * 1000, 0);
  });

  it('follows the leg that the person chose, not the leg of the plan', async () => {
    const source = mockSource();
    render(<Setup kind="heel-slide" side="left" exerciseName="Heel slide" source={source} sound={audioHarness().sound} onReady={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.click(screen.getAllByRole('radio', { name: /^Right/ })[0]!);
    fireEvent.click(screen.getByRole('button', { name: 'Continue with this leg' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next: set up the camera' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start camera' }));
    await screen.findByRole('button', { name: 'Start exercise' });
    act(() => source.emit(person(), 0));
    expect(document.querySelector('[data-k="right-0"]')!.classList.contains('bm-chosen')).toBe(true);
    expect(document.querySelector('[data-k="left-0"]')!.classList.contains('bm-other')).toBe(true);
  });

  it('has the hide switch next to the picture, and hiding removes the layer', async () => {
    await running();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Hide body map' }));
    expect(document.querySelector('svg.body-map')).toBeNull();
  });

  it('shows no verdict word, no score and no colour name in the map', async () => {
    const source = await running();
    act(() => source.emit(person({ flex: 90, low: { 27: 0.1 } }), 0));
    act(() => source.emit(person({ flex: 90, low: { 27: 0.1 } }), 900));
    const text = document.querySelector('svg.body-map')!.textContent!;
    expect(text).not.toMatch(/\b(good|bad|perfect|wrong|correct|score|grade|pass|fail|goal|streak|badge)\b/i);
  });
});
