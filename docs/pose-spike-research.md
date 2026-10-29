# Investigación previa al spike de pose (RN + Expo, Android-first)

Fecha: 2026-10-28. Solo investigación, sin instalar nada en el proyecto.
Leyenda: **[V]** verificado en fuente primaria (registro npm, tarball del paquete, README, descarga del modelo); **[NV]** no verificado (dominios bloqueados en esta sesión: ai.google.dev, developers.google.com, margelo.com, unpkg, API de GitHub), o inferido.

## 0. Veredicto sobre el informe original

La sospecha es correcta. Un único `mediapipe_pose_lite.tflite` no existe como artefacto oficial.
- **[V]** `pose_landmarker_lite.task` (5,8 MB) es un ZIP que contiene **dos** modelos: `pose_detector.tflite` (2,96 MB) y `pose_landmarks_detector.tflite` (2,82 MB). Descargado de `storage.googleapis.com/mediapipe-models/pose_landmarker/...` y descomprimido. Variantes: lite 5,8 MB, full 9,4 MB, heavy 30,7 MB.
- **[NV]** Con `react-native-fast-tflite` habría que reimplementar en JS/worklet: detector de persona, decodificación de anchors/NMS, ROI con rotación (alineamiento por keypoints), recorte/warp afín, normalización, inferencia del landmarker, proyección inversa al frame y filtrado temporal (el landmarker de MediaPipe devuelve 33 puntos con z y visibilidad, más máscara de segmentación). Es el trabajo que hace el grafo C++ de MediaPipe Tasks. Es viable pero no es "un archivo".
- **[V]** La combinación `react-native-worklets-core` + VisionCamera v5 ya no es la vigente: v5 usa `react-native-worklets` (Software Mansion) vía `react-native-vision-camera-worklets`, y `react-native-fast-tflite` 3.x está en Nitro y es compatible con v5 (ver sección 4).

## 1. Opciones reales (estado al 2026-10-28)

