import type { LocalStore } from '@/data/types';
import type { ExerciseCode, RepRow, SessionSummary } from '@/gamification/types';

/** Fila de `workout_sessions` con su ejercicio y sus repeticiones anidados (consulta de `pullSessions`). */
export interface RemoteSessionRow {
  readonly id: string;
  readonly started_at: string;
  readonly ended_at: string;
  readonly tz: string;
  readonly local_date: string;
  readonly status: 'completed' | 'abandoned';
  readonly active_seconds: number;
  readonly reps_total: number;
  readonly reps_valid: number;
  readonly avg_form_score: number;
  readonly updated_at: string;
  readonly exercises: { readonly code: string } | null;
  readonly rep_summaries: readonly {
    readonly rep_index: number;
    readonly t_start_ms: number;
    readonly duration_ms: number;
    readonly form_score: number;
    readonly valid: boolean;
    readonly fault_codes: readonly string[];
  }[];
}

/** Columnas que pide la descarga; el orden y los anidados coinciden con `RemoteSessionRow`. */
export const PULL_COLUMNS =
  'id, started_at, ended_at, tz, local_date, status, active_seconds, reps_total, reps_valid, avg_form_score, updated_at, ' +
  'exercises(code), rep_summaries(rep_index, t_start_ms, duration_ms, form_score, valid, fault_codes)';

/** Sesiones por página; con más, la siguiente sincronización sigue desde el cursor. */
export const PULL_LIMIT = 200;

/** Primera descarga tras el login o una reinstalación: los últimos 90 días (spec-datos-supabase §4.4). */
export const PULL_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;

export const LAST_PULL_AT_KEY = 'last_pull_at';

const EXERCISES: readonly ExerciseCode[] = ['squat', 'jumpingJack', 'pushUp'];

function isExercise(code: string | undefined): code is ExerciseCode {
  return code !== undefined && (EXERCISES as readonly string[]).includes(code);
}

/** Filas remotas → sesiones locales. Descarta las de un ejercicio que esta versión no conoce. */
export function fromRemoteRows(rows: readonly RemoteSessionRow[]): SessionSummary[] {
  const out: SessionSummary[] = [];
  for (const r of rows) {
    const exercise = r.exercises?.code;
    if (!isExercise(exercise)) continue;
    const reps: RepRow[] = [...r.rep_summaries]
      .sort((a, b) => a.rep_index - b.rep_index)
      .map((p) => ({ index: p.rep_index, tStartMs: p.t_start_ms, durationMs: p.duration_ms, formScore: p.form_score, valid: p.valid, faults: [...p.fault_codes] }));
    out.push({
      id: r.id,
      exercise,
      startedAtMs: Date.parse(r.started_at),
      endedAtMs: Date.parse(r.ended_at),
      tz: r.tz,
      localDate: r.local_date,
      status: r.status,
      activeSeconds: r.active_seconds,
      repsTotal: r.reps_total,
      repsValid: r.reps_valid,
      avgFormScore: r.avg_form_score,
      reps,
    });
  }
  return out;
}

export type PullQuery = (sinceIso: string) => Promise<{ data: readonly RemoteSessionRow[] | null; error: { message: string } | null }>;

/**
 * Descarga las sesiones cambiadas desde `sinceIso` y las importa. Devuelve el `updated_at` más reciente para el
 * siguiente cursor, o `null` si no hubo filas o hubo error (el cursor no se mueve).
 */
export async function pullSessions(query: PullQuery, store: LocalStore, userId: string, sinceIso: string): Promise<string | null> {
  const { data, error } = await query(sinceIso);
  if (error !== null || data === null || data.length === 0) return null;
  await store.importRemoteSessions(fromRemoteRows(data), userId);
  let max: string | null = null;
  for (const r of data) if (max === null || Date.parse(r.updated_at) > Date.parse(max)) max = r.updated_at;
  return max;
}
