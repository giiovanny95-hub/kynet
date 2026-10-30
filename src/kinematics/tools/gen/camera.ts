/**
 * Proyección estenopeica para los generadores de frente (plan vista-frontal F1.1). Solo herramienta de tests.
 *
 * Mundo en metros: `x` a la derecha de la cámara, `y` hacia arriba desde el suelo, `z` desde la cámara hacia la
 * persona. La cámara está en `(0, heightM, 0)` mirando a +z, inclinada `pitchDeg` (positivo = hacia arriba).
 * El cuerpo se construye centrado en `(0, ·, 0)` y se coloca a `distanceM`, girado `yawDeg` sobre la vertical
 * (0 = de frente a la cámara).
 * `fovDeg` es el campo de visión **vertical** del cuadro de 480×640 en vertical [H: no medido en los teléfonos].
 */
export interface CameraSpec {
  readonly heightM: number;
  readonly distanceM: number;
  readonly pitchDeg?: number;
  readonly fovDeg?: number;
  readonly yawDeg?: number;
}

export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export const CAM_W = 480;
export const CAM_H = 640;
const DEFAULT_FOV_DEG = 75;
const DEG = Math.PI / 180;

/** Punto del cuerpo (coordenadas propias, `z` hacia la cámara negativo) a coordenadas del mundo. */
export function placeBody(p: Vec3, cam: CameraSpec): Vec3 {
  const yaw = (cam.yawDeg ?? 0) * DEG;
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return { x: p.x * c + p.z * s, y: p.y, z: cam.distanceM - p.x * s + p.z * c };
}

/**
 * Proyecta un punto del mundo a coordenadas normalizadas del cuadro (`x` entre 0 y 1 del ancho, `y` entre 0 y 1
 * del alto, hacia abajo), como las da MediaPipe. `null` si queda detrás de la cámara.
 */
export function project(world: Vec3, cam: CameraSpec): { x: number; y: number } | null {
  const pitch = (cam.pitchDeg ?? 0) * DEG;
  const dy = world.y - cam.heightM;
  // Rotación de la cámara sobre su eje x: con pitch positivo mira hacia arriba.
  const yc = dy * Math.cos(pitch) - world.z * Math.sin(pitch);
  const zc = dy * Math.sin(pitch) + world.z * Math.cos(pitch);
  if (zc <= 1e-6) return null;
  const f = CAM_H / 2 / Math.tan(((cam.fovDeg ?? DEFAULT_FOV_DEG) * DEG) / 2);
  return { x: (CAM_W / 2 + (f * world.x) / zc) / CAM_W, y: (CAM_H / 2 - (f * yc) / zc) / CAM_H };
}
