import { describe, expect, it } from 'vitest';
import { runBenchmark } from '../tools/benchmark';

describe('benchmark de conteo con fixtures sintéticos', () => {
  const report = runBenchmark();

  it('cubre sentadilla y jumping jack con varios escenarios', () => {
    expect(report.squat.scenarios).toBeGreaterThanOrEqual(10);
    expect(report.jumpingJack.scenarios).toBeGreaterThanOrEqual(10);
  });

  it('precisión de conteo de 95 % o más en sentadilla y jumping jack', () => {
    expect(report.squat.accuracy).toBeGreaterThanOrEqual(0.95);
    expect(report.jumpingJack.accuracy).toBeGreaterThanOrEqual(0.95);
  });

  it('sin falsos positivos en los escenarios negativos', () => {
    expect(report.squat.falsePositives).toBe(0);
    expect(report.jumpingJack.falsePositives).toBe(0);
  });
});
