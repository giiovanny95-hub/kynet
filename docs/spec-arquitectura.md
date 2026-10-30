# Spec de arquitectura: KYNET (MVP, partes 0-6)

Fecha: 2026-10-28. Base: `pose-spike-research.md` y `requirements.md`. Leyenda: **[V]** verificado (npm / `bundledNativeModules.json` de `sdk-58`, hoy); **[NV]** no verificado o inferido; **[SPIKE]** se decide midiendo.

## 0. Decisiones revisadas

| Tema | Decisión | Estado |
|---|---|---|
| Base | Expo SDK 58, RN 0.88, nueva arquitectura, Hermes, TS strict. Retroceso: SDK 57 | [V] versiones; [NV] VC 5.2.3 con RN 0.88 |
| Cámara/worklets | VC 5.2.3 + `vision-camera-worklets` + `react-native-worklets` 0.13.x. Nunca `worklets-core` | [V] |
| Inferencia | **Decisión del usuario (ronda 4): módulo Kotlin propio con MediaPipe PoseLandmarker (33 pts) desde el inicio**, dentro de `fitpose-native`, tras interfaz común `PoseEstimator`. **Plan B:** `react-native-fast-tflite` 3.0.1 + MoveNet (17 pts) si el módulo no corre a 30 FPS en el Pixel 7 Pro o el S26 Ultra al final de la semana 3 | [SPIKE] |
| Dibujo | Skia 2.14 (no saltar a 3.x). Canvas + SharedValue por defecto; `vision-camera-skia` si hay desfase de orientación | [SPIKE] |
| SQLite | **expo-sqlite ~58.0.14** (viene en `bundledNativeModules` SDK 58 [V]). **Se cambia op-sqlite** (0.52.1 en npm [V]) porque no está en el set de Expo, exige fijar versión y plugin a mano, y la ventaja (velocidad bruta, SQLCipher) no aplica: el volumen es de cientos de filas y la cinemática no toca la BD. Reabrir solo si aparece cuello de botella medido | cambio |
| Audio | **expo-audio ~58.0.10** [V] (expo-av está obsoleto [NV: confirmar aviso en SDK 58]). Latencia de efectos cortos no garantizada [NV]. Plan: medir en parte 3; si >60 ms perceptibles, SoundPool en el módulo nativo propio `fitpose-native` (el mismo que expone el estado térmico). `AudioServices` es iOS, irrelevante ahora | [SPIKE] |
| Háptica | `expo-haptics` ~58.0.7 [V], disparada en paralelo al sonido | |
| Enrutado | **Expo Router ~58.0.28** [V], rutas por archivos en `app/`. Cámara fuera del árbol de pestañas (stack modal a pantalla completa) | |
| Estado/datos | **Zustand 5** (estado de sesión en vivo, ajustes, sesión de usuario) [V 5.0.16]. Persistencia en SQLite vía repositorios, no en Zustand persist. **TanStack Query: no en el MVP** (todo es local-first, sin lecturas remotas paginadas); se añade con ligas (etapa 2) | simplificado |
| i18n | `i18next` + `react-i18next` + `expo-localization` ~58.0.5 [V]. Español como idioma base y de fallback | |
| Login | `@react-native-google-signin/google-signin` (nativo, 16.2.0 [V npm]) + `supabase.auth.signInWithIdToken`. Alternativa `expo-auth-session` (navegador, peor UX) [NV: elegir en parte 5] | |
| Sesión/Tokens | `expo-secure-store` ~58.0.2 [V] para refresh token vía adaptador de storage de supabase-js 2.x [V 2.118.0]. Sin AsyncStorage | |
| Recordatorios | `expo-notifications` ~58.1.7 [V], solo **locales** programadas (push remoto sigue fuera de alcance). Permiso `POST_NOTIFICATIONS` en Android 13+ pedido tras el primer entrenamiento, no al arrancar | |
| Térmica | No hay API en Expo [NV]. `fitpose-native` (Expo Modules API, Kotlin) expone `PowerManager.addThermalStatusListener` (API 29+). `expo-battery` ~58.0.3 [V] da nivel y ahorro de energía | |
| Otros | `expo-keep-awake`, `expo-build-properties`, `expo-dev-client`, `expo-localization` [V]. `react-native-mmkv` no necesario | |

