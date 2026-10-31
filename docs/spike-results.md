# Resultados del spike de cámara y pose (parte 1)

Criterios de salida (`pose-spike-research.md` §6 y `requirements.md` §3, parte 1): pose a **30 FPS**
sostenidos, **inferencia p95 < 33 ms**, **< 5 % de cuadros descartados** y **sin térmica SEVERE** en 10 min,
en el Galaxy S26 Ultra y en el Pixel 7 Pro.

Configuración común: build de desarrollo (debug, `arm64-v8a`), cámara frontal, `pixelFormat: 'yuv'`,
`targetResolution` VGA 4:3 (640×480), MediaPipe PoseLandmarker lite (float16) en modo VIDEO, una persona a
unos 2 m, de pie y moviéndose poco. Las métricas salen del HUD de la pantalla `spike`; memoria con
`adb shell dumpsys meminfo com.kynet.app.dev` y térmica con `adb shell dumpsys thermalservice`.

## Galaxy S26 Ultra (SM-S948B)

### Prueba 1: línea base (2026-10-29, 13:23 → 13:35, unos 12 min continuos)

Código en el teléfono: `1d4040e` (antes del Paso A, así que no hay inferencia p95: el HUD solo daba la
duración del último `detect()`). Solo hay lectura al **final**; al inicio y a los 5 min no se tomó.

| Momento | FPS | Descartes | Inferencia (último) | Intervalo p95 | Detección | Térmico | PSS |
|---|---|---|---|---|---|---|---|
| Final (~12 min) | 17,4 | 9349 (~42 %) | 36,8 ms | 66,7 ms | 98 % | 0 (AP 42–52 °C, piel 37,9 °C) | 823 MB (gráficos 309, nativo 182) |

- Descartes coherentes: 17,4 FPS procesados + 9349 perdidos en ~750 s ≈ 30 FPS de la cámara.
- Mano izquierda: el punto sube del lado en que se ve en pantalla (confirmado por el usuario).
- Esqueleto alineado con el cuerpo tras `2581aad` (giro a vertical) y `c2d3ec0` (cover).
- Sin cierres en logcat.

### Lectura puntual tras el Paso A (2026-10-29, 13:40, recién abierta)

Código `4b56fb7`: inferencia p95 **56,5 ms**, último `detect()` 48,8 ms, intervalo p95 100 ms, 13,5 FPS,
detección 97 %, térmico 0. Es una sola lectura con la sesión recién arrancada; no sustituye a la prueba
de 10 min.

### Conclusión provisional (S26 Ultra)

**No cumple** los criterios: unos 17 FPS en vez de 30, descartes del ~42 % frente a < 5 % e inferencia p95
cercana a 56 ms frente a < 33 ms. La térmica sí cumple (estado 0 en todo momento). El cuello de botella es
`detect()`, que incluye la conversión `ImageProxy.toBitmap()` (YUV → RGB y un Bitmap nuevo por cuadro)
además de la inferencia. Siguiente paso: Paso C (delegado GPU/CPU y conversión de imagen).

### Paso C: dónde se iba el tiempo (2026-10-29, 14:25 → 14:50)

Plan: `docs/superpowers/plans/2026-10-29-rendimiento-parte-1.md`. Tiempos nativos por etapa con
`adb logcat -s KynetNative` (ventanas de 150 cuadros, ~5 s cada una); "intervalo" es el tiempo entre cuadros
procesados según las marcas de tiempo de la cámara (33 ms = 30 FPS). Persona sentada a ~1 m, luz de interior.

| Configuración | `toBitmap` p50 | Inferencia p50 / p95 | Intervalo p50 / p95 | Lectura |
|---|---|---|---|---|
| Delegado **GPU** (original) | 0,2–0,3 ms | 34–46 / 55–64 ms | — | La inferencia es todo el coste |
| Delegado **CPU** | 0,2 ms | 23–25 / 30–32 ms | — | La CPU gana a la GPU con el modelo lite |
| CPU, cámara sin inferencia | — | — | 33 / 33,3 ms | La cámara entrega 30 FPS exactos |
| CPU, `onFrame` completo vs `detect()` | — | +~15 ms en p95 fuera de `detect()` | — | Las métricas del worklet costaban ~7 FPS |
| CPU, worklet sin métricas | 0,2 ms | 24–28 / 47–58 ms | 33 / 34 ms | 30 FPS: el búfer de 1 cuadro absorbe los picos |
| CPU, métricas fuera del camino (`bf4b7b8`) | 0,2 ms | 24–27 / 33–40 ms | 33 / 34 ms | **30 FPS, 3 descartes, detección 99 %** (HUD) |
| Resolución pedida 360×480 | — | sin cambio | — | CameraX entrega 640×480 igualmente (mínimo) |
| Giro dentro de MediaPipe vs sin giro | — | diferencia ~1–2 ms | — | No compensa tocarlo |
| Bitmap girado a mano (Matrix) | 3,2–3,9 ms | 23–25 / 32–35 ms | 33 / 34 ms | Más lento en total; descartado |

