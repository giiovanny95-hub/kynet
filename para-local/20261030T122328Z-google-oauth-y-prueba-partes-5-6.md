# Partes 5-6 completas en código: configurar Google OAuth y probar en el Pixel

Rama `feat/partes-0-1-2`, commit `8702cff`. El usuario autorizó hacerlo todo, incluido el uso de Claude in Chrome.

## Estado
- Ya hecho en la nube: migraciones 0001-0009 aplicadas en `kynet-dev` y `delete-account` desplegada.
- Paquetes nuevos con versión fija: `expo-sqlite`, `expo-crypto`, `expo-secure-store`, `@supabase/supabase-js`,
  `@react-native-google-signin/google-signin`.
- Hay que **recompilar el dev client**: hay módulos nativos nuevos.

## 1. SHA-1 de la clave de firma de debug (en la PC)
`keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android`
Si no existe `android/`, tras `npx expo prebuild` está en ese mismo sitio. Si no, usa `~/.android/debug.keystore`.

## 2. Google Cloud (con Claude in Chrome, con la cuenta del usuario)
1. Usa o crea un proyecto "KYNET".
2. Pantalla de consentimiento OAuth:
   - Tipo externo, en modo prueba.
   - Añade como usuario de prueba la cuenta de Google con la que se va a probar.
   - Scopes: email, profile y openid.
3. Crea las credenciales:
   - Cliente OAuth **Android**: paquete `com.kynet.app.dev` (comprueba el paquete real de la variante dev en
     `app.config.ts`) y el SHA-1 del paso 1.
   - Cliente OAuth **Web**, sin orígenes. Copia su Client ID y su Client Secret.
4. **No** pegues el secreto en el repo ni en el chat del buzón.

## 3. Supabase (Claude in Chrome)
1. Abre https://supabase.com/dashboard/project/eqdjmaarjfsdfomkducz/auth/providers.
2. Comprueba que el proyecto es `kynet-dev`. **Nunca toques `iqxwrfjfdvixidsnfwja`.**
3. Activa Google y pega el Client ID y el Client Secret **del cliente Web**.
4. En "Authorized Client IDs" pon también el Client ID Web.
5. Activa "Skip nonce check": el SDK nativo de Android no manda nonce.

## 4. App
1. Añade `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<Client ID Web>` a `.env.local`, que no se sube al repo.
2. Recompila (`npx expo run:android`) y arranca Metro con `NODE_OPTIONS=--max-old-space-size=4096`.

## 5. Prueba de humo
Reporta los resultados en `para-nube/`.
1. Onboarding:
   - Con una fecha de menor queda bloqueado, también al reabrir la app.
   - Con una de adulto se llega a Hoy.
2. Cierra y abre la app: los datos siguen ahí (SQLite).
3. Entrenamiento:
   - Al empezar sale el aviso médico.
   - Al terminar, el resumen muestra XP y racha, y el botón "Guardar mi progreso con Google".
4. Login:
   - En Perfil debe decir "Todo sincronizado".
   - En Supabase, `workout_sessions` tiene la sesión y `gamification_state` el XP.
5. Perfil:
   - "Exportar mis datos" abre la hoja de compartir con el JSON.
   - Prueba "Cerrar sesión".
6. Borrado de cuenta: hazlo solo con una cuenta de prueba. Debe volver al onboarding, y en Supabase el usuario
   desaparece.
