// UI redesign v2, package C. Tests for the new layout of the question screens, the plan, Your sessions, My data,
// Confirm, pairing, the error screen, Privacy and Load. Safety texts are pinned in the older test files.
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useSyncExternalStore } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { draftOf, describeChanges, type PlanDraft } from '../../src/lib/planView';
import { generateProtocol, type GeneratorInputs } from '../../src/lib/protocolGen';
import { createPairing } from '../../src/pairing/pairing';
import { saveSession } from '../../src/lib/storage';
import { Dashboard } from '../../src/ui/Dashboard';
import { DataScreen } from '../../src/ui/DataScreen';
import { ConfirmPlan } from '../../src/ui/ConfirmPlan';
import { LoadError } from '../../src/ui/LoadError';
import { LoadProtocol } from '../../src/ui/LoadProtocol';
import { Onboarding } from '../../src/ui/Onboarding';
import { PairCompanion } from '../../src/ui/PairCompanion';
import { PairHost } from '../../src/ui/PairHost';
import { PlanResult } from '../../src/ui/PlanResult';
import { Privacy } from '../../src/ui/Privacy';
import { StepTrack } from '../../src/ui/StepTrack';
import { FakePeer, makePeer } from '../pairing-ui/fakeRtc';
import { freshDb, sessionInput } from './helpers';
import { installDialogStub, session } from './t11helpers';

vi.mock('../../src/lib/protocol/trustedFlag', () => ({ trustedFlag: () => true }));

beforeEach(() => {
  localStorage.clear();
  installDialogStub();
  FakePeer.reset();
  HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve());
});
afterEach(cleanup);

const TODAY = '2026-11-08';
const inputs = (over: Partial<GeneratorInputs> = {}): GeneratorInputs => ({
  writtenPlan: 'no', procedure: 'mpflr-only', ageBand: '18-plus', bothKnees: false, firstSurgery: 'yes', specialRules: 'no',
  surgeryDate: '2026-10-15', side: 'left', surgeonLimit: { kind: 'degrees', degrees: 60 }, phaseClearance: 'no', redFlags: {}, pain: 2, swelling: 'none',
  ...over,
});
type PlanOnly = Extract<PlanDraft, { kind: 'plan' }>;
const draftFor = (over: Partial<GeneratorInputs> = {}) => {
  const i = inputs(over);
  return draftOf(generateProtocol(i, TODAY), 'create', i) as PlanOnly;
};

describe('StepTrack', () => {
  it('draws one mark for each step and names the current one', () => {
    render(<StepTrack total={11} current={6} label="Question 7 of 11" />);
    const list = screen.getByRole('list', { name: 'Question 7 of 11' });
    expect(list.querySelectorAll('li')).toHaveLength(11);
    expect(list.querySelectorAll('[aria-current="step"]')).toHaveLength(1);
    expect(list.querySelectorAll('li')[6]).toHaveAttribute('aria-current', 'step');
  });
  it('guards a hostile count and a hostile position', () => {
    const { container, rerender } = render(<StepTrack total={Number.NaN} current={Number.NaN} label="x" />);
    expect(container.querySelectorAll('li')).toHaveLength(0);
    rerender(<StepTrack total={3} current={99} label="x" />);
    expect(container.querySelectorAll('[aria-current="step"]')).toHaveLength(1);
    expect(container.querySelectorAll('li')[2]).toHaveAttribute('aria-current', 'step');
  });
});

describe('C1 question screens', () => {
  it('shows a track of marks, with Back before Next, under the root class', () => {
    const { container } = render(<Onboarding today={TODAY} onDone={vi.fn()} onCancel={vi.fn()} />);
    expect(container.querySelector('.v2-screens')).not.toBeNull();
    const track = container.querySelector('.step-track')!;
    expect(track.querySelectorAll('li').length).toBeGreaterThan(5);
    expect(screen.getByText(/^Question 1 of \d+$/)).toBeInTheDocument();
    const buttons = [...container.querySelectorAll('.action-bar button')].map((b) => b.textContent);
    expect(buttons).toEqual(['Back', 'Next']);
  });
});

describe('C2 plan as dose rows', () => {
  it('shows each exercise as a row with the name and the dose, and no card', () => {
    const { container } = render(<PlanResult draft={draftFor()} onUse={vi.fn()} onBack={vi.fn()} />);
    // The plan list only. The home exercise rows use the same classes, and one of them has the dose text 'How many: ask your care team' (no number).
    const rows = container.querySelectorAll('[aria-label="Exercises in your plan"] .dose-row');
    expect(rows.length).toBeGreaterThan(0);
    expect(container.querySelector('.dose-list .card')).toBeNull();
    for (const row of rows) {
      expect(row.querySelector('.dose-name')?.textContent).toBeTruthy();
      // The straight leg raise shows the whole dose range. The heel slide has no dose in the guideline, so its row asks the care team.
      expect(row.querySelector('.dose')?.textContent).toMatch(/^(2 sets of 10 to 15, then 3 sets as tolerated|How many: ask your care team)$/);
      expect(row.textContent).not.toMatch(/undefined|NaN/);
    }
    expect(screen.getByText('Generated by the app from published protocols. Not approved by a clinician.')).toBeInTheDocument();
  });
});

