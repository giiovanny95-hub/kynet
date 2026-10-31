import type { FrameMeta, Landmark, PoseFrame } from '../../types';
import { CAM_H, CAM_W, placeBody, project, type CameraSpec, type Vec3 } from './camera';
import { gaussian, mulberry32 } from './prng';

export interface GenSquatOptions {
  readonly reps: number;
  readonly bottomsDeg: readonly number[] | number;
  readonly periodS: number;
  readonly sigma: number;
  readonly seed: number;
  readonly fps: number;
  readonly jitterMs?: number;
  /** Segundos de pie antes de la primera repetición (y 0,5 s al final). */
  readonly standS?: number;
  /** Inclinación extra del tronco (grados) en el fondo, proporcional a la profundidad. */
  readonly trunkLeanDeg?: number;
  /** Guiñada del cuerpo respecto a la cámara: 90 = de perfil (por defecto), 0 = de frente. */
  readonly yawDeg?: number;
  /** Subida del talón en el fondo (fracción del alto del cuadro), proporcional a la profundidad. */
  readonly heelLiftFrac?: number;
  /** Visibilidad de los talones (por defecto 0,95, como el resto). */
  readonly heelV?: number;
  /** Visibilidad de los talones de pie y al iniciar la flexión (profundidad < 30 %, antes de que la FSM entre en la bajada); por defecto la de `heelV`. */
  readonly heelVStanding?: number;
  /** El talón empieza a subir estos ms antes que la rodilla (por defecto 0: a la vez). */
  readonly heelLeadMs?: number;
  /** Con cámara, el esqueleto se construye en 3D (metros) y se proyecta (vista de frente, F1.2). */
  readonly camera?: CameraSpec;
  /** Solo con `camera`: fracción en que se cierra la separación de las rodillas en el fondo (rodillas hacia dentro). */
  readonly kneesInFrac?: number;
  /** Solo con `camera`: durante `standS` la persona se acerca hasta 0,8 m y ahí se agacha (ronda 2 de B3). */
  readonly approachCamera?: boolean;
}

const W = 720;
const H = 1280;
const SHANK = 0.145;
const THIGH = 0.15;
const TORSO = 0.3;
const TOP_DEG = 172;
const DEG = Math.PI / 180;

type P = { x: number; y: number };

/** Esqueleto lateral 2D en unidades de alto de cuadro para un ángulo de rodilla dado. */
function skeleton(kneeDeg: number, extraLeanRad = 0): Record<string, P> {
  const s = ((180 - kneeDeg) / 2) * DEG;
  const ankle = { x: 0.25, y: 0.9 };
  const knee = { x: ankle.x + SHANK * Math.sin(s), y: ankle.y - SHANK * Math.cos(s) };
  const hip = { x: knee.x - THIGH * Math.sin(s), y: knee.y - THIGH * Math.cos(s) };
  const lean = s * 0.6 + extraLeanRad;
  const shoulder = { x: hip.x + TORSO * Math.sin(lean), y: hip.y - TORSO * Math.cos(lean) };
  const elbow = { x: shoulder.x + 0.02, y: shoulder.y + 0.12 };
  const wrist = { x: elbow.x + 0.02, y: elbow.y + 0.11 };
  const head = { x: shoulder.x + 0.03, y: shoulder.y - 0.1 };
  const heel = { x: ankle.x - 0.03, y: ankle.y + 0.01 };
  const toe = { x: ankle.x + 0.07, y: ankle.y + 0.01 };
  return { ankle, knee, hip, shoulder, elbow, wrist, head, heel, toe };
}

// Índices BlazePose33 por parte del cuerpo; el lado derecho queda 0,01 más atrás (vista lateral).
const PARTS: ReadonlyArray<readonly [string, number, number]> = [
  ['head', 0, 0], ['head', 2, 0], ['head', 5, -0.01], ['head', 7, 0], ['head', 8, -0.01],
  ['shoulder', 11, 0], ['shoulder', 12, -0.01], ['elbow', 13, 0], ['elbow', 14, -0.01],
  ['wrist', 15, 0], ['wrist', 16, -0.01], ['hip', 23, 0], ['hip', 24, -0.01],
  ['knee', 25, 0], ['knee', 26, -0.01], ['ankle', 27, 0], ['ankle', 28, -0.01],
  ['heel', 29, 0], ['heel', 30, -0.01], ['toe', 31, 0], ['toe', 32, -0.01],
];

