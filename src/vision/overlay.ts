const OVERLAY_MIN_V = 0.5;

/**
 * Puntos de BlazePose33 que no se dibujan: orejas (7, 8) y meñique, índice y pulgar (17-22). Pose no rastrea
 * dedos y las orejas las estima: en el S26 Ultra, con lite y full, los de la mano caen en la palma y las orejas a
 * la altura de los ojos. La cinemática no los usa (decisión del usuario, 2026-10-29).
 */
const HIDDEN_POINTS: ReadonlySet<number> = new Set([7, 8, 17, 18, 19, 20, 21, 22]);

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
    if (v < OVERLAY_MIN_V || HIDDEN_POINTS.has(i / 4)) continue;
    points.push({ x: (mirrorDisplay ? 1 - x : x) * shownW + offsetX, y: y * shownH + offsetY });
  }
  return points;
}

/** Huesos de BlazePose33 que dibuja el esqueleto (hombros, brazos, tronco y piernas). */
export const BLAZEPOSE_BONES: readonly (readonly [number, number])[] = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [24, 26], [26, 28], [27, 31], [28, 32],
];

/**
 * Como `toOverlayPoints`, pero devuelve los dos extremos de cada hueso con ambos puntos visibles,
 * en pares consecutivos (para `Points` de Skia en modo `lines`).
 */
export function toOverlayBones(
  flat: Float32Array | undefined,
  width: number,
  height: number,
  mirrorDisplay: boolean,
  frameAspect: number,
  bones: readonly (readonly [number, number])[] = BLAZEPOSE_BONES,
): { x: number; y: number }[] {
  'worklet';
  if (flat === undefined || width <= 0 || height <= 0 || frameAspect <= 0) return [];
  const shownH = Math.max(width / frameAspect, height);
  const shownW = frameAspect * shownH;
  const offsetX = (width - shownW) / 2;
  const offsetY = (height - shownH) / 2;
  const at = (i: number): { x: number; y: number } | null => {
    if ((flat[i * 4 + 3] ?? 0) < OVERLAY_MIN_V) return null;
    const x = flat[i * 4] ?? 0;
    return { x: (mirrorDisplay ? 1 - x : x) * shownW + offsetX, y: (flat[i * 4 + 1] ?? 0) * shownH + offsetY };
  };
  const out: { x: number; y: number }[] = [];
  for (const [a, b] of bones) {
    const pa = at(a);
    const pb = at(b);
    if (pa && pb) out.push(pa, pb);
  }
  return out;
}
