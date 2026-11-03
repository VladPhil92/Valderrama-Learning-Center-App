# Arquitectura objetivo — diseño preliminar

## Estado actual (Fase 1)

La portada sigue siendo estática. Ahora existe un portal en `/portal/` para autenticación de adultos, familias y docentes, un esquema PostgreSQL RLS en `supabase/migrations/`, almacenamiento privado y una Edge Function en `supabase/functions/` para revisiones. **No se ha conectado ni desplegado una instancia Supabase exclusiva**, por lo que no hay persistencia ni verificación real operativa. Las reservas de la portada siguen siendo ilustrativas.

## Laboratorio técnico implementado

El subproyecto `server/` aporta una API Node.js/SQLite con datos **únicamente ficticios**, transacciones y revisión compartida. El subproyecto `sync/` es un cliente web real de esa API. `mobile/` consume el mismo contrato de catálogo y reservas ficticias. La API local no tiene autenticación; **no es la arquitectura de seguridad de producción**. Ver [FASE3_SINCRONIZACION_LOCAL.md](FASE3_SINCRONIZACION_LOCAL.md).

## Arquitectura propuesta para producción

**Decisión 03/11/2026:** el producto se distribuye en **web CTG One, Android e iOS** desde su MVP. Ninguna reserva, ficha de estudiante o pago residirá como fuente de verdad en el cliente. React Native/Expo en `mobile/` es un cliente nativo independiente que consulta la misma API que la web. Es un prototipo sin integración operativa hoy; ver [APP_MOVIL_SINCRONIZACION.md](APP_MOVIL_SINCRONIZACION.md).

```
Navegador (CTG One)      App Android      App iOS
      |                      |              |
Frontend web (Next.js)      React Native / Expo
      |                      |              |
      +----------------------+--------------+
                             |
Servicio API versionado /v1 con permisos verificados
       |---------------------------------------------|
PostgreSQL con RLS     Servicio de pagos       Servicio de notificaciones
       |                     |                       |
Storage privado        Webhooks auditados     Email/SMS transaccional
       |
Backoffice de validación, protección y moderación
```

Posible implementación: Next.js + TypeScript, PostgreSQL gestionado, autenticación de usuarios adultos, almacenamiento privado de documentos, API de pagos local y monitoreo de errores. Cualquier proveedor seleccionado requiere due diligence de residencia de datos, transferencias internacionales, cumplimiento y contratos de encargo. No escoger servicios ni integrar pagos hasta aprobar la política de datos y el modelo de negocio.

## Entidades de datos (conceptual)

- `accounts`: identidad de adultos, rol y estado.
- `guardian_relationships`: relación validada entre representante y dependiente menor, con fundamento y consentimientos.
- `learners`: ficha educativa privada, identificador seudónimo, nivel/objetivos, sin datos sensibles innecesarios.
- `tutor_profiles`: nombre profesional, fotografía aprobada, descripción y estados de aprobación.
- `academic_credentials`: emisor, tipo, vigencia/fecha, validación y documento adjunto **privado**.
- `eligibility_checks`: naturaleza y fecha de verificación legal, autorización y resultado mínimo; acceso extremadamente restringido.
- `subjects` y `tutor_subjects`: catálogo curricular escalable.
- `availability`: disponibilidad ofrecida y zona horaria.
- `bookings`: participantes, estado, consentimiento, medio y comprobantes.
- `reviews`: reseña unida a una reserva terminada, moderación y apelación.
- `messages`: comunicaciones exclusivamente autorizadas y sujetas a política de conservación y acceso.
- `safety_reports`: reportes y clasificación, con permisos de equipo restringido.
- `audit_events`: acciones de perfil, aprobación, acceso a expediente, consentimiento, incidentes, cambios de privilegios.

## Matriz mínima de acceso

| Recurso | Público | Representante / alumno adulto | Tutor | Equipo de protección |
|---|---|---|---|---|
| Perfil docente aprobado | Lectura | Lectura | Edita solo propio borrador | Revisión y bloqueo |
| Documento académico original | No | No | Propio | Solo verificador autorizado |
| Ficha del menor | No | Solo vínculo validado | Información estrictamente necesaria de clase confirmada | Acceso justificado y auditado |
| Consentimientos | No | Accede a los propios | No | Personal autorizado |
| Reserva | No | Propia | Asignada | Acceso por necesidad |
| Valoración publicada | Lectura moderada | Autoría propia | Respuesta autorizada | Moderación y revisión |
| Reporte de protección | No | Su propio caso en vista limitada | Solo información autorizada | Equipo especializado |

**Obligatorio:** aplicar cada regla en el servidor y base de datos (RLS), no solo ocultar campos en la interfaz. Agregar pruebas de permisos cruzados, revocación y fugas por API, buscadores y archivos públicos.

## Flujo de alta docente

`draft → submitted → identity_review → credential_review → legal_review_if_applicable → approved/rejected/suspended`

- Documento de identidad y diplomas **no se publican**.
- Verificaciones legalmente exigibles para trato directo y habitual con menores y autorizaciones correspondientes.
- Separar estado `approved_for_adults` de `approved_for_minors`.
- Para rechazos o suspensiones: registro motivado, límites de confidencialidad, recurso de revisión.
- Renovación periódica de controles conforme al análisis legal y regulatorio.

## Confianza, comunicación y reputación

- Mensajes solo dentro del servicio, sin revelación de datos de contacto del menor, con intervención del adulto responsable.
- Alertas, indicadores de riesgo, bloqueo y mecanismo de escalamiento. Configurar controles de protección de mensajes con evaluación de privacidad y proporcionalidad; no prometer monitoreo absoluto.
- Calificaciones solo de reservas culminadas. Aplicar defensa frente a reseñas compradas o abusivas, explicabilidad de ranking y reglas de eliminación.
- No subir antecedentes penales, certificados médicos ni documentos de niños al repo, herramientas de analítica o logs sin base jurídica y necesidad comprobada.

## Portones antes del lanzamiento

1. Política legal validada, datos y consentimiento de menores, términos de contratación y relación contractual con profesores.
2. Pruebas de identidad, verificación académica, inhabilidades aplicables y canal de apelación.
3. Modelo de permisos, tests RLS, auditoría, análisis de riesgos y pruebas de penetración independientes.
4. Equipo humano de confianza y seguridad, protocolo de denuncias y rutas externas de actuación.
5. Procesamiento financiero, facturación, reversos, soporte y solución de controversias.
6. Accesibilidad WCAG, pruebas con usuarios adultos y familias y pruebas de usabilidad antes de escalar.
