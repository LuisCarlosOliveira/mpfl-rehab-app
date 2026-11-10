// T12b: the optional step "Add a second camera (optional)" in Setup. The single camera flow stays the default.
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { useSyncExternalStore } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { decodeOffer, makeHello } from '../../src/lib/pairing';
import { createPairing, type Pairing } from '../../src/pairing/pairing';
import { Setup } from '../../src/ui/Setup';
import { answerText, FakePeer, lastPeer, makePeer } from '../pairing-ui/fakeRtc';
import { audioHarness, mockSource, readyLeg, type MockSource } from './helpers';
import { hasVerdictWord } from './verdict';

beforeEach(() => {
  FakePeer.reset();
  HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve());
});
afterEach(cleanup);

function Harness(props: { pairing: Pairing; source: MockSource; onReady?: () => void; onCancel?: () => void; omitPair?: boolean }) {
  const view = useSyncExternalStore(props.pairing.subscribe, props.pairing.getView);
  return (
    <Setup
      kind="heel-slide"
      side="left"
      exerciseName="Heel slide"
      source={props.source}
      sound={audioHarness().sound}
      pair={props.omitPair ? undefined : { pairing: props.pairing, view }}
      onReady={props.onReady ?? vi.fn()}
      onCancel={props.onCancel ?? vi.fn()}
    />
  );
}

function setup(over: { omitPair?: boolean; onReady?: () => void; onCancel?: () => void } = {}) {
  const pairing = createPairing({ createPeer: makePeer });
  const source = mockSource();
  const view = render(<Harness pairing={pairing} source={source} {...over} />);
  return { pairing, source, ...view };
}

const press = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const OPEN = 'Add a second camera (optional)';

async function connect(pairing: Pairing) {
  press('Start pairing');
  await screen.findByRole('img', { name: 'Pairing code of this laptop' });
  const offer = decodeOffer(pairing.getView().offerText!);
  if (!offer.ok) throw new Error('offer');
  const secret = offer.value.secret;
  fireEvent.click(screen.getByRole('button', { name: 'Next: scan the phone code' })); // the paste field is in step 2
  fireEvent.change(screen.getByLabelText('Or paste the phone code'), { target: { value: answerText(secret) } });
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Use this code' })));
  act(() => lastPeer().channels[0]!.receive(JSON.stringify(makeHello(secret))));
  expect(screen.getByRole('status')).toHaveTextContent('Connected');
}

