import type { EngineEvent, EngineExercise } from '@/kinematics/engine';
import type { FeedbackCode } from '@/kinematics/feedback/codes';
import type { Quality } from '@/kinematics/scoring/quality';

/** Modelo puro de una sesión de entrenamiento (spec-producto §3.4 y §5.2). Sin landmarks: solo resúmenes por repetición. */

export type SessionPhase = 'idle' | 'active' | 'rest' | 'paused' | 'fatigue' | 'error' | 'done';
export type SessionWarning = '15min' | '25min';

export interface RepSummary {
  readonly formScore: number;
  readonly quality: Quality;
  readonly faults: readonly FeedbackCode[];
  readonly durationMs: number;
}

export interface AttemptRow {
  readonly valid: boolean;
  readonly formScore: number;
  readonly durationMs: number;
  /** Ms desde el inicio de la sesión hasta el comienzo de la repetición (reloj de pared). */
  readonly tStartMs: number;
  readonly faults: readonly FeedbackCode[];
}

export interface SessionState {
  readonly phase: SessionPhase;
  readonly exercise: EngineExercise | null;
  readonly sets: number;
  readonly repsPerSet: number;
  readonly set: number;
  readonly repsInSet: number;
  readonly validReps: number;
  readonly cleanReps: number;
  /** Tiempo entrenando, sin pausas (de la app o del motor) ni descansos. */
  readonly activeMs: number;
  readonly restEndsAtMs: number | null;
  readonly warnings: readonly SessionWarning[];
  readonly topFault: FeedbackCode | null;
  readonly reps: readonly RepSummary[];
  /** Todos los intentos (válidos, incompletos y faltas) para guardar la sesión; sin landmarks. */
  readonly attempts: readonly AttemptRow[];
  readonly startedAtMs: number | null;
  readonly setsCompleted: number;
  readonly error: 'permission' | 'busy' | null;
  /** Internos: último instante contado, pausa del motor, fase a la que volver, faltas y racha de Miss. */
  readonly lastMs: number | null;
  readonly enginePaused: boolean;
  readonly resumePhase: SessionPhase | null;
  readonly pausedAtMs: number | null;
  readonly faultCounts: Readonly<Partial<Record<FeedbackCode, number>>>;
  readonly missStreak: number;
  readonly fatigueShownInSet: boolean;
  /** El descanso en curso vuelve a la misma serie (elegido en la tarjeta de fatiga) en vez de pasar a la siguiente. */
  readonly restResumesSet: boolean;
  /** Pausa pedida por el usuario: solo la levanta `resume` (no volver a la app) y no caduca. */
  readonly manualPause: boolean;
}

export type SessionAction =
  | { readonly type: 'start'; readonly exercise: EngineExercise; readonly sets: number; readonly repsPerSet: number; readonly nowMs: number }
  | { readonly type: 'engine'; readonly event: EngineEvent; readonly nowMs: number }
  | { readonly type: 'tick'; readonly nowMs: number }
  | { readonly type: 'appState'; readonly active: boolean; readonly nowMs: number }
  | { readonly type: 'skipRest' }
  | { readonly type: 'fatigueChoice'; readonly choice: 'rest' | 'endSet' | 'continue'; readonly nowMs: number }
  | { readonly type: 'pause'; readonly nowMs: number }
  | { readonly type: 'resume'; readonly nowMs: number }
  | { readonly type: 'cameraError'; readonly reason: 'permission' | 'busy' }
  | { readonly type: 'retryCamera'; readonly nowMs: number }
  | { readonly type: 'finish'; readonly nowMs: number };

export const REST_MS = 30_000;
export const RESUME_LIMIT_MS = 30 * 60_000;
const WARN_15_MS = 15 * 60_000;
const WARN_25_MS = 25 * 60_000;
const CLEAN_SCORE = 80;
const FATIGUE_FIRST = 5;
const FATIGUE_LAST = 3;
const FATIGUE_DROP = 20;
const MISS_STREAK = 3;

export function createSession(): SessionState {
  return {
    phase: 'idle', exercise: null, sets: 0, repsPerSet: 0, set: 0, repsInSet: 0, validReps: 0, cleanReps: 0, activeMs: 0,
    restEndsAtMs: null, warnings: [], topFault: null, reps: [], attempts: [], startedAtMs: null, setsCompleted: 0, error: null, lastMs: null, enginePaused: false,
    resumePhase: null, pausedAtMs: null, faultCounts: {}, missStreak: 0, fatigueShownInSet: false, restResumesSet: false, manualPause: false,
  };
}

