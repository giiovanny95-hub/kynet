# Plan: los tres ejercicios de frente (vista elegible)

> **Para quien ejecuta.** Las tareas `[claude]` las hace Claude Code en la PC, con `superpowers:executing-plans` y
> TDD. (Desde el 2026-10-31 no se delega en Codex: todo lo hace Claude Code.) Las tareas `[codex]` las delegaba Claude Code con `/delegar-codex` (worktree `feat/codex-<id>`, entrega por SHA;
> ver `docs/colaboracion-agentes.md`), revisa el resultado y lo integra. Una tarea, un commit. Spec: `docs/spec-vista-frontal.md`, que manda sobre este plan.
>
> **En paralelo:** Codex sigue con el plan de diseño (E2-E3) y Claude Code con este. Los dos tocan
> `app/workout/[exercise]/*` y los `locales`, así que **Claude Code serializa**: no lanza una tarea de Codex sobre un
> archivo que tenga con cambios sin subir.

**Objetivo:** contar y corregir sentadilla y flexión con el usuario de frente al móvil, viendo la pantalla, sin
romper el modo de lado.

**Verificación por tarea:** `npm run typecheck`, `lint`, `test` e `i18n:check` (o `npm run verify`).
Si la tarea toca `src/kinematics`, también `test:kinematics` y `/benchmark-fsm`, con los fixtures de lado sin cambios.

**Reglas que no se negocian aquí:**
- funciones de cinemática con `'worklet'`, y helpers y constantes **antes** del worklet que los usa
  (`tests/lint/workletOrder.test.ts`);
- sin parámetros por defecto que lean constantes;
- faltas con medianas por ventana en ms;
- 0 avisos falsos;
- no cambiar umbrales para que pase un fixture sin anotarlo en `decisions.md` con la razón.

---

## Ruta rápida para la prueba de hoy (decisión de la nube tras F1.4, 2026-10-31)
F0, F1.1-F1.3, F2.1, F3.1 y F4.3 (datos) están hechos y revisados. Umbrales fijados en la spec §3, §4.2, §4.3 y §5.

**Orden nuevo:**
1. **F1.3b:** `shoulderForwardM` en `gen/pushUp.ts`. Es el adelanto del hombro sobre las manos en el fondo,
   proporcional a la profundidad. Con 0 por defecto, la salida actual sigue idéntica. Barrido de δ con 0, 0,08 y
   0,15 m.
2. F2.2: tabla y referencia de la sentadilla de frente.
2b. **F2.2b `abortHoldMs`** (decisión del 2026-10-31):
   - campo nuevo en `ExerciseSpec` (`fsm/machine.ts`): en `DESCENDING`, una vuelta por encima de `exitThr` solo
     cierra la bajada si dura `abortHoldMs` seguidos, en tiempo efectivo;
   - 0 por defecto, así que lateral y jumping jack no cambian;
   - `SQUAT_FRONTAL_SPEC.abortHoldMs = 150`.
   - Tests:
     - el replay de la semilla 16 (h 0,9, d 3) da 10/10;
     - la rejilla de 27 × 20 da 10/10 con σ 0,004 y ≥ 9/10 con σ 0,008;
     - 0 falsos en 60 s de pie;
     - una bajada a ρ 87 da 1 incompleta;
     - lateral y benchmark sin cambios.
   - Si con 150 no llega, probar 200 e informar; más de 250, solo tras consultar.
3. F3.2: tabla y envoltorio de la flexión de frente (barrido con `shoulderForwardM` 0-0,15), con `abortHoldMs` desde
   150 y el mismo criterio de rejilla.
4. **F2.4:** escala del cuerpo. Es imprescindible antes de probar, por el fallo de la ronda 2.
5. F4.1: motor por (ejercicio, vista).
6. F4.2: calibración por vista.

**Mínimo de pantalla, lo hace Claude Code y no Codex, para no esperar:**
- en vista de frente, ocultar la silueta de lado en la colocación;
- los textos de colocación de sentadilla y flexión, en su versión de frente, en las claves i18n actuales (es y en).

