import type { PropsWithChildren } from 'react';
import type { AccessibilityRole, AccessibilityState, StyleProp, ViewStyle } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { haptics } from './haptics';
import { useMotion } from './useMotion';

interface Props {
  readonly onPress: () => void;
  readonly disabled?: boolean;
  readonly style?: StyleProp<ViewStyle>;
  /** Vibración `tap` al pulsar (controles principales). */
  readonly haptic?: boolean;
  readonly accessibilityRole?: AccessibilityRole;
  readonly accessibilityLabel?: string;
  readonly accessibilityState?: AccessibilityState;
}

/** Al pulsar: escala 0,98 y opacidad 0,9; vuelve con el muelle `snappy` (tema.md). Sin animación con "reducir movimiento". */
export function PressableScale({ children, onPress, disabled = false, style, haptic = false, ...a11y }: PropsWithChildren<Props>) {
  const m = useMotion();
  const pressed = useSharedValue(0);
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - 0.02 * pressed.value }],
    opacity: 1 - 0.1 * pressed.value,
  }));
  const to = (v: number) => {
    pressed.value = m.reduced ? v : withSpring(v, m.spring.snappy);
  };
  return (
    <Pressable
      accessibilityRole={a11y.accessibilityRole ?? 'button'}
      accessibilityLabel={a11y.accessibilityLabel}
      accessibilityState={{ disabled, ...a11y.accessibilityState }}
      disabled={disabled}
      onPressIn={() => to(1)}
      onPressOut={() => to(0)}
      onPress={() => {
        if (haptic) haptics.tap();
        onPress();
      }}
    >
      <Animated.View style={[style, animated]}>{children}</Animated.View>
    </Pressable>
  );
}
