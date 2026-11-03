# Aplicación móvil — Android e iOS

**Estado:** base React Native + Expo, código fuente preoperativo. No existe APK/IPA verificado, despliegue en tiendas ni sincronización de reservas. El proyecto no contiene secretos.

## Desarrollo local

Requisitos: Node.js compatible con Expo SDK 58 (22.13+), npm y un simulador/dispositivo.

```bash
cd mobile
npm install
npx expo install --check
npm start
npm run check
```

Expo Go sirve para inspección preliminar; las funciones nativas de producción exigen compilaciones de desarrollo y pruebas en dispositivos reales. En Android se puede compilar localmente con Android Studio; iOS local requiere macOS/Xcode o un servicio de compilación según el caso.

## Comunicación compartida con la web

`src/api.ts` consume `GET /v1/tutors` de un backend común. Para apuntar a una API local segura:

```bash
cp .env.example .env
# EXPO_PUBLIC_VLC_API_URL=https://api-de-prueba.example/
npm start
```

No hay API desplegada hoy. Si la URL no está configurada, aparecen perfiles **ficticios**. Si está configurada pero falla, la lista se vacía y se presenta un error; **nunca se confunde demo con perfiles reales**. Las solicitudes y pagos están deshabilitados por ahora.

Las variables `EXPO_PUBLIC_*` se incluyen en el cliente compilado: nunca colocar tokens privados o secretos. El endpoint público solo debe entregar perfiles autorizados/publicados y sin datos privados.

## Próximas etapas obligatorias

1. Backend propio y versionado: identidad de adultos, familias, docentes, disponibilidad, reservas, avances e incidencias.
2. Control de acceso exclusivo en servidor y reglas de menor/representante legal; no confiar en la UI.
3. Estado compartido web/móvil con paginación, invalidación de caché y cursor de eventos; pruebas en dos dispositivos.
4. Autenticación segura, sesión revocable y almacenamiento seguro (sin credenciales en AsyncStorage).
5. Pruebas Android+iOS y compilaciones firmadas; publicación solo tras auditorías y contratación de servicios necesarios.

**La misma apariencia en móvil y web no equivale a sincronización de datos.** Ver `docs/APP_MOVIL_SINCRONIZACION.md` en la raíz.
