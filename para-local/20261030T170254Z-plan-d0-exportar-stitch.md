---
id: 20261030T170254Z-plan-d0-exportar-stitch
de: nube
tipo: plan
requiere: pc
responde-a: 20261030T143500Z-b3-ronda1-dos-telefonos
commit: feat/partes-0-1-2@5746682
---

# D0: exportar el mockup de Stitch al repo (prioridad del usuario)

El usuario pidió que el siguiente paso sea el **diseño premium**: muy visual y dinámico, con animaciones,
transiciones y efectos, partiendo de su mockup de Stitch. Desde la nube no puedo abrir Stitch (el proxy rechaza
`stitch.withgoogle.com`); tú tienes el MCP.

**Pausa:** el bloque C de B3 (instrumentación para los huecos de la serie 2) queda en espera. No lo empieces. Tu
informe de la ronda 1 ya lo leí: lo retomamos después del diseño.

## Tarea D0 (sin código de producto)
Proyecto de Stitch `17277584496938994624`
(https://stitch.withgoogle.com/projects/17277584496938994624). Para **cada pantalla**:
1. Captura PNG en `docs/diseno/stitch/<nn>-<pantalla>.png`, con `nn` en el orden del flujo.
2. El código que dé Stitch (HTML/Tailwind o similar) en `docs/diseno/stitch/code/<nn>-<pantalla>.html`.
3. Si Stitch tiene un tema o sistema de diseño (colores, fuentes, radios), expórtalo a
   `docs/diseno/stitch/tema.md` o `.json`.
4. Inventario en `docs/diseno/stitch/README.md`, una fila por pantalla con:
   - archivo, nombre en Stitch y para qué sirve;
   - componentes que se ven;
   - colores (HEX), tipografías y tamaños, radios y espaciados que use;
   - si hay estados alternativos (vacío, cargando o error).
5. Revisa que las PNG pesen menos de 1 MB cada una (comprímelas si hace falta) y que no tengan datos personales.
6. Commit `docs(diseño): export del mockup de Stitch` en `feat/partes-0-1-2` y un `tipo: estado` en `para-nube/`
   con el número de pantallas.

**Criterio:** con solo el repo, la nube puede ver todas las pantallas y sus valores.

## Para tu contexto (no lo ejecutes todavía)
- Investigación hecha: `docs/diseno/investigacion-animacion.md`. Base Reanimated 4 + Skia; Lottie para las
  celebraciones; Rive descartado porque exportar es de pago.
- **No instales paquetes:** hay 5 propuestos (gesture-handler, svg, lucide, linear-gradient y lottie) a la espera
  de la aprobación del usuario.
- Después de D0, la nube escribe `docs/spec-diseno.md` y el plan de implementación por pantalla. Stitch manda en lo
  visual; la navegación y el alcance siguen las specs.
