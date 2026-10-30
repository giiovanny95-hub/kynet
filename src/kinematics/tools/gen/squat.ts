import type { FrameMeta, Landmark, PoseFrame } from '../../types';
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

/** Sentadillas sintéticas en vista lateral (BlazePose33, cuadro vertical 720x1280). */
export function genSquat(o: GenSquatOptions): PoseFrame[] {
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
