import { Canvas, Points, vec } from '@shopify/react-native-skia';
import { StyleSheet } from 'react-native';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { toOverlayBones, toOverlayPoints } from '@/vision/overlay';

import { tokens } from './tokens';

interface Props {
  readonly landmarks: SharedValue<Float32Array | undefined>;
  readonly frameAspect: SharedValue<number>;
  readonly width: number;
  readonly height: number;
  readonly mirror: boolean;
  readonly color?: string;
}

/** Esqueleto en Skia leyendo SharedValues: se redibuja a la tasa de la pantalla sin pasar por JS. */
export function Skeleton({ landmarks, frameAspect, width, height, mirror, color = tokens.accent }: Props) {
  const bones = useDerivedValue(() =>
    toOverlayBones(landmarks.value, width, height, mirror, frameAspect.value).map((p) => vec(p.x, p.y)),
  );
  const joints = useDerivedValue(() =>
    toOverlayPoints(landmarks.value, width, height, mirror, frameAspect.value).map((p) => vec(p.x, p.y)),
  );
  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Points points={bones} mode="lines" color={color} strokeWidth={6} strokeCap="round" />
      <Points points={joints} mode="points" color="#ffffff" strokeWidth={10} strokeCap="round" />
    </Canvas>
  );
}
