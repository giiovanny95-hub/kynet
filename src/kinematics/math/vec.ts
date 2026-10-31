import type { Vec2 } from '../types';

export function sub(a: Vec2, b: Vec2): Vec2 {
  'worklet';
  return { x: a.x - b.x, y: a.y - b.y };
}

export function dot(a: Vec2, b: Vec2): number {
  'worklet';
  return a.x * b.x + a.y * b.y;
}

export function cross(a: Vec2, b: Vec2): number {
  'worklet';
  return a.x * b.y - a.y * b.x;
}

export function dist(a: Vec2, b: Vec2): number {
  'worklet';
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function mid(a: Vec2, b: Vec2): Vec2 {
  'worklet';
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}
