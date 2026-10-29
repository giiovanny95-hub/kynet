# Resultados del spike de cámara y pose (parte 1)

Criterios de salida (`pose-spike-research.md` §6 y `requirements.md` §3, parte 1): pose a **30 FPS**
sostenidos, **inferencia p95 < 33 ms**, **< 5 % de cuadros descartados** y **sin térmica SEVERE** en 10 min,
en el Galaxy S26 Ultra y en el Pixel 7 Pro.

Configuración común: build de desarrollo (debug, `arm64-v8a`), cámara frontal, `pixelFormat: 'yuv'`,
`targetResolution` VGA 4:3 (640×480), MediaPipe PoseLandmarker lite (float16) en modo VIDEO, una persona a
unos 2 m, de pie y moviéndose poco. Las métricas salen del HUD de la pantalla `spike`; memoria con
`adb shell dumpsys meminfo com.fitpose.app.dev` y térmica con `adb shell dumpsys thermalservice`.

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

## Pixel 7 Pro

Pendiente: aún no se ha conectado.
