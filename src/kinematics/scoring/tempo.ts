import { trap } from '../math/stats';

export type ScoredExercise = 'squat' | 'jumpingJack' | 'pushUp';

type Trap = readonly [number, number, number, number];

/** Tablas de spec §6.2: duración total D (s) y razón ida/vuelta r. */
const TEMPO: Readonly<Record<ScoredExercise, { readonly d: Trap; readonly r: Trap | null }>> = {
  squat: { d: [0.9, 1.8, 4.0, 8.0], r: [0.3, 0.8, 2.0, 4.0] },
  jumpingJack: { d: [0.35, 0.6, 1.2, 2.5], r: null },
  pushUp: { d: [0.9, 1.4, 3.5, 7.0], r: [0.3, 0.6, 1.5, 3.0] },
};

/** Q_tempo = f^0,7 · g^0,3 con `g = max(0,3, trap(r))` (g = 1 en jumping jack). */
export function qTempo(exercise: ScoredExercise, tDownS: number, tUpS: number): number {
  'worklet';
  const t = TEMPO[exercise];
  const f = trap(tDownS + tUpS, t.d[0], t.d[1], t.d[2], t.d[3]);
  const g = t.r === null || tUpS <= 0 ? 1 : Math.max(0.3, trap(tDownS / tUpS, t.r[0], t.r[1], t.r[2], t.r[3]));
  return f ** 0.7 * g ** 0.3;
}

/** Meseta `[Dlo, Dhi]` en segundos (spec §6.2): fuera de ella la repetición es rápida o lenta. */
export function tempoPlateau(exercise: ScoredExercise): readonly [number, number] {
  'worklet';
  const d = TEMPO[exercise].d;
  return [d[1], d[2]];
}
