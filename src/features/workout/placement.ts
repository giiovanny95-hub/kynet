/**
 * Arranque sin tocar el teléfono (benchmark 2026-10-29; producto §3.3): bien colocado 1,5 s → cuenta atrás de 3 s
 * con un tick por segundo → `go`. Salir del encuadre más de 0,5 s durante la cuenta vuelve a la colocación.
 */

export type PlacementPhase = 'placing' | 'countdown' | 'go';
export type PlacementTick = 3 | 2 | 1 | 'go';

export interface PlacementState {
  readonly phase: PlacementPhase;
  readonly okSinceMs: number | null;
  readonly badSinceMs: number | null;
  readonly countdownStartMs: number | null;
  readonly lastTick: PlacementTick | null;
}

export const PLACED_MS = 1500;
export const COUNTDOWN_MS = 3000;
export const CANCEL_AFTER_MS = 500;

export function createPlacement(): PlacementState {
  return { phase: 'placing', okSinceMs: null, badSinceMs: null, countdownStartMs: null, lastTick: null };
}

function tickAt(elapsedMs: number): PlacementTick {
  if (elapsedMs >= COUNTDOWN_MS) return 'go';
  return elapsedMs < 1000 ? 3 : elapsedMs < 2000 ? 2 : 1;
}

/** `ok` = el motor no está en pausa y hay persona. */
export function placementStep(s: PlacementState, ok: boolean, nowMs: number): { s: PlacementState; tick: PlacementTick | null } {
  if (s.phase === 'go') return { s, tick: null };
  if (s.phase === 'placing') {
    const okSinceMs = ok ? (s.okSinceMs ?? nowMs) : null;
    if (okSinceMs === null || nowMs - okSinceMs < PLACED_MS) return { s: { ...s, okSinceMs }, tick: null };
    return { s: { phase: 'countdown', okSinceMs, badSinceMs: null, countdownStartMs: nowMs, lastTick: 3 }, tick: 3 };
  }
  const badSinceMs = ok ? null : (s.badSinceMs ?? nowMs);
  if (badSinceMs !== null && nowMs - badSinceMs > CANCEL_AFTER_MS) return { s: createPlacement(), tick: null };
  const tick = tickAt(nowMs - (s.countdownStartMs ?? nowMs));
  const next: PlacementState = { ...s, badSinceMs, lastTick: tick, phase: tick === 'go' ? 'go' : 'countdown' };
  return { s: next, tick: tick === s.lastTick ? null : tick };
}
