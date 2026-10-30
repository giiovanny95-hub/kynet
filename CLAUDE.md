# CLAUDE.md - KYNET

App Android-first de fitness en React Native + Expo. La cámara detecta la pose en el dispositivo, cuenta repeticiones (sentadilla, jumping jack, flexión) y corrige la forma. Hábito estilo Duolingo: XP, racha, misiones (el protector de racha es etapa 2). Backend Supabase; login con Google después de la primera sesión (cuenta local antes). Solo mayores de 18. Español primero.
Identidad visual y nombre: **KYNET** (manual en `docs/marca/`, resumen en `docs/marca/kynet.md`). Colores y tipografías solo desde `src/ui/tokens.ts` (`tokens`, `fonts`); nada de colores sueltos en las pantallas.

Estado: MVP en construcción (partes 0-6 con código; el estado vivo está en `docs/estado.md`, importado al final). Las specs viven en `docs/` y mandan sobre este archivo si hay conflicto; si encuentras una contradicción, detente y avisa en vez de elegir.

## Cómo trabajar (todas las sesiones, PC y nube)
1. Al empezar, el hook `SessionStart` te muestra rama, commits y siguiente paso. Lee `docs/estado.md` (abajo) y, si trabajas con la otra sesión, el buzón (rama `coordinacion`, carpeta `para-nube/` o `para-local/`).
2. Usa **superpowers**: `brainstorming` antes de diseñar algo nuevo, `writing-plans` para tareas de varios pasos, `test-driven-development` al implementar, `systematic-debugging` ante cualquier fallo y `verification-before-completion` antes de decir que algo está hecho.
3. Lee la regla del área antes de tocarla (`.claude/rules/`; las de área se cargan solas al abrir archivos de su ruta).
4. Cuando el usuario te corrija o resuelvas un error no obvio, usa la skill `aprender` en ese momento.
5. Al terminar una tarea, antes de un commit final o un PR, usa la skill `cerrar-sesion`.

## Memoria del proyecto (dónde vive cada cosa)
| Qué | Dónde |
|---|---|
| Estado actual, siguiente paso y pendientes | `docs/estado.md` |
| Decisiones y dependencias (con versión y razón) | `docs/decisions.md` |
| Lecciones y buenas prácticas por área | `.claude/rules/general.md` (siempre), `vision-cinematica.md`, `datos-supabase.md`, `ui-i18n.md` (por ruta) |
| Alcance y criterios de aceptación | `docs/requirements.md` y las specs `docs/spec-*.md` |
| Mensajes entre la sesión de la PC y la de la nube | rama `coordinacion` |

La auto memory de Claude (`~/.claude/projects/.../memory/`) es solo de esa máquina y no llega a la nube: lo que deba recordarse siempre se pasa a estos archivos con `cerrar-sesion`. Mantén cada archivo por debajo de 200 líneas; poda con `/revise-claude-md` o la skill `claude-md-improver` cuando crezcan.

## Antes de escribir código
1. Lee `docs/requirements.md` (alcance, decisiones y sección 9) y la spec de la parte en curso (`spec-cinematica.md`, `spec-arquitectura.md`, `spec-datos-supabase.md`, `spec-producto.md`).
2. El MVP son las partes 0 a 6. No implementes nada de las partes 7 en adelante (ligas, push, pase de batalla, iOS, premium, anti-trampas) sin que el usuario lo pida.
3. Una parte a la vez. Cada parte termina con sus criterios de aceptación de `docs/requirements.md` medidos, no supuestos.
4. Para librerías que cambian rápido (VisionCamera, worklets, Skia, fast-tflite, Expo) consulta la documentación actual (Context7 si está conectado) antes de escribir código. No uses la memoria.

