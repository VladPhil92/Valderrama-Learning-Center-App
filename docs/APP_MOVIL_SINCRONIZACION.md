# Requisito de producto: web + Android + iOS totalmente sincronizados

**Decisión del proyecto (3 de noviembre de 2026):** Android e iOS son canales principales desde el MVP. Una PWA no sustituye las aplicaciones instalables ni sus pruebas nativas.

## Arquitectura de la fuente única de verdad

```text
Web pública / cuentas en ctgone.com ─────┐
App React Native Android ────────────────┼── HTTPS /v1/ ── servicio común de aplicación
App React Native iOS ────────────────────┘                     │
                                        autorización server-side + control parental
                                                               │
                                                 PostgreSQL / transacciones
                                                               │
                                               cola de eventos y auditoría
```

Las tres interfaces usan **las mismas entidades y operaciones**. El backend, no los clientes, verifica identidad, rol, vinculación legal con dependientes, cupos, doble reserva, cambio de estado, reseñas, remuneración y seguridad. Cada operación crítica se realiza de forma transaccional e idempotente.

### Definición concreta de «100 % sincronizada»

- Cuenta adulta autenticada = misma identidad y permisos en web, Android e iOS.
- Reserva creada o modificada desde cualquier canal = mismo estado persistente, consultable desde los otros dos.
- Disponibilidad y validación de docentes = definidas en backend único, sin copias independientes.
- Plan de aprendizaje, evidencias, asistencia, evaluaciones y comentarios = mismos registros, con acceso restringido.
- Pagos, devoluciones y facturas = estados verificados desde servidor, nunca cálculo de saldo desde el dispositivo.
- Los cambios se propagan por eventos y reconsulta incremental; se define un objetivo medible de latencia, no se promete actualización instantánea incondicional sin conectividad.
- Sin Internet: estado de solo lectura con marca de última sincronización; mutaciones sensibles **no se ejecutan en silencio** ni se dan por confirmadas.

### Contrato API v1 propuesto

| Recurso | Lectura/escritura | Control |
|---|---|---|
| `GET /v1/tutors` | Público, perfiles aprobados | Exclusión de documentos privados y datos de menores |
| `GET /v1/me` | Cuenta autenticada | Sesión segura de adulto |
| `GET /v1/learners` | Menores vinculados / adultos | Relación verificada en servidor |
| `GET /v1/availability?tutorId=...` | Agenda pública autorizada | Zona horaria y franjas válidas |
| `POST /v1/bookings` | Solicitud con clave de idempotencia | Permisos, elegibilidad y transacción |
| `GET /v1/bookings?cursor=...` | Reservas propias | Filtro por principal autenticado |
| `PATCH /v1/bookings/:id` | Aceptar/reprogramar/cancelar | Máquina de estados y auditoría |
| `GET /v1/learning-plans` | Planes autorizados | Acceso privado por rol |
| `GET /v1/sync?since=...` | Eventos incrementales | Solo eventos permitidos al usuario |

Se ha implementado además un laboratorio de sesiones por cuenta y reservas privadas en `/v1/lab/*`, consumido por la web `/sync/secure/` y la pestaña móvil `Cuentas`; ver [FASE4_CUENTAS_LOCALES.md](FASE4_CUENTAS_LOCALES.md). **No se admiten alumnos menores ni datos reales.**

Se ha implementado en laboratorio la lectura de catálogo `GET /v1/tutors` y las rutas **exclusivamente ficticias** `GET /v1/demo/snapshot`, `GET /v1/demo/sync?after=N`, `POST /v1/demo/bookings` y comandos de demostración; las demás rutas productivas siguen siendo especificación NO desplegada. Ver [FASE3_SINCRONIZACION_LOCAL.md](FASE3_SINCRONIZACION_LOCAL.md).

### Modelo mínimo de sincronización

- Respuestas con `revision` monotónica, `updatedAt` en UTC y `nextCursor` para colecciones paginadas.
- Cambios de agenda o reserva con control de versión (`If-Match`) e idempotencia.
- Conflictos de doble reserva: decisión exclusiva de la base transaccional; respuesta `409 Conflict`.
- Revalidación tras reconexión, inicio de sesión, cambio de perfil, evento push o reingreso a la aplicación.
- Protección: no almacenar expedientes sensibles de menores ni documentos de identidad en cachés públicos o analítica.
- Pruebas E2E con web+Android+iOS: crear reserva, sincronizar estado, reprogramar, cancelar, cerrar sesión y revocar acceso.

### Dependencias y decisiones pendientes

La implementación inicial de React Native/Expo está en `mobile/`. Los paquetes open-source se pueden instalar localmente sin suscripción comercial. La construcción de binarios, dispositivos de prueba, certificación de publicación, DNS, SSL, backend alojado, mensajería y pagos son tareas distintas y requieren planificación específica. No incluir URL de pago, credenciales ni llaves comerciales en el código fuente.

**Implementado localmente:** servidor SQLite transaccional de demostración, revisión monotónica, deduplicación, cliente web y cliente móvil para reservas ficticias. **No disponible actualmente:** servidor online transaccional con usuarios reales, sincronización operativa de cuentas entre dispositivos, builds nativos verificados o cuentas reales. El compromiso aquí es arquitectónico y de producto, no una declaración de producción.
