import { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';

import { radius, space, tokens, type } from './tokens';
import { useMotion } from './useMotion';

const HOLD_MS = 700;

/**
 * "+XP" que sube 24 px y se desvanece (spec-diseno §4). Se dispara cada vez que cambia `trigger` (por ejemplo, un
 * contador de eventos). Con "reducir movimiento" aparece y desaparece sin moverse.
 */
export function XpToast({ label, trigger }: { label: string; trigger: number }) {
  const m = useMotion();
  const p = useSharedValue(0);
  useEffect(() => {
    if (trigger === 0) return;
    const show = m.duration.emphasis;
    p.value = 0;
    // Sube, se queda visible para poder leerlo y se desvanece. Con "reducir movimiento" las duraciones son 0, pero la
    // espera se mantiene: si no, el aviso se ocultaría en el mismo instante.
    p.value = withSequence(withTiming(1, { duration: show }), withDelay(HOLD_MS, withTiming(2, { duration: m.duration.base })));
  }, [trigger, m.duration.emphasis, m.duration.base, p]);
  const reduced = m.reduced;
  const animated = useAnimatedStyle(() => ({
    opacity: p.value === 0 ? 0 : p.value <= 1 ? 1 : 2 - p.value,
    transform: [{ translateY: reduced ? 0 : -24 * Math.min(1, p.value) }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[styles.toast, animated]} accessibilityLiveRegion="polite">
      <Text style={styles.text}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: { alignSelf: 'center', backgroundColor: tokens.tealSoft, borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: space.xs },
  text: { ...type.labelCaps, color: tokens.accent },
});
