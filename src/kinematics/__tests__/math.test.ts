import { describe, expect, it } from 'vitest';
import { angle2D, signedAngle2D } from '../math/angle';
import { clamp, median, trap } from '../math/stats';

describe('angle2D', () => {
  it('ángulo recto da 90', () => {
    expect(angle2D({ x: 1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 })).toBeCloseTo(90, 9);
  });
  it('colineales opuestos dan 180', () => {
    expect(angle2D({ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 })).toBeCloseTo(180, 9);
  });
  it('mismo lado da 0', () => {
    expect(angle2D({ x: 1, y: 0 }, { x: 0, y: 0 }, { x: 2, y: 0 })).toBeCloseTo(0, 9);
  });
  it('signedAngle2D cambia de signo al reflejar c', () => {
    const a = { x: 1, y: 0 };
    const b = { x: 0, y: 0 };
    const up = signedAngle2D(a, b, { x: 0, y: 1 });
    const down = signedAngle2D(a, b, { x: 0, y: -1 });
    expect(up).toBeCloseTo(-down, 9);
    expect(Math.abs(up)).toBeCloseTo(90, 9);
  });
});

describe('stats', () => {
  it('median', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(() => median([])).toThrow(RangeError);
  });
  it('clamp', () => {
    expect(clamp(5, 0, 1)).toBe(1);
    expect(clamp(-1, 0, 1)).toBe(0);
    expect(clamp(0.4, 0, 1)).toBe(0.4);
  });
  it('trap (tempo de sentadilla 0.9, 1.8, 4, 8)', () => {
    expect(trap(1.8, 0.9, 1.8, 4, 8)).toBe(1);
    expect(trap(0.9, 0.9, 1.8, 4, 8)).toBe(0);
    expect(trap(1.35, 0.9, 1.8, 4, 8)).toBeCloseTo(0.5, 9);
    expect(trap(6, 0.9, 1.8, 4, 8)).toBeCloseTo(0.5, 9);
    expect(trap(9, 0.9, 1.8, 4, 8)).toBe(0);
  });
});
