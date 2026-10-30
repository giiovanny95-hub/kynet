import type { PropsWithChildren } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useMotion } from './useMotion';

/**
 * Entrada escalonada (spec-diseno §4): aparece subiendo 12 px con `base` y un retraso de 40 ms por posición (hasta el
 * sexto elemento). Con "reducir movimiento" aparece sin animación.
 */
export function StaggerIn({ index, style, children }: PropsWithChildren<{ index: number; style?: StyleProp<ViewStyle> }>) {
  const m = useMotion();
  const entering = m.reduced
    ? undefined
    : FadeInDown.duration(m.duration.base)
        .delay(m.stagger(index))
        .withInitialValues({ opacity: 0, transform: [{ translateY: 12 }] });
  return (
    <Animated.View entering={entering} style={style}>
      {children}
    </Animated.View>
  );
}
