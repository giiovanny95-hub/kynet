export type Quality = 'Miss' | 'Good' | 'Great' | 'Perfect';

/** P_form = max(0,5, Π(1 − p_i)); p_i = 0,10 falta suave leve, 0,25 grave. */
export function pForm(penalties: readonly number[]): number {
  'worklet';
  return Math.max(0.5, penalties.reduce((acc, p) => acc * (1 - p), 1));
}

/** Q = (0,6·Q_rom + 0,4·Q_tempo) · P_form (spec §6.3). */
export function repQ(qRom: number, qTempo: number, pf: number): number {
  'worklet';
  return (0.6 * qRom + 0.4 * qTempo) * pf;
}

/** Cortes alineados con el XP (ronda 4): Miss < 0,50 ≤ Good < 0,80 ≤ Great < 0,90 ≤ Perfect (sin faltas suaves). */
export function quality(q: number, softFaults: number): Quality {
  'worklet';
  if (q < 0.5) return 'Miss';
  if (q < 0.8) return 'Good';
  if (q < 0.9 || softFaults > 0) return 'Great';
  return 'Perfect';
}

/** Puntuación de forma 0-100 que se guarda por repetición. */
export function formScore(q: number): number {
  'worklet';
  return Math.round(100 * Math.min(1, Math.max(0, q)));
}
