/**
 * Métricas de cuadros de cámara. Puras y serializables para usarlas dentro de un worklet.
 *
 * El estado por cuadro (`FrameMetrics`) solo acumula muestras; los percentiles se calculan aparte con
 * `summarizeMetrics`, unas pocas veces por segundo. Ordenar dos ventanas de 300 muestras y copiar el objeto
 * entre hilos en cada cuadro costaba ~7 FPS en el Galaxy S26 Ultra (medido en el Paso C).
 */
export interface FrameMetrics {
  readonly dropped: number;
  /**
   * Cuadros perdidos deducidos de los huecos entre timestamps. En Android, VisionCamera 5 nunca llama a
   * `onFrameDropped` (CameraX no lo expone), así que `dropped` se queda en 0 aunque se pierdan cuadros.
   */
  readonly inferredDropped: number;
  readonly lastTMs: number;
  /** Últimos intervalos entre cuadros, como máximo `MAX_SAMPLES`. */
  readonly intervals: readonly number[];
  /** Últimas duraciones de `detect()` en ms, como máximo `MAX_SAMPLES`. */
  readonly inferSamples: readonly number[];
  /** Cuadros con `detect()` medido y, de ellos, con persona detectada. */
  readonly processed: number;
  readonly detected: number;
}

/** Lo que muestra el HUD; se calcula fuera del camino de cada cuadro. */
export interface MetricsSummary {
  readonly fps: number;
  readonly dropped: number;
  /**
   * p95 del intervalo entre cuadros **procesados**. A 30 FPS está cuantizado (33,3, 66,7, 100 ms…): con
   * más de un 5 % de descartes sale 66,7 ms aunque la inferencia sea rápida. No es la latencia.
   */
  readonly p95IntervalMs: number;
  /** p95 de la duración de `detect()` en ms: la cifra del criterio "p95 < 33 ms" de la parte 1. */
  readonly p95InferMs: number;
  readonly lastInferMs: number;
  /** Cuadros con persona detectada sobre el total procesado. */
  readonly detectionRate: number;
}

const MAX_SAMPLES = 300;
const FPS_WINDOW_MS = 1000;

export function createMetrics(): FrameMetrics {
  'worklet';
  return {
    dropped: 0,
    inferredDropped: 0,
    lastTMs: Number.NEGATIVE_INFINITY,
    intervals: [],
    inferSamples: [],
    processed: 0,
    detected: 0,
  };
}

/** Descartes del mejor contador disponible: el explícito (iOS) o el deducido de los huecos (Android). */
export function droppedFrames(m: FrameMetrics): number {
  'worklet';
  return Math.max(m.dropped, m.inferredDropped);
}

/**
 * Cuadros que faltan dentro de un intervalo, tomando como periodo de la cámara el intervalo más corto
 * reciente (se adapta solo si la política térmica baja los FPS). Un intervalo de 2 periodos = 1 perdido.
 */
function missingFrames(interval: number, previous: readonly number[]): number {
  'worklet';
  if (previous.length === 0) return 0;
  const period = Math.min(...previous, interval);
  if (!(period > 0)) return 0;
  return Math.max(0, Math.round(interval / period) - 1);
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
  const interval = tMs - m.lastTMs;
  return {
    ...m,
    dropped: droppedCount,
    inferredDropped: m.inferredDropped + missingFrames(interval, m.intervals),
    lastTMs: tMs,
    intervals: [...m.intervals, interval].slice(-MAX_SAMPLES),
  };
}

/** Registra la duración de una llamada a `detect()` y si encontró a una persona. */
export function metricsInference(m: FrameMetrics, ms: number, detected: boolean): FrameMetrics {
  'worklet';
  if (!Number.isFinite(ms) || ms < 0) return m;
  return {
    ...m,
    inferSamples: [...m.inferSamples, ms].slice(-MAX_SAMPLES),
    processed: m.processed + 1,
    detected: m.detected + (detected ? 1 : 0),
  };
}

/** Cuadro descartado por la cámara (`onFrameDropped`): no hay timestamp, solo se cuenta. */
export function metricsDrop(m: FrameMetrics): FrameMetrics {
  'worklet';
  return { ...m, dropped: m.dropped + 1 };
}

/** Resumen para el HUD. Ordena las ventanas, así que no debe llamarse en cada cuadro. */
export function summarizeMetrics(m: FrameMetrics): MetricsSummary {
  'worklet';
  return {
    fps: fpsFromIntervals(m.intervals),
    dropped: droppedFrames(m),
    p95IntervalMs: percentile95(m.intervals),
    p95InferMs: percentile95(m.inferSamples),
    lastInferMs: m.inferSamples[m.inferSamples.length - 1] ?? 0,
    detectionRate: m.processed > 0 ? m.detected / m.processed : 0,
  };
}
