import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GENERAL_GUIDANCE_NOTE, MESSAGES, RED_FLAGS } from '../../src/lib/redflags';
import { RedFlag } from '../../src/ui/RedFlag';

afterEach(cleanup);

const setup = () => {
  const props = { onClear: vi.fn(), onBlocked: vi.fn(), onCancel: vi.fn() };
  render(<RedFlag {...props} />);
  return props;
};

describe('RedFlag screen', () => {
  it('lists every item of RED_FLAGS as a checkbox', () => {
    setup();
    expect(screen.getAllByRole('checkbox')).toHaveLength(RED_FLAGS.length);
    for (const flag of RED_FLAGS) expect(screen.getByLabelText(flag.text)).not.toBeChecked();
  });

  it('shows the general guidance note and no block at the start', () => {
    setup();
    expect(screen.getAllByText(GENERAL_GUIDANCE_NOTE)).toHaveLength(1);
    expect(screen.queryByText(MESSAGES.emergency)).toBeNull();
    expect(screen.queryByText(MESSAGES['care-team'])).toBeNull();
    expect(screen.getByRole('button', { name: /none of these apply/i })).toBeEnabled();
  });

  it.each(RED_FLAGS.map((f) => [f.id, f] as const))('a tick on "%s" blocks and shows the message of its group', (_id, flag) => {
    const props = setup();
    fireEvent.click(screen.getByLabelText(flag.text));
    const other = flag.group === 'emergency' ? MESSAGES['care-team'] : MESSAGES.emergency;
    expect(screen.getByText(MESSAGES[flag.group])).toBeInTheDocument();
    expect(screen.queryByText(other)).toBeNull();
    expect(screen.getAllByText(GENERAL_GUIDANCE_NOTE)).toHaveLength(2);
    const next = screen.getByRole('button', { name: /none of these apply/i });
    expect(next).toBeDisabled();
    fireEvent.click(next);
    expect(props.onClear).not.toHaveBeenCalled();
    expect(props.onBlocked).toHaveBeenCalledTimes(1);
  });

  it('shows the emergency message when both groups are ticked', () => {
    setup();
    const care = RED_FLAGS.find((f) => f.group === 'care-team')!;
    const emergency = RED_FLAGS.find((f) => f.group === 'emergency')!;
    fireEvent.click(screen.getByLabelText(care.text));
    fireEvent.click(screen.getByLabelText(emergency.text));
    expect(screen.getByText(MESSAGES.emergency)).toBeInTheDocument();
    expect(screen.queryByText(MESSAGES['care-team'])).toBeNull();
  });

  it('counts one block for each visit, even with more ticks', () => {
    const props = setup();
    fireEvent.click(screen.getByLabelText(RED_FLAGS[0]!.text));
    fireEvent.click(screen.getByLabelText(RED_FLAGS[1]!.text));
    expect(props.onBlocked).toHaveBeenCalledTimes(1);
  });

  it('an untouched list continues', () => {
    const props = setup();
    fireEvent.click(screen.getByRole('button', { name: /none of these apply/i }));
    expect(props.onClear).toHaveBeenCalledTimes(1);
  });

  it('keeps the block for the visit when the patient unticks the item', () => {
    const props = setup();
    const flag = RED_FLAGS[0]!;
    fireEvent.click(screen.getByLabelText(flag.text));
    fireEvent.click(screen.getByLabelText(flag.text));
    const next = screen.getByRole('button', { name: /none of these apply/i });
    expect(next).toBeDisabled();
    expect(screen.getByText(MESSAGES[flag.group])).toBeInTheDocument();
    fireEvent.click(next);
    expect(props.onClear).not.toHaveBeenCalled();
    expect(props.onBlocked).toHaveBeenCalledTimes(1);
  });

  it('keeps the emergency message when only a care team item stays ticked', () => {
    setup();
    const care = RED_FLAGS.find((f) => f.group === 'care-team')!;
    const emergency = RED_FLAGS.find((f) => f.group === 'emergency')!;
    fireEvent.click(screen.getByLabelText(emergency.text));
    fireEvent.click(screen.getByLabelText(care.text));
    fireEvent.click(screen.getByLabelText(emergency.text));
    expect(screen.getByText(MESSAGES.emergency)).toBeInTheDocument();
    expect(screen.queryByText(MESSAGES['care-team'])).toBeNull();
  });

  it('tells the patient to go back to Home to start again, only after a block', () => {
    setup();
    expect(screen.queryByText(/go back to home to start again/i)).toBeNull();
    fireEvent.click(screen.getByLabelText(RED_FLAGS[0]!.text));
    expect(screen.getByText(/go back to home to start again/i)).toBeInTheDocument();
  });

  it('counts one block when the patient ticks again after an untick', () => {
    const props = setup();
    const flag = RED_FLAGS[0]!;
    fireEvent.click(screen.getByLabelText(flag.text));
    fireEvent.click(screen.getByLabelText(flag.text));
    fireEvent.click(screen.getByLabelText(flag.text));
    expect(props.onBlocked).toHaveBeenCalledTimes(1);
  });

  it('has a way back to Home', () => {
    const props = setup();
    fireEvent.click(screen.getByRole('button', { name: /back to home/i }));
    expect(props.onCancel).toHaveBeenCalled();
  });
});
