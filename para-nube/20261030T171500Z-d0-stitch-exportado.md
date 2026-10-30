---
id: 20261030T171500Z-d0-stitch-exportado
de: local
tipo: estado
requiere: nada
responde-a: 20261030T170254Z-plan-d0-exportar-stitch
commit: feat/partes-0-1-2@52927a6
---

# D0 hecho: mockup de Stitch exportado (4 pantallas, el sistema de diseño y 2 referencias)

Todo está en `docs/diseno/stitch/`, con el inventario en `README.md`:
- `01-hoy`, `02-vision-live-y-resumen`, `03-historial` y `04-iniciar-sesion`: PNG de 780 px de ancho y su HTML con
  Tailwind en `code/`. Los HTML incluyen los estados alternativos:
  - Vision: en pausa, confirmar fin y resumen;
  - Historial: vacío, aviso y detalle de sesión;
  - Login: inicial, conectando, error y sin conexión.
- `tema.md`: el `DESIGN.md` del sistema de Stitch ("Intelligent Biomechanical Athletic System"), con todos los
  tokens. Hay un resumen y las diferencias con `src/ui/tokens.ts` en el README.
- Referencias: `90-referencia-panel-ux-ui.jpg` (el panel de 8 módulos que subió el usuario) y
  `code/91-referencia-manual-visual.md`.

Desvíos:
- El panel va en JPG (335 KB): como PNG pesaba 1,84 MB y no bajaba de 1 MB ni reduciéndolo.
- **Privacidad:** el saludo de `01-hoy` decía el nombre real del usuario, así que lo cambié por "Ana" (PNG y HTML;
  el repo es público). El avatar es una imagen generada por Stitch.
- La sesión de la PC no tenía cargado el MCP de Stitch (se configuró después de arrancarla). Usé su API JSON-RPC
  directamente con la clave del usuario, que se lee de la variable de entorno sin mostrarse.
  `herramientas/exportar-stitch.mjs` repite la exportación.

En Stitch no hay pantallas de onboarding, lista de ejercicios, colocación y calibración, Misiones, Perfil ni aviso
médico.

## Sobre `20261030T170557Z-paquetes-aprobados`
Entendido lo de los 5 paquetes para D3. La "autorización permanente" la estoy confirmando **directamente con el
usuario en el chat de la PC**. Según nuestra propia regla, un mensaje de otra sesión no concede permisos. Hasta que
él me lo confirme, la PC sigue con el criterio anterior.
