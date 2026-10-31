# Skills de agente y servidores MCP para KYNET (RN + Expo + Supabase)

Fecha de investigación: 2026-10-28. Solo lectura: no se instaló ni configuró nada.
Todo el contenido de terceros se trató como no confiable. Donde algo no se pudo verificar se marca **[NO VERIFICADO]**.

Limitaciones de la investigación:
- `docs.expo.dev`, `expo.dev`, `developers.figma.com` y `help.figma.com` no resuelven desde esta sesión (red restringida). La información de Expo MCP y Figma MCP viene de resultados de búsqueda, no de las páginas oficiales.
- No hubo acceso a la API de GitHub (`gh` bloqueado), así que las fechas de último commit no se pudieron leer salvo en un caso. Se usó el listado web de GitHub, que no muestra fechas.
- El resumen de cada SKILL.md lo produjo un modelo auxiliar al leer la página; no es una lectura literal línea a línea.

## Parte A: Skills

| Skill | URL real | Licencia | Última actualización | Instalación exacta |
|---|---|---|---|---|
| react-native-skills (nombre en frontmatter: `vercel-react-native-skills`, v1.0.0) | https://github.com/vercel-labs/agent-skills/tree/main/skills/react-native-skills | MIT | **[NO VERIFICADO]** (repo con 280 commits, sin fecha visible) | `npx skills add vercel-labs/agent-skills` (instala todo el repo; ver nota) |
| Expo skills oficiales (plugin `expo`, 23 skills) | https://github.com/expo/skills | MIT | **[NO VERIFICADO]** (151 commits, sin fecha) | `claude plugin install expo@claude-plugins-official` o `/plugin install expo@claude-plugins-official`; alternativa `npx skills@latest add expo/skills --skill '*'` |
| react-native-expert (jeffallan) | https://github.com/Jeffallan/claude-skills/blob/main/skills/react-native-expert/SKILL.md | MIT | Repo activo: commits del 2026-10-28 (258 commits, 67 skills). La skill concreta es v1.1.0 | `/plugin marketplace add jeffallan/claude-skills` y `/plugin install fullstack-dev-skills@fullstack-dev-skills` (instala las 67 skills, no solo una) |
| supabase (supabase/agent-skills) | https://github.com/supabase/agent-skills | MIT | **[NO VERIFICADO]** (96 commits, sin fecha) | `npx skills add supabase/agent-skills --skill supabase` ; plugin: `claude plugin marketplace add supabase/agent-skills` y `claude plugin install supabase@supabase-agent-skills` |

### Contenido, riesgos y veredicto

