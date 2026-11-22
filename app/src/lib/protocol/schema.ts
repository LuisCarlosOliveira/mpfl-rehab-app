import { z } from 'zod';
import { MARGIN_DEG } from '../margin';

const text = (max: number) => z.string().max(max);
const flexion = z.number().min(0).max(180);

export const protocolIdSchema = z
  .string()
  .regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/, 'The id can hold letters, digits, dot, dash and underscore only, 64 characters at most.');

export const EXERCISE_KINDS = ['heel-slide', 'straight-leg-raise', 'mini-squat', 'seated-extension-hold'] as const;

export const NEW_EXERCISE_KINDS = ['quad-set', 'gluteal-set', 'ankle-pump', 'leg-raise-side', 'leg-raise-back'] as const;
export const PLAN_EXERCISE_KINDS = [...EXERCISE_KINDS, ...NEW_EXERCISE_KINDS] as const;
const NEW_KIND_FIELDS = ['targetFlexion', 'minFlexion', 'maxFlexion', 'minRepSeconds', 'maxTopFlexion', 'returnWithinDeg'] as const;

export const planExerciseSchema = z
  .strictObject({
    kind: z.enum(PLAN_EXERCISE_KINDS),
    sets: z.number().int().min(1).max(20).optional(),
    reps: z.number().int().min(1).max(100).optional(),
    holdSeconds: z.number().min(1).max(120).optional(),
    targetFlexion: flexion.optional(),
    minFlexion: flexion.optional(),
    maxFlexion: flexion.optional(), // ceiling set by the surgeon. Above it plus the margin: alert, no count.
    minRepSeconds: z.number().min(0.5).max(30).optional(), // a faster rep gets the cue "rep was fast"
    maxTopFlexion: flexion.optional(), // limit at the top of the straight leg raise
    // PROPOSAL (T17): a rep ends when the knee is back within this many degrees of the resting angle. No default.
    returnWithinDeg: z.number().min(1).max(90).optional(),
    source: text(200), // where each value comes from: an S-number or PROPOSAL
  })
  .superRefine((e, ctx) => {
    if (!(NEW_EXERCISE_KINDS as readonly string[]).includes(e.kind)) return;
    for (const key of NEW_KIND_FIELDS) {
      if (e[key] !== undefined) ctx.addIssue({ code: 'custom', path: [key], message: `${key} does not apply to ${e.kind}. Remove it from this exercise.` });
    }
    if (e.holdSeconds !== undefined && e.kind !== 'quad-set' && e.kind !== 'gluteal-set') {
      ctx.addIssue({ code: 'custom', path: ['holdSeconds'], message: `holdSeconds applies to quad-set and gluteal-set only. Remove it from ${e.kind}.` });
    }
  })
  .refine((e) => e.maxFlexion === undefined || e.targetFlexion === undefined || e.maxFlexion >= e.targetFlexion, {
    message: 'maxFlexion must not be smaller than targetFlexion',
    path: ['maxFlexion'],
  })
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

// LEGACY input. An older file lists these five in `homeExercises`. The loader moves them into `exercises` (normalizeLegacy).
// The dose is optional.
export const HOME_EXERCISE_KINDS = ['quad-set', 'gluteal-set', 'ankle-pump', 'leg-raise-side', 'leg-raise-back'] as const;

export const homeExerciseSchema = z.strictObject({
  kind: z.enum(HOME_EXERCISE_KINDS),
  sets: z.number().int().min(1).max(20).optional(),
  reps: z.number().int().min(1).max(100).optional(),
  source: text(200),
});

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

export const phaseNumber = z.number().int().min(1).max(10).brand<'Phase'>();
export type Phase = z.infer<typeof phaseNumber>;
export const PHASE_FIRST = phaseNumber.parse(1);
export const PHASE_SECOND = phaseNumber.parse(2);

export const phaseSchema = z.strictObject({
  id: phaseNumber,
  name: text(60),
  exercises: z.array(planExerciseSchema).max(10),
  homeExercises: z.array(homeExerciseSchema).max(10).optional(),
  reviewCriteria: z.array(reviewCriterionSchema).max(12).optional(),
  reviewDate: z.iso.date().optional(),
}).refine((p) => new Set(p.exercises.map((e) => e.kind)).size === p.exercises.length, {
  message: 'An exercise can appear only once in a phase, because a second entry makes the limit unclear.',
  path: ['exercises'],
}).refine((p) => p.homeExercises === undefined || new Set(p.homeExercises.map((e) => e.kind)).size === p.homeExercises.length, {
  message: 'A home exercise can appear only once in a phase.',
  path: ['homeExercises'],
});

export const SURGEON_FIELDS = ['brace', 'weightBearing', 'depthLimit', 'phaseClearance', 'concurrentProcedures'] as const;

export const surgeonSchema = z.strictObject({
  brace: text(200).optional(),
  weightBearing: text(200).optional(),
  depthLimit: text(200).optional(),
  phaseClearance: text(200).optional(),
  concurrentProcedures: text(200).optional(),
});

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
  activePhase: phaseNumber,
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
export type PlanExercise = z.infer<typeof planExerciseSchema>;
export type Exercise = PlanExercise & { kind: (typeof EXERCISE_KINDS)[number] };
export type HomeExercise = z.infer<typeof homeExerciseSchema>;
export type ReviewCriterion = z.infer<typeof reviewCriterionSchema>;
export type SurgeonField = (typeof SURGEON_FIELDS)[number];
