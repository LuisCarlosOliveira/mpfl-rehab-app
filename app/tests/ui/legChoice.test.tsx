// T17: the leg choice and the camera side in Setup, and what Session does with them.
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Session } from '../../src/ui/Session';
import { Setup } from '../../src/ui/Setup';
import { App } from '../../src/ui/App';
import { markPrivacyNoticeSeen, saveProtocol } from '../../src/lib/storage';
import { setupText } from '../../src/lib/setupRules';
import { CAPTURE_TEXT, LEG_TEXT } from '../../src/ui/setupView';
import { HEEL_SLIDE, audioHarness, freshDb, mockSource, playRep, protocolText, readyLegOf, twoLegs, type MockSource } from './helpers';
import { legLandmarks } from '../helpers/leg';
import type { Exercise } from '../../src/lib/protocol';
import { flexion, kneeAngle, selectLeg, type Side } from '../../src/lib/angle';

beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const group = (name: string) => screen.getByRole('group', { name });
const radio = (groupName: string, label: string) => within(group(groupName)).getByRole('radio', { name: new RegExp(`^${label}`) });
const LEG_Q = LEG_TEXT.legQuestion;
const CAM_Q = LEG_TEXT.cameraQuestion;
// The mock source has the aspect 16:9. The flexion that the app reads is the flexion at this aspect.
const readFlexion = (side: Side) => flexion(kneeAngle(...selectLeg(readyLegOf(side), side), 16 / 9)) as number;
const next = () => screen.getByRole('button', { name: 'Next: set up the camera' });

function setup(over: { side?: Side; kind?: 'heel-slide' | 'straight-leg-raise'; returnWithinDeg?: number; source?: MockSource } = {}) {
  const onReady = vi.fn();
  const source = over.source ?? mockSource();
  render(
    <Setup
      kind={over.kind ?? 'heel-slide'}
      side={over.side ?? 'left'}
      exerciseName="Heel slide"
      targetFlexion={60}
      returnWithinDeg={'returnWithinDeg' in over ? over.returnWithinDeg : 20}
      source={source}
      sound={audioHarness().sound}
      onReady={onReady}
      onCancel={vi.fn()}
    />,
  );
  return { source, onReady };
}

describe('Setup: the legend of the drawings follows the chosen leg (live test L1-06)', () => {
  it('says Operated leg when the operated leg is chosen and Your chosen leg when the other leg is chosen', () => {
    setup({ side: 'left' });
    const legendTexts = () => Array.from(document.querySelectorAll('svg[role="img"] text')).map((n) => n.textContent ?? '');
    expect(legendTexts().some((s) => /operated leg/i.test(s))).toBe(true);
    expect(legendTexts().some((s) => /your chosen leg/i.test(s))).toBe(false);
    fireEvent.click(radio(LEG_Q, 'Right'));
    expect(legendTexts().some((s) => /your chosen leg/i.test(s))).toBe(true);
    expect(legendTexts().some((s) => /operated leg/i.test(s))).toBe(false);
  });
});

