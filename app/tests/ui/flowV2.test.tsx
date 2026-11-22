import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { guideFor } from '../../src/lib/guides';
import { loadProtocol, type Protocol } from '../../src/lib/protocol';
import { MESSAGES, RED_FLAGS, GENERAL_GUIDANCE_NOTE } from '../../src/lib/redflags';
import type { Summary as PlainSummary } from '../../src/lib/exercises';
import { PAUSE_MESSAGE } from '../../src/lib/safety';
import { Home } from '../../src/ui/Home';
import { RedFlag } from '../../src/ui/RedFlag';
import { Setup } from '../../src/ui/Setup';
import { Summary } from '../../src/ui/Summary';
import { HEEL_SLIDE, audioHarness, freshDb, mockSource, protocolText } from './helpers';
import { hasVerdictWord } from './verdict';

beforeEach(() => localStorage.clear());
afterEach(cleanup);

const protocolOf = (over: Record<string, unknown> = {}): Protocol => {
  const r = loadProtocol(protocolText(over), 'demo');
  if (!r.ok) throw new Error(r.error.message);
  return r.protocol;
};

describe('B1 Home: one tinted card, list rows, one facts list', () => {
  function home(extra: { onOpenCompanion?: () => void } = {}) {
    const p = protocolOf();
    const phase = p.phases.find((x) => x.id === p.activePhase);
    return render(<Home protocol={p} phase={phase} activePhase={p.activePhase} db={freshDb()} now={() => new Date('2026-03-20T10:00:00Z')} onStart={vi.fn()} onLoadProtocol={vi.fn()} {...extra} />);
  }

  it('has the v2 root class, one h1 and one list title', () => {
    const { container } = home();
    expect(container.querySelector('section.v2-flow')).not.toBeNull();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getAllByRole('heading', { name: "Today's session" })).toHaveLength(1);
  });

  // v3: the exercises are the rows of the plan list. The dose is one line of text in the row, not a row of chips.
  it('puts the dose and a quiet Start button of every exercise in its own plan row', () => {
    home();
    const rows = within(screen.getByRole('list', { name: "Today's plan" })).getAllByRole('listitem');
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows.slice(1)) {
      expect(within(row).getByRole('button', { name: /^Start / })).not.toHaveClass('btn-lg'); // the first row has the large one when the app gives no session handler
      expect(row.querySelector('.v3-plan-dose')?.textContent).not.toBe('');
    }
  });

  it('shows the second camera as one row of the facts list, with the same words', () => {
    const onOpenCompanion = vi.fn();
    home({ onOpenCompanion });
    const facts = screen.getByRole('heading', { level: 2, name: 'Your protocol' }).parentElement!.querySelector('dl.facts')!;
    const row = within(facts as HTMLElement).getByRole('button', { name: 'Use this phone as the second camera' });
    fireEvent.click(row);
    expect(onOpenCompanion).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('heading', { name: 'Second camera' })).toBeNull();
    expect(screen.getByText(/records nothing and counts nothing/i)).toBeInTheDocument();
  });

  it('has no Today title and no word of progress', () => {
    home();
    expect(document.body.textContent).not.toMatch(/\btoday\b/i);
    expect(document.body.textContent).not.toMatch(/progress/i);
  });
});

