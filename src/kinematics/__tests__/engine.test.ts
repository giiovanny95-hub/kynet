import { describe, expect, it } from 'vitest';
import { createEngine, step, type EngineEvent, type EngineState } from '../engine';
import { BLAZEPOSE33 } from '../landmarks/models/blazepose33';
import { genJumpingJack } from '../tools/gen/jumpingJack';
import { genSquat } from '../tools/gen/squat';
import type { PoseFrame } from '../types';

function runAll(frames: readonly PoseFrame[], s0: EngineState): { s: EngineState; events: EngineEvent[] } {
  let s = s0;
  const events: EngineEvent[] = [];
  for (const f of frames) {
    const r = step(s, f);
    s = r.s;
    events.push(...r.events);
  }
  return { s, events };
}

const validReps = (events: readonly EngineEvent[]) => events.filter((e) => e.type === 'REP' && e.outcome === 'valid');

describe('motor de cinemática', () => {
  it('10 sentadillas dan 10 repeticiones válidas con formScore 0-100 y calidad', () => {
    const { events, s } = runAll(genSquat({ reps: 10, bottomsDeg: 88, periodS: 2.5, sigma: 0.004, seed: 1, fps: 30 }), createEngine({ exercise: 'squat', model: BLAZEPOSE33 }));
    const reps = validReps(events);
    expect(reps).toHaveLength(10);
    for (const r of reps) {
      if (r.type !== 'REP') continue;
      expect(r.formScore).toBeGreaterThanOrEqual(0);
      expect(r.formScore).toBeLessThanOrEqual(100);
      expect(['Miss', 'Good', 'Great', 'Perfect']).toContain(r.quality);
    }
    expect(step(s, genSquat({ reps: 0, bottomsDeg: 88, periodS: 2.5, sigma: 0, seed: 1, fps: 30 })[0]!).hud.reps).toBe(10);
  });

  it('15 jumping jacks dan 15 válidas', () => {
    const { events } = runAll(genJumpingJack({ reps: 15, periodS: 0.8, sigma: 0.004, seed: 2, fps: 30 }), createEngine({ exercise: 'jumpingJack', model: BLAZEPOSE33 }));
    expect(validReps(events)).toHaveLength(15);
  });

  it('un cuadro con marca de tiempo repetida no cambia el conteo ni los eventos', () => {
    const frames = genSquat({ reps: 3, bottomsDeg: 88, periodS: 2.5, sigma: 0.004, seed: 2, fps: 30 });
    const withDup = [...frames.slice(0, 80), frames[79]!, ...frames.slice(80)];
    const engine = createEngine({ exercise: 'squat', model: BLAZEPOSE33 });
    expect(runAll(withDup, engine).events).toEqual(runAll(frames, engine).events);
  });

  it('ocultar el cuerpo 3,5 s a mitad de repetición pausa, abandona la repetición y no la cuenta', () => {
    const frames = genSquat({ reps: 1, bottomsDeg: 88, periodS: 6, sigma: 0, seed: 3, fps: 30 }).map((f) =>
      f.meta.tMs >= 2500 && f.meta.tMs < 6000 ? { ...f, raw: f.raw.map((lm) => ({ ...lm, v: 0.1 })) } : f,
    );
    const { events } = runAll(frames, createEngine({ exercise: 'squat', model: BLAZEPOSE33 }));
    const types = events.map((e) => e.type);
    expect(types).toContain('PAUSE');
    expect(types).toContain('REP_ABANDONED');
    expect(validReps(events)).toHaveLength(0);
  });

  it('el estado es serializable: JSON ida y vuelta no cambia el resultado', () => {
    const frames = genSquat({ reps: 3, bottomsDeg: 88, periodS: 2.5, sigma: 0.004, seed: 4, fps: 30 });
    let a = createEngine({ exercise: 'squat', model: BLAZEPOSE33 });
    let b = a;
    const ea: EngineEvent[] = [];
    const eb: EngineEvent[] = [];
    frames.forEach((f) => {
      const ra = step(a, f);
      a = ra.s;
      ea.push(...ra.events);
      const rb = step(JSON.parse(JSON.stringify(b)) as EngineState, f);
      b = rb.s;
      eb.push(...rb.events);
    });
    expect(eb).toEqual(ea);
  });

  it('una sentadilla limpia (fondo 88°, arriba 172°, 3 s) puede puntuar Perfect', () => {
    const { events } = runAll(genSquat({ reps: 4, bottomsDeg: 88, periodS: 3, sigma: 0, seed: 1, fps: 30 }), createEngine({ exercise: 'squat', model: BLAZEPOSE33 }));
    const reps = validReps(events);
    expect(reps).toHaveLength(4);
    for (const r of reps) {
      if (r.type !== 'REP') continue;
      expect(r.top).toBeGreaterThan(168);
      expect(r.quality).toBe('Perfect');
    }
  });
});
