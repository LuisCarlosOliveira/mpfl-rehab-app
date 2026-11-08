import { z } from 'zod';
import { MARGIN_DEG } from '../margin';

// Strict schema for a protocol file. The file comes from outside, so every
// string, array and number has a limit and unknown keys are rejected.

const text = (max: number) => z.string().max(max);
const flexion = z.number().min(0).max(180);

// The id goes into every export. Letters, digits, dot, dash and underscore only,
// so it cannot hold a name with spaces, a control character or a formula start.
export const protocolIdSchema = z
  .string()
  .regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/, 'The id can hold letters, digits, dot, dash and underscore only, 64 characters at most.');

export const EXERCISE_KINDS = ['heel-slide', 'straight-leg-raise', 'mini-squat', 'seated-extension-hold'] as const;

export const exerciseSchema = z
  .strictObject({
    kind: z.enum(EXERCISE_KINDS),
    sets: z.number().int().min(1).max(20).optional(),
    reps: z.number().int().min(1).max(100).optional(),
    holdSeconds: z.number().min(1).max(120).optional(),
    targetFlexion: flexion.optional(),
    // Seated extension hold only. The straightest knee angle that the clinician allows (the end of the arc).
    // The hold runs between minFlexion and targetFlexion. 0 allows full extension. No default (T28, P1, P2 rec 29).
    minFlexion: flexion.optional(),
    maxFlexion: flexion.optional(), // ceiling set by the surgeon. Above it plus the margin: alert, no count.
    minRepSeconds: z.number().min(0.5).max(30).optional(), // a faster rep gets the cue "rep was fast"
    maxTopFlexion: flexion.optional(), // limit at the top of the straight leg raise
    // PROPOSAL (T17): a rep ends when the knee is back within this many degrees of the resting angle. No default.
    returnWithinDeg: z.number().min(1).max(90).optional(),
    source: text(200), // where each value comes from: an S-number or PROPOSAL
  })
  .refine((e) => e.maxFlexion === undefined || e.targetFlexion === undefined || e.maxFlexion >= e.targetFlexion, {
    message: 'maxFlexion must not be smaller than targetFlexion',
    path: ['maxFlexion'],
  })
  // Only the rep counters use both values. The hold counter ignores maxFlexion.
  .superRefine((e, ctx) => {
    if (e.kind !== 'heel-slide' && e.kind !== 'mini-squat') return;
    if (e.maxFlexion === undefined || e.targetFlexion === undefined || e.maxFlexion < e.targetFlexion) return;
    if (e.maxFlexion > e.targetFlexion + MARGIN_DEG) return;
    ctx.addIssue({
      code: 'custom',
      path: ['maxFlexion'],
      message: `For ${e.kind}, maxFlexion (${e.maxFlexion}) must be more than targetFlexion (${e.targetFlexion}) plus the margin of ${MARGIN_DEG} degrees. Raise maxFlexion or lower targetFlexion. A closer limit gives a stop cue on every rep.`,
    });
  })
  .refine((e) => e.minFlexion === undefined || e.kind === 'seated-extension-hold', {
    message: 'minFlexion applies to seated-extension-hold only, because only this exercise has a straightest allowed angle. Remove it from this exercise.',
    path: ['minFlexion'],
  })
  .superRefine((e, ctx) => {
    if (e.minFlexion === undefined || e.minFlexion === 0 || e.targetFlexion === undefined) return;
    if (e.targetFlexion > e.minFlexion + MARGIN_DEG) return;
    ctx.addIssue({
      code: 'custom',
      path: ['targetFlexion'],
      message: `For seated-extension-hold, targetFlexion (${e.targetFlexion}) must be more than minFlexion (${e.minFlexion}) plus the margin of ${MARGIN_DEG} degrees. Raise targetFlexion or lower minFlexion. A closer hold angle gives a stop cue on every hold.`,
    });
  })
  .refine((e) => e.returnWithinDeg === undefined || e.kind === 'heel-slide' || e.kind === 'mini-squat', {
    message: 'returnWithinDeg applies to heel-slide and mini-squat only, because only these exercises count reps. Remove it from this exercise.',
    path: ['returnWithinDeg'],
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
  limit: z.number().min(0).max(100000), // a number that the clinician sets. No default.
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
}).refine((p) => new Set(p.exercises.map((e) => e.kind)).size === p.exercises.length, {
  message: 'An exercise can appear only once in a phase, because a second entry makes the limit unclear.',
  path: ['exercises'],
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

// The mark of a plan that the app made. `on` is the date of the plan. `rules` lists the ids of the generator rules
// that made the plan, so a clinician can audit it. An id is short and strict, never free text.
// It is optional and has no default. The app never removes it from a loaded file.
export const ruleIdSchema = z.string().regex(/^[A-Z][A-Z0-9_]{0,23}$/, 'A rule id is capital letters, digits and underscore, 24 characters at most.');
export const generatedSchema = z.strictObject({
  on: z.iso.date(),
  rules: z.array(ruleIdSchema).max(40),
});

export const protocolSchema = z.strictObject({
  schemaVersion: z.literal(1),
  id: protocolIdSchema,
  example: z.boolean().optional(),
  side: z.enum(['left', 'right']),
  authoredBy: text(100).optional(),
  approvedOn: z.iso.date().optional(),
  generated: generatedSchema.optional(),
  activePhase: z.number().int().min(1).max(10),
  painPauseThreshold: z.number().int().min(0).max(10).optional(),
  phases: z.array(phaseSchema).min(1).max(10),
  surgeon: surgeonSchema,
})
  .refine((p) => p.generated === undefined || !p.example, {
    message: 'A generated plan cannot be the example. Remove one of the two fields.',
    path: ['generated'],
  })
  .refine((p) => new Set(p.phases.map((ph) => ph.id)).size === p.phases.length, {
    message: 'Two phases have the same id.',
    path: ['phases'],
  })
  .refine((p) => p.phases.some((ph) => ph.id === p.activePhase), {
    message: 'The active phase must be the id of one of the phases.',
    path: ['activePhase'],
  });

export type Protocol = z.infer<typeof protocolSchema>;
export type Exercise = z.infer<typeof exerciseSchema>;
export type ReviewCriterion = z.infer<typeof reviewCriterionSchema>;
export type SurgeonField = (typeof SURGEON_FIELDS)[number];
