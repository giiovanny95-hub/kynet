export function clamp(x: number, lo: number, hi: number): number {
  'worklet';
  return Math.min(hi, Math.max(lo, x));
}

export function median(xs: readonly number[]): number {
  'worklet';
  if (xs.length === 0) throw new RangeError('median de una lista vacía');
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? (s[m] ?? 0) : ((s[m - 1] ?? 0) + (s[m] ?? 0)) / 2;
}

/** Trapecio: 0 fuera de (mn, mx), rampa mn→lo, 1 en [lo, hi], rampa hi→mx. */
export function trap(x: number, mn: number, lo: number, hi: number, mx: number): number {
  'worklet';
  if (x <= mn || x >= mx) return 0;
  if (x < lo) return (x - mn) / (lo - mn);
  if (x <= hi) return 1;
  return (mx - x) / (mx - hi);
}
