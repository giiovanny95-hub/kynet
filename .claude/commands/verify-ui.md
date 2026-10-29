---
description: BORRADOR - Compara una pantalla del dispositivo con su referencia de Figma
argument-hint: "<nombre_de_pantalla>"
---

**Estado: borrador, no usar hasta la parte 3.** Depende de dos servidores MCP que aún no están verificados en este proyecto: Figma (OAuth) y un MCP de dispositivos Android (la propuesta es `@mobilenext/mobile-mcp` fijado a una versión, ver `docs/skills-y-mcps.md`). Cuando estén conectados, ajusta los nombres de herramientas con el prefijo `mcp__<servidor>__` que muestre `/mcp` y quita este aviso.

Verifica la fidelidad visual de la pantalla `$ARGUMENTS`:

1. Lee el `nodeId` y el `fileKey` de `ui/screens/$ARGUMENTS/design_node.json`. Si no existe, detente y pídelo.
2. Obtén la captura de referencia de Figma (herramienta de captura del MCP de Figma) y guárdala en `.claude/tmp/$ARGUMENTS_reference.png`.
3. Captura el dispositivo con el MCP de Android o con `adb exec-out screencap -p` y guárdala en `.claude/tmp/$ARGUMENTS_current.png`.
4. Compara con `node scripts/visual_diff.js` (por crear en la parte 3; usar un diff perceptual como pixelmatch).
5. Si la diferencia supera el 2 %, describe las zonas que difieren y propón los cambios de estilo. Aplica cambios solo si el usuario lo confirma, y usa los tokens del tema, nunca valores fijos.