/** Ángulo de rodilla en el instante t (coseno entre arriba y el fondo de cada repetición). */
function kneeAt(t: number, o: GenSquatOptions): number {
  const stand = o.standS ?? 1;
  const rel = t - stand;
  if (rel < 0 || rel >= o.reps * o.periodS) return TOP_DEG;
  const rep = Math.floor(rel / o.periodS);
  const phase = (rel - rep * o.periodS) / o.periodS;
  const bottom = typeof o.bottomsDeg === 'number' ? o.bottomsDeg : (o.bottomsDeg[rep] ?? TOP_DEG);
  return TOP_DEG - (TOP_DEG - bottom) * (0.5 - 0.5 * Math.cos(2 * Math.PI * phase));
}

// Esqueleto 3D en metros [H]: pierna y tronco de un adulto de ~1,75 m; anchos de la spec vista-frontal (F1.2).
const M_SHANK = 0.43;
const M_THIGH = 0.45;
const M_TORSO = 0.52;
const M_ANKLE_Y = 0.08;
const M_SHOULDER_HALF = 0.19;
const M_HIP_HALF = 0.15;
const M_FOOT_HALF = 0.15;
const APPROACH_M = 0.8;

/**
 * Esqueleto 3D en coordenadas del cuerpo (`x` a la izquierda de la persona = derecha de la cámara, `y` arriba,
 * `z` negativo hacia delante). Mismo plano sagital que `skeleton`: lo que allí es "delante" aquí es `-z`.
 */
function skeleton3D(kneeDeg: number, extraLeanRad: number, kneesIn: number): Record<string, readonly [Vec3, Vec3]> {
  const s = ((180 - kneeDeg) / 2) * DEG;
  const lean = s * 0.6 + extraLeanRad;
  const kneeZ = -M_SHANK * Math.sin(s);
  const kneeY = M_ANKLE_Y + M_SHANK * Math.cos(s);
  const hipZ = kneeZ + M_THIGH * Math.sin(s);
  const hipY = kneeY + M_THIGH * Math.cos(s);
  const shZ = hipZ - M_TORSO * Math.sin(lean);
  const shY = hipY + M_TORSO * Math.cos(lean);
  const pair = (half: number, y: number, z: number): readonly [Vec3, Vec3] => [
    { x: half, y, z },
    { x: -half, y, z },
  ];
  const kneeHalf = M_FOOT_HALF * (1 - kneesIn);
  return {
    ankle: pair(M_FOOT_HALF, M_ANKLE_Y, 0),
    heel: pair(M_FOOT_HALF, M_ANKLE_Y - 0.03, 0.07),
    toe: pair(M_FOOT_HALF + 0.03, M_ANKLE_Y - 0.06, -0.18),
    knee: pair(kneeHalf, kneeY, kneeZ),
    hip: pair(M_HIP_HALF, hipY, hipZ),
    shoulder: pair(M_SHOULDER_HALF, shY, shZ),
    elbow: pair(M_SHOULDER_HALF + 0.03, shY - 0.28, shZ - 0.05),
    wrist: pair(M_SHOULDER_HALF + 0.04, shY - 0.52, shZ - 0.1),
    head: pair(0.04, shY + 0.25, shZ - 0.08),
  };
}

// BlazePose33 por parte: [parte, índice izquierdo, índice derecho]. La nariz (0) va en el centro.
const PARTS3D: ReadonlyArray<readonly [string, number, number]> = [
  ['head', 2, 5], ['head', 7, 8], ['shoulder', 11, 12], ['elbow', 13, 14], ['wrist', 15, 16],
  ['hip', 23, 24], ['knee', 25, 26], ['ankle', 27, 28], ['heel', 29, 30], ['toe', 31, 32],
];

