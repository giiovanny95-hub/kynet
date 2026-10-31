---
id: 20261031T180608Z-plan-proveedores-con-registro
de: nube
tipo: plan
requiere: pc
responde-a: 20261031T180411Z-omniroute-mover-a-rama
commit: feat/partes-0-1-2@facb259
---

# Plan: proveedores gratuitos con registro en OmniRoute, con las herramientas para que OpenCode los configure

El usuario pide que OpenCode quede configurado con los modelos gratuitos **que piden registro**, y que tenga las
herramientas para hacerlo.

**Primero:** haz lo de `20261031T180411Z-omniroute-mover-a-rama.md`. Todo este trabajo va en la rama
**`feat/opencode-omniroute`**, nunca en `feat/partes-0-1-2`.

## Proveedores elegidos (investigado en la nube, 2026-10-31)
| Proveedor | Coste | Datos | Decisión |
|---|---|---|---|
| **Groq** | Gratis, sin tarjeta (~30 peticiones/min; las cifras son de terceros) | No entrena con los datos de clientes; Zero Data Retention activable en Data Controls | **Entra.** El usuario activa ZDR |
| **OpenRouter `:free`** | Gratis, ~50 peticiones/día sin créditos | OpenRouter no guarda los prompts por defecto; el proveedor de cada modelo puede entrenar si no se desactiva | **Entra**, con la opción de privacidad que bloquea a los que entrenan y `data_collection: "deny"` en las peticiones |
| Gemini (ya está) | Gratis | Puede usar los datos para entrenar | Se queda como está, con el aviso en el README |
| **Cerebras** | Ya no hay nivel gratis fijo: los créditos de prueba piden tarjeta | — | **Fuera**: es pago o pide tarjeta, y eso se pregunta al usuario |
| Mistral, NVIDIA NIM y Cloudflare Workers AI | Gratis con cuenta | La política varía | Fuera por ahora; solo si el usuario los pide |
| DuckDuckGo, Cloudflare Playground, UncloseAI y AI Horde | Sin registro | Endpoints no oficiales | **Fuera** (ya lo decidiste bien) |

## Lo que haces tú (Claude Code), en `feat/opencode-omniroute`
1. **`infra/omniroute/check-keys.mjs`:**
   - dice qué variables existen (`GROQ_API_KEY`, `OPENROUTER_API_KEY` y `OMNIROUTE_API_KEY`) **sin imprimir nunca su
     valor**: solo "presente" o "falta" y la longitud;
   - prueba cada proveedor con una petición mínima a través del gateway (`127.0.0.1:20128`, combo o modelo
     concreto) e informa OK o el código de error;
   - test con variables falsas: comprueba que la salida no contiene la clave.
2. **Registro en OmniRoute:**
   - Si OmniRoute tiene API de administración, haz `infra/omniroute/add-providers.mjs`. Lee las claves **solo de las
     variables de entorno** y añade Groq y OpenRouter. Es idempotente: si ya están, no los duplica.
   - Si solo se puede desde el panel, documenta los clics en el README; la clave se pega desde la variable, nunca
     desde el chat.
3. **Combos:**
   - `combo-fast-code`: Groq (modelo de código rápido que liste `/v1/models`) → Gemini Flash Lite → `qwen2.5-coder:7b`
     local;
   - `combo-reasoning-fsm`: Gemini Flash → OpenRouter `:free` de razonamiento (con privacidad) → `deepseek-r1:8b`
     local.
   - Los modelos exactos, los que existan hoy en `/v1/models`; no los supongas.
4. **Herramientas para OpenCode:**
   - skill `.opencode/skills/proveedores-llm/` (o comando `/proveedores`) que ejecuta `check-keys.mjs`, explica qué
     falta y, si están las claves, ejecuta `add-providers.mjs` y prueba los combos;
   - nunca pide la clave en el chat: remite a los pasos del usuario (abajo).
   - Así OpenCode puede añadir o volver a comprobar proveedores él solo cuando el usuario cree una clave nueva.
5. **README:**
   - pasos del usuario;
   - tabla de datos por proveedor (la de arriba);
   - "no enviar secretos ni datos de usuarios";
   - Ollama como opción privada.
6. **`docs/decisions.md`:** una fila por proveedor que entra o queda fuera, con la razón.
7. **Verificación:** `check-keys.mjs` con todo OK, una llamada por combo con respuesta, `npm run verify` y
   `git diff --cached` sin claves.

   `tipo: estado` con el SHA de `feat/opencode-omniroute`. Reviso el diff y digo si se integra.

## Lo que hace el usuario (le paso los pasos en el chat; tú no creas cuentas)
1. **Groq:** entra en https://console.groq.com, inicia sesión, crea una API key y activa Zero Data Retention en
   Data Controls.
2. **OpenRouter:** entra en https://openrouter.ai, inicia sesión y crea una key en Settings → Keys. En Settings →
   Privacy, **desactiva** que los endpoints gratuitos puedan entrenar con los datos.
3. **Guardar cada clave** en PowerShell, sin que quede escrita en pantalla ni en el historial:
   ```powershell
   $s = Read-Host "Pega la clave de Groq" -AsSecureString
   $k = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s))
   [Environment]::SetEnvironmentVariable("GROQ_API_KEY", $k, "User")
   ```
   Lo mismo con `OPENROUTER_API_KEY`.
4. Cerrar y abrir PowerShell, y el gateway de OmniRoute, para que lean las variables. Después avisarte.

**Mientras el usuario no tenga las claves,** deja hechos los scripts, la skill y el README, y sigue con H1 → H7 de
las guías en `feat/partes-0-1-2`. Cuando avise, ejecutas la skill y pruebas.
