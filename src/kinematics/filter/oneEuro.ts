export interface OneEuroParams {
  readonly fcMin: number;
  readonly beta: number;
  readonly dCutoff: number;
  readonly minTeSec: number;
  readonly maxGapSec: number;
}

/** Parámetros de spec-cinematica §3.3 (unidades de alto de cuadro). */
export const DEFAULT_ONE_EURO: OneEuroParams = { fcMin: 1.5, beta: 8, dCutoff: 1.0, minTeSec: 0.002, maxGapSec: 0.25 };

export interface OneEuroState {
  readonly t: number;
  readonly xRaw: number;
  readonly xHat: number;
  readonly dHat: number;
}

function alpha(te: number, fc: number): number {
  'worklet';
  const tau = 1 / (2 * Math.PI * fc);
  return 1 / (1 + tau / te);
}

/** Un paso del filtro One-Euro para un canal (spec §3.2). */
export function filterStep(s: OneEuroState | null, tSec: number, x: number, p: OneEuroParams): OneEuroState {
  'worklet';
  if (s === null || tSec - s.t > p.maxGapSec) return { t: tSec, xRaw: x, xHat: x, dHat: 0 };
  const te = tSec - s.t;
  if (te < p.minTeSec) return s;
  const dRaw = (x - s.xRaw) / te;
  const dHat = s.dHat + alpha(te, p.dCutoff) * (dRaw - s.dHat);
  const fc = p.fcMin + p.beta * Math.abs(dHat);
  const xHat = s.xHat + alpha(te, fc) * (x - s.xHat);
  return { t: tSec, xRaw: x, xHat, dHat };
}
