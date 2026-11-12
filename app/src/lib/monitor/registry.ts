// The registry: one ExerciseSpec for each exercise. DATA only. Nothing reads it yet (Step 0).
// The four camera exercises are written EXACTLY as exercises.ts, counters.ts, cues.ts and guides.ts use them today.
// A test (tests/monitor/registry.test.ts) compares the numbers and the texts with that code.
// Origins:
//  - source:<id>     a source id of protocolGen/sources.ts holds the value.
//  - clinician:<f>   the protocol field <f> (protocol/schema.ts) sets the value. The app holds no default (value null).
//  - engineering     a value of the app. No source sets it. The screen says so.

import { ANKLE_MIN_AMPLITUDE, LIFT_ANGLE_BACK, LIFT_ANGLE_SIDE } from './modes';
import type { ExerciseSpec } from './spec';

const SLOW = 'Move slowly and with control. If your care team sets a time for each rep, use it.';

// The margin. F1 (audit row V85) gives the camera error in the best case as +-8.73 and +-8.80 degrees.
// The value 9 is rounded from it. It stays UNVERIFIED for the lite model (margin.ts, MARGIN_SOURCE).
const margin = { name: 'margin', value: 9, unit: 'deg', origin: 'source:F1' } as const;

// Heel slide and mini squat count reps by the peak angle. Same data, other texts.
const repsPeak = [
  { name: 'target-flexion', value: null, unit: 'deg', origin: 'clinician:targetFlexion' },
  { name: 'max-flexion', value: null, unit: 'deg', origin: 'clinician:maxFlexion' },
  { name: 'return-within', value: null, unit: 'deg', origin: 'clinician:returnWithinDeg' },
  { name: 'min-rep-seconds', value: null, unit: 's', origin: 'clinician:minRepSeconds' },
  margin,
  { name: 'enter-fraction', value: 0.8, unit: 'fraction', origin: 'engineering' }, // a rep starts at 80 percent of the target
  { name: 'min-state-ms', value: 300, unit: 'ms', origin: 'engineering' },
  { name: 'min-target', value: 10, unit: 'deg', origin: 'engineering' }, // below this value, noise decides the count
] as const;

const repsPeakCues = [
  { event: 'near-limit', threshold: 'max-flexion' },
  { event: 'over-limit', threshold: 'max-flexion' },
  { event: 'shallow', threshold: 'target-flexion' },
  { event: 'too-fast', threshold: 'min-rep-seconds' },
] as const;

const HEEL_SLIDE: ExerciseSpec = {
  id: 'heel-slide',
  label: 'Heel slide',
  sourceIds: ['S1', 'P3', 'P1'],
  phases: [1, 2],
  posture: ['supine'],
  view: { angle: 'side', cameraSide: 'operated-leg-near', legs: 'chosen' },
  measure: { kind: 'joint-angle', joint: 'hip-knee-ankle' },
  report: ['peak'],
  mode: 'reps-peak',
  thresholds: repsPeak.map((t) => ({ ...t })),
  cues: repsPeakCues.map((c) => ({ ...c })),
  needs: ['whole-leg'],
  guide: {
    startPosition: 'Lie on your back on a bed or a mat. Keep both legs straight.',
    legFacingCamera: 'Your operated leg is the leg nearest the camera. Put the camera at the side of that leg.',
    handsAndSupport: 'Keep your hands at your sides. Keep your heel on the surface. A sock on a smooth surface helps your heel slide.',
    range: 'Slide your heel toward your buttock. Bend your knee up to the limit that your care team sets. Then slide your heel back.',
    speed: SLOW,
    cameraMustSee: 'The camera must see your whole leg, from hip to foot. Keep the blanket off your leg.',
    bodyMapPoints: [23, 25, 27],
    basis: { kind: 'existing', sourceIds: [] },
  },
  summary: ['reps', 'peak'],
};

const MINI_SQUAT: ExerciseSpec = {
  id: 'mini-squat',
  label: 'Mini squat',
  sourceIds: ['P3', 'P2', 'N3', 'S1'],
  phases: [2],
  posture: ['standing'],
  view: { angle: 'side', cameraSide: 'operated-leg-near', legs: 'chosen' },
  measure: { kind: 'joint-angle', joint: 'hip-knee-ankle' },
  report: ['peak'],
  mode: 'reps-peak',
  thresholds: repsPeak.map((t) => ({ ...t })),
  cues: repsPeakCues.map((c) => ({ ...c })),
  needs: ['whole-leg', 'knee-to-toe'],
  guide: {
    startPosition: 'Stand side-on to the camera. Put your feet at hip width.',
    legFacingCamera: 'Stand with your operated side toward the camera. Your operated leg is near the camera.',
    handsAndSupport: 'Hold a counter or a chair back with one hand. Put the support in front of your body, away from the camera. Keep your hand off your hip.',
    range: 'Bend both knees slowly, down to the limit that your care team sets. Then stand up. The app does not pick a depth.',
    speed: SLOW,
    cameraMustSee: 'The camera must see your hip, knee, ankle and foot. Keep any chair or counter out of the line between the camera and your leg.',
    bodyMapPoints: [23, 25, 27],
    basis: { kind: 'existing', sourceIds: [] },
  },
  summary: ['reps', 'peak'],
};

