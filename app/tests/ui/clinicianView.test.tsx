import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { allSummaryTexts, BANNER, STATE } from '../../src/lib/reviewSummary';
import { saveSession } from '../../src/lib/storage';
import { ClinicianView } from '../../src/ui/ClinicianView';
import { freshDb, sessionInput } from './helpers';
import { PSEUDONYM, bigFile, databaseNames, day, exportText, peakCriterion, pick, protocolFileText, session, threeSquats } from './t11helpers';
import { hasVerdictWord } from './verdict';

beforeEach(() => localStorage.clear());
afterEach(cleanup);

const sessionPicker = () => screen.getByLabelText(/session file/i);
const protocolPicker = () => screen.getByLabelText(/protocol file/i);

function setup(mode: 'demo' | 'patient' = 'demo') {
  const onBack = vi.fn();
  const view = render(<ClinicianView onBack={onBack} mode={mode} now={() => new Date('2026-11-20T09:00:00.000Z')} />);
  return { onBack, ...view };
}

const loadFile = async (text: string) => {
  pick(sessionPicker(), text);
  await screen.findByText(BANNER);
};

describe('ClinicianView session file', () => {
  it('has an h1 and asks for a file first', () => {
    const { onBack } = setup();
    expect(screen.getByRole('heading', { level: 1, name: 'Care team view' })).toBeInTheDocument();
    expect(screen.queryByText(BANNER)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('shows the banner, the memory note, the session list and the charts for a valid file', async () => {
    setup();
    await loadFile(exportText([...threeSquats(100), session({ date: day(4), exercise: 'heel-slide', peakFlexion: 80, pain: 6, swelling: 'more' })]));
    expect(screen.getByText(/stays in memory/i)).toBeInTheDocument();
    const list = screen.getByRole('table', { name: /session list/i });
    expect(within(list).getAllByRole('row')).toHaveLength(5);
    expect(within(list).getByText('Heel slide')).toBeInTheDocument();
    expect(within(list).getByText('More than before')).toBeInTheDocument();
    expect(screen.getAllByRole('table').length).toBeGreaterThan(3); // list, then one table for each chart
    expect(document.querySelectorAll('section.dash-chart').length).toBe(4); // two peak charts, reps, pain
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('shows the peak and the angle at the top in whole degrees in the session list, and keeps the stored values', async () => {
    setup();
    const raw = [session({ date: day(1), peakFlexion: 87.34567891, topFlexion: 21.98765 }), session({ date: day(2), peakFlexion: 100 })];
    const text = exportText(raw);
    await loadFile(text);
    const list = screen.getByRole('table', { name: /session list/i });
    const rows = within(list).getAllByRole('row').slice(1);
    const cells = rows.map((r) => within(r).getAllByRole('cell').map((c) => c.textContent));
    const texts = cells.flat().join('|');
    expect(texts).toContain('87');
    expect(texts).toContain('22');
    expect(texts).not.toMatch(/87\.|21\.|22\./);
    // The row with a whole peak shows it without a decimal.
    expect(cells.some((c) => c.includes('100'))).toBe(true);
    // Display only: the file text that the page read still holds the raw numbers.
    expect(text).toContain('87.34567891');
  });

  it('shows a pain answer between sets in the session list', async () => {
    setup();
    await loadFile(exportText([session({ date: day(1), pain: undefined, setPain: [8] })]));
    const list = screen.getByRole('table', { name: /session list/i });
    expect(within(list).getByText('8 (between sets)')).toBeInTheDocument();
    expect(within(list).queryByText('Not answered', { selector: 'td.num-cell' })).toBeNull();
  });

  it('shows the last session in the header as "YYYY-MM-DD HH:MM (UTC)"', async () => {
    setup();
    await loadFile(exportText([session({ date: '2026-10-29T20:24:00.000Z' })]));
    pick(protocolPicker(), protocolFileText([peakCriterion()]));
    const header = await screen.findByRole('region', { name: 'Summary header' });
    const value = within(header).getByText('Last session').nextElementSibling?.textContent;
    expect(value).toBe('2026-10-29 20:24 (UTC)');
    expect(value).not.toMatch(/T\d|Z/);
  });

  it('uses the same capitalised exercise name in the pain table and the session list', async () => {
    setup();
    await loadFile(exportText([session({ date: day(1), exercise: 'heel-slide' }), session({ date: day(2), exercise: 'seated-extension-hold' })]));
    pick(protocolPicker(), protocolFileText([peakCriterion()]));
    const pain = await screen.findByRole('table', { name: /pain and swelling by session/i });
    const names = (t: HTMLElement) => within(t).getAllByRole('row').slice(1).map((r) => within(r).getAllByRole('cell')[1]?.textContent);
    expect(names(pain)).toEqual(['Heel slide', 'Seated knee extension hold']);
    expect(names(screen.getByRole('table', { name: /^session list$/i }))).toEqual(names(pain));
  });

  it('shows the named error as plain text for each refused file', async () => {
    setup();
    pick(sessionPicker(), 'not json');
    expect(await screen.findByRole('alert')).toHaveTextContent('The file is not valid JSON.');
    pick(sessionPicker(), exportText([], { schemaVersion: 7 }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/schema version/i));
    pick(sessionPicker(), JSON.stringify({ schemaVersion: 1, extra: true }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/not valid at/i));
    fireEvent.change(sessionPicker(), { target: { files: [bigFile()] } });
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('The file is larger than 5 MB.'));
    expect(screen.queryByText(BANNER)).toBeNull();
  });

  it('clears the old file when a new file is refused', async () => {
    setup();
    await loadFile(exportText(threeSquats(100)));
    pick(sessionPicker(), 'not json');
    await screen.findByRole('alert');
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('shows text from the file as plain text, with no script, no link and no image', async () => {
    const { container } = setup();
    const hostile = '<script>alert(1)</script><a href="https://evil.example/x">link</a><img src=x onerror=alert(1)>';
    await loadFile(exportText(threeSquats(105)));
    pick(protocolPicker(), protocolFileText([peakCriterion()], { phases: [{ id: 1, name: hostile.slice(0, 60), exercises: [], reviewCriteria: [peakCriterion()] }] }));
    await screen.findByText(STATE.cannotTell, { exact: false });
    expect(container.querySelector('script, a, img, iframe')).toBeNull();
    expect(container.textContent).toContain('<script>');
    expect(readFileSync('src/ui/ClinicianView.tsx', 'utf8')).not.toMatch(/dangerouslySetInnerHTML|href=/);
  });

  it('does not write to IndexedDB or localStorage', async () => {
    const db = freshDb();
    await saveSession(db, sessionInput());
    const names = await databaseNames();
    const before = await db.sessions.toArray();
    const storageBefore = JSON.stringify({ ...localStorage });
    setup();
    await loadFile(exportText(threeSquats(100)));
    pick(protocolPicker(), protocolFileText([peakCriterion()]));
    await screen.findByRole('table', { name: /criteria/i });
    expect(await db.sessions.toArray()).toEqual(before);
    expect(await db.protocol.count()).toBe(0);
    expect(await databaseNames()).toEqual(names);
    expect(JSON.stringify({ ...localStorage })).toBe(storageBefore);
    expect(readFileSync('src/ui/ClinicianView.tsx', 'utf8')).not.toMatch(/createDb|\.bulkAdd|\.put\(|saveSession|importSessions|localStorage/);
  });
});

describe('ClinicianView review summary', () => {
  const state = async (peak: number) => {
    setup();
    await loadFile(exportText(threeSquats(peak)));
    pick(protocolPicker(), protocolFileText([peakCriterion()]));
    const table = await screen.findByRole('table', { name: /criteria/i });
    return within(table).getAllByRole('row')[1]!;
  };

  it.each([
    [100, STATE.below],
    [110, STATE.cannotTell],
    [119, STATE.cannotTell],
    [120, STATE.above],
  ])('shows the fixed state text at a median of %i with limit 110 and margin 9', async (peak, text) => {
    const row = await state(peak);
    expect(within(row).getByText(text)).toBeInTheDocument();
    expect(within(row).getByText('Peak knee bend, mini squat, at least 110 degrees')).toBeInTheDocument();
    expect(within(row).getByText('110 degrees')).toBeInTheDocument();
    expect(within(row).getByText('Evidence: borrowed from another condition')).toBeInTheDocument();
    expect(within(row).getByText(/plus or minus 9 degrees/)).toBeInTheDocument();
    expect(within(row).getByText('3 of 3 sessions')).toBeInTheDocument();
  });

  it('shows "Not enough data" with fewer sessions than the criterion needs', async () => {
    setup();
    await loadFile(exportText(threeSquats(120).slice(0, 2)));
    pick(protocolPicker(), protocolFileText([peakCriterion()]));
    const table = await screen.findByRole('table', { name: /criteria/i });
    expect(within(table).getByText(STATE.notEnough)).toBeInTheDocument();
    expect(within(table).getByText('2 of 3 sessions')).toBeInTheDocument();
  });

  it('shows the header, the events block, the checks list and the pain and swelling table', async () => {
    setup();
    await loadFile(exportText([
      session({ date: day(1), pain: 8, swelling: 'more', redFlagBlocks: 2, gaveWayPresses: 1 }),
      session({ date: day(2), pain: 2 }),
      session({ date: day(3), pain: 1 }),
    ]));
    pick(protocolPicker(), protocolFileText([peakCriterion(), { kind: 'swelling', noneOrSomeOnly: true, lastSessions: 3, evidence: 'unvalidated' }]));
    await screen.findByRole('table', { name: /criteria/i });
    const header = screen.getByRole('region', { name: /summary header/i });
    expect(within(header).getByText('p-1')).toBeInTheDocument();
    expect(within(header).getByText(PSEUDONYM)).toBeInTheDocument();
    expect(within(header).getByText(/Protection/)).toBeInTheDocument();
    expect(within(header).getByText('2026-12-01')).toBeInTheDocument();
    expect(screen.getAllByText(BANNER)).toHaveLength(1);
    const events = screen.getByRole('table', { name: /events/i });
    const count = (label: string) => within(within(events).getByText(label).closest('tr')!).getAllByRole('cell')[1]!.textContent;
    expect(count('Red-flag blocks')).toBe('2');
    expect(count('Presses of "knee gave way or hurts"')).toBe('1');
    expect(count('Sessions with swelling "more than before"')).toBe('1');
    expect(count('Sessions with pain at or above the pause threshold')).toBe('1');
    const checks = screen.getByRole('list', { name: /checks for the visit/i });
    expect(within(checks).getAllByRole('listitem')).toHaveLength(8);
    expect(within(checks).getByText('Quadriceps strength. Needs a dynamometer.')).toBeInTheDocument();
    const log = screen.getByRole('table', { name: /pain and swelling/i });
    expect(within(log).getAllByRole('row')).toHaveLength(4);
    expect(within(log).getByText('8 (0 to 10)')).toBeInTheDocument();
  });

  it('shows an explicit text for the swelling row, which has no limit number and no state', async () => {
    setup();
    await loadFile(exportText(threeSquats(100)));
    pick(protocolPicker(), protocolFileText([{ kind: 'swelling', noneOrSomeOnly: true, lastSessions: 3, evidence: 'unvalidated' }]));
    const table = await screen.findByRole('table', { name: /criteria/i });
    expect(within(table).getByText('Swelling answer, none or some only')).toBeInTheDocument();
    expect(within(table).getByText('Answers: none 3, some 0, more than before 0')).toBeInTheDocument();
    expect(within(table).getAllByText('Not applicable').length).toBeGreaterThan(0);
  });

  it('lets the reviewer choose the phase, and starts at the active phase of the file', async () => {
    setup();
    await loadFile(exportText(threeSquats(100)));
    const phases = [
      { id: 1, name: 'Protection', exercises: [], reviewCriteria: [peakCriterion()] },
      { id: 2, name: 'Loading', exercises: [], reviewCriteria: [peakCriterion({ limit: 90 })] },
    ];
    pick(protocolPicker(), protocolFileText([], { phases, activePhase: 2 }));
    const select = await screen.findByLabelText(/phase to review/i);
    expect(select).toHaveValue('2');
    expect(await screen.findByText('Peak knee bend, mini squat, at least 90 degrees')).toBeInTheDocument();
    fireEvent.change(select, { target: { value: '1' } });
    expect(await screen.findByText('Peak knee bend, mini squat, at least 110 degrees')).toBeInTheDocument();
  });

  it('applies the app mode: patient mode refuses the example protocol and shows the named error', async () => {
    setup('patient');
    await loadFile(exportText(threeSquats(100)));
    pick(protocolPicker(), protocolFileText([peakCriterion()]));
    expect(await screen.findByText('The example protocol cannot be used in patient mode.')).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: /criteria/i })).toBeNull();
    pick(protocolPicker(), protocolFileText([peakCriterion()], { example: undefined, approvedOn: '2026-01-02' }));
    expect(await screen.findByRole('table', { name: /criteria/i })).toBeInTheDocument();
  });

  it('refuses a protocol file over 5 MB', async () => {
    setup();
    await loadFile(exportText(threeSquats(100)));
    fireEvent.change(protocolPicker(), { target: { files: [bigFile()] } });
    expect(await screen.findByText('The file is larger than 5 MB.')).toBeInTheDocument();
  });

  it('shows no summary when the file has no protocol', async () => {
    setup();
    await loadFile(exportText(threeSquats(100)));
    expect(screen.queryByRole('table', { name: /criteria/i })).toBeNull();
    expect(screen.getByText(/pick a protocol file to see the review summary/i)).toBeInTheDocument();
  });
});

describe('C2-02 criteria table shows all rows', () => {
  it('has no height limit and keeps the keyboard-focusable scroll region', async () => {
    setup();
    await loadFile(exportText(threeSquats(120)));
    pick(protocolPicker(), protocolFileText([peakCriterion(), peakCriterion({ limit: 100 })]));
    await screen.findByRole('table', { name: /criteria/i });
    const region = screen.getByRole('region', { name: 'Review criteria' });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(region).toHaveClass('table-scroll--natural');
    const css = readFileSync('src/ui/dashboard.css', 'utf8');
    expect(css).toMatch(/\.table-scroll--natural\s*{[^}]*max-height:\s*none/);
    expect(css).toMatch(/\.table-scroll\s*{[^}]*overflow:\s*auto/);
  });
});

describe('ClinicianView words', () => {
  it('shows no verdict word, no total, no percentage and no colour field with a full summary', async () => {
    const { container } = setup();
    await loadFile(exportText([...threeSquats(120), session({ date: day(4), pain: 9, swelling: 'more' })]));
    pick(protocolPicker(), protocolFileText([
      peakCriterion(),
      peakCriterion({ limit: 100 }),
      { kind: 'numeric', measure: 'painMax', op: 'atMost', limit: 4, lastSessions: 3, evidence: 'unvalidated' },
      { kind: 'numeric', measure: 'sessionsDone', op: 'atLeast', limit: 4, lastSessions: 3, evidence: 'mpflr' },
      { kind: 'swelling', noneOrSomeOnly: true, lastSessions: 3, evidence: 'unvalidated' },
    ]));
    await screen.findByRole('table', { name: /criteria/i });
    const text = container.textContent ?? '';
    expect(hasVerdictWord(text), text).toBeNull();
    expect(text).not.toMatch(/\b(met|passed|total|overall|percent)\b|%|\d+ of \d+ criteria/i);
    expect(container.querySelector('[style]:not(.recharts-wrapper):not(.recharts-surface), [class*="severity"], [class*="red"], [class*="green"]')).toBeNull();
  });

  it('writes every fixed text of the summary module and no other state or banner text', () => {
    const source = readFileSync('src/ui/ClinicianView.tsx', 'utf8');
    expect(source).toMatch(/from '\.\.\/lib\/reviewSummary'/);
    for (const text of [...Object.values(STATE), BANNER]) expect(source).not.toContain(text);
    expect(allSummaryTexts().length).toBeGreaterThan(10);
  });
});
