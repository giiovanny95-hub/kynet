import { describe, expect, it } from 'vitest';
import type { EngineEvent, ScoredRep } from '@/kinematics/engine';
import type { Quality } from '@/kinematics/scoring/quality';
import type { FeedbackCode } from '@/kinematics/feedback/codes';
import { createSession, sessionReducer, type SessionAction, type SessionState } from './sessionModel';

const MIN = 60_000;

function rep(tMs: number, formScore: number, quality: Quality = formScore >= 90 ? 'Perfect' : formScore >= 50 ? 'Good' : 'Miss', faults: FeedbackCode[] = []): ScoredRep {
  return {
    type: 'REP', outcome: 'valid', tStartMs: tMs - 2000, tBottomMs: tMs - 1000, tEndMs: tMs, durationMs: 2000, downMs: 1000, upMs: 1000,
    extreme: 90, top: 172, extreme2: null, code: null, q: formScore / 100, quality, formScore, mult: 1, faults,
  };
}

function reduce(actions: readonly SessionAction[], s0: SessionState = createSession()): SessionState {
  return actions.reduce(sessionReducer, s0);
}

const start = (repsPerSet = 3, sets = 2): SessionAction => ({ type: 'start', exercise: 'squat', sets, repsPerSet, nowMs: 0 });
const eng = (event: EngineEvent, nowMs: number): SessionAction => ({ type: 'engine', event, nowMs });

describe('modelo de sesión', () => {
  it('al completar las repeticiones de la serie descansa 30 s y vuelve a la serie 2', () => {
    const s = reduce([start(), eng(rep(1000, 85), 1000), eng(rep(3000, 85), 3000), eng(rep(5000, 85), 5000)]);
    expect(s).toMatchObject({ phase: 'rest', restEndsAtMs: 35_000, set: 1, validReps: 3 });
    expect(reduce([{ type: 'tick', nowMs: 20_000 }], s).phase).toBe('rest');
    expect(reduce([{ type: 'tick', nowMs: 35_001 }], s)).toMatchObject({ phase: 'active', set: 2, repsInSet: 0 });
    expect(reduce([{ type: 'skipRest' }], s)).toMatchObject({ phase: 'active', set: 2 });
  });

  it('la última serie termina la sesión', () => {
    const s = reduce([start(1, 1), eng(rep(1000, 85), 1000)]);
    expect(s.phase).toBe('done');
  });

  it('activeMs no cuenta pausas ni descansos', () => {
    const s = reduce([
      start(2, 2),
      { type: 'tick', nowMs: 10_000 },
      { type: 'appState', active: false, nowMs: 10_000 },
      { type: 'appState', active: true, nowMs: 70_000 },
      eng(rep(80_000, 85), 80_000),
      eng(rep(90_000, 85), 90_000), // descanso de 90 s a 120 s
      { type: 'tick', nowMs: 120_000 },
      { type: 'tick', nowMs: 130_000 },
    ]);
    expect(s.phase).toBe('active');
    expect(s.activeMs).toBe(10_000 + 20_000 + 10_000);
  });

  it('la pausa del motor (visibilidad) tampoco cuenta', () => {
    const s = reduce([start(), eng({ type: 'PAUSE', tMs: 1000 }, 1000), eng({ type: 'RESUME', tMs: 6000 }, 6000), { type: 'tick', nowMs: 8000 }]);
    expect(s.activeMs).toBe(3000);
  });

  it('avisos a los 15 y 25 min activos, una vez cada uno', () => {
    const s = reduce([start(100, 1), { type: 'tick', nowMs: 15 * MIN }, { type: 'tick', nowMs: 16 * MIN }, { type: 'tick', nowMs: 25 * MIN }, { type: 'tick', nowMs: 26 * MIN }]);
    expect(s.warnings).toEqual(['15min', '25min']);
  });

  it('fatiga: la media de las 3 últimas cae 20 puntos respecto a las 5 primeras', () => {
    const scores = [90, 90, 90, 90, 90, 65, 65, 65];
    const s = reduce([start(20, 1), ...scores.map((f, i) => eng(rep(i * 2000 + 1000, f), i * 2000 + 1000))]);
    expect(s.phase).toBe('fatigue');
  });

  it('fatiga: 3 Miss seguidos', () => {
    const miss = (t: number): ScoredRep => ({ ...rep(t, 0), outcome: 'incomplete', quality: 'Miss', formScore: undefined, q: undefined, faults: ['SQ_DEPTH_SHALLOW'] });
    const s = reduce([start(20, 1), eng(miss(1000), 1000), eng(miss(3000), 3000), eng(miss(5000), 5000)]);
    expect(s.phase).toBe('fatigue');
    expect(s.topFault).toBe('SQ_DEPTH_SHALLOW');
  });

  it('desde la tarjeta de fatiga se puede seguir, descansar o terminar la serie', () => {
    const scores = [90, 90, 90, 90, 90, 65, 65, 65];
    const f = reduce([start(20, 2), ...scores.map((x, i) => eng(rep(i * 2000 + 1000, x), i * 2000 + 1000))]);
    expect(reduce([{ type: 'fatigueChoice', choice: 'continue', nowMs: 20_000 }], f).phase).toBe('active');
    expect(reduce([{ type: 'fatigueChoice', choice: 'rest', nowMs: 20_000 }], f)).toMatchObject({ phase: 'rest', restEndsAtMs: 50_000 });
    expect(reduce([{ type: 'fatigueChoice', choice: 'endSet', nowMs: 20_000 }], f)).toMatchObject({ phase: 'rest', set: 1 });
    // Descansar por fatiga vuelve a la misma serie; terminar la serie pasa a la siguiente.
    expect(reduce([{ type: 'fatigueChoice', choice: 'rest', nowMs: 20_000 }, { type: 'tick', nowMs: 50_001 }], f)).toMatchObject({ phase: 'active', set: 1, repsInSet: 8 });
    expect(reduce([{ type: 'fatigueChoice', choice: 'endSet', nowMs: 20_000 }, { type: 'tick', nowMs: 50_001 }], f)).toMatchObject({ phase: 'active', set: 2, repsInSet: 0 });
  });

  it('en segundo plano se pausa; vuelve a la fase anterior antes de 30 min e ignora eventos en pausa', () => {
    const p = reduce([start(), eng(rep(1000, 85), 1000), { type: 'appState', active: false, nowMs: 2000 }]);
    expect(p.phase).toBe('paused');
    const ghost = reduce([eng(rep(3000, 85), 3000)], p);
    expect(ghost.validReps).toBe(1);
    expect(reduce([{ type: 'appState', active: true, nowMs: 2000 + 29 * MIN }], ghost)).toMatchObject({ phase: 'active', validReps: 1 });
    expect(reduce([{ type: 'appState', active: true, nowMs: 2000 + 31 * MIN }], ghost).phase).toBe('done');
  });

  it('error de cámara y finish desde cualquier fase', () => {
    const e = reduce([start(), { type: 'cameraError', reason: 'permission' }]);
    expect(e).toMatchObject({ phase: 'error', error: 'permission' });
    expect(reduce([{ type: 'finish', nowMs: 5000 }], e).phase).toBe('done');
    expect(reduce([start(), { type: 'appState', active: false, nowMs: 1 }, { type: 'finish', nowMs: 2 }]).phase).toBe('done');
  });

  it('cuenta limpias (formScore ≥ 80), guarda el resumen por repetición y el fallo más frecuente', () => {
    const s = reduce([
      start(10, 1),
      eng(rep(1000, 85, 'Great', ['SQ_TRUNK_LEAN']), 1000),
      eng(rep(3000, 70, 'Good', ['SQ_TRUNK_LEAN', 'SQ_TOO_FAST']), 3000),
      eng(rep(5000, 95), 5000),
    ]);
    expect(s.cleanReps).toBe(2);
    expect(s.reps).toEqual([
      { formScore: 85, quality: 'Great', faults: ['SQ_TRUNK_LEAN'], durationMs: 2000 },
      { formScore: 70, quality: 'Good', faults: ['SQ_TRUNK_LEAN', 'SQ_TOO_FAST'], durationMs: 2000 },
      { formScore: 95, quality: 'Perfect', faults: [], durationMs: 2000 },
    ]);
    expect(s.topFault).toBe('SQ_TRUNK_LEAN');
  });
});

