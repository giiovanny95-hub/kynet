import { StyleSheet, View } from 'react-native';

import { tokens } from './tokens';

const SIZE = 72;
const TICK = 8;

/** Logotipo con radar de la bienvenida (Stitch `05-bienvenida`), sin resplandor: el sistema prohíbe sombras. */
export function RadarMark() {
  return (
    <View style={styles.outer} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[styles.tick, styles.top]} />
      <View style={[styles.tick, styles.bottom]} />
      <View style={[styles.tickH, styles.left]} />
      <View style={[styles.tickH, styles.right]} />
      <View style={styles.inner}>
        <View style={styles.dot} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderWidth: 1, borderColor: tokens.border, backgroundColor: tokens.card, alignItems: 'center', justifyContent: 'center' },
  inner: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: tokens.accent, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: tokens.accent },
  tick: { position: 'absolute', left: SIZE / 2 - 1, width: 1, height: TICK, backgroundColor: tokens.muted },
  tickH: { position: 'absolute', top: SIZE / 2 - 1, height: 1, width: TICK, backgroundColor: tokens.muted },
  top: { top: 4 },
  bottom: { bottom: 4 },
  left: { left: 4 },
  right: { right: 4 },
});
