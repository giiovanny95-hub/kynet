import type { ExerciseSpec } from '../machine';

/** Sentadilla lateral, señal = ángulo de rodilla (spec-cinematica §4.3). */
export const SQUAT_SPEC: ExerciseSpec = {
  startThr: 160,
  exitThr: 150,
  extremeThr: 100,
  revDeg: 8,
  armMs: 300,
  confirmFrames: 2,
  tNoiseMs: 500,
  stallMs: { desc: 6000, infl: 5000, asc: 6000 },
  tMaxMs: 12000,
  attemptMax: 130,
};

/**
 * Sentadilla de frente (spec-vista-frontal §3): señal = ρ escalada a 0-100 sobre la referencia de pie, así que los
 * umbrales y `revDeg` son puntos. Valores iniciales [H] de la spec; pendientes del punto de control F1.4.
 */
export const SQUAT_FRONTAL_SPEC: ExerciseSpec = {
  ...SQUAT_SPEC,
  startThr: 95,
  exitThr: 93,
  extremeThr: 78,
  revDeg: 3,
  attemptMax: 88,
};
