# Spec de diseño: datos, sincronización y backend (Supabase) de FitPose

Estado: borrador de diseño para aprobación. Es solo un documento: no se ha ejecutado nada contra Supabase, no se ha creado ningún proyecto y el SQL de las secciones 3 y 7 es ilustrativo (sin probar). Basado en `docs/requirements.md`.

> **AVISO DE AISLAMIENTO.** Existe un proyecto Supabase con el **CRM real de Verse que NO debe tocarse** (ni leer, ni migrar, ni reutilizar claves, ni compartir buckets o Edge Functions). El backend de FitPose irá en un **proyecto nuevo y aislado**, con sus propias claves, credenciales de Google, secretos y `supabase/migrations` en el repo de la app. Toda migración se prueba primero con `supabase start` (local) y se aplica solo al proyecto nuevo, comprobando el `project-ref` antes de cada `db push`. Ver riesgo R1 sobre el límite de proyectos del plan.

## 0. Resumen de decisiones

| # | Decisión | Motivo corto |
|---|----------|--------------|
| D1 | Escritura de sesiones por **una RPC** `sync_session` (SECURITY DEFINER), no por INSERT directo a tablas | Atomicidad, XP/racha/misiones en una transacción, sin huecos de RLS de escritura |
| D2 | XP, nivel, racha, protectores y misiones **calculados en servidor**; el cliente calcula una copia provisional con la misma lógica | Coherencia multi-dispositivo, reglas versionables, base honesta para ligas |
| D3 | Sesiones y repeticiones **inmutables** una vez subidas (insert-once, gana el id del cliente) | Elimina casi todos los conflictos |
| D4 | Racha **recalculada desde cero** a partir de `daily_activity` en cada sync (función pura e idempotente) | Orden de llegada irrelevante, offline y multi-dispositivo triviales |
| D5 | Día = `local_date` fijado en el momento de la sesión con la zona IANA del usuario, guardada junto a la sesión, **con corte a las 03:00 locales** (una sesión a las 00:40 cuenta para el día anterior) | Viajes y cambios de zona no reescriben el pasado; entrenar de madrugada no rompe la racha |
| D6 | Progreso de misiones **derivado** (se recalcula desde sesiones), nunca incremental | Idempotencia |
| D7 | XP como **ledger append-only** `xp_events` con `unique(user_id, source_type, source_id)` | Idempotencia y auditoría; el total es una cifra derivada |
| D8 | Estado de gamificación en tabla **aparte** de `profiles`, sin permisos de escritura para el cliente | `profiles` es editable por el usuario; el XP no |
| D9 | Login nativo de Google + `signInWithIdToken` | Mejor UX en Android; sin redirecciones de navegador |
| D10 | Borrado de cuenta vía Edge Function con `service_role` y `ON DELETE CASCADE` desde `auth.users` | Un solo punto de borrado, cumple Play |

## 1. Modelo de datos (Postgres)

Convenciones: `uuid` generado en cliente para entidades creadas offline; `timestamptz` siempre UTC; fechas de día como `date` (día local del usuario); `created_at`/`updated_at` en todas (trigger `set_updated_at`); RLS activada en **todas** las tablas del esquema `public`; funciones internas en el esquema `app_private` (no expuesto por PostgREST). Nada de email ni datos personales fuera de `auth.users`.

### 1.1 Etapa MVP

| Tabla | Propósito | Columnas clave (tipo) | Claves / restricciones / índices |
|-------|-----------|-----------------------|-----------------------------------|
| `profiles` | Ajustes editables por el usuario | `id uuid` (= `auth.users.id`), `display_name text` (1-40), `locale text` (es/en/pt), `timezone text` (IANA), `daily_goal_xp smallint` (10-200, def. 20), `onboarded_at`, `created_at`, `updated_at` | PK `id`, FK a `auth.users` `ON DELETE CASCADE`. Trigger valida `timezone` contra `pg_timezone_names` |
| `gamification_state` | Estado calculado (solo servidor escribe) | `user_id`, `total_xp bigint`, `level int`, `current_streak int`, `longest_streak int`, `streak_last_day date`, `protectors_available smallint` (0-2; reservada, valor 0 en el MVP), `ruleset smallint`, `updated_at` | PK `user_id`, FK a `profiles` CASCADE. Checks de rango |
| `exercises` | Catálogo (3 filas en MVP) | `id smallint` (sembrado a mano, estable), `code text unique` (`squat`, `jumping_jack`, `push_up`), `name_i18n jsonb` (`{"es":..,"en":..}`), `kind text` (`reps`), `fsm_version smallint`, `camera_setup text` (`front`/`side`), `active bool`, `sort smallint` | PK `id`, unique `code`. Se empaqueta también en la app (ids estables) |
| `workout_sessions` | Una sesión = un ejercicio, un bloque continuo | `id uuid` (cliente), `user_id`, `exercise_id`, `started_at`, `ended_at`, `tz text`, `local_date date` (la fija el servidor), `status` (`completed`/`abandoned`), `active_seconds int`, `reps_total smallint`, `reps_valid smallint`, `avg_form_score smallint` (0-100), `calibration jsonb` (3 umbrales, <1 KB), `algo_version smallint`, `app_version text`, `received_at`, `updated_at`, `deleted_at` | PK `id`. CHECK `ended_at >= started_at`, `reps_valid <= reps_total`, `active_seconds <= 14400`, `reps_total <= 1000`. Índices `(user_id, local_date)`, `(user_id, started_at desc)` |
| `rep_summaries` | Resumen por repetición (**sin landmarks, sin vídeo**) | `session_id uuid`, `rep_index smallint`, `user_id` (desnormalizado para RLS barata), `t_start_ms int` (desde inicio de sesión), `duration_ms int`, `form_score smallint`, `valid bool`, `rom_deg smallint` (rango de movimiento), `fault_codes text[]` (p. ej. `knee_valgus`, `shallow_depth`) | PK `(session_id, rep_index)` (id determinista = idempotente, sin índice extra), FK a sesión CASCADE |
| `xp_events` | Ledger de XP (append-only) | `id uuid`, `user_id`, `source_type` (`session`,`mission`,`adjustment`; luego `streak_bonus`,`pass`), `source_id uuid`, `amount int`, `local_date date`, `ruleset smallint`, `created_at` | `unique(user_id, source_type, source_id)`. Índice `(user_id, local_date)` (suma semanal para ligas/pase) |
| `daily_activity` | Un registro por día local con actividad | `user_id`, `local_date`, `xp_total int`, `sessions_count smallint`, `valid_reps int`, `active_seconds int`, `qualified bool`, `protected bool` | PK `(user_id, local_date)`. La reescribe el servidor (derivada) |
| `mission_templates` | Plantillas (catálogo) | `id smallint`, `code text unique`, `scope` (`daily`/`weekly`), `metric` (`sessions`,`valid_reps`,`active_seconds`,`active_days`,`good_form_sessions`), `exercise_id smallint null`, `target int`, `xp_reward int`, `min_level smallint`, `weight smallint`, `title_i18n jsonb`, `active bool` | PK, unique `code` |
| `mission_assignments` | Misión asignada a un usuario y periodo | `id uuid` (determinista: uuid v5 de user+template+period), `user_id`, `template_id`, `period_start date`, `period_end date`, `target int` (copia de la plantilla), `xp_reward int` (copia), `progress int`, `status` (`active`/`completed`/`expired`), `completed_at`, `updated_at` | `unique(user_id, template_id, period_start)`, índice `(user_id, period_start desc)` |

