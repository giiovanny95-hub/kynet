import type { FrameMeta, Landmark, PoseFrame } from '../../types';
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

/** Flexiones sintéticas de perfil (BlazePose33, cuadro apaisado). */
export function genPushUp(o: GenPushUpOptions): PoseFrame[] {
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
