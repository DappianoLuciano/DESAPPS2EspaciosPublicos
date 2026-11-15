# Eventos del squad 3: recoleccion inteligente despues de un evento masivo

## E1 `com.citypass.espacios.ActividadCreada`

Se publica cada vez que se crea un evento comunitario (`POST /api/community-events`), desde
`CreateCommunityEventUseCase`. El FQN se puede sobrescribir con `ACTIVITY_CREATED_EVENT_FQN`.

**Convive con `EventoComunitarioPublicado`** (CU-INT-01, lo consume Residuos): ese evento no cambia.
Al crear un evento comunitario se publican los dos, primero `EventoComunitarioPublicado` y despues
`ActividadCreada`. Los dos siguen el mismo patron: se guardan en `event_outbox` y se publican por el
bus, asi que los reintentos los maneja el outbox (ver `eventos-cu-int-01.md`).

| Campo | Tipo Avro | Origen |
| --- | --- | --- |
| `correlationId` | `["null","string"]`, default `null` | `"act-" + actividadId` (siempre se envia; es opcional en el esquema porque se agrego despues de registrar el contrato) |
| `actividadId` | `string` | id del evento comunitario |
| `titulo` | `string` | titulo del evento |
| `estado` | `string` | siempre `"PROGRAMADA"` |
| `capacidad` | `int` | cupo del evento |
| `fechaHoraInicio` | `long` (`timestamp-millis`) | inicio del evento (`date.getTime()`, no ISO) |
| `fechaHoraFinalizacion` | `long` (`timestamp-millis`) | fin del evento (`date.getTime()`, no ISO) |
| `ubicacion` | `record Ubicacion { lat: double, lng: double }` | coordenadas del espacio publico |
| `direccion` | `string` | direccion del espacio |
| `espacioNombre` | `string` | nombre del espacio |
| `actorSub` | `["null","string"]`, default `null` | `sub` del token del organizador |
| `categoria` | `["null","string"]`, default `null` | categoria del evento tal cual se cargo (`communityEvent.category`, texto de `EVENT_CATEGORIES` del frontend; no se mapea a otro enum) |
| `organizadorTipo` | `string` (obligatorio) | `CIUDAD` si lo crea un `municipal_admin`, `CIUDADANO` si no. Lo completa el controller con el rol del token |

- El payload lo arma `buildActivityCreatedPayload` (exportada desde el use case).
- `actorSub` lo completa el controller con `request.user.id`; el cliente no lo puede mandar en el body.
- La ubicacion siempre esta: el use case ya rechaza espacios sin coordenadas.
- El contrato se registra en el gateway con `npm run eda:register-events`. Para sumar `categoria` a un
  contrato ya registrado hace falta `--update-compatible` (ver `eventos-analitica.md`).
- Registrado el 05/11/2026: el gateway tomo el cambio como breaking y creo la **version 2**
  (schemaId 61, topico `com.citypass.espacios.ActividadCreada.v2`). La v1 (schemaId 60, topico
  `com.citypass.espacios.ActividadCreada`) no tenia suscripciones. Quien consuma `ActividadCreada`
  tiene que suscribirse a la v2.
- **Version 3** (schemaId 91, topico `com.citypass.espacios.ActividadCreada.v3`): suma `organizadorTipo`
  obligatorio, pedido por Analitica. Desde que se registro, el gateway rechaza con 400 cualquier
  `ActividadCreada` sin ese campo. Quien consuma `ActividadCreada` tiene que suscribirse a la v3.

### Tambien al reservar un espacio

`ActividadCreada` tambien se publica cuando un ciudadano confirma la reserva de un espacio
(`POST /api/reservations`, `RequestReservationUseCase`). Sale despues de `ReservaConfirmada`,
`ReservaCreada` y `ReservaActualizada`, que no cambian, con el mismo patron de outbox. El payload lo arma
`buildActivityCreatedFromReservation`:

| Campo | Valor en una reserva |
| --- | --- |
| `actividadId` | el `reservaId`. Asi se cruza con `ReservaCreada` y se evita el doble conteo |
| `correlationId` | `"act-" + reservaId` |
| `titulo` | `"Reserva de <nombre del espacio>"` |
| `estado` | `"PROGRAMADA"` |
| `capacidad` | cantidad estimada de asistentes de la reserva |
| `fechaHoraInicio` / `fechaHoraFinalizacion` | inicio y fin de la reserva, en `timestamp-millis` |
| `ubicacion`, `direccion`, `espacioNombre` | los del espacio reservado |
| `actorSub` | `sub` del ciudadano que reservo (lo completa el controller con `request.user.id`), o `null` |
| `categoria` | `null` |
| `organizadorTipo` | `"CIUDADANO"` |

- No viaja el nombre ni el email del solicitante, ni otro dato personal.
- **No se publica si el espacio no tiene coordenadas**: la v3 exige `ubicacion`. Se loguea un warning y la
  reserva y sus otros eventos salen igual.
- Si falla la publicacion, la reserva no falla: el evento queda en `event_outbox` para reintento.
- **No hubo cambio de schema**: sigue la v3 (schemaId 91). No hay que registrar nada en el gateway.

## Demo

`prisma/seed.js` agrega el espacio **Plaza Houssay** (`seed-space-plaza-houssay`, Av. Córdoba 2100,
Recoleta, capacidad 6000, `OUTDOOR`, -34.5994 / -58.3988) para crear un festival de 5.000 personas.
