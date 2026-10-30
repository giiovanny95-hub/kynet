/** Sincronización al enfocar una pantalla: como mucho una vez cada 30 s (al cambiar de pestaña se ve lo de otro teléfono). */
export const FOCUS_SYNC_GAP_MS = 30_000;

/** `true` si ya pasó el intervalo mínimo desde la última vez (o nunca se hizo). */
export function syncDue(lastMs: number | null, nowMs: number, gapMs: number = FOCUS_SYNC_GAP_MS): boolean {
  return lastMs === null || nowMs - lastMs >= gapMs || nowMs < lastMs;
}
