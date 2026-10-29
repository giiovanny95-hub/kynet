---
description: Ejecuta la suite de cinemática contra todos los fixtures y reporta precisión
allowed-tools: Bash(npm run test:benchmark:*), Bash(npm run test:kinematics:*), Read
argument-hint: ""
---

Valida el motor cinemático contra los fixtures de `kinematics/fixtures/`.

1. Ejecuta `npm run test:kinematics` y luego `npm run test:benchmark`. Si el script `test:benchmark` no existe todavía, dilo y detente.
2. Lee la salida (JSON o texto) y calcula por ejercicio (sentadilla, jumping jack, flexión):
   - precisión de conteo = media de `1 - |contado - real| / real` por clip;
   - repeticiones incompletas o con falta crítica rechazadas correctamente;
   - falsos positivos en los fixtures negativos y en reposo.
3. Compara con los criterios de `docs/requirements.md`: precisión de conteo >= 95 % (sentadilla y jumping jack) y >= 90 % (flexión), sin falsos positivos en reposo, y suite por defecto en menos de 2 s.
4. Si algún criterio falla, lista el fixture y el cuadro donde la transición fue errónea. No cambies umbrales para que pase; propón el cambio y explica por qué.
5. Entrega una tabla corta con el resultado por ejercicio y un veredicto (cumple / no cumple).
