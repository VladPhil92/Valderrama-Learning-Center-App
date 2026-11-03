# Fase 4 — Cuentas ficticias, permisos y agenda privada (sin proveedores)

**Estado:** laboratorio de integración LOCAL, sin validación de identidad y sin seguridad de producción. Ninguna operación con menores, pagos o documentos académicos reales está autorizada. La existencia de un token válido en esta prueba **no equivale** a verificar mayoría de edad, títulos ni representación familiar.

## Qué se desarrolló

- **Cuentas con alias ficticios** y roles de prueba `adult`, `guardian`, `tutor`. El responsable familiar queda `pending_real_verification`. Un docente queda `unverified_demo`; no es elegible para menores.
- **Contraseñas de 12–128 caracteres derivadas con scrypt + sal individual**, sin almacenar contraseñas en texto plano. Tras cinco errores se bloquea temporalmente una cuenta de prueba.
- **Sesiones opacas aleatorias (256 bits)** con hash SHA-256 persistido y vencimiento de ocho horas; cierre de sesión actual o revocación de todas las sesiones.
- **Reservas privadas** por actor autenticado; el servidor obtiene quién actúa de la sesión, nunca de un campo enviado por el cliente. Solo el solicitante y el docente asignado pueden consultarlas.
- **Revisión por cuenta**: los cambios de otro usuario no incrementan el cursor de una cuenta ajena. Cada mutación exige `If-Match` e `Idempotency-Key`, transacción SQLite y verificación de horarios.
- **Dos clientes para el mismo servicio**: `/sync/secure/` en la web de laboratorio y pestaña **Cuentas** en React Native/Expo. Consultan `/v1/lab/*` y actualizan cada cuatro segundos.
- **No hay datos de menores**: `/v1/lab/learners` devuelve 403, y `audience:minor` en reservas devuelve 403. Toda reserva usa `audience:adult`.

## Ejecución local

```bash
node --version             # >= 22.13
npm run dev:sync
```

Abra **http://127.0.0.1:4180/sync/secure/**. Registre un alias adulto, otro de docente y un segundo alias adulto. No utilice nombres, correos ni contraseñas reales: el archivo SQLite local persiste las credenciales de prueba.

Puede iniciar sesión con el **mismo alias ficticio desde dos clientes**, creando dos sesiones independientes; las reservas se comparten automáticamente entre sesiones y clientes que consulten ese mismo servidor.

Para Android emulado, use `EXPO_PUBLIC_VLC_API_URL=http://10.0.2.2:4180/`; en el simulador iOS, `http://localhost:4180/`. Nunca publicar esta URL sin TLS y servidor protegido. Por defecto, el backend solo escucha en la interfaz loopback `127.0.0.1`. No hay pruebas físicas/compilaciones IPA o APK dentro de esta fase.

## Endpoints exclusivos de laboratorio

| Método | Ruta | Permiso |
|---|---|---|
| POST | `/v1/lab/register` | Crear alias ficticio con rol limitado |
| POST | `/v1/lab/login` | Comprobar contraseña y emitir sesión |
| GET | `/v1/lab/me` | Sesión |
| GET | `/v1/lab/tutors` | Sesión; docentes ficticios |
| GET | `/v1/lab/bookings` | Sesión; solamente reservas propias/asignadas |
| GET | `/v1/lab/sync?after=N` | Sesión; revisión específica de la cuenta |
| POST | `/v1/lab/bookings` | Adulto/responsable; alumno adulto ficticio exclusivamente |
| POST | `/v1/lab/bookings/:id/accept` | Solo el docente asignado |
| POST | `/v1/lab/bookings/:id/reject` | Solo el docente asignado |
| POST | `/v1/lab/bookings/:id/cancel` | Solo solicitante o docente asignado |
| POST | `/v1/lab/logout` | Revocar el token actual |
| POST | `/v1/lab/logout-all` | Revocar las sesiones de la cuenta |

`Authorization: Bearer <token>` es obligatorio salvo registro e inicio de sesión. Las mutaciones de reserva exigen cabeceras `If-Match` e `Idempotency-Key`.

El simulador anterior `/v1/demo/*` continúa abierto **solo en loopback**, con datos independientes y sin identidad; no reutilizar sus endpoints para productos operativos.

## Controles cubiertos por tests

1. Las contraseñas no se almacenan en claro; se rechazan registros fuera de los roles permitidos.
2. Una segunda cuenta no puede leer, aceptar ni cancelar la reserva de otra.
3. Solo el tutor asignado puede aceptar o rechazar.
4. Dos solicitantes no pueden ocupar el mismo horario docente.
5. Cierre de sesión y revocación de todos los tokens invalidan el acceso.
6. Un responsable pendiente no puede registrar alumnos ni reservar para menores.
7. La persistencia de sesiones y reservas se mantiene al abrir otra conexión SQLite.

Ejecutar `npm run check` para pruebas de Node y `npm --prefix mobile run check` tras instalar las dependencias de Expo, sin compilar binarios.

## Límites obligatorios antes de producción

- **No es identidad verificada.** El usuario elige un rol ficticio; el backend no distingue documentalmente adultos de menores, representantes o profesores reales. Ningún rol ficticio habilita tutorías reales.
- **No es seguridad de producción.** Falta HTTPS, despliegue privado, política de datos y retención, recuperación segura de cuentas, MFA, recuperación y revocación de sesión tras compromiso, CSRF/XSS hardening, control de abuso a nivel de IP, auditoría, backups, revisión criptográfica y pruebas de penetración.
- La sesión web se mantiene solo en memoria; la app móvil también. No guardar tokens o claves de prueba en AsyncStorage ni repositorio. En producción, planificar mecanismos nativos de sesión y almacenamiento cifrado.
- Los alias de prueba y contraseñas deben ser sintéticos; no subir archivos SQLite ni contraseñas de usuarios al GitHub.
- **No desplegar `server/serve.mjs` en CTG One, Render ni un dominio público.** El laboratorio corre en loopback y conserva abierto el antiguo endpoint `/v1/demo/*`.
- Antes de conectar proveedores, diseñar migración a PostgreSQL normalizada, separación de servicios, autenticación auditada, autorización por vínculo familiar, protección de infancia y pruebas E2E web/Android/iOS con hardware real.

Esta fase permite verificar conceptualmente que **web y Android/iOS usan las mismas cuentas de prueba y reservas privadas**, pero no acredita un servicio listo para usuarios reales.
