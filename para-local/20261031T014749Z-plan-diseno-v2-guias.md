---
id: 20261031T014749Z-plan-diseno-v2-guias
de: nube
tipo: plan
requiere: pc
responde-a:
commit: feat/partes-0-1-2@b0d3539
---

# Plan: diseño v2 con Codex (Stitch actualizado, HUD y guías Lottie de ejercicios)

El usuario quiere que **Codex empiece ya** con la actualización de diseño.
- Plan: `docs/superpowers/plans/2026-10-31-diseno-v2-guias.md`.
- Spec: `docs/spec-diseno.md` (§2 mockup v2, §5 excepción de la mini-guía y §11 guías).

**Decisiones del usuario:**
- mockup **actualizado** de Stitch;
- HUD renovados;
- guías de ejercicio con un **personaje ilustrado en Lottie**, en la colocación y durante el ejercicio.

## Qué haces tú (Claude Code)
1. **G0, primero y corto:** vuelve a exportar el proyecto de Stitch `17277584496938994624` con
   `herramientas/exportar-stitch.mjs` a `docs/diseno/stitch/`.
   - Escribe `CAMBIOS.md` (pantallas nuevas, cambiadas y retiradas, y tokens distintos frente a `tokens.ts`) y
     actualiza el README.
   - Commit y `tipo: estado` a la nube. Desde aquí no se llega a Stitch.
2. **Delega G1 en Codex ya,** en paralelo con G0, porque no depende del mockup:
   `/delegar-codex G1`. Alcance: `scripts/lottie/**`, `assets/lottie/exercises/**`, `package.json` (solo el script
   `lottie:build`) y `docs/licencias-assets.md`. Prompt corto:
   > Lee AGENTS.md, docs/spec-diseno.md §11 y la tarea G1 de
   > docs/superpowers/plans/2026-10-31-diseno-v2-guias.md. Genera por código el personaje Lottie propio con los
   > ángulos de src/kinematics/tools/gen (solo lectura). Commit local en tu worktree y entrega por SHA.

   Cuando lo entregue, manda las capturas `g1-*.png` a la nube: **el usuario tiene que aprobar el aspecto** antes
   de G3.
3. **G2 en Codex** justo después de G1 (un escritor a la vez).
4. **G3 y G4 en Codex** cuando:
   - tu mínimo de pantalla de la ruta rápida esté subido (para no pisaros en `setup.tsx`, `live.tsx` y los
     `locales`);
   - G0 esté hecho.

   G3 y G4 sustituyen a E2.8 y F5 de los otros planes.
5. **G4m tú:** `audit_performance.sh` 300 s en el Pixel y el S26, sin mini-guía y con mini-guía.
   - Criterio: ≤ +1 punto en FPS de inferencia o descartes.
   - Si no cumple, el repliegue va en este orden:
     1. congelar la guía mientras el motor cuenta (`playing=false` fuera de IDLE o pausa);
     2. quitarla del HUD.
6. **G5 en Codex:** E2.1 → E2.7 con los PNG v2. Las pantallas nuevas de v2, solo cuando yo las añada al mapa de §2.

## Lo que no cambia
- Tu ruta rápida de vista de frente y la prueba de hoy con el usuario van primero en tu cola. Codex trabaja en su
  worktree en paralelo.
- Codex no toca `src/kinematics/**` ni `src/vision/**` (G1 solo lee los generadores).
- Nada de pago. Si Codex o Stitch piden algo de pago o una clave nueva, para y pregunta al usuario.
- Espero un `tipo: estado` por G0, por G1 (con las capturas), por G3-G4 y por G4m.
