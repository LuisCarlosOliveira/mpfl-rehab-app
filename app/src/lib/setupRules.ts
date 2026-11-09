// Camera setup check (FR27). Pure functions from landmarks to one instruction or "ready".
// Rules and texts: research/ux-flow.md section 6.2. Wording: mpfl-clinical-guardrails (no verdict words).
// The visibility gate is MIN_VISIBILITY of angle.ts (FR7, UNVERIFIED value).

import { MIN_VISIBILITY, selectLeg, type Landmark, type Side } from './angle';
import { restingBaseline } from './baseline';
import { calmRun, isStill } from './still';

export interface SetupConfig {
  edgeFraction: number;
  minLegFraction: number;
  maxHipGap: number;
  stillMaxMove: number;
  stillWindowMs: number;
  failHoldMs: number;
  announceEveryMs: number;
  countdownMs: number;
  moreTimeMs: number;
  distanceAdviceM: { min: number; max: number };
}

// All numbers of the setup check. T13 must tune the PROPOSAL values on real video.
export const SETUP_CONFIG: SetupConfig = {
  // PROPOSAL, to be tuned in T13: a leg landmark within 5 percent of a frame edge fails (ux-flow 6.2 rule 4).
  edgeFraction: 0.05,
  // PROPOSAL, to be tuned in T13: leg length (hip to knee plus knee to ankle) below 30 percent of the long frame side fails (rule 5).
  minLegFraction: 0.3,
  // PROPOSAL, to be tuned in T13: gap between the two hips, as a fraction of leg length. Side-on needs a small gap (rule 6).
  maxHipGap: 0.25,
  // PROPOSAL (engineering, not clinical): hip, knee or ankle moves more than 2 percent of frame height (rule 7).
  // F1 check on the saved pose output of 7 clips (tests/still.test.ts). A leg that holds still moves 0.004 to 0.013 of the frame
  // in its calmest 2 s window (noise floor, clips 03 to 07). A person who moves all the time moves 0.040 or more (clips 01, 02).
  // The limit 0.02 is 1.5 times the highest noise floor and half of the move of a moving person. So it is not stricter than the camera.
  stillMaxMove: 0.02,
  // PROPOSAL (engineering, not clinical): the stillness window is 2 seconds (rule 7). The same F1 check holds for this window.
  stillWindowMs: 2000,
  // PROPOSAL, to be tuned in T13: a failure must last 1 second before the text changes (FR27: no flicker).
  failHoldMs: 1000,
  // PROPOSAL, to be tuned in T13: the spoken text changes at most every 3 seconds (FR27, WCAG 4.1.3).
  announceEveryMs: 3000,
  // PROPOSAL, to be tuned in T13: the start timer is 5 seconds (FR27).
  countdownMs: 5000,
  // PROPOSAL, to be tuned in T13: "More time" adds 30 seconds (WCAG 2.2.1, ux-flow 6.2).
  moreTimeMs: 30000,
  // VERIFIED for one study (Okuno 2026, ux-flow 6.1). Advice text only. Landmarks cannot measure it.
  distanceAdviceM: { min: 2.0, max: 2.5 },
};

export type SetupRuleId = 'no-pose' | 'turn-leg' | 'show-leg' | 'whole-leg' | 'closer' | 'side-on' | 'still' | 'ready';

// Fixed instruction texts. ux-flow 6.2. The text of 'still' names 2 seconds, the window of SETUP_CONFIG.
export const SETUP_TEXT: Record<SetupRuleId, string> = {
  'no-pose': 'Step into the view.',
  'turn-leg': 'Turn so your chosen leg faces the camera.',
  'show-leg': 'Your hip, knee and ankle must show. Remove anything that covers your leg.',
  'whole-leg': 'Move back. Show your whole leg.',
  closer: 'Move closer.',
  'side-on': 'Turn side-on to the camera.',
  still: 'Hold still for 2 seconds.',
  ready: 'The camera sees your hip, knee and ankle.',
};

export type Posture = 'upright' | 'lying';

// A person who lies down cannot turn the body. These two rules then ask to move the camera. Other texts fit both postures.
const LYING_TEXT: Partial<Record<SetupRuleId, string>> = {
  'turn-leg': 'Move the camera so that it sees the side of your chosen leg.',
  'side-on': 'Move the camera to the side of your body.',
};

/** The instruction for a rule. A person who lies down gets the camera text for the turn rules. */
export const setupText = (id: SetupRuleId, posture: Posture = 'upright'): string =>
  (posture === 'lying' ? LYING_TEXT[id] : undefined) ?? SETUP_TEXT[id];

export interface SetupSample {
  tMs: number;
  landmarks: Landmark[];
}

export interface SetupResult {
  id: SetupRuleId;
  text: string;
  ready: boolean;
}

// MediaPipe ids: hip, then heel and foot index.
const HIP: Record<Side, number> = { left: 23, right: 24 };
const FOOT: Record<Side, number[]> = { left: [29, 31], right: [30, 32] };
const otherSide = (side: Side): Side => (side === 'left' ? 'right' : 'left');

const visible = (p: Landmark) => (p.visibility ?? 1) >= MIN_VISIBILITY;
const meanVisibility = (leg: Landmark[]) => leg.reduce((sum, p) => sum + (p.visibility ?? 1), 0) / leg.length;

/**
 * Returns the first failed rule in priority order, or ready.
 * `side` is the leg that the person chose. `cameraSide` is the side of the person that the camera is on. It defaults to `side`.
 * `aspect` is video width divided by height. `history` holds recent samples, newest last, and is needed for the stillness rule.
 */
