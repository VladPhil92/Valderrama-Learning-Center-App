# Hoja de ruta del producto

**Requisito transversal:** web + app Android + app iOS constituyen un único producto sincronizado mediante la misma API, permisos y datos. La app móvil NO pertenece a una fase opcional de escalamiento. Referencia: [APP_MOVIL_SINCRONIZACION.md](APP_MOVIL_SINCRONIZACION.md).

Los hitos son **secuenciales por evidencia**, no fechas comprometidas.

## Fase 0 — Conceptualización y repositorio (incluida en el paquete)

- [x] Definición de segmentos: colegio, universidad, adultos.
- [x] Diseño de interfaz estática responsive y buscador de docentes ficticios.
- [x] Reglas de negocio y borradores de políticas.
- [x] Test básico de filtrado y control ilustrativo de solicitud.
- [x] Creación del repositorio remoto en GitHub y publicación del primer commit.
- [ ] Revisión de marca, experiencia de usuario y alcance del negocio.

## Fase 1 — Identidad y validación (código preparado, despliegue operativo pendiente)

- [x] Código de autenticación Supabase Auth para adultos y reglas de roles/privilegios RLS preparadas (activación pendiente).
- [x] Formularios de docentes, foto y acreditaciones privadas implementados (buckets SQL pendientes de activar).
- [x] Cola de revisión y Edge Function de decisiones con evidencias y auditoría; falta SOP, apelación y despliegue.
- [x] Fichas privadas seudónimas y declaraciones de representación con estado pendiente; **falta verificación documental real**.
- [ ] RLS y auditoría diseñadas; pendientes pruebas reales entre cuentas, pentest y validación jurídica.

**Criterio de salida aún no alcanzado:** ningún tutor aparece como habilitado para menores sin completar controles aplicables; ningún usuario accede a fichas de estudiantes ajenos.

## Fase 1M — Clientes Android + iOS (prioridad paralela a backend)

- [x] Estructura inicial React Native/Expo en `mobile/` para ambas plataformas, sin servicios contratados.
- [x] Catálogo demostrativo offline, lectura opcional de API pública y separación explícita de estados reales/ficticios.
- [ ] Instalación de dependencias, chequeo TypeScript y ejecución de la app en Android físico/emulador e iOS físico/simulador.
- [ ] Inicio de sesión y sesión revocable compartida con la web desde backend seguro.
- [x] Reservas y agenda **ficticias** compartidas mediante API local SQLite, con consulta periódica Android/iOS; conexión web en `/sync/` (código).
- [ ] Reservas y agenda **reales** compartidas con autenticación, progresos académicos y notificaciones seguras.
- [ ] Pruebas E2E y de autorización entre web, Android e iOS con dos dispositivos.

**Criterio de salida:** mismo usuario, misma reserva y mismos datos sincronizados tras cambios desde cualquiera de los tres clientes; pruebas de revocación y conflictos. Existe backend SQLite **sólo ficticio** sin identidad y sin pruebas físicas Android/iOS: criterio NO cumplido.

## Fase 2 — Marketplace y reservas

**Avance en código (3/11/2026):** simulador en memoria más API local SQLite persistente, para selección, agenda ficticia, solicitudes, decisiones, reprogramación, clase completada y alertas. Las pruebas de persistencia y conflictos están automatizadas. **No hay operaciones productivas, identidad real ni servicio alojado**.

- [ ] Catálogo con filtros curriculares por grado/asignatura, modalidad y ciudad.
- [ ] Agenda, solicitudes, aceptación, reprogramación y notificaciones.
- [ ] Términos comerciales y pagos a través de tercero verificado.
- [ ] Canales de interacción autorizados y controles reforzados con menores.
- [ ] Panel de operación y mecanismo de reporte de incidentes.

**Criterio de salida:** reserva de extremo a extremo con consentimiento válido, soporte y simulacro de incidente.

## Fase 3 — Confianza, reputación y calidad

- [ ] Sistema de puntuación pública ligada a clases completadas.
- [ ] Moderación de reseñas, explicabilidad del orden de búsqueda y apelación.
- [ ] Indicadores de aprendizaje, asistencia y satisfacción.
- [ ] Procesos de calidad pedagógica y acreditaciones renovables.

**Criterio de salida:** controles contra reseñas falsas, moderación auditable y protección de consumidores.

## Fase 4 — Escalamiento

- [ ] Accesibilidad, múltiples ciudades, idiomas y medios de pago.
- [ ] Distribución pública de builds Android/iOS, accesibilidad y políticas de tiendas, tras pruebas de seguridad.
- [ ] Alianzas institucionales y oferta de formación corporativa.
- [ ] Auditorías de privacidad, seguridad y calidad continuas.
