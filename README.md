# Valderrama Learning Center App

> **Aprendizaje humano. Conexiones responsables.**

**Alcance obligatorio:** un solo producto en web, Android e iOS, con backend, identidad, reservas y datos compartidos. La app **React Native / Expo** está iniciada en [`mobile/`](mobile/) y su arquitectura se explica en [`docs/APP_MOVIL_SINCRONIZACION.md`](docs/APP_MOVIL_SINCRONIZACION.md). **Ya existe un laboratorio de sincronización persistente local, pero no hay sincronización de producción todavía**: es una base de código para Android e iOS con navegación y catálogo demostrativos, no una app disponible en tiendas.

Valderrama Learning Center es un proyecto de plataforma digital para conectar **familias, estudiantes universitarios y personas adultas** con **tutores y profesores especializados**. Atiende todas las edades y asignaturas, con controles reforzados cuando participan menores de 18 años.

**Estado (3 de noviembre de 2026):** `v0.4.0` — **portal de autenticación y perfiles desarrollado, pendiente de infraestructura y pruebas de integración**. La portada sigue siendo una demostración; el nuevo portal incorpora código de autenticación, registro y revisión, pero **no está conectado a un proyecto Supabase real**. No procesa reservas, pagos ni mensajería. **No desplegar como servicio operativo para menores de edad.** Los seis perfiles, nombres, puntuaciones y reseñas son ficticios.

## Qué contiene

- Proyecto React Native/Expo en `mobile/` con interfaces preliminares Android/iOS, catálogo remoto configurable y estado de demostración aislado.

- Página inicial responsive y catálogo de tutores de demostración.
- Búsqueda por nombre, especialidad y tema, filtrado por nivel y modalidad.
- Presentación de especialidades, trayectoria y **puntuaciones simuladas** (identificadas como tales).
- Simulación de solicitud de clase; menores solamente bajo representación de una persona adulta (validación de identidad real pendiente).
- Requisitos propuestos para el registro de tutores: fotografía, formación y récord académico, especialidades, identidad y acreditaciones.
- Documentos iniciales de producto, protección de infancia, código de conducta, reglamento interno, privacidad, arquitectura y hoja de ruta.
- Pruebas automatizadas de filtros y regla de autorización, más workflow de GitHub Actions.

## Portal de cuentas y Fase 1

La nueva ruta [`portal/index.html`](portal/index.html) incorpora:
- Registro e ingreso de adultos mediante Supabase Auth, con credenciales y permisos verificados por backend.
- Perfil familiar con apodos educativos privados de menores y estado de representación pendiente.
- Perfil docente, fotografía privada, acreditaciones y solicitud de revisión humana.
- Revisión con roles de personal y tickets de evidencia mediante Edge Function.
- Diez tablas PostgreSQL protegidas con RLS y dos buckets privados.

**Requiere configuración adicional.** No existen cuentas habilitadas ni base real para esta app. Consultar [`FASE1_INSTALACION.md`](docs/FASE1_INSTALACION.md) para crear proyecto Supabase dedicado, aplicar migraciones, desplegar función y probar seguridad. No se reutilizaron proyectos ajenos existentes.

## Ejecutar el prototipo

Requiere Node.js 22.13 o superior. **No necesita instalar dependencias externas.**

```bash
npm run dev
```

Abre `http://localhost:4173`.

```bash
npm test        # Pruebas automatizadas
npm run build   # Genera dist/ para sitio estático
npm run check   # Pruebas + compilación
```

El catálogo inicial sigue siendo estático y ficticio. La sección `/portal/` usa el backend Supabase solo después de configurar las variables publicables, aplicar migraciones y desplegar la Edge Function. No contiene secretos ni usuarios precargados.

## Fase de sincronización local (v0.4.0)

El servidor `server/serve.mjs` utiliza SQLite local con revisiones transaccionales, deduplicación e interfaz web `/sync/`. Se conecta a `mobile/` mediante los endpoints de `/v1/demo/`, con actualización periódica de reservas **ficticias**. Para probarlo:

```bash
npm run dev:sync
# Abrir http://127.0.0.1:4180/sync/
npm run check
```

No se emplean proveedores de pago. **Es una API local sin autenticación real, incapaz de procesar operaciones productivas o menores. No desplegar públicamente**. Instrucciones y contrato: [FASE3_SINCRONIZACION_LOCAL.md](docs/FASE3_SINCRONIZACION_LOCAL.md).

## Principios del producto