describe('Setup without a second camera', () => {
  it('shows no second camera button and no hidden slot when the shell gives no pairing', () => {
    const { container } = setup({ omitPair: true });
    expect(screen.queryByText(/second camera/i)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Next: set up the camera' }));
    expect(screen.queryByText(/second camera/i)).toBeNull();
    expect(container.querySelector('[data-slot="second-device"]')).toBeNull();
  });

  it('keeps the single camera flow: guide, camera, Start camera, Start exercise', async () => {
    const onReady = vi.fn();
    const { source } = setup({ onReady });
    fireEvent.click(screen.getByRole('button', { name: 'Next: set up the camera' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start camera' }));
    await screen.findByRole('button', { name: 'Start exercise' });
    expect(source.start).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Start exercise' }));
    expect(onReady).toHaveBeenCalledWith(expect.objectContaining({ exerciseLeg: 'left' }));
  });
});

describe('Setup with the optional second camera step', () => {
  it('offers the step as a button on the position guide, and not on the camera step', () => {
    setup();
    expect(screen.getByRole('button', { name: OPEN })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next: set up the camera' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Next: set up the camera' }));
    expect(screen.queryByRole('button', { name: OPEN })).toBeNull();
  });

  it('opens the pairing screen with one h1 that has the focus, and a three item step list', () => {
    setup();
    press(OPEN);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    const h1 = screen.getByRole('heading', { level: 1, name: 'Add a second camera' });
    expect(h1).toHaveFocus();
    const steps = within(screen.getByRole('list', { name: 'Steps' })).getAllByRole('listitem');
    expect(steps.map((s) => s.textContent)).toEqual(expect.arrayContaining([expect.stringContaining('Second camera')]));
    expect(steps).toHaveLength(3);
    expect(steps.find((s) => s.getAttribute('aria-current') === 'step')).toHaveTextContent('Second camera');
  });

  it('does not call getUserMedia or begin pairing before Start pairing', () => {
    const { pairing, source } = setup();
    press(OPEN);
    expect(pairing.getView().status).toBe('idle');
    expect(FakePeer.all).toHaveLength(0);
    expect(source.start).not.toHaveBeenCalled();
  });

  it('Skip keeps one camera: the camera step opens and the single camera flow works', async () => {
    const onReady = vi.fn();
    const { pairing, source } = setup({ onReady });
    press(OPEN);
    press('Skip, use one camera');
    expect(pairing.getView().status).toBe('skipped');
    expect(screen.getByRole('button', { name: 'Start camera' })).toBeInTheDocument();
    expect(screen.queryByText(/second camera connected/i)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Start camera' }));
    await screen.findByRole('button', { name: 'Start exercise' });
    act(() => source.emit(readyLeg(), 0));
    fireEvent.click(screen.getByRole('button', { name: 'Start exercise' }));
    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it('goes on to the camera step after the phone is connected, and keeps the link open', async () => {
    const { pairing } = setup();
    press(OPEN);
    await connect(pairing);
    press('Continue');
    expect(screen.getByRole('button', { name: 'Start camera' })).toBeInTheDocument();
    expect(pairing.getView().status).toBe('connected');
    expect(lastPeer().closed).toBe(false);
  });

  it('shows the front camera drawing and a line about the chosen leg only when the phone is connected', async () => {
    const { pairing } = setup();
    fireEvent.click(screen.getAllByRole('radio', { name: /^Right/ })[0]!); // the first group is the leg
    fireEvent.click(screen.getByRole('button', { name: /continue/i })); // confirms the leg that is not in the plan
    press(OPEN);
    await connect(pairing);
    press('Continue');
    expect(screen.getAllByText(/camera in front of you/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/second camera follows your chosen right leg/i)).toBeInTheDocument();
  });

  it('shows no front camera drawing after Skip', () => {
    setup();
    press(OPEN);
    press('Skip, use one camera');
    expect(screen.queryByText(/camera in front of you/i)).toBeNull();
    expect(screen.queryByText(/second camera follows/i)).toBeNull();
  });

  it('keeps the chosen leg and camera side through the pairing step', () => {
    const onReady = vi.fn();
    setup({ onReady });
    fireEvent.click(screen.getAllByRole('radio', { name: /^Right/ })[0]!); // the first group is the leg
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    press(OPEN);
    press('Skip, use one camera');
    fireEvent.click(screen.getByRole('button', { name: 'Start camera' }));
    return screen.findByRole('button', { name: 'Start exercise' }).then((b) => {
      fireEvent.click(b);
      expect(onReady).toHaveBeenCalledWith(expect.objectContaining({ exerciseLeg: 'right', cameraSide: 'right' }));
    });
  });

  it('Cancel on the pairing step closes the link and calls onCancel', async () => {
    const onCancel = vi.fn();
    const { pairing } = setup({ onCancel });
    press(OPEN);
    press('Start pairing');
    await screen.findByRole('img', { name: 'Pairing code of this laptop' });
    press('Cancel');
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(lastPeer().closed).toBe(true);
    expect(pairing.getView().status).not.toBe('offer');
  });

  it('Cancel after a connected phone closes the link', async () => {
    const onCancel = vi.fn();
    const { pairing } = setup({ onCancel });
    press(OPEN);
    await connect(pairing);
    press('Cancel');
    expect(lastPeer().closed).toBe(true);
    expect(pairing.getView().status).toBe('closed');
  });

  it('Back returns to the guide and closes the link', async () => {
    const { pairing } = setup();
    press(OPEN);
    press('Start pairing');
    await screen.findByRole('img', { name: 'Pairing code of this laptop' });
    press('Back');
    expect(screen.getByRole('heading', { level: 1, name: 'Set up the camera' })).toBeInTheDocument();
    expect(lastPeer().closed).toBe(true);
    expect(pairing.getView().status).toBe('closed');
  });

  it('starts from the beginning when the step opens again after a closed or skipped link', () => {
    const { pairing } = setup();
    press(OPEN);
    press('Skip, use one camera');
    cleanup();
    render(<Harness pairing={pairing} source={mockSource()} />);
    press(OPEN);
    expect(pairing.getView().status).toBe('idle');
    expect(screen.getByRole('button', { name: 'Start pairing' })).toBeInTheDocument();
  });

  it('stops the camera of the pairing step on Cancel', () => {
    const { source } = setup();
    press(OPEN);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(source.start).not.toHaveBeenCalled();
  });

  it('uses no verdict word on the button, the step and the line about the leg', async () => {
    const { pairing } = setup();
    expect(hasVerdictWord(document.body.textContent ?? '')).toBeNull();
    press(OPEN);
    expect(hasVerdictWord(document.body.textContent ?? '')).toBeNull();
    await connect(pairing);
    press('Continue');
    expect(hasVerdictWord(document.body.textContent ?? '')).toBeNull();
  });
});
