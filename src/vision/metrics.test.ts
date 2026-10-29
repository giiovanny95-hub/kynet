import { describe, expect, it } from 'vitest';
import { createMetrics, droppedFrames, metricsDrop, metricsInference, metricsStep, summarizeMetrics, type FrameMetrics } from './metrics';

function feedInference(samples: readonly number[]): FrameMetrics {
  return samples.reduce((m, ms) => metricsInference(m, ms, true), createMetrics());
}

const repeat = (n: number, ms: number): number[] => Array.from({ length: n }, () => ms);

describe('metricsInference', () => {
  it('95 muestras de 20 ms y 5 de 50 ms dan un p95 de 20 ms', () => {
    expect(summarizeMetrics(feedInference([...repeat(95, 20), ...repeat(5, 50)])).p95InferMs).toBe(20);
  });

  it('90 muestras de 20 ms y 10 de 50 ms dan un p95 de 50 ms', () => {
    expect(summarizeMetrics(feedInference([...repeat(90, 20), ...repeat(10, 50)])).p95InferMs).toBe(50);
  });

  it('solo usa las últimas 300 muestras', () => {
    const m = feedInference([...repeat(100, 1000), ...repeat(300, 20)]);
    expect(m.inferSamples).toHaveLength(300);
    expect(summarizeMetrics(m).p95InferMs).toBe(20);
  });

  it('cuenta los cuadros procesados y los que tenían persona', () => {
    const m = [true, false, true, true].reduce((acc, found) => metricsInference(acc, 10, found), createMetrics());
    expect(summarizeMetrics(m).detectionRate).toBe(0.75);
    expect(summarizeMetrics(m).lastInferMs).toBe(10);
  });

  it('no toca los intervalos ni los descartes', () => {
    const base = feed(repeat(30, 33.333));
    const m = metricsInference(base, 25, true);
    expect(m.intervals).toEqual(base.intervals);
    expect(summarizeMetrics(m).p95IntervalMs).toBe(summarizeMetrics(base).p95IntervalMs);
    expect(droppedFrames(m)).toBe(droppedFrames(base));
  });
});

function feed(intervals: readonly number[], droppedAt: ReadonlySet<number> = new Set()): FrameMetrics {
  let m = createMetrics();
  let t = 1000;
  m = metricsStep(m, t, false);
  intervals.forEach((dt, i) => {
    t += dt;
    m = metricsStep(m, t, droppedAt.has(i));
  });
  return m;
}

describe('metricsStep', () => {
  it('31 cuadros cada 33,3 ms dan unos 30 FPS', () => {
    const { fps } = summarizeMetrics(feed(Array.from({ length: 30 }, () => 33.333)));
    expect(fps).toBeGreaterThanOrEqual(29.5);
    expect(fps).toBeLessThanOrEqual(30.5);
  });

  it('cuenta los cuadros descartados', () => {
    const m = feed(Array.from({ length: 30 }, () => 33.333), new Set([4]));
    expect(m.dropped).toBe(1);
  });

  it('deduce los cuadros perdidos de los huecos entre timestamps (Android no avisa)', () => {
    // 10 cuadros a 33,3 ms, uno a 66,7 ms (1 perdido) y uno a 100 ms (2 perdidos).
    const m = feed([...Array.from({ length: 10 }, () => 33.333), 66.667, 33.333, 100]);
    expect(m.dropped).toBe(0);
    expect(m.inferredDropped).toBe(3);
    expect(droppedFrames(m)).toBe(3);
    expect(summarizeMetrics(m).dropped).toBe(3);
  });

  it('sin huecos no deduce descartes, aunque haya jitter', () => {
    const m = feed(Array.from({ length: 30 }, (_, i) => (i % 2 === 0 ? 30 : 37)));
    expect(m.inferredDropped).toBe(0);
  });

  it('droppedFrames no cuenta dos veces si llegan el aviso y el hueco (iOS)', () => {
    const m = feed([...Array.from({ length: 10 }, () => 33.333), 66.667], new Set([10]));
    expect(m.dropped).toBe(1);
    expect(m.inferredDropped).toBe(1);
    expect(droppedFrames(m)).toBe(1);
  });

  it('el p95 de intervalos refleja el intervalo más lento', () => {
    const { p95IntervalMs } = summarizeMetrics(feed([...Array.from({ length: 9 }, () => 33), 100]));
    expect(p95IntervalMs).toBeGreaterThanOrEqual(33);
    expect(p95IntervalMs).toBeLessThanOrEqual(100);
  });

  it('ignora timestamps repetidos o que retroceden', () => {
    const m = feed(Array.from({ length: 30 }, () => 33.333));
    const after = metricsStep(metricsStep(m, m.lastTMs, false), m.lastTMs - 50, false);
    expect(after).toBe(m);
  });

  it('metricsDrop suma un descarte sin tocar los intervalos', () => {
    const m = feed(Array.from({ length: 30 }, () => 33.333));
    const d = metricsDrop(m);
    expect(d.dropped).toBe(m.dropped + 1);
    expect(d.intervals).toEqual(m.intervals);
  });
});

describe('summarizeMetrics', () => {
  it('sin cuadros da todo en cero', () => {
    expect(summarizeMetrics(createMetrics())).toEqual({
      fps: 0,
      dropped: 0,
      p95IntervalMs: 0,
      p95InferMs: 0,
      lastInferMs: 0,
      detectionRate: 0,
    });
  });
});
