/**
 * Política térmica (spec-arquitectura §7): 30 FPS normal, 25 en MODERATE, 20 en SEVERE, pausa en CRITICAL.
 * Bajar es inmediato; subir exige 30 s estables en el nivel nuevo. Estados de `PowerManager`:
 * 0 NONE, 1 LIGHT, 2 MODERATE, 3 SEVERE, 4 CRITICAL, 5 EMERGENCY, 6 SHUTDOWN; -1 = no disponible (Android < 10).
 */

export type TargetFps = 30 | 25 | 20 | 0;

export interface ThermalState {
  readonly fps: TargetFps;
  /** Nivel más alto al que se quiere subir y desde cuándo se mantiene. */
  readonly candidate: TargetFps | null;
  readonly candidateSinceMs: number;
}

const RAISE_AFTER_MS = 30_000;

export function createThermal(): ThermalState {
  'worklet';
  return { fps: 30, candidate: null, candidateSinceMs: 0 };
}

export function fpsForStatus(status: number): TargetFps {
  'worklet';
  if (status >= 4) return 0;
  if (status === 3) return 20;
  if (status === 2) return 25;
  return 30;
}

export function thermalStep(s: ThermalState, status: number, nowMs: number): { s: ThermalState; targetFps: TargetFps; changed: boolean } {
  'worklet';
  const want = fpsForStatus(status);
  if (want < s.fps) return { s: { fps: want, candidate: null, candidateSinceMs: nowMs }, targetFps: want, changed: true };
  if (want === s.fps) return { s: { ...s, candidate: null }, targetFps: s.fps, changed: false };
  if (s.candidate !== want) return { s: { ...s, candidate: want, candidateSinceMs: nowMs }, targetFps: s.fps, changed: false };
  if (nowMs - s.candidateSinceMs >= RAISE_AFTER_MS) return { s: { fps: want, candidate: null, candidateSinceMs: nowMs }, targetFps: want, changed: true };
  return { s, targetFps: s.fps, changed: false };
}

/**
 * Descarte de cuadros por tiempo: procesa el cuadro si llega a su turno (`nextDueMs`, con 2 ms de margen).
 * El turno avanza un periodo cada vez, así 30 → 20 FPS deja pasar 2 de cada 3; tras un hueco se reinicia sin ráfaga.
 */
export function frameGate(nextDueMs: number, tMs: number, targetFps: number): { process: boolean; nextDueMs: number } {
  'worklet';
  if (targetFps <= 0) return { process: false, nextDueMs };
  const period = 1000 / targetFps;
  if (tMs < nextDueMs - 2) return { process: false, nextDueMs };
  const next = tMs - nextDueMs > period ? tMs + period : nextDueMs + period;
  return { process: true, nextDueMs: next };
}