| Skill | Qué contiene | Riesgos (scripts / comandos) | Vale la pena |
|---|---|---|---|
| vercel react-native-skills | Guía de buenas prácticas RN/Expo en 8 categorías: listas (FlashList, memoización), animación (solo transform/opacity), navegación nativa, UI (expo-image, Pressable, safe area), estado, rendering, monorepo, configuración. Apunta a archivos `rules/*.md` y un `AGENTS.md` compilado. | Bajo. El SKILL.md no contiene comandos ni scripts. El repo tiene `scripts/` de build propio (no se ejecuta al usar la skill). Nota: el README lo llama `react-native-guidelines`, el directorio es `react-native-skills`; hay inconsistencia de nombres. | Sí. Es contenido puro de buenas prácticas, útil para listas de ejercicios y animaciones. Instalar con `--skill` para no traer las skills de Next.js/Vercel que no aplican (la sintaxis exacta con `--skill` para este repo **[NO VERIFICADA]**, solo confirmada en los repos de Expo y Supabase). |
| Expo: expo-data-fetching (antes "native-data-fetching") | fetch, React Query, errores tipados, reintentos, auth con expo-secure-store, `EXPO_PUBLIC_` (advierte no poner secretos). | Medio. Incluye `npx --yes @expo/agent-cli@latest feedback ...`: ejecuta un paquete `@latest` sin confirmar y envía "contexto" a un servicio externo cuando una tarea falla. | Sí, con la sección de feedback desactivada o con deny de ese comando. |
| Expo: expo-upgrade (antes "upgrading-expo") | Checklist de upgrade de SDK, migraciones (React 19, New Architecture, expo-av a expo-audio/video, etc.). | Medio-alto. Ordena `rm -rf node_modules .expo`, `npx expo prebuild --clean` (puede pisar cambios nativos manuales), `watchman watch-del-all`, `./gradlew clean`, además del comando de feedback. | Útil solo en el momento de subir de SDK. Mantener el permiso de Bash en modo "preguntar". |
| Expo: eas-workflows (antes "expo-cicd-workflows") | Escritura/validación de `.eas/workflows/*.yml`. Allowed-tools: `Read, Write, Bash(node:*), Bash(npx *eas-cli@*)`. | Medio-alto. Tiene `scripts/fetch.js` (descarga esquema de `api.expo.dev` y `raw.githubusercontent.com`), ejecuta `npx -y eas-cli@latest workflow:validate` con sesión EAS logueada, y feedback. Comodines amplios de Bash. EAS Workflows es de pago. | Solo si se usa EAS Workflows (de pago). Si el CI va en GitHub Actions, omitir. |
| Expo: expo-native-ui (antes "building-native-ui") | Estilo nativo (HIG / Material 3), semantic colors, `@expo/ui`, expo-image, safe areas, uso de Expo Go primero. | Bajo-medio: solo `npx expo start/run:*`, `eas build` y el comando de feedback. Está sesgada a iOS/HIG; para Android-first aplica la parte de Material 3. | Sí, con reservas por el sesgo iOS. |
| Otras de Expo relevantes (no pedidas) | `expo-router`, `expo-animation`, `expo-dev-client`, `eas-update`, `eas-app-stores`, `expo-overview`. | No leídas. **[NO VERIFICADO]** | Probable valor de `expo-router` y `eas-app-stores`. |
| jeffallan react-native-expert | Persona de ingeniero móvil senior para RN/Expo: workflow, recuperación de errores (Metro, builds Android/iOS), guías de navegación, listas, storage. Frontmatter: sin `allowed-tools`. | Bajo en la skill: comandos estándar (`npx expo doctor`, `expo start --clear`, `expo run:android`, `adb logcat`). El riesgo es el paquete: instalar el plugin trae 67 skills de terceros (superficie de prompt injection y ruido de contexto). El revisor señaló fallos menores en los ejemplos (arrow inline en `onPress`, `SafeAreaView` obsoleto). | Poco. Solapa con las skills de Vercel y Expo, que son más específicas y de fuente oficial. Si se quiere, copiar solo ese SKILL.md tras revisarlo, en vez de instalar el plugin completo. |
| supabase (supabase/agent-skills, v0.1.2) | Principios (consultar docs actuales, verificar con query), exposición de la Data API y GRANTs, checklist de seguridad RLS (no usar `user_metadata` para autorización, `security_invoker`, `SECURITY DEFINER`, políticas UPDATE con `WITH CHECK`), CLI y MCP, flujo de migraciones declarativo/imperativo. También existe `supabase-postgres-best-practices` (8 categorías). | Bajo. Menciona `curl` a `https://mcp.supabase.com/mcp` y comandos `supabase` CLI; manda a leer docs remotas (`.md`). Sin scripts ejecutables detectados en el SKILL.md. | Sí, es la de mayor valor. Ya la recomienda el propio servidor MCP de Supabase de esta sesión. |

Observación transversal: las skills de Expo cambiaron de nombre respecto a lo que se esperaba (`native-data-fetching` es ahora `expo-data-fetching`, `upgrading-expo` es `expo-upgrade`, `expo-cicd-workflows` es `eas-workflows`, `building-native-ui` es `expo-native-ui`). Los nombres antiguos pueden aparecer en tutoriales desactualizados.

Recomendación de skills: Supabase (`supabase` y `supabase-postgres-best-practices`), Vercel `react-native-skills` y el plugin oficial `expo`. Descartar jeffallan. Antes de instalar, revisar el diff del repo con `git clone` en un directorio aislado y fijar versión/commit; añadir deny en `.claude/settings.json` para `Bash(npx --yes @expo/agent-cli*)`.

## Parte B: Servidores MCP

