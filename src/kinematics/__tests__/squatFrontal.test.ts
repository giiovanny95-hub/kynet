import { describe, expect, it } from 'vitest';
import { createEngine, step } from '../engine';
import { BLAZEPOSE33 } from '../landmarks/models/blazepose33';
import { genSquat, type GenSquatOptions } from '../tools/gen/squat';

function countValid(o: GenSquatOptions): number {
  let s = createEngine({ exercise: 'squat', model: BLAZEPOSE33, view: 'frontal' });
  let n = 0;
  for (const f of genSquat(o)) {
    const r = step(s, f);
    s = r.s;
    n += r.events.filter((e) => e.type === 'REP' && e.outcome === 'valid').length;
  }
  return n;
}

describe('sentadilla de frente en el motor (F2.2, umbrales [H] pendientes de F1.4)', () => {
  const base = { reps: 10, bottomsDeg: 85, periodS: 2.5, seed: 1, fps: 30, standS: 2 };
  it('10/10 en la colocación central con σ 0 y 0,004', () => {
    for (const sigma of [0, 0.004]) expect(countValid({ ...base, sigma, camera: { heightM: 0.9, distanceM: 2.5 } })).toBe(10);
  });
  it('60 s de pie: 0', () => {
    expect(countValid({ ...base, reps: 0, sigma: 0.004, standS: 60, camera: { heightM: 0.9, distanceM: 2.5 } })).toBe(0);
  });
});

describe('fantasma de MediaPipe (33 puntos juntos)', () => {
  it('un esqueleto colapsado con ruido no cuenta', () => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5) * 0.02;
    let s = createEngine({ exercise: 'squat', model: BLAZEPOSE33, view: 'frontal' });
    let n = 0;
    for (let i = 0; i < 30 * 20; i++) {
      const raw = Array.from({ length: 33 }, () => ({ x: 0.5 + rnd(), y: 0.68 + rnd(), z: 0, v: 0.75 }));
      const r = step(s, { meta: { tMs: i * 33.3, width: 480, height: 640, rotation: 0, mirrored: false }, model: 'blazepose33', raw });
      s = r.s;
      n += r.events.filter((e) => e.type === 'REP' && e.outcome === 'valid').length;
    }
    expect(n).toBe(0);
  });
});
