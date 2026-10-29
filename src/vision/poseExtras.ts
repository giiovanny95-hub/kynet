/** 33 landmarks × (x, y, z, v). */
export const POSE_FLOATS = 33 * 4;

export interface PoseExtras {
  /** Marca de tiempo (ms, reloj de la cámara) del cuadro del que sale el resultado. */
  readonly resultTMs: number;
  /** Cuánto más viejo es el resultado que el cuadro actual (0 en modo síncrono). */
  readonly ageMs: number;
  /** Tiempo de inferencia de ese resultado medido en nativo; `null` si el módulo no lo envía. */
  readonly inferMs: number | null;
}

/**
 * Lee los dos valores que el módulo nativo añade tras los landmarks en modo `LIVE_STREAM`
 * (`[132]` antigüedad en ms, `[133]` inferencia en ms; ver docs/contrato-nativo-cinematica.md). Un mismo
 * resultado puede llegar en varios cuadros seguidos: `resultTMs` permite procesarlo una sola vez.
 */
export function readPoseExtras(flat: Float32Array, frameTMs: number): PoseExtras {
  'worklet';
  const rawAge = flat.length > POSE_FLOATS ? flat[POSE_FLOATS] : undefined;
  const ageMs = rawAge !== undefined && Number.isFinite(rawAge) && rawAge > 0 ? rawAge : 0;
  const rawInfer = flat.length > POSE_FLOATS + 1 ? flat[POSE_FLOATS + 1] : undefined;
  const inferMs = rawInfer !== undefined && Number.isFinite(rawInfer) ? rawInfer : null;
  return { resultTMs: frameTMs - ageMs, ageMs, inferMs };
}