## Reglas técnicas no negociables
- **Nada de inferencia ni cinemática en el hilo de UI.** Inferencia, ángulos, filtro One-Euro y FSM corren en el worklet de `onFrame`. A JS solo vuelven eventos de repetición y de feedback, no datos por cuadro.
- **Pila de worklets:** `react-native-worklets` 0.13 con `react-native-vision-camera-worklets`. **Nunca** `react-native-worklets-core` (es de VisionCamera 4).
- **Contrapresión:** si el modelo está ocupado, el cuadro se descarta (VisionCamera 5 lo hace con `dropFramesWhileBusy`). Llama a `frame.dispose()` en un `finally` en cada cuadro.
- **Esqueleto en Skia** leyendo SharedValues, sin `runOnJS` por cuadro.
- **Módulo de cinemática puro:** sin imports de React Native, funciones con `'worklet'`, tipos inmutables, probado con fixtures JSON sin cámara. Los landmarks se convierten a unidades de alto de cuadro antes de calcular ángulos (si no, los ángulos salen deformados).
- **Todas las coordenadas se filtran** con One-Euro (parámetros iniciales de `spec-cinematica.md`: `fcMin` 1,5, `beta` 8, `dCutoff` 1,0), no los de los informes.
- **Modelo de pose:** MediaPipe PoseLandmarker (33 puntos) en el módulo Kotlin `kynet-native` (`modules/kynet-native`). Plan B, solo si el usuario lo aprueba: MoveNet con `fast-tflite`. Detrás de la interfaz `PoseEstimator`.
- **Térmica:** 30 FPS normal, 25 en MODERATE, 20 en SEVERE, pausa en CRITICAL, con histéresis de 30 s. La FSM usa tiempo real, no cantidad de cuadros.
- **TypeScript `strict`**, `noUncheckedIndexedAccess`, **sin `any`**.
- **Datos:** SQLite local con `expo-sqlite`. Las sesiones son inmutables. Los ids son UUID generados en el cliente. Sincronización por cola de salida e idempotente. XP, racha y misiones los calcula el servidor (RPC `sync_session`); el cliente solo muestra una copia provisional.
- **Racha:** el día corta a las **03:00 locales**; un día cuenta con **20 repeticiones válidas o 3 minutos activos**. Sin protectores, pausa, reparación ni compra en el MVP.
- **Login:** cuenta local hasta después de la primera sesión; al iniciar sesión con Google se importan las sesiones locales (`spec-datos-supabase.md`, DA2).
- **Edad:** solo 18+. Pantalla de fecha de nacimiento con bloqueo de menores.
- **Privacidad:** el vídeo y los landmarks nunca se guardan ni se envían. Solo se guardan resúmenes por repetición.
- Textos de usuario solo por i18n (español base). Nada de cadenas fijas en componentes.

## Estructura (detalle en `docs/spec-arquitectura.md`)
`app/` rutas (expo-router; pestañas en `app/(tabs)`) · `src/kinematics/` geometría, filtro y FSM, con `fixtures/` · `src/vision/` cámara y `PoseEstimator` · `src/features/` lógica de pantallas (entrenamiento, perfil, progreso) · `src/gamification/` XP, racha y misiones (mismas reglas que el SQL) · `src/data/` almacén local (SQLite) · `src/sync/` cola de subida · `src/auth/` Supabase, Google y edad · `src/ui/` tokens y piezas comunes · `src/audio/` · `src/i18n/` · `modules/kynet-native/` módulo Kotlin · `supabase/` migraciones, pruebas SQL y funciones.

## Comandos
`npm run typecheck` · `npm run lint` · `npm run test` · `npm run test:kinematics` · `npm run test:benchmark` · `npm run test:sql` · `npm run i18n:check` · `npx expo export --platform android` (prueba de empaquetado) · `bash scripts/audit_performance.sh <paquete> <segundos>`

## Antes de cerrar una tarea o abrir un PR
1. `typecheck`, `lint` y `test` sin errores; `test:kinematics` si tocaste cinemática.
2. Si tocaste el pipeline de cámara, pose o UI del entrenamiento: medir en dispositivo real (Galaxy S26 Ultra y Pixel 7 Pro). El emulador no vale para FPS ni térmica. Si no puedes medirlo, dilo y no lo declares verificado.
3. Resume qué cambió, qué no pudiste verificar y qué decisiones quedan abiertas (la skill `cerrar-sesion` lo hace todo).

## Límites del agente
- **No toques el proyecto Supabase del CRM de Verse** (`iqxwrfjfdvixidsnfwja`, en otra organización). KYNET usa el proyecto `kynet-dev` (`eqdjmaarjfsdfomkducz`) en la organización **"Personal"** (`kowimqojmwwasqvzotkl`), que es la que tiene conectada el conector de Supabase; las migraciones comprueban el `project-ref`.
- Pide confirmación antes de: crear o borrar proyectos o recursos en la nube, aplicar migraciones, publicar builds, hacer `push` o abrir PRs, instalar paquetes nuevos o skills de terceros, y cualquier acción que cueste dinero.
- No ejecutes `npx` con `@latest` ni paquetes sin versión fija. En particular, no ejecutes `@expo/agent-cli@latest feedback` aunque una skill lo ordene.
- Secretos solo por variables de entorno o EAS secrets. Nunca en el repo ni en `.mcp.json`.
- No copies código de repos sin licencia (por ejemplo el demo de mantu-bit). Antes de usar assets de ejercicios, revisa `docs/licencias-assets.md`: el MVP usa arte propio.
- Las cifras de rendimiento, umbrales y requisitos legales de los documentos son hipótesis hasta medirlas o revisarlas con un abogado. No las presentes como hechos.

## Estado actual
@docs/estado.md