describe('Setup: the two questions', () => {
  it('shows the leg question and the camera question, each a group of two real radios', () => {
    setup();
    for (const q of [LEG_Q, CAM_Q]) {
      const radios = within(group(q)).getAllByRole('radio');
      expect(radios).toHaveLength(2);
      radios.forEach((r) => expect(r).toHaveAttribute('type', 'radio'));
      expect(within(group(q)).getByText('Left')).toBeInTheDocument();
      expect(within(group(q)).getByText('Right')).toBeInTheDocument();
    }
    expect(document.querySelectorAll('fieldset legend')).toHaveLength(2);
  });

  it('preselects the side of the protocol and labels it', () => {
    setup({ side: 'right' });
    expect(radio(LEG_Q, 'Right')).toBeChecked();
    expect(radio(LEG_Q, 'Left')).not.toBeChecked();
    expect(within(group(LEG_Q)).getByText(LEG_TEXT.planLeg)).toBeInTheDocument();
    expect(within(group(LEG_Q)).getAllByText(LEG_TEXT.planLeg)).toHaveLength(1);
  });

  it('preselects the camera side of the chosen leg, because the guide puts the camera on that side', () => {
    setup({ side: 'right' });
    expect(radio(CAM_Q, 'Right')).toBeChecked();
  });

  it('shows no confirm note while the plan leg is chosen', () => {
    setup();
    expect(screen.queryByText(LEG_TEXT.otherLegConfirm)).toBeNull();
    expect(next()).toBeEnabled();
  });

  it('shows the neutral confirm note for the other leg and holds Next until the person continues', () => {
    setup({ side: 'left' });
    fireEvent.click(radio(LEG_Q, 'Right'));
    expect(screen.getByText(LEG_TEXT.otherLegConfirm)).toBeInTheDocument();
    expect(next()).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: LEG_TEXT.continueButton }));
    expect(next()).toBeEnabled();
  });

  it('asks again after the person goes back to the plan leg and chooses the other leg again', () => {
    setup({ side: 'left' });
    fireEvent.click(radio(LEG_Q, 'Right'));
    fireEvent.click(screen.getByRole('button', { name: LEG_TEXT.continueButton }));
    fireEvent.click(radio(LEG_Q, 'Left'));
    expect(screen.queryByText(LEG_TEXT.otherLegConfirm)).toBeNull();
    expect(next()).toBeEnabled();
    fireEvent.click(radio(LEG_Q, 'Right'));
    expect(next()).toBeDisabled();
  });

  it('moves the camera side with the leg only until the person chooses a camera side', () => {
    setup({ side: 'left' });
    fireEvent.click(radio(LEG_Q, 'Right'));
    expect(radio(CAM_Q, 'Right')).toBeChecked();
    fireEvent.click(radio(CAM_Q, 'Left'));
    fireEvent.click(radio(LEG_Q, 'Left'));
    fireEvent.click(radio(LEG_Q, 'Right'));
    expect(radio(CAM_Q, 'Left')).toBeChecked();
  });

  it('shows the far leg note when the camera is on the other side', () => {
    setup({ side: 'left' });
    expect(screen.queryByText(LEG_TEXT.farLeg)).toBeNull();
    fireEvent.click(radio(CAM_Q, 'Right'));
    expect(screen.getByText(LEG_TEXT.farLeg)).toBeInTheDocument();
    expect(next()).toBeEnabled(); // the note never blocks
  });

  it('uses no verdict word in the new texts', () => {
    const banned = /\b(correct|incorrect|good|bad|perfect|wrong|mistake|safe|dangerous|score|grade|pass|fail|goal|milestone)\b/i;
    for (const t of Object.values(LEG_TEXT)) expect(typeof t === 'string' ? t : t(12)).not.toMatch(banned);
  });
});

describe('Setup: return value notice', () => {
  it('shows the notice when the protocol has no return value for a rep exercise', () => {
    setup({ returnWithinDeg: undefined });
    expect(screen.getByText(LEG_TEXT.noReturnValue)).toBeInTheDocument();
  });

  it('shows no notice when the protocol has the value', () => {
    setup();
    expect(screen.queryByText(LEG_TEXT.noReturnValue)).toBeNull();
  });

  it('shows no notice for an exercise that counts no reps', () => {
    setup({ kind: 'straight-leg-raise', returnWithinDeg: undefined });
    expect(screen.queryByText(LEG_TEXT.noReturnValue)).toBeNull();
  });

  it('keeps the notice in the camera step', async () => {
    setup({ returnWithinDeg: undefined });
    fireEvent.click(next());
    expect(screen.getByText(LEG_TEXT.noReturnValue)).toBeInTheDocument();
  });
});

async function cameraRunning(over: Parameters<typeof setup>[0] = {}) {
  const result = setup(over);
  fireEvent.click(next());
  fireEvent.click(screen.getByRole('button', { name: 'Start camera' }));
  await screen.findByRole('button', { name: 'Start exercise' });
  return result;
}

