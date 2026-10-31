export interface VisState {
  readonly paused: boolean;
  readonly lowRun: number;
  readonly highRun: number;
}

export const VIS_PAUSE_BELOW = 0.65;
export const VIS_RESUME_AT = 0.7;
const PAUSE_FRAMES = 3;
const RESUME_FRAMES = 5;

export function createVisState(): VisState {
  'worklet';
  return { paused: false, lowRun: 0, highRun: 0 };
}

/** Pausa tras 3 cuadros con visibilidad media < 0,65; reanuda tras 5 con >= 0,70 (spec §2). */
export function visibilityStep(
  s: VisState,
  meanVis: number,
  _tMs: number,
): { s: VisState; paused: boolean; event: 'PAUSE' | 'RESUME' | null } {
  'worklet';
  if (!s.paused) {
    const lowRun = meanVis < VIS_PAUSE_BELOW ? s.lowRun + 1 : 0;
    if (lowRun >= PAUSE_FRAMES) return { s: { paused: true, lowRun: 0, highRun: 0 }, paused: true, event: 'PAUSE' };
    return { s: { ...s, lowRun }, paused: false, event: null };
  }
  const highRun = meanVis >= VIS_RESUME_AT ? s.highRun + 1 : 0;
  if (highRun >= RESUME_FRAMES) return { s: { paused: false, lowRun: 0, highRun: 0 }, paused: false, event: 'RESUME' };
  return { s: { ...s, highRun }, paused: true, event: null };
}
