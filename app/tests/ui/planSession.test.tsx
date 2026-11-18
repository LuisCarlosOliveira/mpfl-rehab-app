import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Summary as PlainSummary } from '../../src/lib/exercises';
import { loadProtocol } from '../../src/lib/protocol';
import type { PlanEntry } from '../../src/ui/appState';
import { Home } from '../../src/ui/Home';
import { NextCard, SessionOverview } from '../../src/ui/PlanSession';
import { PlanProgress } from '../../src/ui/PlanProgress';
import { Session } from '../../src/ui/Session';
import { Setup } from '../../src/ui/Setup';
import { Summary } from '../../src/ui/Summary';
import { HEEL_SLIDE, audioHarness, exampleText, freshDb, mockSource, protocolText } from './helpers';
import { hasVerdictWord } from './verdict';

beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const summary: PlainSummary = { reps: 4, holds: null, peakFlexion: 62.3, topFlexion: null, topState: null, eventCounts: { nearLimit: 0, overLimit: 0, tooFast: 0 } };

describe('Home: Start today\'s session', () => {
  const protocol = () => {
    const r = loadProtocol(protocolText(), 'demo');
    if (!r.ok) throw new Error(r.error.message);
    return r.protocol;
  };
  const renderHome = (onStartSession = vi.fn()) => {
    const p = protocol();
    render(<Home protocol={p} phase={p.phases[0]} activePhase={1} db={freshDb()} now={() => new Date('2026-03-20T10:00:00Z')} onStart={vi.fn()} onStartSession={onStartSession} onLoadProtocol={vi.fn()} />);
    return onStartSession;
  };

  it('runs the exercises of the active phase in plan order', () => {
    const onStartSession = renderHome();
    fireEvent.click(screen.getByRole('button', { name: "Start today's session" }));
    expect(onStartSession).toHaveBeenCalledWith(['heel-slide', 'straight-leg-raise']);
  });

  it('keeps the single Start buttons as a second path, with no main style', () => {
    renderHome();
    const single = screen.getByRole('button', { name: 'Start Heel slide' });
    expect(single).not.toHaveClass('btn-primary');
    expect(screen.getByRole('button', { name: "Start today's session" })).toHaveClass('btn-primary');
  });

  it('shows no session button when the app gives no handler', () => {
    const p = protocol();
    render(<Home protocol={p} phase={p.phases[0]} activePhase={1} db={freshDb()} now={() => new Date()} onStart={vi.fn()} onLoadProtocol={vi.fn()} />);
    expect(screen.queryByRole('button', { name: "Start today's session" })).toBeNull();
  });
});

describe('PlanProgress', () => {
  it('names the place and marks it in the track', () => {
    render(<PlanProgress index={2} total={6} detail="3 sets" />);
    expect(screen.getByText('Exercise 3 of 6')).toBeInTheDocument();
    expect(screen.getByText('3 sets')).toBeInTheDocument();
    const marks = within(screen.getByRole('list', { name: 'Exercise 3 of 6' })).getAllByRole('listitem');
    expect(marks).toHaveLength(6);
    expect(marks[2]).toHaveAttribute('aria-current', 'step');
  });
});

