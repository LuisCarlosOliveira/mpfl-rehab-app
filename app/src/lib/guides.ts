// Position guide data for the 4 exercises (FR28). Source: research/ux-flow.md section 7 and
// research/clinical.md section 4. Wording follows mpfl-clinical-guardrails: no verdict words, and no number
// that the protocol sets. The protocol supplies targets and limits. Each sentence has 25 words at most.
import type { EXERCISE_KINDS } from './protocol/schema';

export type GuideKind = (typeof EXERCISE_KINDS)[number];

export interface Guide {
  startPosition: string;
  legFacingCamera: string;
  handsAndSupport: string;
  range: string;
  speed: string;
  cameraMustSee: string;
}

// Speed text for all four: ux-flow 7.1 to 7.4 give a speed of about 2 seconds as PROPOSAL (plan T9b).
// The protocol field minRepSeconds sets the time, so the text names no number.
const SLOW = 'Move slowly and with control. If your care team sets a time for each rep, use it.';

const GUIDES: Record<GuideKind, Guide> = {
  // ux-flow 7.1. The sock is a PROPOSAL. clinical.md section 4: range grows by week (S1), so the limit comes from the care team.
  'heel-slide': {
    startPosition: 'Lie on your back on a bed or a mat. Keep both legs straight.',
    legFacingCamera: 'Your operated leg is the leg nearest the camera. Put the camera at the side of that leg.',
    handsAndSupport: 'Keep your hands at your sides. Keep your heel on the surface. A sock on a smooth surface helps your heel slide.',
    range: 'Slide your heel toward your buttock. Bend your knee up to the limit that your care team sets. Then slide your heel back.',
    speed: SLOW,
    cameraMustSee: 'The camera must see your whole leg, from hip to foot. Keep the blanket off your leg.',
  },
  // ux-flow 7.2. The bent other knee and the lift height are PROPOSAL (clinical.md section 4: hip flexion of 30 to 45 degrees, PROPOSAL, not measured).
  'straight-leg-raise': {
    startPosition: 'Lie on your back. Bend your other knee and put that foot flat. Keep your operated leg straight.',
    legFacingCamera: 'Your operated leg is the leg nearest the camera. Keep your other leg low and behind it.',
    handsAndSupport: 'Keep your hands at your sides or on the floor.',
    range:
      'Keep your knee straight. Lift your leg to about the height of your other knee. Hold. Then lower your leg with control. If your knee bends when you lift your leg, lower the leg. Ask your care team how to do this exercise.',
    speed: SLOW,
    cameraMustSee: 'The camera must see your hip, knee and ankle during the whole lift. Keep your device level.',
  },
  // ux-flow 7.3. Side-on stance and the support in front of the body are PROPOSAL. The depth limit is a surgeon decision (clinical.md section 9).
  'mini-squat': {
    startPosition: 'Stand side-on to the camera. Put your feet at hip width.',
    legFacingCamera: 'Stand with your operated side toward the camera. Your operated leg is near the camera.',
    handsAndSupport: 'Hold a counter or a chair back with one hand. Put the support in front of your body, away from the camera. Keep your hand off your hip.',
    range: 'Bend both knees slowly, down to the limit that your care team sets. Then stand up. The app does not pick a depth.',
    speed: SLOW,
    cameraMustSee: 'The camera must see your hip, knee, ankle and foot. Keep any chair or counter out of the line between the camera and your leg.',
  },
  // ux-flow 7.4. The seat and the foot position are PROPOSAL. The hold time and the angle come from the protocol (holdSeconds, minFlexion, targetFlexion).
  // T1, T2 (docs/design-reconciliation.md section 3): P1 and P2 rec 29 avoid open-chain knee extension to full extension early, so the text never asks for a straight knee.
  'seated-extension-hold': {
    startPosition: 'Sit on a chair with no arm rest on the camera side. Rest your thigh on the seat. Keep your foot off the floor or on a low stool.',
    legFacingCamera: 'Sit side-on to the camera. Your operated leg is the leg nearest the camera.',
    handsAndSupport: 'Put your hands on the seat beside your hips.',
    range:
      'Lift your foot until your knee reaches the angle that your care team sets. Do not straighten your knee past that angle. Hold for the time that your care team sets. Then lower your foot.',
    speed: 'Move slowly up and down. The hold time starts when your knee reaches the angle that your care team sets. It restarts if your knee bends more.',
    cameraMustSee: 'The camera must see your thigh, knee and foot.',
  },
};

export function guideFor(kind: GuideKind): Guide {
  return GUIDES[kind];
}
