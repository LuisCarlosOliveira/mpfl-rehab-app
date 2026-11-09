import { z } from 'zod';

// The answers of the person. Every answer is an enum, a number or one ISO date. No free text.
// The date is checked by the generator, because a bad date is a referral (R7) and not an error.

const yesNoUnknown = z.enum(['yes', 'no', 'unknown']);

export const inputsSchema = z.strictObject({
  writtenPlan: yesNoUnknown, // I1
  procedure: z.enum(['mpflr-only', 'combined', 'unknown']), // I2
  ageBand: z.enum(['18-plus', 'under-18']), // I3
  bothKnees: z.boolean(), // I4
  firstSurgery: yesNoUnknown, // I5
  specialRules: yesNoUnknown, // I6
  surgeryDate: z.string().max(10).nullable(), // I7
  side: z.enum(['left', 'right']), // I8
  surgeonLimit: z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('degrees'), degrees: z.number().min(0).max(180) }),
    z.strictObject({ kind: z.literal('none') }),
    z.strictObject({ kind: z.literal('unknown') }),
  ]), // I9
  phaseClearance: yesNoUnknown, // the person reports that the care team cleared phase 2
  // The three answers of version 2. A missing answer is "unknown" or "no event", so no mini squat and no seated hold is added.
  walksWithoutCrutches: yesNoUnknown.default('unknown'), // gate of the mini squat (S1, first stage)
  legRaiseStraight: yesNoUnknown.default('unknown'), // gate of the mini squat: the leg raise with no bend of the knee (S1, first stage)
  seatedHoldCleared: yesNoUnknown.default('unknown'), // the person reports that the surgeon cleared the seated hold (P1 phase 2)
  kneeGaveWay: z.boolean().default(false), // a "knee gave way or hurts" press since the plan. The app derives it. It removes the mini squat.
  redFlags: z.record(z.string().max(40), z.boolean()), // I10
  pain: z.number(), // I11
  swelling: z.enum(['none', 'some', 'more']), // I11
});

export type GeneratorInputs = z.input<typeof inputsSchema>;