function genSquat3D(o: GenSquatOptions, cam0: CameraSpec): PoseFrame[] {
  const rng = mulberry32(o.seed);
  const stand = o.standS ?? 1;
  const totalS = stand + o.reps * o.periodS + 0.5;
  const frames: PoseFrame[] = [];
  let lastT = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < totalS * o.fps; i++) {
    const tIdeal = (i / o.fps) * 1000;
    const jitter = o.jitterMs ? (rng() * 2 - 1) * o.jitterMs : 0;
    const tMs = Math.max(lastT + 1, tIdeal + jitter);
    lastT = tMs;
    const knee = kneeAt(tMs / 1000, o);
    const depth = Math.min(1, Math.max(0, (TOP_DEG - knee) / (TOP_DEG - 90)));
    const walk = o.approachCamera ? Math.min(1, tMs / 1000 / stand) : 0;
    const cam: CameraSpec = { ...cam0, distanceM: cam0.distanceM + (APPROACH_M - cam0.distanceM) * walk };
    const sk = skeleton3D(knee, (o.trunkLeanDeg ?? 0) * depth * DEG, (o.kneesInFrac ?? 0) * depth);
    const raw: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0, v: 0 }));
    const put = (idx: number, p: Vec3) => {
      const q = project(placeBody(p, cam), cam);
      if (q === null) return;
      raw[idx] = { x: q.x + (o.sigma * gaussian(rng) * CAM_H) / CAM_W, y: q.y + o.sigma * gaussian(rng), z: 0, v: 0.95 };
    };
    for (const [part, li, ri] of PARTS3D) {
      const pr = sk[part];
      if (!pr) continue;
      put(li, pr[0]);
      put(ri, pr[1]);
    }
    const head = sk.head;
    if (head) put(0, { x: 0, y: head[0].y - 0.03, z: head[0].z - 0.05 });
    const meta: FrameMeta = { tMs, width: CAM_W, height: CAM_H, rotation: 0, mirrored: false };
    frames.push({ meta, model: 'blazepose33', raw });
  }
  return frames;
}

/** Sentadillas sintéticas en vista lateral (BlazePose33, cuadro vertical 720x1280); con `camera`, en 3D proyectado. */
export function genSquat(o: GenSquatOptions): PoseFrame[] {
  if (o.camera) return genSquat3D(o, o.camera);
  const rng = mulberry32(o.seed);
  const totalS = (o.standS ?? 1) + o.reps * o.periodS + 0.5;
  const frames: PoseFrame[] = [];
  let lastT = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < totalS * o.fps; i++) {
    const tIdeal = (i / o.fps) * 1000;
    const jitter = o.jitterMs ? (rng() * 2 - 1) * o.jitterMs : 0;
    const tMs = Math.max(lastT + 1, tIdeal + jitter);
    lastT = tMs;
    const knee = kneeAt(tMs / 1000, o);
    const depth = Math.min(1, Math.max(0, (TOP_DEG - knee) / (TOP_DEG - 90)));
    const sk = skeleton(knee, (o.trunkLeanDeg ?? 0) * depth * DEG);
    const kneeLead = kneeAt((tMs + (o.heelLeadMs ?? 0)) / 1000, o);
    const heelDepth = Math.min(1, Math.max(0, (TOP_DEG - kneeLead) / (TOP_DEG - 90)));
    const heel = sk.heel;
    if (heel) sk.heel = { x: heel.x, y: heel.y - (o.heelLiftFrac ?? 0) * Math.max(depth, heelDepth) };
    const heelV = depth < 0.3 ? (o.heelVStanding ?? o.heelV ?? 0.95) : (o.heelV ?? 0.95);
    const raw: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0, v: 0 }));
    for (const [part, idx, dx] of PARTS) {
      const p = sk[part];
      if (!p) continue;
      // De frente, los lados se separan un ancho de hombros (0,24) en total.
      const spread = (dx < 0 ? -0.12 : 0.12) * Math.cos((o.yawDeg ?? 90) * DEG);
      const xu = p.x + dx + spread + o.sigma * gaussian(rng);
      const yu = p.y + o.sigma * gaussian(rng);
      raw[idx] = { x: xu / (W / H), y: yu, z: 0, v: part === 'heel' ? heelV : 0.95 };
    }
    const meta: FrameMeta = { tMs, width: W, height: H, rotation: 0, mirrored: false };
    frames.push({ meta, model: 'blazepose33', raw });
  }
  return frames;
}
