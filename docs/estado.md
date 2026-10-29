# Estado del proyecto (traspaso entre sesiones)

## Última actualización
2026-10-29, 14:55 (hora local de la PC). Sesión **local** (PC con Windows, S26 Ultra por USB).

## Estado
- **Funciona en el S26 Ultra:** build de desarrollo, cámara frontal, MediaPipe en **CPU** detectando
  (97–100 %), esqueleto Skia alineado con el cuerpo, mano izquierda correcta en espejo, sin cierres.
- **Paso C hecho (pruebas cortas):** la tubería va a **30 FPS** (intervalo p95 34 ms) con pocos descartes.
  La inferencia p95 nativa queda en 33–41 ms (criterio propuesto: < 33 ms): no cumple ese punto; el resto sí.
  Detalle y tabla en `docs/spike-results.md`.
- **No medido:** prueba de 10 min tras el Paso C (lecturas a 0/5/10 min); Pixel 7 Pro (sin conectar).
- **Builds:** EAS en la nube no termina en 45 min (plan gratuito). Se compila en local: JDK 17 Temurin,
  SDK en `C:\Android\sdk`, CMake 3.31.6 en `android/local.properties` (`cmake.dir`).
- **Coordinación:** buzón en la rama `coordinacion` (ver su `README.md`).

## Mediciones
[`docs/spike-results.md`](spike-results.md)

## Decisiones tomadas en esta sesión
| Qué | Por qué | Coste si es errónea |
|---|---|---|
| `pixelFormat: 'yuv'` en la spike | `PRIVATE` no se admite en ImageAnalysis a 640×480 en el S26 y `toBitmap()` no lo acepta | Bajo |
| Girar landmarks en Kotlin (`toUpright`) | MediaPipe devuelve coordenadas del buffer sin girar aunque reciba `rotationDegrees` | Medio: contrato actualizado |
| Overlay con cover y proporción real del cuadro | La vista previa recorta los lados | Bajo |
| Descartes deducidos de los huecos (`inferredDropped`) | VisionCamera 5 nunca llama a `onFrameDropped` en Android | Bajo |
| Inferencia p95 aparte del intervalo p95 | El criterio "p95 < 33 ms" es de latencia; el intervalo está cuantizado | Ninguno |
| **Delegado CPU antes que GPU** | Lite en S26: CPU ~25 ms vs GPU ~46 ms de mediana | Bajo: una línea; re-medir en el Pixel 7 Pro (su GPU/TPU puede comportarse distinto) |
| **Métricas fuera del camino de cada cuadro** | Copiar el estado entre hilos y ordenar en cada cuadro costaba ~7 FPS | Ninguno; la parte 3 debe seguir la misma regla: nada de objetos grandes en SharedValues por cuadro |
| Build `development` en EAS solo `arm64-v8a` | Acortar la compilación | Bajo |

## Contradicción abierta (la decide el usuario)
- Criterio "inferencia p95 < 33 ms" (`pose-spike-research.md` §6, marcado como propuesto) frente a lo medido
  (33–41 ms con 30 FPS sostenidos). Opciones: ajustar el criterio a "30 FPS sostenidos con < 5 % de
  descartes", probar el modelo *full* o *heavy* no (son más lentos), o plan B MoveNet (requiere aprobación).

## Siguiente paso
Prueba de 10 min en el S26 Ultra con el código `e4bafd8` y lecturas automáticas a 0, 5 y 10 min.

## Pendiente que requiere la PC o un teléfono
- Prueba de 10 min (necesita al usuario frente a la cámara).
- Pixel 7 Pro: conectar por USB y repetir; comprobar allí también CPU frente a GPU.

## Pendiente que puede hacer la sesión remota
- Bloques A y B del plan de las partes 3 y 4: **en espera de la decisión del usuario** sobre avanzar antes de
  cerrar la parte 1.
- Instalar `expo-audio` y `expo-haptics` (tarea 10): pendiente de aprobación del usuario.
