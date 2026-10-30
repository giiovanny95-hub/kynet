# Plan: cierre del MVP (partes 3-6)

> **Para quien ejecuta (PC):** usa `superpowers:executing-plans` (o `subagent-driven-development`) y
> `test-driven-development`. Marca cada paso con `- [x]`. Al final de cada bloque: skill `cerrar-sesion` y mensaje
> `tipo: estado` en `para-nube/`.

**Objetivo:** dejar el MVP con **todos** los criterios de aceptación de `docs/requirements.md` §3 medidos (no
supuestos) y cerrar las dos piezas de código que faltan.

**Qué falta medir:**
- Parte 2: precisión de conteo >95 % con personas reales; hasta ahora solo con fixtures.
- Parte 3: 15 min sin bajar de 25 FPS; audio y háptica sin retardo.
- Parte 4: flexiones >90 % en sesión controlada.
- Parte 5: Google funciona y la app funciona sin conexión.

**Código pendiente:**
- `SQ_HEELS_LIFT` (spec-cinematica §7): no existe en `src/kinematics`.
- Descargar sesiones de otros dispositivos (spec-datos-supabase §4.4).

**Fuera de este plan:** el OAuth de Google lo configura el usuario (pasos en `docs/estado.md`, "Para decidir").

**Orden:**
1. A1 y A2, sin persona delante.
2. En paralelo, B2 y B4, que solo requieren el teléfono.
3. B3, con persona.
4. B1, cuando exista el OAuth.
5. B5, cuando haya tiempo con el S26.

---

## Bloque A: código (TDD, sin persona)

### A1. Falta `SQ_HEELS_LIFT`

**Spec** (spec-cinematica §7):
- Sentadilla.
- El talón sube respecto al tobillo más de un **2 % del alto del cuadro**.
- Solo se evalúa si el talón y el tobillo del mismo lado tienen `v >= 0.8` durante la fase. Si no, queda
  desactivada en esa repetición, sin aviso.
- Severidad media. La spec no fija la penalización: se usa `P_SOFT_MILD` = 0,10, igual que `SQ_TRUNK_LEAN`, la otra
  falta media de sentadilla. Anótalo en `docs/decisions.md`.
- Requiere los 33 puntos: con `movenet17` (`capabilities.heel = false`) no existe.

**Medida propuesta:**
- Coordenadas en unidades de alto de cuadro, con `y` hacia abajo.
- Por lado: `h = ankle.y − heel.y`. Crece cuando el talón sube.
- Elevación de la repetición: `max(h en la fase) − h al inicio del descenso`. Se toma el lado con mejor visibilidad
  que cumpla `v >= 0.8` en todos los cuadros de la fase.
- Si ningún lado cumple, el valor es `null` (desactivada).

**Archivos:**
- `src/kinematics/feedback/codes.ts`: nuevo código `SQ_HEELS_LIFT` con severidad `medium`, en el mismo patrón que
  `SQ_TRUNK_LEAN`.
- `src/kinematics/signals/squat.ts`: si las señales por cuadro se calculan aquí, añadir
  `heelLift: number | null` con `optional: ['lHeel', 'rHeel']`.
- `src/kinematics/engine.ts`:
  - `RepAcc`: nuevo campo `heelLiftMax: number | null` y `heelBase` para el `h` inicial.
  - Acumulación junto a `tauBottom` (cerca de la línea 395).
  - Regla en `softFaults()`: `> HEEL_LIFT_MIN` (0,02) → `faults.push('SQ_HEELS_LIFT')` y
    `penalties.push(P_SOFT_MILD)`.
  - **Las constantes nuevas se declaran ANTES de los worklets que las usan** (regla
    `.claude/rules/vision-cinematica.md`).
- `src/i18n/locales/es.json` y `en.json`: `feedback.SQ_HEELS_LIFT`. Español: "Mantén los talones en el suelo".
  Inglés: "Keep your heels down".

**Pasos:**
- [ ] 1. Tests que fallan en `src/kinematics/__tests__/softFaults.test.ts`, con el generador sintético que ya usan
  los tests de `SQ_TRUNK_LEAN`:
  - talón que sube un 3 % en el fondo, con `v` 0,9 → contiene `SQ_HEELS_LIFT` y `q` × 0,9;
  - sube un 1 % → no la contiene;
  - sube un 3 % pero con `v` del talón en 0,75 → no la contiene y no hay aviso;
  - con el modelo `movenet17` → nunca aparece.
