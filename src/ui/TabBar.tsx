import type { LucideIcon } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { haptics } from './haptics';
import { space, tokens, type } from './tokens';
import { useMotion } from './useMotion';

/** Botón de pestaña: icono Lucide (trazo 1,75) y etiqueta; el activo en teal con el icono a escala 1,08. */
export function TabBarButton({ label, Icon, focused, isFocused: _ignored, onPress, ...rest }: { label: string; Icon: LucideIcon; focused: boolean; isFocused?: boolean; onPress?: () => void }) {
  // El foco llega de la ruta activa (el mismo índice que el indicador): `isFocused` de TabTrigger no siempre se propaga.
  const isFocused = focused;
  const m = useMotion();
  const scale = useSharedValue(isFocused === true ? 1.08 : 1);
  useEffect(() => {
    const to = isFocused === true ? 1.08 : 1;
    scale.value = m.reduced ? to : withSpring(to, m.spring.snappy);
  }, [isFocused, m.reduced, m.spring.snappy, scale]);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const color = isFocused === true ? tokens.accent : tokens.muted;
  return (
    <Pressable
      {...rest}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused === true }}
      onPress={() => {
        if (isFocused !== true) haptics.tap();
        onPress?.();
      }}
      style={styles.tab}
    >
      <Animated.View style={animated}>
        <Icon size={24} color={color} strokeWidth={1.75} />
      </Animated.View>
      <Text style={[styles.label, { color }]}>{label}</Text>
    </Pressable>
  );
}

/** Indicador teal bajo la pestaña activa, que se desliza con el muelle `snappy` (spec-diseno §4). */
export function TabIndicator({ index, count }: { index: number; count: number }) {
  const m = useMotion();
  const [width, setWidth] = useState(0);
  const x = useSharedValue(0);
  const slot = count > 0 ? width / count : 0;
  useEffect(() => {
    const to = index * slot;
    x.value = m.reduced || slot === 0 ? to : withSpring(to, m.spring.snappy);
  }, [index, slot, m.reduced, m.spring.snappy, x]);
  const animated = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <View pointerEvents="none" style={styles.indicatorTrack} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {index >= 0 && slot > 0 ? (
        <Animated.View style={[{ width: slot }, animated]}>
          <View style={styles.indicator} />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tab: { flex: 1, alignItems: 'center', gap: space.xs, paddingTop: space.md, paddingBottom: space.sm, minHeight: 48 },
  label: { ...type.labelCaps, letterSpacing: 0.4 },
  indicatorTrack: { position: 'absolute', top: 0, left: 0, right: 0, height: 2 },
  indicator: { alignSelf: 'center', width: 32, height: 2, borderRadius: 1, backgroundColor: tokens.accent },
});
