import { describe, expect, it } from 'vitest';
import { createEngine, step, type EngineEvent, type EngineState } from '../engine';
import { jjStep } from '../fsm/exercises/jumpingJack';
import { createFsm, type RepEvent } from '../fsm/machine';
import { DEFAULT_ONE_EURO } from '../filter/oneEuro';
import { createFilterBank, filterPose } from '../filter/landmarkFilter';
import { emptyPoseFrame, toPose } from '../landmarks/adapter';
import { BLAZEPOSE33 } from '../landmarks/models/blazepose33';
import { createGuard, guardStep } from '../quality/subjectGuard';
import { jjSignals } from '../signals/jumpingJack';
import { genJumpingJack } from '../tools/gen/jumpingJack';
import { genSquat } from '../tools/gen/squat';
import type { Landmark, Pose, PoseFrame } from '../types';

function runAll(frames: readonly PoseFrame[], s0: EngineState): EngineEvent[] {
  let s = s0;
  const events: EngineEvent[] = [];
  for (const f of frames) {
    const r = step(s, f);
    s = r.s;
    events.push(...r.events);
  }
  return events;
}

describe('pendientes menores de la revisión', () => {
  it('un tMs no finito en el primer cuadro se ignora y no congela el motor', () => {
    const frames = genSquat({ reps: 3, bottomsDeg: 88, periodS: 2.5, sigma: 0, seed: 1, fps: 30 });
    const first = frames[0]!;
    const broken: PoseFrame = { ...first, meta: { ...first.meta, tMs: Number.NaN } };
    const events = runAll([broken, ...frames], createEngine({ exercise: 'squat', model: BLAZEPOSE33 }));
    expect(events.filter((e) => e.type === 'REP' && e.outcome === 'valid')).toHaveLength(3);
  });

  it('un cuadro sin torso visible reinicia el contador de rechazos de la guarda', () => {
    const lm = (x: number, y: number, v = 0.9): Landmark => ({ x, y, z: 0, v });
    const body = (hipX: number, v = 0.9): Pose => ({
      tMs: 0,
      torso: 0.3,
      joints: { lShoulder: lm(hipX - 0.1, 0.3, v), rShoulder: lm(hipX + 0.1, 0.3, v), lHip: lm(hipX - 0.1, 0.6, v), rHip: lm(hipX + 0.1, 0.6, v) },
    });
    let g = guardStep(createGuard(), body(0.3)).g;
    g = guardStep(g, body(0.6)).g; // rechazo 1
    g = guardStep(g, body(0.6)).g; // rechazo 2
    g = guardStep(g, body(0.6, 0.1)).g; // sin torso visible: corta la racha
    const r = guardStep(g, body(0.6));
    expect(r.accept).toBe(false);
    expect(r.event).toBeNull();
  });

  it('un sujeto nuevo mientras está en pausa emite RESUME', () => {
    const frames = genSquat({ reps: 0, bottomsDeg: 88, periodS: 2.5, sigma: 0, seed: 2, fps: 30, standS: 6 }).map((f) => {
      if (f.meta.tMs >= 1000 && f.meta.tMs < 2000) return emptyPoseFrame(f.meta, BLAZEPOSE33);
      if (f.meta.tMs >= 2000) return { ...f, raw: f.raw.map((p) => ({ ...p, x: p.x + 0.3 })) };
      return f;
    });
    const types = runAll(frames, createEngine({ exercise: 'squat', model: BLAZEPOSE33 })).map((e) => e.type);
    expect(types).toContain('PAUSE');
    expect(types).toContain('SUBJECT_CHANGED');
    expect(types.lastIndexOf('RESUME')).toBeGreaterThan(types.indexOf('PAUSE'));
  });

  it('en jumping jack el extremo es el pico de los brazos: ida y vuelta parecidas a periodo 1 s', () => {
    let fsm = createFsm();
    let bank = createFilterBank();
    const reps: RepEvent[] = [];
    for (const f of genJumpingJack({ reps: 4, periodS: 1, sigma: 0, seed: 1, fps: 30 })) {
      const fl = filterPose(bank, toPose(f, BLAZEPOSE33), DEFAULT_ONE_EURO, 0.3);
      bank = fl.bank;
      const { alpha, rhoF } = jjSignals(fl.pose);
      const r = jjStep(fsm, { tMs: f.meta.tMs, alpha, rhoF, paused: false });
      fsm = r.s;
      reps.push(...r.events.filter((e) => e.outcome === 'valid'));
    }
    expect(reps.length).toBe(4);
    for (const r of reps) {
      expect(r.downMs).toBeGreaterThan(200);
      expect(r.downMs).toBeLessThan(400);
    }
  });
});
