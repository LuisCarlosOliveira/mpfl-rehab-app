import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Landmark } from '../../src/lib/angle';
import type { GuideKind, AnyGuideKind } from '../../src/lib/guides';
import { PROPOSAL_NOTE, TECHNIQUE_NOTE } from '../../src/lib/technique';
import { Setup } from '../../src/ui/Setup';
import { TIMER_NOTE } from '../../src/ui/setupView';
import { legLandmarks } from '../helpers/leg';
import { audioHarness, mockSource, type MockSource } from './helpers';

afterEach(cleanup);

function setup(kind: AnyGuideKind, name: string, source: MockSource = mockSource()) {
  const onReady = vi.fn();
  render(<Setup kind={kind as GuideKind} side="left" exerciseName={name} source={source} sound={audioHarness().sound} onReady={onReady} onCancel={vi.fn()} />);
  return { source, onReady };
}
const toCamera = () => fireEvent.click(screen.getByRole('button', { name: 'Next: set up the camera' }));
async function running(kind: AnyGuideKind, name: string) {
  const r = setup(kind, name);
  toCamera();
  fireEvent.click(screen.getByRole('button', { name: 'Start camera' }));
  await screen.findByRole('button', { name: 'Start exercise' });
  return r;
}
const withFoot = (lm: Landmark[]) => {
  lm[29] = { x: 0.52, y: 0.72, visibility: 1 };
  lm[31] = { x: 0.58, y: 0.74, visibility: 1 };
  return lm;
};
const send = (source: MockSource, lm: Landmark[], to = 1000) => {
  for (let t = 0; t <= to; t += 100) act(() => source.emit(lm, t));
};
const lyingFoot = () => withFoot(legLandmarks('left', 20, { length: 0.3, hip: { x: 0.5, y: 0.2 } }));

const TIMERS = [['quad-set', 'Quadriceps set'], ['gluteal-set', 'Gluteal set']] as const;

