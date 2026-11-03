# Aplicación móvil — Android e iOS

**Estado:** base React Native + Expo, código fuente preoperativo. No existe APK/IPA verificado, despliegue en tiendas ni sincronización productiva de reservas. El laboratorio local **sí sincroniza reservas ficticias** por API. El proyecto no contiene secretos.

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

`src/api.ts` consume `GET /v1/tutors` y `GET /v1/demo/snapshot` de un backend común, y ejecuta comandos ficticios vía `POST /v1/demo/*` con control de revisión e idempotencia. El app reconsulta cada 4 segundos. Para apuntar a una API local segura:

```bash
cp .env.example .env
# Para Android emulado: EXPO_PUBLIC_VLC_API_URL=http://10.0.2.2:4180/
# Para iOS simulador: EXPO_PUBLIC_VLC_API_URL=http://localhost:4180/
# En otro entorno sólo HTTPS
npm start
```

No hay API desplegada hoy. Si la URL no está configurada, aparecen perfiles **ficticios**. Si está configurada pero falla, la lista se vacía y se presenta un error; **nunca se confunde demo con perfiles reales**. Las solicitudes de clase **ficticia adulta** funcionan sólo contra el servidor local de pruebas; pagos, identidad real y operaciones con menores siguen deshabilitados. Primero ejecutar `npm run dev:sync` en la raíz del repositorio.

Las variables `EXPO_PUBLIC_*` se incluyen en el cliente compilado: nunca colocar tokens privados o secretos. El endpoint público solo debe entregar perfiles autorizados/publicados y sin datos privados.

## Cuentas de prueba privadas (nuevo)

La pestaña **Cuentas** implementa registro con alias ficticios, inicio y cierre de sesión, revocación, lectura de reservas propias y decisiones por rol. Se comunica con los endpoints `/v1/lab/*` del mismo servidor que la web `/sync/secure/`.

Se utiliza un token **exclusivamente en memoria**; al reiniciar la app hay que volver a ingresar. Esto evita guardar claves privadas en almacenamiento inseguro, pero no equivale a seguridad de producción. Sin menores, sin datos reales y sin pagos.

Para probar se requiere que `npm run dev:sync` esté activo en el equipo anfitrión. Crear alias ficticios distintos para adulto y tutor y usar el mismo alias en dos clientes para comprobar sincronización. Ver [FASE4_CUENTAS_LOCALES.md](../docs/FASE4_CUENTAS_LOCALES.md).

## Próximas etapas obligatorias

1. Backend propio y versionado: identidad de adultos, familias, docentes, disponibilidad, reservas, avances e incidencias.
2. Control de acceso exclusivo en servidor y reglas de menor/representante legal; no confiar en la UI.
3. Estado compartido web/móvil con paginación, invalidación de caché y cursor de eventos; pruebas en dos dispositivos.
4. Autenticación segura, sesión revocable y almacenamiento seguro (sin credenciales en AsyncStorage).
5. Pruebas Android+iOS y compilaciones firmadas; publicación solo tras auditorías y contratación de servicios necesarios.

**La misma apariencia en móvil y web no equivale a sincronización de datos.** Ver `docs/APP_MOVIL_SINCRONIZACION.md` en la raíz.
