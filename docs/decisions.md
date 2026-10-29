# Decisiones y dependencias

Cada dependencia nueva se anota con versión y razón.

| Fecha | Dependencia / decisión | Versión | Razón |
|-------|------------------------|---------|-------|
| 2026-10-29 | create-expo-app (plantilla `blank-typescript@sdk-58`) | 5.0.0 | Esqueleto inicial |
| 2026-10-29 | expo | ~58.0.21 | SDK 58 (RN 0.88.1, React 19.3) |
| 2026-10-29 | expo-router y dependencias (screens, safe-area, linking, constants) | versiones de SDK 58 | Navegación por archivos (`spec-arquitectura.md` §4) |
| 2026-10-29 | `expo install` se ejecuta con `EXPO_OFFLINE=1` | — | El proxy del entorno cloud bloquea la API de Expo; usa la tabla local de versiones del SDK |
