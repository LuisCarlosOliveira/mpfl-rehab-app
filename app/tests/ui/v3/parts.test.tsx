import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppShell, type ShellTab } from '../../../src/ui/v3/AppShell';
import { BigNumber } from '../../../src/ui/v3/BigNumber';
import { Chip } from '../../../src/ui/v3/Chip';
import { ExerciseHeader } from '../../../src/ui/v3/ExerciseHeader';
import { LiveShell } from '../../../src/ui/v3/LiveShell';
import { PlanList } from '../../../src/ui/v3/PlanList';
import { RadioList } from '../../../src/ui/v3/RadioList';
import { SegmentedChoice } from '../../../src/ui/v3/SegmentedChoice';
import { SessionProgress } from '../../../src/ui/v3/SessionProgress';
import { hasVerdictWord } from '../verdict';

afterEach(cleanup);

const BANNER = 'Prototype. Not for patient use.';
const ITEMS = ['Straight leg raise', 'Heel slide', 'Quadriceps set', 'Gluteal set', 'Calf raise', 'Hip abduction'].map((name, i) => ({ id: `e${i + 1}`, name, dose: '2 sets of 10' }));

describe('AppShell', () => {
  const shell = (tab: ShellTab = 'today', onNavigate = vi.fn()) =>
    render(
      <AppShell tab={tab} onNavigate={onNavigate} banner={BANNER}>
        <AppShell.Main>
          <h1>Today</h1>
        </AppShell.Main>
        <AppShell.Actions label="Session actions">
          <button type="button">Start</button>
        </AppShell.Actions>
      </AppShell>,
    );

  it('always shows the banner, in a labelled landmark', () => {
    shell();
    expect(within(screen.getByRole('complementary', { name: 'Notice' })).getByText(BANNER)).toBeInTheDocument();
  });

  it('has a skip link that points at the main landmark', () => {
    shell();
    const skip = screen.getByRole('link', { name: 'Skip to main content' });
    expect(skip).toHaveAttribute('href', '#main');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main');
  });

  it('has the landmarks banner, navigation, main and the action region', () => {
    shell();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Session actions' })).toBeInTheDocument();
  });

  it('lists Today, Progress, Sessions and My data and marks the current one', () => {
    shell('progress');
    const nav = screen.getByRole('navigation', { name: 'Main' });
    const names = within(nav).getAllByRole('button').map((b) => b.textContent);
    expect(names).toEqual(['Today', 'Progress', 'Sessions', 'My data']);
    expect(within(nav).getByRole('button', { name: 'Progress' })).toHaveAttribute('aria-current', 'page');
    expect(nav.querySelectorAll('[aria-current]')).toHaveLength(1);
  });

  it('calls onNavigate for another tab and not for the current one', () => {
    const go = vi.fn();
    shell('today', go);
    fireEvent.click(screen.getByRole('button', { name: 'Today' }));
    expect(go).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'My data' }));
    expect(go).toHaveBeenCalledWith('data');
  });

  it('keeps the action bar a sibling after main, so it never covers the content', () => {
    shell();
    const main = screen.getByRole('main');
    expect(main.nextElementSibling).toBe(screen.getByRole('region', { name: 'Session actions' }));
  });
});

