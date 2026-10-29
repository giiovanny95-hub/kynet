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
