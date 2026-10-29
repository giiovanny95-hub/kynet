import { describe, expect, it } from 'vitest';
import { createEngine, step, type EngineEvent, type ScoredRep } from '../engine';
import { BLAZEPOSE33 } from '../landmarks/models/blazepose33';
import { toPose } from '../landmarks/adapter';
import { pushUpSignals } from '../signals/pushUp';
import { genPushUp } from '../tools/gen/pushUp';
import type { PoseFrame } from '../types';

function run(frames: readonly PoseFrame[]): EngineEvent[] {
  let s = createEngine({ exercise: 'pushUp', model: BLAZEPOSE33 });
  const out: EngineEvent[] = [];
  for (const f of frames) {
    const r = step(s, f);
    s = r.s;
    out.push(...r.events);
  }
  return out;
}

const reps = (evs: readonly EngineEvent[], outcome: ScoredRep['outcome']): ScoredRep[] =>
  evs.flatMap((e) => (e.type === 'REP' && e.outcome === outcome ? [e] : []));
/** Gira los puntos (en unidades de alto) alrededor de la muñeca izquierda; negativo levanta los pies (que están a la izquierda). */
function rotate(raw: PoseFrame['raw'], deg: number, aspect: number): PoseFrame['raw'] {
  const c = raw[15]!;
  const cx = c.x * aspect;
  const a = (deg * Math.PI) / 180;
  return raw.map((lm) => {
    const dx = lm.x * aspect - cx;
    const dy = lm.y - c.y;
    return { ...lm, x: (cx + dx * Math.cos(a) + dy * Math.sin(a)) / aspect, y: c.y - dx * Math.sin(a) + dy * Math.cos(a) };
  });
}

const base = { reps: 10, bottomsDeg: 85, periodS: 2.5, sigma: 0.004, seed: 1, fps: 30 } as const;

describe('señales de flexión (spec §4.5)', () => {
  it('cuerpo recto y horizontal: θe ≈ 172 arriba, θb ≈ 180, ι ≤ 30', () => {
    const f = genPushUp({ ...base, reps: 0, sigma: 0 })[0]!;
    const sig = pushUpSignals(toPose(f, BLAZEPOSE33), 'l');
    expect(sig.thetaE).toBeCloseTo(172, 0);
    expect(sig.thetaB).toBeGreaterThan(178);
    expect(sig.iota).toBeLessThanOrEqual(30);
  });

  it('cadera caída da θb con signo negativo y cadera alta positivo', () => {
    const sag = pushUpSignals(toPose(genPushUp({ ...base, reps: 0, sigma: 0, hipDeviationDeg: -25 })[0]!, BLAZEPOSE33), 'l');
    const pike = pushUpSignals(toPose(genPushUp({ ...base, reps: 0, sigma: 0, hipDeviationDeg: 25 })[0]!, BLAZEPOSE33), 'l');
    expect(sag.thetaB).toBeGreaterThan(150);
    expect(sag.thetaB).toBeLessThan(160);
    expect(sag.thetaBSigned).toBeLessThan(0);
    expect(pike.thetaBSigned).toBeGreaterThan(0);
  });
});

describe('flexión de lado', () => {
  for (const sigma of [0.004, 0.008]) {
    for (const seed of [1, 2, 3]) {
      it(`10 flexiones de 2,5 s a 85° (σ ${sigma}, semilla ${seed}) dan 10 válidas`, () => {
        expect(reps(run(genPushUp({ ...base, sigma, seed })), 'valid')).toHaveLength(10);
      });
    }
  }

  it('fondos 85, 120, 85, 140: 2 válidas, 1 incompleta (PU_DEPTH_SHALLOW) y la de 140 sin evento', () => {
    const evs = run(genPushUp({ ...base, reps: 4, bottomsDeg: [85, 120, 85, 140], sigma: 0 }));
    expect(reps(evs, 'valid')).toHaveLength(2);
    const inc = reps(evs, 'incomplete');
    expect(inc).toHaveLength(1);
    expect(inc[0]!.faults).toEqual(['PU_DEPTH_SHALLOW']);
  });

  it('de pie moviendo los brazos 30 s: 0 válidas y aviso PU_POSITION', () => {
    const evs = run(genPushUp({ ...base, reps: 12, standing: true }));
    expect(reps(evs, 'valid')).toHaveLength(0);
    expect(evs.some((e) => e.type === 'FEEDBACK' && e.code === 'PU_POSITION')).toBe(true);
  });

  it('cadera caída trae PU_HIPS_SAG y cadera alta PU_HIPS_PIKE', () => {
    const sag = reps(run(genPushUp({ ...base, reps: 3, sigma: 0, hipDeviationDeg: -25 })), 'valid');
    const pike = reps(run(genPushUp({ ...base, reps: 3, sigma: 0, hipDeviationDeg: 25 })), 'valid');
    const clean = reps(run(genPushUp({ ...base, reps: 3, sigma: 0 })), 'valid');
    expect(sag).toHaveLength(3);
    expect(pike).toHaveLength(3);
    for (const r of sag) expect(r.faults).toContain('PU_HIPS_SAG');
    for (const r of pike) expect(r.faults).toContain('PU_HIPS_PIKE');
    // P_form con p = 0,25.
    expect(sag[0]!.q).toBeCloseTo((clean[0]!.q ?? 0) * 0.75, 6);
  });

  it('a mitad de repetición el cuerpo se inclina (ι > 30° más de 1 s): falta PU_POSITION', () => {
    const frames = genPushUp({ ...base, reps: 2, sigma: 0 });
    // Desde 1,6 s el cuerpo entero gira hasta 50° alrededor de la muñeca, 5° por cuadro para que la guarda
    // de sujeto no lo tome por otra persona (mismos ángulos articulares, ι ≈ 70°).
    const tilted = frames.map((f, i) => (i >= 48 && i < 120 ? { ...f, raw: rotate(f.raw, -Math.min(50, (i - 47) * 5), f.meta.width / f.meta.height) } : f));
    const evs = run(tilted);
    expect(reps(evs, 'fault').some((r) => r.code === 'PU_POSITION')).toBe(true);
    expect(evs.some((e) => e.type === 'FEEDBACK' && e.code === 'PU_POSITION')).toBe(true);
  });
});
