import { describe, expect, it } from 'vitest';
import type { FrameMeta } from '@/kinematics/types';
import { toPoseFrame } from './poseEstimator';

const META: FrameMeta = { tMs: 10, width: 480, height: 640, rotation: 0, mirrored: true };

describe('toPoseFrame', () => {
  it('conserva el orden BlazePose: el índice 25 es la rodilla izquierda', () => {
    const flat = new Float32Array(132);
    flat.set([0.25, 0.75, -0.5, 0.5], 25 * 4);
    const frame = toPoseFrame(flat, META);
    expect(frame.model).toBe('blazepose33');
    expect(frame.raw).toHaveLength(33);
    expect(frame.raw[25]).toEqual({ x: 0.25, y: 0.75, z: -0.5, v: 0.5 });
    expect(frame.meta).toBe(META);
  });

  it('rechaza un tamaño distinto de 132', () => {
    expect(() => toPoseFrame(new Float32Array(131), META)).toThrow(RangeError);
  });

  it('sin persona (undefined) devuelve un cuadro vacío con visibilidad 0', () => {
    const frame = toPoseFrame(undefined, META);
    expect(frame.raw).toHaveLength(33);
    expect(frame.raw.every((lm) => lm.v === 0)).toBe(true);
  });
});
