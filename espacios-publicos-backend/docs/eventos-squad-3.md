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
| `correlationId` | `string` | `"act-" + actividadId` |
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

- El payload lo arma `buildActivityCreatedPayload` (exportada desde el use case).
- `actorSub` lo completa el controller con `request.user.id`; el cliente no lo puede mandar en el body.
- La ubicacion siempre esta: el use case ya rechaza espacios sin coordenadas.
- El contrato se registra en el gateway con `npm run eda:register-events`. Para sumar `categoria` a un
  contrato ya registrado hace falta `--update-compatible` (ver `eventos-analitica.md`).

## Demo

`prisma/seed.js` agrega el espacio **Plaza Houssay** (`seed-space-plaza-houssay`, Av. Córdoba 2100,
Recoleta, capacidad 6000, `OUTDOOR`, -34.5994 / -58.3988) para crear un festival de 5.000 personas.
