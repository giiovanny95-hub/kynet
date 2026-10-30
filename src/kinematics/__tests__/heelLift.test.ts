import { describe, expect, it } from 'vitest';
import { createEngine, step, type EngineEvent, type ScoredRep } from '../engine';
import { BLAZEPOSE33 } from '../landmarks/models/blazepose33';
import { genSquat, type GenSquatOptions } from '../tools/gen/squat';

/** SQ_HEELS_LIFT, revisión 2 del plan A1: base de pie y pico en el fondo con medianas en ventanas de tiempo. */
function reps(o: Partial<GenSquatOptions>): ScoredRep[] {
  let s = createEngine({ exercise: 'squat', model: BLAZEPOSE33 });
  const out: EngineEvent[] = [];
  for (const f of genSquat({ reps: 4, bottomsDeg: 88, periodS: 2.5, sigma: 0.002, seed: 1, fps: 30, heelV: 0.9, ...o })) {
    const r = step(s, f);
    s = r.s;
    out.push(...r.events);
  }
  return out.flatMap((e) => (e.type === 'REP' && e.outcome === 'valid' ? [e] : []));
}

const lifted = (rs: readonly ScoredRep[]) => rs.filter((r) => r.faults.includes('SQ_HEELS_LIFT')).length;

describe('SQ_HEELS_LIFT con medianas', () => {
  it('el talón que empieza a subir 200 ms antes de la bajada y llega al 3 % se detecta', () => {
    const rs = reps({ heelLiftFrac: 0.03, heelLeadMs: 200 });
    expect(rs).toHaveLength(4);
    expect(lifted(rs)).toBe(4);
  });

  it('borde con σ 0,002: 1,5 % no se detecta y 2,5 % sí', () => {
    expect(lifted(reps({ heelLiftFrac: 0.015 }))).toBe(0);
    expect(lifted(reps({ heelLiftFrac: 0.025 }))).toBe(4);
  });

  it('sin muestras de pie con v ≥ 0,8 el lado se desactiva y no hay aviso', () => {
    const rs = reps({ heelLiftFrac: 0.03, heelVStanding: 0.7 });
    expect(rs).toHaveLength(4);
    expect(lifted(rs)).toBe(0);
  });

  it('con 20 FPS (térmica) las ventanas en tiempo siguen detectando el 3 %', () => {
    const rs = reps({ heelLiftFrac: 0.03, fps: 20 });
    expect(rs.length).toBeGreaterThan(0);
    expect(lifted(rs)).toBe(rs.length);
  });
});
