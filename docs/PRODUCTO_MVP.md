# Documento de producto (PRD) — Valderrama Learning Center

**Versión:** 0.1 — 30/10/2026 | **Estado:** hipótesis funcionales pendientes de validación.

## Propósito

Conectar de forma confiable a quienes necesitan formación y acompañamiento con profesores y tutores especializados. El cliente puede ser una familia responsable de estudiantes de preescolar, primaria, secundaria o media; un estudiante universitario; o una persona adulta interesada en una habilidad académica, profesional o personal.

## Propuesta de valor

- Para familias: localización de profesores por asignatura, grado, metodología, experiencia, modalidad, disponibilidad y reputación; contratación gestionada por adulto responsable.
- Para universitarios: búsqueda de especialistas en cursos universitarios y habilidades de investigación o técnicas; tutoría académica ética (no realización de trabajos por encargo).
- Para adultos: especialización flexible en idiomas, tecnología, comunicación, ciencias, empleabilidad y otras áreas.
- Para docentes: perfil profesional con fotografía, récord académico verificable, especialidades, experiencia, horarios y reputación transparente.

## Historias de usuario — MVP operativo futuro

| ID | Prioridad | Historia | Criterio de aceptación |
|---|---|---|---|
| FAM-01 | P0 | Como representante, registro mi identidad y creo una ficha privada para mi hijo/a. | Sin cuenta ni ficha pública del menor; consentimiento trazable. |
| ADU-01 | P0 | Como estudiante mayor de edad, puedo descubrir y contratar un docente. | Autonomía verificada y mínima información necesaria. |
| TUT-01 | P0 | Como tutor, presento fotografía, títulos, acreditaciones, experiencia y materias. | Sin publicación hasta revisión; expediente separado de ficha pública. |
| TUT-02 | P0 | Como tutor, recibo una decisión motivada de validación. | Estados de revisión, requerimientos y apelación. |
| CAT-01 | P0 | Busco por materia, grado/nivel, ciudad, modalidad, idioma y disponibilidad. | Filtros coherentes sin revelar datos personales de menores. |
| BOOK-01 | P0 | Solicito una sesión y recibo confirmación. | Menores: autorización de representante verificada. |
| SAFE-01 | P0 | Reporto conductas inapropiadas desde una sesión o perfil. | Atención humana, bloqueo preventivo, trazabilidad y escalamiento. |
| SAFE-02 | P0 | La plataforma limita comunicaciones con menores. | Sin canales privados directos no supervisados. |
| RATE-01 | P1 | Después de clase completada, puedo publicar valoración. | Solo reserva verificada; moderación, derecho de respuesta, antifraude. |
| PAY-01 | P1 | Pago dentro de la app y recibo comprobante. | Proveedor de pagos, conciliación y reglas de devolución. |
| ADMIN-01 | P0 | El operador verifica credenciales y alertas. | Roles segregados, logs y doble control en decisiones críticas. |

## Reglas de negocio

1. La cuenta que administra el aprendizaje de un menor pertenece exclusivamente a su representante autorizado. El menor no es un comprador autónomo.
2. El registro docente empieza como `draft`, pasa a `under_review` y solo aparece cuando es `approved`. Para clases con menores, requiere habilitación adicional `minor_eligible`.
3. El perfil público exhibe fotografía autorizada, nombre profesional, asignaturas, métodos, experiencia y credenciales verificadas resumidas. La identificación y soportes originales permanecen en repositorios privados.
4. Una calificación pública requiere sesión completada y participante elegible. Máximo una valoración principal por reserva; se admiten actualización controlada y apelación.
5. Las alertas de abuso o contacto inapropiado pueden suspender preventivamente una cuenta conforme a protocolo, sin sustituir acciones de autoridades.
6. No se permite publicidad personalizada basada en datos de menores ni venta de tales datos.
7. Se prohíbe facilitar suplantación académica, fraude en exámenes o redacción oculta de trabajos para presentar como propios.

## Alcance de la versión incluida en este repositorio

El proyecto contiene **solo interfaz estática** y datos de prueba: consulta de 6 perfiles ficticios, filtros, información de protección, y diálogos simulados para familias y docentes. No cuenta con usuarios reales, validación, pagos, agenda, backend ni mensajería.

## Métricas sugeridas (una vez en producción)

- Docentes registrados versus docentes que completan revisión (tasa y tiempo de validación).
- Tiempo desde solicitud hasta clase confirmada; clases completadas; repetición de contratación.
- Satisfacción estudiantil y familiar, segmentada por nivel y asignatura.
- Reportes de protección por 1.000 sesiones, tiempos de respuesta y acciones correctivas.
- Porcentaje de clases de menores con consentimiento válido y control de representante.
- Reclamaciones de reputación y resolución en plazos definidos por la operación.