Notas de diseño:
- **Una sesión, un ejercicio.** Simplifica XP, misiones y UI en 6-8 semanas. Una futura "rutina" se añade con `workout_id uuid null` en la sesión, sin migración destructiva.
- **`daily_activity` y `gamification_state` son derivados**: pueden reconstruirse desde `workout_sessions` + `xp_events` con una función de reparación (`rebuild_user_state(uid)`). Esto es la red de seguridad si cambia una regla.
- **Copias de `target` y `xp_reward` en la asignación**: cambiar una plantilla no altera misiones ya entregadas.
- **Volumen** (ver R4): 60 repeticiones por sesión x 1.000 usuarios activos diarios ≈ 22 M filas/año en `rep_summaries` (~2 GB con índice). Tipos estrechos (`smallint`, `int`) y PK compuesta ya están pensados para eso. Plan de retención: pasados 180 días, resumir las repeticiones en `workout_sessions.calibration`/un `jsonb` de agregados y borrarlas.

### 1.2 Etapa 2 (esbozo; el MVP no lo bloquea)

| Tabla | Esbozo |
|-------|--------|
| `seasons` | `id`, `kind` (`league_week`/`pass`), `starts_on date`, `ends_on date`, `code`. Semana de liga = lunes a domingo en **UTC** (decisión simple; ver R7) |
| `league_tiers` | `tier smallint pk`, `name_i18n`, `promote_top smallint`, `demote_bottom smallint` |
| `league_groups` | `id uuid`, `season_id`, `tier`, `closed bool`. Grupos de ~30 por matchmaking |
| `league_memberships` | `group_id`, `user_id`, `weekly_xp int`, `final_rank smallint null`, `result` (`promoted`/`stayed`/`demoted`). PK `(group_id, user_id)`; índice `(group_id, weekly_xp desc)` y `(user_id, season)` |
| `pass_seasons`, `pass_tiers` | Temporada del pase, niveles con `xp_required`, `free_reward jsonb`, `premium_reward jsonb` |
| `user_pass` / `pass_claims` | `pass_xp` **derivado** de `xp_events` dentro de las fechas de la temporada; reclamos con `unique(user_id, season, tier, track)` |
| `push_tokens` | `user_id`, `token`, `platform`, `locale`, `tz`; para recordatorios (cron en servidor) |
| `entitlements` | Premium / compras (Play Billing) cuando llegue |

Por qué el modelo no se bloquea: (a) `xp_events` ya lleva `source_type`, `local_date` y `ruleset`, suficiente para sumar XP semanal o de temporada sin tocar datos antiguos; (b) la función `award_xp` tiene un punto de enganche para incrementar `league_memberships.weekly_xp` si existe membresía; (c) el ranking se leerá siempre por RPC, nunca por SELECT directo a tablas de otros usuarios; (d) `profiles` no contiene nada que no pueda hacerse público (se añadirá `handle` opcional e `is_ranking_visible bool`, por defecto false hasta consentimiento).

### 1.3 Reglas de XP y nivel (ruleset 1, ajustables)

| Concepto | Regla inicial |
|----------|---------------|
| XP por repetición | Igual para todos los ejercicios y según `rep_summaries.form_score` (0-100): **2** si `>= 80`, **1** si 50-79, **0** si `< 50`, y **0** si `duration_ms < 800` en sentadilla y flexión (movimiento demasiado rápido). Sustituye a `exercises.xp_per_rep` (se elimina esa columna) |
| Bonos de sesión | +20 por sesión completada (`status = completed`, al menos una serie completa); +10 si es la primera sesión del día local; +10 si el porcentaje de repeticiones con `form_score >= 80` es de 80% o más; +15 la primera vez que se prueba un ejercicio (una vez por ejercicio) |
| Tope diario | 300 XP **por repeticiones** al día por usuario (los bonos y misiones no cuentan para el tope). Es un límite de integridad, no antitrampas |
| Recompensa de misión | `xp_reward` de la asignación, una sola vez |
| Nivel | XP para pasar de n a n+1: `100 + 40·(n-1)`. Acumulado para llegar al nivel L: `20·(L-1)·(L+3)` (100, 240, 420, 640 en 2, 3, 4, 5...). Inverso: `level = floor(sqrt(total_xp/20 + 4)) - 1` (comprobado: 100 XP da nivel 2; 239 XP da nivel 2; 240 XP da nivel 3) |
| Día "cualificado" | El día local suma `valid_reps >= 20` **o** `active_seconds >= 180` (sin contar calibración). Sustituye a `xp_total >= daily_goal_xp`. Las repeticiones que cuentan para el día son las contadas por la FSM, de cualquier calidad |

