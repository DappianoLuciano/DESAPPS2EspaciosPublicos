# CU-01: emergencia durante un viaje en bicicleta

Espacios actua en dos momentos, siempre por eventos (RNI-08). Todos los eventos que publica llevan
`correlationId = emergenciaId`, pasan por `event_outbox` y no incluyen datos personales.

## Al crearse la emergencia (A10)

Consume `EmergenciaCreada`. Busca reservas y eventos comunitarios activos en espacios cercanos:

- Con `ubicacion {lat, lng}`, usa el radio `EMERGENCY_NEARBY_RADIUS_METERS` (500 m por defecto).
- Tambien acepta `ubicacion {latitud, longitud}` y `latitud`/`longitud` en la raiz de `data`, siempre
  numericas. Emergencias cifra `ubicacion.latitud`/`ubicacion.longitud` pero manda `latitud`/`longitud` en
  claro en la raiz (3 decimales, ~100 m): se saltean las cifradas y se usan esas.
- Sin coordenadas, usa `ubicacion.barrio`.
- El incidente del plan de llegada (`city_incidents`) guarda esas mismas coordenadas, asi que se cruza
  con el evento por radio; el barrio queda de respaldo.
- Horario: lo que sigue en curso o empieza dentro de `EMERGENCY_WINDOW_HOURS` (2 h por defecto). Lo
  terminado no cuenta aunque este dentro de las 2 h previas, porque ya no se puede suspender.

La ventana y el radio son provisorios: se definen con la catedra. Por cada coincidencia registra la
afectacion en `emergency_booking_impacts`, avisa al organizador y publica `ReservaAfectada` con
`accion = SUSPENDIDA`. Si no hay coincidencias, no publica nada.

## Al resolverse la emergencia

Emergencias publica la resolucion, el cierre y la falsa alarma como `EmergenciaActualizada` con
`estadoNuevo` en `RESUELTA`, `CERRADA`, `CANCELADA` o `DESCARTADA`, con `causasRelacionadas` y la ubicacion
cifrada. Es lo unico que hace falta: el webhook acepta tambien `EmergenciaResuelta`, `EmergenciaCerrada`,
`EmergenciaCancelada` y los nombres con puntos, pero no se suscriben porque Emergencias no los publica.

- **A10**, aunque la causa sea otra: por espacio afectado, confirma las reservas cuyo horario sigue
  vigente, deja `A_REPROGRAMAR` las que ya pasaron y publica `EspacioLiberado`.
- **A6**, solo con `ESPACIO_PUBLICO` en `causasRelacionadas`: registra la problematica y publica
  `ProblematicaRegistrada`. El tipo sale de `tipoProblematica`; si falta, queda `SIN_CLASIFICAR`. El contrato de Emergencias todavia no lo trae.
- Sin reservas afectadas y sin esa causa, no hace nada.

Una falsa alarma (A1) tambien libera lo suspendido y nunca registra problematicas. Se reconoce por
`EmergenciaCancelada`, `emergencia.cancelada` o los estados `CANCELADA` y `DESCARTADA`. El documento no lista
a Espacios entre los consumidores de `emergencia.cancelada`; se agrego para no dejar reservas suspendidas.

Cada operacion es idempotente por `emergenciaId` (RNI-04). Una `EmergenciaCreada` que llega despues
de la resolucion no suspende nada.

## Contratos publicados

| FQN (variable de entorno) | Campos |
| --- | --- |
| `com.citypass.espacios.ReservaAfectada` (`RESERVATION_AFFECTED_EVENT_FQN`) | `correlationId`, `emergenciaId`, `espacioId`, `reservaId`, `tipoReserva` (`ESPACIO`/`EVENTO`), `horario {inicio, fin}`, `accion` (`SUSPENDIDA`/`REPROGRAMADA`), `afectadaEn` |
| `com.citypass.espacios.EspacioLiberado` (`SPACE_RELEASED_EVENT_FQN`) | `correlationId`, `emergenciaId`, `espacioId`, `reservasConfirmadas`, `reservasReprogramadas`, `liberadoEn` |
| `com.citypass.espacios.ProblematicaRegistrada` (`PROBLEM_REGISTERED_EVENT_FQN`) | `correlationId`, `emergenciaId`, `problematicaId`, `espacioId?`, `tipo`, `latitud?`, `longitud?`, `registradaEn` |