const feed = (source: MockSource, lm: ReturnType<typeof readyLegOf>, to: number, from = 0) => {
  for (let t = from; t <= to; t += 100) act(() => source.emit(lm, t));
};

describe('Setup: the camera step uses the chosen leg', () => {
  it('checks the chosen leg: a right leg in view is ready when the right leg is chosen', async () => {
    const { source } = await cameraRunning({ side: 'right' });
    feed(source, readyLegOf('right'), 3500);
    expect(screen.getByTestId('instruction')).toHaveTextContent('The camera sees your hip, knee and ankle.');
  });

  it('asks a person who lies down (heel slide) to move the camera when only the other leg shows, and not to turn (F1, L1-05)', async () => {
    const { source } = await cameraRunning({ side: 'right' });
    feed(source, readyLegOf('left'), 3500);
    expect(screen.getByTestId('instruction')).toHaveTextContent(setupText('turn-leg', 'lying'));
    expect(screen.getByTestId('instruction').textContent).not.toMatch(/\bturn\b/i);
  });

  it('shows the resting angle with the label when the leg held still', async () => {
    const { source } = await cameraRunning();
    feed(source, readyLegOf('left', 20), 3500);
    expect(screen.getByText(LEG_TEXT.resting(Math.round(readFlexion('left'))))).toBeInTheDocument();
    expect(LEG_TEXT.resting(20)).toMatch(/estimated angle, not a medical measurement/i);
  });

  it('shows no resting angle before the leg held still', async () => {
    const { source } = await cameraRunning();
    feed(source, readyLegOf('left', 20), 800);
    expect(screen.queryByText(/Resting angle/)).toBeNull();
  });

  it('gives the chosen camera side to the setup check: a hidden far leg gets show-leg and not turn-leg', async () => {
    // Right leg chosen and camera on the left. The near left leg shows and the far right leg is hidden.
    const result = setup({ side: 'left' });
    fireEvent.click(radio(LEG_Q, 'Right'));
    fireEvent.click(screen.getByRole('button', { name: LEG_TEXT.continueButton }));
    fireEvent.click(radio(CAM_Q, 'Left'));
    fireEvent.click(next());
    fireEvent.click(screen.getByRole('button', { name: 'Start camera' }));
    await screen.findByRole('button', { name: 'Start exercise' });
    feed(result.source, readyLegOf('left'), 3500);
    expect(screen.getByTestId('instruction')).toHaveTextContent('Your hip, knee and ankle must show.');
  });

  it('hands the chosen leg, the camera side and the resting angle to the next screen', async () => {
    const { source, onReady } = await cameraRunning({ side: 'left' });
    feed(source, readyLegOf('left', 20), 3500);
    fireEvent.click(screen.getByRole('button', { name: 'Start exercise' }));
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(onReady.mock.calls[0]![0]).toEqual({ exerciseLeg: 'left', cameraSide: 'left', baselineDeg: expect.closeTo(readFlexion('left'), 3) });
  });

  it('hands over the other leg and the chosen camera side', async () => {
    const result = setup({ side: 'left' });
    fireEvent.click(radio(LEG_Q, 'Right'));
    fireEvent.click(screen.getByRole('button', { name: LEG_TEXT.continueButton }));
    fireEvent.click(radio(CAM_Q, 'Left'));
    fireEvent.click(next());
    fireEvent.click(screen.getByRole('button', { name: 'Start camera' }));
    await screen.findByRole('button', { name: 'Start exercise' });
    fireEvent.click(screen.getByRole('button', { name: 'Start exercise' }));
    expect(result.onReady.mock.calls[0]![0]).toMatchObject({ exerciseLeg: 'right', cameraSide: 'left' });
  });

  it('hands over no baseline when the person starts before the leg held still', async () => {
    const { source, onReady } = await cameraRunning();
    feed(source, readyLegOf('left', 20), 500);
    fireEvent.click(screen.getByRole('button', { name: 'Start exercise' }));
    expect(onReady.mock.calls[0]![0]).toMatchObject({ baselineDeg: null });
  });
});

