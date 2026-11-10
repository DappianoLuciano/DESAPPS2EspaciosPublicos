# Eventos de espacios y cultura (CU-INT-01)

Los modulos de CityPass+ se comunican solo por el Event Gateway: este modulo no llama a la
API de ningun otro. Publica cuatro contratos y consume uno de Movilidad.

## Publicacion

Los casos de uso guardan el evento en `event_outbox` y lo publican por el bus de
`createEventBus()` (`EVENT_BUS_DRIVER=console|citypass`). Si el gateway falla, el registro queda
`PENDING` con su proxima fecha de reintento (backoff exponencial, hasta 60 minutos) y no se pierde la
reserva ni la inscripcion. El publicador del outbox (el mismo ciclo horario del clima) reintenta
las filas `PENDING` vencidas. Solo se
despachan los nombres FQN de esta tabla; las filas historicas con nombres viejos (`cultura.*`,
`espacios.*`) no se envian.

### Autenticacion del bus

El bus publica con un token de servicio: OAuth `client_credentials` con Basic auth (`EVENT_CLIENT_ID` /
`EVENT_CLIENT_SECRET`) contra `EVENT_AUTH_TOKEN_URL`, que por defecto es
`https://api.citypass-login.pp.ua/oauth/token`. El gateway autoriza por el claim `namespace` del JWT, que tiene
que ser `com.citypass.espacios`: al obtener el token se lo decodifica (sin validarlo) y, si no coincide, se loguea
un warning. El token y el secret nunca se loguean.

### Tope de reintentos

`EVENT_OUTBOX_MAX_ATTEMPTS` (por defecto 10) limita los intentos por fila. Estados del outbox:

- `PENDING`: pendiente o con un reintento programado (`attempts`, `nextAttemptAt`, `lastError`).
- `PUBLISHED`: el gateway acepto el evento.
- `FAILED`: se alcanzo el tope. Es terminal: la fila conserva `lastError`, se loguea un error con
  el FQN y el id (`Outbox: se agotaron los intentos de publicacion`) y `findReady` no la devuelve
  nunca mas.

Para reintentar a mano una fila agotada (por ejemplo despues de corregir el contrato en el gateway):
`UPDATE event_outbox SET status = 'PENDING', attempts = 0, "nextAttemptAt" = NULL WHERE id = '<id>';`

Antes de este tope, `FAILED` significaba "fallo pero se reintenta". Las filas que hayan quedado asi en una
base existente no se vuelven a despachar: pasarlas a `PENDING` (`attempts` < tope) para reanudarlas.

Todos los campos viajan siempre; los opcionales van en `null`. Las fechas son ISO 8601. No viajan
datos personales (ni mails ni nombres).

| FQN (variable de entorno) | Se publica al | Campos |
| --- | --- | --- |
| `com.citypass.espacios.EventoComunitarioPublicado` (`COMMUNITY_EVENT_PUBLISHED_EVENT_FQN`) | crear el evento y cada vez que cambian inscriptos o estado (inscripcion, baja, suspension, reanudacion) | `eventoId`, `espacioId`, `titulo`, `zona?`, `direccion?`, `latitud?`, `longitud?`, `inicio`, `fin`, `capacidad`, `cupoMaximo` (= `capacidad`), `inscriptos` (total actual), `estado` (`ACTIVE`/`ACTIVE_FULL`/`SUSPENDED`; el schema registrado documenta `CANCELLED`, que en la practica no sale porque la cancelacion publica `EventoCancelado`), `categoria`, `correlationId` (`evento-<eventoId>`) |
| `com.citypass.espacios.EventoCancelado` (`COMMUNITY_EVENT_CANCELLED_EVENT_FQN`) | `PATCH /api/community-events/:id/cancel` | `eventoId`, `espacioId`, `motivo?`, `canceladoEn`, `correlationId` |
| `com.citypass.espacios.EspacioEstadoCambiado` (`PUBLIC_SPACE_STATUS_CHANGED_EVENT_FQN`) | cambiar el `status` de un espacio | `espacioId`, `estadoNuevo` (`ENABLED`/`DISABLED`), `zona?`, `latitud?`, `longitud?`, `cambiadoEn` |
| `com.citypass.espacios.ReservaConfirmada` (`RESERVATION_CONFIRMED_EVENT_FQN`) | reservar un espacio o inscribirse a un evento | `reservaId`, `tipoReserva` (`EVENTO`/`ESPACIO`), `recursoId`, `espacioId`, `cantidadPersonas`, `inicio`, `fin` |

`?` = nullable (`["null", tipo]` con default `null` en el schema Avro).

