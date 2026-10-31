import { useMemo } from 'react';
import { Easing, useReducedMotion, type EasingFunction } from 'react-native-reanimated';

import { CURVES, motionTokens, type MotionTokens } from './motion';

const EASING: { readonly standard: EasingFunction; readonly exit: EasingFunction } = {
  standard: Easing.bezier(...CURVES.standard).factory(),
  exit: Easing.bezier(...CURVES.exit).factory(),
};

/** Tokens de movimiento según el ajuste "reducir movimiento" del sistema, con las curvas listas para Reanimated. */
export function useMotion(): MotionTokens & { readonly easing: typeof EASING } {
  const reduced = useReducedMotion();
  return useMemo(() => ({ ...motionTokens(reduced), easing: EASING }), [reduced]);
}