Nota: `form_score = round(100 · Q)` con Q definida en `spec-cinematica.md` §6.3. Los cortes 80 y 50 son hipótesis a validar en la beta.

El `ruleset` se guarda en cada evento: cambiar las reglas no reescribe el pasado.

## 2. Reglas de racha

### 2.1 Definiciones

| Término | Definición |
|---------|------------|
| Zona del usuario | `profiles.timezone` (IANA, p. ej. `America/Bogota`). La app la detecta al iniciar sesión y cada vez que abre (si cambia, hace `update`) |
| `local_date` de una sesión | `((started_at AT TIME ZONE tz) - interval '3 hours')::date`, con `tz` = zona enviada por el cliente **en esa sesión** (guardada en la fila). El corte del día es a las **03:00 locales**: una sesión a las 00:40 cuenta para el día anterior. Una sesión que cruza el corte cuenta en el día en que **empezó** |
| Día cerrado | Un día `D` está cerrado cuando la hora local del usuario pasa de las **03:00** de `D+1` |
| Día final (cerrado para sincronizar) | Pasados **3 días** (ventana de gracia `G = 3`) desde el cierre. Hasta entonces una sesión offline puede llegar y modificar `D` |
| Día cualificado | `daily_activity.qualified = true` (ver 1.3) |
| Racha | Número de días cualificados consecutivos. **En el MVP no hay protectores** (decisión ronda 5): un día cerrado sin actividad cualificada rompe la racha. Los protectores, la pausa, la reparación y la compra de protectores son etapa 2 |

### 2.2 Algoritmo (función pura `compute_streak(user, as_of_local_date)`)

Se ejecuta (1) al final de `sync_session` y (2) en `get_state()` al abrir la app, de modo que **no hace falta cron** para que la racha caduque: se evalúa de forma perezosa al volver el usuario.

```
streak=0; longest=0
para cada día d desde el primer día con actividad hasta as_of (ordenado):
    si d tiene fila cualificada:
        streak += 1
    sino si d == as_of:
        pass                      # hoy aún abierto: la racha queda "en riesgo", no se rompe
    sino:                          # día cerrado sin actividad cualificada
        streak = 0                 # se rompe (MVP: sin protectores)
    longest = max(longest, streak)
escribe en gamification_state: current_streak, longest_streak, streak_last_day
# Etapa 2: aquí se reintroduce protectors (ganar 1 cada 7 días, máx. 2, consumo automático)
```

- MVP: un solo día cerrado sin actividad cualificada rompe la racha; se conserva `longest_streak`. La UI usa un mensaje amable ("Fue un descanso, no un fracaso").
- Etapa 2 (fuera del MVP): protectores (1 cada 7 días de racha, máx. 2, consumo automático), pausa, reparación y compra con XP.
- Mostrar: si hoy aún no es cualificado, se enseña la racha vigente con aviso "en riesgo" hasta las 03:00 locales del día siguiente.
- La columna `gamification_state.protectors_available` se deja en la migración con valor 0 y sin uso, para no migrar después (reservada para la etapa 2).

### 2.3 Offline e idempotencia

| Caso | Comportamiento |
|------|----------------|
| Entrena sin red y sincroniza horas después | La sesión lleva su `tz` y `started_at`; `local_date` se calcula en servidor y el recálculo cuenta el día correctamente |
| Offline varios días, sincroniza dentro de 3 días | Los días se rellenan retroactivamente y la racha se recalcula desde cero, así que una racha que parecía rota (provisional en el cliente) se corrige |
| Sesión llega pasados más de 3 días | Se guarda y da XP, pero `daily_activity` de ese día no se modifica para racha (`counts_for_streak = false`, se anota en `calibration`/log); la racha mostrada nunca "retrocede" más de 3 días. Se avisa en la UI. Valor de G ajustable |
| Reintento de la misma sesión (timeout, respuesta perdida) | `id` ya existe: la RPC devuelve el resultado guardado sin duplicar XP, reps ni racha |
| Dos dispositivos, mismo día | Se unen en `daily_activity` (suma); `gamification_state` se serializa con `SELECT ... FOR UPDATE` al inicio de la RPC |
| Reloj del teléfono manipulado | Se rechaza `started_at > now() + 10 min` y `< now() - 14 días`. No se persigue más (anti-trampas fuera de alcance, deuda técnica) |
| Cambio de zona (viaje) | Los días pasados conservan su `local_date`. Viajar al este puede saltarse un día y al oeste repetir otro; en el MVP no hay protector, así que puede romper la racha (riesgo aceptado; caso de prueba). Se limita el cambio de `timezone` a 1 vez cada 24 h si resulta abusivo (decisión abierta) |
| Cliente sin red mostrando la racha | Calcula una versión **provisional** con el mismo módulo TS sobre su SQLite (marcada "pendiente de sincronizar") y la sustituye por la del servidor al sincronizar |
| Fin del día con la app cerrada | Nada que hacer: el cierre es perezoso (se evalúa al volver) |