- Reserva de espacio: `tipoReserva=ESPACIO`, `recursoId=espacioId`, `cantidadPersonas=estimatedAttendees`.
- Inscripcion a evento: `tipoReserva=EVENTO`, `recursoId=eventoId`, `cantidadPersonas=1`, `inicio`/`fin` del evento.
- `EventoComunitarioPublicado` se publica al crear el evento y cada vez que cambian inscriptos o estado;
  `inscriptos` es el total actual. Al inscribirse sale despues de `ReservaConfirmada` (con `ACTIVE_FULL`
  si se ocupo el ultimo cupo); al darse de baja sale con el estado actual (`ACTIVE` si estaba completo).
  Cada publicacion es un evento nuevo (id propio) con el mismo `eventoId`: el consumidor se queda con la
  ultima. Una inscripcion rechazada por cupo lleno no publica nada, y la baja en un evento `CANCELLED`
  tampoco (ya salio `EventoCancelado`).
- Al suspender o reanudar un evento, manualmente o por una medida climatica (aplicar o levantar), sale
  un snapshot con el estado nuevo (`SUSPENDED`, o `ACTIVE`/`ACTIVE_FULL` al reanudar). Lo pidio
  Movilidad para detectar esos cambios. Un evento que ya estaba suspendido no se republica al
  sumarle otra alerta.

Los contratos se registran con `npm run eda:register-events` (clima + estos cuatro). No se ejecuta
solo: hay que revisar los schemas y correrlo a mano.

### IntervencionFinalizada (cierre con Reclamos)

`com.citypass.espacios.IntervencionFinalizada` (schemaId 59) cierra el circuito de CU-INT-01: un reclamo
que corta la circulacion queda como intervencion pendiente (pantalla **Intervenciones** del admin,
`GET /api/admin/interventions`). Cuando el administrador la cierra
(`POST /api/admin/interventions/:reclamoId/finish`), se da de baja el incidente y se publica:

| Campo | Tipo | Origen |
| --- | --- | --- |
| `reclamoId` | `string` | id del reclamo |
| `resultado` | `string` | `RESUELTO` (intervinimos y se soluciono) o `RECHAZADO` (no hizo falta intervenir) |
| `idAuto` | `["null","string"]` | patente, opcional |
| `solicitadoAt` | `["null","long"]` | cuando llego el reclamo (ms epoch) |
| `resueltoAt` | `["null","long"]` | cuando se cerro (ms epoch) |

Reclamos cierra el reclamo con ese estado (su ADR 0012). Un reclamo que deja de cortar la
circulacion (`ReclamoReclasificado`) o se cierra en Reclamos (`ReclamoActualizado`) sale de la lista
sin publicar nada.

## Consumo

El gateway entrega los eventos de otros modulos por `POST /webhooks/citypass?token=<GATEWAY_WEBHOOK_TOKEN>`
con el sobre `{ metadata: { eventId, eventType, receivedAt }, data }`. Si falta `metadata.eventType` se usa
`metadata.type`; un tipo sin namespace (ej. `EmergenciaCreada`) se resuelve al FQN conocido que termina en
`.EmergenciaCreada`, y si no hay ninguno el evento se ignora. El token se compara en tiempo
constante (si la variable esta vacia se rechaza todo) y la entrega es idempotente por `eventId`
(tabla `inbound_events`).

- `com.citypass.movilidad.RecomendacionDestinoActualizada`: se guarda en `destination_recommendations`
  (una fila por evento). Si llega una con `calculadaEn` mas vieja que la guardada se descarta; si el
  evento no existe se loguea y se ignora. `estacionId` llega como numero y se guarda como string.
- `com.citypass.reclamos.ReclamoCreado`: con `afectaCirculacion === true` y coordenadas, alta en
  `city_incidents`. El schema registrado (schemaId 9) no trae esos campos, asi que en la practica no da
  de alta nada: las coordenadas llegan por las dos fuentes siguientes.
- `com.citypass.movilidad.MovilidadObstruccionEvaluada`: obstruccion evaluada por Movilidad. Alta del
  reclamo en `city_incidents` (categoria `OBSTRUCCION_VIAL`) y `EspacioPublicoAfectado` con causa
  `INCIDENTE_VIAL` para los espacios cercanos. Se ignora si `impactoCirculacion` indica que no hay impacto.
- `com.citypass.reclamos.ReclamoReclasificado`: si pasa a `afectaCirculacionNueva = true` con coordenadas,
  alta en `city_incidents` y `EspacioPublicoAfectado` con causa `RECLAMO`; si deja de afectarla, el
  incidente pasa a inactivo.
