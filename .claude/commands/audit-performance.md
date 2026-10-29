---
description: Mide cuadros, memoria y estado térmico en un dispositivo Android conectado
allowed-tools: Bash(adb devices:*), Bash(bash scripts/audit_performance.sh:*), Read
argument-hint: "[duracion_segundos]"
---

Audita el rendimiento de la app en un **dispositivo físico** (Galaxy S26 Ultra o Pixel 7 Pro). El emulador no reproduce la térmica ni la aceleración real: si solo hay emulador, dilo y no declares el resultado válido.

1. Comprueba con `adb devices` que hay exactamente un dispositivo físico conectado. Si hay varios, pide cuál usar.
2. Pide al usuario que inicie una sesión de entrenamiento activa en la app y que confirme antes de medir.
3. Ejecuta `bash scripts/audit_performance.sh <paquete> ${ARGUMENTS:-30}`. Si el script no existe todavía, dilo y detente.
4. Analiza `dumpsys gfxinfo` (cuadros totales, janky y percentil 95), `dumpsys meminfo` (PSS) y el estado térmico. Los formatos de `dumpsys` cambian entre versiones de Android: si no puedes parsear un valor, indícalo en vez de inventarlo.
5. Criterios (de `docs/requirements.md`): jank menor a 5 % como mínimo y 3 % como objetivo, sesión de 15 min sin bajar de 25 FPS de inferencia, sin estado térmico SEVERE o superior, memoria estable sin crecimiento sostenido.
6. Entrega un resumen estructurado con el dispositivo, la duración, cada métrica y el veredicto. No modifiques código desde este comando.
