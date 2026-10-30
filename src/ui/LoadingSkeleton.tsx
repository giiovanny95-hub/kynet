import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View, type DimensionValue } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { radius, space, tokens } from './tokens';
import { useMotion } from './useMotion';

const SHIMMER_MS = 1200;

/** Bloque gris de carga con un brillo que lo recorre (spec-diseno §4); sin bucle con "reducir movimiento". */
export function SkeletonBlock({ height, width = '100%', round = radius.control }: { height: number; width?: DimensionValue; round?: number }) {
  const m = useMotion();
  const [w, setW] = useState(0);
  const x = useSharedValue(0);
  useEffect(() => {
    if (!m.loops || w === 0) return;
    x.value = 0;
    x.value = withRepeat(withTiming(1, { duration: SHIMMER_MS, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(x);
  }, [m.loops, w, x]);
  const animated = useAnimatedStyle(() => ({ transform: [{ translateX: -w + x.value * 2 * w }] }));
  return (
    <View style={[styles.block, { height, width, borderRadius: round }]} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {m.loops && w > 0 ? (
        <Animated.View style={[StyleSheet.absoluteFill, animated]}>
          <LinearGradient colors={['transparent', tokens.border, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
        </Animated.View>
      ) : null}
    </View>
  );
}

/** Esqueleto de una pestaña mientras carga sus datos: título y tres tarjetas. */
export function LoadingSkeleton() {
  const { t } = useTranslation();
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={t('common.loading')} style={styles.screen}>
      <SkeletonBlock height={32} width="45%" />
      <SkeletonBlock height={120} round={radius.card} />
      <SkeletonBlock height={96} round={radius.card} />
      <SkeletonBlock height={160} round={radius.card} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.bg, padding: space.lg, paddingTop: 56, gap: space.md },
  block: { backgroundColor: tokens.card, overflow: 'hidden' },
});
