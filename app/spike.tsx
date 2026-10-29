import { Canvas, Points, vec } from '@shopify/react-native-skia';
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useDerivedValue } from 'react-native-reanimated';
import { Camera, useCameraPermission } from 'react-native-vision-camera';

import { toOverlayPoints } from '@/vision/overlay';
import { useSpikeCamera } from '@/vision/useSpikeCamera';

/** La vista previa de la cámara frontal se muestra espejada; el dibujo debe coincidir. */
const MIRROR_PREVIEW = true;

/** Pantalla de prueba de la parte 1 (solo desarrollo): cámara, pose de MediaPipe y métricas. */
export default function SpikeScreen() {
  const { hasPermission, canRequestPermission, requestPermission } = useCameraPermission();
  const { frameOutput, stats, landmarks, frameAspect } = useSpikeCamera();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const points = useDerivedValue(() =>
    toOverlayPoints(landmarks.value, size.width, size.height, MIRROR_PREVIEW, frameAspect.value).map((p) => vec(p.x, p.y)),
  );

  if (!__DEV__) return <Redirect href="/" />;

  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <Text>Se necesita la cámara para la prueba.</Text>
        {canRequestPermission ? (
          <Pressable onPress={() => void requestPermission()}>
            <Text style={styles.link}>Dar permiso</Text>
          </Pressable>
        ) : (
          <Text>Actívala en Ajustes.</Text>
        )}
      </View>
    );
  }

  const { metrics } = stats;
  return (
    <View style={styles.fill} onLayout={(e) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
      <Camera style={styles.fill} device="front" isActive outputs={[frameOutput]} />
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        <Points points={points} mode="points" color="#3ddc84" strokeWidth={10} strokeCap="round" />
      </Canvas>
      <View style={styles.hud}>
        <Text style={styles.hudText}>FPS {metrics.fps.toFixed(1)}</Text>
        <Text style={styles.hudText}>Descartes {metrics.dropped}</Text>
        <Text style={styles.hudText}>p95 {metrics.p95IntervalMs.toFixed(1)} ms</Text>
        <Text style={styles.hudText}>Inferencia {stats.inferMs.toFixed(1)} ms</Text>
        <Text style={styles.hudText}>Detección {(stats.detectionRate * 100).toFixed(0)} %</Text>
        <Text style={styles.hudText}>Térmico {stats.thermalStatus}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  link: { color: '#0a66c2', fontWeight: '600' },
  hud: { position: 'absolute', top: 48, left: 16, backgroundColor: '#000a', padding: 8, borderRadius: 8 },
  hudText: { color: '#fff', fontVariant: ['tabular-nums'] },
});
