import { addDays } from './localDate';
import { aggregateDays, isQualified } from './streak';
import type { ExerciseCode, SessionSummary } from './types';
import { cleanRatio } from './xp';

/** Misiones del MVP (producto §4.5-4.6). Selección determinista; el servidor usa el mismo FNV-1a y el mismo catálogo. */

export type MissionMetric = 'valid_reps' | 'active_seconds' | 'sessions' | 'good_form_sessions' | 'active_days' | 'exercises_done';
export type MissionTier = 'easy' | 'medium' | 'quality' | 'explore' | 'weekly';

export interface MissionTemplate {
  readonly code: string;
  readonly scope: 'daily' | 'weekly';
  readonly tier: MissionTier;
  readonly metric: MissionMetric;
  readonly exercise: ExerciseCode | null;
  readonly target: number;
  readonly xpReward: number;
}

export interface Assignment extends MissionTemplate {
  readonly periodStart: string;
  readonly periodEnd: string;
}

export const DAILY_ALL_BONUS = 15;
/** La misión de calidad solo aparece con este historial (producto §4.5). */
export const QUALITY_MIN_SESSIONS = 3;

export const MISSION_TEMPLATES: readonly MissionTemplate[] = [
  { code: 'd_easy_squat15', scope: 'daily', tier: 'easy', metric: 'valid_reps', exercise: 'squat', target: 15, xpReward: 20 },
  { code: 'd_easy_active3', scope: 'daily', tier: 'easy', metric: 'active_seconds', exercise: null, target: 180, xpReward: 20 },
  { code: 'd_easy_jj20', scope: 'daily', tier: 'easy', metric: 'valid_reps', exercise: 'jumpingJack', target: 20, xpReward: 20 },
  { code: 'd_med_squat25', scope: 'daily', tier: 'medium', metric: 'valid_reps', exercise: 'squat', target: 25, xpReward: 30 },
  { code: 'd_med_jj40', scope: 'daily', tier: 'medium', metric: 'valid_reps', exercise: 'jumpingJack', target: 40, xpReward: 30 },
  { code: 'd_med_pu10', scope: 'daily', tier: 'medium', metric: 'valid_reps', exercise: 'pushUp', target: 10, xpReward: 30 },
  { code: 'd_med_sessions2', scope: 'daily', tier: 'medium', metric: 'sessions', exercise: null, target: 2, xpReward: 30 },
  { code: 'd_q_clean', scope: 'daily', tier: 'quality', metric: 'good_form_sessions', exercise: null, target: 1, xpReward: 30 },
  { code: 'd_explore', scope: 'daily', tier: 'explore', metric: 'exercises_done', exercise: null, target: 2, xpReward: 20 },
  { code: 'w_consistency', scope: 'weekly', tier: 'weekly', metric: 'active_days', exercise: null, target: 3, xpReward: 100 },
  { code: 'w_volume', scope: 'weekly', tier: 'weekly', metric: 'valid_reps', exercise: null, target: 150, xpReward: 80 },
  { code: 'w_variety', scope: 'weekly', tier: 'weekly', metric: 'exercises_done', exercise: null, target: 3, xpReward: 60 },
];

/** FNV-1a de 32 bits sobre los códigos UTF-16 (ASCII en la práctica); devuelve un entero sin signo. */
export function fnv1a(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function pick(tier: MissionTier, seed: string): MissionTemplate {
  const options = MISSION_TEMPLATES.filter((t) => t.tier === tier);
  const t = options[fnv1a(`${seed}|${tier}`) % options.length];
  if (!t) throw new Error(`Sin plantillas para ${tier}`);
  return t;
}

export function dailyAssignments(userId: string, date: string, priorSessions: number): Assignment[] {
  const seed = `${userId}|${date}`;
  const third: MissionTier = priorSessions >= QUALITY_MIN_SESSIONS ? 'quality' : 'explore';
  return (['easy', 'medium', third] as const).map((tier) => ({ ...pick(tier, seed), periodStart: date, periodEnd: date }));
}

export function weeklyAssignments(_userId: string, weekStart: string, weeklyGoalDays: number): Assignment[] {
  const end = addDays(weekStart, 6);
  return MISSION_TEMPLATES.filter((t) => t.scope === 'weekly').map((t) => ({
    ...t,
    target: t.code === 'w_consistency' ? Math.min(5, Math.max(2, weeklyGoalDays)) : t.target,
    periodStart: weekStart,
    periodEnd: end,
  }));
}

/** Progreso derivado de las sesiones del periodo (nunca incremental), limitado al objetivo. */
export function progress(a: Assignment, sessions: readonly SessionSummary[]): number {
  const inPeriod = sessions.filter((s) => s.localDate >= a.periodStart && s.localDate <= a.periodEnd);
  const mine = a.exercise === null ? inPeriod : inPeriod.filter((s) => s.exercise === a.exercise);
  let value = 0;
  switch (a.metric) {
    case 'valid_reps':
      value = mine.reduce((n, s) => n + s.repsValid, 0);
      break;
    case 'active_seconds':
      value = mine.reduce((n, s) => n + s.activeSeconds, 0);
      break;
    case 'sessions':
      value = mine.filter((s) => s.status === 'completed').length;
      break;
    case 'good_form_sessions':
      value = mine.filter((s) => s.status === 'completed' && cleanRatio(s) >= 0.8).length;
      break;
    case 'active_days':
      value = aggregateDays(mine).filter(isQualified).length;
      break;
    case 'exercises_done':
      value = new Set(mine.filter((s) => s.repsValid > 0).map((s) => s.exercise)).size;
      break;
  }
  return Math.min(a.target, value);
}

export function isComplete(a: Assignment, sessions: readonly SessionSummary[]): boolean {
  return progress(a, sessions) >= a.target;
}

/** +15 XP si se completan las tres misiones diarias del día. */
export function dailyBonus(daily: readonly Assignment[], sessions: readonly SessionSummary[]): number {
  return daily.length > 0 && daily.every((a) => isComplete(a, sessions)) ? DAILY_ALL_BONUS : 0;
}
