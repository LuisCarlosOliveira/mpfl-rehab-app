import { ChoiceGroup, ChoiceInput, type ChoiceProps } from './ChoiceGroup';

export function SegmentedChoice<T extends string>({ name, legend, value, options, onChange, children }: ChoiceProps<T>) {
  return (
    <ChoiceGroup legend={legend}>
      <div className="v3-seg" data-count={options.length}>
        {options.map((o) => (
          <ChoiceInput key={o.value} name={name} option={o} checked={value === o.value} onChange={onChange} className="v3-seg-cell" />
        ))}
      </div>
      {children}
    </ChoiceGroup>
  );
}
