# Valderrama Learning Center App

> **Aprendizaje humano. Conexiones responsables.**

Valderrama Learning Center es un proyecto de plataforma digital para conectar **familias, estudiantes universitarios y personas adultas** con **tutores y profesores especializados**. Atiende todas las edades y asignaturas, con controles reforzados cuando participan menores de 18 años.

**Estado (30 de octubre de 2026):** `v0.1.0` — **prototipo navegable, exclusivamente demostrativo**. No tiene autenticación, reservas reales, pagos, mensajería, verificación de docentes ni almacenamiento de datos de usuarios. **No desplegar como servicio operativo para menores de edad.** Los seis perfiles, nombres, puntuaciones y reseñas son ficticios.

## Qué contiene

- Página inicial responsive y catálogo de tutores de demostración.
- Búsqueda por nombre, especialidad y tema, filtrado por nivel y modalidad.
- Presentación de especialidades, trayectoria y **puntuaciones simuladas** (identificadas como tales).
- Simulación de solicitud de clase; menores solamente bajo representación de una persona adulta (validación de identidad real pendiente).
- Requisitos propuestos para el registro de tutores: fotografía, formación y récord académico, especialidades, identidad y acreditaciones.
- Documentos iniciales de producto, protección de infancia, código de conducta, reglamento interno, privacidad, arquitectura y hoja de ruta.
- Pruebas automatizadas de filtros y regla de autorización, más workflow de GitHub Actions.

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

El código es HTML, CSS y JavaScript estándar. No hay backend. El formulario es ilustrativo y no transmite datos.

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

La fase técnica posterior contempla aplicación full-stack con base de datos, autenticación, revisión docente, reservas, pagos, valoraciones comprobadas, consentimiento parental, mensajería moderada y canal de reportes. Ver [ARQUITECTURA](docs/ARQUITECTURA.md) y [ROADMAP](docs/ROADMAP.md).

**Atención:** los borradores de políticas no equivalen a cumplimiento legal ni sustituyen evaluación profesional en protección de datos, derecho de infancia, contratación o normativa sectorial.

## Autoría y licencia

© 2026 Valderrama Learning Center. Reservados todos los derechos. Repositorio pensado para trabajo **privado** hasta definir licenciamiento, marca y revisión de seguridad.
