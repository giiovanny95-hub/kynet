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
