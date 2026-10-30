---
name: aprender
description: Guarda al momento una lección en la memoria del proyecto KYNET. Úsala cuando el usuario te corrija, cuando resuelvas un error no obvio, cuando un comando o herramienta falle de forma que se repetiría, o cuando descubras una buena práctica del proyecto. También si el usuario dice "recuerda esto", "apúntalo" o "que no vuelva a pasar".
---

# Aprender (KYNET)

1. Formula la lección como regla imperativa y verificable, no como anécdota.
   - Bien: `- **Declara los helpers antes del worklet que los usa.** El plugin captura el cierre al definirlo; debajo es undefined en el teléfono. (2026-10-29, 69992f6)`
   - Mal: "hubo un problema con los worklets".
2. Elige el archivo:
   - `.claude/rules/vision-cinematica.md`: cámara, pose, worklets, motor, entrenamiento.
   - `.claude/rules/datos-supabase.md`: SQL, RPC, sincronización, login, almacén local, XP, racha, misiones.
   - `.claude/rules/ui-i18n.md`: pantallas, marca, tokens, textos.
   - `.claude/rules/general.md`: flujo, permisos, entorno (PC o nube) y herramientas.
3. Busca si ya existe una parecida (`grep -n` en `.claude/rules/`). Si existe, mejórala; si contradice a otra, pregunta al usuario cuál vale.
4. Escríbela con fecha y, si hay, commit. Nunca guardes secretos, claves ni datos personales.
5. Dile al usuario en una línea qué regla guardaste y dónde.