La racha solo depende del conjunto de `daily_activity`, no del orden de llegada: es conmutativa e idempotente. Casos de prueba comunes (mismos vectores JSON) para la función SQL (pgTAP) y la copia TS.

## 3. Seguridad: RLS, funciones SECURITY DEFINER y dónde calcular

### 3.1 Principios

- RLS **ON** en toda tabla de `public`. Patrón `(select auth.uid())` para que Postgres evalúe el uid una vez por consulta.
- Permisos por rol: `REVOKE ALL ... FROM anon, authenticated` y luego `GRANT` mínimo. El rol `anon` no toca ninguna tabla.
- Las funciones privilegiadas viven en `app_private` (no expuesto), con `SECURITY DEFINER`, `SET search_path = ''` y nombres calificados. Solo se exponen en `public` unas pocas RPC, con `REVOKE EXECUTE FROM public, anon` y `GRANT EXECUTE TO authenticated`.
- La clave `service_role` jamás va en la app; solo la Edge Function de borrado.

### 3.2 Políticas por tabla

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `profiles` | propia (`id = auth.uid()`) | solo trigger de alta | propia y **solo columnas** `display_name, locale, timezone, daily_goal_xp, onboarded_at` (`GRANT UPDATE (cols)`) | no (usar borrado de cuenta) |
| `gamification_state` | propia | no | no | no |
| `exercises`, `mission_templates` | todos los `authenticated` | no | no | no |
| `workout_sessions` | propias (y no borradas) | no directo; RPC `sync_session` | no directo | `deleted_at` vía RPC `delete_session` (opcional) |
| `rep_summaries` | propias | no directo (RPC) | no | no |
| `xp_events`, `daily_activity`, `mission_assignments` | propias | no | no | no |
| `seasons`, `league_tiers`, `pass_*` (etapa 2) | todos los `authenticated` | no | no | no |
| `league_groups`, `league_memberships` (etapa 2) | **sin SELECT directo**; RPC `get_league_standings(group_id)` devuelve solo `display_name, level, weekly_xp, rank` de miembros del grupo del que el llamante es miembro | no | no | no |
| `push_tokens` (etapa 2) | propios | propios | propios | propios |

Ranking futuro: lectura limitada = RPC o vista con columnas mínimas y filtro por pertenencia al grupo; nunca se expone `auth.users`, email, historial de sesiones ni racha. Visibilidad con consentimiento (`is_ranking_visible`).

### 3.3 ¿Triggers/funciones en servidor o cálculo en cliente?

| Criterio | Cliente calcula y sube el total | **Servidor calcula (elegido)** |
|----------|----------------------------------|--------------------------------|
| Coherencia multi-dispositivo / reinstalación | Frágil; hay que fusionar totales | Una sola fuente; el cliente se rehidrata |
| Cambiar reglas (balance de XP) | Hay que actualizar la app y migrar datos | Nuevo `ruleset`, ledger intacto |
| Escritura de XP desde el cliente | Permite `UPDATE total_xp = 999999` con la clave pública (la de Supabase en el APK no es secreta) | El cliente no tiene permiso de escritura sobre XP |
| Ligas / pase etapa 2 | Hay que rehacer para que fuera creíble | Ya sale del ledger |
| Complejidad y coste | Menor | Mayor: lógica en plpgsql, pruebas pgTAP |
| UX offline | Inmediata | Se compensa con cálculo **provisional** en cliente y reconciliación |

Aclaración honesta: como el cliente envía las repeticiones, **puede mentir sobre ellas**. Mover el cálculo al servidor no es anti-trampas (deuda aceptada, el ranking no es fiable); solo evita escribir cifras arbitrarias y garantiza coherencia. Los topes (1.3, reloj, repeticiones máximas por sesión) son comprobaciones de integridad, no detección de fraude.

Triggers recomendados (pocos y simples): `set_updated_at`; `handle_new_user` (alta); `apply_xp_event` (AFTER INSERT en `xp_events`: suma al `gamification_state` y recalcula `level`; seguro por la clave única); `validate_timezone`. Todo lo demás (racha, misiones, orden de pasos) va **en la RPC**, no en triggers, para controlar el orden y evitar cascadas ocultas.

### 3.4 RPC `sync_session(p_session jsonb, p_reps jsonb) returns jsonb`

1. `auth.uid()` no nulo; valida esquema, rangos y que `exercise_id` exista.
2. `SELECT ... FOR UPDATE` de `gamification_state` del usuario (serializa dispositivos).
3. `INSERT workout_sessions ... ON CONFLICT (id) DO NOTHING`. Si ya existe y es del mismo usuario: salta a 9 devolviendo el estado actual. Si es de otro usuario: error.
4. Inserta `rep_summaries ... ON CONFLICT DO NOTHING`.
5. Calcula XP de la sesión y `INSERT xp_events ... ON CONFLICT DO NOTHING`.
6. Reescribe `daily_activity` del día **desde las sesiones** (no incrementos).
7. `compute_streak` y actualiza el estado.
8. `ensure_assignments` (hoy +2 días diarios, semana actual y siguiente) y recálculo del progreso desde las sesiones; las misiones recién completadas generan su `xp_event` (`source_type = 'mission'`, `source_id = assignment.id`).
9. Devuelve `{session_id, xp_awarded, state, assignments, newly_completed_missions}`.

Otras RPC: `get_state()` (recalcula racha perezosamente y devuelve estado + asignaciones vigentes), `export_my_data()`, `get_league_standings()` (etapa 2). La zona horaria se cambia con UPDATE normal a `profiles` (validado por trigger).

## 4. Sincronización offline-first

### 4.1 Reparto de responsabilidades

