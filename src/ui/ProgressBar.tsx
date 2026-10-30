import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { tokens } from './tokens';
import { useMotion } from './useMotion';

/** Barra de progreso: relleno con degradado teal → deep teal que crece con el muelle `gentle` al montar y al cambiar. */
export function ProgressBar({ value, max, height = 8 }: { value: number; max: number; height?: number }) {
  const m = useMotion();
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const fill = useSharedValue(m.reduced ? pct : 0);
  useEffect(() => {
    fill.value = m.reduced ? pct : withSpring(pct, m.spring.gentle);
  }, [pct, m.reduced, m.spring.gentle, fill]);
  const animated = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
      style={[styles.track, { height, borderRadius: height / 2 }]}
    >
      <Animated.View style={[styles.fill, animated]}>
        <LinearGradient colors={[tokens.accent, tokens.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { backgroundColor: tokens.surface, overflow: 'hidden' },
  fill: { height: '100%' },
});