describe('C3 Your sessions', () => {
  const list = () => [
    session({ date: '2026-11-01T10:00:00.000Z', exercise: 'heel-slide', peakFlexion: 126.199999, reps: 8, pain: 3 }),
    session({ date: '2026-11-02T10:00:00.000Z', exercise: 'heel-slide', peakFlexion: 135.2345, reps: 6, pain: 4 }),
    session({ date: '2026-11-03T10:00:00.000Z', exercise: 'mini-squat', peakFlexion: 90, reps: 5, pain: 1 }),
  ];

  it('rounds raw numbers in every table cell to whole numbers (D4, C-07)', () => {
    const { container } = render(<Dashboard sessions={list()} onBack={vi.fn()} />);
    const cells = [...container.querySelectorAll('td')].map((c) => c.textContent ?? '');
    expect(cells.some((t) => t.includes('126 '))).toBe(true);
    for (const t of cells) expect(t).not.toMatch(/\d\.\d/);
    expect(container.textContent).not.toMatch(/\d\.\d/);
  });

  it('has a stat strip with the last peak, the range, and a legend list with counts and no percent', () => {
    const { container } = render(<Dashboard sessions={list()} onBack={vi.fn()} />);
    const strip = container.querySelector('.stat-strip')!;
    expect(strip).toHaveTextContent('Last peak knee bend');
    expect(strip.querySelector('.stat-number')).toHaveTextContent('90');
    expect(strip).toHaveTextContent('degrees');
    expect(strip).toHaveTextContent(/estimated angle, not a medical measurement/i);
    expect(strip).toHaveTextContent('3 sessions');
    expect(strip).toHaveTextContent('1 Nov 2026 to 3 Nov 2026');
    const legend = within(container as HTMLElement).getByRole('list', { name: 'Exercises in your sessions' });
    const heel = within(legend).getByText('Heel slide').closest('li')!;
    expect(heel).toHaveTextContent('2 sessions');
    expect(heel).not.toHaveTextContent(/reps/);
    expect(legend.textContent).not.toMatch(/%/);
  });

  it('shows a read-out line for each chart with the date, the value and the word estimated', () => {
    const { container } = render(<Dashboard sessions={list()} onBack={vi.fn()} />);
    const readout = container.querySelector('.dash-chart .dash-readout')!;
    expect(readout).toHaveTextContent('2 Nov 2026');
    expect(readout).toHaveTextContent('estimated');
  });

  it('says 0 sessions in an empty block, and says what to do', () => {
    const { container } = render(<Dashboard sessions={[]} onBack={vi.fn()} />);
    const empty = container.querySelector('.empty')!;
    expect(empty).toHaveTextContent('0 sessions');
    expect(empty).toHaveTextContent('Start an exercise on Home');
    expect(container.querySelector('.stat-strip')).toBeNull();
  });

  it('survives a session with a missing peak and a peak that is not a number', () => {
    const odd = [session({ exercise: 'mini-squat', peakFlexion: null, reps: null }), session({ exercise: 'heel-slide', peakFlexion: Number.NaN })];
    const { container } = render(<Dashboard sessions={odd} onBack={vi.fn()} />);
    expect(container.textContent).not.toMatch(/NaN|undefined/);
  });
});

describe('C3 hostile stored sessions', () => {
  it('shows a hostile exercise name as plain text and does not crash', () => {
    const rows = ['__proto__', 'constructor', 'W'.repeat(3000), '<img src=x onerror=1>'].map((exercise, i) =>
      session({ exercise: exercise as never, peakFlexion: i % 2 ? 1e308 : 100, reps: i === 0 ? 1e308 : 5 }),
    );
    const { container } = render(<Dashboard sessions={rows} onBack={vi.fn()} />);
    expect(container.querySelector('.legend-list')?.textContent).toContain('<img src=x onerror=1>');
    expect(container.querySelector('.legend-list img')).toBeNull();
    expect(container.textContent).not.toMatch(/Infinity|NaN/);
  });
});