- [ ] 2. Ejecuta `npm run test:kinematics`: los nuevos fallan por la razón esperada.
- [ ] 3. Implementa la señal, el acumulador y la regla.
- [ ] 4. Ejecuta `npm run test:kinematics`, `npx vitest run tests/lint/workletOrder.test.ts` y
  `npm run i18n:check`: todo en verde.
- [ ] 5. Ejecuta `/benchmark-fsm`: la precisión de conteo no baja en ningún fixture.
- [ ] 6. Commit: `feat(cinemática): SQ_HEELS_LIFT con talón y tobillo visibles (spec §7)`.

**Criterio:** tests en verde, sin regresión del benchmark y sin avisos falsos en los fixtures de sentadilla
correcta.

### A2. Descarga de sesiones de otros dispositivos

**Spec** (spec-datos-supabase §4.4):
- Tras el login o una reinstalación: las sesiones de los últimos 90 días.
- Después, de forma incremental.
- RLS ya limita la lectura a las sesiones propias, con `deleted_at is null`.

**Archivos:**
- `src/data/types.ts`: añadir a `LocalStore` el método
  `importRemoteSessions(list: readonly SessionSummary[], ownerUserId: string): Promise<number>`.
  - Inserta solo las que no existen; si ya existe una local con el mismo id, gana la local.
  - Crea su elemento de cola con `status: 'done'`, para que no se vuelvan a subir.
  - Devuelve cuántas insertó.
- `src/data/sqliteStore.ts` y `src/data/memoryStore.ts`: la implementación. En SQLite, en una transacción con
  `INSERT OR IGNORE`.
- `src/sync/pull.ts`, nuevo:
  - `fromRemoteRows(rows: RemoteSessionRow[]): SessionSummary[]`, puro:
    - fila con `exercises(code)` y `rep_summaries(*)` anidados;
    - convierte `started_at` y `ended_at` a ms, `local_date` tal cual y `status`;
    - las repeticiones se ordenan por `rep_index` y se mapean a `RepRow`;
    - descarta filas con un código de ejercicio desconocido.
  - `pullSessions(supabase, store, userId, sinceIso)`:
    - consulta
      `supabase.from('workout_sessions').select('id, started_at, ended_at, tz, local_date, status, active_seconds, reps_total, reps_valid, avg_form_score, updated_at, exercises(code), rep_summaries(rep_index, t_start_ms, duration_ms, form_score, valid, fault_codes)')`;
    - filtra con `.gte('updated_at', sinceIso)`, ordena por `updated_at` y limita a 200;
    - importa con `importRemoteSessions` y devuelve el `updated_at` máximo.
- `src/sync/syncService.ts`:
  - En `doSync()`, después de subir la cola, llama a `pullSessions` con el cursor de la clave `last_pull_at` del
    almacén. Si no existe, desde hace 90 días.
  - Guarda el nuevo cursor y corta en silencio si hay error.
  - `signOut()` en `src/auth/accountService.ts` borra `last_pull_at`.

**Pasos:**
- [ ] 1. Tests que fallan:
  - en `src/data/store.contract.test.ts` (corre contra memoria y SQLite): importar dos sesiones →
    `listSessions` las devuelve, `pendingCount(U)` es 0 y reimportarlas devuelve 0; una sesión local con el mismo
    id no se sobrescribe;
  - en `src/sync/sync.test.ts`: `fromRemoteRows` con dos filas de ejemplo, una con repeticiones desordenadas y
    otra con un ejercicio desconocido → una sesión con las repeticiones en orden.
- [ ] 2. Comprueba que fallan; implementa; comprueba que pasan.
- [ ] 3. Ejecuta `npm run typecheck`, `npm run lint`, `npm run test` y `npx expo export --platform android`.
- [ ] 4. Commit: `feat(sync): descarga de sesiones de otros dispositivos (spec-datos §4.4)`.

**Criterio:**
- Tests en verde.
- Cuando exista el OAuth: en un teléfono limpio, al iniciar sesión con una cuenta que ya tiene sesiones, Progreso
  las muestra en menos de 1 min.

