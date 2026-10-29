import { clamp } from '../math/stats';

/** Inicio calibrado por defecto (`Ttop`) mientras no hay calibración. */
export const DEFAULT_TTOP = 175;
/** Fondo calibrado por defecto (`T`). */
export const DEFAULT_T = 90;

/** Q_rom de sentadilla y flexión (spec §6.1): `thetaF` = extremo logrado, `thetaT` = máximo de la subida. */
export function qRomSquat(thetaF: number, thetaT: number, T: number = DEFAULT_T, Ttop: number = DEFAULT_TTOP): number {
  'worklet';
  const qProf = clamp(1 - Math.max(0, thetaF - T) / 20, 0, 1);
  const qTop = clamp(1 - Math.max(0, Ttop - thetaT) / 15, 0, 1);
  return 0.7 * qProf + 0.3 * qTop;
}

/** Q_rom de jumping jack (spec §6.1). */
export function qRomJJ(alphaPeak: number, rhoFPeak: number, alphaT = 165, rhoFT = 2.0): number {
  'worklet';
  const qArm = clamp(1 - Math.max(0, alphaT - alphaPeak) / 50, 0, 1);
  const qFeet = clamp(1 - Math.max(0, rhoFT - rhoFPeak) / 1.0, 0, 1);
  return 0.5 * qArm + 0.5 * qFeet;
}