| # | Opción | Mantenimiento (fecha última publicación npm) | Licencia | VisionCamera / Expo | Nueva arquitectura | Landmarks | Latencia esperada | Esfuerzo (1 persona) | Config plugin Expo |
|---|---|---|---|---|---|---|---|---|---|
| A | **Módulo nativo propio**: Kotlin + MediaPipe Tasks `PoseLandmarker` (LIVE_STREAM, `detectAsync`) expuesto como frame processor plugin de VisionCamera v5 (Nitro Module) o vía Expo Modules API | Lo mantienes tú; MediaPipe Tasks es de Google (Apache-2.0 [NV, de memoria]) | Apache-2.0 [NV] | VC 5.2.3 + Expo SDK 58 [V para versiones] | Sí por construcción (Nitro/Expo Modules) | 33 | [NV] Referencias públicas de Google para Pixel: lite en decenas de ms en CPU, menos con GPU delegate; **medir en el spike** | **Alto**: 2-4 semanas para dejar robusto (conversión YUV->bitmap/MPImage, rotación, hilo, ciclo de vida, empaquetado del .task) | Config plugin propio mínimo (copiar `.task` a assets, dependencia Gradle). Hay que escribirlo |
| B | **`react-native-fast-tflite` 3.0.1 + MoveNet** (o BlazePose tflite propio) en frame processor VC v5 | Activo: 3.0.1 publicado 2026-04-21 [V]. Mantenedor: "provided as is, free time" [V README] | MIT [V] | VC v5 (ejemplo con `useFrameOutput` + `react-native-vision-camera-resizer`) [V]; Expo con config plugin [V] | Nitro Modules [V]; el README no lo declara explícito | MoveNet: **17** (COCO). BlazePose a mano: 33 pero con el problema de la sección 0 | [NV] MoveNet Lightning (192x192) es de los más rápidos en móvil; con delegado GPU esperable bien bajo 33 ms en S26/Pixel 7 Pro. Medir | **Bajo-medio**: 3-6 días para MoveNet single-pose (resize + salida [1,1,17,3]) | Sí, plugin incluido (`enableAndroidGpuLibraries`, `enableCoreMLDelegate`). Android usa LiteRT 1.4.0 y `litert-gpu` [V gradle]. NNAPI deprecado en Android 15 [V] |
| C | **`expo-vision-camera-v4-mediapipe` 1.4.0** (CarlosEduFF) | Publicado 2026-09-12, creado 2026-04-18 [V]; un solo mantenedor, proyecto joven | MIT [V] | Requiere **VC >= 4** y `react-native-worklets-core` >= 0.5, Expo >= 50, RN >= 0.73 [V README]; **no hay evidencia de soporte VC v5** | No declarado [V: "no mencionado"] | 33 (`enablePose`, `pose_landmarker_lite.task` descargado aparte) [V] | [NV] No publica cifras | Bajo (1-3 días para probar) pero te ata a VC v4 y worklets-core | Sí. **Solo Android** [V], `pixelFormat="rgb"` obligatorio [V]. Errores de clases duplicadas de MediaPipe [V] |
| D | **`react-native-mediapipe` 0.6.0** (cdiddy77) | **Abandonado**: última publicación 2024-12-12 [V]. README solo lista "AI Object Detection" (no pose) [V] | MIT [V] | Peer: VC + worklets-core, proyecto bare [V] | No declarado | No ofrece pose [V README] | n/a | Descartar | n/a |
| E | **`@thinksys/react-native-mediapipe` 0.0.21** | Publicado 2026-04-10 [V]; v0.0.x | MIT [V] | **No usa VisionCamera**: componente `RNMediapipe` con cámara propia y callback `onLandmark` [V README]. MediaPipeTasksVision 0.10.14 en iOS [V] | No declarado | Pose (cuerpo), cantidad de puntos no confirmada [NV] | [NV] | Bajo, pero cámara cerrada: no puedes pintar con Skia sobre el frame ni controlar la tubería | No evidente |
| F | **`expo-pose-landmarks` 1.0.13** | Publicado una sola vez, 2025-08-05; repo `your-username` (plantilla sin completar) [V] | MIT [V] | Peer `expo-modules-core ~2.4.0` (SDK 53), obsoleto frente a SDK 58 [V] | No declarado | MediaPipe [V descripción] | n/a | Descartar | n/a |
| G | `vision-camera-pose-detection` (nombre pedido) | **No existe** en el registro npm con ese nombre [V]. Existen forks `react-native-vision-camera-v3-pose-detection` y `@scottjgilroy/react-native-vision-camera-v4-pose-detection` (aparecen en jsDelivr; sin revisar a fondo) [NV] | ? | VC v3/v4 | ? | ? | ? | Descartar por edad | ? |
| H | `quickpose-react-native-pose-estimation` | Producto comercial (SDK de terceros) [NV] | Comercial | ? | ? | ? | ? | No evaluado; coste y dependencia de proveedor | ? |
| I | ML Kit Pose Detection (Google) mediante plugin propio | Hay SDK nativo Android de ML Kit (33 landmarks, base y accurate) [NV, de memoria]. No encontré un wrapper RN mantenido para VC v5 | [NV] | — | — | 33 | [NV] | Similar a A, con API más simple pero menos control | Propio |

Conclusión de la tabla: no hay paquete de terceros mantenido, con VC v5, nueva arquitectura y pose de 33 puntos. Las opciones reales son **A** (33 puntos, trabajo propio) y **B** (17 puntos MoveNet, rápido de hacer). C sirve como prueba de concepto rápida si se acepta VC v4.

## 2. Compatibilidad actual (d)

Todo **[V]** salvo indicación; versiones leídas de npm y de `bundledNativeModules.json` de Expo en GitHub.

| Pieza | Versión |
|---|---|
| Expo SDK vigente | **58** (`expo` 58.0.21; SDK 57, 56... en dist-tags) |
| RN que trae SDK 58 | 0.88.1; React 19.3.0 |
| Reanimated (SDK 58) | 4.7.1 |
| react-native-worklets (SDK 58) | 0.13.0 (latest npm 0.13.1; peer `react-native 0.86 - 0.88`) |
| @shopify/react-native-skia (SDK 58) | 2.14.0 (peer: React >= 19, RN >= 0.78, worklets >= 0.7, reanimated >= 4) |
| react-native-vision-camera | **5.2.3** (2026-08-20); peers: `react-native-nitro-modules`, `react-native-nitro-image` |
| react-native-vision-camera-worklets | 5.2.3 (peer: react-native-worklets) |
| react-native-vision-camera-skia | 5.2.3 (peers: reanimated, worklets, Skia) |
| react-native-vision-camera-resizer | 5.2.3 (peer: nitro-modules) |
| react-native-nitro-modules | VC 5.2.3 se compila con 0.37.0 (versión exacta a usar: la de su devDependency; verificar al instalar) |
| react-native-fast-tflite | 3.0.1 (Nitro; ejemplo con VC v5) |
| react-native-worklets-core | 1.6.3 (línea antigua de Margelo para VC v4; **no usar con VC v5**) |

