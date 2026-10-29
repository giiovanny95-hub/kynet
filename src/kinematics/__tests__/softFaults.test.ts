import { describe, expect, it } from 'vitest';
import { createEngine, step, type EngineEvent, type EngineExercise, type ScoredRep } from '../engine';
import type { FeedbackEvent } from '../feedback/codes';
import { BLAZEPOSE33 } from '../landmarks/models/blazepose33';
import { genJumpingJack } from '../tools/gen/jumpingJack';
import { genSquat } from '../tools/gen/squat';
import type { PoseFrame } from '../types';

function run(frames: readonly PoseFrame[], exercise: EngineExercise = 'squat'): EngineEvent[] {
  let s = createEngine({ exercise, model: BLAZEPOSE33 });
  const out: EngineEvent[] = [];
  for (const f of frames) {
    const r = step(s, f);
    s = r.s;
    out.push(...r.events);
  }
  return out;
}

const valid = (evs: readonly EngineEvent[]): ScoredRep[] =>
  evs.flatMap((e) => (e.type === 'REP' && e.outcome === 'valid' ? [e] : []));
const feedback = (evs: readonly EngineEvent[]): FeedbackEvent[] => evs.flatMap((e) => (e.type === 'FEEDBACK' ? [e] : []));

const base = { reps: 3, bottomsDeg: 88, periodS: 2.5, sigma: 0, seed: 1, fps: 30 } as const;

describe('faltas suaves y P_form', () => {
  it('tronco inclinado en el fondo: SQ_TRUNK_LEAN, q × 0,9 y nunca Perfect', () => {
    const upright = valid(run(genSquat(base)));
    const leaned = valid(run(genSquat({ ...base, trunkLeanDeg: 40 })));
    expect(upright).toHaveLength(3);
    expect(leaned).toHaveLength(3);
    for (let i = 0; i < 3; i++) {
      const u = upright[i]!;
      const l = leaned[i]!;
      expect(u.faults).not.toContain('SQ_TRUNK_LEAN');
      expect(l.faults).toContain('SQ_TRUNK_LEAN');
      expect(l.q).toBeCloseTo((u.q ?? 0) * 0.9, 6);
      expect(l.quality).not.toBe('Perfect');
    }
  });

  it('repetición rápida: SQ_TOO_FAST con severidad baja', () => {
    const evs = run(genSquat({ ...base, reps: 2, periodS: 1.0 }));
    const reps = valid(evs);
    expect(reps.length).toBeGreaterThan(0);
    expect(reps[0]!.faults).toContain('SQ_TOO_FAST');
    expect(feedback(evs)[0]).toMatchObject({ code: 'SQ_TOO_FAST', severity: 'low' });
  });

  it('10 repeticiones inclinadas: como mucho un aviso cada 4 s', () => {
    const evs = run(genSquat({ ...base, reps: 10, periodS: 1.9, trunkLeanDeg: 40 }));
    const lean = feedback(evs).filter((e) => e.code === 'SQ_TRUNK_LEAN');
    expect(lean.length).toBeGreaterThan(0);
    for (let i = 1; i < lean.length; i++) expect(lean[i]!.tMs - lean[i - 1]!.tMs).toBeGreaterThanOrEqual(4000);
    expect(lean.length).toBeLessThan(10);
  });

  it('una incompleta trae SQ_DEPTH_SHALLOW', () => {
    const evs = run(genSquat({ ...base, reps: 2, bottomsDeg: [88, 120] }));
    const inc = evs.find((e) => e.type === 'REP' && e.outcome === 'incomplete');
    expect(inc && inc.type === 'REP' ? inc.faults : []).toEqual(['SQ_DEPTH_SHALLOW']);
    expect(feedback(evs).some((e) => e.code === 'SQ_DEPTH_SHALLOW')).toBe(true);
  });

  it('jumping jacks limpios no traen JJ_ASYMMETRY', () => {
    const reps = valid(run(genJumpingJack({ reps: 5, periodS: 0.8, sigma: 0.004, seed: 2, fps: 30 }), 'jumpingJack'));
    expect(reps).toHaveLength(5);
    for (const r of reps) expect(r.faults).not.toContain('JJ_ASYMMETRY');
  });
});

describe('asimetría de brazos en jumping jack', () => {
  it('un brazo 50° más bajo en el pico trae JJ_ASYMMETRY', () => {
    const o = { reps: 3, periodS: 0.8, sigma: 0, seed: 2, fps: 30 } as const;
    const even = valid(run(genJumpingJack(o), 'jumpingJack'));
    const asym = valid(run(genJumpingJack({ ...o, asymDeg: 50 }), 'jumpingJack'));
    expect(asym).toHaveLength(3);
    for (const r of asym) expect(r.faults).toContain('JJ_ASYMMETRY');
    expect(even.every((r) => !r.faults.includes('JJ_ASYMMETRY'))).toBe(true);
  });
});