Carpetas propuestas originales (/kinematics /vision /gamification /ui /audio /database) siguen siendo válidas; se reorganizan en la sección 10.

## 1. Mapa de módulos y límites

```
app/ (Expo Router: solo rutas finas, sin lógica)
  │
  ▼
features/  (pantallas + hooks por caso de uso: onboarding, workout, summary, habit, auth, settings)
  │        │            │             │
  ▼        ▼            ▼             ▼
vision/  audio/      gamification/  data/ ───► sync/ ───► Supabase
  │      haptics/        │            ▲ (repos sobre expo-sqlite)
  ▼                      ▼            │
kinematics/ ◄─────── (solo tipos) ────┘
  ▲
  └─ core/ (tipos, result, reloj, utilidades puras)  ◄── todos pueden importar core
ui/ (componentes y tema, sin lógica de dominio)   i18n/   native/ (fitpose-native: térmica, SoundPool)
```

Reglas de dependencia (verificables con `eslint-plugin-boundaries` o `dependency-cruiser` en CI):
- `kinematics/` y `gamification/` son **TypeScript puro**: sin React, sin RN, sin Expo, sin reloj global (reciben `now`/`zona` por parámetro). Solo importan `core/`.
- `vision/` importa `core/` y `native/`; no conoce ejercicios. Emite `Pose` (landmarks normalizados con visibilidad).
- `kinematics/` consume `Pose`, produce `RepEvent`/`FormFault`/ángulos. No sabe de cámara.
- `data/` (SQLite, repos) no importa `features/`. `sync/` solo habla con `data/` y `supabase`.
- `features/` orquesta; `app/` solo monta. `ui/` no importa `data/` ni `vision/`.
- `gamification/` calcula XP/racha/misiones sobre `SessionSummary`; persistencia en `data/`.

## 2. Modelo de hilos

```
[Hilo cámara nativo] ──Frame──► [Runtime worklet "frame"] ──► [Hilo UI]      [Hilo JS]
  VC 5 (YUV/RGB)               useFrameOutput.onFrame           Skia/Reanim.  Hermes
                               1 resize (resizer, nativo)       lee SharedValue React, Zustand,
                               2 TFLite (HybridObject)                         SQLite, nav
                               3 postproceso + One-Euro
                               4 FSM cinemática (puro)
                               5 frame.dispose() en finally
```

- **Cámara/inferencia/cinemática** corren juntas en el worklet de `onFrame` (runtime de `react-native-worklets`). Evita cruces de hilo por cuadro. Las funciones de `kinematics/` se marcan `'worklet'` y se importan sin dependencias de RN para poder probarlas en Node. [NV: comprobar que el plugin Babel de worklets procesa archivos de un módulo puro; si no, envolver en una capa `kinematics/worklet.ts`].
- **Contrapresión**: `dropFramesWhileBusy: true` (por defecto [V]); `onFrameDropped` alimenta un contador de métricas. `frame.dispose()` siempre en `try/finally`. Si se pasa a MediaPipe nativo: `LIVE_STREAM` + `detectAsync`, mailbox de tamaño 1 [NV nombre de API v5].
- **Datos a la UI**: `SharedValue<Float32Array>` con landmarks suavizados (33x3 o 17x3) + `SharedValue` de fase/ángulo; Skia lee en el hilo UI a 60 Hz con interpolación entre muestras. Nada de `runOnJS` por cuadro.
- **Eventos de baja frecuencia** (repetición contada, falla de forma, visibilidad baja, cambio de fase) usan `scheduleOnRN`/`runOnJS` (nombre exacto según worklets 0.13 [NV]) hacia un store Zustand; React solo re-renderiza HUD (contador, mensaje), con selectores finos.
- **Audio/háptica** se disparan desde JS al recibir el evento de repetición (latencia de un salto de hilo, aceptable) y solo si no se supera el presupuesto medido; si no, dispararlos desde el worklet mediante `fitpose-native` [SPIKE].
- **No bloquear UI**: SQLite y sync fuera del flujo de cuadros; durante la sesión solo se acumula en memoria (buffer de reps) y se escribe al terminar (una transacción). Sin `console.log` por cuadro.