describe('LiveShell', () => {
  it('puts the exercise name before the camera and the panel in the document order, and has no navigation', () => {
    render(
      <LiveShell banner={BANNER}>
        <LiveShell.Header>
          <ExerciseHeader name="Straight leg raise" />
        </LiveShell.Header>
        <LiveShell.Camera label="Camera view">
          <Chip>Drawn placeholder, not a camera image</Chip>
        </LiveShell.Camera>
        <LiveShell.Panel>
          <button type="button">Stop</button>
        </LiveShell.Panel>
      </LiveShell>,
    );
    expect(screen.queryByRole('navigation')).toBeNull();
    expect(screen.getByRole('complementary', { name: 'Notice' })).toBeInTheDocument();
    const heading = screen.getByRole('heading', { level: 1, name: 'Straight leg raise' });
    const camera = screen.getByRole('region', { name: 'Camera view' });
    const stop = screen.getByRole('button', { name: 'Stop' });
    expect(heading.compareDocumentPosition(camera) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(camera.compareDocumentPosition(stop) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main');
  });
});

describe('SessionProgress', () => {
  it('is a progressbar with the values and a text that names the place', () => {
    render(<SessionProgress unit="Exercise" total={6} current={3} set={{ current: 1, total: 2 }} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuemin', '1');
    expect(bar).toHaveAttribute('aria-valuemax', '6');
    expect(bar).toHaveAttribute('aria-valuenow', '3');
    expect(bar).toHaveAttribute('aria-valuetext', 'Exercise 3 of 6, set 1 of 2');
    expect(screen.getByText('Exercise 3 of 6, set 1 of 2')).toBeVisible();
  });

  it('draws one segment for each step: earlier ones done, one current, later ones open', () => {
    const { container } = render(<SessionProgress unit="Step" total={4} current={2} />);
    const segs = [...container.querySelectorAll('[data-seg]')].map((s) => s.getAttribute('data-seg'));
    expect(segs).toEqual(['done', 'now', 'later', 'later']);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuetext', 'Step 2 of 4');
  });

  it('hides the segments from assistive technology', () => {
    const { container } = render(<SessionProgress unit="Exercise" total={3} current={1} />);
    expect(container.querySelector('[data-seg]')!.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('keeps the current step inside the range', () => {
    render(<SessionProgress unit="Exercise" total={3} current={9} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '3');
  });
});

describe('ExerciseHeader', () => {
  it('shows the eyebrow, the name as the one h1 and the child (the progress bar)', () => {
    render(
      <ExerciseHeader eyebrow="Phase 1, week 2" name="Gesäßmuskelanspannung im Liegen, heutige Trainingseinheit">
        <SessionProgress unit="Exercise" total={6} current={3} />
      </ExerciseHeader>,
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Gesäßmuskelanspannung im Liegen, heutige Trainingseinheit');
    expect(screen.getByText('Phase 1, week 2')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders no bar when it gets no child', () => {
    render(<ExerciseHeader name="Heel slide" />);
    expect(screen.queryByRole('progressbar')).toBeNull();
  });
});

describe('BigNumber', () => {
  it('shows value, unit, label and the note line', () => {
    render(<BigNumber label="Knee angle" value={128} unit="degrees" note="estimated angle, not a medical measurement" />);
    expect(screen.getByText('Knee angle')).toBeInTheDocument();
    expect(screen.getByText('128')).toBeInTheDocument();
    expect(screen.getByText('degrees')).toBeInTheDocument();
    expect(screen.getByText('estimated angle, not a medical measurement')).toBeInTheDocument();
  });

  it('formats the value with Intl', () => {
    render(<BigNumber label="Holds" value={1284} unit="s" />);
    expect(screen.getByText(new Intl.NumberFormat().format(1284))).toBeInTheDocument();
  });

  it('shows "--" and the reason, and no unit, when the value is null', () => {
    render(<BigNumber label="Knee angle" value={null} unit="degrees" missingReason="Ankle not seen" />);
    expect(screen.getByText('--')).toBeInTheDocument();
    expect(screen.getByText('Ankle not seen')).toBeInTheDocument();
    expect(screen.queryByText('degrees')).toBeNull();
  });

  it('keeps a value of 0 as a number and not as missing', () => {
    render(<BigNumber label="Reps" value={0} unit="reps" />);
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.queryByText('--')).toBeNull();
  });

  it('marks the tone for the primary colour', () => {
    const { container } = render(<BigNumber label="Reps" value={3} unit="reps" tone="primary" />);
    expect(container.firstElementChild).toHaveAttribute('data-tone', 'primary');
  });

  it('names its label for assistive technology', () => {
    render(<BigNumber label="Reps" value={3} unit="reps" />);
    expect(screen.getByRole('group', { name: 'Reps' })).toBeInTheDocument();
  });
});

describe('PlanList', () => {
  const rows = () => within(screen.getByRole('list', { name: "Today's plan" })).getAllByRole('listitem');

  it('derives done, next and later from the position of currentId', () => {
    render(<PlanList items={ITEMS} currentId="e3" />);
    expect(rows().map((r) => r.getAttribute('data-status'))).toEqual(['done', 'done', 'next', 'later', 'later', 'later']);
  });

  it('marks only the current row with aria-current="step"', () => {
    render(<PlanList items={ITEMS} currentId="e3" />);
    const current = rows().filter((r) => r.getAttribute('aria-current') === 'step');
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent('Quadriceps set');
  });

  it('puts the status in words, not only in a mark', () => {
    render(<PlanList items={ITEMS} currentId="e2" />);
    expect(within(rows()[0]!).getByText('Done')).toBeInTheDocument();
    expect(within(rows()[1]!).getByText('Next')).toBeInTheDocument();
    expect(within(rows()[2]!).getByText('Later')).toBeInTheDocument();
  });

  it('shows name and dose of each row and a position mark', () => {
    render(<PlanList items={ITEMS} currentId="e1" />);
    expect(within(rows()[5]!).getByText('Hip abduction')).toBeInTheDocument();
    expect(within(rows()[5]!).getByText('2 sets of 10')).toBeInTheDocument();
    expect(within(rows()[5]!).getByText('6')).toBeInTheDocument();
  });

  it('shows every row as done when currentId is null', () => {
    render(<PlanList items={ITEMS} currentId={null} />);
    expect(rows().every((r) => r.getAttribute('data-status') === 'done')).toBe(true);
    expect(rows().some((r) => r.hasAttribute('aria-current'))).toBe(false);
  });

  it('shows the children only in the current row', () => {
    render(
      <PlanList items={ITEMS} currentId="e4">
        <button type="button">Start Gluteal set</button>
      </PlanList>,
    );
    const button = screen.getByRole('button', { name: 'Start Gluteal set' });
    expect(button.closest('li')).toBe(rows()[3]);
  });

  it('shows an empty state for an empty plan', () => {
    render(<PlanList items={[]} currentId={null} />);
    expect(screen.getByText('No exercises in the plan.')).toBeInTheDocument();
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('handles 12 rows with two-digit marks', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ id: `x${i}`, name: `Exercise ${i + 1}`, dose: '10 reps' }));
    render(<PlanList items={many} currentId="x11" />);
    expect(rows()).toHaveLength(12);
    expect(within(rows()[11]!).getByText('12')).toBeInTheDocument();
  });
});

describe('SegmentedChoice', () => {
  function Host({ onPick }: { onPick?: (v: string) => void }) {
    const [v, setV] = useState<string | null>(null);
    return (
      <SegmentedChoice
        name="leg"
        legend="Which leg?"
        value={v}
        options={[
          { value: 'left', label: 'Left' },
          { value: 'right', label: 'Right' },
        ]}
        onChange={(x) => {
          setV(x);
          onPick?.(x);
        }}
      />
    );
  }

  it('is a group (fieldset) made from a fieldset with a legend and real radio inputs', () => {
    const { container } = render(<Host />);
    const group = screen.getByRole('group', { name: 'Which leg?' });
    expect(group.tagName).toBe('FIELDSET');
    expect(container.querySelector('legend')).toHaveTextContent('Which leg?');
    const radios = within(group).getAllByRole('radio');
    expect(radios).toHaveLength(2);
    radios.forEach((r) => {
      expect(r.tagName).toBe('INPUT');
      expect(r).toHaveAttribute('type', 'radio');
      expect(r).toHaveAttribute('name', 'leg');
    });
  });

  it('selects through the label (the label is the hit target) and reports the value', () => {
    const pick = vi.fn();
    render(<Host onPick={pick} />);
    fireEvent.click(screen.getByText('Right'));
    expect(pick).toHaveBeenCalledWith('right');
    expect(screen.getByRole('radio', { name: 'Right' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Left' })).not.toBeChecked();
  });

  it('shows the hint inside the label so it is part of the name', () => {
    render(<SegmentedChoice name="side" legend="Camera side" value={null} onChange={() => {}} options={[{ value: 'a', label: 'Left', hint: 'camera on your left' }, { value: 'b', label: 'Right' }]} />);
    expect(screen.getByRole('radio', { name: /Left.*camera on your left/ })).toBeInTheDocument();
  });
});

describe('RadioList', () => {
  const options = ['Under 4 weeks', '4 to 8 weeks', '8 to 12 weeks', 'More than 12 weeks'].map((label, i) => ({ value: String(i), label }));

  it('is a group (fieldset) with one radio for each option, all in the same group', () => {
    render(<RadioList name="time" legend="Time since surgery" value="1" options={options} onChange={() => {}} />);
    const group = screen.getByRole('group', { name: 'Time since surgery' });
    const radios = within(group).getAllByRole('radio');
    expect(radios).toHaveLength(4);
    expect(radios[1]).toBeChecked();
    expect(new Set(radios.map((r) => r.getAttribute('name'))).size).toBe(1);
  });

  it('reports the chosen value', () => {
    const pick = vi.fn();
    render(<RadioList name="time" legend="Time since surgery" value={null} options={options} onChange={pick} />);
    fireEvent.click(screen.getByRole('radio', { name: '8 to 12 weeks' }));
    expect(pick).toHaveBeenCalledWith('2');
  });

  it('keeps the children (a note) inside the fieldset', () => {
    render(
      <RadioList name="time" legend="Time since surgery" value={null} options={options} onChange={() => {}}>
        <p>Ask your surgeon if you are not sure.</p>
      </RadioList>,
    );
    expect(within(screen.getByRole('group')).getByText('Ask your surgeon if you are not sure.')).toBeInTheDocument();
  });
});

describe('Chip', () => {
  it('shows its text', () => {
    render(<Chip>Drawn placeholder, not a camera image</Chip>);
    expect(screen.getByText('Drawn placeholder, not a camera image')).toBeInTheDocument();
  });
});

describe('no verdict word in the text of any part', () => {
  it('holds for a full screen of the parts', () => {
    const { container } = render(
      <AppShell tab="today" onNavigate={() => {}} banner={BANNER}>
        <AppShell.Main>
          <ExerciseHeader eyebrow="Phase 1, week 2" name="Straight leg raise">
            <SessionProgress unit="Exercise" total={6} current={3} set={{ current: 1, total: 2 }} />
          </ExerciseHeader>
          <PlanList items={ITEMS} currentId="e3" />
          <BigNumber label="Knee angle" value={null} unit="degrees" missingReason="Ankle not seen" note="estimated angle, not a medical measurement" />
          <SegmentedChoice name="l" legend="Which leg?" value="left" onChange={() => {}} options={[{ value: 'left', label: 'Left' }, { value: 'right', label: 'Right' }]} />
          <RadioList name="r" legend="Time since surgery" value={null} onChange={() => {}} options={[{ value: '1', label: 'Under 4 weeks' }]} />
          <Chip>Drawn placeholder, not a camera image</Chip>
        </AppShell.Main>
      </AppShell>,
    );
    expect(hasVerdictWord(container.textContent ?? '')).toBeNull();
  });
});