- La inferencia en CPU varía entre ejecuciones (p50 de 24 a 31 ms con el mismo código) sin que cambie el estado
  térmico (0); probablemente por el reparto de núcleos de la CPU.
- La inferencia p95 nativa queda en **33–41 ms**: por encima del criterio propuesto de 33 ms. Como la cámara
  guarda un cuadro pendiente, los picos aislados no hacen perder ritmo: lo que cuenta para los 30 FPS es la
  media, que está en ~25–28 ms.

### Conclusión tras el Paso C (S26 Ultra, pruebas cortas)

- **30 FPS:** cumple (intervalo p50 33 ms, p95 34 ms en casi todas las ventanas).
- **Descartes < 5 %:** cumple en las pruebas cortas (3 en el HUD tras ~20 s). Falta confirmarlo en 10 min.
- **Inferencia p95 < 33 ms:** **no cumple** (33–41 ms). Es el propio MediaPipe lite en CPU; no hay más
  margen en la conversión ni en el giro. El criterio está marcado como "propuesto, ajustable" en
  `pose-spike-research.md` §6; `requirements.md` pide 30 FPS y contrapresión verificada, que sí se cumplen.
- **Térmica:** 0 en todas las pruebas.
- Pendiente: prueba de 10 min con lecturas a 0/5/10 min y Pixel 7 Pro.

### Lite frente a full (2026-10-29, 15:19)

Mismo teléfono, misma escena (persona de pie a ~2 m, brazos abiertos), delegado CPU, código `c3b9ffd` más un
selector temporal de modelo (no subido). Modelo full: `pose_landmarker_full.task` float16 v1, sha256
`5134a3aa…11b1`, 9,4 MB.

| | lite | full |
|---|---|---|
| FPS (HUD) | 30 | 23 |
| Inferencia p50 / p95 (nativo) | 25–29 / 33–38 ms | 30–37 / 56–60 ms |
| Intervalo p95 | 34 ms | 67 ms |
| Confianza de talones | 0,71–0,78 | 0,83–0,93 |
| Puntas de los pies | Poco orientadas | Siguen la dirección del pie |
| Índice y pulgar | En la palma, junto a la muñeca | Igual |
| Orejas | Borde de la cara a la altura de los ojos | Igual |

- MediaPipe **Pose** no rastrea dedos: los puntos 17–22 son aproximaciones de la mano en ambos modelos. La
  cinemática no los usa.
- El full mejora los pies (relevante para `SQ_HEELS_LIFT`) pero no cabe en 30 FPS en el S26 Ultra.

## Pixel 7 Pro (Tensor G2)

### Primeras mediciones (2026-10-29, 15:55 → 16:05, pruebas cortas)

Código `1b2fee4` más un selector temporal de delegado (no subido). Lite, persona a ~1–2 m, luz de interior.

| Configuración | Inferencia p50 / p95 | Intervalo p50 / p95 | FPS (HUD) |
|---|---|---|---|
| CPU | 46–87 / 75–124 ms | 66–83 / 100–125 ms | ~15 |
| GPU | 33 / 41–47 ms | 42 / 42 ms | ~24 |
| GPU + `constraints={[{ fps: 30 }]}` | 29–33 / 53–58 ms | 33–34 / 67 ms | **~25** |

- **Al revés que en el S26:** en el Pixel la GPU es ~2× más rápida que la CPU. El delegado bueno depende del
  teléfono.
- La cámara frontal del Pixel entrega **24 FPS** con luz de interior si no se pide 30; con `{ fps: 30 }` entrega 30.
  En el S26 la restricción no cambia nada (sigue en 33 / 34 ms).
