import { z } from 'zod';
import { MARGIN_DEG } from '../margin';

// Strict schema for a protocol file. The file comes from outside, so every
// string, array and number has a limit and unknown keys are rejected.

const text = (max: number) => z.string().max(max);
const flexion = z.number().min(0).max(180);

export const EXERCISE_KINDS = ['heel-slide', 'straight-leg-raise', 'mini-squat', 'seated-extension-hold'] as const;

export const exerciseSchema = z
  .strictObject({
    kind: z.enum(EXERCISE_KINDS),
    sets: z.number().int().min(1).max(20).optional(),
    reps: z.number().int().min(1).max(100).optional(),
    holdSeconds: z.number().min(1).max(120).optional(),
    targetFlexion: flexion.optional(),
    maxFlexion: flexion.optional(), // ceiling set by the surgeon. Above it plus the margin: alert, no count.
    minRepSeconds: z.number().min(0.5).max(30).optional(), // a faster rep gets the cue "rep was fast"
    maxTopFlexion: flexion.optional(), // limit at the top of the straight leg raise
    source: text(200), // where each value comes from: an S-number or PROPOSAL
  })
  .refine((e) => e.maxFlexion === undefined || e.targetFlexion === undefined || e.maxFlexion >= e.targetFlexion, {
    message: 'maxFlexion must not be smaller than targetFlexion',
    path: ['maxFlexion'],
  })
  .refine((e) => e.maxTopFlexion === undefined || e.maxTopFlexion >= MARGIN_DEG, {
    message: `maxTopFlexion must be at least ${MARGIN_DEG} degrees, the camera margin. A smaller limit cannot be measured.`,
    path: ['maxTopFlexion'],
  });

// Review criteria: what the clinician reads in the clinician view. No free text, no default.
const evidence = z.enum(['mpflr', 'borrowed', 'unvalidated']);
const lastSessions = z.number().int().min(3).max(10);

export const CLINICIAN_CHECKS = [
  'extensionFull',
  'slrNoLag',
  'gait',
  'effusionExam',
  'quadStrength',
  'hopTests',
  'balanceTests',
  'psychReadiness',
] as const;

const numericCriterion = z.strictObject({
  kind: z.literal('numeric'),
  measure: z.enum(['peakFlexionDeg', 'topFlexionDeg', 'painMax', 'sessionsDone']),
  exerciseId: z.enum(EXERCISE_KINDS).optional(),
  op: z.enum(['atLeast', 'atMost']),
  limit: z.number(), // a number that the clinician sets. No default.
  lastSessions,
  evidence,
});

const swellingCriterion = z.strictObject({
  kind: z.literal('swelling'),
  noneOrSomeOnly: z.literal(true), // "more than before" is never allowed
  lastSessions,
  evidence,
});

const clinicianCheck = z.strictObject({
  kind: z.literal('clinicianCheck'),
  key: z.enum(CLINICIAN_CHECKS),
  evidence,
});

export const reviewCriterionSchema = z.discriminatedUnion('kind', [numericCriterion, swellingCriterion, clinicianCheck]);

export const phaseSchema = z.strictObject({
  id: z.number().int().min(1).max(10),
  name: text(60),
  exercises: z.array(exerciseSchema).max(10),
  reviewCriteria: z.array(reviewCriterionSchema).max(12).optional(),
  reviewDate: z.iso.date().optional(),
});

// Every surgeon field is optional and has no default.
export const SURGEON_FIELDS = ['brace', 'weightBearing', 'depthLimit', 'phaseClearance', 'concurrentProcedures'] as const;

export const surgeonSchema = z.strictObject({
  brace: text(200).optional(),
  weightBearing: text(200).optional(),
  depthLimit: text(200).optional(),
  phaseClearance: text(200).optional(),
  concurrentProcedures: text(200).optional(),
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
export type ReviewCriterion = z.infer<typeof reviewCriterionSchema>;
export type SurgeonField = (typeof SURGEON_FIELDS)[number];
