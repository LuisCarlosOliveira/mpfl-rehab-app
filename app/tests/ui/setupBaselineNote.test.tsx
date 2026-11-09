// F1 (issue L1-03 and L1-05): Setup shows plainly that no resting angle exists yet, with the hold-still progress.
// A person who lies down is not told to turn the body.
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Setup } from '../../src/ui/Setup';
import { CAPTURE_TEXT, LEG_TEXT } from '../../src/ui/setupView';
import { audioHarness, mockSource, readyLegOf, type MockSource } from './helpers';
import { legLandmarks } from '../helpers/leg';

beforeEach(() => localStorage.clear());
afterEach(cleanup);

async function running(over: { kind?: 'heel-slide' | 'mini-squat' | 'straight-leg-raise'; returnWithinDeg?: number | undefined } = {}) {
  const source = mockSource();
  const onReady = vi.fn();
  render(
    <Setup
      kind={over.kind ?? 'heel-slide'}
      side="left"
      exerciseName="Heel slide"
      targetFlexion={60}
      returnWithinDeg={'returnWithinDeg' in over ? over.returnWithinDeg : 20}
      source={source}
      sound={audioHarness().sound}
      onReady={onReady}
      onCancel={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Next: set up the camera' }));
  fireEvent.click(screen.getByRole('button', { name: 'Start camera' }));
  await screen.findByRole('button', { name: 'Start exercise' });
  return { source, onReady };
}
const feed = (source: MockSource, lm: ReturnType<typeof readyLegOf>, to: number, from = 0) => {
  for (let t = from; t <= to; t += 100) act(() => source.emit(lm, t));
};

describe('Setup: no resting angle yet (L1-03)', () => {
  it('says plainly that no resting angle exists and that the next screen finds it', async () => {
    const { source } = await running();
    feed(source, readyLegOf('left'), 500);
    expect(screen.getByText(CAPTURE_TEXT.setupNoRest)).toBeInTheDocument();
    expect(screen.getByText(CAPTURE_TEXT.setupNoRestDetail)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/stop, then start again/i);
  });

  it('shows the hold-still progress while the check waits for a still leg', async () => {
    const { source } = await running();
    feed(source, readyLegOf('left'), 1200);
    const bar = screen.getByRole('progressbar', { name: CAPTURE_TEXT.progress });
    expect(Number(bar.getAttribute('value'))).toBeGreaterThan(30);
    expect(Number(bar.getAttribute('value'))).toBeLessThan(80);
  });

  it('replaces the note with the resting angle when the leg held still', async () => {
    const { source } = await running();
    feed(source, readyLegOf('left'), 3500);
    expect(screen.queryByText(CAPTURE_TEXT.setupNoRest)).toBeNull();
    expect(screen.getByText(/^Resting angle: \d+ degrees\./)).toBeInTheDocument();
  });

  it('shows no note for an exercise with no rep counter, and none without a protocol return value', async () => {
    const a = await running({ kind: 'straight-leg-raise' });
    feed(a.source, readyLegOf('left'), 500);
    expect(screen.queryByText(CAPTURE_TEXT.setupNoRest)).toBeNull();
    cleanup();
    const b = await running({ returnWithinDeg: undefined });
    feed(b.source, readyLegOf('left'), 500);
    expect(screen.queryByText(CAPTURE_TEXT.setupNoRest)).toBeNull();
    expect(screen.getAllByText(LEG_TEXT.noReturnValue).length).toBeGreaterThan(0);
  });

  it('lets the person start with no baseline and hands over null, so Session finds the angle in place', async () => {
    const { source, onReady } = await running();
    feed(source, readyLegOf('left'), 500);
    fireEvent.click(screen.getByRole('button', { name: 'Start exercise' }));
    expect(onReady.mock.calls[0]![0]).toMatchObject({ baselineDeg: null });
  });
});

describe('Setup: the text for a person who lies down (L1-05)', () => {
  const hiddenNear = () => {
    const lm = legLandmarks('left', 20, { length: 0.3, hip: { x: 0.5, y: 0.2 } });
    lm[27] = { ...lm[27]!, visibility: 0.2 };
    [24, 26, 28].forEach((i) => (lm[i] = { x: 0.5, y: 0.5, visibility: 1 }));
    return lm;
  };

  it('does not tell a heel slide person to turn', async () => {
    const { source } = await running({ kind: 'heel-slide' });
    feed(source, hiddenNear(), 3500);
    expect(screen.getByTestId('instruction').textContent).not.toMatch(/\bturn\b/i);
    expect(screen.getByTestId('instruction').textContent).toMatch(/camera/i);
  });

  it('does not tell a straight leg raise person to turn', async () => {
    const { source } = await running({ kind: 'straight-leg-raise' });
    feed(source, hiddenNear(), 3500);
    expect(screen.getByTestId('instruction').textContent).not.toMatch(/\bturn\b/i);
  });

  it('keeps the turn text for a person who stands', async () => {
    const { source } = await running({ kind: 'mini-squat' });
    feed(source, hiddenNear(), 3500);
    expect(screen.getByTestId('instruction')).toHaveTextContent('Turn so your chosen leg faces the camera.');
  });
});