- Con GPU y 30 FPS de cámara la app procesa ~25 FPS: la inferencia ronda el periodo de 33 ms y los picos
  (p95 ~55 ms) hacen perder cuadros. **No cumple** aún los 30 FPS.

### Prueba de 10 min (2026-10-29, 16:13 → 16:23)

Código `a3d31c3` con delegado **GPU** (el que elige la selección automática en este teléfono), cámara a 30 FPS,
persona de pie a ~2 m moviéndose con naturalidad, Pixel conectado por USB. Lecturas automáticas
(`prueba-10min.sh`); los descartes del HUD son acumulados desde que se abrió la pantalla.

| Momento | FPS (HUD, último s) | Descartes | Inferencia p50 / p95 (nativo) | Intervalo p50 / p95 | Detección | Térmico | PSS |
|---|---|---|---|---|---|---|---|
| 0 min | 28 | 672 | 29,7 / 38,2 ms | 33 / 67 ms | 85 % (incluye la colocación) | 1 (LIGHT) | 801 MB |
| 5 min | — | — | 29,0 / 36,5 ms | 33 / 67 ms | — | 1 | 843 MB |
| 10 min | 29 | 3564 | 31,9 / 39,7 ms | 33 / 67 ms | 96 % | 1 | 786 MB |

- **Descartes:** 2892 en los 603 s entre el minuto 0 y el 10, sobre ~18 090 cuadros de la cámara: **~16 %**,
  es decir **~25 FPS procesados** de media. No cumple el < 5 %.
- **Inferencia p95:** 36–40 ms. No cumple el < 33 ms.
- **Térmica:** LIGHT (1) estable durante los 10 min, sin SEVERE: cumple.
- **Memoria:** estable entre 786 y 843 MB, sin tendencia a crecer; sin cierres en logcat.
- Visualmente: esqueleto alineado; pies descalzos bien detectados (talón y punta en su sitio).

### Conclusión provisional (Pixel 7 Pro)

Con su mejor delegado (GPU) el Pixel se queda en ~25 FPS con ~16 % de descartes: la inferencia media (~30 ms)
está justo en el límite del periodo de cámara. El S26 Ultra cumple 30 FPS. Opciones para el Pixel, a decidir:
inferir en modo asíncrono (`LIVE_STREAM`) para no bloquear la cámara, aceptar ~25 FPS en teléfonos de su gama
(la parte 3 pide "no caer de 25 FPS"), o el plan B MoveNet.

### Selección automática del delegado

`DelegateSelector`: la primera vez en cada teléfono mide 30 cuadros con CPU y 30 con GPU (tras 5 de
calentamiento cada uno) y guarda el ganador. Verificado: S26 Ultra elige **CPU** (mediana 23,7 ms frente a
32,5 ms en GPU) y Pixel 7 Pro elige **GPU** (28,9 ms frente a 62,7 ms); en la segunda apertura cada uno usa el
delegado guardado sin volver a medir.

## Prueba de 10 min en los dos teléfonos a la vez, modo LIVE_STREAM (2026-10-29, 17:07 → 17:17)

Código `95f3bb6` (LIVE_STREAM, delegado automático: S26 → CPU, Pixel → GPU), cámara a 30 FPS, los dos teléfonos
juntos frente a la persona a ~2 m. **El HUD de esta prueba no vale para FPS ni descartes**: tenía el fallo de
redondeo que corrige `42e53b8` (cada repetición de un resultado contaba como nueva; el S26 llegó a 2,1 millones de
"descartes"). Las cifras de abajo salen del log nativo: cada lectura es una ventana de 150 resultados (~5 s)
tomada en ese minuto, no la media de los 10 minutos.

| Teléfono | Minuto | Intervalo entre resultados p50 / p95 | Latencia (envío → resultado) p50 / p95 | Hilo de cámara | Térmico | PSS |
|---|---|---|---|---|---|---|
| S26 Ultra (CPU) | 0 | 33 / 34 ms | 33 / 47 ms | ~1 ms | 0 | 755 MB |
| S26 Ultra (CPU) | 5 | 33 / 67 ms | 58 / 75 ms | ~1,5 ms | 0 | 817 MB |
| S26 Ultra (CPU) | 10 | 33 / 66 ms | 54 / 73 ms | ~1,5 ms | 0 | 805 MB |
| Pixel 7 Pro (GPU) | 0 | 33 / 34 ms | 36 / 58 ms | ~3 ms | 1 (LIGHT) | 878 MB |
| Pixel 7 Pro (GPU) | 5 | 33 / 34 ms | 33 / 59 ms | ~3 ms | 1 | 970 MB |
| Pixel 7 Pro (GPU) | 10 | 33 / 67 ms | 55 / 90 ms | ~3 ms | 1 | 854 MB |

