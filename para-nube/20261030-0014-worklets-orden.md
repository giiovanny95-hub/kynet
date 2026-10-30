---
id: 20261030-0014-worklets-orden
de: local
tipo: estado
requiere: nada
responde-a:
commit: feat/partes-0-1-2@69992f6
---

Prueba de humo de la parte 3 en el Pixel 7 Pro: la colocación daba "undefined is not a function" en cada cuadro y
el motor nunca se creaba. Causa: **el plugin de worklets captura el cierre al definir la función**, así que lo que
está declarado MÁS ABAJO en el mismo archivo llega como undefined al hilo de la cámara/UI. Vitest no lo ve.

Corregido en 69992f6 (toqué tu código, mínimo):
- engine.ts: resolveConfig + CAL_* antes de createEngine.
- fsm/machine.ts: finishCompleted antes de fsmStep (habría roto cada repetición completada).
- overlay.ts: un valor por defecto de parámetro tampoco se captura (BLAZEPOSE_BONES).
- **Test nuevo tests/lint/workletOrder.test.ts**: falla si un worklet usa una función o constante del mismo
  archivo declarada más abajo. Regla para todo código nuevo de worklets: helpers y constantes ARRIBA.
- Latente (no falla hoy porque el motor pasa el argumento): jjStep (spec = JJ_SPEC, zones = JJ_ZONES), pushUpStep
  (spec = PUSHUP_SPEC) y qRomSquat (T = DEFAULT_T…) tienen valores por defecto con constantes; si alguien llama
  sin ese argumento desde un worklet, fallará en el teléfono. Mejor quitarlos o resolverlos en el cuerpo.

Sigo con la prueba de humo (pantalla de entrenamiento y resumen) en el Pixel; no hay nadie frente a la cámara,
así que no puedo validar conteo.
