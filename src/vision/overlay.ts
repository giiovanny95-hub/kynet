const OVERLAY_MIN_V = 0.5;

/**
 * Landmarks normalizados (33 × x, y, z, v) a puntos de la vista para dibujar con Skia.
 * El espejo de la vista previa se aplica solo aquí (ver docs/contrato-nativo-cinematica.md).
 */
export function toOverlayPoints(flat: Float32Array | undefined, width: number, height: number, mirrorDisplay: boolean): { x: number; y: number }[] {
  'worklet';
  if (flat === undefined) return [];
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i + 3 < flat.length; i += 4) {
    const x = flat[i] ?? 0;
    const y = flat[i + 1] ?? 0;
    const v = flat[i + 3] ?? 0;
    if (v < OVERLAY_MIN_V) continue;
    points.push({ x: (mirrorDisplay ? 1 - x : x) * width, y: y * height });
  }
  return points;
}