- **Mejora clara en el Pixel:** p50 de 33 ms en todas las ventanas (antes, en síncrono, 66–83 ms).
- **Degradación con el tiempo:** a partir del minuto 5 (S26) o 10 (Pixel) aparecen huecos de 2 cuadros
  (p95 66–67 ms) y la latencia sube a ~55 ms, sin que el estado térmico pase de 0–1. Probable bajada de frecuencia
  de la CPU/GPU por carga sostenida que Android no reporta como térmica. Hay que medir la tasa de descartes real
  de los 10 min con el HUD ya corregido.
- Sin cierres en ningún teléfono; memoria estable (750–970 MB, sin tendencia a crecer). Detección 94 % en el S26.
- La latencia en LIVE_STREAM incluye la espera en la cola de MediaPipe: no es comparable con la "inferencia" del
  modo síncrono.

## Segunda prueba de 10 min en los dos teléfonos y cola de resultados (2026-10-29, 17:25 → 17:40)

Con el HUD ya corregido (`42e53b8`), entre el minuto 0 y el 10 (601 s, ~18 030 cuadros de cámara):

| Teléfono | Descartes 0 → 10 min | % | Detección | Térmico |
|---|---|---|---|---|
| S26 Ultra (CPU) | 486 → 3624 (3138) | ~17 % | 100 % | 0 |
| Pixel 7 Pro (GPU) | 539 → 4014 (3475) | ~19 % | 98 % | 1 (LIGHT) |

El log nativo, en cambio, daba intervalos entre resultados p95 de 34 ms (casi sin huecos): MediaPipe producía casi
todas las poses, pero `detect()` devolvía solo **el último** resultado, y cuando dos llegaban entre dos cuadros el
primero no llegaba nunca a JS ni al motor. Arreglo: cola de resultados en orden (`ConcurrentLinkedQueue`, como
mucho 4); `detect()` entrega el siguiente sin entregar y, si no hay, repite el último (JS lo descarta por su marca).

Verificación corta tras el arreglo (~60 s, persona sentada en cuadro):

| Teléfono | Descartes en ~60 s | FPS (HUD) | Intervalo p95 |
|---|---|---|---|
| S26 Ultra (CPU) | 2 (~0,1 %) | 30 | 34 ms |
| Pixel 7 Pro (GPU) | 2 (~0,1 %) | 30 | 34 ms |

Pendiente: repetir la prueba de 10 min con la cola para cerrar la parte 1 con cifras de sesión completa.

## Prueba final de 10 min con la cola de resultados (2026-10-29, 17:45 → 17:55)

Código `34b8fb5`, los dos teléfonos juntos, persona sentada en cuadro. Descartes del HUD entre el minuto 0 y el 10
(600 s, ~18 000 cuadros de cámara):

| | Pixel 7 Pro (GPU) | S26 Ultra (CPU) |
|---|---|---|
| Descartes | 37 → 90 = 53 (**~0,3 %**) | 0 → 1903 = 1903 (**~10,5 %**) |
| Intervalo p95 (min 0 / 5 / 10, nativo) | 34 / 34 / 34 ms | 34 / 67 / 67 ms |
| Latencia p50 (min 0 / 5 / 10, nativo) | 35 / 38 / 35 ms | 28 / 56 / 60 ms |
| Detección | 99–100 % | 100 % |
| Térmico | 1 (LIGHT) estable | 0 |
| PSS | 825–852 MB | 749–816 MB |
| Cierres | 0 | 0 |

- **Pixel 7 Pro: cumple** 30 FPS, < 5 % de descartes y sin térmica SEVERE en 10 min.
- **S26 Ultra: no cumple** los descartes. A partir de ~5 min la inferencia en CPU tarda el doble sin que Android
  reporte estado térmico: bajada de frecuencia por carga sostenida. La elección de delegado se hace en los primeros
  ~2 s con el teléfono en frío, cuando la CPU gana. Siguiente: 10 min del S26 con GPU forzada.
