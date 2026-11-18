// Today's plan as a list with a position mark. The status of a row comes from the position of currentId:
// rows before it are done, the row itself is next, rows after it are later. currentId null means every row is done.
// The current row has aria-current="step". The children show only in the current row (for example the Start button).
import type { ReactNode } from 'react';
import { Icon } from '../Icon';
import './parts.css';

export interface PlanItem {
  id: string;
  name: string;
  dose: string;
  /** One more line under the dose, for example what the camera does for this exercise. */
  note?: string;
}

type Status = 'done' | 'next' | 'later';

const WORD: Record<Status, string> = { done: 'Done', next: 'Next', later: 'Later' };

interface Props {
  items: readonly PlanItem[];
  currentId: string | null;
  label?: string;
  children?: ReactNode;
  /** A control for a row, by item id. It shows in that row in any status. */
  actions?: Readonly<Record<string, ReactNode>>;
}

export function PlanList({ items, currentId, label = "Today's plan", children, actions }: Props) {
  if (items.length === 0) return <p className="v3-empty">No exercises in the plan.</p>;
  const at = currentId === null ? items.length : items.findIndex((i) => i.id === currentId);
  const position = at === -1 ? items.length + 1 : at; // an unknown id marks nothing as current
  const status = (i: number): Status => (i < position ? 'done' : i === position ? 'next' : 'later');
  return (
    <ol className="v3-plan" aria-label={label}>
      {items.map((item, i) => {
        const s = status(i);
        return (
          <li key={item.id} data-status={s} aria-current={s === 'next' ? 'step' : undefined}>
            <span className="v3-dot" aria-hidden="true">
              {s === 'done' ? <Icon name="check" size={16} /> : i + 1}
            </span>
            <span className="v3-plan-text">
              <span className="v3-plan-name">{item.name}</span>
              <span className="v3-plan-dose">{item.dose}</span>
              {item.note ? <span className="v3-plan-dose v3-plan-note">{item.note}</span> : null}
            </span>
            <span className="v3-tag">{WORD[s]}</span>
            {s === 'next' && children ? <div className="v3-plan-action">{children}</div> : null}
            {actions?.[item.id] ? <div className="v3-plan-row-action">{actions[item.id]}</div> : null}
          </li>
        );
      })}
    </ol>
  );
}
