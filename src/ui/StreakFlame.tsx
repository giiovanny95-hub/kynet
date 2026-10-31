import { Flame } from 'lucide-react-native';
import { useEffect } from 'react';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { tokens } from './tokens';
import { useMotion } from './useMotion';

const PULSE_MS = 800; // ida y vuelta = 1,6 s (spec-diseno §4)

/**
 * Llama de la racha: con la racha viva late suave (escala 1 → 1,06 en bucle). En riesgo, apagada o con "reducir
 * movimiento" queda quieta; en riesgo se pinta en aviso (con texto al lado: el color nunca va solo).
 */
export function StreakFlame({ alive, atRisk = false, size = 24 }: { alive: boolean; atRisk?: boolean; size?: number }) {
  const m = useMotion();
  const scale = useSharedValue(1);
  const pulse = alive && !atRisk && m.loops;
  useEffect(() => {
    if (pulse) scale.value = withRepeat(withTiming(1.06, { duration: PULSE_MS, easing: Easing.inOut(Easing.sin) }), -1, true);
    else {
      cancelAnimation(scale);
      scale.value = 1;
    }
    return () => cancelAnimation(scale);
  }, [pulse, scale]);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const color = !alive ? tokens.muted : atRisk ? tokens.warn : tokens.accent;
  return (
    <Animated.View style={animated} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Flame size={size} color={color} strokeWidth={1.75} />
    </Animated.View>
  );
}