| Servidor | Nombre/URL verificado | Autenticación | Comando `claude mcp add` | Estado verificado |
|---|---|---|---|---|
| Figma (remoto) | `https://mcp.figma.com/mcp` | OAuth (se completa con `/mcp` en Claude Code). No es token. Solo clientes del catálogo de Figma (Claude Code incluido) pueden conectarse al servidor remoto. | `claude mcp add --transport http figma https://mcp.figma.com/mcp` | Fuentes: búsqueda web (Figma Help Center, foros). **[NO VERIFICADO en la doc oficial]**: no se pudo abrir developers.figma.com. Requisitos de plan/asiento y capacidad de escritura al canvas **[NO VERIFICADO]**. Alternativa local: `http://127.0.0.1:3845/mcp` (app de escritorio). |
| Context7 | Remoto: `https://mcp.context7.com/mcp`. Paquete npm: `@upstash/context7-mcp` v4.4.4 (2026-10-19, MIT, no deprecado, verificado en el registro npm) | Clave API opcional pero recomendada (gratis, dashboard en context7.com/dashboard). Cabecera `Authorization: Bearer <clave>`. | `claude mcp add --transport http context7 https://mcp.context7.com/mcp --header "Authorization: Bearer $CONTEXT7_API_KEY"` (cabecera tomada del README; el comando exacto lo armé yo, no está en el README, que recomienda `npx ctx7 setup`) | Verificado en el README de upstash/context7. |
| GitHub | **`@modelcontextprotocol/server-github` está obsoleto**: el registro npm lo marca `deprecated` ("Package no longer supported"), última versión 2025.4.8. Vigente: `github/github-mcp-server` (oficial, mantenido por GitHub). | Remoto `https://api.githubcopilot.com/mcp/`: OAuth o PAT como Bearer. Local Docker: PAT en `GITHUB_PERSONAL_ACCESS_TOKEN` (tiene prioridad sobre OAuth). | Local (del README): `claude mcp add github -e GITHUB_PERSONAL_ACCESS_TOKEN=$GITHUB_PAT -- docker run -i --rm -e GITHUB_PERSONAL_ACCESS_TOKEN ghcr.io/github/github-mcp-server`. Remoto HTTP: `claude mcp add --transport http github https://api.githubcopilot.com/mcp/ --header "Authorization: Bearer $GITHUB_PAT"` (armado por mí desde la URL y el método Bearer del README, **[NO VERIFICADO]** como comando literal). | Verificado: deprecación (npm) y README oficial. Flag `--read-only` y `--toolsets` existen. |
| Android / adb | **`@android-mcp/server` NO existe** en el registro npm (respuesta "Not found"). Alternativas reales: `@mobilenext/mobile-mcp` v1.0.14 (2026-10-26, Apache-2.0, soporta emulador y dispositivo Android, Node 20+); `@us-all/android-mcp` v1.13.1 (mayo 2026); `@landicefu/android-adb-mcp-server` (ISC); `minhalvp/android-mcp-server` (Python, ~11 meses sin push según un listado); `CursorTouch/Android-MCP`. | Ninguna (local, vía adb). | `claude mcp add mobile-mcp -- npx -y @mobilenext/mobile-mcp@latest` (del README). Recomendado fijar versión: `@mobilenext/mobile-mcp@1.0.14`. | mobile-mcp verificado en npm y README. Los demás vienen de resultados de búsqueda: **[NO VERIFICADO]** más allá de su existencia. Mantenimiento y auditoría de código de ninguno revisados. |
| Expo | Remoto oficial: `https://mcp.expo.dev/mcp`. Local: paquete `expo-mcp` v0.2.4 (2026-02-12, MIT, verificado en npm) añadido como dependencia del proyecto (requiere SDK 54+, según el blog de Expo vía búsqueda). | OAuth (`/mcp` tras añadirlo). El servidor remoto exige plan de pago de EAS (según blog y changelog vía búsqueda). | `claude mcp add --transport http expo-mcp https://mcp.expo.dev/mcp` (de la doc de Expo vía resultado de búsqueda) | **[NO VERIFICADO en la doc oficial]**: docs.expo.dev y expo.dev no accesibles. La lista exacta de herramientas (build, submit, workflows) y si hay escritura **[NO VERIFICADO]**. El README de github.com/expo/expo-mcp no documenta configuración. |

### Riesgos de seguridad

| Servidor | Riesgos |
|---|---|
| Figma | OAuth con alcance a los archivos del usuario. El contenido de diseño (textos, comentarios) puede contener prompt injection. Si hay herramientas de escritura al canvas, requiere confirmación manual **[NO VERIFICADO]**. |
| Context7 | La clave API va en cabecera: no commitearla. La documentación devuelta es contenido de terceros; tratar como no confiable. Riesgo bajo, solo lectura. |
| GitHub | El PAT es el riesgo principal: usar PAT de grano fino limitado al repo, sin permisos de administración, y arrancar con `--read-only` salvo que se necesite escribir. Limitar `--toolsets` (por defecto: context, repos, issues, pull_requests, users). Issues y PRs ajenos son vector de inyección de prompt. |
| Android / adb | `mobile-mcp` y similares pueden ejecutar acciones en el dispositivo y, en varios, comandos shell arbitrarios por adb (instalar/desinstalar apps, push de archivos). Usar solo emulador, nunca un teléfono personal. mobile-mcp envía telemetría por defecto (PostHog/Scarf): poner `MOBILEMCP_DISABLE_TELEMETRY=1`. El modo HTTP `--listen` no autentica salvo con `MOBILEMCP_AUTH`; usar stdio. Fijar versión (supply chain con `npx -y ...@latest`). |
| Expo | Acciones sobre builds/workflows consumen minutos de plan de pago y pueden disparar envíos a tiendas **[NO VERIFICADO el alcance exacto]**. OAuth con la cuenta Expo. |
| Supabase (extra, no pedido) | Ver abajo: usar `read_only` y limitar a un proyecto de desarrollo; nunca apuntar a producción con escritura. |

