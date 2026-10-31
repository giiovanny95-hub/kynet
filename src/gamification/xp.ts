import type { ExerciseCode, SessionSummary } from './types';

/** Reglas de XP y nivel, ruleset 1 (spec de datos §1.3; producto §4.1-4.3). El SQL del servidor replica estas reglas. */
export const RULESET = 1;
export const CLEAN_SCORE = 80;
export const OK_SCORE = 50;
/** Sentadilla y flexión más rápidas que esto no puntúan (movimiento balístico). */
export const MIN_REP_MS = 800;
export const DAILY_REP_XP_CAP = 300;
export const BONUS_COMPLETED = 20;
export const BONUS_FIRST_OF_DAY = 10;
export const BONUS_CLEAN_FORM = 10;
export const BONUS_FIRST_TIME_EXERCISE = 15;
const CLEAN_RATIO = 0.8;

export function repXp(r: { readonly formScore: number; readonly durationMs: number; readonly valid?: boolean }, exercise: ExerciseCode): 0 | 1 | 2 {
  if (r.valid === false) return 0;
  if (exercise !== 'jumpingJack' && r.durationMs < MIN_REP_MS) return 0;
  if (r.formScore >= CLEAN_SCORE) return 2;
  return r.formScore >= OK_SCORE ? 1 : 0;
}

export function cleanRatio(s: SessionSummary): number {
  const valid = s.reps.filter((r) => r.valid);
  return valid.length === 0 ? 0 : valid.filter((r) => r.formScore >= CLEAN_SCORE).length / valid.length;
}

/** XP de una sesión: repeticiones (con el tope diario de 300 descontando lo ya ganado hoy) más bonos. */
export function sessionXp(
  s: SessionSummary,
  ctx: { readonly firstOfDay: boolean; readonly firstTimeExercise: boolean; readonly repXpTodayBefore: number },
): { repXp: number; bonus: number; total: number } {
  const raw = s.reps.reduce((sum, r) => sum + repXp(r, s.exercise), 0);
  const room = Math.max(0, DAILY_REP_XP_CAP - ctx.repXpTodayBefore);
  const rep = Math.min(raw, room);
  let bonus = 0;
  if (s.status === 'completed') bonus += BONUS_COMPLETED;
  if (ctx.firstOfDay) bonus += BONUS_FIRST_OF_DAY;
  if (cleanRatio(s) >= CLEAN_RATIO) bonus += BONUS_CLEAN_FORM;
  if (ctx.firstTimeExercise) bonus += BONUS_FIRST_TIME_EXERCISE;
  return { repXp: rep, bonus, total: rep + bonus };
}

/** XP acumulado para llegar al nivel `level`: 20·(L−1)·(L+3). */
export function xpForLevel(level: number): number {
  return 20 * (level - 1) * (level + 3);
}

/** Inverso de `xpForLevel`: floor(sqrt(total/20 + 4)) − 1, con nivel mínimo 1. */
export function levelForXp(total: number): number {
  let level = Math.max(1, Math.floor(Math.sqrt(Math.max(0, total) / 20 + 4)) - 1);
  // Corrige errores de coma flotante en los bordes exactos.
  while (xpForLevel(level + 1) <= total) level++;
  while (level > 1 && xpForLevel(level) > total) level--;
  return level;
}

/** Avance dentro del nivel actual, para la barra de nivel. */
export function levelProgress(total: number): { readonly level: number; readonly current: number; readonly span: number } {
  const level = levelForXp(total);
  const base = xpForLevel(level);
  return { level, current: total - base, span: xpForLevel(level + 1) - base };
}
