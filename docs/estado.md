# Estado del proyecto (traspaso entre sesiones)

## Última actualización
2026-10-29, 13:45 (hora local de la PC). Sesión **local** (PC con Windows, S26 Ultra por USB).

## Estado
- **Funciona en el S26 Ultra:** build de desarrollo instalada, cámara frontal, MediaPipe detectando
  (97–100 %), esqueleto Skia alineado con el cuerpo (giro a vertical en Kotlin y cover en el overlay),
  mano izquierda correcta en espejo, sin cierres.
- **Medido:** prueba de ~12 min en el S26 Ultra (ver Mediciones). No cumple los criterios de rendimiento
  de la parte 1; la térmica sí.
- **No medido:** Pixel 7 Pro (sin conectar); prueba de 10 min con inferencia p95 y lecturas a 0/5/10 min;
  delegado real de MediaPipe (GPU o CPU).
- **Builds:** EAS en la nube no termina en 45 min (plan gratuito, se cuelga en el C++). Se compila en
  local: JDK 17 Temurin, SDK en `C:\Android\sdk`, CMake 3.31.6 en `android/local.properties`
  (`cmake.dir`), porque el ninja de CMake 3.22.1 no admite rutas de más de 260 caracteres.

## Mediciones
[`docs/spike-results.md`](spike-results.md)

## Decisiones tomadas en esta sesión
| Qué | Por qué | Coste si es errónea |
|---|---|---|
| `pixelFormat: 'yuv'` en la spike | `PRIVATE` no se admite en ImageAnalysis a 640×480 en el S26 y `toBitmap()` no lo acepta | Bajo: una línea; `rgb` sigue pendiente de probar (checklist §6) |
| Girar landmarks en Kotlin (`toUpright`) | MediaPipe devuelve coordenadas del buffer sin girar aunque reciba `rotationDegrees` | Medio: si un dispositivo se comporta distinto, el esqueleto saldría girado; contrato actualizado |
| Overlay con cover y proporción real del cuadro | La vista previa recorta los lados; sin esto las extremidades quedaban corridas | Bajo |
| Descartes deducidos de los huecos (`inferredDropped`) | VisionCamera 5 nunca llama a `onFrameDropped` en Android | Bajo: si la cámara variara su periodo, contaría de más |
| Inferencia p95 aparte del intervalo p95 | El criterio "p95 < 33 ms" es de latencia; el intervalo está cuantizado | Ninguno |
| Build `development` en EAS solo `arm64-v8a` | Acortar la compilación; los dos teléfonos son arm64 | Bajo: preview y production no cambian |

## Siguiente paso
**Paso C:** registrar el delegado de PoseLandmarker con `Log.i`, cerrar el landmarker al liberar el
HybridObject, y medir por separado: (1) Bitmap reutilizado, (2) `MediaImageBuilder` con `image.image`,
(3) bajar resolución. Repetir la prueba de 10 min tras cada cambio.

## Pendiente que requiere la PC o un teléfono
- Paso C completo (cambios nativos, compilación local y medición en el S26).
- Prueba de 10 min con lecturas a 0, 5 y 10 min.
- Pixel 7 Pro: conectar por USB y repetir el Paso B.

## Pendiente que puede hacer la sesión remota
- Plan de las partes 3 y 4 (superpowers:writing-plans).
- Pendientes menores de la revisión: `tMs` NaN en el primer cuadro, contador de la guarda de sujeto,
  `RESUME` tras `SUBJECT_CHANGED`, test de lint para `'worklet'`, umbral 0,3 repetido, `tExtremeMs` del
  jumping jack.
- Carrera `onFrameDropped`/`onFrame` en la spike: en Android `onFrameDropped` nunca se llama, así que
  solo aplica a iOS.
