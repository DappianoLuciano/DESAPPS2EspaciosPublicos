# Medidas climáticas: una revisión y una confirmación

En el dashboard y en Gestión de Alertas: **Gestionar espacios y eventos** → revisar selección → **Aplicar medidas**. El motivo y el período vienen precargados. No se llama a Open-Meteo durante esta revisión.

- Espacios: habilitados, exteriores/mixtos, en los barrios que contienen los puntos de referencia de la alerta. Se usan los polígonos GCBA ya incorporados. Si faltan coordenadas, solo se acepta coincidencia exacta del barrio; nunca se amplía a toda CABA ni se inventa un radio. Esto es una propuesta conservadora de alcance, no una medición del área completa del fenómeno.
- Eventos: del espacio candidato, no cancelados ni terminados, con `inicioEvento < finAlerta && finEvento > inicioAlerta`. La superposición parcial también cuenta.
- Espacios y eventos se pueden seleccionar independientemente. Un espacio seleccionado bloquea nuevas reservas y nuevos eventos en ese intervalo. Una actividad seleccionada se suspende conservando inscripciones y horario. Las reservas previas no se cancelan ni se envían correos.
- Solo se permiten nuevas medidas para alertas CONFIRMED cuyo fin aún no pasó. Confirmar una alerta ya no bloquea por sí solo todos los espacios: RequestReservation consulta las medidas explícitas por id del espacio.

## Cierre

**Finalizar y levantar medidas** confirma la decisión humana desde un único modal. Primero usa la finalización existente (con su outbox/EDA), luego levanta las medidas locales. Si falla el segundo paso, el modal conserva el estado FINALIZED y permite reintentar solo el levantamiento. Si una alerta fue finalizada por el scheduler, aparece la revisión pendiente en el dashboard/listado; el scheduler no levanta medidas.

El levantamiento es transaccional por alerta. Se marca quién aplicó/levantó y cuándo, sin borrar los registros. Solo se reanudan eventos suspendidos por estas medidas que no terminaron, recuperando ACTIVE/ACTIVE_FULL según cupos. Otra alerta mantiene la suspensión; una cancelación definitiva y un espacio administrativamente deshabilitado no se reactivan. Una suspensión manual previa no se selecciona ni se toma como propia.

No se modifica ENABLED/DISABLED del espacio. No se publican contratos EDA nuevos: la confirmación/finalización del clima y la cancelación definitiva conservan sus contratos existentes. Los eventos que cambian de estado publican `ActividadModificada` con `causaTipo = EVENTO_CLIMATICO` y `causaId` = id de la alerta (`SUSPENDIDA` al aplicar, `PROGRAMADA` al levantar). La fila se guarda en el outbox dentro de la misma transacción y se publica después del commit. Ver `eventos-analitica.md`.

## API administrativa

- GET `/api/admin/weather-alerts/:id/impact`: revisión sin mutaciones.
- POST `/api/admin/weather-alerts/:id/restrictions`: `{ "spaceIds": [...], "eventIds": [...], "reason": "..." }`. El servidor recalcula el alcance, valida la selección y guarda medidas + suspensiones en una transacción Serializable. Repetir una selección no duplica medidas.
- POST `/api/admin/weather-alerts/:id/restrictions/release`: `{}`; exige alerta FINALIZED. Solo libera sus propios registros.

Las rutas usan los permisos administrativos existentes y auditoría. Una reanudación individual queda bloqueada mientras haya medidas climáticas vinculadas. Se evita así saltarse la revisión conjunta.

## Supabase: aplicar solo estas migraciones nuevas

**Estas instrucciones son para una base existente que ya tiene las tablas y migraciones anteriores del proyecto. No inicializan una base vacía. No se ejecutaron automáticamente.** Antes, verificar el proyecto destino de DATABASE_URL/DIRECT_URL en el `.env` privado del backend y disponer de respaldo. Ambas URLs deben apuntar a la misma base; para DDL se recomienda conexión directa/session pooler, no transaction pooler.

Desde backend:

```bash
cd /Users/didiersahonero/WebstormProjects/DA2/espacios-publicos-backend
npm run prisma:status
```

Que status termine con código 1 puede indicar simplemente migraciones pendientes. Revisar los nombres. No usar `migrate dev`, `db push`, reset ni `migrate deploy` para saltarse la revisión de pendientes históricos.

Si `20261102233000_event_suspension` está pendiente, ejecutar estos dos comandos, uno por vez. El segundo solo si el SQL terminó correctamente:

```bash
npx prisma db execute --schema prisma/schema.prisma --file prisma/migrations/20261102233000_event_suspension/migration.sql
npx prisma migrate resolve --applied 20261102233000_event_suspension
```

Si esa migración ya figura aplicada, omitir los dos anteriores. Después, si `20261102234000_weather_restrictions` está pendiente:

```bash
npx prisma db execute --schema prisma/schema.prisma --file prisma/migrations/20261102234000_weather_restrictions/migration.sql
npx prisma migrate resolve --applied 20261102234000_weather_restrictions
npm run prisma:generate
npm run prisma:status
```

`db execute` aplica únicamente el archivo indicado; `migrate resolve --applied` solo registra lo aplicado, no ejecuta el SQL. **Si un comando falla, detenerse; no marcar la migración como aplicada ni continuar a ciegas.** Si el SQL ya fue ejecutado manualmente, verificar sus objetos antes de resolver; no repetirlo.

Pueden continuar pendientes migraciones históricas: no se ejecutan ni se marcan como aplicadas mediante estos comandos. Si la base está realmente vacía, faltan tablas previas, o aparece drift/historial inconsistente, detenerse y preparar la inicialización/baseline antes de aplicar estas dos.

Cambios: SUSPENDED + statusReason en eventos; tabla weather_restrictions con vínculos, período, motivo y auditoría. La nueva tabla tiene RLS habilitado sin políticas públicas: su uso es por la conexión administrativa del backend. No agrega catálogos, seeds ni variables de entorno.

Después: reiniciar backend local y refrescar frontend, o desplegar backend y frontend de la misma revisión. Prueba en staging: revisar alerta confirmada → aplicar medidas → verificar bloqueo de una reserva superpuesta y que un horario no superpuesto sigue funcionando → finalizar y levantar → comprobar que cancelados y otras suspensiones permanecen.
