import type { FrameMeta, Landmark, PoseFrame } from '../../types';
import { CAM_H, CAM_W, placeBody, project, type CameraSpec, type Vec3 } from './camera';
import { gaussian, mulberry32 } from './prng';

export interface GenPushUpOptions {
  readonly reps: number;
  readonly bottomsDeg: number | readonly number[];
  readonly periodS: number;
  readonly sigma: number;
  readonly seed: number;
  readonly fps: number;
  /** Desviación de la cadera respecto a la línea hombro–tobillo (θb ≈ 180 − |dev|): negativa = caída, positiva = elevada. */
  readonly hipDeviationDeg?: number;
  /** Persona de pie flexionando los codos (no es una flexión). */
  readonly standing?: boolean;
  readonly standS?: number;
  /**
   * Con cámara, flexión de frente vista desde el suelo (F1.3): esqueleto 3D en metros proyectado. `distanceM` es la
   * distancia de la cámara a las manos y `heightM` la de la lente sobre el suelo (0,05-0,3 m).
   */
  readonly camera?: CameraSpec;
  /** Solo con `camera`: apertura de los codos respecto al plano sagital del brazo (0 = pegados, 90 = en cruz). */
  readonly elbowFlareDeg?: number;
  /** Solo con `camera`: la cabeza cae hacia el suelo estos grados en el fondo, proporcional a la profundidad. */
  readonly headDropDeg?: number;
  /** Solo con `camera`: cadera caída o elevada (grados respecto a la línea hombro–tobillo). Para el spike F6. */
  readonly hipSagDeg?: number;
  readonly hipPikeDeg?: number;
  /** Solo con `camera`: segundos quieto en plancha antes de las repeticiones (sustituye a `standS`). */
  readonly plankHoldS?: number;
  /** Solo con `camera`: al terminar se levanta (1,5 s de transición y 1 s de pie). */
  readonly standUpAfter?: boolean;
}

// Móvil de lado en horizontal: cuadro apaisado 1280x720 (ancho = 1,78 altos de cuadro).
const W = 1280;
const H = 720;
const UPPER_ARM = 0.18;
const FOREARM = 0.17;
const FLOOR_Y = 0.85;
const WRIST_X = 1.25;
const BODY = 0.95;
const TOP_DEG = 172;
const DEG = Math.PI / 180;

type P = { x: number; y: number };

/** Ángulo de codo en el instante t (coseno entre arriba y el fondo de cada repetición). */
function elbowAt(t: number, o: GenPushUpOptions): number {
  const rel = t - (o.standS ?? 1);
  if (rel < 0 || rel >= o.reps * o.periodS) return TOP_DEG;
  const rep = Math.floor(rel / o.periodS);
  const phase = (rel - rep * o.periodS) / o.periodS;
  const bottom = typeof o.bottomsDeg === 'number' ? o.bottomsDeg : (o.bottomsDeg[rep] ?? TOP_DEG);
  return TOP_DEG - (TOP_DEG - bottom) * (0.5 - 0.5 * Math.cos(2 * Math.PI * phase));
}

/** Plancha de perfil mirando a la derecha: muñeca en el suelo, hombro sobre la muñeca, tobillo atrás. */
function plank(elbowDeg: number, devDeg: number): Record<string, P> {
  const d = Math.sqrt(UPPER_ARM ** 2 + FOREARM ** 2 - 2 * UPPER_ARM * FOREARM * Math.cos(elbowDeg * DEG));
  const wrist = { x: WRIST_X, y: FLOOR_Y };
  const shoulder = { x: WRIST_X, y: FLOOR_Y - d };
  // Codo: intersección de circunferencias, hacia los pies.
  const p = (FOREARM ** 2 - UPPER_ARM ** 2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, FOREARM ** 2 - p * p));
  const elbow = { x: WRIST_X - h, y: FLOOR_Y - p };
  const ankle = { x: WRIST_X - BODY, y: FLOOR_Y - 0.03 };
  const len = Math.hypot(ankle.x - shoulder.x, ankle.y - shoulder.y);
  const u = { x: (ankle.x - shoulder.x) / len, y: (ankle.y - shoulder.y) / len };
  const down = u.x < 0 ? { x: u.y, y: -u.x } : { x: -u.y, y: u.x };
  const l1 = 0.37 * len;
  const l2 = len - l1;
  // Desplazamiento perpendicular que da θb ≈ 180 − |dev| (aproximación de ángulo pequeño).
  const off = (Math.abs(devDeg) * DEG) / (1 / l1 + 1 / l2);
  const sign = devDeg < 0 ? 1 : -1;
  const hip = { x: shoulder.x + u.x * l1 + down.x * off * sign, y: shoulder.y + u.y * l1 + down.y * off * sign };
  const knee = { x: (hip.x + ankle.x) / 2, y: (hip.y + ankle.y) / 2 };
  const head = { x: shoulder.x + 0.12, y: shoulder.y - 0.02 };
  return { wrist, shoulder, elbow, ankle, hip, knee, head, heel: { x: ankle.x - 0.02, y: ankle.y - 0.03 }, toe: { x: ankle.x + 0.02, y: FLOOR_Y } };
}

