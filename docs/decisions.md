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
| 2026-10-29 | nitrogen | 0.37.0 (exacta) | Generar el código Nitro de `modules/fitpose-native` (`npm run codegen` dentro del módulo) |
| 2026-10-29 | Plantilla `create-nitro-module` | 3.7.1 | Solo se tomó la carpeta `android/` y `post-script.js`; lo demás (publicación, semantic-release) se descartó |
| 2026-10-29 | com.google.mediapipe:tasks-vision | 0.10.21 — **NO VERIFICADA** | Maven no responde desde el entorno cloud; confirmar la versión vigente al compilar en EAS |
| 2026-10-29 | Modelo pose_landmarker_lite.task (float16, v1) | sha256 59929e1d…574a | Descarga verificada en `postinstall` (`scripts/fetch-pose-model.sh`); no se versiona |
| 2026-10-29 | Marca **KYNET** (decisión del usuario) | — | Nombre, identidad y estilo según `docs/marca/`. Renombrado completo: `com.kynet.app`, esquema `kynet`, módulo `modules/kynet-native`. Se mantiene el slug `fitpose` porque identifica el proyecto EAS. La navegación sigue la de las specs (Hoy · Progreso · Misiones · Perfil) y el MVP no cambia |
| 2026-10-29 | expo-font, @expo-google-fonts/montserrat, @expo-google-fonts/inter | ~58.0.11, 0.4.2, 0.4.2 | Tipografías del manual KYNET (licencia OFL), aprobadas por el usuario; cada peso se importa por su ruta |