## 3. Flujo de una sesión

1. **Permiso de cámara**: `useCameraPermission` de VC; explicación previa en español (el vídeo no sale del teléfono); si se deniega permanentemente, pantalla con botón a Ajustes. Estados: `undetermined | granted | denied | blocked`.
2. **Colocación**: guía por ejercicio (flexión: móvil de lado y en el suelo; sentadilla y jumping jack: de frente/ligeramente lateral, 1,5-3 m). Detección en vivo de silueta completa: todos los landmarks requeridos con visibilidad >= 0.65 y dentro del encuadre, 1 s estable.
3. **Calibración**: 3 repeticiones guiadas; se calculan rangos propios (ángulo máximo/mínimo de rodilla, codo, etc.); umbrales = rango observado con tolerancia de ±10° (requisito). Se guarda el perfil por ejercicio en SQLite para sesiones siguientes (recalibración rápida de 1 rep).
4. **Conteo**: FSM `IDLE → DESCENDING → INFLECTION → ASCENDING → COMPLETED` más `FAULT`. Visibilidad media < 0.65 durante 3 cuadros → pausa del conteo y aviso. Cada `COMPLETED` emite `RepEvent{ts, calidad, faults[]}`: sonido + háptica + XP provisional en HUD.
5. **Resumen**: al terminar o salir, `SessionSummary` (reps, calidad media, duración, XP, fallas frecuentes, FPS medio y eventos térmicos como diagnóstico). `gamification` calcula XP, racha y misiones.
6. **Guardado local**: una transacción en SQLite: `sessions`, `reps` (opcional resumidas), `xp_events`, actualización de racha/misiones; todas las filas con `sync_state = 'pending'`.
7. **Sincronización**: ver sección 5. La app nunca espera a la red para mostrar el resumen.
8. Si la app pasa a segundo plano: se cierra la sesión como `interrupted` y se guarda lo contado.

## 4. Pantallas y navegación (MVP)

Expo Router:

```
app/
  _layout.tsx                  # providers: i18n, BD lista, sesión, tema
  (onboarding)/welcome, permissions     # parte 0-1 (permisos), parte 5 (login opcional)
  (auth)/sign-in                        # parte 5
  (tabs)/index   (Hoy: racha, misión, botón "Entrenar")        # parte 6
         exercises (elegir sentadilla / jumping jack / flexión) # parte 3-4
         progress  (historial, XP, nivel)                       # parte 5-6
         settings  (idioma, recordatorios, cuenta, calibración) # parte 5-6
  workout/[exercise]/setup      # colocación + calibración      # parte 3-4
  workout/[exercise]/live       # cámara + HUD (pantalla completa, sin tabs)
  workout/summary/[sessionId]   # resumen + XP + racha          # parte 3, 6
  spike                         # pantalla de prueba, solo dev  # parte 1
```

Login es opcional (se puede entrenar sin cuenta; la sincronización empieza tras iniciar sesión y sube lo pendiente).

## 5. Capa de datos

**SQLite (expo-sqlite)**: migraciones versionadas (`PRAGMA user_version`), un archivo `schema/NNN_*.sql`. Tablas: `profile`, `exercise_calibration`, `sessions`, `reps`, `xp_events`, `streak_days`, `missions`, `mission_progress`, `settings`, `outbox`. IDs UUID v7 generados en cliente (`expo-crypto`), `created_at`/`updated_at` UTC en ms, `local_date` (día local calculado con la zona del usuario) y `tz` guardados en cada sesión.

**Repositorios** (`data/repos/*`): interfaces en `core`/`data` (`SessionRepo.save(summary)`, `StreakRepo`, …) con implementación SQLite y una en memoria para pruebas. Ninguna pantalla ejecuta SQL.