Combinación recomendada para el spike: **Expo SDK 58 + RN 0.88 + VC 5.2.3 + Skia 2.14.0 + worklets 0.13.x + reanimated 4.7.x**, new architecture activada. Con `npx expo install` se obtienen las versiones que Expo fija; VC y nitro no están en `bundledNativeModules` de SDK 58 [V: null], así que se fijan a mano y hay que probar el build.
**[NV]**: no pude comprobar que VC 5.2.3 está probado con RN 0.88 (su devDependency es RN 0.85.3). Es el primer riesgo del spike. Plan de retroceso: SDK 57 (RN 0.86.3, worklets 0.10.1, Skia 2.6.2, reanimated 4.5.1 [V]); allí hay que verificar peers de Skia/worklets.
Nota Skia: el changelog reciente (3.x, 3.8.1 del 27-oct, "v3") aparece en la página de releases de GitHub junto a la 2.x, pero npm `latest` sigue siendo 2.14.0 y es lo que fija Expo SDK 58. No saltar a 3.x. Una nota de v3.6.2 avisa de que sin Vulkan hay que usar v2: relevante para dispositivos antiguos, no para S26/Pixel 7 Pro [V página de releases].

## 3. Worklets y contrapresión (c)

**Qué usar**
- VC v5: `useFrameOutput({ onFrame, onFrameDropped, pixelFormat, dropFramesWhileBusy, targetResolution, enablePhysicalBufferRotation })` [V código de `useFrameOutput.ts`]. Exige `react-native-vision-camera-worklets` + `react-native-worklets` y el plugin Babel de worklets el último de la lista [V código / búsqueda].
- `react-native-worklets-core` (Margelo) es el motor de VC v3/v4 y de `expo-vision-camera-v4-mediapipe`. En v5 el motor por defecto cambió a `react-native-worklets` de Software Mansion (el mismo que usa Reanimated 4) [V].
- Una sola librería de worklets en el proyecto: instalar ambas (core y react-native-worklets) arriesga conflictos de plugin Babel y runtimes duplicados [NV, riesgo conocido, confirmar en spike].

**Descarte de cuadros**
- `dropFramesWhileBusy` vale `true` por defecto [V]: si `onFrame` aún corre cuando llega otro cuadro, la cámara lo descarta. `onFrameDropped('out-of-buffers')` se dispara cuando el callback tarda más que un intervalo de cuadro [V]. Úsalo como contador de métricas en el spike.
- Debes llamar `frame.dispose()` al terminar (en `try/finally`), o los siguientes cuadros se pierden [V].
- Para inferencia más lenta que 33 ms (p. ej. landmarker pesado) no bloquees `onFrame`: el patrón recomendado es procesar el cuadro más reciente y descartar el resto (mailbox de tamaño 1: un flag "ocupado" en el worklet, o `runAsync`-estilo en un runtime/hilo propio). **[NV]** el nombre exacto de la API de VC v5 para ello (`runAsync`/`runAtTargetFps` existían en v4); comprobar en la documentación de v5 (margelo bloqueado aquí).
- Para MediaPipe nativo (opción A): usar `RunningMode.LIVE_STREAM` con `detectAsync`; MediaPipe ya descarta cuadros si el timestamp no es creciente o el grafo está ocupado [NV, de memoria de la doc de Google].

**Datos hacia la UI sin bloquear JS**
- Resultado (33x4 floats) se escribe en un `SharedValue` (Reanimated/worklets) y Skia lo lee en el hilo UI/render. No usar `runOnJS` por cuadro para dibujar; reservar `runOnJS` para eventos de bajo ritmo (repeticiones, fases). [NV como patrón, comprobar]
- Alternativa de dibujo: `react-native-vision-camera-skia` (superficie Skia dentro del pipeline de la cámara; dibuja sobre el propio cuadro con la rotación correcta) vs `<Canvas>` de Skia superpuesto que lee SharedValues. El primero evita desfases de orientación; el segundo es más simple. Medir en el spike.
- `TfliteModel` es un HybridObject Nitro y en VC v5 se usa directamente dentro del worklet sin `NitroModules.box()` [V README de fast-tflite].