describe('C4 My data', () => {
  it('names the count on the export buttons and has plain sections', async () => {
    const db = freshDb();
    await saveSession(db, sessionInput());
    const { container } = render(<DataScreen db={db} onBack={vi.fn()} onErased={vi.fn()} onOpenPrivacy={vi.fn()} onOpenClinician={vi.fn()} />);
    await screen.findByRole('button', { name: 'Export 1 session as JSON' });
    expect(screen.getByRole('button', { name: 'Export 1 session as CSV' })).toBeInTheDocument();
    expect(container.querySelector('.v2-screens')).not.toBeNull();
    expect(container.querySelectorAll('.card')).toHaveLength(0);
    expect(['Export', 'Import', 'Erase'].every((n) => screen.getByRole('heading', { level: 2, name: n }))).toBe(true);
    expect(screen.getByRole('button', { name: /Privacy notice/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open a session file/ })).toBeInTheDocument();
  });

  it('says File saved with the file name after a download', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    const db = freshDb();
    await saveSession(db, sessionInput());
    render(<DataScreen db={db} onBack={vi.fn()} onErased={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Export 1 session as JSON' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/^File saved: mpfl-sessions-\d{4}-\d{2}-\d{2}\.json/));
  });
});

describe('C5 Confirm: before and after, and no internal code (D5)', () => {
  it('shows Before and After for a changed limit with plain words', async () => {
    const db = freshDb();
    const current = draftFor({ surgeonLimit: { kind: 'degrees', degrees: 60 } }).protocol;
    const next = draftFor({ surgeonLimit: { kind: 'degrees', degrees: 50 } });
    const draft = { ...draftOf(generateProtocol(inputs({ surgeonLimit: { kind: 'degrees', degrees: 50 } }), TODAY), 'update', next.inputs) as PlanOnly, changes: describeChanges(current, next.protocol), hold: null };
    const { container } = render(<ConfirmPlan db={db} mode="demo" draft={draft} current={current} onAccepted={vi.fn()} onKeep={vi.fn()} />);
    const row = container.querySelector('.change-row')!;
    expect(row.querySelector('.before')).toHaveTextContent('60 degrees');
    expect(row.querySelector('.after')).toHaveTextContent('50 degrees');
    expect(container.textContent).not.toMatch(/[A-Z]{3,}_[A-Z]{3,}/);
    expect(container.textContent).not.toContain('RANGE_SURGEON');
  });
});

describe('C6 pairing one step at a time', () => {
  function Harness({ pairing }: { pairing: ReturnType<typeof createPairing> }) {
    const view = useSyncExternalStore(pairing.subscribe, pairing.getView);
    const deps = { startCamera: vi.fn(async () => ({ ok: true as const, stream: {} as MediaStream })), stopCamera: vi.fn(), startScan: vi.fn(() => vi.fn()) };
    return <PairHost pairing={pairing} view={view} onDone={vi.fn()} onSkip={vi.fn()} deps={deps} />;
  }
  it('shows the code first, then the scan after Next', async () => {
    const pairing = createPairing({ createPeer: makePeer });
    render(<Harness pairing={pairing} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start pairing' }));
    await screen.findByRole('img', { name: 'Pairing code of this laptop' });
    expect(screen.queryByLabelText('Or paste the phone code')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('Waiting for the phone');
    fireEvent.click(screen.getByRole('button', { name: 'Next: scan the phone code' }));
    expect(screen.getByLabelText('Or paste the phone code')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Pairing code of this laptop' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Back to the code' }));
    expect(screen.getByRole('img', { name: 'Pairing code of this laptop' })).toBeInTheDocument();
  });
  it('companion names the current step in a track', () => {
    render(<PairCompanion onExit={vi.fn()} />);
    const steps = screen.getByRole('list', { name: 'Pairing steps' });
    expect(steps.querySelectorAll('li')).toHaveLength(3);
    expect(steps.querySelector('[aria-current="step"]')).toHaveTextContent('Start');
  });
});

describe('C7 error screen', () => {
  it('shows an icon, a title, one text and the two ways on, in one column', () => {
    function Boom(): never {
      throw new Error('chunk');
    }
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const onBack = vi.fn();
    const { container } = render(
      <LoadError onBack={onBack}>
        <Boom />
      </LoadError>,
    );
    const root = container.querySelector('.state-screen')!;
    expect(root.className).toContain('v2-screens');
    expect(root.querySelector('.state-icon svg')).not.toBeNull();
    expect(within(root as HTMLElement).getByRole('heading', { level: 1, name: 'Screen not loaded' })).toHaveFocus();
    expect(root.querySelectorAll('p')).toHaveLength(1);
    expect(root.querySelectorAll('button')).toHaveLength(2);
    expect(root.querySelector('.notice')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Back to Home' }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});

describe('C8 Privacy and Load rows', () => {
  it('shows each privacy point as a row with a bold line and a grey line', () => {
    const { container } = render(<Privacy onDone={vi.fn()} />);
    const rows = container.querySelectorAll('li.point');
    expect(rows).toHaveLength(4);
    for (const row of rows) {
      expect(row.querySelector('.row-title')?.textContent).toBeTruthy();
      expect(row.querySelector('.row-detail')?.textContent).toBeTruthy();
    }
  });
  it('shows Load as action rows and the file row opens the picker', () => {
    const { container } = render(<LoadProtocol db={freshDb()} mode="demo" onLoaded={vi.fn()} onCreatePlan={vi.fn()} />);
    const rows = container.querySelectorAll('.action-row');
    expect(rows).toHaveLength(2);
    expect(screen.getByLabelText('Choose a file from your care team')).toHaveAttribute('type', 'file');
    expect(screen.getByRole('button', { name: /Create my plan/ })).toBeInTheDocument();
  });
});