| Dato | Dueño | Dirección | Conflicto |
|------|-------|-----------|-----------|
| Sesión en curso, reps, calibración | SQLite (cliente) | subida | no hay: la sesión es inmutable tras `completed` |
| `workout_sessions`, `rep_summaries` | cliente | sube vía RPC | insert-once; gana el `id`; reintento = no-op |
| `profiles` (ajustes) | usuario | sube y baja | último en escribir gana por fila (`updated_at` de servidor); raro |
| `gamification_state`, `xp_events`, `daily_activity`, `mission_assignments` | **servidor** | solo baja | el servidor sobrescribe la caché local |
| Catálogos (`exercises`, `mission_templates`) | servidor | baja (versionados) y empaquetados | el servidor manda |

### 4.2 SQLite local (op-sqlite)

- Espejo de las tablas anteriores, más: `outbox(id uuid, kind, entity_id, payload json, attempts int, next_retry_at, last_error, status)`, `sync_cursor(table, updated_at, id)` y `local_provisional(...)` (XP/racha calculados localmente, para la UI).
- Cada sesión se crea con `crypto.randomUUID()` (o `expo-crypto`) al iniciar el entrenamiento; las repeticiones se guardan con `(session_id, rep_index)`.
- Sesión en curso: solo SQLite; si se mata la app, al abrir se marca `abandoned` o se ofrece reanudar.
- Al terminar: transacción local escribe la sesión **y** un registro en `outbox` (todo o nada).

### 4.3 Cola de reintentos

- Un elemento de `outbox` por sesión (payload con sesión + reps, ~6 KB). Orden FIFO por fecha de inicio.
- Disparadores: fin de sesión, app a primer plano, `NetInfo` pasa a conectado, y un intervalo de 15 min con la app abierta. (Sync en segundo plano con `expo-background-task`: opcional, no MVP.)
- Backoff exponencial con jitter: `5 s x 2^n`, tope 15 min. Reintentar: errores de red, 5xx, 401 (primero refrescar el token), 429.
- Errores permanentes (4xx de validación: código `P0001`/`22xxx`): el elemento pasa a `dead` con `last_error`, no bloquea la cola, se conserva en local y se registra (Sentry sin datos personales). No se borra datos del usuario.
- Idempotencia garantizada por UUID + `ON CONFLICT`: repetir tras un timeout es seguro.
- Cambios de ajustes de `profiles`: se fusionan (coalesce) en un único elemento.

### 4.4 Descarga (pull)

- Al iniciar sesión o reinstalar: `get_state()` + últimas 90 días de sesiones (resumen) + asignaciones vigentes + catálogos.
- Después: tras cada subida exitosa la RPC ya devuelve el estado; al abrir la app se llama `get_state()`; sesiones de otros dispositivos con cursor `(updated_at, id)` y borrado lógico (`deleted_at`).
- Si cambió el `ruleset` del servidor, el cliente actualiza su módulo de reglas o muestra valores del servidor (el servidor siempre gana).
- Cuenta distinta en el mismo dispositivo: si el `user_id` del outbox no coincide con el de la sesión actual, la cola no se envía y se pide al usuario resolver (evita mezclar datos).

## 5. Autenticación con Google

### 5.1 Flujo recomendado (nativo, Expo development build)

1. `@react-native-google-signin/google-signin` (requiere development build, ya decidido; no funciona en Expo Go).
2. `GoogleSignin.configure({ webClientId: <ID de cliente OAuth tipo Web> })`; `signIn()` devuelve un `idToken`.
3. `supabase.auth.signInWithIdToken({ provider: 'google', token: idToken })`.
4. Supabase crea/recupera el usuario en `auth.users` → el trigger crea el perfil → la app llama `get_state()` y fija la zona horaria.

Alternativa de reserva: OAuth por navegador (`expo-web-browser` + `expo-auth-session`/PKCE con `signInWithOAuth` y esquema `fitpose://auth-callback`). Peor UX, pero no necesita el SDK nativo.

### 5.2 Configuración necesaria

| Dónde | Qué |
|-------|-----|
| Google Cloud (proyecto propio de FitPose, no el del CRM) | Pantalla de consentimiento (nombre, correo de soporte, política de privacidad, ámbitos solo `email`, `profile`, `openid`); publicar fuera de "Testing" antes del lanzamiento |
| Google Cloud | Cliente OAuth **Android**: nombre de paquete + huella **SHA-1** de cada firma (debug local, EAS, **y clave de firma de Play App Signing** al publicar) |
| Google Cloud | Cliente OAuth **Web**: su ID es el `webClientId` de la app y se carga en Supabase junto con su secreto |
| Supabase (proyecto nuevo) | Auth > Providers > Google: activar, ID y secreto del cliente Web; añadir el ID Android a la lista de clientes autorizados si se pide. Verificar en la documentación vigente el tema del **nonce** con el SDK nativo en Android (puede requerir "skip nonce check") |
| Supabase | Site URL y Redirect URLs (`fitpose://auth-callback`) por si se usa el flujo de navegador; desactivar proveedores que no se usan; confirmación de correo no aplica |
| App | `supabase-js` con storage seguro: `expo-secure-store` tiene un límite de ~2 KB por valor, así que usar el patrón de "LargeSecureStore" (clave de cifrado en SecureStore, sesión cifrada en AsyncStorage). `autoRefreshToken` ligado a `AppState` |
| EAS | Las huellas SHA-1 de EAS (`eas credentials`) deben coincidir con las registradas en Google |

### 5.3 Comportamiento offline de la sesión

