# Valderrama Learning Center App

> **Aprendizaje humano. Conexiones responsables.**

Valderrama Learning Center es un proyecto de plataforma digital para conectar **familias, estudiantes universitarios y personas adultas** con **tutores y profesores especializados**. Atiende todas las edades y asignaturas, con controles reforzados cuando participan menores de 18 años.

**Estado (30 de octubre de 2026):** `v0.2.0` — **portal de autenticación y perfiles desarrollado, pendiente de infraestructura y pruebas de integración**. La portada sigue siendo una demostración; el nuevo portal incorpora código de autenticación, registro y revisión, pero **no está conectado a un proyecto Supabase real**. No procesa reservas, pagos ni mensajería. **No desplegar como servicio operativo para menores de edad.** Los seis perfiles, nombres, puntuaciones y reseñas son ficticios.

## Qué contiene

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

Requiere Node.js 20 o superior. **No necesita instalar dependencias externas.**

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
- [Seguridad y reporte responsable](SECURITY.md)

## Próximos desarrollos

La Fase 1 ya contiene el diseño SQL y código de autenticación, perfiles y revisión; siguen pendientes su puesta en marcha en infraestructura exclusiva y las pruebas de seguridad de extremo a extremo. La siguiente fase incorpora reservas, pagos, valoraciones comprobadas, consentimiento parental verificable, mensajería moderada y canal de reportes. Ver [ARQUITECTURA](docs/ARQUITECTURA.md) y [ROADMAP](docs/ROADMAP.md).

**Atención:** los borradores de políticas no equivalen a cumplimiento legal ni sustituyen evaluación profesional en protección de datos, derecho de infancia, contratación o normativa sectorial.

## Autoría y licencia

© 2026 Valderrama Learning Center. Reservados todos los derechos. Repositorio pensado para trabajo **privado** hasta definir licenciamiento, marca y revisión de seguridad.
