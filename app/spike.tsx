import { Canvas, Points, vec } from '@shopify/react-native-skia';
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useDerivedValue } from 'react-native-reanimated';
import { Camera, useCameraPermission } from 'react-native-vision-camera';

import { toOverlayPoints } from '@/vision/overlay';
import { useSpikeCamera } from '@/vision/useSpikeCamera';

/** La vista previa de la cámara frontal se muestra espejada; el dibujo debe coincidir. */
const MIRROR_PREVIEW = true;

/** Sin esto la cámara frontal del Pixel 7 Pro entrega 24 FPS con luz de interior (medido el 2026-10-29). */
const CAMERA_CONSTRAINTS = [{ fps: 30 }];

/** Pantalla de prueba de la parte 1 (solo desarrollo): cámara, pose de MediaPipe y métricas. */
export default function SpikeScreen() {
  const { t } = useTranslation();
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
        <Text>{t('spike.permissionNeeded')}</Text>
        {canRequestPermission ? (
          <Pressable onPress={() => void requestPermission()}>
            <Text style={styles.link}>{t('spike.grantPermission')}</Text>
          </Pressable>
        ) : (
          <Text>{t('spike.enableInSettings')}</Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.fill} onLayout={(e) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
      <Camera style={styles.fill} device="front" isActive outputs={[frameOutput]} constraints={CAMERA_CONSTRAINTS} />
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        <Points points={points} mode="points" color="#3ddc84" strokeWidth={10} strokeCap="round" />
      </Canvas>
      <View style={styles.hud}>
        <Text style={styles.hudText}>{t('spike.hud.fps', { value: stats.fps.toFixed(1) })}</Text>
        <Text style={styles.hudText}>{t('spike.hud.dropped', { value: stats.dropped })}</Text>
        <Text style={styles.hudText}>{t('spike.hud.inferP95', { value: stats.p95InferMs.toFixed(1) })}</Text>
        <Text style={styles.hudText}>{t('spike.hud.inferLast', { value: stats.lastInferMs.toFixed(1) })}</Text>
        <Text style={styles.hudText}>{t('spike.hud.intervalP95', { value: stats.p95IntervalMs.toFixed(1) })}</Text>
        <Text style={styles.hudText}>{t('spike.hud.detection', { value: (stats.detectionRate * 100).toFixed(0) })}</Text>
        <Text style={styles.hudText}>{t('spike.hud.thermal', { value: stats.thermalStatus })}</Text>
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
