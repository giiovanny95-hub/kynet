import { createEngine, step, type EngineExercise } from '../engine';
import { BLAZEPOSE33 } from '../landmarks/models/blazepose33';
import type { PoseFrame } from '../types';
import { genJumpingJack } from './gen/jumpingJack';
import { genPushUp } from './gen/pushUp';
import { genSquat } from './gen/squat';

export interface ExerciseReport {
  readonly scenarios: number;
  /** Media de `1 − |contadas − reales| / reales` en los escenarios positivos. */
  readonly accuracy: number;
  /** Repeticiones válidas contadas en escenarios sin repeticiones reales. */
  readonly falsePositives: number;
}

export interface BenchmarkReport {
  readonly squat: ExerciseReport;
  readonly jumpingJack: ExerciseReport;
  readonly pushUp: ExerciseReport;
}

interface Scenario {
  readonly frames: readonly PoseFrame[];
  readonly real: number;
}

function countValid(exercise: EngineExercise, frames: readonly PoseFrame[]): number {
  let s = createEngine({ exercise, model: BLAZEPOSE33 });
  let valid = 0;
  for (const f of frames) {
    const r = step(s, f);
    s = r.s;
    valid += r.events.filter((e) => e.type === 'REP' && e.outcome === 'valid').length;
  }
  return valid;
}

function evaluate(exercise: EngineExercise, scenarios: readonly Scenario[]): ExerciseReport {
  let accSum = 0;
  let positives = 0;
  let falsePositives = 0;
  for (const sc of scenarios) {
    const counted = countValid(exercise, sc.frames);
    if (sc.real === 0) {
      falsePositives += counted;
    } else {
      accSum += 1 - Math.abs(counted - sc.real) / sc.real;
      positives++;
    }
  }
  return { scenarios: scenarios.length, accuracy: positives > 0 ? accSum / positives : 0, falsePositives };
}

/** Escenarios sintéticos de spec-cinematica §8 (versión recortada del MVP): ruido × tempo × semilla, más negativos. */
export function runBenchmark(): BenchmarkReport {
  const squat: Scenario[] = [];
  for (const sigma of [0, 0.004, 0.008]) {
    for (const periodS of [1.5, 2.5, 4]) {
      for (const seed of [1, 2]) {
        squat.push({ frames: genSquat({ reps: 8, bottomsDeg: 88, periodS, sigma, seed, fps: 30 }), real: 8 });
      }
    }
  }
  squat.push({ frames: genSquat({ reps: 6, bottomsDeg: 88, periodS: 2, sigma: 0.004, seed: 9, fps: 30, jitterMs: 6 }), real: 6 });
  squat.push({ frames: genSquat({ reps: 0, bottomsDeg: 88, periodS: 2.5, sigma: 0.008, seed: 3, fps: 30, standS: 30 }), real: 0 });
  squat.push({ frames: genSquat({ reps: 6, bottomsDeg: 140, periodS: 2.5, sigma: 0.004, seed: 4, fps: 30 }), real: 0 });

  const jj: Scenario[] = [];
  for (const sigma of [0, 0.004, 0.008]) {
    for (const periodS of [0.5, 0.7, 1.0]) {
      for (const seed of [1, 2]) {
        jj.push({ frames: genJumpingJack({ reps: 12, periodS, sigma, seed, fps: 30 }), real: 12 });
      }
    }
  }
  jj.push({ frames: genJumpingJack({ reps: 20, periodS: 1, sigma: 0.004, seed: 5, fps: 30, mode: 'armsOnly' }), real: 0 });
  jj.push({ frames: genJumpingJack({ reps: 20, periodS: 1, sigma: 0.004, seed: 6, fps: 30, mode: 'feetOnly' }), real: 0 });

  const pu: Scenario[] = [];
  for (const sigma of [0, 0.004, 0.008]) {
    for (const periodS of [1.6, 2.5, 3.5]) {
      for (const seed of [1, 2]) {
        pu.push({ frames: genPushUp({ reps: 8, bottomsDeg: 85, periodS, sigma, seed, fps: 30 }), real: 8 });
      }
    }
  }
  pu.push({ frames: genPushUp({ reps: 6, bottomsDeg: 85, periodS: 2.5, sigma: 0.004, seed: 7, fps: 30, hipDeviationDeg: -25 }), real: 6 });
  pu.push({ frames: genPushUp({ reps: 12, bottomsDeg: 85, periodS: 2.5, sigma: 0.008, seed: 8, fps: 30, standing: true }), real: 0 });
  pu.push({ frames: genPushUp({ reps: 6, bottomsDeg: 140, periodS: 2.5, sigma: 0.004, seed: 4, fps: 30 }), real: 0 });

  return { squat: evaluate('squat', squat), jumpingJack: evaluate('jumpingJack', jj), pushUp: evaluate('pushUp', pu) };
}