const STRAIGHT_LEG_RAISE: ExerciseSpec = {
  id: 'straight-leg-raise',
  label: 'Straight leg raise',
  sourceIds: ['S1'],
  phases: [1, 2],
  posture: ['supine'],
  view: { angle: 'side', cameraSide: 'operated-leg-near', legs: 'chosen' },
  // The gate is ankle above hip. The knee angle at the top is a report value only.
  measure: { kind: 'height-gate', above: 'ankle', reference: 'hip', threshold: 'raise-min-height' },
  report: ['top-angle'],
  mode: 'lift',
  thresholds: [
    { name: 'raise-min-height', value: 0.05, unit: 'fraction', origin: 'engineering' }, // image fraction
    { name: 'raise-settle-ms', value: 500, unit: 'ms', origin: 'engineering' },
    { name: 'lift-end-ms', value: 300, unit: 'ms', origin: 'engineering' },
    // The limit logs only. The app shows the top angle against it, with no cue (Summary of exercises.ts).
    { name: 'max-top-flexion', value: null, unit: 'deg', origin: 'clinician:maxTopFlexion' },
    margin,
  ],
  cues: [],
  needs: ['whole-leg'],
  guide: {
    startPosition: 'Lie on your back. Bend your other knee and put that foot flat. Keep your operated leg straight.',
    legFacingCamera: 'Your operated leg is the leg nearest the camera. Keep your other leg low and behind it.',
    handsAndSupport: 'Keep your hands at your sides or on the floor.',
    range:
      'Keep your knee straight. Lift your leg. Ask your care team how high to lift your leg. Hold. Then lower your leg with control. If your knee bends when you lift your leg, lower the leg. Ask your care team how to do this exercise.',
    speed: SLOW,
    cameraMustSee: 'The camera must see your hip, knee and ankle during the whole lift. Keep your device level.',
    bodyMapPoints: [23, 25, 27],
    basis: { kind: 'existing', sourceIds: [] },
  },
  summary: ['reps', 'top'],
};

const SEATED_EXTENSION_HOLD: ExerciseSpec = {
  id: 'seated-extension-hold',
  label: 'Seated knee extension hold',
  sourceIds: ['P1', 'P2'],
  phases: [2],
  posture: ['seated'],
  view: { angle: 'side', cameraSide: 'operated-leg-near', legs: 'chosen' },
  measure: { kind: 'joint-angle', joint: 'hip-knee-ankle' },
  report: ['peak'],
  mode: 'timed-hold',
  thresholds: [
    { name: 'target-flexion', value: null, unit: 'deg', origin: 'clinician:targetFlexion' }, // the band is the target plus the margin
    margin,
    { name: 'min-flexion', value: null, unit: 'deg', origin: 'clinician:minFlexion' }, // the straightest angle allowed. 0 turns the arc end cue off
    { name: 'hold-seconds', value: null, unit: 's', origin: 'clinician:holdSeconds' },
  ],
  cues: [
    { event: 'near-limit', threshold: 'min-flexion' },
    { event: 'over-limit', threshold: 'min-flexion' },
    { event: 'hold-restart', threshold: 'target-flexion' },
  ],
  needs: ['whole-leg'],
  guide: {
    startPosition: 'Sit on a chair with no arm rest on the camera side. Rest your thigh on the seat. Keep your foot off the floor or on a low stool.',
    legFacingCamera: 'Sit side-on to the camera. Your operated leg is the leg nearest the camera.',
    handsAndSupport: 'Put your hands on the seat beside your hips.',
    range:
      'Lift your foot until your knee reaches the angle that your care team sets. Do not straighten your knee past that angle. Hold for the time that your care team sets. Then lower your foot.',
    speed: 'Move slowly up and down. The hold time starts when your knee reaches the angle that your care team sets. It restarts if your knee bends more.',
    cameraMustSee: 'The camera must see your thigh, knee and foot.',
    bodyMapPoints: [23, 25, 27],
    basis: { kind: 'existing', sourceIds: [] },
  },
  summary: ['holds', 'hold-seconds'],
};

