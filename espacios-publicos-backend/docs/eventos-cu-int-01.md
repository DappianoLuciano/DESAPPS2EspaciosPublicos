# Eventos de espacios y cultura (CU-INT-01)

Los modulos de CityPass+ se comunican solo por el Event Gateway: este modulo no llama a la
API de ningun otro. Publica cuatro contratos y consume uno de Movilidad.

## Publicacion

Los casos de uso guardan el evento en `event_outbox` y lo publican por el bus de
`createEventBus()` (`EVENT_BUS_DRIVER=console|citypass`). Si el gateway falla, el registro queda
`FAILED` con su proxima fecha de reintento y no se pierde la reserva ni la inscripcion. El
publicador del outbox (el mismo ciclo horario del clima) reintenta los pendientes. Solo se
despachan los nombres FQN de esta tabla; las filas historicas con nombres viejos (`cultura.*`,
`espacios.*`) no se envian.

Todos los campos viajan siempre; los opcionales van en `null`. Las fechas son ISO 8601. No viajan
datos personales (ni mails ni nombres).

| FQN (variable de entorno) | Se publica al | Campos |
| --- | --- | --- |
| `com.citypass.espacios.EventoComunitarioPublicado` (`COMMUNITY_EVENT_PUBLISHED_EVENT_FQN`) | crear un evento | `eventoId`, `espacioId`, `titulo`, `zona?`, `direccion?`, `latitud?`, `longitud?`, `inicio`, `fin`, `capacidad`, `cupoMaximo` (= `capacidad`), `inscriptos` (0), `estado` (`ACTIVE`/`ACTIVE_FULL`/`CANCELLED`), `categoria`, `correlationId` (`evento-<eventoId>`) |
| `com.citypass.espacios.EventoCancelado` (`COMMUNITY_EVENT_CANCELLED_EVENT_FQN`) | `PATCH /api/community-events/:id/cancel` | `eventoId`, `espacioId`, `motivo?`, `canceladoEn`, `correlationId` |
| `com.citypass.espacios.EspacioEstadoCambiado` (`PUBLIC_SPACE_STATUS_CHANGED_EVENT_FQN`) | cambiar el `status` de un espacio | `espacioId`, `estadoNuevo` (`ENABLED`/`DISABLED`), `zona?`, `latitud?`, `longitud?`, `cambiadoEn` |
| `com.citypass.espacios.ReservaConfirmada` (`RESERVATION_CONFIRMED_EVENT_FQN`) | reservar un espacio o inscribirse a un evento | `reservaId`, `tipoReserva` (`EVENTO`/`ESPACIO`), `recursoId`, `espacioId`, `cantidadPersonas`, `inicio`, `fin` |

`?` = nullable (`["null", tipo]` con default `null` en el schema Avro).

- Reserva de espacio: `tipoReserva=ESPACIO`, `recursoId=espacioId`, `cantidadPersonas=estimatedAttendees`.
- Inscripcion a evento: `tipoReserva=EVENTO`, `recursoId=eventoId`, `cantidadPersonas=1`, `inicio`/`fin` del evento.

Los contratos se registran con `npm run eda:register-events` (clima + estos cuatro). No se ejecuta
solo: hay que revisar los schemas y correrlo a mano.

## Consumo

El gateway entrega los eventos de otros modulos por `POST /webhooks/citypass?token=<GATEWAY_WEBHOOK_TOKEN>`
con el sobre `{ metadata: { eventId, eventType, receivedAt }, data }`. El token se compara en tiempo
constante (si la variable esta vacia se rechaza todo) y la entrega es idempotente por `eventId`
(tabla `inbound_events`).

- `com.citypass.movilidad.RecomendacionDestinoActualizada`: se guarda en `destination_recommendations`
  (una fila por evento). Si llega una con `calculadaEn` mas vieja que la guardada se descarta; si el
  evento no existe se loguea y se ignora. `estacionId` llega como numero y se guarda como string.
- `com.citypass.reclamos.ReclamoCreado` / `com.citypass.emergencias.EmergenciaCreada`: con
  `afectaCirculacion === true` y coordenadas, alta en `city_incidents`.
- `ReclamoActualizado` (`RESUELTO`, `RECHAZADO`, `CERRADO`) y `EmergenciaActualizada` (`RESUELTA`,
  `CERRADA`, `DESCARTADA`, `CANCELADA`): el incidente pasa a inactivo.

## Plan de llegada

`GET /api/community-events/:id/route-plan?fromLat=&fromLng=` arma la respuesta solo con la base propia
y el ruteo OSRM (`ROUTING_BIKE_URL`, `ROUTING_FOOT_URL`). Si el evento esta `CANCELLED` o el espacio
`DISABLED` no muestra la recomendacion aunque exista; sin fila avisa que Movilidad todavia no calculo la
estacion; una recomendacion de mas de 30 minutos se devuelve con un aviso de antiguedad.
