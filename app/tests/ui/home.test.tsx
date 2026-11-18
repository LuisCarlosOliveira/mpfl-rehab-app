import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadProtocol, type Protocol } from '../../src/lib/protocol';
import { generateProtocol, type GeneratorInputs } from '../../src/lib/protocolGen';
import { markExported, saveGeneratorInputs, saveSession } from '../../src/lib/storage';
import { ASK_SURGEON_ITEMS } from '../../src/ui/askSurgeon';
import { Home } from '../../src/ui/Home';
import { freshDb, protocolText, sessionInput } from './helpers';

beforeEach(() => localStorage.clear());
afterEach(cleanup);

const protocol = (over: Record<string, unknown> = {}): Protocol => {
  const r = loadProtocol(protocolText(over), 'demo');
  if (!r.ok) throw new Error(r.error.message);
  return r.protocol;
};

function setup(p: Protocol = protocol(), now = new Date('2026-03-20T10:00:00Z'), db = freshDb()) {
  const props = { onStart: vi.fn(), onLoadProtocol: vi.fn(), onOpenData: vi.fn() };
  const phase = p.phases.find((x) => x.id === p.activePhase);
  render(<Home protocol={p} phase={phase} activePhase={p.activePhase} db={db} now={() => now} {...props} />);
  return { db, ...props };
}

