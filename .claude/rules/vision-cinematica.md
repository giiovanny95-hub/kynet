---
paths:
  - "src/kinematics/**"
  - "src/vision/**"
  - "src/features/workout/**"
  - "modules/**"
  - "app/workout/**"
---
# Visión, cinemática y entrenamiento: lecciones

- **Helpers y constantes se declaran ANTES del worklet que los usa.** El plugin de worklets captura el cierre al definir la función; si está debajo, en el teléfono es `undefined` (el motor no se creaba). Lo vigila `tests/lint/workletOrder.test.ts`. (69992f6)
- **Sin parámetros por defecto que lean constantes en worklets** (`BLAZEPOSE_BONES` como default rompía el esqueleto); haz el parámetro obligatorio. (69992f6, 2026-10-30)
- **`landmarker.dispose()` al desmontar.** El recolector de JS no ve la memoria nativa ni la de GPU de MediaPipe: había una fuga de ~80 MB por visita. (c205b17)
- **MediaPipe en `LIVE_STREAM` con cola de resultados;** cada resultado entra una sola vez al motor, con la marca de tiempo de su cuadro. En síncrono la cámara esperaba; con "solo el último" se perdía el 17-19 % de poses. (2026-10-29)
- **`frame.dispose()` siempre en `finally`** y `dropFramesWhileBusy: true`. (CLAUDE.md)
- **A JS solo cruzan eventos (`scheduleOnRN`), nunca datos por cuadro;** el HUD se publica solo cuando cambia. (spec-arquitectura)
- **El delegado (CPU/GPU) depende del teléfono:** S26 Ultra se degrada en CPU con carga sostenida sin reportar térmica; mide antes de cambiarlo. (34b8fb5)
- **FPS, térmica y conteo solo valen medidos en dispositivo real** (Pixel 7 Pro, S26 Ultra), nunca en emulador. (CLAUDE.md)
- **El reloj de la sesión sigue emitiendo estados tras `done`:** cualquier efecto "al terminar" necesita una guarda para ejecutarse una vez (se guardaban sesiones duplicadas). (2026-10-30)
- **No cambies umbrales para que pase un fixture;** propón el cambio con la razón (`/benchmark-fsm`). (CLAUDE.md)
- **Las faltas por umbral sobre señales ruidosas se miden con medianas en ventanas de tiempo (base de pie y pico), nunca con el máximo de la fase:** el máximo de ~75 cuadros con σ 0,008 dio un 3 % de avisos falsos de `SQ_HEELS_LIFT`; con medianas, 0/160. Las ventanas van en ms, no en cuadros (con térmica se baja a 20-25 FPS). (2026-10-30, A1)
- **Un aviso falso es peor que uno perdido:** 0 falsos es obligatorio; la sensibilidad puede quedar por debajo de la meta con el ruido extremo hasta medir el ruido real (fixtures de B3). (2026-10-30, A1)
