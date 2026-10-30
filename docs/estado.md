# Estado del proyecto (traspaso entre sesiones)

## Última actualización
2026-10-29, 18:45 (hora local de la PC). Sesión **local** (PC con Windows; Pixel 7 Pro por USB, sin nadie delante).

## Estado
- **Tubería de pose:** MediaPipe lite en modo `LIVE_STREAM`, resultados entregados en orden desde una cola,
  delegado elegido por teléfono midiendo CPU y GPU (S26 Ultra → CPU, Pixel 7 Pro → GPU), cámara a 30 FPS.
- **Parte 1, prueba final de 10 min (`34b8fb5`):**
  - **Pixel 7 Pro: cumple** (30 FPS, ~0,3 % de descartes, térmica LIGHT estable, memoria estable).
  - **S26 Ultra: no cumple** los descartes (~10,5 %): desde ~5 min la inferencia en CPU tarda el doble sin que
    Android reporte térmica. Pendiente: 10 min del S26 con GPU forzada.
- **Prueba de humo de la parte 3 en el Pixel (sin persona):** lista de ejercicios, colocación de los tres
  ejercicios, entrenamiento (pausa, seguir, terminar) y resumen funcionan sin errores de JS. Encontrados y
  corregidos:
  - `69992f6`: el motor no se creaba en el teléfono (worklets que usaban funciones declaradas más abajo:
    `createEngine → resolveConfig`, `fsmStep → finishCompleted`) y el esqueleto fallaba
    (`BLAZEPOSE_BONES` como valor por defecto). Test nuevo `tests/lint/workletOrder.test.ts`.
  - `c205b17`: fuga de ~80 MB por visita a una pantalla con cámara (MediaPipe sin `dispose()`); ahora estable.
- **No verificado:** conteo real de repeticiones en el teléfono, voz y vibración, prueba de 15 min de la parte 3
  (necesitan una persona).
- **Builds:** se compila en local (EAS gratuito no termina en 45 min). Metro con `NODE_OPTIONS=--max-old-space-size=4096`.
- **Coordinación:** buzón en la rama `coordinacion`.

## Mediciones
[`docs/spike-results.md`](spike-results.md)

## Decisiones tomadas
| Qué | Por qué | Coste si es errónea |
|---|---|---|
| `LIVE_STREAM` + cola de resultados | En síncrono la cámara esperaba a la inferencia; con "solo el último" se perdía el 17-19 % de las poses | Medio: latencia de ~1 cuadro más |
| Delegado por teléfono, medido al arrancar | El más rápido depende del chip | Bajo; el S26 elige CPU en frío y se degrada con carga sostenida |
| `v = min(visibility, presence)` | MediaPipe inventa puntos fuera de cuadro con visibility alta | Bajo |
| Sin orejas ni puntos de mano en el overlay; modelo lite | Pose no rastrea dedos; full no cabe en 30 FPS (decisiones del usuario) | Bajo |
| Helpers y constantes **antes** del worklet que los usa | El plugin captura el cierre al definir la función | Ninguno; lo vigila un test |
| `dispose()` del landmarker al desmontar | El recolector de JS no ve la memoria nativa y de GPU | Ninguno |

## Para decidir (usuario)
- S26 Ultra: ¿probar GPU con carga sostenida y, si aguanta, re-evaluar el delegado durante el uso?
- Resumen con 0 repeticiones: dice "¡Buen trabajo!" y "Sigue así". Propuesto a la nube cambiar el texto.

## Siguiente paso
Con una persona: 10 min del S26 con GPU; después, prueba de 15 min de la parte 3 contando repeticiones.

## Pendiente que requiere la PC o un teléfono
- Pruebas con persona: S26 con GPU, conteo real de los tres ejercicios, voz y vibración, 15 min de la parte 3.

## Pendiente que puede hacer la sesión remota
- Textos del resumen con 0 repeticiones; silueta guía (cabeza separada de los hombros, pies bajo el panel).
- `SQ_HEELS_LIFT` con el umbral de talones acordado.
