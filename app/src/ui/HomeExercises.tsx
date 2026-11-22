import type { Protocol } from '../lib/protocol';
import { RULES, type WhyEntry } from '../lib/protocolGen';
import './screensV2.css';

export function PlanLines({ protocol, why = [] }: { protocol: Protocol; why?: readonly WhyEntry[] }) {
  const made = protocol.generated?.rules ?? [];
  return (
    <>
      {(['ROM_CHECK', 'PT_VISITS'] as const).filter((id) => made.includes(id)).map((id) => (
        <p key={id} className="detail">
          {why.find((e) => e.ruleId === id)?.text ?? RULES[id].text}
        </p>
      ))}
    </>
  );
}
