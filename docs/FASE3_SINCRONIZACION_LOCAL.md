# Fase 3 — API local persistente y sincronización multiplataforma

## Estado y alcance

Implementado como **laboratorio local** para adultos y docentes ficticios, NO como backend productivo ni sistema de identidad. Las operaciones de este módulo jamás deben conectarse a usuarios reales o alumnos menores. No desplegar `server/serve.mjs` públicamente: carece deliberadamente de autenticación y los roles son sintéticos. Todos los nombres docentes son inventados.

- Servidor Node.js 22.13+ sin paquetes de terceros, `server/serve.mjs`.
- Base de datos SQLite con transacciones `BEGIN IMMEDIATE`, WAL, revisiones atómicas y tabla de operaciones para idempotencia.
- Interfaz web local `/sync/` y app React Native/Expo Android+iOS conectadas por API común.
- Catálogo y reservas ficticias persisten entre reinicios. Clientes reconsultan revisiones cada 4 segundos cuando hay conectividad.
- Las solicitudes de menores, los pagos, cuentas, documentos privados y autenticación están deshabilitados.

## Ejecución sin suscripciones externas

Desde el directorio raíz del repositorio:

```bash
node --version # >=22.13
npm run dev:sync
```

Navegue a `http://127.0.0.1:4180/sync/` desde dos ventanas. Cree una reserva ficticia en una y verifique que aparezca en la otra sin recargar. Cierre el servidor, vuelva a iniciarlo y compruebe la persistencia en `.local/vlc-demo.sqlite`, ruta excluida de Git.

App Android emulada:

```bash
cd mobile
npm install
printf 'EXPO_PUBLIC_VLC_API_URL=http://10.0.2.2:4180/\n' > .env
npm start
```

En el emulador iOS, `EXPO_PUBLIC_VLC_API_URL=http://localhost:4180/` suele acceder al host. Los dispositivos físicos requieren red accesible y configuración explícita (sin contraseñas/datos reales); se recomienda túnel seguro, nunca abrir la API ficticia a Internet.

Pruebas del backend: `npm run check`. La app móvil no se ha compilado ni probado en un dispositivo iOS o Android mediante este cambio; sigue pendiente su verificación nativa.

## Endpoints del laboratorio (no confundir con API de producción)

| Método | Ruta | Función |
|---|---|---|
| GET | `/v1/health` | Salud, identifica el entorno ficticio |
| GET | `/v1/tutors` | Catálogo de docentes inventados |
| GET | `/v1/demo/snapshot` | Estado compartido completo del sandbox |
| GET | `/v1/demo/sync?after=N` | Lectura incremental por revisión |
| POST | `/v1/demo/bookings` | Solicitud ficticia adulta |
| POST | `/v1/demo/bookings/:id/decision` | Aceptar/rechazar como tutor simulado |
| POST | `/v1/demo/bookings/:id/reschedule` | Cambiar horario ficticio |
| POST | `/v1/demo/bookings/:id/complete` | Simular final de sesión |
| POST | `/v1/demo/bookings/:id/review` | Reseña ficticia pendiente de moderación |
| POST | `/v1/demo/bookings/:id/incident` | Suspender por alerta simulada |
| POST | `/v1/demo/reset` | Borrar historial ficticio |

Cada POST requiere `If-Match: <revision>`, `Idempotency-Key` y JSON. La base confirma un solo cambio por revisión; si dos clientes modifican la misma versión, el segundo recibe 409 y debe reconsultar. Un reintento con la misma clave y la misma solicitud devuelve el resultado original sin volver a ejecutar la operación. El historial de operaciones y los eventos persisten localmente.

## Riesgos y trabajos siguientes

1. **Identidad:** implementar sesiones de adultos revocables, autenticación real, políticas de permisos en servidor y separación de funciones. La API de demostración actual **no tiene autorización**; jamás exponerla públicamente.
2. **Base de producción:** modelo normalizado de reservas, fichas educativas y consentimientos en PostgreSQL con migraciones, RLS y pruebas de aislamiento.
3. **Sincronización operativa:** cambios filtrados por usuario, revalidación de sesiones, reconexión, pruebas móviles nativas y eventos push con garantías definidas.
4. **Infancia:** representación verificada, elegibilidad docente, expedientes privados, SOP de incidentes y revisión jurídica independiente.
5. **CTG One:** servir la web y la API mediante una ruta compartida/reverse proxy auditado, aislado de Wallet/inversión. No se ha configurado infraestructura externa.

La interfaz CTG One existente es aún un **snapshot estático de prelanza­miento**. El nuevo servidor vive en el repositorio VLC, no está ejecutándose en Render ni en ctgone.com.
