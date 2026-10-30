import { useEffect, useRef, useState } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';

import { countUpValue } from './countUp';
import { useMotion } from './useMotion';

/**
 * Cifra que cuenta desde el valor anterior hasta el nuevo en `emphasis` (spec-diseno §4), con dígitos tabulares para
 * que no baile. Con "reducir movimiento" salta al valor final. Va por `requestAnimationFrame` en JS: son pocas cifras
 * y fuera del entrenamiento, así que no compite con el hilo de la cámara.
 */
export function AnimatedNumber({ value, style, format }: { value: number; style?: StyleProp<TextStyle>; format?: (n: number) => string }) {
  const m = useMotion();
  const [shown, setShown] = useState(value);
  const from = useRef(value);

  useEffect(() => {
    const start = from.current;
    from.current = value;
    const ms = m.duration.emphasis;
    if (ms === 0 || start === value) {
      setShown(value);
      return;
    }
    const t0 = Date.now();
    let frame = requestAnimationFrame(function tick() {
      const p = (Date.now() - t0) / ms;
      setShown(countUpValue(start, value, p));
      if (p < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [value, m.duration.emphasis]);

  return <Text style={[{ fontVariant: ['tabular-nums'] }, style]}>{format ? format(shown) : String(shown)}</Text>;
}
