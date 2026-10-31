import { describe, expect, it } from 'vitest';
import { createEngine, step } from '../engine';
import { BLAZEPOSE33 } from '../landmarks/models/blazepose33';
import { genSquat } from '../tools/gen/squat';

// Robustez de SQ_HEELS_LIFT (plan A1, revisión 2): 20 semillas × 8 repeticiones por nivel de ruido.
// Es lenta (~320 sesiones sintéticas), así que va con el benchmark y fuera de `test:kinematics` (< 2 s).
function count(sigma: number, lift: number): { reps: number; hits: number } {
  let reps = 0;
  let hits = 0;
  for (let seed = 1; seed <= 20; seed++) {
    let s = createEngine({ exercise: 'squat', model: BLAZEPOSE33 });
    for (const f of genSquat({ reps: 8, bottomsDeg: 88, periodS: 2.5, sigma, seed, fps: 30, heelLiftFrac: lift })) {
      const r = step(s, f);
      s = r.s;
      for (const e of r.events) {
        if (e.type !== 'REP' || e.outcome !== 'valid') continue;
        reps++;
        if (e.faults.includes('SQ_HEELS_LIFT')) hits++;
      }
    }
  }
  return { reps, hits };
}

// Un aviso falso es peor que uno perdido: 0 falsos es obligatorio en todo σ. La detección exige ≥ 152/160 hasta
// σ 0,006; con σ 0,008 el suelo de 136/160 es PROVISIONAL hasta medir el ruido real de los talones con los
// fixtures de B3 (plan cierre-mvp, decisión rev. 2). Medido el 2026-10-30 con ±150 ms: 160, 160, 154 y 144.
const MIN_DETECTED: Readonly<Record<number, number>> = { 0.002: 152, 0.004: 152, 0.006: 152, 0.008: 136 };

describe('SQ_HEELS_LIFT: robustez frente al ruido (σ ≤ 0,008)', () => {
  for (const sigma of [0.002, 0.004, 0.006, 0.008]) {
    const min = MIN_DETECTED[sigma] ?? 152;
    it(`σ ${sigma}: 0/160 avisos sin subida y ≥ ${min}/160 con subida del 3 %`, () => {
      const flat = count(sigma, 0);
      const up = count(sigma, 0.03);
      expect(flat.reps).toBe(160);
      expect(up.reps).toBe(160);
      expect(flat.hits).toBe(0);
      expect(up.hits).toBeGreaterThanOrEqual(min);
    }, 60_000);
  }
});
