export class ClipInputError extends Error {}
export type Leg = 'left' | 'right';
export interface ClipArgs {
  file: string;
  leg: Leg;
  exercise: string;
  kind: 'heel-slide' | 'mini-squat' | 'straight-leg-raise' | 'seated-extension-hold';
  reference: string | null;
  out: string;
  target: number;
  maxFlexion: number | null;
  holdSeconds: number;
  baseline: number | null;
  baselineFrom: { fromS: number; toS: number } | null;
  returnWithin: number | null;
  cameraSide: Leg;
}
export interface ClipFrame {
  time_s: number;
  allVisible: boolean;
  visibility: number[];
  flexionRaw: number | null;
  flexionFiltered: number | null;
  event: string | null;
  points?: Record<string, { visibility: number }> | null;
}
export interface ClipSummary {
  frames: number;
  framesAllVisible: number;
  detectionRate: number | null;
  visibilityMean: number | null;
  visibilityP5: number | null;
  angleMin: number | null;
  angleMax: number | null;
  reps: number;
  repPeaks: number[];
  legDetection: { left: number; right: number } | null;
  processingFps: number | null;
  videoFps: number;
}
export interface ReferenceRow {
  time_s: number;
  angle_deg: number;
}
export interface Agreement {
  pairs: number;
  maxGapS: number;
  result: Record<string, unknown> | null;
  reason: string | null;
}
export function parseArgs(argv: string[]): ClipArgs;
export function percentile(values: number[], p: number): number | null;
export function summarize(frames: ClipFrame[], opts: { videoFps: number; processingMs: number; minVisibility?: number }): ClipSummary;
export function readReference(text: string): ReferenceRow[];
export function agreementFromReference(frames: ClipFrame[], refs: ReferenceRow[], maxGapS?: number): Agreement;
export interface ClipSample<L> {
  tMs: number;
  landmarks: L | null;
}
export type BaselineFound =
  | { ok: true; baselineDeg: number; fromMs: number | null; toMs: number | null }
  | { ok: false; reason: string };
export interface IdentityCounts {
  left: number;
  right: number;
  ambiguous: number;
  none: number;
  windows: string[];
}
export interface ClipInfo {
  baseline: BaselineFound;
  returnWithin: { value: number | null; source: string };
  countBlock: string | null;
  sessionStartS: number;
  legRole: string | null;
  identity: IdentityCounts;
}
export function resolveReturnWithin(
  args: Pick<ClipArgs, 'returnWithin' | 'kind'>,
  protocol: { phases: { exercises: { kind: string; returnWithinDeg?: number }[] }[] },
): { value: number | null; source: string };
export function findBaseline<L>(
  samples: ClipSample<L>[],
  opts: {
    restingBaseline: (history: { tMs: number; landmarks: L }[], side: Leg, aspect: number, config: never) => { ok: true; baselineDeg: number } | { ok: false; reason: string };
    side: Leg;
    aspect: number;
    config: { stillWindowMs: number };
    range?: { fromMs: number; toMs: number } | null;
  },
): BaselineFound;
export function identityCounts(answers: string[]): IdentityCounts;
export function textSummary(name: string, args: ClipArgs, summary: ClipSummary, agreement: Agreement | null, info?: ClipInfo | null): string;
