import { Canvas, createPicture, Picture, Skia } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { Easing, useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';

import { CONFETTI_MAX_LIFE_MS, confettiParticles, particleAt } from './confettiParticles';
import { tokens } from './tokens';
import { useMotion } from './useMotion';

const COLORS = [tokens.accent, tokens.secondary, tokens.text];

/**
 * Celebración (spec-diseno §4): ~60 partículas durante 1,2 s, solo al subir de nivel o completar las 3 misiones.
 * Una sola imagen de Skia por cuadro. Con "reducir movimiento" no se monta. Nunca sobre la cámara.
 */
export function Confetti({ seed }: { seed: number }) {
  const m = useMotion();
  const { width, height } = useWindowDimensions();
  const particles = useMemo(() => confettiParticles(seed, COLORS), [seed]);
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = 0;
    t.value = withTiming(CONFETTI_MAX_LIFE_MS, { duration: CONFETTI_MAX_LIFE_MS, easing: Easing.linear });
  }, [seed, t]);
  const picture = useDerivedValue(() =>
    createPicture((canvas) => {
      const paint = Skia.Paint();
      for (const p of particles) {
        const s = particleAt(p, t.value);
        if (s.alpha <= 0) continue;
        paint.setColor(Skia.Color(p.color));
        paint.setAlphaf(s.alpha);
        canvas.save();
        canvas.translate(s.x * width, s.y * height);
        canvas.rotate((s.angle * 180) / Math.PI, 0, 0);
        canvas.drawRect(Skia.XYWHRect(-p.size / 2, -p.size / 4, p.size, p.size / 2), paint);
        canvas.restore();
      }
    }),
  );
  if (m.reduced) return null;
  return (
    <Canvas pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Picture picture={picture} />
    </Canvas>
  );
}