describe('Next card', () => {
  const props = () => ({ name: 'Quadriceps set', index: 1, total: 3, onStart: vi.fn(), onSkip: vi.fn(), onStop: vi.fn() });

  it('names the next exercise and the place in the session', () => {
    render(<NextCard {...props()} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Next: Quadriceps set' })).toBeInTheDocument();
    expect(screen.getByText('Exercise 2 of 3')).toBeInTheDocument();
  });

  it('opens the exercise screen by itself after 5 seconds', () => {
    vi.useFakeTimers();
    const p = props();
    render(<NextCard {...p} />);
    act(() => void vi.advanceTimersByTime(4900));
    expect(p.onStart).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(200));
    expect(p.onStart).toHaveBeenCalledTimes(1);
  });

  it('Start now, Skip and Stop session call their handlers and stop the timer', () => {
    vi.useFakeTimers();
    const p = props();
    render(<NextCard {...p} />);
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    fireEvent.click(screen.getByRole('button', { name: 'Stop session' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start now' }));
    expect(p.onSkip).toHaveBeenCalledTimes(1);
    expect(p.onStop).toHaveBeenCalledTimes(1);
    expect(p.onStart).toHaveBeenCalledTimes(1);
    act(() => void vi.advanceTimersByTime(6000));
    expect(p.onStart).toHaveBeenCalledTimes(1);
  });

  it('a key press stops the timer, so the person has time to read', () => {
    vi.useFakeTimers();
    const p = props();
    render(<NextCard {...p} />);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Skip' }), { key: 'Tab' });
    act(() => void vi.advanceTimersByTime(8000));
    expect(p.onStart).not.toHaveBeenCalled();
  });

  it('shows no verdict word', () => {
    render(<NextCard {...props()} />);
    expect(hasVerdictWord(document.body.textContent ?? '')).toBeNull();
  });
});

describe('Session summary', () => {
  const entries: PlanEntry[] = [
    { kind: 'heel-slide', run: { reason: 'stop', summary } },
    { kind: 'quad-set', run: null },
    { kind: 'ankle-pump', run: { reason: 'stop', summary: { ...summary, reps: 7, peakFlexion: null } } },
  ];

  it('lists each exercise with its numbers and names a skipped one', () => {
    const onDone = vi.fn();
    render(<SessionOverview entries={entries} onDone={onDone} />);
    expect(screen.getByRole('heading', { level: 1, name: "Today's session" })).toBeInTheDocument();
    const items = screen.getAllByRole('listitem').filter((li) => li.matches('.overview-item'));
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('Heel slide');
    expect(items[0]).toHaveTextContent('4 reps');
    expect(items[0]).toHaveTextContent('62');
    expect(items[1]).toHaveTextContent('Quadriceps set');
    expect(items[1]).toHaveTextContent('Skipped');
    expect(items[2]).toHaveTextContent('7 reps');
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(onDone).toHaveBeenCalled();
  });

  it('shows no verdict word', () => {
    render(<SessionOverview entries={entries} onDone={vi.fn()} />);
    expect(hasVerdictWord(document.body.textContent ?? '')).toBeNull();
  });
});

describe('Done step (Summary in a session)', () => {
  const protocol = (() => {
    const r = loadProtocol(protocolText(), 'demo');
    if (!r.ok) throw new Error('fixture');
    return r.protocol;
  })();
  const renderDone = (over: { reason?: 'stop' | 'gave-way' } = {}) => {
    const onDone = vi.fn();
    const onStop = vi.fn();
    render(
      <Summary
        run={{ reason: over.reason ?? 'stop', summary }}
        exercise={HEEL_SLIDE}
        protocol={protocol}
        activePhase={1}
        redFlagBlocks={0}
        db={freshDb()}
        now={() => new Date('2026-03-04T10:00:00.000Z')}
        plan={{ index: 0, total: 3 }}
        onDone={onDone}
        onStop={onStop}
      />,
    );
    return { onDone, onStop };
  };

  it('is a short Done step with the plan progress', () => {
    renderDone();
    expect(screen.getByRole('heading', { level: 1, name: 'Done' })).toBeInTheDocument();
    expect(screen.getByText('Exercise 1 of 3')).toBeInTheDocument(); // v3: SessionProgress. The sets detail is not shown any more.
    expect(screen.getByText('Reps counted')).toBeInTheDocument();
  });

  it('skips the questions and goes on in one press', () => {
    const { onDone } = renderDone();
    fireEvent.click(screen.getByRole('button', { name: 'Skip the questions' }));
    return waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
  });

  it('saves the answers and goes on in one press', async () => {
    const { onDone } = renderDone();
    const save = screen.getByRole('button', { name: 'Save and continue' });
    expect(save).toBeDisabled();
    fireEvent.click(screen.getByRole('radio', { name: '2' }));
    fireEvent.click(screen.getByRole('radio', { name: 'No swelling' }));
    fireEvent.click(save);
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
  });

  it('stops the session when the answers start the pause rule', async () => {
    const { onDone, onStop } = renderDone();
    fireEvent.click(screen.getByRole('radio', { name: '9' }));
    fireEvent.click(screen.getByRole('radio', { name: 'No swelling' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save and continue' }));
    const end = await screen.findByRole('button', { name: 'End session' });
    expect(screen.getByText(/pause and contact your care team/i)).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
    fireEvent.click(end);
    expect(onStop).toHaveBeenCalledTimes(1);
  });
});

describe('Get ready card (Setup, second start)', () => {
  const base = (over: Record<string, unknown> = {}) => {
    const source = mockSource();
    const onReady = vi.fn();
    render(<Setup kind="heel-slide" side="left" exerciseName="Heel slide" source={source} sound={audioHarness().sound} onReady={onReady} onCancel={vi.fn()} compact initialLeg="right" initialCameraSide="right" plan={{ index: 1, total: 4 }} {...over} />);
    return { source, onReady };
  };

  it('shows one compact card with the stored leg and goes straight to the camera step', () => {
    base();
    expect(screen.getByRole('heading', { name: 'Get ready' })).toBeInTheDocument();
    expect(screen.getByText(/Right leg\. Camera on your right side\./)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start camera' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next: set up the camera' })).toBeNull();
    expect(screen.getByText('Exercise 2 of 4')).toBeInTheDocument();
  });

  it('shows the guide steps only after "Show the steps"', () => {
    base();
    expect(screen.queryByText(/Step 1 of/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Show the steps' }));
    expect(screen.getByText(/Step 1 of/)).toBeInTheDocument();
  });

  it('does not start the camera by itself without a running stream', () => {
    const { source } = base();
    expect(source.start).not.toHaveBeenCalled();
  });

  it('starts the same source again when the camera is already on', async () => {
    const { source } = base({ cameraKept: true });
    await waitFor(() => expect(source.start).toHaveBeenCalledTimes(1));
    expect(source.stop).not.toHaveBeenCalled();
  });

  it('a timer exercise has Show the steps and one Start exercise button', () => {
    const onReady = vi.fn();
    render(<Setup kind="quad-set" side="left" exerciseName="Quadriceps set" source={mockSource()} sound={audioHarness().sound} onReady={onReady} onCancel={vi.fn()} compact initialLeg="left" initialCameraSide="left" />);
    expect(screen.getByRole('button', { name: 'Show the steps' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start exercise' }));
    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it('stops a camera that is still on when the exercise needs none', () => {
    const source = mockSource();
    render(<Setup kind="quad-set" side="left" exerciseName="Quadriceps set" source={source} sound={audioHarness().sound} onReady={vi.fn()} onCancel={vi.fn()} compact />);
    expect(source.stop).toHaveBeenCalled();
  });

  it('the first start shows the full guide as before', () => {
    const source = mockSource();
    render(<Setup kind="heel-slide" side="left" exerciseName="Heel slide" source={source} sound={audioHarness().sound} onReady={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Next: set up the camera' })).toBeInTheDocument();
  });
});

describe('Session: progress and the camera between exercises', () => {
  const run = (over: Record<string, unknown> = {}) => {
    const source = mockSource();
    const onEnd = vi.fn();
    render(<Session exercise={HEEL_SLIDE} side="left" baselineDeg={0} source={source} sound={audioHarness().sound} onEnd={onEnd} plan={{ index: 2, total: 6 }} {...over} />);
    return { source, onEnd };
  };

  it('shows the place in the session and the set of the exercise', () => {
    run();
    expect(screen.getByText('Exercise 3 of 6')).toBeInTheDocument();
    expect(screen.getByText('Set 1 of 3', { selector: '.plan-progress *' })).toBeInTheDocument();
  });

  it('stops the camera at the end of an exercise by default', () => {
    const { source } = run();
    fireEvent.click(screen.getByRole('button', { name: /^\W*Stop$/ }));
    expect(source.stop).toHaveBeenCalled();
  });

  it('leaves the camera on at the end when the next exercise uses it', () => {
    const { source, onEnd } = run({ keepCamera: true });
    fireEvent.click(screen.getByRole('button', { name: /^\W*Stop$/ }));
    expect(onEnd).toHaveBeenCalledTimes(1);
    cleanup();
    expect(source.stop).not.toHaveBeenCalled();
  });

  it('stops the camera on "Knee gave way or hurts", even when it would stay on', () => {
    const { source } = run({ keepCamera: true });
    fireEvent.click(screen.getByRole('button', { name: /Knee gave way or hurts/ }));
    expect(source.stop).toHaveBeenCalled();
  });
});

void exampleText;