El selector Frente/Lado, las siluetas de frente y el HUD grande siguen en F5 (Codex).

**Prueba de hoy (F7 reducida),** con la grabación armada antes de la salida:
- Pixel y S26, sentadilla y flexión de frente;
- calibración de frente primero;
- 2×10 buenas, 1×10 a media profundidad, 60 s quieto, y acercarse a la pantalla y agacharse;
- jumping jack 1×15 como regresión.

Informe: conteo real frente al de la app, y los fixtures con `realReps`.

**Después:** F2.3 y F3.3 (faltas, ajustadas con los fixtures de hoy), F5, F6 y F7 completo. Las faltas nuevas de
frente no se activan hasta tener los fixtures reales: un aviso falso resta más que uno perdido.

Si un test de conteo no pasa con estos umbrales, **no los cambies en silencio**: informa con el barrido y una
propuesta.

---

## F2.2c Guardia de sujeto con mediana (decisión del 2026-10-31; **la vista de frente está en pausa por el usuario**)
Con σ 0,008 a 3 m, el torso crudo varía ±15 % por cuadro. `quality/subjectGuard.ts` lo compara con el último cuadro
aceptado, lo toma como un salto > 30 % y emite `SUBJECT_CHANGED`, con lo que se pierde la repetición.
- [ ] Comparar con la **mediana del torso de los últimos 500 ms aceptados**, en lugar de con el último cuadro.
  - Mismo umbral del 30 % y 3 rechazos seguidos.
  - Vale para las dos vistas.
- [ ] Tests:
  - lateral y `test:benchmark` sin cambios;
  - un sujeto nuevo real (torso +40 % sostenido) sigue dando `SUBJECT_CHANGED`;
  - la rejilla de frente con σ 0,008 da ≥ 9/10 en todo;
  - 0 falsos de pie.

## F0 `[claude]` Herramientas de medición
- [ ] **F0.1 Reproductor en el repo.** El de la PC (con el que se analizó la ronda 2) pasa a
  `src/kinematics/tools/replay.ts`, más el script `npm run replay -- <fixture.json> [--profile <perfil.json>] [--view frontal|lateral]`.
  - Imprime cada evento (`REP` con resultado y código, `FEEDBACK`, `PAUSE` con causa) con su tiempo.
  - Test: un fixture sintético de 3 repeticiones da exactamente 3 `REP valid`.
- [ ] **F0.2 Etiquetas en el grabador** (`src/vision/fixtureRecorder.ts`):
  - el fixture guarda `view`, el perfil usado y `realReps` (que se rellena después a mano);
  - un modo que arma la grabación **antes** de la cuenta atrás (lección de la ronda 2);
  - solo en `__DEV__`, sin vídeo, solo landmarks.
  - Test del formato.
- [ ] **F0.3 Causa de `PAUSE` visible en el registro de desarrollo** (C1 de la ronda B3, que estaba pausado). Sin
  cambio de comportamiento.

## F1 `[claude]` Generadores con perspectiva (`src/kinematics/tools/gen/`)
- [ ] **F1.1 `camera.ts`:** proyección estenopeica pura con `heightM`, `distanceM`, `pitchDeg`, `fovDeg` (75 por
  defecto) y `yawDeg` del cuerpo. Convierte a unidades del cuadro de 480×640 en vertical.
  - Tests: un punto a la altura de la cámara cae en el centro vertical; al alejarse, el tamaño se reduce como 1/d.
- [ ] **F1.2 Sentadilla 3D de frente:** `gen/squat.ts` acepta `camera?`. Si se pasa, construye el esqueleto en 3D
  (segmentos de spec §8, ancho de hombros 0,38 m y de caderas 0,30 m) y lo proyecta.
  - Opciones nuevas: `kneesInFrac` (rodillas hacia dentro en el fondo) y `approachCamera` (la persona se acerca a
    0,8 m y se agacha, el caso de la ronda 2).
  - Sin `camera`, la salida es **idéntica** a la actual (test de regresión con la misma semilla).