## 4. Notas por opción

**B (fast-tflite + MoveNet).** Android: delegados `android-gpu` y `nnapi`; GPU preferido, NNAPI deprecado en Android 15; algunos dispositivos Android 12+ necesitan `<uses-native-library>` para `libOpenCL.so` (lo gestiona `enableAndroidGpuLibraries`) [V]. Entrada MoveNet Lightning 192x192, Thunder 256x256 (tflite float16/int8 en TF Hub) [V búsqueda]. Modelo single-pose: requiere recortar alrededor de la persona entre cuadros para mantener precisión (lógica de "crop region" del ejemplo oficial) [NV]. Dependencias: `react-native-vision-camera-resizer` para el resize en GPU/nativo [V].

**A (MediaPipe nativo).** Dependencia Gradle `com.google.mediapipe:tasks-vision` (versión a confirmar; no pude leer maven-metadata) [NV]. El `.task` va en `assets` (5,8 MB lite). Lo más delicado: convertir el `Frame` de VC (YUV_420_888 o RGBA con `pixelFormat: 'rgb'`) a `MPImage` con la rotación correcta, y devolver landmarks normalizados al worklet. El config plugin de `expo-vision-camera-v4-mediapipe` es una buena plantilla de cómo hacerlo [V que existe; código no revisado].

## 5. Recomendación

- **Principal: spike con A solo si 33 landmarks son requisito de producto**; si basta con 17, empezar por **B** porque en 1 semana tienes la tubería completa (cámara, worklet, inferencia, Skia) y mides techo de FPS. La decisión real depende de qué ejercicios necesitas: 33 puntos aportan manos/pies/cara (tobillo-talón-punta del pie, muñeca) útiles para sentadilla/plancha de lado; 17 puntos bastan para la mayoría de ejercicios de tronco y extremidades.
- Mi propuesta: **construir la tubería con B (MoveNet) en los primeros días, y en paralelo un módulo A mínimo (solo `PoseLandmarker` lite, Android, devolver 33x4 floats)**. Así el spike compara las dos con el mismo arnés. Principal esperado a producción: A (33 puntos, suavizado y tracking de MediaPipe ya resueltos); plan B: MoveNet con fast-tflite.
- Plan C de contingencia: `expo-vision-camera-v4-mediapipe` bajando a VC v4 + worklets-core, si v5 + RN 0.88 diera problemas de build. No recomendable como base de producto (proyecto de un solo autor, 5 meses de vida).
- Descartar: D, E (cámara cerrada), F, G.

## 6. Checklist del spike (parte 1)

Entorno
- [ ] Dev build (no Expo Go) en Galaxy S26 Ultra y Pixel 7 Pro; new architecture activa; Hermes por defecto.
- [ ] `expo install` SDK 58 + VC 5.2.3 + vision-camera-worklets + vision-camera-skia + resizer + Skia 2.14.0 + worklets 0.13.x + nitro-modules (versión de VC). Anotar versiones resueltas y si hay conflicto de peers (RN 0.88 vs 0.85.3 de VC).
- [ ] Compila en release con 16 KB page size / targetSdk actual (los `.so` de LiteRT y MediaPipe deben ser compatibles) [NV: verificar].

Funcional
- [ ] Una sola librería de worklets; plugin Babel último; sin errores de runtime duplicado.
- [ ] Cámara 1280x720 (probar también 640x480), 30 FPS, `pixelFormat` rgb vs yuv.
- [ ] Orientación: vertical y horizontal, cámara frontal y trasera, espejo; el esqueleto coincide con el cuerpo.
- [ ] B: MoveNet Lightning y Thunder, delegado CPU vs GPU (`android-gpu`) vs NNAPI.
- [ ] A: PoseLandmarker lite y full, CPU vs GPU delegate, `LIVE_STREAM`.
- [ ] Esqueleto dibujado con Skia: (i) `react-native-vision-camera-skia`, (ii) Canvas + SharedValue.

