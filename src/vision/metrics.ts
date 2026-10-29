/** Métricas de cuadros de cámara. Puras y serializables para usarlas dentro de un worklet. */
export interface FrameMetrics {
  readonly fps: number;
  readonly dropped: number;
  readonly p95IntervalMs: number;
  readonly lastTMs: number;
  /** Últimos intervalos entre cuadros, como máximo `MAX_INTERVALS`. */
  readonly intervals: readonly number[];
}

const MAX_INTERVALS = 300;
const FPS_WINDOW_MS = 1000;

export function createMetrics(): FrameMetrics {
  'worklet';
  return { fps: 0, dropped: 0, p95IntervalMs: 0, lastTMs: Number.NEGATIVE_INFINITY, intervals: [] };
}

function percentile95(values: readonly number[]): number {
  'worklet';
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(0.95 * sorted.length) - 1);
  return sorted[index] ?? 0;
}

function fpsFromIntervals(intervals: readonly number[]): number {
  'worklet';
  let total = 0;
  let count = 0;
  for (let i = intervals.length - 1; i >= 0 && total < FPS_WINDOW_MS; i--) {
    total += intervals[i] ?? 0;
    count++;
  }
  return total > 0 ? (count * 1000) / total : 0;
}

export function metricsStep(m: FrameMetrics, tMs: number, dropped: boolean): FrameMetrics {
  'worklet';
  if (!(tMs > m.lastTMs)) return m;
  const droppedCount = m.dropped + (dropped ? 1 : 0);
  if (!Number.isFinite(m.lastTMs)) return { ...m, lastTMs: tMs, dropped: droppedCount };
  const intervals = [...m.intervals, tMs - m.lastTMs].slice(-MAX_INTERVALS);
  return {
    fps: fpsFromIntervals(intervals),
    dropped: droppedCount,
    p95IntervalMs: percentile95(intervals),
    lastTMs: tMs,
    intervals,
  };
}

/** Cuadro descartado por la cámara (`onFrameDropped`): no hay timestamp, solo se cuenta. */
export function metricsDrop(m: FrameMetrics): FrameMetrics {
  'worklet';
  return { ...m, dropped: m.dropped + 1 };
}
