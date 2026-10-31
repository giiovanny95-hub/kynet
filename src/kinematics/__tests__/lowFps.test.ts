import { describe, expect, it } from 'vitest';
import { createEngine, step, type EngineExercise } from '../engine';
import { BLAZEPOSE33 } from '../landmarks/models/blazepose33';
import { genJumpingJack } from '../tools/gen/jumpingJack';
import { mulberry32 } from '../tools/gen/prng';
import { genPushUp } from '../tools/gen/pushUp';
import { genSquat } from '../tools/gen/squat';
import type { PoseFrame } from '../types';

/** Descarta al azar una fracción de cuadros (con semilla), como la contrapresión del Pixel 7 Pro. */
function drop(frames: readonly PoseFrame[], rate: number, seed: number): PoseFrame[] {
  const rng = mulberry32(seed);
  return frames.filter(() => rng() >= rate);
}

function countValid(exercise: EngineExercise, frames: readonly PoseFrame[]): number {
  let s = createEngine({ exercise, model: BLAZEPOSE33 });
  let n = 0;
  for (const f of frames) {
    const r = step(s, f);
    s = r.s;
    n += r.events.filter((e) => e.type === 'REP' && e.outcome === 'valid').length;
  }
  return n;
}

// Medido en el Pixel 7 Pro con GPU: ~25 FPS y ~16 % de descartes (docs/spike-results.md).
// Límite conocido: jumping jacks a 0,5 s (120/min) pierden 1-2 de 12 en estas condiciones; a 30 FPS cuentan todos.
describe('conteo a 25 FPS con 16 % de descartes', () => {
  for (const seed of [1, 2, 3]) {
    it(`sentadilla (semilla ${seed})`, () => {
      expect(countValid('squat', drop(genSquat({ reps: 10, bottomsDeg: 88, periodS: 2, sigma: 0.004, seed, fps: 25 }), 0.16, seed))).toBe(10);
    });
    it(`jumping jack a 0,7 s (semilla ${seed})`, () => {
      expect(countValid('jumpingJack', drop(genJumpingJack({ reps: 12, periodS: 0.7, sigma: 0.004, seed, fps: 25 }), 0.16, seed))).toBe(12);
    });
    it(`flexión (semilla ${seed})`, () => {
      expect(countValid('pushUp', drop(genPushUp({ reps: 8, bottomsDeg: 85, periodS: 2.5, sigma: 0.004, seed, fps: 25 }), 0.16, seed))).toBe(8);
    });
  }
});
