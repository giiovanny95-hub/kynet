import { localDate } from '@/gamification/localDate';
import type { SessionSummary } from '@/gamification/types';

import type { SessionState } from './sessionModel';

/** Resumen inmutable de una sesión terminada, listo para guardar en local y subir (sin landmarks ni vídeo). */
export function toSessionSummary(s: SessionState, meta: { readonly id: string; readonly tz: string; readonly endedAtMs: number }): SessionSummary {
  const startedAtMs = s.startedAtMs ?? meta.endedAtMs;
  const valid = s.attempts.filter((a) => a.valid);
  const avg = valid.length === 0 ? 0 : Math.round(valid.reduce((n, a) => n + a.formScore, 0) / valid.length);
  return {
    id: meta.id,
    exercise: s.exercise ?? 'squat',
    startedAtMs,
    endedAtMs: Math.max(startedAtMs, meta.endedAtMs),
    tz: meta.tz,
    localDate: localDate(startedAtMs, meta.tz),
    status: s.setsCompleted > 0 ? 'completed' : 'abandoned',
    activeSeconds: Math.floor(s.activeMs / 1000),
    repsTotal: s.attempts.length,
    repsValid: valid.length,
    avgFormScore: avg,
    reps: s.attempts.map((a, index) => ({ index, tStartMs: a.tStartMs, durationMs: a.durationMs, formScore: a.formScore, valid: a.valid, faults: a.faults })),
  };
}

/** Sesiones de menos de 10 s activos y sin intentos no se guardan: suelen ser entradas por error. */
const MIN_ACTIVE_MS = 10_000;

export function shouldSave(s: SessionState): boolean {
  return s.startedAtMs !== null && s.exercise !== null && (s.attempts.length > 0 || s.activeMs >= MIN_ACTIVE_MS);
}
