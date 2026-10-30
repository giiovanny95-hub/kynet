/** Estado que devuelven `sync_session` y `get_state` (spec-datos-supabase §3.4); el servidor manda sobre el provisional. */
export interface ServerState {
  readonly totalXp: number;
  readonly level: number;
  readonly currentStreak: number;
  readonly longestStreak: number;
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null;
}

/** Lee el JSON guardado; `null` si falta o no tiene la forma esperada (nunca lanza). */
export function parseServerState(json: string | null): ServerState | null {
  if (json === null) return null;
  try {
    const root: unknown = JSON.parse(json);
    if (root === null || typeof root !== 'object') return null;
    const st = (root as { state?: unknown }).state;
    if (st === null || typeof st !== 'object') return null;
    const g = st as Record<string, unknown>;
    const totalXp = num(g.total_xp);
    const level = num(g.level);
    const currentStreak = num(g.current_streak);
    const longestStreak = num(g.longest_streak);
    if (totalXp === null || level === null || currentStreak === null || longestStreak === null) return null;
    return { totalXp, level, currentStreak, longestStreak };
  } catch {
    return null;
  }
}
