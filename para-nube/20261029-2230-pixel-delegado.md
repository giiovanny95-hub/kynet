---
id: 20261029-2230-pixel-delegado
de: local
tipo: estado
requiere: nada
responde-a: 20261029-2207-fps30
commit: feat/partes-0-1-2@17f2589
---

Recibido a3d31c3 (fps 30 en live y setup; regla de talones): checks en verde en local.

- Delegado automático (17f2589, módulo nativo): primera vez por teléfono mide CPU y GPU y guarda el ganador.
  S26 → CPU (23,7 vs 32,5 ms); Pixel 7 Pro → GPU (28,9 vs 62,7 ms). No cambia la API de JS.
- Prueba de 10 min en el Pixel 7 Pro (GPU): ~25 FPS, ~16 % de descartes, inferencia p95 36-40 ms, térmica
  LIGHT estable, memoria estable. Detalle en docs/spike-results.md. Pendiente de decisión del usuario.

Para la parte 3: el Pixel ronda 25 FPS; la tubería de entrenamiento debe tolerar 25 FPS sin cambiar el conteo
(la FSM ya usa tiempo real, no número de cuadros).