// ---- The five new exercises (PROPOSAL) -------------------------------------------------------
// The sources table names these exercises (P1, P2, P3, S1, N3). No source gives a camera number for them.
// research/technique-sources.md covers the four camera exercises only, so the guide texts below are a PROPOSAL of the app.
// Step B set the three engineering values that were null (min-amplitude, lift-angle twice). The numbers and the way to get them are in modes.ts.
// The settle and end times reuse the values of the straight leg raise (500 ms and 300 ms).

const timerNote = 'The camera cannot see this effort. The app times your hold.';

const QUAD_SET: ExerciseSpec = {
  id: 'quad-set',
  label: 'Quadriceps set',
  sourceIds: ['S1', 'P1', 'P2', 'P3', 'N3'],
  phases: [1, 2],
  posture: ['supine'],
  view: { angle: 'side', cameraSide: 'operated-leg-near', legs: 'chosen' },
  measure: { kind: 'none' },
  report: [],
  mode: 'person-timer',
  thresholds: [{ name: 'hold-seconds', value: null, unit: 's', origin: 'clinician:holdSeconds' }],
  cues: [],
  needs: [],
  guide: {
    startPosition: 'Lie on your back. Keep your operated leg straight on the surface.',
    legFacingCamera: 'Put the camera at the side of your operated leg. The camera is optional for this exercise.',
    handsAndSupport: 'Keep your hands at your sides. Your care team can ask you to put a rolled towel under your knee.',
    range: 'Tighten the muscle at the front of your thigh. Press the back of your knee toward the surface. Hold, then relax.',
    speed: 'Press slowly. Hold for the time that your care team sets. Press the button to start and to end each hold.',
    cameraMustSee: timerNote,
    bodyMapPoints: [],
    basis: { kind: 'proposal', sourceIds: ['S1', 'P1', 'P2', 'P3', 'N3'] },
  },
  summary: ['holds', 'hold-seconds'],
};

const GLUTEAL_SET: ExerciseSpec = {
  id: 'gluteal-set',
  label: 'Gluteal set',
  sourceIds: ['P1', 'P2', 'N3'],
  phases: [1, 2],
  posture: ['supine'],
  view: { angle: 'none', cameraSide: 'none', legs: 'none' },
  measure: { kind: 'none' },
  report: [],
  mode: 'person-timer',
  thresholds: [{ name: 'hold-seconds', value: null, unit: 's', origin: 'clinician:holdSeconds' }],
  cues: [],
  needs: [],
  guide: {
    startPosition: 'Lie on your back with your legs straight.',
    legFacingCamera: 'No camera view is needed for this exercise.',
    handsAndSupport: 'Keep your hands at your sides.',
    range: 'Squeeze your buttock muscles together. Hold, then relax.',
    speed: 'Squeeze slowly. Hold for the time that your care team sets. Press the button to start and to end each hold.',
    cameraMustSee: timerNote,
    bodyMapPoints: [],
    basis: { kind: 'proposal', sourceIds: ['P1', 'P2', 'N3'] },
  },
  summary: ['holds', 'hold-seconds'],
};

const ANKLE_PUMP: ExerciseSpec = {
  id: 'ankle-pump',
  label: 'Ankle pump',
  sourceIds: ['P1', 'P3'],
  phases: [1],
  posture: ['supine'],
  view: { angle: 'side', cameraSide: 'operated-leg-near', legs: 'chosen' },
  measure: { kind: 'joint-angle', joint: 'knee-ankle-footIndex' },
  report: ['range'],
  mode: 'reps-cycle',
  thresholds: [
    // Step B: 30 degrees. Measured on the synthetic series with 9 degree RMS noise (the numbers are in modes.ts, ANKLE_MIN_AMPLITUDE).
    { name: 'min-amplitude', value: ANKLE_MIN_AMPLITUDE, unit: 'deg', origin: 'engineering' },
    { name: 'min-state-ms', value: 300, unit: 'ms', origin: 'engineering' },
  ],
  cues: [],
  needs: ['knee-to-toe'],
  guide: {
    startPosition: 'Lie on your back or sit with your leg straight and supported.',
    legFacingCamera: 'Use the side view. Put the camera at the side of your operated leg.',
    handsAndSupport: 'Keep your hands at your sides. Keep your heel off the surface so that your foot can move.',
    range: 'Point your toes away from you. Then pull your toes toward you. Repeat.',
    speed: 'Move slowly and with control.',
    cameraMustSee: 'The camera must see your leg from your knee to your toes. The app counts each pump. It does not check how far you move.',
    bodyMapPoints: [25, 27, 31],
    basis: { kind: 'proposal', sourceIds: ['P1', 'P3'] }, // P1 and P3 name ankle pumps
  },
  summary: ['reps', 'range'],
};

