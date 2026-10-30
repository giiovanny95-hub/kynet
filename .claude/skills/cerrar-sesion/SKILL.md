---
name: cerrar-sesion
description: Cierre de tarea en KYNET. Úsala al terminar una tarea, antes del commit final o de abrir/actualizar un PR, o cuando el usuario diga "cierra", "termina" o "deja todo listo para la próxima sesión". Verifica, actualiza el estado de traspaso, guarda las lecciones aprendidas en las reglas del área y avisa a la otra sesión.
---

# Cerrar sesión (KYNET)

Objetivo: que la próxima sesión, en la PC o en la nube, arranque sabiendo exactamente dónde estamos y sin repetir errores.
Usa también `superpowers:verification-before-completion`: nada se declara hecho sin la salida de los comandos.

## 1. Verificar (según lo que tocaste)
- Siempre: `npm run typecheck`, `npm run lint`, `npm run test`.
- Textos: `npm run i18n:check`. SQL o reglas de gamificación: `npm run test:sql`. Cinemática: `npm run test:kinematics`.
- Rutas, imports nativos o paquetes: `npx expo export --platform android` (borra la carpeta de salida después).
- Cámara, pose o UI del entrenamiento: medir en dispositivo real. Si no se pudo, anótalo como **no verificado**.

## 2. Estado de traspaso: `docs/estado.md`
- "Última actualización" con fecha, hora y sesión (PC o nube).
- "Estado": qué cambió (con commit), qué funciona y qué no se verificó.
- "Siguiente paso" concreto (lo lee el hook al arrancar) y "Para decidir (usuario)".
- Menos de 200 líneas: resume o borra lo viejo que ya no ayuda.

## 3. Decisiones: `docs/decisions.md`
Cada dependencia o decisión nueva: fecha, versión y razón.

## 4. Lecciones (lo más importante)
Repasa la sesión y busca: errores que costó encontrar, correcciones del usuario, comandos que fallaron y su arreglo, y supuestos que resultaron falsos.
- Una línea por lección: `- **Regla imperativa.** Por qué (síntoma o causa). (fecha, commit)`.
- Va al archivo del área: `.claude/rules/vision-cinematica.md`, `datos-supabase.md`, `ui-i18n.md`, o `general.md` si aplica a todo.
- Si ya existe una parecida, mejórala en vez de duplicarla. Si una regla quedó obsoleta, bórrala.
- Si en la PC la auto memory (`/memory`) tiene algo útil para siempre, pásalo aquí: la auto memory no llega a la nube.
- Si una lección cambia cómo se trabaja en todo el proyecto, propón el cambio en `CLAUDE.md` con `/revise-claude-md`.

## 5. Commit, push y buzón
- Commit con mensaje en español (sin nombres de modelo).
- Push solo a ramas `feat/*` o `coordinacion` (nunca `main`, ni merge, ni reescribir historia).
- Si la otra sesión debe hacer algo (probar en teléfono, configurar algo), deja una nota en la rama `coordinacion`: `para-local/<UTC>-<tema>.md` desde la nube o `para-nube/...` desde la PC.

## 6. Resumen al usuario
Qué cambió, qué no se pudo verificar y qué decisiones quedan abiertas. Breve y en español.