describe('Home screen', () => {
  it('shows who wrote and approved the protocol, the side and the active phase', () => {
    setup();
    expect(screen.getByText('Test clinic')).toBeInTheDocument();
    expect(screen.getByText('2026-01-02')).toBeInTheDocument();
    expect(screen.getByText('Left')).toBeInTheDocument();
    expect(screen.getByText('1, Protection')).toBeInTheDocument();
    expect(screen.queryByText(/no clinician approval recorded/i)).toBeNull();
  });

  it('shows "No clinician approval recorded" without an approval date', () => {
    setup(protocol({ approvedOn: undefined }));
    expect(screen.getByText('No clinician approval recorded')).toBeInTheDocument();
  });

  it('lists the exercises of the active phase only', () => {
    setup();
    expect(screen.getByText('Heel slide')).toBeInTheDocument();
    expect(screen.getByText('Straight leg raise')).toBeInTheDocument();
    expect(screen.queryByText('Mini squat')).toBeNull();
    expect(screen.getAllByText(/3 sets of 10 reps/)).toHaveLength(2);
  });

  it('starts an exercise from its button', () => {
    const { onStart } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Start Heel slide' }));
    expect(onStart).toHaveBeenCalledWith('heel-slide');
  });

  it('shows a surgeon field that is not set as "Ask your surgeon" and a set one as its value', () => {
    setup(protocol({ surgeon: { brace: 'Open brace for walking' } }));
    expect(screen.getByText('Open brace for walking')).toBeInTheDocument();
    const brace = screen.getByText('Brace').nextElementSibling!;
    expect(brace).toHaveTextContent('Open brace for walking');
    expect(screen.getByText('Weight bearing').nextElementSibling).toHaveTextContent('Ask your surgeon');
    expect(screen.getByText('Depth limit').nextElementSibling).toHaveTextContent('Ask your surgeon');
  });

  it('shows the fixed "Ask your surgeon" list with no value', () => {
    setup();
    for (const item of ASK_SURGEON_ITEMS) {
      expect(screen.getByText(item).nextElementSibling).toHaveTextContent(/^Ask your surgeon$/);
    }
  });

  it('shows text from the file as plain text, with no element and no link', () => {
    const markup = '<img src=x onerror=alert(1)>';
    setup(protocol({ authoredBy: markup }));
    expect(screen.getByText(markup)).toBeInTheDocument();
    expect(document.querySelector('img')).toBeNull();
    expect(document.querySelector('a')).toBeNull();
  });

  it('disables the start button of an exercise with no target and says "Ask your surgeon"', () => {
    const p = protocol({
      phases: [{ id: 1, name: 'Protection', exercises: [{ kind: 'heel-slide', source: 'test' }] }],
    });
    setup(p);
    // v3: an exercise that cannot start has no Start button. It sits under "Not in today's session" with its reason.
    expect(screen.queryByRole('button', { name: 'Start Heel slide' })).toBeNull();
    expect(screen.getByText(/target missing\. ask your surgeon/i)).toBeInTheDocument();
  });

  it('shows no export reminder with no sessions', () => {
    setup();
    expect(screen.getByText(/no export yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/7 days or more/i)).toBeNull();
  });

  it('shows the reminder when sessions exist and the last export is 7 days old or more', async () => {
    const db = freshDb();
    await saveSession(db, sessionInput());
    markExported(new Date('2026-03-10T10:00:00Z'));
    setup(protocol(), new Date('2026-03-20T10:00:00Z'), db);
    expect(await screen.findByText(/7 days or more since your last export/i)).toBeInTheDocument();
    expect(screen.getByText('2026-03-10')).toBeInTheDocument();
  });

  it('shows no reminder after a recent export', async () => {
    const db = freshDb();
    await saveSession(db, sessionInput());
    markExported(new Date('2026-03-18T10:00:00Z'));
    setup(protocol(), new Date('2026-03-20T10:00:00Z'), db);
    await screen.findByText('2026-03-18');
    expect(screen.queryByText(/7 days or more/i)).toBeNull();
  });

  it('has no Privacy notice button: it moved into My data (redesign)', () => {
    setup();
    expect(screen.queryByRole('button', { name: 'Privacy notice' })).toBeNull();
  });

  it('has a button that goes to the Load screen, with no call that erases sessions (U6)', () => {
    const { onLoadProtocol } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Load a new protocol file' }));
    expect(onLoadProtocol).toHaveBeenCalledTimes(1);
  });

  it('has no Your sessions or My data tile: the bottom bar of the app holds them (redesign)', () => {
    setup();
    expect(screen.queryByRole('button', { name: 'Sessions' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'My data' })).toBeNull();
  });

  it('has no button or word of progress (ux-flow 3.4)', () => {
    setup();
    expect(screen.queryByRole('button', { name: /progress/i })).toBeNull();
    expect(document.body.textContent).not.toMatch(/progress/i);
  });

  it('keeps the export date, the Ask your surgeon list and the new buttons together', () => {
    setup();
    const block = screen.getByRole('heading', { level: 2, name: 'Your data' }).parentElement!;
    expect(within(block).getByText(/last export/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Decisions for your surgeon' })).toBeInTheDocument();
  });

  it('keeps the surgeon list closed in a details element until the person opens it', () => {
    setup();
    const summary = screen.getByRole('heading', { level: 2, name: 'Decisions for your surgeon' }).closest('summary')!;
    const details = summary.closest('details')!;
    expect(details.open).toBe(false);
    expect(summary).toHaveTextContent(`${ASK_SURGEON_ITEMS.length + 5} items`);
    details.open = true; // jsdom does not toggle a details element on a click, so the test sets the state
    for (const item of ASK_SURGEON_ITEMS) expect(within(details).getByText(item)).toBeInTheDocument();
  });

  it('shows the end-position drawing of the next exercise in the card of today\'s session and the large Start of that exercise', () => {
    setup();
    expect(screen.getAllByRole('img', { name: /end position/i })).toHaveLength(1);
    const rows = within(screen.getByRole('list', { name: "Today's plan" })).getAllByRole('listitem');
    expect(rows[0]).toHaveAttribute('aria-current', 'step');
    // Without a handler for the session, the Start of the next exercise is the large button.
    expect(screen.getByRole('button', { name: 'Start Heel slide' })).toHaveClass('btn-lg');
  });

  it('shows the dose of an exercise as text in its row and hides every icon from assistive technology', () => {
    setup();
    expect(within(screen.getByRole('list', { name: "Today's plan" })).getAllByText(/3 sets of 10 reps/)).toHaveLength(2);
    for (const icon of document.querySelectorAll('svg:not([role="img"])')) expect(icon).toHaveAttribute('aria-hidden', 'true');
  });

  it('sets no inline style attribute (the CSP and the design rule)', () => {
    setup();
    expect(document.querySelectorAll('[style]')).toHaveLength(0);
  });
});

describe('Home, second camera entry (T12b)', () => {
  it('shows the phone button when the handler is given, and says what the phone does and does not do', () => {
    const p = protocol();
    const phase = p.phases.find((x) => x.id === p.activePhase);
    const onOpenCompanion = vi.fn();
    render(<Home protocol={p} phase={phase} activePhase={p.activePhase} db={freshDb()} now={() => new Date('2026-03-20T10:00:00Z')} onStart={vi.fn()} onLoadProtocol={vi.fn()} onOpenCompanion={onOpenCompanion} />);
    expect(screen.getByText(/records nothing and counts nothing/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Use this phone as the second camera' }));
    expect(onOpenCompanion).toHaveBeenCalledTimes(1);
  });

  it('shows no phone button without the handler', () => {
    setup();
    expect(screen.queryByRole('button', { name: /second camera/i })).toBeNull();
  });
});

// The progress row, the card and the last session line (design docs/progression-evaluation-design.md, 5.2).
describe('Home, check my progress', () => {
  const answers: GeneratorInputs = {
    writtenPlan: 'no', procedure: 'mpflr-only', ageBand: '18-plus', bothKnees: false, firstSurgery: 'yes', specialRules: 'no',
    surgeryDate: '2026-10-15', side: 'left', surgeonLimit: { kind: 'degrees', degrees: 60 }, phaseClearance: 'no', redFlags: {}, pain: 2, swelling: 'none',
  };
  const generated = (): Protocol => {
    const r = generateProtocol(answers, '2026-11-08');
    if (r.kind !== 'protocol') throw new Error('expected a plan');
    return { ...r.protocol, phases: r.protocol.phases.map((p) => ({ ...p, reviewDate: undefined })) };
  };
  const settle = () => act(async () => void (await new Promise((r) => setTimeout(r, 40))));
  async function home(day: string, p: Protocol = generated(), rows: Partial<ReturnType<typeof sessionInput>>[] = []) {
    const db = freshDb();
    await saveGeneratorInputs(db, answers as never);
    for (const r of rows) await saveSession(db, { ...sessionInput(), ...r });
    const onCheckProgress = vi.fn();
    const phase = p.phases.find((x) => x.id === p.activePhase);
    render(<Home protocol={p} phase={phase} activePhase={p.activePhase} db={db} now={() => new Date(`${day}T10:00:00`)} onStart={vi.fn()} onLoadProtocol={vi.fn()} onCheckProgress={onCheckProgress} />);
    await settle();
    return { onCheckProgress };
  }
  const CARD_TEXT = /You are in week \d+ after your surgery\. The app compares your sessions with published guidelines\. The app changes nothing\./;

  it('shows a quiet row with a plan made by the app in week 3, and it opens the screen', async () => {
    const { onCheckProgress } = await home('2026-11-08');
    expect(screen.queryByText(CARD_TEXT)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Check my progress' }));
    expect(onCheckProgress).toHaveBeenCalledTimes(1);
  });

  it('shows no row for a plan from a care team file', async () => {
    await home('2026-11-08', protocol());
    expect(screen.queryByRole('button', { name: 'Check my progress' })).toBeNull();
  });

  it('shows no row without the handler', async () => {
    const db = freshDb();
    await saveGeneratorInputs(db, answers as never);
    const p = generated();
    render(<Home protocol={p} phase={p.phases[0]} activePhase={1} db={db} now={() => new Date('2026-11-08T10:00:00')} onStart={vi.fn()} onLoadProtocol={vi.fn()} />);
    await settle();
    expect(screen.queryByRole('button', { name: 'Check my progress' })).toBeNull();
  });

  it('shows a card with the real week in week 8 with phase 1 active', async () => {
    await home('2026-12-10');
    expect(screen.getByText('You are in week 8 after your surgery. The app compares your sessions with published guidelines. The app changes nothing.')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Check my progress' })).toHaveLength(1);
  });

  it('shows the card when the review date has passed, before week 7', async () => {
    const p = generated();
    const withReview = { ...p, phases: p.phases.map((x) => ({ ...x, reviewDate: '2026-11-01' })) };
    await home('2026-11-08', withReview);
    expect(screen.getByText(CARD_TEXT)).toBeInTheDocument();
  });

  it('shows the row still in week 11, and nothing after week 11 except the plan end text', async () => {
    await home('2027-01-06'); // 83 days, week 11
    expect(screen.getByRole('button', { name: 'Check my progress' })).toBeInTheDocument();
    cleanup();
    await home('2027-01-07'); // 84 days, week 12
    expect(screen.queryByRole('button', { name: 'Check my progress' })).toBeNull();
    expect(screen.getByText('The app has no plan after week 11. Contact your care team for your next plan.')).toBeInTheDocument();
  });

  it('shows one line with the last session and its measured number, with no verdict', async () => {
    await home('2026-11-08', generated(), [{ date: '2026-11-05T10:00:00.000Z', peakFlexion: 84 }, { date: '2026-11-07T10:00:00.000Z', peakFlexion: 91 }]);
    const line = screen.getByText(/^Last session:/);
    expect(line.textContent).toBe('Last session: 2026-11-07, heel slide, peak knee bend 91 degrees (estimated angle, not a medical measurement).');
  });

  it('shows the last session line for a plan from a care team file too, and a rep count when there is no angle', async () => {
    await home('2026-11-08', protocol(), [{ exercise: 'straight-leg-raise', peakFlexion: null, reps: 12, date: '2026-11-07T10:00:00.000Z' }]);
    expect(screen.getByText('Last session: 2026-11-07, straight leg raise, 12 reps.')).toBeInTheDocument();
  });

  it('shows no last session line without sessions', async () => {
    await home('2026-11-08');
    expect(screen.queryByText(/^Last session:/)).toBeNull();
  });
});