Métricas (10 min por prueba, sesión continua, pantalla encendida, mismo ejercicio)
- [ ] FPS de salida real de pose y FPS de dibujo (UI) por separado.
- [ ] Latencia por etapa en ms (p50/p95/p99): conversión/resize, inferencia, postproceso, publicación a UI; latencia extremo a extremo cámara->píxel (grabar pantalla a 120 fps con el cuerpo en movimiento).
- [ ] Conteo de `onFrameDropped('out-of-buffers')` por minuto.
- [ ] Bloqueo del hilo JS y UI: jank en un contador animado en pantalla; FPS del hilo JS (Perf Monitor).
- [ ] Temperatura y throttling tras 10 min (batería, `adb shell dumpsys thermalservice`), consumo en mAh/10 min.
- [ ] Memoria (PSS) y fugas (frame no dispuesto = cuadros congelados).
- [ ] Calidad: jitter de landmarks en reposo, pérdida con oclusión, distancia 1,5-3 m, poca luz, ropa suelta; estabilidad de ángulos de rodilla/cadera en sentadilla frente a un video de referencia.
- [ ] Tamaño del APK/AAB añadido (modelos + libs nativas).

Criterios de salida (propuestos, ajustables)
- Pose >= 30 FPS sostenidos con p95 < 33 ms, sin caída de UI por debajo de 60 fps, < 5 % de cuadros descartados, sin throttling notable en 10 min en ambos móviles.
- Decidir 17 vs 33 puntos con los ejercicios reales; si 17 cumple, quedarse con B.

## 7. Qué no pude verificar

- Documentación de MediaPipe Pose Landmarker para Android, cifras de latencia oficiales y la versión Gradle vigente (ai.google.dev y developers.google.com no resuelven desde esta sesión; maven-metadata vacío).
- Documentación de VisionCamera v5 en margelo.com (API exacta de `runAsync`, contrapresión avanzada, integración Skia). Se leyó el código fuente publicado del paquete en npm.
- Compatibilidad real de VC 5.2.3 con RN 0.88 y soporte de nueva arquitectura de `react-native-fast-tflite` (README no lo declara).
- Latencias en S26 Ultra y Pixel 7 Pro: ninguna cifra es medida; todas son para el spike.
- Licencia exacta de MediaPipe Tasks y de ML Kit (de memoria: Apache-2.0 / términos de Google).

## 8. URLs usadas

- https://registry.npmjs.org/react-native-vision-camera (y `/latest`, tarball 5.2.3)
- https://registry.npmjs.org/react-native-vision-camera-worklets
- https://registry.npmjs.org/react-native-vision-camera-skia
- https://registry.npmjs.org/react-native-vision-camera-resizer
- https://registry.npmjs.org/react-native-worklets
- https://registry.npmjs.org/react-native-worklets-core
- https://registry.npmjs.org/@shopify%2freact-native-skia
- https://registry.npmjs.org/react-native-fast-tflite (tarball 3.0.1)
- https://registry.npmjs.org/react-native-mediapipe
- https://registry.npmjs.org/@thinksys/react-native-mediapipe
- https://registry.npmjs.org/expo-pose-landmarks
- https://registry.npmjs.org/expo-vision-camera-v4-mediapipe
- https://registry.npmjs.org/expo
- https://raw.githubusercontent.com/expo/expo/sdk-58/packages/expo/bundledNativeModules.json (y sdk-57)
- https://github.com/mrousavy/react-native-fast-tflite
- https://github.com/cdiddy77/react-native-mediapipe (y README raw)
- https://github.com/Shopify/react-native-skia/releases
- https://raw.githubusercontent.com/ThinkSys/mediapipe-reactnative/main/README.md
- https://raw.githubusercontent.com/CarlosEduFF/expo-vision-camera-v4-mediapipe/main/README.md
- https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_{lite,full,heavy}/float16/latest/pose_landmarker_{lite,full,heavy}.task
- Resultados de búsqueda (no abiertos a fondo): https://margelo.com/blog/whats-new-in-visioncamera-v5 , https://visioncamera4.margelo.com/docs/guides/vision-camera-v5 , https://www.tensorflow.org/hub/tutorials/movenet , https://www.jsdelivr.com/package/npm/@scottjgilroy/react-native-vision-camera-v4-pose-detection , https://github.com/quickpose/quickpose-react-native-pose-estimation
