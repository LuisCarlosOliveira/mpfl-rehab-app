// The screen "Check my progress" (design docs/progression-evaluation-design.md, step 3). It is read only.
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PROTOTYPE_BANNER } from '../../src/lib/mode';
import type { Protocol } from '../../src/lib/protocol';
import { generateProtocol, type GeneratorInputs } from '../../src/lib/protocolGen';
import { allProgressTexts, CHECK_SCREEN } from '../../src/lib/progressCheck';
import { PAUSE_MESSAGE } from '../../src/lib/safety';
import { markPrivacyNoticeSeen, saveGeneratorInputs, saveSession, type MpflDb, type StoredInputs } from '../../src/lib/storage';
import { App } from '../../src/ui/App';
import { CheckProgress } from '../../src/ui/CheckProgress';
import { HOLD_EVENT } from '../../src/ui/UpdatePlan';
import { freshDb, mockSource, sessionInput } from './helpers';
import { hasVerdictWord } from './verdict';

beforeEach(() => localStorage.clear());
afterEach(cleanup);

const inputs: GeneratorInputs = {
  writtenPlan: 'no', procedure: 'mpflr-only', ageBand: '18-plus', bothKnees: false, firstSurgery: 'yes', specialRules: 'no',
  surgeryDate: '2026-10-15', side: 'left', surgeonLimit: { kind: 'degrees', degrees: 60 }, phaseClearance: 'no', redFlags: {}, pain: 2, swelling: 'none',
};
/** A plan that the app made on 2026-11-08. */
const generated = (): Protocol => {
  const r = generateProtocol(inputs, '2026-11-08');
  if (r.kind !== 'protocol') throw new Error('expected a plan');
  return r.protocol;
};
const TODAY = '2026-12-10'; // week 8 after the surgery date

async function seed(db: MpflDb, rows: Partial<ReturnType<typeof sessionInput>>[] = []) {
  await saveGeneratorInputs(db, inputs as unknown as StoredInputs);
  for (const r of rows) await saveSession(db, { ...sessionInput(), date: '2026-11-20T10:00:00.000Z', ...r });
}

async function open(rows: Partial<ReturnType<typeof sessionInput>>[] = []) {
  const db = freshDb();
  await seed(db, rows);
  const handlers = { onUpdate: vi.fn(), onBack: vi.fn() };
  const view = render(<CheckProgress db={db} protocol={generated()} today={TODAY} {...handlers} />);
  await screen.findByRole('heading', { level: 1, name: 'Check my progress' });
  await screen.findByText('Not approved by a clinician.');
  return { db, view, ...handlers };
}

