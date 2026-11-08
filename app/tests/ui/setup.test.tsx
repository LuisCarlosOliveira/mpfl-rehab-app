import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { guideFor } from '../../src/lib/guides';
import { SETUP_CONFIG, SETUP_TEXT } from '../../src/lib/setupRules';
import { Setup } from '../../src/ui/Setup';
import { audioHarness, mockSource, readyLeg, type MockSource } from './helpers';

afterEach(cleanup);

function setup(source: MockSource = mockSource(), over: { limit?: number } = {}) {
  const onReady = vi.fn();
  const onCancel = vi.fn();
  const audio = audioHarness();
  const view = render(
    <Setup
      kind="heel-slide"
      side="left"
      exerciseName="Heel slide"
      limit={over.limit}
      source={source}
      sound={audio.sound}
      onReady={onReady}
      onCancel={onCancel}
    />,
  );
  return { source, onReady, onCancel, audio, ...view };
}

const toCamera = () => fireEvent.click(screen.getByRole('button', { name: 'Next: set up the camera' }));

async function cameraRunning(source = mockSource()) {
  const result = setup(source);
  toCamera();
  fireEvent.click(screen.getByRole('button', { name: 'Start camera' }));
  await screen.findByRole('button', { name: 'Start exercise' });
  return result;
}

/** Send frames of the ready leg every 100 ms. Stops when `until` is true. Returns the next time. */
function frames(source: MockSource, from: number, to: number, until: () => boolean = () => false, landmarks = readyLeg()) {
  let t = from;
  for (; t <= to && !until(); t += 100) act(() => source.emit(landmarks, t));
  return t;
}

const polite = () => document.querySelector('[role="status"][aria-live="polite"]')!;

