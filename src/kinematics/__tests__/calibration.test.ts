import { describe, expect, it } from 'vitest';
import { applyProfile, isProfileValid, type CalibrationProfile } from '../calibration/profile';
import { calibratorStep, createCalibrator, type CalibratorState } from '../calibration/calibrator';
import { createEngine, step, type EngineEvent, type ScoredRep } from '../engine';
import { SQUAT_SPEC } from '../fsm/exercises/squat';
import { BLAZEPOSE33 } from '../landmarks/models/blazepose33';
import { MOVENET17 } from '../landmarks/models/movenet17';
import { genJumpingJack } from '../tools/gen/jumpingJack';
import { genSquat } from '../tools/gen/squat';
import type { ScoredExercise } from '../scoring/tempo';
import type { PoseFrame } from '../types';

function rep(extreme: number, o: Partial<ScoredRep> = {}): ScoredRep {
  return {
    type: 'REP', outcome: 'valid', tStartMs: 0, tBottomMs: 1000, tEndMs: 2500, durationMs: 2500, downMs: 1200, upMs: 1300,
    extreme, top: 172, extreme2: null, code: null, faults: [], ...o,
  };
}

function feed(exercise: ScoredExercise, reps: readonly ScoredRep[], start = 172) {
  let c: CalibratorState = createCalibrator(exercise);
  let last: ReturnType<typeof calibratorStep> | null = null;
  for (const r of reps) {
    last = calibratorStep(c, r, start);
    c = last.c;
  }
  return last!;
}

function run(frames: readonly PoseFrame[], cfg: Parameters<typeof createEngine>[0]): EngineEvent[] {
  let s = createEngine(cfg);
  const out: EngineEvent[] = [];
  for (const f of frames) {
    const r = step(s, f);
    s = r.s;
    out.push(...r.events);
  }
  return out;
}
const validCount = (evs: readonly EngineEvent[]) => evs.filter((e) => e.type === 'REP' && e.outcome === 'valid').length;

describe('calibración (spec §5)', () => {
  it('fondos 95, 98 y 100: extremeThr = mediana + 10 = 108', () => {
    const r = feed('squat', [rep(95), rep(98), rep(100)]);
    expect(r.status).toBe('done');
    expect(r.profile).toMatchObject({ v: 1, exercise: 'squat', extremeThr: 108, startThr: 162, exitThr: 152, dCalS: 2.5 });
  });

  it('fondos 95, 120 y 96 piden una extra; con dos extra incoherentes falla', () => {
    const three = feed('squat', [rep(95), rep(120), rep(96)]);
    expect(three).toMatchObject({ status: 'collecting', code: 'CAL_INCONSISTENT' });
    const five = feed('squat', [rep(95), rep(120), rep(96), rep(130), rep(70)]);
    expect(five).toMatchObject({ status: 'fail', code: 'CAL_INCONSISTENT', profile: null });
  });

  it('una extra coherente recalcula con las 3 mejores', () => {
    const r = feed('squat', [rep(95), rep(120), rep(96), rep(97)]);
    expect(r.status).toBe('done');
    expect(r.profile?.extremeThr).toBe(106);
  });

  it('rango pequeño (inicio 150, fondo 135): ROM_TOO_SMALL', () => {
    const r = feed('squat', [rep(135), rep(135), rep(135)], 150);
    expect(r).toMatchObject({ status: 'fail', code: 'CAL_ROM_TOO_SMALL' });
  });

  it('flexión: extremeThr limitado a [80, 115]', () => {
    expect(feed('pushUp', [rep(60), rep(60), rep(60)]).profile?.extremeThr).toBe(80);
    expect(feed('pushUp', [rep(112), rep(112), rep(112)]).profile?.extremeThr).toBe(115);
  });

  it('jumping jack: αU y ρfU con sus límites', () => {
    const r = feed('jumpingJack', [1, 2, 3].map(() => rep(170, { extreme2: 2.2 })));
    expect(r.profile).toMatchObject({ alphaU: 150, rhoU: 1.8 });
  });

  it('un perfil de movenet17 no vale con blazepose33', () => {
    const p = feed('squat', [rep(95), rep(98), rep(100)]).profile!;
    expect(isProfileValid(p, { exercise: 'squat', model: BLAZEPOSE33 })).toBe(true);
    const other: CalibrationProfile = { ...p, modelId: MOVENET17.id };
    expect(isProfileValid(other, { exercise: 'squat', model: BLAZEPOSE33 })).toBe(false);
    expect(isProfileValid(p, { exercise: 'jumpingJack', model: BLAZEPOSE33 })).toBe(false);
    expect(isProfileValid(p, { exercise: 'squat', model: BLAZEPOSE33, view: 'frontal' })).toBe(false);
  });

  it('applyProfile cambia solo los umbrales', () => {
    const p = feed('squat', [rep(95), rep(98), rep(100)]).profile!;
    expect(applyProfile(SQUAT_SPEC, p)).toEqual({ ...SQUAT_SPEC, extremeThr: 108, startThr: 162, exitThr: 152 });
  });
});

describe('motor con calibración', () => {
  const frames = genSquat({ reps: 3, bottomsDeg: 110, periodS: 2.5, sigma: 0, seed: 1, fps: 30 });

  it('sentadilla a 110°: incompleta por defecto, válida con extremeThr calibrado 115', () => {
    expect(validCount(run(frames, { exercise: 'squat', model: BLAZEPOSE33 }))).toBe(0);
    const profile: CalibrationProfile = {
      v: 1, exercise: 'squat', view: 'lateral', modelId: 'blazepose33', side: null,
      extremeThr: 115, startThr: 160, exitThr: 150, tauCal: null, dCalS: 2.5,
    };
    expect(validCount(run(frames, { exercise: 'squat', model: BLAZEPOSE33, profile }))).toBe(3);
  });

  it('en calibración los umbrales son permisivos (115° en sentadilla)', () => {
    expect(validCount(run(frames, { exercise: 'squat', model: BLAZEPOSE33, calibrating: true }))).toBe(3);
  });

  it('jumping jack poco abierto cuenta en calibración', () => {
    // α pico ≈ 20 + 0,65·158 ≈ 123 < 130 (incompleto por defecto) pero ≥ 110 (permisivo); ρf pico ≈ 1,54.
    const jj = genJumpingJack({ reps: 3, periodS: 0.8, sigma: 0, seed: 2, fps: 30, amplitude: 0.65 });
    expect(validCount(run(jj, { exercise: 'jumpingJack', model: BLAZEPOSE33 }))).toBe(0);
    expect(validCount(run(jj, { exercise: 'jumpingJack', model: BLAZEPOSE33, calibrating: true }))).toBe(3);
  });
});