**Sincronización** (`sync/`): patrón *outbox* — cada escritura local inserta una fila en `outbox` en la misma transacción. Un `SyncEngine` envía lotes `upsert` por `id` (idempotente) a Supabase cuando hay red (`expo-network`) y sesión; reintentos con backoff exponencial; se dispara al abrir la app, al cerrar una sesión y en `expo-background-task` ~58.0.11 [V] (oportunista, no crítico). Conflictos: las sesiones son inmutables (solo se insertan) → sin conflictos; ajustes y perfil: último escritor gana por `updated_at`. Racha/XP se **recalculan** desde sesiones, no se sincronizan como contadores.

**Supabase**: proyecto aislado nuevo. Tablas espejo con `user_id uuid default auth.uid()`, RLS `user_id = auth.uid()` para select/insert/update y sin delete; índices por `(user_id, created_at)`; sin vídeo ni landmarks crudos. Tipos TS con `generate_typescript_types`. Migraciones en `supabase/migrations/`.

**Sesión de usuario**: `AuthService` envuelve Google Sign-In → `signInWithIdToken` → supabase-js con storage en SecureStore (chunking si el token supera el límite de ~2 KB [NV]). `autoRefreshToken` activado solo con la app en primer plano (AppState). Al cerrar sesión se conserva el dato local anónimo solo si el usuario lo decide; migración de datos locales a la cuenta tras el primer login (asignar `user_id` al subir).

**Racha y día cerrado** (parte 6): día = fecha local según `tz` guardada en la sesión **con corte a las 03:00** (`local_date = fecha de (hora local - 3 h)`); un día cuenta para la racha con **>= 20 repeticiones válidas o >= 3 minutos activos** (sin contar calibración); sin protectores en el MVP (un día cerrado sin actividad rompe la racha); cambio de zona no rompe racha (se usa la `local_date` almacenada); cálculo puro y probado con relojes simulados. Sin servidor de tiempo: se detecta reloj manipulado de forma básica (retroceso del reloj) y se registra, sin bloquear (anti-trampas fuera de alcance).

## 6. i18n

- `i18next` con recursos `es` (base y fallback) y `en` preparado; claves por feature (`workout.fault.kneeCave`), nunca texto en componentes; `es-419` y `es-ES` comparten `es` hasta que haga falta variar.
- Idioma inicial por `expo-localization`; ajuste manual en Settings guardado en `settings`.
- Plurales con `_one/_other` de i18next (v4 JSON); fechas y números con `Intl` [NV: Hermes en Android trae Intl; probar `es`].
- Mensajes de voz/audio de corrección: archivos por idioma (`assets/audio/es/…`); el MVP usa solo tonos neutros más texto.
- Regla de CI: script que falla si una clave de `es` falta en `en` o hay claves sin usar.

## 7. Térmica, batería y permisos

- Estado térmico por `fitpose-native` (`THERMAL_STATUS_*`); política: `NONE/LIGHT` 30 FPS; `MODERATE` 25; `SEVERE` o peor → **20 FPS** (más `onFrame` que descarta por tiempo, la FSM no cambia: usa `ts` real, no conteo de cuadros) y mensaje al usuario; `CRITICAL` → pausar y sugerir descanso. Histéresis de 30 s para subir de nuevo.
- Batería: `expo-battery`; si nivel < 15 % o ahorro de energía activado, empezar a 20 FPS y avisar. `expo-keep-awake` activo solo en `live`. Brillo no se toca en el MVP.
- Resolución 640x480 y tensor 192/256; sin segunda superficie de vídeo. Registrar FPS medio, descartes y eventos térmicos por sesión (diagnóstico local).
- Permisos: cámara (obligatorio), notificaciones (opcional, tras primer entrenamiento). Estados explícitos y pantalla de recuperación hacia Ajustes. Revalidar permiso al volver a primer plano.

## 8. Pruebas y CI

