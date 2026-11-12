// W2: the unseen rules come first (U19). The start shows each step with real text (U10, L4-05).
import { readFileSync, statSync } from 'node:fs';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SetupRuleId } from '../../src/lib/setupRules';
import { Setup } from '../../src/ui/Setup';
import { MODEL_BYTES, orderedRuleRows, ruleRows, startText } from '../../src/ui/setupView';
import type { ProgressHandler, StartResult } from '../../src/pose/source';
import { audioHarness, mockSource } from './helpers';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const labels = (rule: SetupRuleId) => orderedRuleRows(rule).map((r) => `${r.label}:${r.word}`);

describe('unseen rules first (U19)', () => {
  it('puts every rule that is not seen before the rules that are seen, in the old order inside each group', () => {
    const rows = orderedRuleRows('whole-leg');
    const words = rows.map((r) => r.word);
    expect(words).toEqual(['not seen', 'not seen', 'not seen', 'not seen', 'seen', 'seen']);
    expect(rows.slice(0, 4).map((r) => r.label)).toEqual(['Whole leg in the frame', 'Leg big enough in the frame', 'Side-on to the camera', 'Leg held still']);
    expect(rows.slice(4).map((r) => r.label)).toEqual(['Person in the view', 'Hip, knee and ankle']);
  });

  it('keeps the old order when the person is ready, and has the same chips as ruleRows', () => {
    expect(orderedRuleRows('ready').map((r) => r.label)).toEqual(ruleRows('ready').map((r) => r.label));
    expect([...labels('closer')].sort()).toEqual(ruleRows('closer').map((r) => `${r.label}:${r.word}`).sort());
  });

  it('shows the same order in the list on the camera step', async () => {
    const source = mockSource();
    render(<Setup kind="heel-slide" side="left" exerciseName="Heel slide" source={source} sound={audioHarness().sound} onReady={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next: set up the camera' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start camera' }));
    await screen.findByRole('button', { name: 'Start exercise' });
    act(() => source.emit(null, 0));
    const items = [...document.querySelectorAll('.rule-list li')].map((li) => li.className);
    expect(items).toHaveLength(6);
    expect(items.every((c) => c.includes('rule-missing'))).toBe(true); // no pose: nothing is seen yet
  });
});

describe('start steps and the model load (U10, L4-05)', () => {
  function held() {
    const source = mockSource();
    let resolve!: (r: StartResult) => void;
    let progress: ProgressHandler | undefined;
    source.start.mockImplementation(((_h: unknown, _v: unknown, p?: ProgressHandler) => {
      progress = p;
      return new Promise<StartResult>((r) => (resolve = r));
    }) as never);
    render(<Setup kind="heel-slide" side="left" exerciseName="Heel slide" source={source} sound={audioHarness().sound} onReady={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next: set up the camera' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start camera' }));
    return { emit: (p: Parameters<ProgressHandler>[0]) => act(() => progress?.(p)), done: () => act(() => resolve({ ok: true })) };
  }
  const status = () => document.querySelector('.start-status');

  it('names the camera step, the model step with its size, and Waiting for your whole leg (U1: not Ready before the leg is seen)', async () => {
    const h = held();
    expect(status()).toHaveTextContent('Asking for the camera');
    h.emit({ step: 'camera' });
    expect(status()).toHaveTextContent('Asking for the camera');
    h.emit({ step: 'model', loadedBytes: 0 });
    expect(status()).toHaveTextContent(startText.model(0));
    expect(status()).toHaveTextContent('The camera is on. The pose model is loading.');
    expect(status()).toHaveTextContent(/Loading the pose model, \d+\.\d MB/);
    h.done();
    expect(await screen.findByText('Waiting for your whole leg')).toBeInTheDocument();
  });

  it('shows the bytes that came in, and a progress bar, once the loader reports them', () => {
    const h = held();
    expect(screen.queryByRole('progressbar')).toBeNull();
    h.emit({ step: 'model', loadedBytes: 6_200_000 });
    expect(status()).toHaveTextContent('Loading the pose model, 6.2 of ');
    const bar = screen.getByRole('progressbar', { name: 'Pose model download' });
    expect(bar).toHaveAttribute('value', '6200000');
    expect(bar).toHaveAttribute('max', String(MODEL_BYTES));
  });

  it('adds one plain sentence after 8 seconds on the same step', () => {
    vi.useFakeTimers();
    held();
    expect(status()).not.toHaveTextContent('takes longer');
    act(() => void vi.advanceTimersByTime(8100));
    expect(status()).toHaveTextContent('This takes longer than usual. Keep this page open.');
  });

  it('keeps the slow sentence when the byte count changes after the 8 seconds', () => {
    vi.useFakeTimers();
    const h = held();
    h.emit({ step: 'model', loadedBytes: 0 });
    act(() => void vi.advanceTimersByTime(8100));
    h.emit({ step: 'model', loadedBytes: 2_000_000 });
    h.emit({ step: 'model', loadedBytes: 3_000_000 });
    expect(status()).toHaveTextContent('This takes longer than usual.');
  });

  it('has the status line as a polite status, after the hidden live region of the setup check', () => {
    held();
    const statuses = [...document.querySelectorAll('[role="status"]')];
    expect(statuses[0]).toHaveClass('visually-hidden');
    expect(status()).toHaveAttribute('role', 'status');
  });

  it('keeps the width of the Start camera button: one swap class for every label', async () => {
    const source = mockSource();
    source.nextStart = { ok: false, error: { kind: 'other', message: 'x' } };
    render(<Setup kind="heel-slide" side="left" exerciseName="Heel slide" source={source} sound={audioHarness().sound} onReady={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next: set up the camera' }));
    const first = screen.getByRole('button', { name: 'Start camera' });
    expect(first).toHaveClass('btn-swap');
    fireEvent.click(first);
    expect(await screen.findByRole('button', { name: 'Try again' })).toHaveClass('btn-swap');
  });

  it('keeps MODEL_BYTES equal to the real files that load (wasm and model)', () => {
    const size = (f: string) => statSync(`public/models/${f}`).size;
    expect(MODEL_BYTES).toBe(size('wasm/vision_wasm_internal.wasm') + size('pose_landmarker_lite.task'));
  });

  it('writes the texts in the style of the screen: no verdict word', () => {
    const text = JSON.stringify(startText.model(1)) + readFileSync('src/ui/setupView.ts', 'utf8');
    expect(text).not.toMatch(/\b(good|bad|perfect|wrong|fail)\b/i);
  });
});
