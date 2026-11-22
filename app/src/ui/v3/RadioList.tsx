import { ChoiceGroup, ChoiceInput, type ChoiceProps } from './ChoiceGroup';

export function RadioList<T extends string>({ name, legend, value, options, onChange, children }: ChoiceProps<T>) {
  return (
    <ChoiceGroup legend={legend}>
      <div className="v3-radios">
        {options.map((o) => (
          <ChoiceInput key={o.value} name={name} option={o} checked={value === o.value} onChange={onChange} className="v3-opt" />
        ))}
      </div>
      {children}
    </ChoiceGroup>
  );
}
