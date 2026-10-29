import { describe, expect, it } from 'vitest';
import { createMetrics, droppedFrames, metricsDrop, metricsStep, type FrameMetrics } from './metrics';

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
    const m = feed(Array.from({ length: 30 }, () => 33.333));
    expect(m.fps).toBeGreaterThanOrEqual(29.5);
    expect(m.fps).toBeLessThanOrEqual(30.5);
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
    const m = feed([...Array.from({ length: 9 }, () => 33), 100]);
    expect(m.p95IntervalMs).toBeGreaterThanOrEqual(33);
    expect(m.p95IntervalMs).toBeLessThanOrEqual(100);
  });

  it('ignora timestamps repetidos o que retroceden', () => {
    let m = feed(Array.from({ length: 30 }, () => 33.333));
    const before = m.fps;
    m = metricsStep(m, m.lastTMs, false);
    m = metricsStep(m, m.lastTMs - 50, false);
    expect(m.fps).toBe(before);
  });

  it('metricsDrop suma un descarte sin tocar los intervalos', () => {
    const m = feed(Array.from({ length: 30 }, () => 33.333));
    const d = metricsDrop(m);
    expect(d.dropped).toBe(m.dropped + 1);
    expect(d.intervals).toEqual(m.intervals);
  });
});
