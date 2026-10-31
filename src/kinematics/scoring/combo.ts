import type { Quality } from './quality';

/** Great/Perfect suman, Good mantiene, Miss reinicia; multiplicador min(2, 1 + 0,25·⌊combo/5⌋). */
export function comboStep(c: { readonly combo: number }, q: Quality): { combo: number; mult: number } {
  'worklet';
  const combo = q === 'Miss' ? 0 : q === 'Good' ? c.combo : c.combo + 1;
  return { combo, mult: Math.min(2, 1 + 0.25 * Math.floor(combo / 5)) };
}