/** De pie, de perfil, flexionando los codos hacia delante. */
function standing(elbowDeg: number): Record<string, P> {
  const shoulder = { x: 0.9, y: 0.22 };
  const elbow = { x: 0.9, y: shoulder.y + UPPER_ARM };
  const phi = (180 - elbowDeg) * DEG;
  const wrist = { x: elbow.x + FOREARM * Math.sin(phi), y: elbow.y + FOREARM * Math.cos(phi) };
  const hip = { x: 0.9, y: 0.56 };
  const knee = { x: 0.91, y: 0.76 };
  const ankle = { x: 0.9, y: 0.95 };
  return { shoulder, elbow, wrist, hip, knee, ankle, head: { x: 0.92, y: 0.1 }, heel: { x: 0.88, y: 0.96 }, toe: { x: 0.96, y: 0.96 } };
}

const PARTS: ReadonlyArray<readonly [string, number, number]> = [
  ['head', 0, 0], ['head', 2, 0], ['head', 5, -0.01], ['head', 7, 0], ['head', 8, -0.01],
  ['shoulder', 11, 0], ['shoulder', 12, -0.01], ['elbow', 13, 0], ['elbow', 14, -0.01],
  ['wrist', 15, 0], ['wrist', 16, -0.01], ['hip', 23, 0], ['hip', 24, -0.01],
  ['knee', 25, 0], ['knee', 26, -0.01], ['ankle', 27, 0], ['ankle', 28, -0.01],
  ['heel', 29, 0], ['heel', 30, -0.01], ['toe', 31, 0], ['toe', 32, -0.01],
];

// Esqueleto 3D de la flexión de frente, en metros [H].
const M_UPPER_ARM = 0.3;
const M_FOREARM = 0.28;
const M_SHOULDER_HALF = 0.19;
const M_WRIST_HALF = 0.24;
const M_TORSO = 0.52;
const M_LEGS = 0.9;
const M_NECK = 0.22;
const HEAD_UP_DEG = 10;
const STAND_UP_S = 1.5;
const STAND_HOLD_S = 1;

type Body3D = Record<string, readonly [Vec3, Vec3]>;

/** Plancha de frente: cabeza hacia la cámara (`-z`), manos en `z = 0` (se colocan a `distanceM`), pies en `+z`. */
function plank3D(elbowDeg: number, o: GenPushUpOptions, depth: number): Body3D {
  const sh = Math.sqrt(M_UPPER_ARM ** 2 + M_FOREARM ** 2 - 2 * M_UPPER_ARM * M_FOREARM * Math.cos(elbowDeg * DEG));
  // Codo: en el plano que contiene la vertical muñeca–hombro, girado hacia fuera `flare` desde atrás (+z).
  const p = (M_FOREARM ** 2 - M_UPPER_ARM ** 2 + sh * sh) / (2 * sh);
  const h = Math.sqrt(Math.max(0, M_FOREARM ** 2 - p * p));
  const fl = (o.elbowFlareDeg ?? 0) * DEG;
  const ankle = { y: 0.08, z: M_TORSO + M_LEGS };
  const len = Math.hypot(ankle.z, sh - ankle.y);
  const dev = ((o.hipPikeDeg ?? 0) - (o.hipSagDeg ?? 0)) * DEG;
  const l1 = (M_TORSO / (M_TORSO + M_LEGS)) * len;
  const off = dev / (1 / l1 + 1 / (len - l1));
  const t = l1 / len;
  const hip = { y: sh + (ankle.y - sh) * t + off, z: ankle.z * t };
  const drop = (o.headDropDeg ?? 0) * depth * DEG;
  const nose = { y: sh + M_NECK * Math.sin(HEAD_UP_DEG * DEG - drop), z: -M_NECK * Math.cos(HEAD_UP_DEG * DEG - drop) };
  const pair = (half: number, y: number, z: number): readonly [Vec3, Vec3] => [{ x: half, y, z }, { x: -half, y, z }];
  const ex = M_SHOULDER_HALF + (M_WRIST_HALF - M_SHOULDER_HALF) * (p / sh) + h * Math.sin(fl);
  return {
    wrist: pair(M_WRIST_HALF, 0.03, 0),
    shoulder: pair(M_SHOULDER_HALF, sh, 0),
    elbow: pair(ex, p, h * Math.cos(fl)),
    hip: pair(0.15, hip.y, hip.z),
    knee: pair(0.13, (hip.y + ankle.y) / 2, (hip.z + ankle.z) / 2),
    ankle: pair(0.12, ankle.y, ankle.z),
    heel: pair(0.12, ankle.y + 0.04, ankle.z + 0.05),
    toe: pair(0.12, 0.02, ankle.z - 0.08),
    eye: pair(0.03, nose.y + 0.03, nose.z + 0.02),
    nose: pair(0, nose.y, nose.z),
  };
}

