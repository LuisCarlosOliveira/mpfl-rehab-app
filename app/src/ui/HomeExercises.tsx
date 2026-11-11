// The home exercises that the camera does not count, and the two text lines of a generated plan (generator v2, step A).
// The list has no Start button and no count. The text comes from the rules, so one sentence has one place.
import { ASK_HOW_MANY, HOME_NAMES, NOT_CHECKED_GROUP } from '../lib/planView';
import type { HomeExercise, Protocol } from '../lib/protocol';
import { DOSE_SHOWN, RULES } from '../lib/protocolGen';
import './screensV2.css';

/**
 * The home exercises as one quiet group under a heading. The camera exercises stay the prominent rows.
 * The sentences that hold for every row show once for the group: how many, and that the app does not check them.
 * The dose is the whole range of the guideline. The source of it shows once for the plan (SourceNote).
 */
export function HomeExerciseList({ items }: { items: readonly HomeExercise[] }) {
  if (items.length === 0) return null;
  const hasDose = (h: HomeExercise) => h.sets !== undefined && h.reps !== undefined;
  const askDose = items.some((h) => !hasDose(h));
  const dosed = items.some(hasDose);
  return (
    <div className="v2-screens home-group">
      <h3 className="home-group-title">At home</h3>
      <ul className="home-list" aria-label="Exercises that the app does not check">
        {items.map((h) => (
          <li key={h.kind} className="home-row">
            <span className="home-name">{HOME_NAMES[h.kind]}</span>
          </li>
        ))}
      </ul>
      {dosed && <p className="detail home-note">How many: {DOSE_SHOWN}.</p>}
      {askDose && (
        <p className="detail home-note">
          {dosed ? `${items.filter((h) => !hasDose(h)).map((h) => HOME_NAMES[h.kind]).join(', ')}: ask your care team.` : `${ASK_HOW_MANY}.`}
        </p>
      )}
      <p className="detail home-note">{NOT_CHECKED_GROUP}</p>
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
