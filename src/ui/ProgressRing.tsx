import { Canvas, Path, Skia, SweepGradient, vec } from '@shopify/react-native-skia';
import { useEffect, useMemo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSharedValue, withSpring } from 'react-native-reanimated';

import { ringGeometry, ringPath } from './ring';
import { tokens } from './tokens';
import { useMotion } from './useMotion';

/**
 * Anillo de progreso en Skia (meta del día, objetivo semanal): el círculo completo se recorta con `end`, animado con
 * el muelle `gentle`. El contenido central (cifra, etiqueta) va como hijo.
 */
export function ProgressRing({ progress, size = 96, stroke = 8, children }: { progress: number; size?: number; stroke?: number; children?: ReactNode }) {
  const m = useMotion();
  const { cx, cy, end } = ringGeometry(size, stroke, progress);
  const full = useMemo(() => Skia.Path.MakeFromSVGString(ringPath(size, stroke, 1)), [size, stroke]);
  const shown = useSharedValue(m.reduced ? end : 0);
  useEffect(() => {
    shown.value = m.reduced ? end : withSpring(end, m.spring.gentle);
  }, [end, m.reduced, m.spring.gentle, shown]);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(end * 100) }}
      style={{ width: size, height: size }}
    >
      <Canvas style={StyleSheet.absoluteFill}>
        {full ? <Path path={full} style="stroke" strokeWidth={stroke} color={tokens.surface} /> : null}
        {full ? (
          <Path path={full} style="stroke" strokeWidth={stroke} strokeCap="round" start={0} end={shown}>
            <SweepGradient c={vec(cx, cy)} colors={[tokens.accent, tokens.secondary, tokens.accent]} />
          </Path>
        ) : null}
      </Canvas>
      <View style={styles.center}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
});
