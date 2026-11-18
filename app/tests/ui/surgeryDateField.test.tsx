import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SurgeryDateField } from '../../src/ui/answerControls';

afterEach(cleanup);
const TODAY = '2026-11-18';

function Host({ initial = '', onValue }: { initial?: string; onValue: (v: string) => void }) {
  const [v, setV] = useState(initial);
  return <SurgeryDateField value={v} today={TODAY} onChange={(x) => { setV(x); onValue(x); }} />;
}
const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const fill = (d: string, m: string, y: string) => { type('Day', d); type('Month', m); type('Year', y); };

describe('SurgeryDateField, three number fields', () => {
  it('is a fieldset with the legend Date of surgery and three labelled numeric fields', () => {
    render(<Host onValue={vi.fn()} />);
    expect(screen.getByRole('group', { name: 'Date of surgery' })).toBeInTheDocument();
    for (const label of ['Day', 'Month', 'Year']) {
      const input = screen.getByLabelText(label) as HTMLInputElement;
      expect(input.type).toBe('text');
      expect(input.inputMode).toBe('numeric');
      expect(input.autocomplete).toBe('off');
    }
    expect(document.querySelector('input[type=date]')).toBeNull();
  });
  it('keeps the ISO date and says it in words after 29, 10, 2026', () => {
    const onValue = vi.fn();
    render(<Host onValue={onValue} />);
    fill('29', '10', '2026');
    expect(onValue).toHaveBeenLastCalledWith('2026-10-29');
    expect(screen.getByText('You chose 29 October 2026, week 2 (the third week after surgery).')).toBeInTheDocument();
  });
  it('shows the stored date in the three fields', () => {
    render(<Host initial="2026-10-29" onValue={vi.fn()} />);
    expect((screen.getByLabelText('Day') as HTMLInputElement).value).toBe('29');
    expect((screen.getByLabelText('Month') as HTMLInputElement).value).toBe('10');
    expect((screen.getByLabelText('Year') as HTMLInputElement).value).toBe('2026');
  });
  it('keeps no date and says Enter a real date for 31 April', () => {
    const onValue = vi.fn();
    render(<Host onValue={onValue} />);
    fill('31', '4', '2026');
    expect(onValue).toHaveBeenLastCalledWith('');
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a real date');
    expect(screen.queryByText(/You chose/)).toBeNull();
  });
  it('keeps no date and says so for a date in the future', () => {
    const onValue = vi.fn();
    render(<Host onValue={onValue} />);
    fill('19', '11', '2026');
    expect(onValue).toHaveBeenLastCalledWith('');
    expect(screen.getByRole('alert')).toHaveTextContent('The date cannot be in the future');
    expect(screen.getByLabelText('Day')).toHaveAttribute('aria-invalid', 'true');
  });
  it('clears the kept date when a part is cleared, and shows no message', () => {
    const onValue = vi.fn();
    render(<Host initial="2026-10-29" onValue={onValue} />);
    type('Day', '');
    expect(onValue).toHaveBeenLastCalledWith('');
    expect(screen.queryByRole('alert')).toBeNull();
  });
  it('does not change the value on focus or blur', () => {
    const onValue = vi.fn();
    render(<Host initial="2026-10-29" onValue={onValue} />);
    for (const label of ['Day', 'Month', 'Year']) {
      fireEvent.focus(screen.getByLabelText(label));
      fireEvent.blur(screen.getByLabelText(label));
    }
    fireEvent.click(document.body);
    expect(onValue).not.toHaveBeenCalled();
  });
  it('does not show a message while the year is still being typed', () => {
    render(<Host onValue={vi.fn()} />);
    fill('29', '10', '20');
    expect(screen.queryByRole('alert')).toBeNull();
    fireEvent.blur(screen.getByLabelText('Year'));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a real date');
  });
});
