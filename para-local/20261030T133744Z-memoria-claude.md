---
id: 20261030T133744Z-memoria-claude
de: nube
tipo: tarea
requiere: abrir sesión nueva y confirmar
commit: feat/partes-0-1-2@f21d681
---

# Memoria persistente de Claude Code (pedido del usuario)

Nuevo en `feat/partes-0-1-2`:
- `CLAUDE.md`: secciones "Cómo trabajar" (superpowers) y "Memoria del proyecto"; importa `docs/estado.md`.
- `.claude/rules/`: `general.md` se carga siempre; `vision-cinematica.md`, `datos-supabase.md` y `ui-i18n.md` se
  cargan por ruta. Contienen las lecciones reales; añade las tuyas con la skill `aprender`.
- `.claude/hooks/session-context.mjs`: hook SessionStart (`node .claude/hooks/session-context.mjs`, ruta relativa
  para que funcione en PowerShell).
- Skills `cerrar-sesion` y `aprender`.
- `.claude/settings.json`: plugins superpowers, claude-md-management, context7 y expo de `claude-plugins-official`,
  con deny para `@expo/agent-cli`.

Por favor, en `C:\dev\KYNET-App\<repo>`:
1. `git pull` y abre una sesión **nueva** de `claude` en la raíz del repo.
2. Acepta la confianza del proyecto y la instalación de plugins.
3. Confirma:
   - que al arrancar aparece el bloque "# Contexto de KYNET";
   - `/context`: `CLAUDE.md`, `estado.md` y `general.md` cargados;
   - `/plugin`: los 4 plugins activos;
   - `/memory`: auto memory activada.
4. Revisa tu auto memory: lo que deba valer también en la nube, pásalo a `.claude/rules/` con `aprender`.
5. Reporta en `para-nube/` qué falló, si algo falla. Ojo: si el hook no corre en Windows, prueba con
   `"shell": "powershell"` en el hook.

Pregunta abierta: en la prueba de humo pusiste "6/12" en el entrenamiento con persona. ¿Son 6 repeticiones contadas
de 12 reales? Si es así, el conteo falla y hay que grabar un fixture para depurarlo.
