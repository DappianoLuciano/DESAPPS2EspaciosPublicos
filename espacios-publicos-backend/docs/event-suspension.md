# Suspensión temporal y cancelación de eventos

Decisión manual en Gestión de Eventos, con el mismo permiso administrativo de cancelación existente. No cierra espacios, no cancela masivamente y no se dispara automáticamente al confirmar una alerta.

- `PATCH /api/community-events/:id/suspend`, body `{ "reason": "Suspendido por alerta climática..." }`: motivo público obligatorio, máximo 500 caracteres. Conserva las inscripciones y el horario ocupado.
- `PATCH /api/community-events/:id/resume`, body `{}`: solo un suspendido no terminado. Limpia el motivo y recupera ACTIVE o ACTIVE_FULL según los inscriptos actuales. La administración debe revisar clima y habilitación del espacio antes de confirmar.
- Cancelación definitiva: endpoint existente `/:id/cancel`, ahora guarda el motivo para mostrarlo también a los ciudadanos. No permite reanudar.

El catálogo y el detalle mantienen visibles los eventos no disponibles. El filtro `availableOnly=true` sigue excluyéndolos. Inscripciones directas rechazan SUSPENDED y CANCELLED. Una suspensión no publica EventoCancelado: ese contrato sigue reservado a la cancelación definitiva. No se agregaron contratos EDA ni correos automáticos. Suspender y reanudar publican el snapshot de EventoComunitarioPublicado y `ActividadModificada` (`SUSPENDIDA` con el motivo, o `PROGRAMADA`; sin causa): ver `eventos-analitica.md`.

## Base de datos / despliegue

Nueva migración aditiva: `prisma/migrations/20261102233000_event_suspension/migration.sql`. Agrega SUSPENDED al enum y statusReason nullable. No elimina registros. Prisma Client ya debe regenerarse durante el build.

**No fue aplicada automáticamente a Supabase.** Revisar primero el estado y el SQL en el ambiente de prueba. No ejecutar `migrate deploy` a ciegas si hay migraciones históricas pendientes (por ejemplo secure_public_schema). Coordinar la aplicación de esta migración y su registro en Prisma con el responsable de la base, antes de desplegar este backend.

Prueba manual: crear evento futuro → inscribir ciudadano → suspender con motivo → comprobar catálogo, detalle, Mis reservas y entrada → intentar inscripción por API → reanudar y verificar cupos → cancelar definitivamente y comprobar que no existe acción de reanudación.

También se incorporó la gestión conjunta desde las alertas; ver `weather-measures.md`. Una suspensión vinculada a una alerta no se reanuda individualmente: se levanta desde esa alerta para no ignorar otras medidas activas. La cancelación definitiva sigue disponible. La reanudación no es automática al vencer una alerta.
