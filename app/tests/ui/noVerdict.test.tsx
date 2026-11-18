import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadProtocol } from '../../src/lib/protocol';
import { MESSAGES, RED_FLAGS } from '../../src/lib/redflags';
import { allCueTexts } from '../../src/lib/cues';
import type { Summary as RunSummary } from '../../src/lib/exercises';
import { App } from '../../src/ui/App';
import { Home } from '../../src/ui/Home';
import { LoadProtocol } from '../../src/ui/LoadProtocol';
import { Privacy } from '../../src/ui/Privacy';
import { RedFlag } from '../../src/ui/RedFlag';
import { Session } from '../../src/ui/Session';
import { Setup } from '../../src/ui/Setup';
import { Summary } from '../../src/ui/Summary';
import { HEEL_SLIDE, audioHarness, exampleText, freshDb, mockSource, playRep, protocolText } from './helpers';
import { hasVerdictWord } from './verdict';

beforeEach(() => localStorage.clear());
afterEach(cleanup);

const text = () => document.body.textContent ?? '';
const expectNoVerdict = (label: string) => {
  const hit = hasVerdictWord(text());
  expect(hit, `${label}: verdict word "${hit}" in: ${text()}`).toBeNull();
};

const protocol = (() => {
  const r = loadProtocol(exampleText(), 'demo');
  if (!r.ok) throw new Error('fixture');
  return r.protocol;
})();

const summary: RunSummary = {
  reps: 3,
  holds: null,
  peakFlexion: 55,
  topFlexion: 12,
  topState: null,
  eventCounts: { nearLimit: 0, overLimit: 0, tooFast: 0 },
};

describe('no verdict word on any screen', () => {
  it('Privacy', () => {
    render(<Privacy onDone={vi.fn()} />);
    expectNoVerdict('Privacy');
  });

  it('Load protocol, with and without an error', async () => {
    render(<LoadProtocol db={freshDb()} mode="patient" onLoaded={vi.fn()} />);
    expectNoVerdict('Load');
    fireEvent.change(screen.getByLabelText('Choose a file from your care team'), {
      target: { files: [new File([exampleText()], 'p.json')] },
    });
    await screen.findByRole('alert');
    expectNoVerdict('Load with error');
    cleanup();
    render(<LoadProtocol db={freshDb()} mode="patient" onLoaded={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Choose a file from your care team'), {
      target: { files: [new File([protocolText({ approvedOn: undefined })], 'p.json')] },
    });
    await screen.findByRole('alert');
    expectNoVerdict('Load with approval error');
  });

  it('Home', () => {
    render(<Home protocol={protocol} phase={protocol.phases[0]} activePhase={1} db={freshDb()} now={() => new Date()} onStart={vi.fn()} onLoadProtocol={vi.fn()} />);
    expectNoVerdict('Home');
  });

  it('RedFlag, clear and with every item ticked', () => {
    render(<RedFlag onClear={vi.fn()} onBlocked={vi.fn()} onCancel={vi.fn()} />);
    expectNoVerdict('RedFlag');
    for (const flag of RED_FLAGS) fireEvent.click(screen.getByLabelText(flag.text));
    expect(text()).toContain(MESSAGES.emergency);
    expectNoVerdict('RedFlag blocked');
  });

  it('Setup, with an error', async () => {
    const source = mockSource();
    source.nextStart = { ok: false, error: { kind: 'no-device', message: 'No camera was found. Connect a camera, then try again.' } };
    render(<Setup kind="heel-slide" side="left" exerciseName="Heel slide" source={source} sound={audioHarness().sound} onReady={vi.fn()} onCancel={vi.fn()} />);
    expectNoVerdict('Setup guide');
    fireEvent.click(screen.getByRole('button', { name: 'Next: set up the camera' }));
    expectNoVerdict('Setup');
    fireEvent.click(screen.getByRole('button', { name: 'Start camera' }));
    await screen.findByRole('alert');
    expectNoVerdict('Setup with error');
  });

  it('Session, with every cue', () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance', 'Date'] });
    try {
      const source = mockSource();
      render(<Session exercise={HEEL_SLIDE} side="left" source={source} sound={audioHarness().sound} onEnd={vi.fn()} />);
      expectNoVerdict('Session');
      for (const peak of [30, 85, 120]) {
        playRep(source, 'left', peak);
        vi.advanceTimersByTime(250);
        expectNoVerdict(`Session peak ${peak}`);
      }
      for (const cue of allCueTexts()) expect(hasVerdictWord(cue), cue).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('Summary, before and after the save, with the pause message', async () => {
    render(
      <Summary
        run={{ reason: 'gave-way', summary }}
        exercise={HEEL_SLIDE}
        protocol={protocol}
        activePhase={1}
        redFlagBlocks={0}
        db={freshDb()}
        now={() => new Date()}
        onDone={vi.fn()}
      />,
    );
    expectNoVerdict('Summary');
    fireEvent.click(screen.getByRole('radio', { name: '9' }));
    fireEvent.click(screen.getByRole('radio', { name: /more than before/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await screen.findByText('Session saved.');
    expectNoVerdict('Summary saved');
  });

  it('the whole app, from the first launch to the summary', async () => {
    render(<App db={freshDb()} mode="demo" source={mockSource()} />);
    await screen.findByRole('heading', { name: 'Privacy' });
    expectNoVerdict('App privacy');
    fireEvent.click(screen.getByRole('button', { name: 'I understand' }));
    await screen.findByRole('heading', { name: 'Load protocol file' });
    fireEvent.change(screen.getByLabelText('Choose a file from your care team'), { target: { files: [new File([exampleText()], 'p.json')] } });
    await screen.findByRole('heading', { name: 'Today' });
    expectNoVerdict('App home');
  });
});