// ---- Session ----------------------------------------------------------------

function session(over: { side?: Side; cameraSide?: Side; baselineDeg?: number | null; exercise?: Exercise } = {}) {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance', 'Date'] });
  const source = mockSource();
  const onEnd = vi.fn();
  render(
    <Session
      exercise={over.exercise ?? HEEL_SLIDE}
      side={over.side ?? 'left'}
      cameraSide={over.cameraSide}
      baselineDeg={'baselineDeg' in over ? over.baselineDeg : 0}
      source={source}
      sound={audioHarness().sound}
      onEnd={onEnd}
    />,
  );
  return { source, onEnd };
}
const tick = (ms = 250) => act(() => void vi.advanceTimersByTime(ms));

describe('Session: counting notices', () => {
  it('says that the protocol has no return value, counts no rep and still shows the angle', () => {
    const { source, onEnd } = session({ exercise: { ...HEEL_SLIDE, returnWithinDeg: undefined } });
    expect(screen.getByText(LEG_TEXT.noReturnValue)).toBeInTheDocument();
    playRep(source, 'left', 70);
    tick();
    expect(screen.getByText(/^reps?$/).previousElementSibling).toHaveTextContent('0');
    expect(screen.getByText('degrees').previousElementSibling).not.toHaveTextContent('--');
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(onEnd.mock.calls[0]![1]).toMatchObject({ reps: 0 });
    expect(onEnd.mock.calls[0]![1].peakFlexion).toBeGreaterThan(60);
  });

  it('finds the starting angle in place when Setup measured none, and counts no rep until it has one', () => {
    const { source } = session({ baselineDeg: null });
    act(() => source.emit(legLandmarks('left', 30), 0));
    tick();
    expect(screen.getByText(CAPTURE_TEXT.hold)).toBeInTheDocument();
    playRep(source, 'left', 70);
    tick();
    expect(screen.getByText(/^reps?$/).previousElementSibling).toHaveTextContent('0');
  });

  it('shows no counting notice when both values are present, and counts the rep', () => {
    const { source } = session({ baselineDeg: 20 });
    expect(screen.queryByText(LEG_TEXT.noReturnValue)).toBeNull();
    expect(screen.queryByText(CAPTURE_TEXT.hold)).toBeNull();
    playRep(source, 'left', 70); // the rep returns to 0, which is within 18 of the baseline of 20
    tick();
    expect(screen.getByText(/^reps?$/).previousElementSibling).toHaveTextContent('1');
  });
});

describe('Session: the chosen leg and the far leg note', () => {
  it('tracks the chosen right leg', () => {
    const { source } = session({ side: 'right' });
    playRep(source, 'right', 70);
    tick();
    expect(screen.getByText(/^reps?$/).previousElementSibling).toHaveTextContent('1');
  });

  it('does not count the movement of the other leg', () => {
    const { source } = session({ side: 'right' });
    playRep(source, 'left', 70);
    tick();
    expect(screen.getByText(/^reps?$/).previousElementSibling).toHaveTextContent('0');
  });

  it('shows the far leg note when the chosen leg is on the far side', () => {
    session({ side: 'left', cameraSide: 'right' });
    expect(screen.getByText(LEG_TEXT.farLeg)).toBeInTheDocument();
  });

  it('shows no far leg note for a near leg or an unknown camera side', () => {
    session({ side: 'left', cameraSide: 'left' });
    expect(screen.queryByText(LEG_TEXT.farLeg)).toBeNull();
    cleanup();
    session({ side: 'left' });
    expect(screen.queryByText(LEG_TEXT.farLeg)).toBeNull();
  });
});