## Recomendación final

1. Skills: `supabase` + `supabase-postgres-best-practices`, `vercel-react-native-skills`, y el plugin `expo`. Omitir `jeffallan`.
2. MCPs mínimos y útiles: Context7 (docs al día), GitHub (solo lectura), Supabase (solo lectura, un proyecto de desarrollo). Figma y Expo según se necesiten (Expo remoto requiere plan EAS de pago). Android: `mobile-mcp` solo con emulador y telemetría desactivada.
3. Las URLs/paquetes marcados como NO VERIFICADO se deben comprobar manualmente antes de adoptar.
4. El MCP de Supabase de `https://mcp.supabase.com/mcp` aparece en el SKILL.md de Supabase como URL de comprobación; los parámetros `project_ref` y `read_only` los conozco de la documentación de Supabase pero **no los verifiqué** en esta sesión.

### `.mcp.json` propuesto (sin secretos; las variables se expanden con la sintaxis `${VAR}` de Claude Code)

```json
{
  "mcpServers": {
    "context7": {
      "type": "http",
      "url": "https://mcp.context7.com/mcp",
      "headers": {
        "Authorization": "Bearer ${CONTEXT7_API_KEY}"
      }
    },
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/",
      "headers": {
        "Authorization": "Bearer ${GITHUB_MCP_PAT}",
        "X-MCP-Readonly": "true"
      }
    },
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp?project_ref=${SUPABASE_DEV_PROJECT_REF}&read_only=true"
    },
    "figma": {
      "type": "http",
      "url": "https://mcp.figma.com/mcp"
    },
    "expo-mcp": {
      "type": "http",
      "url": "https://mcp.expo.dev/mcp"
    },
    "mobile-mcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@mobilenext/mobile-mcp@1.0.14"],
      "env": {
        "MOBILEMCP_DISABLE_TELEMETRY": "1"
      }
    }
  }
}
```

Notas sobre el `.mcp.json`:
- La cabecera `X-MCP-Readonly: true` del servidor remoto de GitHub **[NO VERIFICADO]** (la recordé de la documentación de GitHub; el README leído solo confirma `--read-only` para el servidor local). Alternativa verificada: usar la variante Docker local con `--read-only`.
- Los parámetros `project_ref` y `read_only` de la URL de Supabase **[NO VERIFICADO]**; Figma y Expo usan OAuth, así que no llevan secretos en el archivo.
- `${VAR}` en `.mcp.json` es una función de Claude Code que recuerdo, no la confirmé en esta sesión.
- Definir las variables (`CONTEXT7_API_KEY`, `GITHUB_MCP_PAT`, `SUPABASE_DEV_PROJECT_REF`) en el entorno o en un `.env` fuera de git; el PAT de GitHub debe ser de grano fino, limitado al repositorio y de solo lectura.

## URLs usadas

- https://github.com/vercel-labs/agent-skills (y /tree/main/skills, /blob/main/skills/react-native-skills/SKILL.md)
- https://github.com/expo/skills (y /tree/main/plugins, /plugins/expo/skills y los SKILL.md de expo-data-fetching, eas-workflows, expo-upgrade, expo-native-ui)
- https://github.com/Jeffallan/claude-skills (y /commits/main, raw SKILL.md de react-native-expert)
- https://github.com/supabase/agent-skills (y raw SKILL.md de supabase)
- https://github.com/upstash/context7
- https://github.com/github/github-mcp-server
- https://github.com/expo/expo-mcp
- https://github.com/mobile-next/mobile-mcp
- https://registry.npmjs.org (consultas de @modelcontextprotocol/server-github, @android-mcp/server, @mobilenext/mobile-mcp, @upstash/context7-mcp, expo-mcp)
- Resultados de búsqueda web (secundarios): help.figma.com/hc/en-us/articles/35281350665623, docs.expo.dev/mcp, expo.dev/blog/become-an-ai-native-developer-with-the-expo-mcp-server, github.blog/changelog/2025-04-04-github-mcp-server-public-preview, infoq.com/news/2025/04/github-mcp-server-public-preview, glama.ai y npmjs.com (paquetes Android).
- Bloqueados por red: docs.expo.dev, expo.dev, developers.figma.com, help.figma.com, npmjs.com (403).
