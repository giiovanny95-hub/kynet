---
id: 20261031T010859Z-f22-decision-histeresis
de: nube
tipo: plan
requiere: pc
responde-a: 20261031T020000Z-f22-histeresis
commit: feat/partes-0-1-2@1c6bb36
---

# F2.2: opción 2 parametrizada (`abortHoldMs`); la prueba de hoy sigue

Buen diagnóstico con el replay. **La regla nueva de la referencia está aceptada:** sube libre y solo baja tras 1,5 s
seguidos bajo la zona de inicio sin armar. Ya está en la spec §2 y en `decisions.md`.

## Decisión: opción 2, sin tocar la vista de lado (F2.2b, antes de F3.2)
- **Campo nuevo en `ExerciseSpec`** (`src/kinematics/fsm/machine.ts`): `abortHoldMs`.
  - En `DESCENDING`, una vuelta por encima de `exitThr` solo cierra la bajada (incompleta o ignorada) si dura
    `abortHoldMs` seguidos, en **tiempo efectivo** (ms, no cuadros, por la térmica).
  - Si la señal vuelve a bajar antes, la repetición sigue como si nada.
- **0 por defecto:** lateral y jumping jack quedan idénticos.
- **`SQUAT_FRONTAL_SPEC.abortHoldMs = 150`** [H].
- **Por qué no la opción 1 sola:** con ±4 puntos de ruido, 2-3 puntos más de histéresis siguen cruzándose, y bajar
  `exitThr` retrasa el inicio y el tempo.
- **Por qué no la 3 sola:** el fallo es de una regla, no del umbral. Igual aparecerá con ruido real más bajo, solo
  que menos a menudo.

**Tests:**
- replay de la semilla 16 (h 0,9, d 3, σ 0,008): 10/10;
- rejilla de 27 × 20: 10/10 en todo con σ 0,004 y **≥ 9/10 en todo con σ 0,008**;
- 0 falsos en 60 s de pie;
- una bajada que se queda en ρ 87 sigue dando exactamente 1 incompleta;
- **vista de lado sin cambios:** suite y `test:benchmark` iguales.

Si con 150 no llega, prueba 200 e informa. Más de 250 solo tras consultarme: empezaría a perder sentadillas
rápidas.

**F3.2 (flexión de frente):** el mismo mecanismo y el mismo criterio de rejilla, con `abortHoldMs` desde 150 y
`shoulderForwardM` de 0 a 0,15.

## Prueba de hoy
Que siga en paralelo con lo que ya hay en los teléfonos. En el informe, marca las **incompletas poco profundas que
no lo eran** (el patrón de este fallo) y guarda sus fixtures: dirán si σ 0,008 a 3 m es realista. Cuando
`abortHoldMs` esté subido, repite al menos una serie de 10 de frente en cada teléfono.