describe('Setup, position guide step (FR28)', () => {
  it('shows the position guide first and does not start the camera', () => {
    const { source } = setup();
    expect(screen.getByRole('heading', { level: 1, name: 'Set up the camera' })).toBeInTheDocument();
    const guide = guideFor('heel-slide');
    expect(screen.getByText(guide.startPosition)).toBeInTheDocument();
    expect(screen.getByText(guide.legFacingCamera)).toBeInTheDocument();
    expect(screen.getByText(guide.handsAndSupport)).toBeInTheDocument();
    expect(screen.getByText(guide.range)).toBeInTheDocument();
    expect(screen.getByText(guide.speed)).toBeInTheDocument();
    expect(screen.getByText(guide.cameraMustSee)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start camera' })).toBeNull();
    expect(source.start).not.toHaveBeenCalled();
  });

  it('draws a start and an end figure as plain svg images with a text alternative from the guide', () => {
    const { container } = setup();
    const guide = guideFor('heel-slide');
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(2);
    expect(images[0]).toHaveAccessibleName(expect.stringContaining(guide.startPosition));
    expect(images[1]).toHaveAccessibleName(expect.stringContaining(guide.range));
    images.forEach((img) => expect(img.tagName.toLowerCase()).toBe('svg'));
    expect(container.querySelector('foreignObject, image')).toBeNull();
  });

  it('has no inline style attribute anywhere on the screen', () => {
    const { container } = setup();
    expect(container.querySelectorAll('[style]')).toHaveLength(0);
  });

  it('names the operated leg and the camera in the drawing', () => {
    const { container } = setup();
    expect(within(container as HTMLElement).getAllByText('Operated leg').length).toBeGreaterThan(0);
    expect(within(container as HTMLElement).getAllByText('Camera').length).toBeGreaterThan(0);
  });

  it('says "Ask your surgeon" when the protocol sets no limit, and the number when it does', () => {
    setup();
    expect(screen.getByText(/your limit: ask your surgeon/i)).toBeInTheDocument();
    cleanup();
    setup(mockSource(), { limit: 90 });
    expect(screen.getByText(/your limit is 90 degrees\. your care team sets it/i)).toBeInTheDocument();
  });

  it('says that the drawing shows the movement and is not the limit', () => {
    setup();
    expect(screen.getByText(/the drawing shows the movement\. it is not your limit/i)).toBeInTheDocument();
  });

  it('Cancel works on the guide step', () => {
    const { onCancel } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('keeps the optional second-device step hidden (T12b)', () => {
    setup();
    expect(screen.queryByText(/second (device|camera)/i)).toBeNull();
  });
});

describe('Setup, camera step', () => {
  it('explains the camera before any prompt and does not start it on its own', () => {
    const { source } = setup();
    toCamera();
    expect(screen.getByText(/does not record or send video/i)).toBeInTheDocument();
    expect(screen.getByText(/other people in the view are also seen by the camera/i)).toBeInTheDocument();
    expect(source.start).not.toHaveBeenCalled();
  });

  it('starts the camera and unlocks the sound after a press of "Start camera" only', async () => {
    const { source, audio } = setup();
    toCamera();
    expect(audio.factory).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Start camera' }));
    expect(source.start).toHaveBeenCalledTimes(1);
    expect(audio.factory).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('button', { name: 'Start exercise' })).toBeInTheDocument();
  });

  it('shows the denied text and a retry button', async () => {
    const source = mockSource();
    source.nextStart = {
      ok: false,
      error: { kind: 'permission-denied', message: 'Camera access was blocked. Allow the camera in the browser settings for this site, then try again.' },
    };
    setup(source);
    toCamera();
    fireEvent.click(screen.getByRole('button', { name: 'Start camera' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/camera access was blocked/i);
    source.nextStart = { ok: true };
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('button', { name: 'Start exercise' })).toBeInTheDocument();
    expect(source.start).toHaveBeenCalledTimes(2);
  });

  it('shows its own text when no camera exists', async () => {
    const source = mockSource();
    source.nextStart = { ok: false, error: { kind: 'no-device', message: 'No camera was found. Connect a camera, then try again.' } };
    setup(source);
    toCamera();
    fireEvent.click(screen.getByRole('button', { name: 'Start camera' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/no camera was found/i);
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('stops the camera when the screen unmounts without a start of the session', async () => {
    const { source, unmount } = await cameraRunning();
    unmount();
    expect(source.stop).toHaveBeenCalled();
  });

  it('keeps the camera running for the session when "Start exercise" is pressed', async () => {
    const { source, onReady, unmount } = await cameraRunning();
    fireEvent.click(screen.getByRole('button', { name: 'Start exercise' }));
    expect(onReady).toHaveBeenCalled();
    unmount();
    expect(source.stop).not.toHaveBeenCalled();
  });

  it('Cancel goes back, and the unmount stops the camera', async () => {
    const { source, onCancel, unmount } = await cameraRunning();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
    unmount();
    await waitFor(() => expect(source.stop).toHaveBeenCalled());
  });

  it('does not mirror the preview', async () => {
    await cameraRunning();
    expect(document.querySelector('video')!.getAttribute('style')).toBeNull();
  });
});

describe('Setup, live check (FR27)', () => {
  it('shows the current instruction as one large text line', async () => {
    const { source } = await cameraRunning();
    act(() => source.emit(null, 0));
    expect(screen.getByTestId('instruction')).toHaveTextContent(SETUP_TEXT['no-pose']);
  });

  it('lists the rules with a word, not with a colour alone', async () => {
    const { source } = await cameraRunning();
    act(() => source.emit(null, 0));
    const list = screen.getByRole('list', { name: 'Camera check' });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(6);
    items.forEach((li) => expect(li.textContent).toMatch(/not seen/));
    frames(source, 100, 4500);
    expect(within(list).getAllByRole('listitem').every((li) => /: seen$/.test(li.textContent ?? ''))).toBe(true);
  });

  it('carries only the announce text in the polite live region', async () => {
    const { source } = await cameraRunning();
    act(() => source.emit(null, 0));
    expect(polite()).toHaveTextContent(SETUP_TEXT['no-pose']);
    expect(document.querySelectorAll('[role="status"][aria-live="polite"]')).toHaveLength(1);
    // Many frames in the next 2 seconds change the large line at most. The live region stays.
    frames(source, 100, 2000);
    expect(polite()).toHaveTextContent(SETUP_TEXT['no-pose']);
  });

  it('announces a changed rule after the announce interval', async () => {
    const { source } = await cameraRunning();
    act(() => source.emit(null, 0));
    frames(source, 100, SETUP_CONFIG.announceEveryMs + 300);
    expect(polite()).not.toHaveTextContent(SETUP_TEXT['no-pose']);
    expect(polite().textContent).toBe(SETUP_TEXT.still);
  });

  it('shows the 5 second countdown from countdownLeftMs, outside the live region', async () => {
    const { source } = await cameraRunning();
    frames(source, 0, 20000, () => /Starting in/.test(document.body.textContent ?? ''));
    expect(screen.getByTestId('countdown')).toHaveTextContent(/Starting in 5 seconds/);
    expect(polite().textContent).not.toMatch(/Starting in/);
  });

  it('starts the exercise when the countdown ends, and keeps the camera for the session', async () => {
    const { source, onReady, unmount } = await cameraRunning();
    frames(source, 0, 30000, () => onReady.mock.calls.length > 0);
    expect(onReady).toHaveBeenCalledTimes(1);
    unmount();
    expect(source.stop).not.toHaveBeenCalled();
  });

  it('"More time" adds 30 seconds to the countdown', async () => {
    const { source, onReady } = await cameraRunning();
    const t = frames(source, 0, 20000, () => /Starting in/.test(document.body.textContent ?? ''));
    fireEvent.click(screen.getByRole('button', { name: 'More time' }));
    act(() => source.emit(readyLeg(), t));
    const seconds = Number(/Starting in (\d+) seconds/.exec(screen.getByTestId('countdown').textContent ?? '')![1]);
    expect(seconds).toBeGreaterThanOrEqual(30);
    expect(onReady).not.toHaveBeenCalled();
  });

  it('the manual Start button works before the countdown ends', async () => {
    const { source, onReady } = await cameraRunning();
    frames(source, 0, 500);
    fireEvent.click(screen.getByRole('button', { name: 'Start exercise' }));
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(source.stop).not.toHaveBeenCalled();
  });

  it('a lost leg removes the countdown', async () => {
    const { source } = await cameraRunning();
    const t = frames(source, 0, 20000, () => /Starting in/.test(document.body.textContent ?? ''));
    act(() => source.emit(null, t));
    act(() => source.emit(null, t + 1500));
    expect(screen.queryByTestId('countdown')).toBeNull();
  });
});
