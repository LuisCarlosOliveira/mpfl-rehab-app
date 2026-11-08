import { z } from 'zod';

// Strict schema for a protocol file. The file comes from outside, so every
// string, array and number has a limit and unknown keys are rejected.

const text = (max: number) => z.string().max(max);
const flexion = z.number().min(0).max(180);

export const EXERCISE_KINDS = ['heel-slide', 'straight-leg-raise', 'mini-squat', 'seated-extension-hold'] as const;

export const exerciseSchema = z.strictObject({
  kind: z.enum(EXERCISE_KINDS),
  sets: z.number().int().min(1).max(20).optional(),
  reps: z.number().int().min(1).max(100).optional(),
  holdSeconds: z.number().min(1).max(120).optional(),
  targetFlexion: flexion.optional(),
  maxFlexion: flexion.optional(), // ceiling set by the surgeon. Above it: alert, no count.
  source: text(200), // where each value comes from: an S-number or PROPOSAL
});

export const phaseSchema = z.strictObject({
  id: z.number().int().min(1).max(10),
  name: text(60),
  exercises: z.array(exerciseSchema).max(10),
});

// Every surgeon field is optional and has no default.
export const SURGEON_FIELDS = ['brace', 'weightBearing', 'depthLimit', 'phaseClearance'] as const;

export const surgeonSchema = z.strictObject({
  brace: text(200).optional(),
  weightBearing: text(200).optional(),
  depthLimit: text(200).optional(),
  phaseClearance: text(200).optional(),
});

export const protocolSchema = z.strictObject({
  schemaVersion: z.literal(1),
  id: text(64),
  example: z.boolean().optional(),
  side: z.enum(['left', 'right']),
  authoredBy: text(100).optional(),
  approvedOn: z.iso.date().optional(),
  activePhase: z.number().int().min(1).max(10),
  painPauseThreshold: z.number().int().min(0).max(10).optional(),
  phases: z.array(phaseSchema).min(1).max(10),
  surgeon: surgeonSchema,
});

export type Protocol = z.infer<typeof protocolSchema>;
export type Exercise = z.infer<typeof exerciseSchema>;
export type SurgeonField = (typeof SURGEON_FIELDS)[number];