El token de acceso dura ~1 h y el de refresco necesita red. Sin red la app **sigue funcionando** con el `user_id` en caché; la cola espera y sincroniza al volver. Si el refresco falla definitivamente se pide volver a iniciar sesión, conservando los datos locales (solo se vinculan al mismo `user_id`). El primer inicio de sesión requiere red. **Decisión ronda 5: el login con Google se ofrece después de la primera sesión de entrenamiento**; antes de eso la app funciona con una cuenta local (sin red, todo guardado en SQLite). Ver DA2 para la importación inicial.

### 5.4 Perfil creado por trigger

`AFTER INSERT ON auth.users` → `app_private.handle_new_user()` (SECURITY DEFINER) crea `profiles` y `gamification_state`. Minimización: solo se copia el **nombre de pila** (de `raw_user_meta_data.full_name`); no se guarda la foto ni el correo. El trigger debe ser a prueba de fallos (`ON CONFLICT DO NOTHING`): un error en él **bloquea el alta de usuarios**; se cubre con prueba pgTAP y el caso de usuario sin nombre.

### 5.5 Apple Sign-In (después)

`signInWithIdToken({ provider: 'apple' })`. Apple solo entrega nombre/correo la primera vez y puede ocultar el correo. Comprobar la política de enlace de identidades por correo verificado en Supabase para que un mismo usuario con Google y Apple no genere dos cuentas; si no se vinculan, decidir el flujo manual. Requiere cuenta de Apple Developer y, con iOS, ofrecer Apple si hay otros logins sociales.

## 6. Privacidad y borrado de cuenta

### 6.1 Qué se guarda

| Categoría | Datos | Dónde |
|-----------|-------|-------|
| Identidad | ID de usuario, correo, identificador de Google | `auth.users` (gestionado por Supabase) |
| Perfil | Nombre de pila, idioma, zona horaria, objetivo diario | `profiles` |
| Actividad de entrenamiento | Fecha/hora, ejercicio, nº de repeticiones, puntuación de forma, ROM y códigos de fallo por repetición, duración | `workout_sessions`, `rep_summaries` |
| Gamificación | XP, nivel, racha, misiones | tablas derivadas |
| Técnico mínimo | `app_version`, `algo_version`; **no** modelo de dispositivo, ni IP propia, ni ID publicitario | sesiones |
| **Nunca** | Vídeo, fotogramas, landmarks crudos, audio, ubicación, contactos | no salen del teléfono (ni se persisten en SQLite más allá de la sesión) |

### 6.2 Minimización y cumplimiento básico

- Propósito único: ofrecer la app y sus funciones de hábito. Sin publicidad, sin venta de datos, sin analítica de terceros en el MVP; si se añade analítica o reporte de fallos, que sea sin identificadores y declarado.
- Los datos de actividad física son **datos de salud en sentido amplio**: tratarlos con cautela y finalidad clara aunque no sean estrictamente "categoría especial" (valorar RGPD en España, LGPD Brasil, Ley 1581 Colombia, LFPDPPP México, Ley 21.719 Chile). Base legal: ejecución del servicio y consentimiento explícito, con aceptación de la política en el primer arranque.
- Edad: **mínimo 18 años** (decisión del usuario, ronda 5; sustituye al 16 de la ronda 4), con declaración de fecha de nacimiento en pantalla neutral y bloqueo de menores. Esto evita el consentimiento parental y las reglas de datos de menores en esta etapa. **Ampliar a más edades** (16-17 o menos) es una decisión futura que exigirá revisión legal por país (consentimiento, datos de salud de menores, ficha de Google Play). Sigue siendo recomendable que un abogado revise la política de privacidad y el tratamiento de datos de salud antes de publicar.
- Ranking (etapa 2): visibilidad **opt-in**, apodo (`handle`) distinto del nombre real, solo se muestran nivel y XP semanal.
- Para Google Play: formulario de **Seguridad de los datos** coherente con esta tabla, URL pública de la **política de privacidad**, y función de **eliminar cuenta dentro de la app y con URL web** (requisito de Play).
- Cifrado en tránsito (TLS) y en reposo (gestionado por Supabase). SQLite local: valorar SQLCipher en etapa 2 (R8).
- Retención: sesiones y repeticiones mientras exista la cuenta (resumen de repeticiones tras 180 días); cuentas inactivas, política a definir (p. ej. aviso y borrado a 24 meses; DA6).
- Derechos: acceso/portabilidad con `export_my_data()` (JSON), rectificación (ajustes), supresión (6.3).
- No es asesoría legal: la política y los términos los debe revisar una persona cualificada antes de publicar.

### 6.3 Borrado de cuenta

1. En la app: Ajustes > Eliminar cuenta, con confirmación reforzada.
2. La app llama a la Edge Function `delete-account` (JWT del usuario). La función verifica el JWT, toma el `uid` y llama a `auth.admin.deleteUser(uid)` con `service_role`. No acepta un uid enviado por el cliente.
3. Todas las tablas cuelgan de `auth.users` con `ON DELETE CASCADE` (vía `profiles`), así que se borran sesiones, repeticiones, XP, misiones, membresías y tokens push. Los datos de un ranking cerrado se anonimizan o se borran por cascada.
4. La app vacía SQLite, borra el storage seguro y cierra sesión.
5. Copias de seguridad de Supabase: el dato desaparece de las copias al rotar (según plan, ~7 días); se declara en la política.
6. Prueba obligatoria: tras borrar, ninguna tabla tiene filas con ese `user_id` (consulta de verificación en pgTAP o script).

## 7. Migraciones

### 7.1 Orden propuesto (`supabase/migrations/`, un archivo por paso)

