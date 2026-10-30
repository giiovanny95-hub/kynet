import type { SessionSummary } from '@/gamification/types';

/** Reglas de la cola de salida (spec-datos-supabase §4.3). Puro: sin red ni reloj. */

const BASE_MS = 5_000;
const MAX_MS = 15 * 60_000;

/** `5 s · 2^n` con tope de 15 min y jitter: `rand` en [0, 1] escala entre la mitad y el total. */
export function retryDelayMs(attempts: number, rand: number): number {
  const full = Math.min(MAX_MS, BASE_MS * 2 ** Math.min(attempts, 20));
  return Math.round(full * (0.5 + 0.5 * Math.min(1, Math.max(0, rand))));
}

export interface RpcError {
  readonly code?: string;
  readonly status?: number;
  readonly message: string;
}

/** `dead`: error permanente (validación, sesión ajena); `retry`: red, 5xx, 429 o token caducado. */
export function classifyError(e: RpcError): 'retry' | 'dead' {
  if (e.status === 401 || e.status === 429 || (e.status !== undefined && e.status >= 500)) return 'retry';
  if (e.code === '42501') return /sin sesión/i.test(e.message) ? 'retry' : 'dead';
  if (e.code !== undefined && /^(22|23|P0)/.test(e.code)) return 'dead';
  if (e.status !== undefined && e.status >= 400) return 'dead';
  return 'retry';
}

export interface RpcSession {
  readonly id: string;
  readonly exercise: string;
  readonly started_at: string;
  readonly ended_at: string;
  readonly tz: string;
  readonly status: string;
  readonly active_seconds: number;
  readonly avg_form_score: number;
  readonly algo_version: number;
  readonly app_version: string;
}

export interface RpcRep {
  readonly index: number;
  readonly t_start_ms: number;
  readonly duration_ms: number;
  readonly form_score: number;
  readonly valid: boolean;
  readonly faults: readonly string[];
}

export interface RpcArgs {
  readonly p_session: RpcSession;
  readonly p_reps: readonly RpcRep[];
  readonly p_initial_import: boolean;
}

/** Argumentos de `sync_session` (solo resúmenes; nunca landmarks ni vídeo). */
export function toRpcArgs(s: SessionSummary, initialImport: boolean, appVersion = 'unknown'): RpcArgs {
  return {
    p_session: {
      id: s.id,
      exercise: s.exercise,
      started_at: new Date(s.startedAtMs).toISOString(),
      ended_at: new Date(s.endedAtMs).toISOString(),
      tz: s.tz,
      status: s.status,
      active_seconds: s.activeSeconds,
      avg_form_score: s.avgFormScore,
      algo_version: 1,
      app_version: appVersion,
    },
    p_reps: s.reps.map((r) => ({ index: r.index, t_start_ms: r.tStartMs, duration_ms: r.durationMs, form_score: r.formScore, valid: r.valid, faults: r.faults })),
    p_initial_import: initialImport,
  };
}