---

## Bloque B: medición en dispositivo (con evidencia; `tipo: bloqueo` si falta el usuario)

Para cada prueba, informa el commit probado, el teléfono, las cifras y las capturas o logs relevantes.
**No la declares cumplida sin medirla.**

### B1. Login con Google (cuando el usuario termine el OAuth)
- [ ] 1. Haz una sesión sin cuenta; en el resumen sale "Guardar mi progreso con Google". Inicia sesión.
- [ ] 2. Perfil dice "Todo sincronizado".
- [ ] 3. Con el conector de Supabase, sobre `kynet-dev` (comprueba el ref):
  - `workout_sessions` y `rep_summaries` tienen la sesión;
  - `gamification_state.total_xp` coincide con el XP de la app.
- [ ] 4. "Exportar mis datos" abre la hoja de compartir con un JSON que contiene la sesión.
- [ ] 5. Cierra la sesión y vuelve a entrar: no se duplica nada.
- [ ] 6. Borra **solo una cuenta de prueba**: la app vuelve al onboarding y el usuario desaparece de `auth.users`.

**Criterio:** los seis puntos, con evidencia.

### B2. Funciona sin conexión (parte 5)
- [ ] 1. Activa el modo avión y haz una sesión corta: se guarda y Hoy dice "Provisional hasta sincronizar".
- [ ] 2. Cierra la app del todo y vuelve a abrirla: la sesión sigue en Progreso.
- [ ] 3. Con sesión iniciada (si el OAuth ya existe): quita el modo avión y lleva la app a primer plano. Perfil pasa
  a "Todo sincronizado" en menos de 1 min.

**Criterio:** sin pérdidas ni duplicados; el paso 3 queda pendiente hasta B1 si aún no hay OAuth.

### B3. Precisión de conteo con persona (partes 2 y 4)
- [ ] 1. En el Pixel:
  - sentadilla, de lado: 3 series de 10 repeticiones reales;
  - jumping jack, de frente: 3 × 10;
  - flexión, de lado: 3 × 10.
  - El usuario cuenta a mano. Incluye en cada ejercicio una serie con 2-3 repeticiones a medias a propósito.
- [ ] 2. Graba cada serie como fixture (`docs/fixtures.md`). Rellena `labels.realReps` y súbelas a
  `src/kinematics/fixtures/real/`, solo con landmarks, sin imagen.
- [ ] 3. Ejecuta `/benchmark-fsm` con los fixtures reales.

**Criterio:**
- Sentadilla y jumping jack ≥95 %; flexión ≥90 %.
- Las repeticiones a medias no cuentan.
- Si no se cumple, **no ajustes umbrales**: devuélvelo (`tipo: estado`) con los fixtures y la nube planifica el
  ajuste.

### B4. Parte 3: sesión de 15 min
- [ ] 1. Pixel 7 Pro, con una persona entrenando de forma continua o alternando ejercicios. Ejecuta
  `bash scripts/audit_performance.sh com.kynet.app.dev 900`.
- [ ] 2. Registra el FPS mínimo y la media, los descartes, la evolución de la térmica y la memoria al inicio y al
  final.
- [ ] 3. El usuario confirma que el esqueleto se ve fluido y que audio, voz y vibración llegan sin retardo
  perceptible.

**Criterio:** nunca por debajo de 25 FPS, memoria estable y sin retardo perceptible.

### B5. S26 Ultra con GPU forzada, 10 min
- [ ] 1. La misma prueba que la de la parte 1 (`34b8fb5`), pero con el delegado GPU forzado.
- [ ] 2. Compara los descartes y el tiempo de inferencia por minuto con la prueba en CPU (~10,5 % de descartes).

**Criterio:** descartes por debajo del 5 %, o explicación medida. Con eso se decide el delegado del S26 (anótalo en
`docs/decisions.md`).

---

## Respuesta esperada
Un `tipo: estado` en `para-nube/` por bloque o prueba terminada, con:
- el commit;
- la salida de los comandos (o el resumen con cifras);
- qué no se pudo verificar.

Con eso, la nube actualiza `docs/estado.md` y `docs/requirements.md` (criterios cumplidos) y planifica lo siguiente.