describe('correcciones de la revisión final', () => {
  it('PAUSE del motor durante el descanso: al terminar el descanso no cuenta tiempo activo hasta RESUME', () => {
    const s = reduce([
      start(1, 2),
      eng(rep(1000, 85), 1000), // descanso hasta 31 s
      eng({ type: 'PAUSE', tMs: 5000 }, 5000),
      { type: 'tick', nowMs: 31_000 },
      { type: 'tick', nowMs: 60_000 },
    ]);
    expect(s.phase).toBe('active');
    expect(s.activeMs).toBe(1000);
    expect(reduce([eng({ type: 'RESUME', tMs: 60_000 }, 60_000), { type: 'tick', nowMs: 65_000 }], s).activeMs).toBe(6000);
  });

  it('la pausa manual no la levanta volver a la app, ni caduca a los 30 min', () => {
    const p = reduce([start(), { type: 'pause', nowMs: 1000 }, { type: 'appState', active: false, nowMs: 2000 }, { type: 'appState', active: true, nowMs: 3000 }]);
    expect(p.phase).toBe('paused');
    expect(reduce([{ type: 'resume', nowMs: 1000 + 40 * MIN }], p).phase).toBe('active');
  });

  it('cámara ocupada: error recuperable, Reintentar vuelve a la fase anterior; en pausa se ignora', () => {
    const e = reduce([start(), eng(rep(1000, 85), 1000), { type: 'cameraError', reason: 'busy' }]);
    expect(e).toMatchObject({ phase: 'error', error: 'busy', validReps: 1 });
    expect(reduce([{ type: 'retryCamera', nowMs: 5000 }], e)).toMatchObject({ phase: 'active', error: null });
    const paused = reduce([start(), { type: 'pause', nowMs: 1 }, { type: 'cameraError', reason: 'busy' }]);
    expect(paused.phase).toBe('paused');
  });
});

describe('registro para guardar la sesión (parte 5)', () => {
  it('guarda la hora de inicio, cada intento (válido o no) y las series completas', () => {
    const miss: ScoredRep = { ...rep(9000, 0), outcome: 'incomplete', quality: 'Miss', formScore: undefined, q: undefined, durationMs: 1500, faults: ['SQ_DEPTH_SHALLOW'] };
    const s = reduce([
      { type: 'start', exercise: 'squat', sets: 2, repsPerSet: 2, nowMs: 500 },
      eng(rep(5000, 85), 5000),
      eng(miss, 9000),
      eng(rep(13000, 70), 13000),
    ]);
    expect(s.startedAtMs).toBe(500);
    expect(s.setsCompleted).toBe(1);
    // tStartMs: ms desde el inicio de la sesión hasta el comienzo de la repetición (reloj de pared, nunca negativo).
    expect(s.attempts).toEqual([
      { valid: true, formScore: 85, durationMs: 2000, tStartMs: 2500, faults: [] },
      { valid: false, formScore: 0, durationMs: 1500, tStartMs: 7000, faults: ['SQ_DEPTH_SHALLOW'] },
      { valid: true, formScore: 70, durationMs: 2000, tStartMs: 10500, faults: [] },
    ]);
  });
});
