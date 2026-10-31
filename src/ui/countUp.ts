/** Curva `standard` de la spec aproximada con una cúbica de salida: rápida al principio y suave al llegar. */
function easeOut(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return 1 - (1 - c) ** 3;
}

/**
 * Valor entero que muestra `AnimatedNumber` en el instante `progress` (0 a 1) al ir de `from` a `to`. Siempre entero,
 * monótono en la dirección del cambio, y exacto en los extremos.
 */
export function countUpValue(from: number, to: number, progress: number): number {
  if (progress >= 1) return Math.round(to);
  if (progress <= 0) return Math.round(from);
  const v = from + (to - from) * easeOut(progress);
  return to >= from ? Math.floor(v) : Math.ceil(v);
}
