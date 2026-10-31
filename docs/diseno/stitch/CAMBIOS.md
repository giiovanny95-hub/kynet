# Stitch v2 frente a v1

Exportado el 2026-10-31 del proyecto `17277584496938994624` con `herramientas/exportar-stitch.mjs` (G0 del plan
`2026-10-31-diseno-v2-guias.md`). Se compararon los archivos byte a byte (md5) y a la vista.

## Resumen
v2 **no cambia ninguna pantalla existente**. Añade una pantalla nueva (bienvenida) y una imagen de referencia
externa. El sistema de diseño es el mismo.

## Pantallas

| Pantalla | Estado en v2 | Qué cambia |
|---|---|---|
| Hoy (`01-hoy`) | Igual | Solo el saludo: v2 trae el nombre real del usuario. Se conserva la versión de v1 con "Ana" (privacidad, ver `README.md`). |
| Vision Live y Resumen (`02-vision-live-y-resumen`) | Igual | PNG y HTML idénticos (mismo md5). |
| Historial (`03-historial`) | Igual | PNG y HTML idénticos. |
| Iniciar sesión (`04-iniciar-sesion`) | Igual | PNG y HTML idénticos. |
| Panel UX/UI de referencia (`90-…`) | Igual | Misma imagen que el JPG de v1; Stitch la entrega ahora en PNG. |
| Manual visual (`code/91-…`) | Igual | Idéntico. |
| **Bienvenida** (`05-bienvenida`) | **Nueva** | Logotipo con radar, "KYNET · Intelligent Fitness", "Bienvenido", botones INICIAR SESIÓN (teal) y CREAR CUENTA (slate), "Continuar con" Facebook, Google y Apple, y "Entrenar como invitado". |
| Referencia externa (`92-referencia-externa-login.jpg`) | **Nueva** | Imagen subida a Stitch como inspiración: tres pantallas de login de otra marca ("FitnessHub"). **No es diseño de KYNET** ni se copia; se guarda solo como contexto de dónde sale la bienvenida. |

## La bienvenida choca con las specs (decide la nube o el usuario antes de G5)
- **Login:** las specs dicen cuenta local hasta después de la primera sesión y solo Google (`CLAUDE.md`,
  `spec-datos-supabase` DA2). La bienvenida pone el login primero y ofrece Facebook, Apple, y email con "crear
  cuenta", que no existen en el MVP.
- **"Entrenar como invitado"** encaja con la cuenta local, pero como opción secundaria, cuando en la spec es el
  camino principal.
- **Brillo:** el botón primario y el logotipo tienen resplandor (`glow`), y el sistema prohíbe sombras.
- Propuesta: usarla solo como referencia visual del onboarding (logotipo, tipografía, botones) en E2.7, con "Empezar"
  como acción principal y "Ya tengo cuenta (Google)" como secundaria.

## Tokens
- Sistema de diseño: el mismo ("Intelligent Biomechanical Athletic System"), con las mismas pautas de texto y los
  mismos colores con nombre que v1 (comparado en `tema.json`).
- Frente a `src/ui/tokens.ts`: sin colores nuevos. Siguen las diferencias que ya listaba `README.md` (variantes
  Material, escala tipográfica, radios de chips y HUD translúcido).

## Ilustraciones y personajes
- **Ninguno** en v2. El único elemento ilustrado es el avatar de Hoy (imagen generada por Stitch) y el esqueleto de
  líneas del login y del HUD. Las guías de ejercicio de G1 son arte propio generado por código; Stitch no aporta
  personajes.
