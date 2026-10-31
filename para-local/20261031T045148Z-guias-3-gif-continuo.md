---
id: 20261031T045148Z-guias-3-gif-continuo
de: nube
tipo: plan
requiere: pc
responde-a: 20261031T040037Z-plan-guias-gif-y-reparto
commit: feat/partes-0-1-2@facb259
---

# Los 3 GIF están en Descargas: implementa H1 → H7 en modo continuo

El usuario terminó las **3 guías** (jumping jack, sentadilla y flexión) y las dejó en su carpeta de **Descargas**.
Pide que sigas **de forma automática**.
- Plan actualizado: `docs/superpowers/plans/2026-10-31-diseno-v2-guias.md` (`6b17abe`).
- Spec: `docs/spec-diseno.md` §11.

## Modo continuo (autorizado por el usuario)
- Ejecuta **H1 → H6 y después H7 sin esperar mi revisión entre tareas.**
- Cada tarea con TDD, `npm run verify` en verde, commit y push a `feat/partes-0-1-2`.
- Un `tipo: estado` por bloque:
  - H1-H3;
  - H4, con la prueba en el teléfono;
  - H5-H6;
  - cada pantalla de H7.

  Reviso de forma asíncrona; si encuentro algo, te llega como tarea nueva.
- **Solo paras** ante:
  - una contradicción con la spec;
  - un fallo que no resuelvas con `systematic-debugging`;
  - algo de pago;
  - un nombre de archivo ambiguo, que preguntas al usuario directamente.
- Las pruebas en el teléfono, cuando el usuario esté. No bloquean lo que no necesita teléfono.

## Lo esencial de cada tarea
- **H1:** los 3 GIF de Descargas a `assets/guides/`:
  - `jumping-jack.gif`, `squat.gif` y `push-up.gif`, o `<ejercicio>-front/-side.gif` si hay variantes;
  - ≤ 2 MB y ≤ 720 px; si alguno pasa, WebP animado en local;
  - `loopMs` de cada uno;
  - procedencia en `licencias-assets.md`.
- **H2:** `guides.ts` con los 3, y prefs `techniqueHelp` y `guideSeen`.
- **H3:** "Así se hace" la primera vez de cada ejercicio, con `expo-image` y los consejos del plan, "Entendido" y
  "No mostrar más ayudas", más "Ver cómo se hace" en la colocación.
- **H4:** ayuda tras **3 correcciones seguidas**:
  - pausa;
  - tarjeta emergente;
  - cierre a los `max(loopMs, 3 s)` o con "Seguir";
  - reanudación;
  - como mucho una cada 60 s.

  Prueba en el Pixel con el jumping jack y la sentadilla.
- **H5:** "Ayudas de técnica" y "Volver a ver las guías" en Perfil.
- **H6:** bienvenida "Empezar" y "Ya tengo cuenta" (Google), sin saltarse la edad.
- **H7:** resto de pantallas v2 y HUD, sin mini-guía.

La vista de frente sigue en pausa. El Lottie de G1 no se conecta.
