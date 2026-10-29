const OVERLAY_MIN_V = 0.5;

/**
 * Landmarks normalizados (33 × x, y, z, v) a puntos de la vista para dibujar con Skia.
 * El espejo de la vista previa se aplica solo aquí (ver docs/contrato-nativo-cinematica.md).
 *
 * La vista previa llena la vista como `cover`: escala el cuadro hasta cubrirla y recorta lo que sobra.
 * `frameAspect` es ancho / alto del cuadro ya en vertical; sin él los puntos se reparten sobre el ancho
 * de la vista y las extremidades quedan corridas hacia el centro (medido en el Galaxy S26 Ultra).
 */
export function toOverlayPoints(
  flat: Float32Array | undefined,
  width: number,
  height: number,
  mirrorDisplay: boolean,
  frameAspect: number = width / height,
): { x: number; y: number }[] {
  'worklet';
  if (flat === undefined || width <= 0 || height <= 0 || frameAspect <= 0) return [];
  const shownH = Math.max(width / frameAspect, height);
  const shownW = frameAspect * shownH;
  const offsetX = (width - shownW) / 2;
  const offsetY = (height - shownH) / 2;
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i + 3 < flat.length; i += 4) {
    const x = flat[i] ?? 0;
    const y = flat[i + 1] ?? 0;
    const v = flat[i + 3] ?? 0;
    if (v < OVERLAY_MIN_V) continue;
    points.push({ x: (mirrorDisplay ? 1 - x : x) * shownW + offsetX, y: y * shownH + offsetY });
  }
  return points;
}