El documento los nombra `espacios.reserva.afectada`, `espacios.espacio.liberado` y
`espacios.problematica.registrada`. El gateway no admite esos nombres: el FQN es el topico, el evento va en
PascalCase y el namespace sale del token (`docs/CONTRACTS.md` del gateway). El webhook acepta tambien los
nombres con puntos y el sobre estilo CloudEvents.

## API del backoffice

Requieren rol administrador y las acciones quedan auditadas.

- `GET /api/espacios/cercanos?lat&lng&desde&hasta`
- `GET /api/emergency-impacts`: resumen, reservas afectadas y problematicas.
- `POST /api/emergency-impacts/:id/reschedule` con `{ startDate, endDate }`: valida cupo y solapamientos
  y publica `ReservaAfectada` con `accion = REPROGRAMADA`.

`GET /api/emergency-impacts/notices` es publica, como el catalogo: devuelve los eventos afectados, sin datos
personales, para mostrar el aviso en Mis Reservas y en el detalle del evento.

## Avisos por mail

Al suspender, liberar y reprogramar se avisa al organizador. En un evento comunitario tambien a cada inscripto,
con un mail individual. Un envio que falla se loguea y no frena la emergencia ni se reintenta.

## Limitaciones conocidas

- El documento dice que Espacios "registra y deriva" la problematica, pero no define a quien. Hoy se registra,
  se publica `ProblematicaRegistrada` y se ve en el backoffice; no hay una accion de derivar.
- La suspension vive en `emergency_booking_impacts`: `Reservation.status` y `CommunityEvent.status` no
  cambian, para no mezclarla con la suspension por clima. Mientras un evento esta suspendido o pendiente de
  reprogramar por una emergencia, no acepta inscripciones nuevas.
- Emergencias cifra latitud y longitud. Sin coordenadas, la busqueda de cercanos usa el barrio, y la
  problematica se registra sin espacio: con el barrio no se puede saber cual es.
- Una emergencia no bloquea reservas nuevas en el espacio.
- Los eventos comunitarios no guardan el mail del organizador: el aviso va a
  `EMERGENCY_NOTIFICATIONS_EMAIL`, si esta definido, y siempre se ve en el backoffice.

## Puesta en marcha

En este orden, coordinado con el responsable de la base:

1. Aplicar `prisma/migrations/20261104120000_cu_01_emergency_impacts`. Solo crea tablas.
2. `npm run eda:register-events`
3. Desplegar el backend.
4. `npm run eda:register-subscriptions`.

## Prueba local

Con `EVENT_BUS_DRIVER=console` y el backend corriendo sobre un Postgres local:

```bash
BACKEND_URL=http://localhost:3000 GATEWAY_WEBHOOK_TOKEN=... \
  npm run cu01:simular -- --espacio <id> --lat -34.6037 --lng -58.3816 --causas ESPACIO_PUBLICO
```

Manda `EmergenciaCreada` y, despues de `--espera` segundos (5 por defecto), `EmergenciaResuelta` al webhook
local. No toca el gateway ni otros modulos. Los eventos publicados se ven en el log y el resultado en
`/admin/emergencies`. Antes hay que tener una reserva cercana que este en curso o empiece en menos de 2 h.

Si se despliega antes de migrar, reservas y eventos siguen funcionando. Lo unico que falla es la reaccion
del CU-01: el webhook responde error, el gateway reintenta y el incidente del plan de llegada ya quedo guardado.