| Capa | Herramienta | Qué |
|---|---|---|
| Cinemática y gamificación | Jest (ts-jest/babel, entorno `node`) o Vitest | Fixtures JSON de landmarks, FSM, One-Euro, ángulos, racha con reloj/zona simulados; suite < 2 s; objetivo >95 % de precisión de conteo en fixtures. Fixtures se graban desde la app (modo dev) |
| Datos | Jest + SQLite en memoria (`better-sqlite3` como doble [NV: compatibilidad de SQL con expo-sqlite]) | Migraciones, repos, outbox, idempotencia del sync con Supabase simulado |
| Componentes | `@testing-library/react-native` | HUD, resumen, estados de permiso, i18n |
| Integración | Jest con repos reales en memoria | Flujo sesión → resumen → XP/racha → outbox |
| Dispositivo | Pantalla `spike` + checklist de `pose-spike-research.md` §6 (FPS, p95, descartes, térmica 10-15 min, jank) en S26 Ultra y Pixel 7 Pro; opcional Maestro para el flujo de onboarding/login [NV] | Manual por hito (partes 1, 3, 4) |
| Estática | `tsc --noEmit` (strict), ESLint con regla de límites, `expo-doctor`, `npx expo install --check` | |

CI (GitHub Actions): en cada PR `typecheck`, `lint`, `test`, `i18n:check`, `expo-doctor`; sin build nativo por PR. Build EAS `preview` manual o por etiqueta/rama `main`.

## 9. EAS Build

- `eas.json`: `development` (`developmentClient: true`, `distribution: internal`, APK, `applicationId` sufijo `.dev`), `preview` (internal, APK, release con Hermes, sufijo `.preview`), `production` (AAB, `autoIncrement`). Cada variante con su `app.config.ts` dinámico (nombre, id, esquema, URL de Supabase).
- Perfil de canal de actualizaciones (`expo-updates`/EAS Update) **fuera del MVP**; no cambia código nativo, valorarlo después.
- Secretos: la clave `anon` de Supabase es pública por diseño (la seguridad es RLS); URL y anon key como `EXPO_PUBLIC_*` por perfil en EAS environment variables. **Nunca** `service_role` ni secretos OAuth del servidor en el cliente. Google Web Client ID por variante; SHA-1 de las claves (debug, upload, Play App Signing) registrados en la consola de Google. Keystore gestionado por EAS. Secretos de CI en GitHub Secrets (`EXPO_TOKEN`). `.env*` ignorados por git.
- Plugins de config: `expo-build-properties` (minSdk, targetSdk, 16 KB page size [NV]), plugin de fast-tflite (GPU libs), plugin propio de `fitpose-native` (y `.task`/Gradle de MediaPipe cuando toque).
- Verificar en la parte 0: build de desarrollo en ambos móviles; si VC 5.2.3 no compila con RN 0.88, bajar a SDK 57.

## 10. Estructura del repo y convenciones

```
fitpose/
  app/                      # rutas Expo Router (finas)
  src/
    core/                   # tipos (Pose, Landmark, RepEvent), Result, reloj, utilidades
    kinematics/             # ángulos, One-Euro, FSM por ejercicio, umbrales, calibración
    vision/                 # PoseEstimator (movenet / mediapipe), camera hooks, resize
    gamification/           # XP, niveles, racha, misiones (puro)
    data/                   # db.ts, migrations/, repos/
    sync/                   # outbox, SyncEngine, supabase client
    audio/ haptics/         # SoundService, HapticsService
    features/               # auth, onboarding, workout, summary, habit, settings
    ui/                     # componentes y tema
    i18n/                   # config, locales/es.json, en.json
  modules/fitpose-native/   # Expo module Kotlin: térmica, SoundPool, (luego MediaPipe)
  assets/ (models/, audio/, fixtures/)
  supabase/migrations/
  docs/  CLAUDE.md  eas.json  app.config.ts
```

Convenciones: TS `strict`, `noUncheckedIndexedAccess`, sin `any` (regla ESLint); landmarks como `readonly` y en buffers tipados; alias `@/`; un archivo de pruebas junto a cada módulo (`*.test.ts`); commits convencionales; funciones puras sin efectos en `kinematics`/`gamification`; ninguna dependencia nueva sin anotar versión y razón en `docs/decisions.md`; versiones de VC, nitro y worklets fijas (sin `^`).

