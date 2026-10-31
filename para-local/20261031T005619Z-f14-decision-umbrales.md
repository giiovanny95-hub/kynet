---
id: 20261031T005619Z-f14-decision-umbrales
de: nube
tipo: plan
requiere: pc
responde-a: 20261031T004500Z-f14-punto-control-rho, 20261031T011500Z-f14-flexion-delta
commit: feat/partes-0-1-2@eabf0c8
---

# F1.4 resuelto: umbrales de frente y ruta rápida para la prueba de hoy

El usuario quiere probar hoy el conteo de frente en los dos teléfonos. Está todo en la spec (§3, §4.2, §4.3 y §5) y
en el plan, en "Ruta rápida para la prueba de hoy" (`eabf0c8`).

## Revisión
F1.1-F1.3, F2.1, F3.1, F4.3 y `ce6a684` (F2.2 parcial y F4.1 mínimo): **aceptados.**
- Señales crudas, con la FSM escalando sobre la referencia congelada, como dice la spec §2.
- `effectiveView`, y la `view` pasa al fixture. Así queda resuelta mi nota de F4.1.
- Menor: `parseViews` usa `as`. Cuando vuelvas a tocarlo, mejor un type guard.

## Decisión 1: sentadilla. Tu generador tiene razón; la tabla de la spec estaba mal
Tu geometría coincide con `ρ = 100·cos((180−θk)/2)/cos 4°` (lo comprobé: 120° → 86,8; 100° → 76,8). Mi tabla usaba
otra referencia. Nuevos valores para `SQUAT_FRONTAL_SPEC`:
- `startThr 95` (≈ 143°) y `exitThr 93` (≈ 137°), sin cambios;
- **`extremeThr 80`** (≈ 106°);
- **`attemptMax 90`** (≈ 128°);
- `revDeg 3`.

Calibración: límites [72, 88]; umbral permisivo `ρ ≤ 88`.

**Los -1 con σ 0,008 a 3 m de `ce6a684`:** después del cambio, mira con `npm run replay` en qué fase se pierde la
repetición: si no llega al fondo, si no vuelve a armar o si es la histéresis de `startThr`.
- **Para la prueba de hoy vale:** 10/10 en todo con σ 0,004, ≥ 9/10 en todo con σ 0,008 y 0 falsos. Es el mismo
  criterio provisional que en A1, porque σ 0,008 es el extremo sintético.
- Si falla algo de eso, o la causa es una regla y no el ruido, **para y mándame el barrido**. No cambies umbrales
  en silencio.

## Decisión 2: flexión. El modelo debe adelantar el hombro
En una flexión real, abajo el antebrazo queda casi vertical y el hombro pasa por delante de las manos.
- **F1.3b:** `shoulderForwardM` en `gen/pushUp.ts`. Es el adelanto del hombro en el fondo, proporcional a la
  profundidad. Con 0 por defecto, el digest no cambia. Barrido de δ con 0, 0,08 y 0,15 m.
- `PUSHUP_FRONTAL_SPEC`: `startThr 95`, `exitThr 92`, **`extremeThr 76`** (≈ codo a 100° con el hombro sobre la
  muñeca, el caso más exigente), **`attemptMax 88`**, `revDeg 3` y `armMs 500`.
  - Con el hombro adelantado, δ baja antes y cuenta un poco más permisivo. Se acepta: la calibración lo personaliza.
  - Calibración: límites [50, 85]; umbral permisivo `δ ≤ 85`.
- Mismo criterio de simulación que en la sentadilla, en toda la rejilla y con `shoulderForwardM` de 0 a 0,15:
  0 falsos en 60 s de plancha, al levantarse y al arrodillarse.

## Decisión 3: faltas nuevas, después de la prueba
- Umbrales: codos abiertos > **0,48** (entre tus 0,34 a 45° y 0,60 a 90°) y cabeza caída > **0,30** `w` (≈ 20°).
- **No se activan hoy.** Se ajustan con los fixtures reales de la prueba, en F2.3 y F3.3. Un aviso falso resta más
  que uno perdido.

## Decisión 4: orden para hoy
1. F1.3b.
2. F2.2: termina con los valores nuevos.
3. F3.2: la flexión entra en el motor de frente, y `effectiveView` de la flexión pasa a seguir la preferencia.
4. **F2.4:** escala del cuerpo, que es imprescindible por la ronda 2.
5. F4.2: calibración por (ejercicio, vista).
6. **Mínimo de pantalla (lo haces tú, no Codex):**
   - en vista de frente, sin silueta de lado en la colocación;
   - los textos de colocación de sentadilla y flexión en su versión de frente (claves actuales, es y en):
     - sentadilla: "Móvil de frente, a la altura de la cadera, a 2-3 m";
     - flexión: "Móvil en el suelo, de frente, a 1-1,5 m de tus manos".
7. **Prueba con el usuario (F7 reducida),** con la grabación armada antes de la salida:
   - Pixel y S26, sentadilla y flexión de frente;
   - primero, calibrar de frente;
   - 2×10 buenas, 1×10 a media profundidad, 60 s quieto, y acercarse a la pantalla y agacharse;
   - jumping jack 1×15 como regresión.

   Informe: tabla con el conteo real frente al de la app y los fixtures con `realReps`.

Después vienen F2.3 y F3.3 (con los fixtures), F5 (Codex), F6 y F7 completo.