- [ ] **F1.3 Flexión vista desde el suelo:** `gen/pushUp.ts` con `camera` a 0,05-0,3 m de altura y 1-1,5 m de las
  manos.
  - Opciones: `elbowFlareDeg`, `headDropDeg`, `hipSagDeg` y `hipPikeDeg` (para F6), `plankHoldS`, y
    `standUpAfter` (levantarse al terminar).
- [ ] **F1.4 Barrido de geometría** (test): comprobar con los generadores los valores de la spec (§3: ρ a 170, 120,
  100 y 90°; §4.2: `δ` abajo) en las colocaciones extremas. Si salen fuera de la tabla de la spec, **parar e
  informar** en `para-nube/` con los números antes de ajustar umbrales.

## F2 `[claude]` Sentadilla de frente
- [ ] **F2.1 Señales:** `src/kinematics/signals/squatFrontal.ts`, con `rho`, `lambda`, `kappa`, `kneeRatio` y
  `scale`, y `null` si falta una articulación. Tests con poses sintéticas.
- [ ] **F2.2 Tabla y referencia:** `SQUAT_FRONTAL_SPEC` en `fsm/exercises/squat.ts`; referencia de pie congelada al
  armar (spec §2). Tests:
  - 10/10 con σ 0,004 y 0,008 sobre la rejilla de colocación (altura 0,6/0,9/1,2 m × distancia 2/2,5/3 m ×
    guiñada −15/0/15°), con 20 semillas;
  - incompletas en la banda de intento;
  - 60 s de pie: 0.
- [ ] **F2.3 Faltas:** `SQ_KNEES_IN` y `SQ_TRUNK_LEAN` de frente. Test: 0 falsos en las series buenas de F2.2 y
  ≥ 85 % de detección con `kneesInFrac` y con inclinación.
- [ ] **F2.4 Escala del cuerpo** (spec §4.4, común a las dos vistas). Test: `approachCamera` da **0 conteos**, y las
  series buenas no pierden ninguna.

## F3 `[claude]` Flexión de frente
- [ ] **F3.1 Señales:** `signals/pushUpFrontal.ts`, con `delta`, `w`, `flare`, `headDrop`, `plankOk` (spec §4.1) y
  `scale`.
- [ ] **F3.2 Tabla y envoltorio:** `PUSHUP_FRONTAL_SPEC` y `pushUpFrontalStep`, con el mismo patrón que `pushUpStep`
  (sin plancha no arma; más de 1 s sin plancha en una repetición da `PU_POSITION`). Tests:
  - 10/10 con σ 0,004 y 0,008 sobre la rejilla (altura 0,05/0,15/0,3 m × distancia 1/1,25/1,5 m), con 20 semillas;
  - 60 s en plancha: 0;
  - levantarse y arrodillarse: 0.
- [ ] **F3.3 Faltas nuevas:** `PU_ELBOWS_FLARE` y `PU_HEAD_DROP` en `feedback/codes.ts`, con severidad y textos i18n
  (es y en):
  - `PU_ELBOWS_FLARE`: "Codos más pegados al cuerpo";
  - `PU_HEAD_DROP`: "Mira al frente, cuello neutro";
  - `PU_POSITION` de frente: "Ponte en plancha mirando al móvil".

  Test: 0 falsos en lo bueno y ≥ 85 % de detección.

## F4 `[claude]` Motor, calibración y preferencia
- [ ] **F4.1 Motor:**
  - `engine.ts`: `resolveConfig` elige la tabla por `(ejercicio, vista)`;
  - `requiredJoints(ejercicio, vista, lado)`;
  - `defaultView` devuelve `'frontal'`;
  - el código de vista equivocada sale de la vista elegida;
  - `src/vision/useWorkoutPipeline.ts`: la `view` del fixture grabado sale de la preferencia (hoy se deduce del ejercicio).

  Tests del motor con fixtures de las dos vistas. **Los tests de lado actuales pasan sin cambios.**
