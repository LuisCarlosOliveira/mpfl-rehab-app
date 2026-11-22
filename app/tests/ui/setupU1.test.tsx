import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { legLandmarks } from '../helpers/leg';
import { Setup } from '../../src/ui/Setup';
import { audioHarness, mockSource, readyLeg } from './helpers';

afterEach(cleanup);

async function open() {
  const source = mockSource();
  const view = render(<Setup kind="heel-slide" side="left" exerciseName="Heel slide" source={source} sound={audioHarness().sound} onReady={vi.fn()} onCancel={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Next: set up the camera' }));
  fireEvent.click(screen.getByRole('button', { name: 'Start camera' }));
  await screen.findByRole('button', { name: 'Start exercise' });
  return { source, view };
}
const arcText = (c: HTMLElement) => c.querySelector('[data-k="arc-text"]')!.getAttribute('display');

describe('U1: Setup shows only what the camera sees', () => {
  it('a frame with the knee below the visibility rule shows no angle text and not Ready', async () => {
    const { source, view } = await open();
    const hidden = () => {
      const lm = legLandmarks('left', 40);
      for (const i of [25]) lm[i] = { ...lm[i]!, visibility: 0.1 }; // the left knee
      return lm;
    };
    for (let t = 0; t < 4000; t += 100) act(() => source.emit(hidden(), t));
    expect(arcText(view.container)).toBe('none');
    expect(view.container.textContent).not.toMatch(/\d+° estimated angle/);
    const status = view.container.querySelector('.start-status')!;
    expect(status.textContent).not.toBe('Ready');
    expect(status.textContent).toBe('Waiting for your whole leg');
  });

  it('a frame with the whole leg seen shows the angle again', async () => {
    const { source, view } = await open();
    for (let t = 0; t < 4000; t += 100) act(() => source.emit(readyLeg(), t));
    expect(arcText(view.container)).not.toBe('none');
  });
});