## 11. Riesgos y decisiones abiertas

1. VC 5.2.3 + RN 0.88 + nueva arquitectura sin probar (mitigación: parte 0/1 primero; retroceso SDK 57). Alto.
2. **Plazo del módulo Kotlin MediaPipe (2-4 semanas) frente a 6-8 semanas.** El usuario eligió ir directo a MediaPipe (33 puntos). Mitigación: punto de decisión al final de la semana 3; si no corre a 30 FPS en ambos dispositivos, se pasa a MoveNet (plan B, 3-6 días) y se sigue con las partes 2 y 3. El adaptador de landmarks es independiente del modelo para que el cambio sea barato.
3. Flexiones de lado: con 33 puntos hay hombro, codo, muñeca, cadera y tobillo; el riesgo baja pero la oclusión de un lado del cuerpo sigue existiendo. Validar en la parte 4.
4. Latencia de `expo-audio` para efectos; fallback SoundPool.
5. API de worklets 0.13 para volver a JS y `runAsync` en VC v5 [NV]; leer documentación de VC v5 (margelo.com no accesible en el spike).
6. Estado térmico sin API Expo: depende de `fitpose-native`; sin dispositivo de gama media.
7. Google Sign-In nativo exige configuración de SHA-1 por variante; error frecuente.
8. Privacidad: política antes de publicar; datos de salud y cuenta.
9. Abiertas: nombre/ID de paquete; guardar o no cada repetición en servidor; dataset/imágenes de ejercicios (licencias); `expo-background-task` en Android es oportunista (Doze).

## 12. Primeros pasos (partes 0 y 1)

Parte 0
1. Crear repo, `.gitignore`, `CLAUDE.md` (reglas de límites, comandos, `frame.dispose()`), `docs/decisions.md`.
2. `create-expo-app` SDK 58 TS; activar `strict`, `noUncheckedIndexedAccess`; ESLint + Prettier + regla de límites; Jest.
3. Scripts: `typecheck`, `lint`, `test`, `i18n:check`; CI en GitHub Actions.
4. `expo-dev-client`, `expo-build-properties`; `app.config.ts` con variantes; `eas init`, `eas.json` (dev/preview/prod).
5. Proyecto Supabase nuevo y aislado; guardar URL/anon key como variables de EAS.
6. Primer `eas build -p android --profile development`; instalar en S26 Ultra y Pixel 7 Pro (criterio parte 0).

Parte 1
7. Instalar con `expo install` y fijar a mano: VC 5.2.3, `vision-camera-worklets`, `react-native-worklets` 0.13.x, `nitro-modules` (versión de VC), Skia 2.14, reanimated, resizer; plugin Babel de worklets último. Rebuild de desarrollo. Si falla: SDK 57.
8. Pantalla `spike`: permiso de cámara + `useFrameOutput` con 640x480, contador de `onFrameDropped`, `frame.dispose()` en `finally`.
9. Crear `fitpose-native` (módulo Expo en Kotlin) con MediaPipe `PoseLandmarker` en modo `LIVE_STREAM` o por imagen, recibiendo el cuadro de VisionCamera y devolviendo los 33 landmarks; probar delegados CPU/GPU; medir etapas (conversión del cuadro, inferencia, post) con p50/p95. Si en la semana 3 no se cumple el criterio de salida, plan B: `fast-tflite` 3.0.1 + MoveNet Lightning.
10. Esqueleto: Canvas Skia + SharedValue; validar orientación, espejo, cámara frontal/trasera; comparar con `vision-camera-skia`.
11. Indicador de jank (contador animado) y FPS UI/JS; 10 min por dispositivo con temperatura y descartes.
12. Plan B preparado en paralelo (máx. 2 días, solo si el paso 9 se retrasa): MoveNet con `fast-tflite` en el mismo arnés para comparar.
13. Registrar resultados en `docs/spike-results.md` frente a los criterios de salida (30 FPS, p95 < 33 ms, < 5 % descartes) y fijar la decisión.