/** De pie junto a la posición de las manos, mirando a la cámara. */
function standing3D(): Body3D {
  const pair = (half: number, y: number, z: number): readonly [Vec3, Vec3] => [{ x: half, y, z }, { x: -half, y, z }];
  return {
    wrist: pair(0.24, 0.85, 0.5), shoulder: pair(0.19, 1.45, 0.5), elbow: pair(0.22, 1.15, 0.5),
    hip: pair(0.15, 0.95, 0.5), knee: pair(0.13, 0.5, 0.5), ankle: pair(0.12, 0.08, 0.5),
    heel: pair(0.12, 0.04, 0.55), toe: pair(0.12, 0.02, 0.4), eye: pair(0.03, 1.66, 0.45), nose: pair(0, 1.63, 0.42),
  };
}

const lerpBody = (a: Body3D, b: Body3D, k: number): Body3D => {
  const out: Record<string, readonly [Vec3, Vec3]> = {};
  const mix = (p: Vec3, q: Vec3): Vec3 => ({ x: p.x + (q.x - p.x) * k, y: p.y + (q.y - p.y) * k, z: p.z + (q.z - p.z) * k });
  for (const key of Object.keys(a)) {
    const pa = a[key];
    const pb = b[key];
    if (pa && pb) out[key] = [mix(pa[0], pb[0]), mix(pa[1], pb[1])];
  }
  return out;
};

// [parte, índice izquierdo, índice derecho]; la nariz (0) es única.
const PARTS3D: ReadonlyArray<readonly [string, number, number]> = [
  ['eye', 2, 5], ['shoulder', 11, 12], ['elbow', 13, 14], ['wrist', 15, 16], ['hip', 23, 24],
  ['knee', 25, 26], ['ankle', 27, 28], ['heel', 29, 30], ['toe', 31, 32],
];
// Tapados por el torso desde el suelo: MediaPipe los da con visibilidad baja [H].
const OCCLUDED = new Set(['hip', 'knee', 'ankle', 'heel', 'toe']);

function genPushUp3D(o: GenPushUpOptions, cam: CameraSpec): PoseFrame[] {
  const rng = mulberry32(o.seed);
  const hold = o.plankHoldS ?? o.standS ?? 1;
  const repsEnd = hold + o.reps * o.periodS;
  const totalS = repsEnd + (o.standUpAfter ? STAND_UP_S + STAND_HOLD_S : 0.5);
  const opts: GenPushUpOptions = { ...o, standS: hold };
  const frames: PoseFrame[] = [];
  for (let i = 0; i < totalS * o.fps; i++) {
    const tMs = (i / o.fps) * 1000;
    const elbowDeg = elbowAt(tMs / 1000, opts);
    const depth = Math.min(1, Math.max(0, (TOP_DEG - elbowDeg) / (TOP_DEG - 90)));
    let body = plank3D(elbowDeg, o, depth);
    const up = o.standUpAfter ? Math.min(1, Math.max(0, (tMs / 1000 - repsEnd) / STAND_UP_S)) : 0;
    if (up > 0) body = lerpBody(body, standing3D(), up);
    const raw: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0, v: 0 }));
    const put = (idx: number, pt: Vec3, v: number) => {
      const q = project(placeBody(pt, cam), cam);
      if (q === null) return;
      raw[idx] = { x: q.x + (o.sigma * gaussian(rng) * CAM_H) / CAM_W, y: q.y + o.sigma * gaussian(rng), z: 0, v };
    };
    for (const [part, li, ri] of PARTS3D) {
      const pr = body[part];
      if (!pr) continue;
      const v = OCCLUDED.has(part) && up < 0.5 ? 0.4 : 0.95;
      put(li, pr[0], v);
      put(ri, pr[1], v);
    }
    const nose = body.nose;
    if (nose) put(0, nose[0], 0.95);
    const meta: FrameMeta = { tMs, width: CAM_W, height: CAM_H, rotation: 0, mirrored: false };
    frames.push({ meta, model: 'blazepose33', raw });
  }
  return frames;
}

/** Flexiones sintéticas de perfil (BlazePose33, cuadro apaisado); con `camera`, de frente desde el suelo. */
export function genPushUp(o: GenPushUpOptions): PoseFrame[] {
  if (o.camera) return genPushUp3D(o, o.camera);
  const rng = mulberry32(o.seed);
  const totalS = (o.standS ?? 1) + o.reps * o.periodS + 0.5;
  const frames: PoseFrame[] = [];
  for (let i = 0; i < totalS * o.fps; i++) {
    const tMs = (i / o.fps) * 1000;
    const elbowDeg = elbowAt(tMs / 1000, o);
    const sk = o.standing ? standing(elbowDeg) : plank(elbowDeg, o.hipDeviationDeg ?? 0);
    const raw: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0, v: 0 }));
    for (const [part, idx, dx] of PARTS) {
      const p = sk[part];
      if (!p) continue;
      const xu = p.x + dx + o.sigma * gaussian(rng);
      const yu = p.y + o.sigma * gaussian(rng);
      raw[idx] = { x: xu / (W / H), y: yu, z: 0, v: 0.95 };
    }
    const meta: FrameMeta = { tMs, width: W, height: H, rotation: 0, mirrored: false };
    frames.push({ meta, model: 'blazepose33', raw });
  }
  return frames;
}