describe('Setup, the two timers (quad-set, gluteal-set): no camera at all', () => {
  it.each(TIMERS)('%s: no camera step, no camera question, no camera picture, and Start exercise shows', (kind, name) => {
    const { source, onReady } = setup(kind, name);
    expect(screen.queryByRole('button', { name: 'Start camera' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Next: set up the camera' })).toBeNull();
    expect(screen.queryByRole('button', { name: /second camera/i })).toBeNull();
    expect(screen.queryByText('Hide body map')).toBeNull();
    expect(screen.queryByText('Which leg will you exercise?')).toBeNull();
    expect(screen.queryByText('Which side of you is the camera on?')).toBeNull();
    expect(screen.queryByText('Camera is off')).toBeNull();
    expect(document.querySelector('video')).toBeNull();
    expect(document.querySelector('svg.body-map')).toBeNull();
    expect(screen.queryByRole('list', { name: 'Camera check' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'More time' })).toBeNull();
    expect(document.body.textContent).not.toMatch(/camera picture shows/i);
    expect(screen.getByText(TIMER_NOTE)).toBeInTheDocument();
    expect(source.start).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Start exercise' }));
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(source.start).not.toHaveBeenCalled();
  });

  it.each(TIMERS)('%s: shows the guide with the proposal note and the figure', (kind, name) => {
    setup(kind, name);
    expect(screen.getByText(PROPOSAL_NOTE)).toBeInTheDocument();
    expect(document.querySelector('svg.fig')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Start exercise' })).toBeEnabled();
  });

  it.each(TIMERS)('%s: the guide names no camera step', (kind, name) => {
    setup(kind, name);
    expect(screen.queryByText('Leg and camera')).toBeNull();
    expect(screen.queryByText('What the camera must see')).toBeNull();
    expect(screen.queryByText(/camera is optional/i)).toBeNull();
  });

  it('shows no limit line for an exercise that has no knee limit', () => {
    setup('quad-set', 'Quadriceps set');
    expect(screen.queryByText(/^Your limit/)).toBeNull();
  });
});

describe('Setup, the camera kinds still start the camera', () => {
  it.each([
    ['heel-slide', 'Heel slide'],
    ['mini-squat', 'Mini squat'],
    ['straight-leg-raise', 'Straight leg raise'],
    ['seated-extension-hold', 'Seated knee extension hold'],
    ['ankle-pump', 'Ankle pump'],
    ['leg-raise-side', 'Leg raise to the side'],
    ['leg-raise-back', 'Leg raise to the back'],
  ] as const)('%s: Next, Start camera and the camera picture', async (kind, name) => {
    const { source } = await running(kind, name);
    expect(source.start).toHaveBeenCalledTimes(1);
    expect(document.querySelector('video')).not.toBeNull();
    expect(screen.getByText('Hide body map')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/camera picture shows/i);
  });
});

describe('Setup, the ankle pump (knee to toe)', () => {
  it('shows the rule rows for knee, ankle and foot, and the text "Knee to toes in the frame"', async () => {
    const { source } = await running('ankle-pump', 'Ankle pump');
    const lm = lyingFoot();
    lm[31] = { x: 0.99, y: 0.74, visibility: 1 };
    send(source, lm, 1500);
    await screen.findAllByText('Move back. Show your knee to your toes.');
    expect(screen.getAllByText(/Knee to toes in the frame/).length).toBeGreaterThan(0);
    expect(screen.queryByText('Whole leg in the frame')).toBeNull();
  });

  it('shows the body map', async () => {
    await running('ankle-pump', 'Ankle pump');
    expect(document.querySelector('svg.body-map')).not.toBeNull();
  });

  it('is ready when knee, ankle and foot show, and the hip is not needed', async () => {
    const { source } = await running('ankle-pump', 'Ankle pump');
    const lm = lyingFoot();
    lm[23] = { x: 0.5, y: 0.2, visibility: 0 };
    send(source, lm, 1500);
    await screen.findAllByText('The camera sees your knee, ankle and foot.');
    expect(screen.queryByText('Waiting for your whole leg')).toBeNull();
  });
});

describe('Setup, the leg raise to the side (front-on)', () => {
  const standing = () => {
    const lm = legLandmarks('left', 0, { length: 0.3, hip: { x: 0.5, y: 0.2 } });
    lm[24] = { x: 0.3, y: 0.2, visibility: 1 };
    return lm;
  };
  it('tells the person to put the camera in front at hip height, and shows no side-on rule', async () => {
    const { source } = await running('leg-raise-side', 'Leg raise to the side');
    send(source, standing(), 1500);
    expect(screen.getByText(/^Put the camera in front of you at hip height\./)).toBeInTheDocument();
    expect(screen.queryByText('Side-on to the camera')).toBeNull();
    expect(screen.queryByText('Turn side-on to the camera.')).toBeNull();
  });
  it('does not ask for the side view for a hip line that lies along the picture (a person on the side)', async () => {
    const { source } = await running('leg-raise-side', 'Leg raise to the side');
    const lm = standing();
    lm[24] = { x: 0.5, y: 0.21, visibility: 1 };
    send(source, lm, 3000);
    expect(screen.getByTestId('instruction')).not.toHaveTextContent(/side-on/i);
  });
  it('describes the camera in front at hip height in the guide', () => {
    setup('leg-raise-side', 'Leg raise to the side');
    fireEvent.click(screen.getByRole('button', { name: /^Step 6,/ }));
    expect(screen.getByRole('img')).toHaveAccessibleName(/camera in front of you, at hip height/i);
  });
});

describe('Setup guide, the proposal note', () => {
  it.each(['quad-set', 'gluteal-set', 'ankle-pump', 'leg-raise-side', 'leg-raise-back'] as const)('%s: shows PROPOSAL_NOTE under the technique lines and not the source note', (kind) => {
    setup(kind, 'x');
    expect(screen.getByText(PROPOSAL_NOTE)).toBeInTheDocument();
    expect(screen.queryByText(TECHNIQUE_NOTE)).toBeNull();
  });
  it('heel-slide keeps the source note', () => {
    setup('heel-slide', 'Heel slide');
    expect(screen.getByText(TECHNIQUE_NOTE)).toBeInTheDocument();
    expect(screen.queryByText(PROPOSAL_NOTE)).toBeNull();
  });
});
