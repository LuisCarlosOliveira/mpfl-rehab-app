// Text guide lines for the four exercises. Source: research/technique-sources.md, section "What the app can show without judging".
// Rules: a line states an instruction and its sources. It never rates a movement. It carries no number, because the sources
// disagree on every number and a clinician sets them. A point that only one source states (WEAK) stays out. The text is a
// paraphrase in simple English. It is not a quote.
import type { GuideKind } from './guides';

// Short source names. `mpflr` is true when the source is about MPFL reconstruction. Other sources are BORROWED.
export const SOURCE_NAMES: Record<string, string> = {
  P1: 'HSS MPFL guideline',
  P2: 'Cincinnati Children\'s guideline',
  T1: 'AAOS knee arthroscopy guide',
  T2: 'AAOS knee conditioning guide',
  T3: 'AAOS knee replacement guide',
  T4: 'Ortopedia Evolutiva',
  T5: 'JointBooklet',
  T6: 'Pure Physiotherapy',
  T7: 'Luskin Orthopaedic Institute',
  T8: 'NHS Fife',
  T9: 'Royal United Hospitals Bath',
  T10: 'NHS leaflet on arthroscopy',
  T11: 'NHS leaflet on knee replacement',
  T13: 'Wrightington NHS',
  T14: 'OCATS Health Services',
  T15: 'Leicestershire NHS',
  T16: 'Healthline',
  T17: 'MSD Manual',
  S1: 'Hsu 2025',
};
const MPFLR = new Set(['P1', 'P2', 'T4', 'T5', 'S1']);

export interface TechniqueLine {
  text: string;
  sources: string[];
  /** True when no source of the line is about MPFL reconstruction. */
  borrowed: boolean;
}

export const TECHNIQUE_NOTE =
  'Each line is a paraphrase of what handouts, hospital leaflets and rehab guidelines say. These sources give opinion, not trial proof. Your care team decides how you do the exercise.';

const line = (text: string, ...sources: string[]): TechniqueLine => ({ text, sources, borrowed: !sources.some((s) => MPFLR.has(s)) });

const LINES: Record<GuideKind, TechniqueLine[]> = {
  'straight-leg-raise': [
    line('Tighten the muscles at the front of your thigh. Then lift your leg with your knee straight.', 'T6', 'T4', 'T13', 'T5'),
    line('Lower your leg slowly.', 'T7', 'T13', 'T3', 'T6'),
    line('Ask your care team how high to lift your leg. The sources give very different heights.', 'T1', 'T2', 'T7', 'T8', 'T4', 'T13', 'T11'),
    line('If your knee bends when you lift, stop and ask your care team.', 'T4', 'P1'),
    line('Sources differ on the position of your other leg. Some say bent with the foot flat, others say both legs flat. Ask your care team.', 'T1', 'T17', 'T8', 'T11', 'T6'),
    line('Sources differ on the position of your toes. Some say pull them toward you. Ask your care team.', 'T1', 'T7', 'T8', 'T13'),
  ],
  'heel-slide': [
    line('Keep your heel on the surface and slide it toward your buttock.', 'T3', 'T7', 'T9', 'T6'),
    line('Bend your knee only to the limit that your care team sets. Stop if you feel pain.', 'T9', 'T5', 'T7', 'T10'),
    line('A sock or a towel under your heel can help it slide.', 'T6', 'T13'),
    line('Slide slowly.', 'T5', 'T11', 'T6'),
  ],
  'mini-squat': [
    line('Hold a counter or a chair back for support.', 'T1', 'T14'),
    line('Bend your knees slowly, down to the limit that your care team sets. Then stand up.', 'T4', 'T1', 'T14', 'T8', 'P2'),
    line('Point your knees in the same direction as your toes. Do not let your knees move inward. The app does not check this.', 'T14', 'T4', 'T8', 'T15', 'S1'),
    line('Push your hips back as you bend.', 'P2', 'T14', 'T8'),
  ],
  'seated-extension-hold': [
    line('Sit tall with your thigh on the seat.', 'T14', 'T2'),
    line('Lift your foot until your knee reaches the angle that your care team sets. Do not straighten your knee past that angle.', 'P2', 'P1'),
    line('Lower your foot slowly.', 'T14', 'T11'),
  ],
};

export const techniqueFor = (kind: GuideKind): TechniqueLine[] => LINES[kind];