| N.º | Contenido |
|-----|-----------|
| 0001 | Esquema `app_private`, extensiones mínimas, `set_updated_at()`, revocar permisos por defecto a `anon` |
| 0002 | `profiles`, `gamification_state`, validación de zona, `handle_new_user` + trigger, RLS y grants |
| 0003 | `exercises` + semilla de los 3 ejercicios, RLS lectura |
| 0004 | `workout_sessions`, `rep_summaries` (+ índices, checks, RLS solo lectura) |
| 0005 | `xp_events`, `daily_activity`, trigger `apply_xp_event`, `level_for_xp` |
| 0006 | `compute_streak`, `award_session_xp`, `rebuild_user_state` |
| 0007 | `mission_templates` (+ semilla), `mission_assignments`, `ensure_assignments`, recálculo de progreso |
| 0008 | RPC públicas: `sync_session`, `get_state`, `export_my_data`; `REVOKE/GRANT EXECUTE` |
| 0009 | Pruebas pgTAP (RLS por tabla con dos usuarios, idempotencia, racha, borrado) |
| 01xx | Etapa 2: `seasons`, ligas, `push_tokens`, cron semanal (`pg_cron`) |
| 02xx | Pase de batalla, `entitlements` |

Reglas: migraciones hacia delante, nunca editar una aplicada; seed de catálogos en migración idempotente (`ON CONFLICT DO UPDATE`); `supabase db lint` y `get_advisors` (seguridad) antes de cada publicación; TypeScript generado con `supabase gen types`. Dos entornos: local (`supabase start`) y proyecto nuevo de producción; un tercero de staging solo si el plan lo permite (R1).

### 7.2 SQL de ejemplo (ilustrativo, sin probar)

**a) Perfil, estado de gamificación y alta por trigger**

```sql
create schema if not exists app_private;

create table public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  display_name   text check (char_length(display_name) between 1 and 40),
  locale         text not null default 'es' check (locale in ('es','en','pt')),
  timezone       text not null default 'UTC',
  daily_goal_xp  smallint not null default 20 check (daily_goal_xp between 10 and 200),
  onboarded_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
alter table public.profiles enable row level security;

create table public.gamification_state (
  user_id              uuid primary key references public.profiles(id) on delete cascade,
  total_xp             bigint   not null default 0 check (total_xp >= 0),
  level                integer  not null default 1 check (level >= 1),
  current_streak       integer  not null default 0 check (current_streak >= 0),
  longest_streak       integer  not null default 0,
  streak_last_day      date,
  protectors_available smallint not null default 0 check (protectors_available between 0 and 2),
  ruleset              smallint not null default 1,
  updated_at           timestamptz not null default now()
);
alter table public.gamification_state enable row level security;

create function app_private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id,
          nullif(split_part(coalesce(new.raw_user_meta_data->>'full_name', ''), ' ', 1), ''))
  on conflict (id) do nothing;
  insert into public.gamification_state (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app_private.handle_new_user();

-- Permisos y RLS
revoke all on public.profiles, public.gamification_state from anon, authenticated;
grant select on public.profiles, public.gamification_state to authenticated;
grant update (display_name, locale, timezone, daily_goal_xp, onboarded_at)
  on public.profiles to authenticated;

create policy profiles_select_own on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy gstate_select_own on public.gamification_state
  for select to authenticated using (user_id = (select auth.uid()));
```

**b) Sesiones y repeticiones (solo lectura para el cliente)**

```sql
create table public.workout_sessions (
  id             uuid primary key,                       -- generado en el cliente
  user_id        uuid not null references public.profiles(id) on delete cascade,
  exercise_id    smallint not null references public.exercises(id),
  started_at     timestamptz not null,
  ended_at       timestamptz not null,
  tz             text not null,                          -- zona IANA en el momento de la sesión
  local_date     date not null,                          -- la fija sync_session, no el cliente
  status         text not null check (status in ('completed','abandoned')),
  active_seconds integer not null check (active_seconds between 0 and 14400),
  reps_total     smallint not null check (reps_total between 0 and 1000),
  reps_valid     smallint not null,
  avg_form_score smallint check (avg_form_score between 0 and 100),
  calibration    jsonb,
  algo_version   smallint not null,
  app_version    text,
  received_at    timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz,
  check (ended_at >= started_at),
  check (reps_valid between 0 and reps_total)
);
create index on public.workout_sessions (user_id, local_date);
create index on public.workout_sessions (user_id, started_at desc);
alter table public.workout_sessions enable row level security;

create table public.rep_summaries (
  session_id   uuid not null references public.workout_sessions(id) on delete cascade,
  rep_index    smallint not null check (rep_index >= 0),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  t_start_ms   integer  not null check (t_start_ms >= 0),
  duration_ms  integer  not null check (duration_ms between 100 and 60000),
  form_score   smallint not null check (form_score between 0 and 100),
  valid        boolean  not null,
  rom_deg      smallint,
  fault_codes  text[]   not null default '{}',
  primary key (session_id, rep_index)
);
alter table public.rep_summaries enable row level security;

revoke all on public.workout_sessions, public.rep_summaries from anon, authenticated;
grant select on public.workout_sessions, public.rep_summaries to authenticated;
create policy sessions_select_own on public.workout_sessions
  for select to authenticated
  using (user_id = (select auth.uid()) and deleted_at is null);
create policy reps_select_own on public.rep_summaries
  for select to authenticated using (user_id = (select auth.uid()));
-- Sin políticas de INSERT/UPDATE/DELETE: la escritura solo ocurre en sync_session (SECURITY DEFINER).
```

**c) Ledger de XP idempotente y nivel**