1. **Protección de menores desde la arquitectura:** tutela de un adulto responsable, perfiles de menores no públicos, contacto tutores–menores únicamente en canales controlados y mecanismos de denuncia.
2. **Validación de la docencia:** acreditaciones académicas verificadas; los documentos originales no se publican. Revisión de identidad e inhabilidades cuando sea exigible.
3. **Reputación verificable:** valoraciones públicas solo después de clases efectivamente realizadas, con mitigación del fraude y procedimiento de apelación.
4. **Inclusión de públicos:** colegio (todos los grados), universidad y formación continua de adultos.
5. **Trazabilidad:** registros de consentimientos, aprobaciones, reservas, incidentes y medidas de moderación, con acceso restringido y reglas de retención.

## Roles previstos

| Rol | Función | Restricción relevante |
|---|---|---|
| Padre, madre o representante autorizado | Gestiona perfil privado de menor, selecciona tutor y autoriza clase | Control parental y consentimiento documentado |
| Estudiante adulto | Solicita tutoría de forma autónoma | Verificación de mayoría de edad según riesgo |
| Tutor o profesor | Publica perfil validado, ofrece disponibilidad y recibe valoraciones verificadas | Revisión de identidad, títulos y controles aplicables |
| Operador de protección / moderación | Evalúa alertas, documentos, incidencias y apelaciones | Acceso mínimo, logs y deber de confidencialidad |
| Administrador | Configura asignaturas, oferta, comisiones, operación y control interno | Separación de funciones y auditoría |

Los menores **no tendrán cuentas públicas ni mensajería autónoma con adultos** durante el MVP. Cualquier experiencia adicional requerirá evaluación jurídica y de seguridad previa.

## Documentación

- [Instalación y validación de Fase 1](docs/FASE1_INSTALACION.md)
- [Alcance y criterios MVP](docs/PRODUCTO_MVP.md)
- [Arquitectura prevista](docs/ARQUITECTURA.md)
- [Protocolo de protección de infancia (borrador)](docs/PROTECCION_INFANCIA.md)
- [Código de conducta (borrador)](docs/CODIGO_CONDUCTA.md)
- [Reglamento interno (borrador)](docs/REGLAMENTO_INTERNO.md)
- [Tratamiento de datos y privacidad (borrador)](docs/PRIVACIDAD_BORRADOR.md)
- [Referencias normativas colombianas](docs/MARCO_LEGAL_COLOMBIA.md)
- [Fases e hitos](docs/ROADMAP.md)
- [App Android/iOS y sincronización real](docs/APP_MOVIL_SINCRONIZACION.md)
- [Laboratorio de API local persistente](docs/FASE3_SINCRONIZACION_LOCAL.md)
- [Seguridad y reporte responsable](SECURITY.md)

## Próximos desarrollos

La Fase 1 ya contiene el diseño SQL y código de autenticación, perfiles y revisión; siguen pendientes su puesta en marcha en infraestructura exclusiva y las pruebas de seguridad de extremo a extremo. La siguiente fase incorpora reservas, pagos, valoraciones comprobadas, consentimiento parental verificable, mensajería moderada y canal de reportes. Ver [ARQUITECTURA](docs/ARQUITECTURA.md) y [ROADMAP](docs/ROADMAP.md).

**Atención:** los borradores de políticas no equivalen a cumplimiento legal ni sustituyen evaluación profesional en protección de datos, derecho de infancia, contratación o normativa sectorial.

## Autoría y licencia

© 2026 Valderrama Learning Center. Reservados todos los derechos. Repositorio pensado para trabajo **privado** hasta definir licenciamiento, marca y revisión de seguridad.


## Simulador funcional preoperativo (noviembre 2026)

`/demo/index.html` permite recorrer **en memoria** los flujos de selección de docente ficticio, solicitud de horario, aceptación o rechazo, reprogramación, finalización de una clase simulada, reseña pendiente de moderación y alerta que congela operaciones. Se ejecuta con `npm run dev` y se publica con `npm run build` sin proveedores externos ni almacenamiento de información. No introduce ni verifica identidades reales. El motor puro en `src/marketplace.js` está cubierto por pruebas en `tests/marketplace.test.js`.

**IMPORTANTE:** No confundir un flujo de interfaz completado con reservas operativas. La comprobación de disponibilidad, autenticación, pagos, datos privados, acreditación de docentes, representación legal, moderación y garantías de protección de infancia deben estar a cargo de un backend confiable, políticas RLS, procedimientos humanos y pruebas de seguridad antes de abrir el servicio. Los estados `approved_*` del simulador son exclusivamente ficticios.

### Preparación de dominio y CTG One

El dominio previsto por el propietario es `valderramalearnigncenter.ctgone.com` (ortografía exacta solicitada). La experiencia estática del repositorio puede integrarse mediante una copia inmutable de `dist/` al namespace `/valderrama-learning-center/` de CTG One y un enrutamiento por Host. La sincronización es **de código**, no de credenciales, cuentas, usuarios ni pagos. Se debe configurar DNS/TLS y reactivar la infraestructura antes de ofrecer el subdominio en Internet. Véase `docs/INTEGRACION_CTG_ONE.md`.
