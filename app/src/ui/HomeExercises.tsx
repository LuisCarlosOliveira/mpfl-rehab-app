// The home exercises that the camera does not count, and the two text lines of a generated plan (generator v2, step A).
// The list has no Start button and no count. The text comes from the rules, so one sentence has one place.
import { HOME_NAMES, homeDose, NOT_CHECKED } from '../lib/planView';
import type { HomeExercise, Protocol } from '../lib/protocol';
import { RULES } from '../lib/protocolGen';
import './screensV2.css';

export function HomeExerciseList({ items }: { items: readonly HomeExercise[] }) {
  if (items.length === 0) return null;
  // The same dose rows as the plan (C2): the name at the left, the dose at the right, the note under them. The wrapper gives the rows their styles.
  return (
    <div className="v2-screens">
      <ul className="plan-exercises dose-list" aria-label="Exercises that the app does not check">
        {items.map((h) => (
          <li key={h.kind} className="dose-row">
            <p className="exercise-name dose-name">{HOME_NAMES[h.kind]}</p>
            <p className="dose">{homeDose(h)}</p>
            <p className="detail dose-note">{NOT_CHECKED}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The week-4 line and the physiotherapy line. A plan shows each line only when its rule made the plan. */
export function PlanLines({ protocol }: { protocol: Protocol }) {
  const made = protocol.generated?.rules ?? [];
  return (
    <>
      {(['ROM_CHECK', 'PT_VISITS'] as const).filter((id) => made.includes(id)).map((id) => (
        <p key={id} className="detail">
          {RULES[id].text}
        </p>
      ))}
    </>
  );
}