const LEG_RAISE_SIDE: ExerciseSpec = {
  id: 'leg-raise-side',
  label: 'Leg raise to the side',
  sourceIds: ['S1', 'P1', 'P2', 'P3'],
  phases: [1, 2],
  posture: ['side-lying', 'standing'],
  view: { angle: 'front', cameraSide: 'either', legs: 'chosen' },
  measure: { kind: 'segment-angle', from: 'hip', to: 'ankle', against: 'horizontal' },
  report: ['peak'],
  mode: 'lift',
  thresholds: [
    // Step B: 10 degrees, measured on the synthetic series with 9 degree RMS noise (modes.ts, LIFT_ANGLE_SIDE).
    { name: 'lift-angle', value: LIFT_ANGLE_SIDE, unit: 'deg', origin: 'engineering' },
    { name: 'raise-settle-ms', value: 500, unit: 'ms', origin: 'engineering' },
    { name: 'lift-end-ms', value: 300, unit: 'ms', origin: 'engineering' },
  ],
  cues: [],
  needs: ['whole-leg'],
  guide: {
    startPosition: 'Lie on your side or stand facing the camera. Keep your operated leg straight.',
    legFacingCamera: 'Put the camera in front of you, at hip height. The camera sees the front of your body.',
    handsAndSupport: 'If you stand, hold a counter or a chair back with one hand.',
    range: 'Lift your operated leg out to the side with your toes forward. Hold. Then lower your leg with control.',
    speed: 'Move slowly and with control.',
    cameraMustSee: 'The camera must see your hip and your whole leg. The camera counts your lifts. It cannot measure the angle well.',
    bodyMapPoints: [23, 27],
    basis: { kind: 'proposal', sourceIds: ['S1', 'P2', 'P3'] }, // S1 names 3-way leg raises. P2 and P3 name hip abduction
  },
  summary: ['reps', 'peak'],
};

const LEG_RAISE_BACK: ExerciseSpec = {
  id: 'leg-raise-back',
  label: 'Leg raise to the back',
  sourceIds: ['S1', 'P1', 'P2', 'P3'],
  phases: [1, 2],
  posture: ['standing'],
  view: { angle: 'side', cameraSide: 'operated-leg-near', legs: 'chosen' },
  measure: { kind: 'segment-angle', from: 'hip', to: 'knee', against: 'vertical' },
  report: ['peak'],
  mode: 'lift',
  thresholds: [
    // Step B: 12 degrees, measured on the synthetic series with 9 degree RMS noise (modes.ts, LIFT_ANGLE_BACK).
    { name: 'lift-angle', value: LIFT_ANGLE_BACK, unit: 'deg', origin: 'engineering' },
    { name: 'raise-settle-ms', value: 500, unit: 'ms', origin: 'engineering' },
    { name: 'lift-end-ms', value: 300, unit: 'ms', origin: 'engineering' },
  ],
  cues: [],
  needs: ['whole-leg'],
  guide: {
    startPosition: 'Stand side-on to the camera. Put your feet at hip width.',
    legFacingCamera: 'Put the camera at the side of your operated leg, at the distance that the camera picture shows. Your operated leg is near the camera.',
    handsAndSupport: 'Hold a counter or a chair back with one hand. Put the support in front of your body, away from the camera.',
    range: 'Keep your knee straight. Lift your operated leg back behind you. Hold. Then lower your leg with control.',
    speed: 'Move slowly and with control.',
    cameraMustSee: 'The camera must see your hip, knee and ankle. The camera counts your lifts and measures the angle. The app does not judge how you do it.',
    bodyMapPoints: [23, 25, 27],
    basis: { kind: 'proposal', sourceIds: ['S1', 'P2', 'P3'] }, // S1 names 3-way leg raises. P2 and P3 name hip extension
  },
  summary: ['reps', 'peak'],
};

export const REGISTRY: readonly ExerciseSpec[] = [
  HEEL_SLIDE,
  MINI_SQUAT,
  STRAIGHT_LEG_RAISE,
  SEATED_EXTENSION_HOLD,
  QUAD_SET,
  GLUTEAL_SET,
  ANKLE_PUMP,
  LEG_RAISE_SIDE,
  LEG_RAISE_BACK,
];

export const specFor = (id: string): ExerciseSpec | undefined => REGISTRY.find((s) => s.id === id);