describe('Session: the moving-leg note', () => {
  // Left chosen. The right leg swings and the left leg stays at 5 degrees. 13 seconds of frames: two windows in a row (F1, L1-08).
  const swing = (i: number, amp = 60) => (amp / 2) * (1 - Math.cos((2 * Math.PI * i) / 40));
  const run = (source: MockSource, left: (i: number) => number, right: (i: number) => number, from = 0, seconds = 13) => {
    let i = 0;
    for (let t = from; t <= from + seconds * 1000; t += 100, i++) act(() => source.emit(twoLegs(left(i), right(i)), t));
    return from + seconds * 1000 + 100;
  };

  it('shows no note after one window only: the note needs the other leg to win two windows in a row (F1)', () => {
    const { source } = session({ side: 'left', baselineDeg: 5 });
    run(source, () => 5, (i) => swing(i), 0, 7);
    tick();
    expect(screen.queryByText(LEG_TEXT.identity)).toBeNull();
  });

  it('shows the soft note when the other leg moves more over two windows in a row', () => {
    const { source } = session({ side: 'left', baselineDeg: 5 });
    run(source, () => 5, (i) => swing(i));
    tick();
    expect(screen.getByText(LEG_TEXT.identity)).toBeInTheDocument();
  });

  it('shows no note when the chosen leg moves', () => {
    const { source } = session({ side: 'left', baselineDeg: 0 });
    run(source, (i) => swing(i), () => 5);
    tick();
    expect(screen.queryByText(LEG_TEXT.identity)).toBeNull();
  });

  it('shows no note when both legs move, because both legs can move in a normal session', () => {
    const { source } = session({ side: 'left', baselineDeg: 0 });
    run(source, (i) => swing(i), (i) => swing(i, 55));
    tick();
    expect(screen.queryByText(LEG_TEXT.identity)).toBeNull();
  });

  it('works for the right leg as the chosen leg: the left leg moves', () => {
    const { source } = session({ side: 'right', baselineDeg: 5 });
    run(source, (i) => swing(i), () => 5);
    tick();
    expect(screen.getByText(LEG_TEXT.identity)).toBeInTheDocument();
  });

  it('never blocks: Stop and the knee button stay enabled and the note is not an alert', () => {
    const { source } = session({ side: 'left', baselineDeg: 5 });
    run(source, () => 5, (i) => swing(i));
    tick();
    expect(screen.getByRole('button', { name: 'Stop' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Knee gave way or hurts' })).toBeEnabled();
    expect(screen.getByText(LEG_TEXT.identity).closest('[role="alert"]')).toBeNull();
  });

  it('never switches the leg: the chosen leg still counts its rep after the note', () => {
    const { source, onEnd } = session({ side: 'left', baselineDeg: 0 });
    const t = run(source, () => 0, (i) => swing(i), 0, 13);
    tick();
    expect(screen.getByText(LEG_TEXT.identity)).toBeInTheDocument();
    playRep(source, 'left', 70, t);
    tick();
    expect(screen.getByText(/^reps?$/).previousElementSibling).toHaveTextContent('1');
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(onEnd.mock.calls[0]![1].reps).toBe(1);
  });

  it('never counts a rep for the other leg after the note', () => {
    const { source } = session({ side: 'left', baselineDeg: 0 });
    const t = run(source, () => 0, (i) => swing(i), 0, 13);
    playRep(source, 'right', 70, t);
    tick();
    expect(screen.getByText(/^reps?$/).previousElementSibling).toHaveTextContent('0');
  });

  it('says what to do and uses no verdict word', () => {
    expect(LEG_TEXT.identity).toMatch(/Make sure that the chosen leg is the one that moves/);
    expect(LEG_TEXT.identity).not.toMatch(/\b(wrong|correct|error|mistake)\b/i);
  });
});

// ---- App --------------------------------------------------------------------

describe('App: the choice reaches the pipeline and the record', () => {
  async function toSetup() {
    const db = freshDb();
    markPrivacyNoticeSeen();
    await saveProtocol(db, protocolText(), 'demo'); // the protocol side is left, the active phase is 1
    const source = mockSource();
    render(<App db={db} mode="demo" source={source} />);
    await screen.findByRole('heading', { level: 1, name: 'Today' });
    fireEvent.click(screen.getByRole('button', { name: 'Start Heel slide' }));
    fireEvent.click(screen.getByRole('button', { name: /none of these apply/i }));
    await screen.findByRole('heading', { level: 1, name: 'Set up the camera' });
    return { db, source };
  }

  it('passes the target flexion of the protocol to the position drawings', async () => {
    await toSetup();
    // The drawing of the end position (step 4 of the guide) shows the knee angle of the target (60 degrees in the example).
    fireEvent.click(screen.getByRole('button', { name: /^Step 4,/ }));
    expect(document.querySelector('.v2-guide .guide-figure')!.textContent).toContain(`60${String.fromCharCode(176)}`);
  });

  it('tracks and saves the unoperated leg when the person chooses it, and leaves the phase and protocol alone', async () => {
    const { db, source } = await toSetup();
    fireEvent.click(radio(LEG_Q, 'Right'));
    fireEvent.click(screen.getByRole('button', { name: LEG_TEXT.continueButton }));
    fireEvent.click(next());
    fireEvent.click(screen.getByRole('button', { name: 'Start camera' }));
    await screen.findByRole('button', { name: 'Start exercise' });
    feed(source, readyLegOf('right', 20), 3500);
    fireEvent.click(screen.getByRole('button', { name: 'Start exercise' }));
    await screen.findByRole('heading', { level: 1, name: 'Heel slide' });

    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance', 'Date'] });
    playRep(source, 'right', 70, 10000); // only the chosen leg moves. The protocol leg is left, so a pipeline on the protocol leg counts 0.
    act(() => void vi.advanceTimersByTime(250));
    vi.useRealTimers();
    expect(screen.getByText(/^reps?$/).previousElementSibling).toHaveTextContent('1');
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    await screen.findByRole('heading', { level: 1, name: 'Summary' });
    fireEvent.click(screen.getByRole('radio', { name: '1' }));
    fireEvent.click(screen.getByRole('radio', { name: /no swelling/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await screen.findByText('Session saved.');
    const [row] = await db.sessions.toArray();
    expect(row).toMatchObject({ legTracked: 'right', cameraSide: 'right', side: 'left', phase: 1, reps: 1 });
  });

  it('keeps the plan leg and the near camera side when the person changes nothing', async () => {
    const { db, source } = await toSetup();
    fireEvent.click(next());
    fireEvent.click(screen.getByRole('button', { name: 'Start camera' }));
    await screen.findByRole('button', { name: 'Start exercise' });
    feed(source, readyLegOf('left', 20), 3500);
    fireEvent.click(screen.getByRole('button', { name: 'Start exercise' }));
    await screen.findByRole('heading', { level: 1, name: 'Heel slide' });
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    await screen.findByRole('heading', { level: 1, name: 'Summary' });
    fireEvent.click(screen.getByRole('radio', { name: '1' }));
    fireEvent.click(screen.getByRole('radio', { name: /no swelling/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(async () => expect(await db.sessions.count()).toBe(1));
    expect((await db.sessions.toArray())[0]).toMatchObject({ legTracked: 'left', cameraSide: 'left', side: 'left' });
  });

  it('forgets the choice for the next session', async () => {
    await toSetup();
    fireEvent.click(radio(LEG_Q, 'Right'));
    expect(radio(LEG_Q, 'Right')).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await screen.findByRole('heading', { level: 1, name: 'Today' });
    fireEvent.click(screen.getByRole('button', { name: 'Start Heel slide' }));
    fireEvent.click(screen.getByRole('button', { name: /none of these apply/i }));
    await screen.findByRole('heading', { level: 1, name: 'Set up the camera' });
    expect(radio(LEG_Q, 'Left')).toBeChecked();
  });
});