- `com.citypass.emergencias.EmergenciaCreada`: Emergencias no publica coordenadas ni `afectaCirculacion`;
  manda `emergenciaId`, `estado`, `ubicacion.barrio` (puede ser `null`), `tipo`, `severity`,
  `createdAt` y `updatedAt`. Con `emergenciaId` y barrio no vacio se da de alta sin coordenadas, con
  `category = tipo` y `zone = barrio` (no se filtra por tipo). Si ya llega en estado terminal no se da de alta.
- `ReclamoActualizado` (`estadoNuevo` en `RESUELTO`, `RECHAZADO`, `CERRADO`) y `EmergenciaActualizada`
  (`estado`, o `estadoNuevo` si falta, en `RESUELTA`, `CERRADA`, `DESCARTADA`, `CANCELADA`): el
  incidente pasa a inactivo.

### Suscripciones en el gateway

Para que el gateway llame al webhook hay que dar de alta una suscripcion por topico:

```bash
npm run eda:register-subscriptions
```

Hace `POST {EVENT_GATEWAY_API_URL}/subscriptions` con `{topic, callbackUrl}` para cada uno de los topicos
(`GATEWAY_SUBSCRIPTION_TOPICS`, exportados desde `ReceiveGatewayEventUseCase`: la misma lista que el webhook
sabe procesar). `callbackUrl = {PUBLIC_BACKEND_URL}/webhooks/citypass?token={GATEWAY_WEBHOOK_TOKEN}`. Requiere
`EVENT_GATEWAY_API_URL`, `EVENT_CLIENT_ID`, `EVENT_CLIENT_SECRET`, `PUBLIC_BACKEND_URL` y `GATEWAY_WEBHOOK_TOKEN`.
Un 409 se informa como "ya existia" y sigue con el siguiente; la salida muestra la URL con el token enmascarado.
El script no se ejecuta solo.

## Plan de llegada

`GET /api/community-events/:id/route-plan?fromLat=&fromLng=` arma la respuesta solo con la base propia
y el ruteo OSRM (`ROUTING_BIKE_URL`, `ROUTING_FOOT_URL`). Si el evento esta `CANCELLED` o el espacio
`DISABLED` no muestra la recomendacion aunque exista; sin fila avisa que Movilidad todavia no calculo la
estacion; una recomendacion de mas de 30 minutos se devuelve con un aviso de antiguedad.

`incidents` junta los activos con coordenadas a 1000 m o menos (`matchedBy: "RADIUS"`, con
`distanceMeters`) y los activos sin coordenadas cuyo `zone` coincide con la zona del espacio, sin tildes ni
mayusculas (`matchedBy: "ZONE"`, con `latitude`, `longitude` y `distanceMeters` en `null`). El front
muestra estos ultimos como "Emergencia activa en el barrio X" y no los marca en el mapa.

## Estacion de retiro: `com.citypass.movilidad.EstacionDisponibilidadActualizada` (pedido a Movilidad)

El plan "Cómo llegar en bici" tiene tres tramos: a pie desde la ubicación del ciudadano hasta la estación de bicis
de la ciudad más cercana (retiro), en bici hasta la estación que recomienda Movilidad para el evento (devolución) y a
pie hasta el evento. La estación de devolución ya llega por el bus (`RecomendacionDestinoActualizada`). La de retiro
depende de dónde está cada ciudadano en ese momento, y el backend no llama a la API de otro módulo: los módulos se
comunican solo por eventos. Por eso guardamos una copia local de las estaciones (tabla `bike_stations`, migración
`20261110130000_bike_stations`) y buscamos ahí la más cercana.

Contrato propuesto a Movilidad. Un evento por estación, cada vez que cambia su disponibilidad. Sin `enum`, para que
el webhook del gateway lo pueda entregar:

| Campo | Tipo Avro | Notas |
| --- | --- | --- |
| `estacionId` | `string` | |
| `estacion` | `string` | nombre |
| `latitud` / `longitud` | `double` | |
| `bicisDisponibles` | `int` | |
| `lugaresLibres` | `int` | |
| `capacidad` | `int` | |
| `activa` | `boolean` | `false` saca la estación de la búsqueda |
| `actualizadaEn` | `string` (ISO-8601) | un dato más viejo que el guardado no lo pisa |

- Mientras no haya estaciones cargadas, el tramo en bici sale desde la ubicación del ciudadano, como antes, con un aviso.
- Sin estaciones a menos de 5 km del ciudadano, no se dibuja el tramo en bici y se avisa.
- Si la estación de retiro no tiene bicis, se avisa. Si es la misma que la de devolución, se sugiere ir caminando.
