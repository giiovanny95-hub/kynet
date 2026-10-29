import type { Vec2 } from '../types';
import { cross, dot, sub } from './vec';

const RAD_TO_DEG = 180 / Math.PI;

/** Ángulo con signo en el vértice `b`, en grados (−180, 180]. Estable en 0 y 180 (no usa acos). */
export function signedAngle2D(a: Vec2, b: Vec2, c: Vec2): number {
  'worklet';
  const u = sub(a, b);
  const v = sub(c, b);
  return Math.atan2(cross(u, v), dot(u, v)) * RAD_TO_DEG;
}

/** Ángulo sin signo en el vértice `b`, en grados [0, 180]. */
export function angle2D(a: Vec2, b: Vec2, c: Vec2): number {
  'worklet';
  return Math.abs(signedAngle2D(a, b, c));
}
