/** Geometría pura del `ProgressRing` (spec-diseno §4), probada sin Skia. */
export interface RingGeometry {
  /** Centro y radio del trazo, en px del lienzo. */
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
  /** Fracción del círculo dibujada (0 = nada, 1 = completo), recortada a [0, 1]. */
  readonly end: number;
}

export function ringGeometry(size: number, stroke: number, progress: number): RingGeometry {
  const end = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0;
  return { cx: size / 2, cy: size / 2, r: Math.max(0, (size - stroke) / 2), end };
}

/**
 * Trazo SVG del anillo empezando arriba (−90°) y en sentido horario: vacío con 0 y círculo completo con 1. Skia lo
 * lee con `Skia.Path.MakeFromSVGString`.
 */
export function ringPath(size: number, stroke: number, progress: number): string {
  const { cx, cy, r, end } = ringGeometry(size, stroke, progress);
  if (end <= 0 || r <= 0) return '';
  if (end >= 1) return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx} ${cy + r} A ${r} ${r} 0 1 1 ${cx} ${cy - r}`;
  const a = -Math.PI / 2 + end * 2 * Math.PI;
  const x = cx + r * Math.cos(a);
  const y = cy + r * Math.sin(a);
  return `M ${cx} ${cy - r} A ${r} ${r} 0 ${end > 0.5 ? 1 : 0} 1 ${x.toFixed(3)} ${y.toFixed(3)}`;
}
