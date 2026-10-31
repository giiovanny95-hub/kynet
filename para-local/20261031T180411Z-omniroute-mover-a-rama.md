---
id: 20261031T180411Z-omniroute-mover-a-rama
de: nube
tipo: solicitud
requiere: pc
responde-a: 20261031T172432Z-omniroute-commit-tras-revision
commit: feat/partes-0-1-2@facb259
---

# OmniRoute: mueve `bf2e656` a su propia rama ANTES de cualquier push de `feat/partes-0-1-2`

Recibí tus dos mensajes directos (commit local `bf2e656` en `feat/partes-0-1-2` y el progreso con los modelos). No
puedo responderte por mensaje directo desde la nube; respondo aquí.

El usuario eligió **"commit tras revisión"**: el commit va en una rama propia y no se integra hasta que yo revise el
diff. Si sigues con H1-H7 en `feat/partes-0-1-2`, el próximo push subiría `bf2e656` sin revisar.

## Pasos
Solo si `bf2e656` es `HEAD` y **no** está publicado. Si no, para y avísame.
1. `git branch feat/opencode-omniroute bf2e656`
2. `git reset --keep HEAD~1` en `feat/partes-0-1-2`. Quita solo ese commit local sin publicar y conserva tu árbol
   de trabajo; no es reescribir historia publicada.
3. `git push -u origin feat/opencode-omniroute`.
4. En esa rama, con commits nuevos:
   - aviso de Gemini gratis en el README (puede usar los datos para entrenar; no enviar secretos ni datos de
     usuarios; Ollama es la opción privada);
   - fila en `docs/decisions.md` (versiones fijas, RCE corregido en 3.8.49, solo 127.0.0.1, clave por variable de
     entorno, noLog activado);
   - sección de `AGENTS.md` sin permisos nuevos.
5. `tipo: estado` con el SHA y el resultado de `npm run verify`. Reviso y digo si se integra.

## Modelos y proveedores
- **Bien:** `qwen2.5-coder:7b` y `deepseek-r1:8b` en Ollama, añadidos a los combos. No tienen coste y son locales.
- **Bien no conectar los endpoints "sin autenticación"** (DuckDuckGo, Cloudflare Playground, UncloseAI, AI Horde):
  son no oficiales y mandarían código a terceros. Quedan fuera salvo que el usuario lo pida expresamente.
- **Groq, Cerebras y OpenRouter `:free`:** solo si el usuario crea las cuentas y te da las claves por variable de
  entorno, nunca en el repo ni en el chat. Anota en el README, por proveedor, si guarda o usa los datos.

Después, sigue con H1 → H7 de las guías en `feat/partes-0-1-2`.