export function evaluateSetup(
  landmarks: Landmark[] | null,
  side: Side,
  aspect: number,
  config: SetupConfig = SETUP_CONFIG,
  history: SetupSample[] = [],
  cameraSide: Side = side,
  posture: Posture = 'upright',
): SetupResult {
  const out = (id: SetupRuleId): SetupResult => ({ id, text: setupText(id, posture), ready: id === 'ready' });

  if (!landmarks || landmarks.length < 33) return out('no-pose');
  const leg = selectLeg(landmarks, side);

  if (!leg.every(visible)) {
    // A far leg is expected to be hidden by the near leg, so turning the body does not help then.
    const other = selectLeg(landmarks, otherSide(side));
    return out(cameraSide === side && meanVisibility(other) > meanVisibility(leg) ? 'turn-leg' : 'show-leg');
  }

  const e = config.edgeFraction;
  const foot = FOOT[side].flatMap((i) => landmarks[i] ?? []).filter(visible);
  if ([...leg, ...foot].some((p) => p.x < e || p.x > 1 - e || p.y < e || p.y > 1 - e)) return out('whole-leg');

  const [hip, knee, ankle] = leg;
  const legLength = Math.hypot((hip.x - knee.x) * aspect, hip.y - knee.y) + Math.hypot((knee.x - ankle.x) * aspect, knee.y - ankle.y);
  if (legLength / Math.max(aspect, 1) < config.minLegFraction) return out('closer');

  // The far hip is often hidden when the view is side-on. A hidden hip does not fail the rule.
  // The near hip is the hip on the camera side. It is the hip of the chosen leg when that leg is near.
  const nearHip = landmarks[HIP[cameraSide]];
  const farHip = landmarks[HIP[otherSide(cameraSide)]];
  if (nearHip && farHip && visible(nearHip) && visible(farHip) && (Math.abs(nearHip.x - farHip.x) * aspect) / legLength > config.maxHipGap) {
    return out('side-on');
  }

  if (!isStill(history, side, aspect, config)) return out('still');
  return out('ready');
}

export interface SetupSampleInput {
  landmarks: Landmark[] | null;
  /** The leg that the person chose. */
  side: Side;
  /** The side of the person that the camera is on. Missing means the side of the chosen leg. */
  cameraSide?: Side;
  /** Missing means upright. A person who lies down gets the camera texts. */
  posture?: Posture;
  aspect: number;
}

export interface StabilizedSetup {
  rule: SetupRuleId;
  text: string;
  /** True after the countdown ends. */
  ready: boolean;
  /** Text to speak or put in the live region, or null. Changes at most every `announceEveryMs`. */
  announce: string | null;
  /** Milliseconds left in the start countdown, or null if it is not running. */
  countdownLeftMs: number | null;
  /** The resting flexion of the chosen leg in degrees, once the check is ready. Otherwise null. */
  baselineDeg: number | null;
  /** From 0 to 1: how much of the still window the leg has held still. null unless the shown rule is the still rule. */
  stillProgress: number | null;
}

/**
 * Keeps the history, shows a new rule only after it held for `failHoldMs`, limits the announcements,
 * and runs the start countdown. Call the returned function for each pose result. `moreTime()` adds `moreTimeMs`.
 */
export function createSetupStabilizer(config: SetupConfig = SETUP_CONFIG) {
  let history: SetupSample[] = [];
  let shown: SetupRuleId | null = null;
  let pending: { id: SetupRuleId; since: number } | null = null;
  let readySince: number | null = null;
  let extraMs = 0;
  let announced: SetupRuleId | null = null;
  let announcedAt = -Infinity;
  let baselineDeg: number | null = null;

  const step = (sample: SetupSampleInput, tMs: number): StabilizedSetup => {
    if (sample.landmarks) {
      history.push({ tMs, landmarks: sample.landmarks });
      // Keep one sample at or before the window start, so the window is fully covered.
      while ((history[1]?.tMs ?? Infinity) <= tMs - config.stillWindowMs) history.shift();
    } else {
      history = [];
    }

    const posture = sample.posture ?? 'upright';
    const current = evaluateSetup(sample.landmarks, sample.side, sample.aspect, config, history, sample.cameraSide, posture).id;
    if (current === 'ready') {
      // The leg held still, so the median of the window is the resting angle. The newest good value stays.
      const rest = restingBaseline(history, sample.side, sample.aspect, config);
      if (rest.ok) baselineDeg = rest.baselineDeg;
    }
    if (shown === null) {
      shown = current;
    } else if (current === shown) {
      pending = null;
    } else {
      if (pending?.id !== current) pending = { id: current, since: tMs };
      if (tMs - pending.since >= config.failHoldMs) {
        shown = current;
        pending = null;
      }
    }

    if (shown !== 'ready') {
      readySince = null;
      baselineDeg = null; // the person moved: measure again
    } else if (readySince === null) readySince = tMs;
    const countdownLeftMs = readySince === null ? null : Math.max(0, readySince + config.countdownMs + extraMs - tMs);

    let announce: string | null = null;
    if (shown !== announced && tMs - announcedAt >= config.announceEveryMs) {
      announce = setupText(shown, posture);
      announced = shown;
      announcedAt = tMs;
    }
    const calm = shown === 'still' && history.length > 0 ? calmRun(history, sample.side, sample.aspect, config.stillMaxMove) : [];
    const stillProgress =
      shown !== 'still' ? null : calm.length < 2 ? 0 : Math.min(1, ((calm[calm.length - 1] as SetupSample).tMs - (calm[0] as SetupSample).tMs) / config.stillWindowMs);
    return { rule: shown, text: setupText(shown, posture), ready: countdownLeftMs === 0, announce, countdownLeftMs, baselineDeg, stillProgress };
  };

  return Object.assign(step, {
    moreTime() {
      extraMs += config.moreTimeMs;
    },
  });
}
