# Rendimiento de la parte 1 (Paso C): plan

**Objetivo:** que la pantalla `spike` cumpla en el Galaxy S26 Ultra (y luego en el Pixel 7 Pro) los criterios
de salida de la parte 1: **30 FPS**, **inferencia p95 < 33 ms**, **< 5 % de descartes** y sin térmica SEVERE
en 10 min.

**Punto de partida (medido, `docs/spike-results.md`):** ~17 FPS, ~42 % de descartes, `detect()` p95 ~56 ms,
térmica 0, PSS 823 MB. `detect()` incluye, en el hilo de la cámara: `ImageProxy.toBitmap()` (YUV → RGB con un
Bitmap nuevo por cuadro), `BitmapImageBuilder`, `detectForVideo` (con giro de la imagen) y el empaquetado.

**Regla:** un cambio cada vez, medido antes y después con la misma prueba. No se cambia de modelo (MoveNet es el
plan B y requiere aprobación del usuario).

## C1. Medir dónde se va el tiempo (sin cambiar el comportamiento)

- En `HybridPoseLandmarker`, `Log.i` al crear el `PoseLandmarker` con el **delegado** realmente usado (GPU o, si
  falló, CPU) y el motivo del fallo.
- Cronometrar por cuadro cada etapa: conversión de imagen, construcción del `MPImage`, `detectForVideo` y
  empaquetado. Cada 150 cuadros, una línea de log con p50 y p95 de cada etapa (`adb logcat -s KynetNative`).
- Comparar el total nativo con el `detect()` medido en JS: la diferencia es el coste del puente JSI y del worklet.

**Decide:** si manda la conversión, ir a C3; si manda la inferencia, ir a C2 y C5; si la diferencia JS es
grande, medir una build release (el `-O1` y el modo de desarrollo del JS solo afectan a esa parte).

## C2. Delegado de MediaPipe

- Si cayó a CPU, averiguar por qué (log de C1) y corregirlo (librerías OpenCL/GL declaradas en el manifiesto,
  opciones del delegado GPU).
- Si ya está en GPU y la inferencia sigue alta, probar CPU con más hilos como comparación (el modelo *lite* puede
  ser más rápido en la CPU de un móvil de gama alta que con el coste de subir la imagen a la GPU).

## C3. Quitar la conversión a Bitmap por cuadro

En orden; cada paso se mide por separado:

1. **`pixelFormat: 'rgb'`** en `useSpikeCamera` (CameraX entrega RGBA_8888 convertido en nativo con libyuv) y
   **`ByteBufferImageBuilder`** sobre el plano RGBA, sin Bitmap ni copia si `rowStride == width × 4`; si no, una
   copia a un `ByteBuffer` reutilizado.
2. Si MediaPipe no acepta ese `MPImage`, **un único Bitmap reutilizado** con `copyPixelsFromBuffer`.
3. `MediaImageBuilder` (YUV directo) solo como experimento: Tasks puede no aceptar `MediaImage`.

## C4. Liberar recursos

- `PoseLandmarker.close()` cuando se libere el HybridObject (`dispose`), y no recrearlo al volver a la pantalla.

## C5. Solo si aún no se cumple

- Bajar la resolución de entrada (por ejemplo 480×360): el modelo trabaja a 256×256, así que la detección casi
  no debería empeorar. Medir la detección además del tiempo.
- Probar `RunningMode.LIVE_STREAM` (asíncrono) para que la cámara no espere a la inferencia.

## Cómo se mide

- Build de desarrollo local (`gradlew app:assembleDebug`, arm64), instalada por `adb`; misma pantalla y misma luz.
- **Pruebas cortas (2 min) para cada cambio:** con una persona en cuadro, o con el teléfono frente al monitor de
  la PC reproduciendo un vídeo de una persona de cuerpo entero, para no depender del usuario. Se anotan los
  tiempos por etapa del log y el HUD.
- **Prueba final de 10 min** con el usuario, con lecturas automáticas a los 0, 5 y 10 min (captura de pantalla,
  `dumpsys meminfo` y `dumpsys thermalservice`).
- Todo el antes y el después se anota en `docs/spike-results.md`; las decisiones en `docs/estado.md`.

## Terminado cuando

El S26 Ultra cumple los cuatro criterios en la prueba de 10 min, o se demuestra con cifras qué etapa no baja de
33 ms y por qué, para que el usuario decida (más optimización, MoveNet o ajustar el criterio).
