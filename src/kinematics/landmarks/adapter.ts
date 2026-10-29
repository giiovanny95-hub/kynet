import type { JointId, Landmark, ModelSpec, Pose, PoseFrame } from '../types';

const MIN_COORD = -0.5;
const MAX_COORD = 1.5;

/** Convierte el arreglo plano del modelo en landmarks (x, y, z, v) normalizados. */
export function fromFlat(p: readonly number[], spec: ModelSpec): Landmark[] {
  'worklet';
  const stride = spec.layout === 'yxs' ? 3 : 4;
  if (p.length !== spec.count * stride) {
    throw new RangeError(`Se esperaban ${spec.count * stride} valores para ${spec.id} y llegaron ${p.length}`);
  }
  const out: Landmark[] = [];
  for (let i = 0; i < spec.count; i++) {
    const o = i * stride;
    if (spec.layout === 'yxs') {
      out.push({ x: p[o + 1] ?? 0, y: p[o] ?? 0, z: 0, v: p[o + 2] ?? 0 });
    } else {
      out.push({ x: p[o] ?? 0, y: p[o + 1] ?? 0, z: p[o + 2] ?? 0, v: p[o + 3] ?? 0 });
    }
  }
  return out;
}

const MIRROR: Readonly<Partial<Record<JointId, JointId>>> = {
  lEye: 'rEye', rEye: 'lEye', lEar: 'rEar', rEar: 'lEar',
  lShoulder: 'rShoulder', rShoulder: 'lShoulder', lElbow: 'rElbow', rElbow: 'lElbow',
  lWrist: 'rWrist', rWrist: 'lWrist', lHip: 'rHip', rHip: 'lHip',
  lKnee: 'rKnee', rKnee: 'lKnee', lAnkle: 'rAnkle', rAnkle: 'lAnkle',
  lHeel: 'rHeel', rHeel: 'lHeel', lFootIndex: 'rFootIndex', rFootIndex: 'lFootIndex',
};

function isValidCoord(c: number): boolean {
  'worklet';
  return Number.isFinite(c) && c >= MIN_COORD && c <= MAX_COORD;
}

function rotate(x: number, y: number, rotation: 0 | 90 | 180 | 270): readonly [number, number] {
  'worklet';
  switch (rotation) {
    case 90: return [1 - y, x];
    case 180: return [1 - x, 1 - y];
    case 270: return [y, 1 - x];
    default: return [x, y];
  }
}

function midpoint(a: Landmark | undefined, b: Landmark | undefined): { x: number; y: number } | null {
  'worklet';
  if (!a || !b || a.v === 0 || b.v === 0) return null;
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/**
 * Lleva un cuadro del modelo a una pose en orientación vertical del usuario y en
 * unidades de alto de cuadro (`x' = x·W/H`), aplicando rotación y espejo.
 */
export function toPose(frame: PoseFrame, spec: ModelSpec): Pose {
  'worklet';
  const { width, height, rotation, mirrored } = frame.meta;
  const scale = width / height;
  const joints: Partial<Record<JointId, Landmark>> = {};
  for (const id of Object.keys(spec.index) as JointId[]) {
    const i = spec.index[id];
    const raw = i === undefined ? undefined : frame.raw[i];
    if (!raw) continue;
    const valid = isValidCoord(raw.x) && isValidCoord(raw.y);
    const [ux, uy] = valid ? rotate(raw.x, raw.y, rotation) : [0, 0];
    const mx = mirrored ? 1 - ux : ux;
    const target = mirrored ? (MIRROR[id] ?? id) : id;
    joints[target] = {
      x: mx * scale,
      y: uy,
      z: Number.isFinite(raw.z) ? raw.z * scale : 0,
      v: valid && Number.isFinite(raw.v) ? raw.v : 0,
    };
  }
  const shoulders = midpoint(joints.lShoulder, joints.rShoulder);
  const hips = midpoint(joints.lHip, joints.rHip);
  const torso = shoulders && hips ? Math.hypot(shoulders.x - hips.x, shoulders.y - hips.y) : null;
  return { tMs: frame.meta.tMs, joints, torso };
}
