import type { FrameMeta, Landmark, PoseFrame } from '../../types';
import { gaussian, mulberry32 } from './prng';

export interface GenJumpingJackOptions {
  readonly reps: number;
  readonly periodS: number;
  readonly sigma: number;
  readonly seed: number;
  readonly fps: number;
  readonly mode?: 'full' | 'armsOnly' | 'feetOnly';
  /** Grados que le faltan al brazo derecho en el pico (asimetría). */
  readonly asymDeg?: number;
}

const W = 720;
const H = 1280;
const DEG = Math.PI / 180;
const CX = 0.28;
const SHOULDER_HALF = 0.1;
const ARM = 0.25;
const STAND_S = 1;

type P = { x: number; y: number };

/** Esqueleto frontal: `alphaDeg` = brazo respecto a la vertical hacia abajo; `rho` = separación de tobillos / ancho de hombros. */
function skeleton(alphaDeg: number, rho: number, rightLagDeg = 0): Record<number, P> {
  const out: Record<number, P> = {};
  const ankleHalf = (rho * 2 * SHOULDER_HALF) / 2;
  for (const side of [-1, 1] as const) {
    const left = side === -1;
    const a = (left ? alphaDeg : alphaDeg - rightLagDeg) * DEG;
    const sh = { x: CX + side * SHOULDER_HALF, y: 0.35 };
    const wrist = { x: sh.x + side * ARM * Math.sin(a), y: sh.y + ARM * Math.cos(a) };
    const elbow = { x: (sh.x + wrist.x) / 2, y: (sh.y + wrist.y) / 2 };
    const hip = { x: CX + side * 0.07, y: 0.65 };
    const ankle = { x: CX + side * ankleHalf, y: 0.95 };
    const knee = { x: (hip.x + ankle.x) / 2, y: 0.8 };
    // Índices BlazePose33: la izquierda del usuario aparece a la derecha de la imagen; aquí basta con ser consistentes.
    out[left ? 11 : 12] = sh;
    out[left ? 13 : 14] = elbow;
    out[left ? 15 : 16] = wrist;
    out[left ? 23 : 24] = hip;
    out[left ? 25 : 26] = knee;
    out[left ? 27 : 28] = ankle;
    out[left ? 29 : 30] = { x: ankle.x, y: ankle.y + 0.01 };
    out[left ? 31 : 32] = { x: ankle.x, y: ankle.y + 0.03 };
  }
  out[0] = { x: CX, y: 0.22 };
  for (const i of [2, 5, 7, 8]) out[i] = { x: CX + (i <= 2 || i === 7 ? -0.02 : 0.02), y: 0.21 };
  return out;
}

/** Jumping jacks sintéticos en vista frontal (BlazePose33, cuadro vertical 720x1280). */
export function genJumpingJack(o: GenJumpingJackOptions): PoseFrame[] {
  const rng = mulberry32(o.seed);
  const mode = o.mode ?? 'full';
  const totalS = STAND_S + o.reps * o.periodS + 0.5;
  const frames: PoseFrame[] = [];
  for (let i = 0; i < totalS * o.fps; i++) {
    const tMs = (i / o.fps) * 1000;
    const rel = tMs / 1000 - STAND_S;
    const inReps = rel >= 0 && rel < o.reps * o.periodS;
    const open = inReps ? 0.5 - 0.5 * Math.cos((2 * Math.PI * rel) / o.periodS) : 0;
    const alpha = 20 + (mode === 'feetOnly' ? 0 : open * 158);
    const rho = 0.5 + (mode === 'armsOnly' ? 0 : open * 1.6);
    const sk = skeleton(alpha, rho, (o.asymDeg ?? 0) * open);
    const raw: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0, v: 0 }));
    for (const [k, p] of Object.entries(sk)) {
      const xu = p.x + o.sigma * gaussian(rng);
      const yu = p.y + o.sigma * gaussian(rng);
      raw[Number(k)] = { x: xu / (W / H), y: yu, z: 0, v: 0.95 };
    }
    const meta: FrameMeta = { tMs, width: W, height: H, rotation: 0, mirrored: false };
    frames.push({ meta, model: 'blazepose33', raw });
  }
  return frames;
}
