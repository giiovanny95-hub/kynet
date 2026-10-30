import { weekStart } from './localDate';
import { dailyAssignments, dailyBonus, isComplete, progress, weeklyAssignments, type Assignment } from './missions';
import { aggregateDays, computeStreak } from './streak';
import type { SessionSummary } from './types';
import { levelForXp, sessionXp } from './xp';

export interface AssignmentView extends Assignment {
  readonly progress: number;
  readonly completed: boolean;
}

export interface ProvisionalState {
  readonly totalXp: number;
  readonly level: number;
  readonly streak: ReturnType<typeof computeStreak>;
  /** XP de cada sesión (repeticiones + bonos) y solo de repeticiones, por id. */
  readonly sessionXp: Readonly<Record<string, number>>;
  readonly repXp: Readonly<Record<string, number>>;
  /** Misiones de hoy y de la semana en curso. */
  readonly assignments: readonly AssignmentView[];
}

/**
 * Copia provisional del estado que calcula `sync_session` (spec-datos-supabase §2.3): mismas reglas, aplicadas en el
 * orden en que terminaron las sesiones. La UI la muestra como "pendiente" hasta que el servidor devuelve la suya.
 */
export function provisionalState(
  sessions: readonly SessionSummary[],
  ctx: { readonly userId: string; readonly today: string; readonly weeklyGoalDays: number },
): ProvisionalState {
  const ordered = [...sessions].sort((a, b) => a.endedAtMs - b.endedAtMs);
  const sessionXpById: Record<string, number> = {};
  const repXpById: Record<string, number> = {};
  const repXpByDay = new Map<string, number>();
  const seenDays = new Set<string>();
  const seenExercises = new Set<string>();
  let total = 0;
  for (const s of ordered) {
    const xp = sessionXp(s, {
      firstOfDay: !seenDays.has(s.localDate),
      firstTimeExercise: !seenExercises.has(s.exercise),
      repXpTodayBefore: repXpByDay.get(s.localDate) ?? 0,
    });
    seenDays.add(s.localDate);
    seenExercises.add(s.exercise);
    repXpByDay.set(s.localDate, (repXpByDay.get(s.localDate) ?? 0) + xp.repXp);
    sessionXpById[s.id] = xp.total;
    repXpById[s.id] = xp.repXp;
    total += xp.total;
  }

  // Misiones de cada día con actividad y de hoy, y de sus semanas.
  const days = new Set([...ordered.map((s) => s.localDate), ctx.today]);
  const weeks = new Set([...days].map(weekStart));
  const priorBefore = (date: string) => ordered.filter((s) => s.localDate < date).length;
  const view = (a: Assignment): AssignmentView => ({ ...a, progress: progress(a, ordered), completed: isComplete(a, ordered) });
  const all: AssignmentView[] = [];
  for (const d of days) {
    const daily = dailyAssignments(ctx.userId, d, priorBefore(d));
    all.push(...daily.map(view));
    total += dailyBonus(daily, ordered);
  }
  for (const w of weeks) all.push(...weeklyAssignments(ctx.userId, w, ctx.weeklyGoalDays).map(view));
  total += all.filter((a) => a.completed).reduce((n, a) => n + a.xpReward, 0);

  const currentWeek = weekStart(ctx.today);
  return {
    totalXp: total,
    level: levelForXp(total),
    streak: computeStreak(aggregateDays(ordered), ctx.today),
    sessionXp: sessionXpById,
    repXp: repXpById,
    assignments: all.filter((a) => (a.scope === 'daily' && a.periodStart === ctx.today) || (a.scope === 'weekly' && a.periodStart === currentWeek)),
  };
}
