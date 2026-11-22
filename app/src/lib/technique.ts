// Text guide lines for the four exercises. Source: the project knowledge base, section "What the app can show without judging".
// Rules: a line states an instruction and its sources. It never rates a movement. It carries no number, because the sources
// disagree on every number and a clinician sets them. A point that only one source states (WEAK) stays out. The text is a
// paraphrase in simple English. It is not a quote.
import type { AnyGuideKind, GuideKind, NewGuideKind } from './guides';

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
  P3: 'NHS Lothian MPFL guideline',
  N3: 'Hysing-Dahl 2024',
};
const MPFLR = new Set(['P1', 'P2', 'P3', 'N3', 'T4', 'T5', 'S1']);

interface TechniqueLine {
  text: string;
  sources: string[];
  borrowed: boolean;
  /** True when the line is a PROPOSAL of the app. The sources name the exercise and give no technique text. */
  proposal: boolean;
}

export const TECHNIQUE_NOTE =
  'Each line is a paraphrase of what handouts, hospital leaflets and rehab guidelines say. These sources give opinion, not trial proof. Your care team decides how you do the exercise.';

export const PROPOSAL_NOTE =
  'These lines are a proposal of the app. The sources name this exercise and give no technique for it. Your care team decides how you do the exercise.';

const line = (text: string, ...sources: string[]): TechniqueLine => ({ text, sources, borrowed: !sources.some((s) => MPFLR.has(s)), proposal: false });
const proposal = (text: string, ...sources: string[]): TechniqueLine => ({ ...line(text, ...sources), proposal: true });

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

const PHASE_ONE = 'The sources list this exercise in the first phase of rehab. Your care team sets the plan.';
const PROPOSED: Record<NewGuideKind, TechniqueLine[]> = {
  'quad-set': [
    proposal('Tighten the muscle at the front of your thigh, then relax.', 'S1', 'P1', 'P2', 'P3', 'N3'),
    proposal('One guideline puts a rolled towel under the knee for this exercise.', 'P1'),
    proposal(PHASE_ONE, 'P1', 'P2', 'N3'),
  ],
  'gluteal-set': [
    proposal('Squeeze your buttock muscles together, then relax.', 'P1', 'P2', 'N3'),
    proposal('One guideline calls this an isometric exercise. Your muscles work and your joints do not move.', 'P2'),
    proposal(PHASE_ONE, 'P1', 'P2', 'N3'),
  ],
  'ankle-pump': [
    proposal('Point your toes away from you, then pull them toward you.', 'P1', 'P3'),
    proposal('The sources give no technique detail for this exercise. Ask your care team.', 'P1', 'P3'),
    proposal(PHASE_ONE, 'P1', 'P3'),
  ],
  'leg-raise-side': [
    proposal('Lift your straight leg out to the side. Then lower your leg slowly.', 'S1', 'P2', 'P3'),
    proposal('The sources call this hip abduction. They give no technique detail. Ask your care team.', 'P2', 'P3'),
    proposal(PHASE_ONE, 'S1', 'P2', 'P3'),
  ],
  'leg-raise-back': [
    proposal('Keep your knee straight and lift your leg back behind you. Then lower your leg slowly.', 'S1', 'P2', 'P3'),
    proposal('The sources call this hip extension. They give no technique detail. Ask your care team.', 'P2', 'P3'),
    proposal(PHASE_ONE, 'S1', 'P2', 'P3'),
  ],
};

const isNew = (kind: AnyGuideKind): kind is NewGuideKind => kind in PROPOSED;
export const techniqueFor = (kind: AnyGuideKind): TechniqueLine[] => (isNew(kind) ? PROPOSED[kind] : LINES[kind]);