/** Suma el tiempo activo hasta `nowMs` (solo en 'active' sin pausa del motor) y añade los avisos de duración. */
function accrue(s: SessionState, nowMs: number): SessionState {
  const counting = s.phase === 'active' && !s.enginePaused && s.lastMs !== null;
  const activeMs = counting ? s.activeMs + Math.max(0, nowMs - (s.lastMs ?? nowMs)) : s.activeMs;
  const warnings = [...s.warnings];
  if (activeMs >= WARN_15_MS && !warnings.includes('15min')) warnings.push('15min');
  if (activeMs >= WARN_25_MS && !warnings.includes('25min')) warnings.push('25min');
  return { ...s, activeMs, warnings: warnings.length === s.warnings.length ? s.warnings : warnings, lastMs: nowMs };
}

function topOf(counts: Readonly<Partial<Record<FeedbackCode, number>>>): FeedbackCode | null {
  let best: FeedbackCode | null = null;
  let n = 0;
  for (const [code, c] of Object.entries(counts) as [FeedbackCode, number][]) {
    if (c > n) {
      best = code;
      n = c;
    }
  }
  return best;
}

function mean(xs: readonly number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function fatigued(s: SessionState): boolean {
  if (s.missStreak >= MISS_STREAK) return true;
  if (s.reps.length < FATIGUE_FIRST + FATIGUE_LAST) return false;
  const first = mean(s.reps.slice(0, FATIGUE_FIRST).map((r) => r.formScore));
  const last = mean(s.reps.slice(-FATIGUE_LAST).map((r) => r.formScore));
  return first - last >= FATIGUE_DROP;
}

/** Fin de serie: descanso, o fin de la sesión si era la última. */
function endSet(s0: SessionState, nowMs: number): SessionState {
  const s = s0.repsInSet >= s0.repsPerSet ? { ...s0, setsCompleted: s0.setsCompleted + 1 } : s0;
  if (s.set >= s.sets) return { ...s, phase: 'done' };
  return { ...s, phase: 'rest', restEndsAtMs: nowMs + REST_MS };
}

/** Sale del descanso: a la serie siguiente, o a la misma si el descanso se eligió por fatiga. */
function afterRest(s: SessionState, nowMs: number | null): SessionState {
  const back = { ...s, phase: 'active' as const, restEndsAtMs: null, lastMs: nowMs, restResumesSet: false };
  if (s.restResumesSet) return back;
  return { ...back, set: s.set + 1, repsInSet: 0, fatigueShownInSet: false };
}

function onEngine(s: SessionState, e: EngineEvent, nowMs: number): SessionState {
  if (e.type === 'PAUSE') return { ...s, enginePaused: true };
  if (e.type === 'RESUME') return { ...s, enginePaused: false };
  if (e.type !== 'REP') return s;
  const counts = { ...s.faultCounts };
  for (const f of e.faults) counts[f] = (counts[f] ?? 0) + 1;
  const attempt: AttemptRow = {
    valid: e.outcome === 'valid',
    formScore: e.outcome === 'valid' ? (e.formScore ?? 0) : 0,
    durationMs: e.durationMs,
    tStartMs: Math.max(0, nowMs - (s.startedAtMs ?? nowMs) - e.durationMs),
    faults: e.faults,
  };
  let next: SessionState = { ...s, attempts: [...s.attempts, attempt], faultCounts: counts, topFault: topOf(counts), missStreak: e.quality === 'Miss' ? s.missStreak + 1 : 0 };
  if (e.outcome === 'valid') {
    const formScore = e.formScore ?? 0;
    next = {
      ...next,
      validReps: s.validReps + 1,
      repsInSet: s.repsInSet + 1,
      cleanReps: s.cleanReps + (formScore >= CLEAN_SCORE ? 1 : 0),
      reps: [...s.reps, { formScore, quality: e.quality ?? 'Miss', faults: e.faults, durationMs: e.durationMs }],
    };
    if (next.repsInSet >= next.repsPerSet) return endSet(next, nowMs);
  }
  if (!next.fatigueShownInSet && fatigued(next)) return { ...next, phase: 'fatigue', fatigueShownInSet: true };
  return next;
}

export function sessionReducer(s0: SessionState, a: SessionAction): SessionState {
  if (a.type === 'start') {
    return { ...createSession(), phase: 'active', exercise: a.exercise, sets: a.sets, repsPerSet: a.repsPerSet, set: 1, lastMs: a.nowMs, startedAtMs: a.nowMs };
  }
  if (a.type === 'cameraError') {
    // En pausa la cámara está apagada a propósito: su error no cuenta. El error guarda la fase para Reintentar.
    if (s0.phase === 'paused' || s0.phase === 'done' || s0.phase === 'idle') return s0;
    const resumePhase = s0.phase === 'error' ? s0.resumePhase : s0.phase;
    return { ...s0, phase: 'error', error: a.reason, resumePhase };
  }
  if (a.type === 'retryCamera') {
    if (s0.phase !== 'error') return s0;
    return { ...s0, phase: s0.resumePhase ?? 'active', resumePhase: null, error: null, lastMs: a.nowMs };
  }
  if (a.type === 'finish') return { ...accrue(s0, a.nowMs), phase: 'done' };
  if (s0.phase === 'done' || s0.phase === 'error' || s0.phase === 'idle') return s0;

  switch (a.type) {
    case 'pause': {
      if (s0.phase === 'paused') return { ...s0, manualPause: true };
      return { ...accrue(s0, a.nowMs), phase: 'paused', resumePhase: s0.phase, pausedAtMs: a.nowMs, manualPause: true };
    }
    case 'resume': {
      if (s0.phase !== 'paused') return s0;
      const away = a.nowMs - (s0.pausedAtMs ?? a.nowMs);
      const restEndsAtMs = s0.restEndsAtMs === null ? null : s0.restEndsAtMs + away;
      return { ...s0, phase: s0.resumePhase ?? 'active', resumePhase: null, pausedAtMs: null, lastMs: a.nowMs, restEndsAtMs, manualPause: false };
    }
    case 'appState': {
      if (!a.active) {
        if (s0.phase === 'paused') return s0;
        return { ...accrue(s0, a.nowMs), phase: 'paused', resumePhase: s0.phase, pausedAtMs: a.nowMs };
      }
      if (s0.phase !== 'paused' || s0.manualPause) return s0;
      const away = a.nowMs - (s0.pausedAtMs ?? a.nowMs);
      if (away > RESUME_LIMIT_MS) return { ...s0, phase: 'done' };
      // El descanso no corre mientras la app está en segundo plano.
      const restEndsAtMs = s0.restEndsAtMs === null ? null : s0.restEndsAtMs + away;
      return { ...s0, phase: s0.resumePhase ?? 'active', resumePhase: null, pausedAtMs: null, lastMs: a.nowMs, restEndsAtMs };
    }
    case 'engine': {
      // La pausa del motor (visibilidad, encuadre) se sigue en todas las fases para no contar tiempo activo
      // sin persona; repeticiones y avisos solo cuentan en 'active' (evita repeticiones fantasma).
      if (a.event.type === 'PAUSE' || a.event.type === 'RESUME') {
        return onEngine(s0.phase === 'active' ? accrue(s0, a.nowMs) : s0, a.event, a.nowMs);
      }
      if (s0.phase !== 'active') return s0;
      return onEngine(accrue(s0, a.nowMs), a.event, a.nowMs);
    }
    case 'tick': {
      const s = accrue(s0, a.nowMs);
      if (s.phase === 'rest' && s.restEndsAtMs !== null && a.nowMs >= s.restEndsAtMs) return afterRest(s, a.nowMs);
      return s;
    }
    case 'skipRest':
      return s0.phase === 'rest' ? afterRest(s0, null) : s0;
    case 'fatigueChoice': {
      if (s0.phase !== 'fatigue') return s0;
      const s = { ...s0, lastMs: a.nowMs };
      if (a.choice === 'continue') return { ...s, phase: 'active' };
      if (a.choice === 'rest') return { ...s, phase: 'rest', restEndsAtMs: a.nowMs + REST_MS, restResumesSet: true };
      return endSet(s, a.nowMs);
    }
  }
}
