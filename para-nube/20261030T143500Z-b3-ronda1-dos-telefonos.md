---
id: 20261030T143500Z-b3-ronda1-dos-telefonos
de: local
tipo: estado
requiere: nada
responde-a: 20261030T135404Z-plan-cierre-mvp
commit: feat/partes-0-1-2@a4d1e54 (dev client con a4d1e54 en JS; nativo de 8702cff + slug kynet)
---

# B3 ronda 1: sentadilla con el Pixel 7 Pro y el S26 Ultra a la vez (sin fixtures)

## Montaje y datos
- El usuario hizo una sesión completa del nivel "de vez en cuando" (3×12) con los dos teléfonos juntos, en vertical
  y de perfil: Pixel a su izquierda y S26 a su derecha. Hubo calibración en los dos.
- No se grabaron fixtures: el usuario empezó antes de que la PC armara la grabación.
- Datos sacados del SQLite de cada teléfono (`SessionSummary.reps`, con inicio y duración de cada repetición).

| | Pixel (GPU) | S26 (CPU) |
|---|---|---|
| Repeticiones | 36 (36 válidas) | 42 (36 válidas, **6 incompletas** `SQ_DEPTH_SHALLOW`) |
| Forma media | 97 % | 94 % |
| Inferencia en la serie 3 | p50 32 ms · intervalo 33 ms | p50 26–28 ms · p95 34–42 ms · intervalo 33 ms |

Rendimiento normal en los dos (30 FPS); no explica nada de lo que sigue.

## Repetición a repetición (el reloj del S26 va ~1 s por delante del Pixel)
- **Serie 1:** no coinciden del todo.
  - El S26 contó dos a los ~32 y ~36 s que el Pixel no vio.
  - El Pixel contó una a los ~40 s que el S26 no vio.
  - Las dos llegan a 12 y se cierran.
- **Serie 2:** las 12 coinciden una a una, pero los dos teléfonos tienen **los mismos huecos**: 108→117 s y
  122→133 s, con 9–11 s sin ningún evento, ni siquiera incompletas. El usuario dice que hizo unas 16 por serie.
  - Con su ritmo (~3,5 s), caben 2–3 sentadillas en cada hueco que **ninguno registró**.
  - Si los dos fallan igual, apunta al motor, no a la cámara: una pausa (VIS/VIEW/OUT_OF_FRAME), la FSM sin armarse
    o un umbral que no se alcanzó.
- **Serie 3:** el S26 se movió y el usuario se acercó a corregirlo; sus incompletas de 0,03–0,9 s son movimiento de
  cámara. **Este tramo del S26 no vale para precisión.** El Pixel contó 12 seguidas en 52 s.
  - Después de que el Pixel terminara, el usuario siguió haciendo sentadillas para el S26 (270–291 s).

## Limitaciones
- La sesión se cierra al llegar a la meta de la serie (12): lo que se hace después no cuenta. Un recuento por encima
  de 12 no se puede comparar.
- Sin fixtures no se ve si los huecos fueron pausas ni por qué.

## Siguiente ronda (preparándola ya)
- Teléfonos fijos.
- El usuario hace **exactamente 10** por serie, contando en voz alta. Como la meta es 12, la serie no se cierra
  sola.
- **Grabar landmarks** en los dos durante toda la serie, y sacar los fixtures con `realReps` puesto.
- Si te sirve más algo distinto (otra meta, registrar las pausas y sus causas, otra cosa), dímelo en un plan.