```sql
create function app_private.level_for_xp(xp bigint) returns integer
language sql immutable as
$$ select (floor(sqrt(xp::numeric / 20 + 4)) - 1)::integer $$;
-- Nivel L acumulado = 20·(L-1)·(L+3). Verificado: 100 -> 2, 240 -> 3, 640 -> 5, 2340 -> 10, 8740 -> 20

create table public.xp_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  source_type text not null check (source_type in ('session','mission','adjustment')),
  source_id   uuid not null,
  amount      integer not null check (amount <> 0),
  local_date  date not null,
  ruleset     smallint not null,
  created_at  timestamptz not null default now(),
  unique (user_id, source_type, source_id)               -- la clave de la idempotencia
);
create index on public.xp_events (user_id, local_date);
alter table public.xp_events enable row level security;
revoke all on public.xp_events from anon, authenticated;
grant select on public.xp_events to authenticated;
create policy xp_select_own on public.xp_events
  for select to authenticated using (user_id = (select auth.uid()));

create function app_private.apply_xp_event() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.gamification_state
     set total_xp = total_xp + new.amount,
         level    = app_private.level_for_xp(total_xp + new.amount),
         updated_at = now()
   where user_id = new.user_id;
  return new;
end $$;
create trigger xp_event_applied after insert on public.xp_events
  for each row execute function app_private.apply_xp_event();
```

## 8. Riesgos y decisiones abiertas

### 8.1 Riesgos

| ID | Riesgo | Impacto | Mitigación |
|----|--------|---------|------------|
| R1 | Límite de proyectos del plan de Supabase (el plan gratuito limita proyectos activos y pausa por inactividad); ya existe el proyecto del CRM | No poder crear el proyecto aislado, o pausas | Crear el proyecto en una organización/plan propio o subir a Pro antes de publicar; nunca reutilizar el del CRM. Comprobar el `project-ref` en cada comando |
| R2 | Lógica de racha/XP duplicada en SQL y TS | Divergencia, bugs visibles | Vectores de prueba JSON compartidos; el servidor siempre gana; mostrar "provisional" |
| R3 | Zona horaria y viajes | Racha injusta en bordes | Zona guardada por sesión, regla de 3 días (sin protector en el MVP); pruebas con casos de medianoche y cambios de zona |
| R4 | Crecimiento de `rep_summaries` (~2 GB/año por 1.000 usuarios diarios) | Coste y rendimiento | Tipos estrechos, retención a 180 días con agregado, o empaquetar repeticiones en `jsonb`/`bytea` por sesión si se mide presión |
| R5 | Trigger de alta defectuoso bloquea el registro | Nadie puede entrar | Pruebas pgTAP del alta, `ON CONFLICT DO NOTHING`, revisión tras cada migración de `auth` |
| R6 | Configuración de Google (SHA-1 de Play App Signing, nonce en Android) | Login falla solo en producción | Registrar todas las huellas, probar un build de producción interno antes del lanzamiento |
| R7 | Ligas en UTC vs zona del usuario | Corte semanal desajustado para algunos | Aceptable en etapa 2; revisar si hay quejas |
| R8 | SQLite sin cifrar en el teléfono | Datos de actividad legibles con root | Bajo riesgo en MVP (no hay vídeo ni PII fuerte); evaluar SQLCipher |
| R9 | Clave pública en el APK | Cualquiera puede llamar a la API | Es normal: toda la seguridad está en RLS y permisos; probar con dos usuarios y rol `anon` |
| R10 | Ranking no fiable (sin antitrampas) | Reputación de ligas | Aceptado y documentado; etiquetar el ranking como "amistoso" en etapa 2; futuras reglas de plausibilidad en servidor |
| R11 | Función SECURITY DEFINER mal escrita | Escalada de privilegios | `search_path = ''`, esquema privado, `REVOKE EXECUTE` por defecto, `get_advisors` y revisión manual |

### 8.2 Decisiones abiertas

| ID | Pregunta | Propuesta por defecto |
|----|----------|------------------------|
| DA1 | ¿Borrar una sesión revierte su XP? | No: ledger solo de adición (menos conflictos); `adjustment` manual si hace falta |
| DA2 | ¿Modo invitado antes del login? | **Resuelta (ronda 5): sí.** Cuenta local hasta que el usuario inicia sesión con Google tras su primera sesión. Al iniciar sesión se hace una **importación inicial**: todas las sesiones locales se suben por `sync_session` con `p_initial_import = true`, que acepta sesiones de hasta 14 días de antigüedad y no aplica la ventana de gracia de 3 días a la racha (la racha se recalcula desde cero con todo lo importado). Sesiones más antiguas de 14 días suman XP pero no racha. Si el usuario nunca inicia sesión, no hay ranking ni sincronización. Propuesta a validar en la parte 5; si cambia el `user_id` (otro dispositivo), los datos locales no se mezclan sin confirmación |
| DA3 | Umbral de día cualificado | **Resuelta (ronda 4):** 20 repeticiones válidas o 3 minutos activos; afinar con pruebas de uso |
| DA4 | Ventana de gracia de sincronización (3 días). Protectores (1 cada 7 días, máx. 2): **fuera del MVP (ronda 5)** | Valores iniciales; viven en constantes de la función, versionadas con el `ruleset` |
| DA5 | ¿Sesión con varios ejercicios (rutina)? | No en MVP; `workout_id` nullable a futuro |
| DA6 | Retención de cuentas inactivas y de repeticiones | 24 meses / 180 días |
| DA7 | ¿Limitar cambios de zona horaria? | Observar uso; limitar si hay abuso |
| DA8 | Dataset de ejercicios y atribuciones (heredado de requirements) | Catálogo propio mínimo de 3 en MVP |
| DA9 | Nombre del paquete Android y del esquema de URL (`fitpose://`) | Pendiente; afecta a Google Cloud y Supabase |
| DA10 | Analítica y reporte de fallos (Sentry, etc.) | Solo fallos, sin identificadores; declarado en la política |
