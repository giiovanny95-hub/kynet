# Estrategia de builds, EAS y CI (Android)

Estado: propuesta para la parte 0. No se ha ejecutado nada. Las marcas **[NV]** son datos que no se pudieron comprobar en la documentación oficial desde esta sesión (docs.expo.dev estaba bloqueado); verifícalos al hacer la parte 0.

## 1. Dónde se desarrolla y se prueba
- Este entorno cloud **no** sirve para compilar ni probar la app: no hay Android SDK ni cámara, y los servidores MCP de GitHub y Figma fallan aquí. Sirve para escribir código, specs y pruebas de la lógica pura (cinemática, racha, XP) con Vitest o Jest.
- La compilación se hace con **EAS Build en la nube** (sin necesidad de un Mac, y para Android tampoco de Android Studio) o localmente si el usuario tiene Android SDK. Las pruebas en vivo se hacen instalando el APK de desarrollo en el Galaxy S26 Ultra y el Pixel 7 Pro.
- Hace falta un **development build** (no Expo Go) porque se usan módulos nativos: VisionCamera, Skia, worklets y `kynet-native`.
- Falta un Android de gama media: la térmica y el rendimiento en gama media quedan sin validar.

## 2. Perfiles de EAS (`eas.json`)
| Perfil | Uso | Distribución | Salida |
|--------|-----|--------------|--------|
| `development` | Desarrollo diario con `expo-dev-client` | interna | APK |
| `preview` | Pruebas de beta cerrada | interna (enlace de instalación) | APK |
| `production` | Publicación en Google Play | tienda | AAB |

- Variantes con `app.config.ts` leyendo `APP_VARIANT` (`development` / `preview` / `production`): distinto `applicationId` (por ejemplo sufijos `.dev` y `.preview`) para instalar varias a la vez.
- Nombre de la app e identificador del paquete son provisionales; cambiar el `applicationId` después de publicar no es posible, así que se fija antes del primer lanzamiento en Play.
- Cada variante necesita su propia huella **SHA-1** registrada en el cliente OAuth de Android de Google Cloud (error frecuente del login). La de producción incluye la firma de Play App Signing.

## 3. Secretos y variables
- Variables públicas (URL de Supabase y clave `anon`) como variables de EAS por entorno. La clave `anon` no es secreta pero la RLS debe protegerlo todo.
- **Nunca** la clave `service_role` en la app ni en el repo. Solo en Edge Functions.
- Identificadores de OAuth en variables de EAS. Keystore de subida gestionado por EAS o guardado fuera del repo.
- `.mcp.json` solo con referencias `${VAR}`, sin valores.

## 4. CI en GitHub Actions
Se ejecuta en cada PR y en `main`:
1. `npm ci`, `npm run typecheck`, `npm run lint`, `npm run test` (incluye `test:kinematics`) y `npm run i18n:check`.
2. Comprobación de que no hay secretos en el diff.
3. Pruebas de la función SQL de racha (pgTAP o un runner equivalente) cuando exista el proyecto de Supabase de desarrollo.

Builds de EAS: **manuales** (`workflow_dispatch`) o al crear una etiqueta, no en cada commit, para controlar el coste y la cola [NV: límites del plan gratuito]. Se usan versiones fijas de acciones y de `eas-cli`; no `@latest`.

## 5. Skills y permisos del agente
- Instalar solo las skills aprobadas en `docs/skills-y-mcps.md`, revisando su contenido antes.
- **Denegar** en los permisos de Claude Code la orden `npx --yes @expo/agent-cli@latest feedback ...` y cualquier `npx` con `@latest`. Las skills de Expo la mencionan; ejecutaría un paquete sin versión fija y enviaría contexto a un servicio externo.
- Pedir confirmación para builds de EAS, migraciones, `push` y PR (ver `CLAUDE.md`).

## 6. Orden de la parte 0 (con confirmaciones)
1. Crear el repo y la estructura base; `.gitignore`, `CLAUDE.md`, `docs/`.
2. `create-expo-app` con SDK 58 y TypeScript; activar `strict` y `noUncheckedIndexedAccess`; ESLint, Prettier y Jest/Vitest. Si VisionCamera 5.2.3 no es compatible con React Native 0.88, retroceder a SDK 57.
3. Scripts de `package.json` y CI.
4. `expo-dev-client`, `app.config.ts` con variantes, `eas init` y `eas.json`.
5. **Con confirmación del usuario:** proyecto Supabase nuevo y aislado (ver estado en `requirements.md`), con coste posible.
6. Primer `eas build -p android --profile development` e instalación en los dos teléfonos.

Criterio de salida de la parte 0: `npm run typecheck` sin errores y una build de desarrollo instalada y abierta en el S26 Ultra y el Pixel 7 Pro.
