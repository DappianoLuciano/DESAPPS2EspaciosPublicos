# Observaciones sobre los casos de uso

Fuente revisada: `CityPass - Casos de uso.docx`.

## Correcciones aplicadas al backend

1. **Reserva confirmada automaticamente**
   - El documento indica que CU-01 confirma la reserva en el momento si hay cupo.
   - Se corrigio el estado inicial de reserva de `REQUESTED` a `CONFIRMED`.
   - Se corrigio el evento de dominio de `espacios.reserva_solicitada` a `espacios.reserva_confirmada`.

2. **Cupo de espacios publicos**
   - El documento habla de cupo disponible por franja horaria.
   - Se agrego `estimatedAttendees` a la reserva.
   - La regla ahora suma asistentes de reservas confirmadas que se superponen y valida contra la capacidad del espacio.

3. **Eventos comunitarios bloquean el espacio**
   - CU-02 indica que el espacio asociado queda bloqueado para otras reservas en ese horario.
   - Al crear una reserva, se rechaza si existe un evento activo en el mismo espacio y horario.
   - Al publicar un evento, se rechaza si existen reservas confirmadas o eventos activos en ese mismo espacio y horario.

4. **Estado y datos minimos de eventos**
   - Se agregaron `category`, `organizerName`, `capacity`, `requiresRegistration` y `status`.
   - El estado inicial del evento es `ACTIVE`.

## Cosas raras o inconsistentes en el documento

1. **Estado "Activo - Completo" referencia CU-01**
   - En la tabla de estados del evento, `Activo - Completo` aparece relacionado con CU-01.
   - Parece mas correcto asociarlo con CU-03, porque el evento se completa por inscripciones, no por reservas de espacios.

2. **CU-01 mezcla reserva de espacio con evento completo**
   - En el paso 4.1 de CU-01 se menciona que "el evento pasara a estado Activo - Completo".
   - Para reservas de espacios, deberia hablar de franja horaria sin cupo o espacio sin disponibilidad.
   - La idea de evento completo pertenece al flujo de inscripcion a evento.

3. **"x segundos" y "x minutos" quedan sin definir**
   - Los requisitos de rendimiento usan valores placeholder.
   - Recomendacion para Sprint 1: documentar objetivos simples, por ejemplo respuestas menores a 2 segundos en operaciones comunes y recordatorios generados dentro de una ventana configurable.

4. **Autenticacion y perfiles aparecen como precondicion pero no estan definidos**
   - Los casos de uso mencionan ciudadano autenticado, organizador habilitado y perfiles bloqueados.
   - Para no sobredimensionar el Sprint 1, conviene dejar autenticacion como integracion futura o usar headers simulados mientras el modulo aprende dominio y persistencia.

5. **Inscripciones todavia requieren modelo propio**
   - CU-03, CU-04, CU-05 y CU-08 necesitan una entidad `EventRegistration`.
   - No conviene improvisarla sin definir antes datos minimos visibles, privacidad y reglas de duplicado.

## Recomendacion de orden

1. Cerrar bien CU-01, CU-02, CU-06 y CU-07.
2. Agregar CU-03 con modelo `EventRegistration`.
3. Agregar cancelaciones CU-04 y CU-09.
4. Agregar recordatorios CU-05 como job programado que publica eventos para el modulo de notificaciones.
