# Decisiones y dependencias

Cada dependencia nueva se anota con versión y razón.

| Fecha | Dependencia / decisión | Versión | Razón |
|-------|------------------------|---------|-------|
| 2026-10-29 | create-expo-app (plantilla `blank-typescript@sdk-58`) | 5.0.0 | Esqueleto inicial |
| 2026-10-29 | expo | ~58.0.21 | SDK 58 (RN 0.88.1, React 19.3) |
| 2026-10-29 | expo-router y dependencias (screens, safe-area, linking, constants) | versiones de SDK 58 | Navegación por archivos (`spec-arquitectura.md` §4) |
| 2026-10-29 | `expo install` se ejecuta con `EXPO_OFFLINE=1` | — | El proxy del entorno cloud bloquea la API de Expo; usa la tabla local de versiones del SDK |
| 2026-10-29 | vitest | 5.0.5 | Pruebas unitarias (entorno node) |
| 2026-10-29 | vite | 8.3.5 | Peer de vitest; con `legacy-peer-deps` no se instala sola |
| 2026-10-29 | eslint, @eslint/js, typescript-eslint | 10.13.0, 10.0.1, 8.72.1 | Lint y regla de límites de `kinematics` (typescript-eslint admite TS < 6.1; el SDK trae TS 6.0.3) |
| 2026-10-29 | `.npmrc` con `legacy-peer-deps=true` | — | El SDK 58 fija react 19.3.0 y un react-dom transitivo pide 19.3.1; sin esto npm no instala nada |
| 2026-10-29 | expo-localization | versión de SDK 58 | Idioma inicial del dispositivo |
| 2026-10-29 | i18next, react-i18next | 26.5.11, 17.1.9 | i18n con español base (`spec-arquitectura.md` §6) |
| 2026-10-29 | Scripts en TypeScript con `node` (type stripping de Node 22) | — | Sin dependencia extra como tsx |
| 2026-10-29 | react-native-vision-camera, react-native-vision-camera-worklets | 5.2.4 (exacta) | Cámara y frame processors (parte 1) |
| 2026-10-29 | react-native-nitro-modules, react-native-nitro-image | 0.37.0, 0.15.2 (exactas) | Peers de VisionCamera 5; mismas versiones que usa VisionCamera en su desarrollo |
| 2026-10-29 | react-native-worklets, react-native-reanimated, @shopify/react-native-skia | 0.13.0, 4.7.1, 2.14.0 (exactas, las del SDK 58) | Worklets, valores compartidos y dibujo del esqueleto |
| 2026-10-29 | Sin `babel.config.js` | — | `babel-preset-expo` del SDK 58 añade solo el plugin de `react-native-worklets` |
| 2026-10-29 | Riesgo abierto | — | VisionCamera 5.2.4 se desarrolla con RN 0.85.3; con RN 0.88.1 solo se sabrá al compilar en EAS. Si falla, retroceder a SDK 57 |
| 2026-10-29 | nitrogen | 0.37.0 (exacta) | Generar el código Nitro de `modules/kynet-native` (`npm run codegen` dentro del módulo) |
| 2026-10-29 | Plantilla `create-nitro-module` | 3.7.1 | Solo se tomó la carpeta `android/` y `post-script.js`; lo demás (publicación, semantic-release) se descartó |
| 2026-10-29 | com.google.mediapipe:tasks-vision | 0.10.21 — **NO VERIFICADA** | Maven no responde desde el entorno cloud; confirmar la versión vigente al compilar en EAS |
| 2026-10-29 | Modelo pose_landmarker_lite.task (float16, v1) | sha256 59929e1d…574a | Descarga verificada en `postinstall` (`scripts/fetch-pose-model.sh`); no se versiona |
| 2026-10-29 | Marca **KYNET** (decisión del usuario) | — | Nombre, identidad y estilo según `docs/marca/`. Renombrado completo: `com.kynet.app`, esquema `kynet`, módulo `modules/kynet-native`. El 2026-10-30 también el repo de GitHub (`kynet`), el proyecto EAS (nuevo, `@geovanniavs-team/kynet`, id `bcfd17cb…`) y el nombre del proyecto de Supabase (`kynet-dev`). La navegación sigue la de las specs (Hoy · Progreso · Misiones · Perfil) y el MVP no cambia |
| 2026-10-29 | expo-font, @expo-google-fonts/montserrat, @expo-google-fonts/inter | ~58.0.11, 0.4.2, 0.4.2 | Tipografías del manual KYNET (licencia OFL), aprobadas por el usuario; cada peso se importa por su ruta |
| 2026-10-30 | Memoria del proyecto para Claude Code: `CLAUDE.md` + `.claude/rules/` + hook `SessionStart` + skills `cerrar-sesion`/`aprender` | — | La auto memory es local y no llega a la nube; lo duradero vive en el repo (decisión del usuario) |
| 2026-10-30 | Plugins del proyecto: superpowers, claude-md-management, context7, expo (`claude-plugins-official`) | — | Elegidos por el usuario; `@expo/agent-cli` bloqueado con `permissions.deny` |
| 2026-10-30 | `SQ_HEELS_LIFT`: base de pie = mediana de `h` en los 500 ms previos a la bajada; pico = mediana en ±100 ms del fondo; umbral 0,02 del alto de cuadro; `P_SOFT_MILD` (0,10) | — | La medida por máximo de la fase dio 5/160 avisos falsos con σ 0,008 y 83-87 % de detección (medido por la PC); la spec no fija la penalización y se iguala a `SQ_TRUNK_LEAN` |
| 2026-10-30 | A1 `SQ_HEELS_LIFT` rev. 2: 0 avisos falsos obligatorio; ≥ 95 % de detección hasta σ 0,006; suelo del 85 % con σ 0,008 hasta los fixtures reales de B3; ventana del pico ±100 ms (±150 si mejora sin falsos); base con rodilla extendida descartada por ahora | — | Un aviso falso resta confianza y uno perdido solo pierde un consejo; σ 0,008 es el extremo sintético, el ruido real de MediaPipe en talones manda |
| 2026-10-30 | `SQ_HEELS_LIFT`: ventana del pico **±150 ms** (adoptada) | — | Medido por la PC (20 semillas × 8 reps): 0/160 falsos en todo σ ≤ 0,008 con ±100 y ±150; detección al 3 % con σ 0,006 / 0,008 de 153 / 141 → 154 / 144. Suelo provisional de 136/160 con σ 0,008 hasta B3 |
