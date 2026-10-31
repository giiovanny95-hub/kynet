import { addDays } from './localDate';

/** Actividad agregada de un día local (suma de sus sesiones). */
export interface DayActivity {
  readonly date: string;
  readonly validReps: number;
  readonly activeSeconds: number;
}

export const QUALIFY_REPS = 20;
export const QUALIFY_SECONDS = 180;

export function isQualified(d: DayActivity): boolean {
  return d.validReps >= QUALIFY_REPS || d.activeSeconds >= QUALIFY_SECONDS;
}

/**
 * Racha recalculada desde cero (spec de datos §2.2): días cualificados consecutivos hasta `asOf`. Un día cerrado sin
 * actividad la rompe (MVP sin protectores); hoy sin actividad no la rompe todavía (`atRisk`). Conmutativa: el orden da igual.
 */
export function computeStreak(
  days: readonly DayActivity[],
  asOf: string,
): { current: number; longest: number; lastDay: string | null; atRisk: boolean } {
  const qualified = new Set(days.filter((d) => d.date <= asOf && isQualified(d)).map((d) => d.date));
  if (qualified.size === 0) return { current: 0, longest: 0, lastDay: null, atRisk: false };
  const sorted = [...qualified].sort();
  let streak = 0;
  let longest = 0;
  for (let d = sorted[0] ?? asOf; d <= asOf; d = addDays(d, 1)) {
    if (qualified.has(d)) streak += 1;
    else if (d !== asOf) streak = 0;
    longest = Math.max(longest, streak);
  }
  const lastDay = sorted[sorted.length - 1] ?? null;
  return { current: streak, longest, lastDay, atRisk: streak > 0 && !qualified.has(asOf) };
}

/** Suma las sesiones por día local. */
export function aggregateDays(sessions: readonly { readonly localDate: string; readonly repsValid: number; readonly activeSeconds: number }[]): DayActivity[] {
  const byDay = new Map<string, { validReps: number; activeSeconds: number }>();
  for (const s of sessions) {
    const d = byDay.get(s.localDate) ?? { validReps: 0, activeSeconds: 0 };
    byDay.set(s.localDate, { validReps: d.validReps + s.repsValid, activeSeconds: d.activeSeconds + s.activeSeconds });
  }
  return [...byDay].map(([date, v]) => ({ date, ...v }));
}