- [ ] **F4.2 Calibración:**
  - límites, umbrales permisivos y ROM mínima por vista (spec §5) en `calibration/calibrator.ts`;
  - `scale` en `CalibrationProfile`;
  - `calibrationStore` indexado por `(ejercicio, vista)`.
  - Tests: un perfil de lado no vale de frente; un perfil viejo sin `scale` sigue valiendo de lado.
- [ ] **F4.3 Preferencia:** `Prefs.exerciseView` con su valor por defecto y `parsePrefs` tolerante (test). La app
  pasa `view` al motor en `setup` y `live`, solo el cableado y sin UI nueva.
- [ ] **F4.4 Contrato para Codex:** un mensaje corto en el commit o en `para-nube/` con los nombres exactos que usará
  F5: preferencia, claves i18n, códigos nuevos y función para leer o guardar la vista.

## F5 `[claude]` Pantallas (sustituida por H3 y H7 de `2026-10-31-diseno-v2-guias.md`)
Delegación: `/delegar-codex F5.x` con alcance `app/workout/[exercise]/*`, `src/ui/silhouettes*`, `src/features/workout/placement*`
y `locales`; contexto: `AGENTS.md`, `docs/spec-vista-frontal.md` §5 y `docs/spec-diseno.md`.
- [ ] **F5.1 Selector Frente/Lado** en `app/workout/[exercise]/setup.tsx`:
  - `Segmented` de `src/ui`, solo en sentadilla y flexión;
  - guarda `Prefs.exerciseView` y reinicia la colocación al cambiar.
- [ ] **F5.2 Guías y siluetas de frente:**
  - `src/ui/silhouettes.ts` con siluetas frontales de sentadilla y de plancha vista desde el suelo (con test, como
    las actuales);
  - los textos de colocación por vista (`placement.squat.frontal`, etc.) con las distancias de la spec §5.
- [ ] **F5.3 HUD legible a distancia** en `live.tsx`: contador ≥ 96 dp y aviso ≥ 28 dp, coordinado con E2.8 (si E2.8
  ya está hecho, se ajusta ahí). Sin efectos nuevos sobre la cámara.
- Verificación: los checks y capturas del Pixel de las dos vistas en `docs/diseno/capturas/`.

## F6 `[claude]` Spike 3D de la cadera en la flexión de frente
- [ ] **F6.1** `HybridPoseLandmarker.kt`: `worldLandmarks()` detrás de un flag de desarrollo. Con el flag apagado,
  `audit_performance.sh` da lo mismo que antes.
- [ ] **F6.2** Medición en el Pixel con el usuario (spec §6). Informe en `para-nube/` con los números. **La nube
  decide** si la cadera de frente entra; no se integra sin ese visto bueno.

## F7 `[claude]` + usuario: prueba en los teléfonos
Protocolo por teléfono (Pixel 7 Pro y S26 Ultra), de frente. La grabación (F0.2) se arma **antes** de la salida.
1. Calibración de frente de sentadilla y flexión.
2. Sentadilla: 3×10 buenas; 1×10 con 5 a media altura; 1×10 con las rodillas hacia dentro; 60 s de pie; acercarse a
   la pantalla y agacharse.
3. Flexión: 3×10 buenas; 1×10 con codos abiertos; 60 s en plancha; levantarse al terminar.
4. Jumping jack: 2×15 (regresión).
5. `bash scripts/audit_performance.sh com.kynet.app.dev 300` durante una serie: sin empeorar respecto a la última
   medición.

**Informe:** tabla por teléfono, ejercicio y serie con el conteo real frente al de la app, los avisos y los
fixtures (con `realReps`) en la PC. Lo que no se pudo medir se dice.

**Criterio de aceptación del plan:**
- los criterios de la spec §1;
- el modo de lado sin regresiones;
- el usuario elige la vista y se acuerda entre sesiones;
- capturas de las dos vistas.