describe('Check my progress', () => {
  it('shows the week, the phase and the date of surgery at the top, and the guidelines behind a closed details', async () => {
    const { view } = await open([{ peakFlexion: 84 }]);
    expect(screen.getByText(CHECK_SCREEN.lede)).toBeInTheDocument();
    const facts = view.container.querySelector('.check-facts') as HTMLElement;
    expect(facts.textContent).toContain('Week 8 (the ninth week after surgery)');
    expect(facts.textContent).toContain('Phase 1');
    expect(facts.textContent).toContain('15 October 2026');
    const details = view.container.querySelector('details.check-more') as HTMLDetailsElement;
    expect(details.open).toBe(false);
    expect(details.querySelector('summary')?.textContent).toBe('Guidelines the app cannot measure');
    for (const label of ['Reported by you', 'The app cannot measure this']) expect(within(details).getAllByText(label).length).toBeGreaterThan(0);
    expect(within(details).queryByText('Measured by the app')).toBeNull();
    for (const title of ['Knee bend, heel slide', 'Safety events', 'Reps and sets', 'Knee bend against the limit in your plan']) expect(within(details).queryByText(title)).toBeNull();
    for (const title of ['Full knee extension', 'Pain after a session', 'Swelling', 'End of phase 2']) expect(within(details).getByText(title)).toBeInTheDocument();
    expect(screen.getAllByText(/Peak knee bend, heel slide, last session: 84 degrees \(estimated angle, not a medical measurement\)/)).toHaveLength(1); // E1 and E11 hold the same line, the screen shows it once
  });

  it('lists the last sessions with the date, the exercise and the number, and the angle label for a camera angle', async () => {
    const { view } = await open([{ peakFlexion: 84 }]);
    const list = view.container.querySelector('.check-sessions') as HTMLElement;
    expect(within(list).getByText('2026-11-20')).toBeInTheDocument();
    expect(within(list).getByText('heel slide')).toBeInTheDocument();
    expect(within(list).getByText('peak knee bend 84 degrees')).toBeInTheDocument();
    expect(within(list).getByText('estimated angle, not a medical measurement')).toBeInTheDocument();
  });

  it('says that the app has no saved session, and "No heel slide done yet"', async () => {
    await open([]);
    expect(screen.getByText(CHECK_SCREEN.noSessions)).toBeInTheDocument();
    expect(screen.getByText('No heel slide done yet')).toBeInTheDocument();
  });

  it('shows Not enough data for a person with no session', async () => {
    await open([]);
    expect(screen.getAllByText('Not enough data').length).toBeGreaterThan(0);
  });

  it('shows the prototype banner above the screen, in the whole app', async () => {
    const db = freshDb();
    await seed(db);
    markPrivacyNoticeSeen();
    const generatedRaw = JSON.stringify({ ...generated(), approvedOn: undefined });
    await db.protocol.put({ key: 'current', raw: generatedRaw, savedAt: '2026-11-08T00:00:00.000Z' });
    render(<App db={db} mode="demo" source={mockSource()} now={() => new Date(2026, 11, 10, 10, 0, 0)} />);
    await screen.findByRole('heading', { level: 1, name: 'Home' });
    fireEvent.click(await screen.findByRole('button', { name: 'Check my progress' }));
    await screen.findByRole('heading', { level: 1, name: 'Check my progress' });
    expect(screen.getByText(PROTOTYPE_BANNER)).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Update my plan' }));
    await screen.findByRole('heading', { level: 1, name: 'Update my plan' });
  });

  it('has no verdict word, no verdict class and no inline style', async () => {
    const { view } = await open([{ peakFlexion: 84 }, { pain: 3, date: '2026-11-21T10:00:00.000Z' }]);
    expect(hasVerdictWord(view.container.textContent ?? '')).toBeNull();
    expect(view.container.textContent).not.toMatch(/\b\d+ of \d+\b/);
    expect(view.container.querySelector('[style]')).toBeNull();
    const classes = [...view.container.querySelectorAll('[class]')].flatMap((e) => [...e.classList]);
    // Changed on purpose (v3 forms): the check reads each part of a class name. The old substring check matched "met" inside the v3 class "v3-metric".
    for (const c of classes) for (const part of c.split('-')) expect(part, c).not.toMatch(/^(pass|fail|good|bad|success|danger|error|ok|met|goal|score|green|red)$/i);
  });

  it('lists a safety event with its date first, shows HOLD_EVENT and no forward-move prompt', async () => {
    const { view } = await open([{ gaveWayPresses: 1 }, { peakFlexion: 84, date: '2026-11-21T10:00:00.000Z' }]);
    expect(screen.getByText(HOLD_EVENT)).toBeInTheDocument();
    const event = screen.getByText(/pressed "Knee gave way or hurts"/);
    expect(event.textContent).toMatch(/2026-11-20/);
    const firstRow = screen.getByRole('heading', { level: 2, name: 'Your last sessions' });
    expect(event.compareDocumentPosition(firstRow) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByText(CHECK_SCREEN.again)).toBeNull();
    expect(screen.getByRole('button', { name: 'Update my plan' })).toBeInTheDocument();
    expect(view.container.textContent).not.toMatch(/ready to move|next stage is open/i);
  });

  it('shows no HOLD_EVENT without a safety event, and shows the line about the new check', async () => {
    await open([{ peakFlexion: 84 }]);
    expect(screen.queryByText(HOLD_EVENT)).toBeNull();
    expect(screen.getByText(CHECK_SCREEN.again)).toBeInTheDocument();
  });

  it('shows the pause message for a pain answer at or above the pause value', async () => {
    await open([{ pain: 8 }]);
    expect(screen.getByText(PAUSE_MESSAGE)).toBeInTheDocument();
    expect(screen.getByText(HOLD_EVENT)).toBeInTheDocument();
  });

  it('has the two buttons and calls their handlers', async () => {
    const { onUpdate, onBack } = await open([]);
    fireEvent.click(screen.getByRole('button', { name: 'Update my plan' }));
    fireEvent.click(screen.getByRole('button', { name: 'Back to Home' }));
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('saves nothing: no write on the protocol, the answers or the sessions', async () => {
    const db = freshDb();
    await seed(db, [{ pain: 8 }]);
    const spies = [
      vi.spyOn(db.protocol, 'put'), vi.spyOn(db.protocol, 'add'), vi.spyOn(db.protocol, 'delete'), vi.spyOn(db.protocol, 'clear'),
      vi.spyOn(db.generatorInputs, 'put'), vi.spyOn(db.generatorInputs, 'delete'),
      vi.spyOn(db.sessions, 'put'), vi.spyOn(db.sessions, 'add'), vi.spyOn(db.sessions, 'update'), vi.spyOn(db.sessions, 'delete'), vi.spyOn(db.sessions, 'clear'), vi.spyOn(db.sessions, 'bulkPut'),
    ];
    const before = JSON.stringify(localStorage);
    render(<CheckProgress db={db} protocol={generated()} today={TODAY} onUpdate={vi.fn()} onBack={vi.fn()} />);
    await screen.findByText('Not approved by a clinician.');
    fireEvent.click(screen.getByRole('button', { name: 'Back to Home' }));
    for (const s of spies) expect(s).not.toHaveBeenCalled();
    expect(JSON.stringify(localStorage)).toBe(before);
  });

  it('keeps the fixed strings of the screen in allProgressTexts, so the word checks cover them', () => {
    const all = allProgressTexts();
    const strings = Object.values(CHECK_SCREEN).flatMap((v) => (typeof v === 'string' ? [v] : Object.values(v)));
    for (const s of strings) expect(all, s).toContain(s);
    expect(CHECK_SCREEN.types).toEqual({ measured: 'Measured by the app', reported: 'Reported by you', 'cannot-measure': 'The app cannot measure this' });
  });
});
