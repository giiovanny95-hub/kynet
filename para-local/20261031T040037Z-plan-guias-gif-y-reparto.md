---
id: 20261031T040037Z-plan-guias-gif-y-reparto
de: nube
tipo: plan
requiere: pc
responde-a: 20261031T030000Z-g0-stitch-v2
commit: feat/partes-0-1-2@349f678
---

# Reparto nuevo: Codex fuera de los planes. Guías con los GIF del usuario y ayuda tras 3 correcciones

## Reparto (decisión del usuario, 2026-10-31)
- El usuario trabaja **por su cuenta con Codex** para diseñar y te entrega assets (por ejemplo, GIF en su carpeta de
  Descargas). **Tú lo implementas todo**, lógica y pantallas.
- No delegues en Codex salvo que el usuario lo pida. Ya está en `CLAUDE.md`, `AGENTS.md` y `estado.md`.
- **G1 (`560cd95`, Lottie por código):** queda **sin usar**. No lo conectes a la app; se retira si el usuario lo
  confirma. Libera el worktree y la reserva de esa tarea si siguen activos.

## G0 aceptado
- Correcto conservar "Ana" en Hoy.
- **Bienvenida (decisión del usuario):** paso 0 del onboarding.
  - "Empezar" es la acción principal, sin cuenta.
  - "Ya tengo cuenta" es la secundaria, con Google, y solo aparece si `loginAvailable`.
  - Sin Facebook, Apple, email, "crear cuenta" ni resplandor.
  - **La edad se pide igual** si no hay fecha local.
  - Ya está en `spec-diseno` §2.

## Qué hacer: `docs/superpowers/plans/2026-10-31-diseno-v2-guias.md` (rehecho), H1 → H6 y después H7
1. **H1:** copia el GIF del jumping jack de Descargas a `assets/guides/jumping-jack.gif`.
   - Límites: ≤ 2 MB y ≤ 720 px; si pasa, conviértelo a WebP animado en local.
   - Mide `loopMs`.
   - Procedencia en `licencias-assets.md`. Pregunta al usuario el nombre del archivo y la herramienta si no está
     claro.
2. **H2:** `guides.ts` (`guideFor` devuelve `null` si no hay guía) y prefs `techniqueHelp` y `guideSeen`.
3. **H3:** "Así se hace" la primera vez de cada ejercicio, con "Entendido" y "No mostrar más ayudas", más "Ver cómo
   se hace" en la colocación. Con `expo-image`, que ya está instalado.
4. **H4:** `techniqueHelp.ts` puro, que dispara con **3 correcciones seguidas** (incompleta, falta crítica o válida
   con falta de forma). Una repetición limpia reinicia; como mucho una ayuda cada 60 s.
   - Al dispararse: **pausa la sesión**, abre la tarjeta emergente, la cierra a los `max(loopMs, 3 s)` o con
     "Seguir" y **reanuda**.
   - Prueba en el Pixel con el jumping jack.
5. **H5:** "Ayudas de técnica" y "Volver a ver las guías" en Perfil.
6. **H6:** bienvenida.
7. **H7:** resto de pantallas v2 y HUD (E2 y E2.8), **sin mini-guía**.

Por ahora **solo hay guía del jumping jack**. Sentadilla y flexión, cuando el usuario las entregue: sin animaciones
provisionales.

## Vista de frente (en pausa por el usuario)
Al reanudarla, primero **F2.2c**: el guardia de sujeto compara con la **mediana del torso de 500 ms** en lugar de con
el último cuadro, para las dos vistas.
- Tests: lateral y benchmark sin cambios; un sujeto nuevo real sigue detectado; la rejilla con σ 0,008 da ≥ 9/10.
- Está en el plan de vista de frente.

Buen trabajo con el fantasma de MediaPipe (`0d6fc31`).

Espero un `tipo: estado` por H1-H3, H4 (con la prueba en el teléfono) y H5-H6.
