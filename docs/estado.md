# Estado del proyecto (traspaso entre sesiones)

## Última actualización
2026-10-29, 16:40 (hora local de la PC). Sesión **local** (PC con Windows, S26 Ultra y Pixel 7 Pro por USB).

## Estado
- **Delegado automático (`17f2589`):** cada teléfono mide CPU y GPU la primera vez y guarda el ganador.
  S26 Ultra → CPU; Pixel 7 Pro → GPU.
- **S26 Ultra:** 30 FPS en pruebas cortas (intervalo p95 34 ms), detección 97–100 %, térmica 0. Inferencia
  p95 33–41 ms. **Falta su prueba de 10 min con el código actual.**
- **Pixel 7 Pro, prueba de 10 min (GPU):** ~25 FPS, ~16 % de descartes, inferencia p95 36–40 ms, térmica LIGHT
  estable, memoria estable (786–843 MB), detección 96 %. No cumple 30 FPS ni < 5 % de descartes.
- **Overlay:** sin orejas ni puntos de mano (decisión del usuario); landmarks con `v = min(visibility, presence)`.
- **Cámara a 30 FPS** (`constraints={[{ fps: 30 }]}`) en la spike y en las pantallas de entrenamiento.
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
- Pixel 7 Pro a ~25 FPS con su mejor delegado. Opciones: modo asíncrono `LIVE_STREAM` para no bloquear la
  cámara, aceptar ≥ 25 FPS en esa gama (la parte 3 ya pide "no caer de 25 FPS"), o MoveNet.

## Siguiente paso
Decisión del usuario sobre el Pixel; después, prueba de 10 min en el S26 Ultra con `17f2589`.

## Pendiente que requiere la PC o un teléfono
- Prueba de 10 min en el S26 Ultra con el código actual (necesita al usuario frente a la cámara).
- Prueba de 15 min de la parte 3 y grabaciones reales (Task 12 del plan de partes 3 y 4).

## Pendiente que puede hacer la sesión remota
- Bloques A y B del plan de las partes 3 y 4: **en espera de la decisión del usuario** sobre avanzar antes de
  cerrar la parte 1.
- Instalar `expo-audio` y `expo-haptics` (tarea 10): pendiente de aprobación del usuario.
