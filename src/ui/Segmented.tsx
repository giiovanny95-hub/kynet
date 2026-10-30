import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { haptics } from './haptics';
import { radius, space, tokens, type } from './tokens';
import { useMotion } from './useMotion';

/** Control segmentado (semana / mes / 3 meses): el fondo activo se desliza con `snappy` entre opciones. */
export function Segmented<K extends string>({ options, value, onChange }: { options: readonly { key: K; label: string }[]; value: K; onChange: (k: K) => void }) {
  const m = useMotion();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.key === value));
  const slot = options.length > 0 ? (width - 2 * PAD) / options.length : 0;
  const x = useSharedValue(0);
  useEffect(() => {
    const to = index * slot;
    x.value = m.reduced || slot <= 0 ? to : withSpring(to, m.spring.snappy);
  }, [index, slot, m.reduced, m.spring.snappy, x]);
  const animated = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <View accessibilityRole="tablist" style={styles.root} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {slot > 0 ? <Animated.View style={[styles.thumb, { width: slot }, animated]} /> : null}
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => {
              if (!on) {
                haptics.tap();
                onChange(o.key);
              }
            }}
            style={styles.option}
          >
            <Text style={[styles.label, { color: on ? tokens.accent : tokens.muted }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const PAD = 4;

const styles = StyleSheet.create({
  root: { flexDirection: 'row', padding: PAD, borderRadius: radius.control, backgroundColor: tokens.card, borderWidth: 1, borderColor: tokens.border },
  thumb: { position: 'absolute', top: PAD, bottom: PAD, left: PAD, borderRadius: radius.control - PAD, backgroundColor: tokens.surface },
  option: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.sm },
  label: { ...type.bodySm, fontFamily: type.titleSm.fontFamily },
});
