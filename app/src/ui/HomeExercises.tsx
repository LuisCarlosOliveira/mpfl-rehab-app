// The two text lines of a generated plan. The text comes from the rules, so one sentence has one place.
// The five exercises that were home exercises are normal rows now (exercise monitoring, step A).
import type { Protocol } from '../lib/protocol';
import { RULES } from '../lib/protocolGen';
import './screensV2.css';

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
