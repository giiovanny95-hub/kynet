/** Tipos compartidos de la gamificación (TS puro; el servidor usa las mismas reglas en SQL). */

export type ExerciseCode = 'squat' | 'jumpingJack' | 'pushUp';

/** Resumen por repetición: nunca landmarks ni vídeo (CLAUDE.md, privacidad). */
export interface RepRow {
  readonly index: number;
  readonly tStartMs: number;
  readonly durationMs: number;
  readonly formScore: number;
  readonly valid: boolean;
  readonly faults: readonly string[];
}

export interface SessionSummary {
  readonly id: string;
  readonly exercise: ExerciseCode;
  readonly startedAtMs: number;
  readonly endedAtMs: number;
  readonly tz: string;
  readonly localDate: string;
  readonly status: 'completed' | 'abandoned';
  readonly activeSeconds: number;
  readonly repsTotal: number;
  readonly repsValid: number;
  readonly avgFormScore: number;
  readonly reps: readonly RepRow[];
}
