import type { EngineExercise } from '@/kinematics/engine';
import type { PoseFrame } from '@/kinematics/types';

/**
 * Grabación de landmarks para fixtures reales (solo desarrollo; spec-cinematica §8). Nunca guarda imagen
 * ni se sube a un servidor: el JSON se comparte desde el teléfono de desarrollo.
 * `appendFrame` añade en el sitio (corre en el hilo de cámara y copiar 900 cuadros por cuadro sería caro).
 */
export interface Recording {
  readonly frames: { t: number; p: number[] }[];
  width: number;
  height: number;
  model: PoseFrame['model'];
}

export function createRecording(): Recording {
  'worklet';
  return { frames: [], width: 0, height: 0, model: 'blazepose33' };
}

const round4 = (x: number): number => {
  'worklet';
  return Math.round(x * 1e4) / 1e4;
};

export function appendFrame(rec: Recording, frame: PoseFrame): Recording {
  'worklet';
  const p: number[] = [];
  for (const lm of frame.raw) p.push(round4(lm.x), round4(lm.y), round4(lm.z), round4(lm.v));
  rec.frames.push({ t: Math.round(frame.meta.tMs * 10) / 10, p });
  rec.width = frame.meta.width;
  rec.height = frame.meta.height;
  rec.model = frame.model;
  return rec;
}

export function toFixtureJson(rec: Recording, labels: { readonly exercise: EngineExercise; readonly realReps: number }): string {
  'worklet';
  const n = rec.frames.length;
  const first = rec.frames[0];
  const last = rec.frames[n - 1];
  const fps = n > 1 && first && last && last.t > first.t ? ((n - 1) * 1000) / (last.t - first.t) : 0;
  return JSON.stringify({
    schemaVersion: 1,
    exercise: labels.exercise,
    model: rec.model,
    view: labels.exercise === 'jumpingJack' ? 'frontal' : 'lateral',
    fps,
    width: rec.width,
    height: rec.height,
    meta: { notes: 'grabado en dispositivo; conteo a mano en labels.realReps' },
    frames: rec.frames,
    labels: { realReps: labels.realReps },
  });
}