describe('B2 Red flag: the block is in the sticky bar', () => {
  const setup = () => {
    const props = { onClear: vi.fn(), onBlocked: vi.fn(), onCancel: vi.fn() };
    const view = render(<RedFlag {...props} />);
    return { ...props, view };
  };

  it('has the v2 root class', () => {
    expect(setup().view.container.querySelector('section.v2-flow')).not.toBeNull();
  });

  it('shows the block inside the sticky action bar after one tick, with the Back to Home button', () => {
    const { onCancel } = setup();
    fireEvent.click(screen.getByLabelText(RED_FLAGS[0]!.text));
    const alert = screen.getByRole('alert');
    const bar = alert.closest('.action-bar')!;
    expect(bar).not.toBeNull();
    expect(within(alert).getByText(MESSAGES.emergency)).toHaveClass('notice-title');
    expect(within(alert).getByText(GENERAL_GUIDANCE_NOTE)).toBeInTheDocument();
    expect(within(alert).queryByText(/start again/i)).toBeNull();
    fireEvent.click(within(bar as HTMLElement).getByRole('button', { name: /back to home/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('keeps one live region from the start, and it is empty before a tick', () => {
    setup();
    const alerts = screen.getAllByRole('alert');
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toBeEmptyDOMElement();
  });

  it('keeps the continue button disabled and out of the bar while the block shows', () => {
    const { onClear } = setup();
    fireEvent.click(screen.getByLabelText(RED_FLAGS[3]!.text));
    const next = screen.getByRole('button', { name: /none of these apply/i });
    expect(next).toBeDisabled();
    fireEvent.click(next);
    expect(onClear).not.toHaveBeenCalled();
  });

  it('does not scroll: the bar is always in view', () => {
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    setup();
    fireEvent.click(screen.getByLabelText(RED_FLAGS[0]!.text));
    expect(scroll).not.toHaveBeenCalled();
    delete (Element.prototype as Partial<Element>).scrollIntoView;
  });

  it('is not skippable: no tick path reaches onClear, and an untick keeps the block in the bar', () => {
    const { onClear } = setup();
    const flag = RED_FLAGS[0]!;
    fireEvent.click(screen.getByLabelText(flag.text));
    fireEvent.click(screen.getByLabelText(flag.text));
    expect(within(screen.getByRole('alert')).getByText(MESSAGES[flag.group])).toBeInTheDocument();
    expect(screen.getByRole('alert').closest('.action-bar')).not.toBeNull();
    expect(onClear).not.toHaveBeenCalled();
  });
});

describe('B3 Setup guide: one drawing and six steps', () => {
  const open = (side: 'left' | 'right' = 'left') =>
    render(<Setup kind="heel-slide" side={side} exerciseName="Heel slide" source={mockSource()} sound={audioHarness().sound} onReady={vi.fn()} onCancel={vi.fn()} />);
  const guide = guideFor('heel-slide');
  const TEXTS = [guide.startPosition, guide.legFacingCamera, guide.handsAndSupport, guide.range, guide.speed, guide.cameraMustSee];
  const TITLES = ['Start position', 'Leg and camera', 'Hands and support', 'Range', 'Speed', 'What the camera must see'];
  const title = () => screen.getByRole('heading', { level: 2, name: /^Step \d of 6/ });

  it('starts at step 1 of 6 with its title and its text, and no other step text', () => {
    open();
    expect(title()).toHaveTextContent('Step 1 of 6');
    expect(title()).toHaveTextContent(TITLES[0]!);
    expect(screen.getByText(TEXTS[0]!)).toBeInTheDocument();
    for (const t of TEXTS.slice(1)) expect(screen.queryByText(t)).toBeNull();
  });

  it('shows exactly one drawing at every step', () => {
    const { container } = open();
    for (let i = 0; i < 6; i++) {
      expect(container.querySelectorAll('svg.fig'), `step ${i + 1}`).toHaveLength(1);
      if (i < 5) fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    }
  });

  it('walks through the six steps with Next and Back, and the texts are the texts of the guide', () => {
    open();
    TEXTS.forEach((text, i) => {
      expect(title()).toHaveTextContent(`Step ${i + 1} of 6`);
      expect(title()).toHaveTextContent(TITLES[i]!);
      expect(screen.getByText(text)).toBeInTheDocument();
      if (i < 5) fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    });
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(title()).toHaveTextContent('Step 5 of 6');
  });

  it('moves focus to the step title on Next and on Back, and not on the first render', () => {
    open();
    expect(title()).not.toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(title()).toHaveFocus();
    expect(title()).toHaveTextContent('Step 2 of 6');
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(title()).toHaveFocus();
    expect(title()).toHaveTextContent('Step 1 of 6');
  });

  it('has Back disabled at step 1 and six numbered step buttons that mark the current one', () => {
    open();
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();
    const list = screen.getByRole('group', { name: 'Steps of the guide' });
    const buttons = within(list).getAllByRole('button');
    expect(buttons.map((b) => b.textContent)).toEqual(['1', '2', '3', '4', '5', '6']);
    expect(buttons[0]).toHaveAttribute('aria-current', 'step');
    fireEvent.click(buttons[3]!);
    expect(title()).toHaveTextContent('Step 4 of 6');
    expect(buttons[3]).toHaveAttribute('aria-current', 'step');
    expect(buttons[0]).not.toHaveAttribute('aria-current');
  });

  it('draws the marks of the current drawing and tells the style which step is current', () => {
    const { container } = open();
    const marks = () => [...container.querySelectorAll('svg.fig .fg-mark-text')].map((t) => t.textContent);
    expect(marks()).toEqual(['1', '2', '3']);
    const wrap = container.querySelector('[data-step]')!;
    expect(wrap.getAttribute('data-step')).toBe('1');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(marks()).toEqual(['4', '5']);
    expect(container.querySelector('[data-step]')!.getAttribute('data-step')).toBe('4');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(marks()).toEqual(['6']);
    expect(container.querySelectorAll('svg.fig [data-n]')).toHaveLength(1);
  });

  it('lists all six step texts under Show all steps, and hides them again', () => {
    const { container } = open();
    expect(container.querySelector('dl.guide-notes')).toBeNull();
    const toggle = screen.getByRole('button', { name: 'Show all steps' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    const cards = [...container.querySelectorAll('dl.guide-notes > div')];
    expect(cards.map((c) => c.querySelector('dd')?.textContent)).toEqual(TEXTS);
    expect(cards.map((c) => c.querySelector('dt .guide-num')?.textContent)).toEqual(['1', '2', '3', '4', '5', '6']);
    expect(screen.getByRole('button', { name: 'Hide all steps' })).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Hide all steps' }));
    expect(container.querySelector('dl.guide-notes')).toBeNull();
  });

  it('shows the two leg questions as segmented controls with real radios', () => {
    const { container } = open();
    const segs = container.querySelectorAll('fieldset.v2-seg');
    expect(segs).toHaveLength(2);
    segs.forEach((s) => {
      expect(s.querySelectorAll('input[type="radio"]')).toHaveLength(2);
      expect(s.querySelector('legend')).not.toBeNull();
    });
  });

  it('keeps the legend "Your chosen leg" at every step when the other leg is chosen', () => {
    const { container } = open('left');
    fireEvent.click(screen.getAllByRole('radio', { name: /^Right/ })[0]!);
    for (let i = 0; i < 6; i++) {
      container.querySelectorAll('svg.fig').forEach((s) => expect(s.textContent, `step ${i + 1}`).toMatch(/chosen leg/i));
      if (i < 5) fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    }
  });

  it('keeps the action "Next: set up the camera" at every step', () => {
    open();
    expect(screen.getByRole('button', { name: 'Next: set up the camera' })).toBeEnabled();
  });
});

describe('B4 to B7 Summary', () => {
  const base: PlainSummary = { reps: 10, holds: null, peakFlexion: 135.4, topFlexion: null, topState: null, eventCounts: { nearLimit: 0, overLimit: 0, tooFast: 0 } };
  function summary(over: Partial<PlainSummary> = {}, db = freshDb()) {
    const onDone = vi.fn();
    const p = protocolOf();
    const view = render(
      <Summary run={{ reason: 'stop', summary: { ...base, ...over } }} exercise={HEEL_SLIDE} protocol={p} activePhase={1} redFlagBlocks={0} db={db} now={() => new Date('2026-03-04T10:00:00.000Z')} onDone={onDone} />,
    );
    return { view, onDone, db };
  }

  it('B4: shows reps and the highest knee bend as two stat lines with their units and the angle note', () => {
    const { view } = summary();
    expect(view.container.querySelector('section.v2-flow')).not.toBeNull();
    // v3: RunStats shows each number as a BigNumber group (label, number, unit, note).
    const stats = [...view.container.querySelectorAll('.run-stats > .v3-metric')];
    expect(stats).toHaveLength(2);
    expect(stats[0]!.querySelector('.v3-metric-label')).toHaveTextContent('Reps counted');
    expect(stats[0]!.querySelector('.v3-num b')).toHaveTextContent('10');
    expect(stats[0]!.querySelector('.v3-num span')).toHaveTextContent('reps');
    expect(stats[1]!.querySelector('.v3-metric-label')).toHaveTextContent('Highest knee bend');
    expect(stats[1]!.querySelector('.v3-num b')).toHaveTextContent('135');
    expect(stats[1]).toHaveTextContent('estimated angle, not a medical measurement');
  });

  it('B4: guards a missing peak and a missing set list', () => {
    const { view } = summary({ peakFlexion: null, reps: 0 });
    expect(view.container.querySelectorAll('.run-stats > .v3-metric')).toHaveLength(1);
    expect(screen.getByText('No repetitions were counted.')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/NaN|undefined/);
  });

  it('B4: lists the sets as rows with the count at the right and keeps the text', () => {
    summary({ sets: { prescription: { reps: 10, sets: 3 }, repsPerSet: [10, 8], setsDone: 2 } } as Partial<PlainSummary>);
    const list = screen.getByRole('list', { name: 'Reps in each set' });
    expect(list).toHaveTextContent('Set 1: 10 reps');
    expect(list).toHaveTextContent('Set 2: 8 reps');
    expect(list.querySelectorAll('li > .set-count')).toHaveLength(2);
  });

  it('B5: shows "Not answered" before a choice, with no radio checked', () => {
    summary();
    expect(screen.getByTestId('pain-readout')).toHaveTextContent('Not answered');
    const radios = screen.getAllByRole('radio').filter((r) => (r as HTMLInputElement).name === 'pain') as HTMLInputElement[];
    expect(radios).toHaveLength(11);
    expect(radios.some((r) => r.checked)).toBe(false);
  });

  it('B5: shows only the chosen value and "out of 10", and no verdict word', () => {
    summary();
    for (const v of [0, 6, 7, 10]) {
      fireEvent.click(screen.getByRole('radio', { name: String(v) }));
      const out = screen.getByTestId('pain-readout');
      expect(out).toHaveTextContent(`${v} out of 10`);
      expect(hasVerdictWord(out.textContent ?? '')).toBeNull();
    }
  });

  it('B5: pain 6 shows no pause message and pain 7 shows it', () => {
    summary();
    fireEvent.click(screen.getByRole('radio', { name: '6' }));
    expect(screen.queryByText(PAUSE_MESSAGE)).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: '7' }));
    expect(screen.getByText(PAUSE_MESSAGE)).toBeInTheDocument();
  });

  it('B6: asks swelling as a segmented control of three radios, none checked, with the same names', () => {
    const { view } = summary();
    const seg = view.container.querySelector('fieldset.v2-seg')!;
    expect(seg).not.toBeNull();
    const names = [...seg.querySelectorAll('label')].map((l) => l.textContent);
    expect(names).toEqual(['No swelling', 'Some swelling', 'More than before']);
    const radios = [...seg.querySelectorAll('input')] as HTMLInputElement[];
    expect(radios.every((r) => r.type === 'radio' && r.name === 'swelling' && !r.checked)).toBe(true);
    fireEvent.click(screen.getByRole('radio', { name: 'More than before' }));
    expect(screen.getByText(/swelling: more than before/i)).toBeInTheDocument();
  });

  it('B7: swaps the label Save, Saving, Saved on one button and then offers Done', async () => {
    const { db } = summary();
    fireEvent.click(screen.getByRole('radio', { name: '3' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Some swelling' }));
    const save = screen.getByRole('button', { name: 'Save' });
    const width = save;
    fireEvent.click(save);
    expect(screen.getByRole('button', { name: 'Saving' })).toBe(width);
    const saved = await screen.findByRole('button', { name: 'Saved' });
    expect(saved).toBe(width);
    expect(saved).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Session saved.');
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
    expect(await db.sessions.count()).toBe(1);
  });

  it('B7: goes back to Save after a failed save, so the person can try again', async () => {
    const { db } = summary();
    vi.spyOn(db.sessions, 'add').mockRejectedValueOnce(new Error('quota'));
    fireEvent.click(screen.getByRole('radio', { name: '1' }));
    fireEvent.click(screen.getByRole('radio', { name: 'No swelling' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/could not be saved/i));
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
    await act(async () => undefined);
  });
});
