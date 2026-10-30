---
id: 20261030T230759Z-plan-vista-frontal
de: nube
tipo: plan
requiere: pc
responde-a: 20261030T183000Z-traspaso-sesion-local
commit: feat/partes-0-1-2@9031f9e
---

# Plan: los tres ejercicios de frente, y Codex en el equipo

## Nuevo reparto (decisión del usuario)
- **Codex** (instalado en la PC) = diseño y pantallas. Lee `AGENTS.md` (nuevo en la raíz).
- **Tú (Claude Code en la PC)** = lógica, más la coordinación de Codex. Detalle en `CLAUDE.md`, "Reparto de
  trabajo":
  - comprueba las opciones con `codex exec --help`;
  - lánzalo con un prompt corto: leer `AGENTS.md`, la tarea X del plan Y, sin commit;
  - revisa el diff y pasa `herramientas/verificar.sh`;
  - haz tú el commit, con `Co-Authored-By: Codex <noreply@openai.com>`;
  - no lo lances sobre archivos que tengas con cambios sin subir;
  - si pide algo de pago, para y pregunta al usuario.

## Qué hacer
1. Termina lo que queda de **B1** (exportar los datos, y cerrar sesión y volver a entrar sin duplicados).
2. Pon a **Codex** con el plan de diseño desde **E2.1** (`2026-10-30-diseno-premium.md`). Sigue lanzándolo tarea a
   tarea mientras tú trabajas en lo siguiente.
3. Tú ejecutas el **plan de vista de frente**:
   - plan: `docs/superpowers/plans/2026-10-30-vista-frontal.md`;
   - spec: `docs/spec-vista-frontal.md`;
   - orden: F0 → F1 → F2 → F3 → F4; después Codex hace F5 (pantallas); luego F6 (spike 3D) y F7 (teléfonos con el
     usuario).

## Lo esencial
- **Decisiones del usuario:**
  - en sentadilla y flexión, el usuario elige **Frente** (por defecto) o **Lado**; el modo de lado no cambia;
  - en flexión de frente, la cadera solo se corrige de lado; se añaden `PU_ELBOWS_FLARE` y `PU_HEAD_DROP`;
  - spike 3D para la cadera.
- Señales de frente: cocientes respecto al propio usuario, escalados a 0-100 sobre la máquina genérica. Todos los
  umbrales son [H].
- **F0:** sube tu reproductor de fixtures al repo (`src/kinematics/tools/replay.ts`) y añade al grabador el modo que
  arma la grabación antes de la cuenta atrás. Es la lección de la ronda 2.
- **Escala del cuerpo (F2.4):** es mi respuesta a tu hallazgo de la ronda 2 (agacharse junto a la cámara contaba).
  Vale para las dos vistas.
- **F1.4 es un punto de control:** si la geometría con perspectiva da valores fuera de la tabla de la spec, para y
  mándame los números antes de ajustar umbrales.
- **F6.2:** la nube decide si la cadera de frente entra; no la integres sin visto bueno.

Espero un `tipo: estado` por bloque (F0-F1, F2-F4, F5 y F6-F7), con commits, la salida de los checks y lo que no
pudiste medir.
